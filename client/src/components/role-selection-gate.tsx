import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
export function RoleSelectionGate({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { data } = useQuery<{ roleSelectionRequired?: boolean } | null>({
    queryKey: ["messenger-notification-user", location],
    queryFn: async () => {
      const r = await fetch("/api/auth/user", { credentials: "include" });
      return r.ok ? r.json() : null;
    },
    retry: false,
  });
  const pending = data?.roleSelectionRequired && location !== "/choose-role";
  useEffect(() => {
    if (pending) navigate("/choose-role", { replace: true });
  }, [pending, navigate]);
  return pending ? null : <>{children}</>;
}
