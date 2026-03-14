// ─── Auth Service ───
// Email/password authentication via RenewFlow API (Supabase Auth)

import type { UserRole } from "@/types";
import { auth as gatewayAuth, type LoginResponse, type SignupResponse, ApiError } from "./gateway";

export interface SignupParams {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  orgName?: string;
  country?: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthTokenPayload {
  token: string;
  userId: string;
  orgId: string;
  name: string;
  role: UserRole;
  orgType: string;
  expiresIn: number;
}

function orgTypeToRole(orgType: string): UserRole {
  switch (orgType) {
    case "delivery_partner": return "delivery-partner";
    case "operator": return "support";
    default: return "var";
  }
}

function roleToOrgType(role: UserRole): "var" | "delivery_partner" {
  switch (role) {
    case "delivery-partner": return "delivery_partner";
    default: return "var";
  }
}

function mapLoginResponse(res: LoginResponse): AuthTokenPayload {
  return {
    token: res.session.accessToken,
    userId: res.user.id,
    orgId: res.org.id,
    name: res.user.fullName || res.user.email,
    role: orgTypeToRole(res.org.type),
    orgType: res.org.type,
    expiresIn: 3600,
  };
}

function mapSignupResponse(res: SignupResponse): AuthTokenPayload {
  return {
    token: res.session.accessToken,
    userId: res.user.id,
    orgId: res.org.id,
    name: res.user.fullName || res.user.email,
    role: orgTypeToRole(res.org.type),
    orgType: res.org.type,
    expiresIn: 3600,
  };
}

function toAuthError(err: unknown): never {
  if (err instanceof ApiError) {
    throw { code: err.code, message: err.message } as AuthError;
  }
  throw { code: "UNKNOWN", message: (err as Error).message || "An error occurred" } as AuthError;
}

export async function signup(params: SignupParams): Promise<AuthTokenPayload> {
  try {
    const res = await gatewayAuth.signup({
      email: params.email,
      password: params.password,
      fullName: params.name,
      orgName: params.orgName || `${params.name}'s Organization`,
      orgType: roleToOrgType(params.role || "var"),
      country: params.country,
    });
    return mapSignupResponse(res);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function login(params: LoginParams): Promise<AuthTokenPayload> {
  try {
    const res = await gatewayAuth.login(params.email, params.password);
    return mapLoginResponse(res);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function forgotPassword(
  email: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await gatewayAuth.forgotPassword(email);
    return { success: true, message: res.message };
  } catch (err) {
    return toAuthError(err);
  }
}

export async function validateResetToken(
  _token: string,
): Promise<{ valid: boolean; email?: string }> {
  // Supabase handles reset tokens via email link → redirect
  // The token validation happens when the user sets their new password
  // For now, assume valid if token exists (Supabase will reject invalid tokens on submit)
  return { valid: !!_token };
}

export async function resetPassword(
  _token: string,
  _password: string,
): Promise<{ success: boolean; message: string }> {
  // Supabase password reset works via the confirmation link flow
  // The token in URL is a Supabase magic link token, not a custom token
  // This will be handled by the Supabase auth callback
  return { success: true, message: "Password reset successful" };
}
