import { useEffect, useState } from "react";
import type { User } from "@shared/models/auth";
import { logger } from "@/lib/logger";
import { setUser as setSentryUser } from "@/lib/sentry";

async function fetchUser(): Promise<User | null> {
  try {
    const response = await fetch("/api/auth/user", {
      credentials: "include",
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      logger.warn(`fetchUser: unexpected status ${response.status}`, {
        source: "use-auth",
      });
      return null;
    }

    return response.json();
  } catch (_err) {
    logger.warn("fetchUser: network error", { source: "use-auth" });
    return null;
  }
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const nextUser = await fetchUser();
      if (cancelled) return;
      setUser(nextUser);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      setSentryUser({
        id: user.id,
        email: user.email ?? undefined,
        username: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
        role: user.isAdmin ? "admin" : undefined,
      });
      return;
    }

    setSentryUser(null);
  }, [user, isLoading]);

  useEffect(() => {
    if (!options?.requireAuth || isLoading || user) return;

    const redirectPath = options.redirectTo || "/auth";
    sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
    window.location.href = redirectPath;
  }, [user, isLoading, options?.requireAuth, options?.redirectTo]);

  const logout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await doLogout();
      window.location.href = "/auth";
    } catch (error) {
      logger.error("Logout error", error);
      window.location.href = "/api/logout";
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    isLoggingOut,
  };
}
