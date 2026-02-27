import { ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Role required in addition to being authenticated */
  requireAdmin?: boolean;
}

/**
 * Wraps a route that requires authentication.
 *
 * Behaviour:
 * - Auth still loading  → shows a centered spinner (never renders children prematurely)
 * - Not authenticated   → redirects to /auth?next=<currentPath>
 * - Auth server error   → shows "service unavailable" banner (does NOT crash the app)
 * - Authenticated       → renders children normally
 * - requireAdmin=true   → additionally checks user.isAdmin
 */
export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, authChecked, isAuthError } = useAuth();
  const [location] = useLocation();

  // Still performing the initial auth check — show a spinner, never children
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Auth server returned 5xx / network error
  if (isAuthError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center max-w-md">
          <p className="text-lg font-medium text-foreground mb-2">Сервис временно недоступен</p>
          <p className="text-sm text-muted-foreground mb-4">
            Не удалось проверить авторизацию. Попробуйте обновить страницу.
          </p>
          <button
            className="text-sm text-primary underline"
            onClick={() => window.location.reload()}
          >
            Обновить
          </button>
        </div>
      </div>
    );
  }

  // Guest — redirect to /auth with return path
  if (!user) {
    const next = encodeURIComponent(location);
    sessionStorage.setItem("redirectAfterLogin", location);
    return <Redirect to={`/auth?next=${next}`} />;
  }

  // Admin-only check
  if (requireAdmin && !(user as any).isAdmin) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
