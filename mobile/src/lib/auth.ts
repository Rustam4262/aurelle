import { api } from "./api";
import * as SecureStore from "expo-secure-store";

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "client" | "salon_owner" | "master" | "admin";
  avatarUrl?: string;
  phone?: string;
  emailVerified?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
}

export async function getMe(): Promise<AuthUser | null> {
  try {
    const { data } = await api.get<{ user: AuthUser | null }>("/api/auth/user");
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const { data } = await api.post<{ user: AuthUser }>("/api/auth/login", payload);
  return data.user;
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const { data } = await api.post<{ user: AuthUser }>("/api/auth/register", payload);
  return data.user;
}

export async function logout(): Promise<void> {
  await api.post("/api/logout").catch(() => {});
  await SecureStore.deleteItemAsync("aurelle_session").catch(() => {});
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post("/api/auth/forgot-password", { email });
}
