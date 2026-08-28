import { api } from "@/services/api";
import type { ApiMessage, AuthUser, TokenData } from "@/types";

export async function login(email: string, password: string) {
  const { data } = await api.post<ApiMessage<TokenData>>("/auth/login", {
    email,
    password,
  });
  return data;
}

export async function register(email: string, password: string, full_name: string) {
  const { data } = await api.post<ApiMessage>("/auth/register", {
    email,
    password,
    full_name,
  });
  return data;
}

export async function logout(refresh_token: string) {
  const { data } = await api.post<ApiMessage>("/auth/logout", { refresh_token });
  return data;
}

export async function getMe() {
  const { data } = await api.get<ApiMessage<AuthUser>>("/auth/me");
  return data.data;
}

export async function forgotPassword(email: string) {
  const { data } = await api.post<ApiMessage>("/auth/forgot-password", { email });
  return data;
}

export async function verifyOtp(email: string, otp_code: string) {
  const { data } = await api.post<ApiMessage>("/auth/verify-otp", { email, otp_code });
  return data;
}

export async function resetPassword(email: string, otp_code: string, new_password: string) {
  const { data } = await api.post<ApiMessage>("/auth/reset-password", {
    email,
    otp_code,
    new_password,
  });
  return data;
}
