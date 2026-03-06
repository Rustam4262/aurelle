import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMe, login, logout, register, type LoginPayload, type RegisterPayload } from "../lib/auth";

export const AUTH_KEY = ["auth", "me"] as const;

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: AUTH_KEY,
    queryFn: getMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    role: user?.role ?? null,
  };
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: (user) => {
      qc.setQueryData(AUTH_KEY, user);
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterPayload) => register(payload),
    onSuccess: (user) => {
      qc.setQueryData(AUTH_KEY, user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      qc.setQueryData(AUTH_KEY, null);
      qc.clear();
    },
  });
}
