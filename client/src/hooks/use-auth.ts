import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import type { User } from "@shared/models/auth";
import { logger } from "@/lib/logger";
import { setUser as setSentryUser } from "@/lib/sentry";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    // User is not authenticated
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function doLogout(): Promise<void> {
  const response = await fetch("/api/logout", {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Logout failed: ${response.status}`);
  }
}

export function useAuth(options?: { requireAuth?: boolean; redirectTo?: string }) {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: doLogout,
    onSuccess: () => {
      // Full page reload clears all React Query state automatically.
      // Do NOT call queryClient.clear() here — it causes client.tsx to
      // re-render with user=undefined → navigate("/auth") SPA navigation fires
      // simultaneously with this full reload, aborting lazy-loaded bundles
      // and triggering the ErrorBoundary before the reload completes.
      window.location.href = "/auth";
    },
    onError: (error) => {
      logger.error("Logout error", error);
      // Fallback: GET-based logout (destroys session server-side and redirects)
      window.location.href = "/api/logout";
    },
  });

  // Sync user identity to Sentry for error context
  useEffect(() => {
    if (!isLoading) {
      if (user) {
        setSentryUser({
          id: user.id,
          email: user.email ?? undefined,
          username: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
          role: user.isAdmin ? "admin" : undefined,
        });
      } else {
        setSentryUser(null);
      }
    }
  }, [user, isLoading]);

  // Auto-redirect to auth page if user is not authenticated and requireAuth is true
  useEffect(() => {
    if (options?.requireAuth && !isLoading && !user && !error) {
      const redirectPath = options?.redirectTo || "/auth";
      // Store current path for redirect after login
      sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
      window.location.href = redirectPath;
    }
  }, [user, isLoading, error, options?.requireAuth, options?.redirectTo]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
