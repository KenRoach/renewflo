// ─── Auth Store ───
// Zustand store for authentication state via RenewFlow API (Supabase Auth)

import { create } from "zustand";
import type { AuthUser, UserRole } from "@/types";
import {
  signup as apiSignup,
  login as apiLogin,
  forgotPassword as apiForgotPassword,
  resetPassword as apiResetPassword,
  type SignupParams,
  type LoginParams,
  type AuthError,
} from "@/services/auth";

const TOKEN_KEY = "renewflow_token";
const USER_KEY = "renewflow_user";

type ResetState = "idle" | "sending" | "sent" | "resetting" | "success" | "error";

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  // Password reset
  resetState: ResetState;
  resetError: string | null;

  signup: (params: SignupParams) => Promise<void>;
  login: (params: LoginParams) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
  clearError: () => void;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  clearResetState: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,
  resetState: "idle" as ResetState,
  resetError: null,

  signup: async (params) => {
    set({ loading: true, error: null });
    try {
      const result = await apiSignup(params);
      const user: AuthUser = {
        id: result.userId,
        email: params.email,
        name: result.name,
        orgId: result.orgId,
        role: result.role || "var",
      };
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, token: result.token, loading: false, error: null });
    } catch (err) {
      const authErr = err as AuthError;
      set({ loading: false, error: authErr.message || "Signup failed" });
    }
  },

  login: async (params) => {
    set({ loading: true, error: null });
    try {
      const result = await apiLogin(params);
      const user: AuthUser = {
        id: result.userId,
        email: params.email,
        name: result.name,
        orgId: result.orgId,
        role: result.role || "var",
      };
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, token: result.token, loading: false, error: null });
    } catch (err) {
      const authErr = err as AuthError;
      set({ loading: false, error: authErr.message || "Invalid email or password" });
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ user: null, token: null, error: null });
  },

  hydrate: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    if (token && userJson) {
      try {
        const parsed = JSON.parse(userJson) as AuthUser;
        // Ensure role is set (backward compat for existing sessions)
        const user: AuthUser = {
          ...parsed,
          role: parsed.role || ("var" as UserRole),
        };
        set({ user, token });
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
  },

  clearError: () => set({ error: null }),

  requestPasswordReset: async (email) => {
    set({ resetState: "sending", resetError: null });
    try {
      await apiForgotPassword(email);
      set({ resetState: "sent", resetError: null });
    } catch (err) {
      const authErr = err as AuthError;
      set({
        resetState: "error",
        resetError: authErr.message || "Failed to send reset email",
      });
    }
  },

  resetPassword: async (token, password) => {
    set({ resetState: "resetting", resetError: null });
    try {
      await apiResetPassword(token, password);
      set({ resetState: "success", resetError: null });
    } catch (err) {
      const authErr = err as AuthError;
      set({
        resetState: "error",
        resetError: authErr.message || "Failed to reset password",
      });
    }
  },

  clearResetState: () => set({ resetState: "idle", resetError: null }),
}));
