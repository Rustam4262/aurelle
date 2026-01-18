import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { User } from "@shared/models/auth";

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

async function logout(): Promise<void> {
  try {
    // Use POST for proper logout
    const response = await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      // Redirect to auth page after successful logout
      window.location.href = "/auth";
    } else {
      throw new Error("Logout failed");
    }
  } catch (error) {
    console.error("Logout error:", error);
    // Fallback to GET redirect
    window.location.href = "/api/logout";
  }
}

export function useAuth(options?: { requireAuth?: boolean; redirectTo?: string }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

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
