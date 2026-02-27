import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import type { User } from "@shared/models/auth";
import { logger } from "@/lib/logger";

const IS_DEV = import.meta.env.DEV;

/**
 * Fetch current user.
 * - 200  → return user object
 * - 401  → return null  (guest, expected – NOT an error)
 * - 5xx/network → throw (real error, handled by React Query's error state)
 */
async function fetchUser(): Promise<User | null> {
  IS_DEV && logger.debug("auth: checking user", { source: "use-auth" });

  let response: Response;
  try {
    response = await fetch("/api/auth/user", { credentials: "include" });
  } catch (networkError) {
    // Network failure (offline / DNS / CORS) — real error
    throw new Error("auth: network error");
  }

  if (response.status === 401) {
    IS_DEV && logger.debug("auth: 401 guest", { source: "use-auth" });
    return null; // guest — NOT an error, do NOT throw
  }

  if (!response.ok) {
    // 500, 503, etc. — real server error
    throw new Error(`auth: server error ${response.status}`);
  }

  const user = await response.json();
  IS_DEV && logger.debug("auth: loaded user", { source: "use-auth", meta: { id: user?.id } });
  return user;
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

export interface AuthState {
  user: User | null | undefined;
  isLoading: boolean;
  /** true after the first auth check completes (success or 401 guest) */
  authChecked: boolean;
  isAuthenticated: boolean;
  /** true if the auth server returned an unexpected error (5xx / network) */
  isAuthError: boolean;
  logout: () => void;
  isLoggingOut: boolean;
}

export function useAuth(options?: { requireAuth?: boolean; redirectTo?: string }): AuthState {
  const {
    data: user,
    isLoading,
    isFetched,
    error,
  } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,              // don't retry 401s / network errors
    staleTime: 1000 * 60 * 5, // 5 min cache
    // CRITICAL: errors here are real server errors (5xx), not 401s.
    // 401 returns null (not an error), so React Query won't set error state.
  });

  // authChecked = the query has settled (data OR error received)
  const authChecked = isFetched;
  const isAuthError = !!error;

  const logoutMutation = useMutation({
    mutationFn: doLogout,
    onSuccess: () => {
      window.location.href = "/auth";
    },
    onError: (err) => {
      logger.error("Logout error", err as Error, { source: "use-auth" });
      window.location.href = "/api/logout";
    },
  });

  // Auto-redirect for protected pages — only after auth check completes
  useEffect(() => {
    if (!options?.requireAuth) return;
    if (!authChecked) return;   // still loading
    if (user) return;           // authenticated
    if (isAuthError) return;    // server error — don't redirect, show error

    const redirectPath = options?.redirectTo ?? "/auth";
    sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
    window.location.href = redirectPath;
  }, [authChecked, user, isAuthError, options?.requireAuth, options?.redirectTo]);

  return {
    user: user ?? null,
    isLoading,
    authChecked,
    isAuthenticated: !!user,
    isAuthError,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
