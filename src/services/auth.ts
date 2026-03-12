// ─── Auth Service ───
// Email/password authentication via Kitz Gateway

import type { AuthTokenPayload, UserRole } from "@/types";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:4000";

export interface SignupParams {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface AuthError {
  code: string;
  message: string;
}

async function authRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    const err: AuthError = {
      code: data.code || "UNKNOWN",
      message: data.message || "An error occurred",
    };
    throw err;
  }

  return data as T;
}

async function authGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${endpoint}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();

  if (!res.ok) {
    const err: AuthError = {
      code: data.code || "UNKNOWN",
      message: data.message || "An error occurred",
    };
    throw err;
  }

  return data as T;
}

export async function signup(params: SignupParams): Promise<AuthTokenPayload> {
  return authRequest<AuthTokenPayload>("/auth/signup", { ...params });
}

export async function login(params: LoginParams): Promise<AuthTokenPayload> {
  return authRequest<AuthTokenPayload>("/auth/token", { ...params });
}

export async function forgotPassword(
  email: string,
): Promise<{ success: boolean; message: string }> {
  return authRequest<{ success: boolean; message: string }>(
    "/auth/forgot-password",
    { email },
  );
}

export async function validateResetToken(
  token: string,
): Promise<{ valid: boolean; email?: string }> {
  return authGet<{ valid: boolean; email?: string }>(
    `/auth/validate-reset-token/${token}`,
  );
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<{ success: boolean; message: string }> {
  return authRequest<{ success: boolean; message: string }>(
    "/auth/reset-password",
    { token, password },
  );
}
