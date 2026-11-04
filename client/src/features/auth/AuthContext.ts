import { createContext } from "react";
import type { LoginRequest, RegisterRequest, User } from "../../types/api";

/** `error` = the startup session check failed for a reason other than 401 (e.g. server down). */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

/** Why the user is signed out: drives the message and the `?redirect=` behaviour. */
export type SignOutReason = "expired" | "manual" | null;

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  signOutReason: SignOutReason;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  /** Forget a finished manual logout, so later redirects to /login carry `?redirect=` again. */
  clearSignOutReason: () => void;
  /** Retry the startup session check after a failure. */
  retry: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
