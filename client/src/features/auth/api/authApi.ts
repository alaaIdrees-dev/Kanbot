import type { AuthResponse, LoginRequest, MeResponse, RegisterRequest, User } from "../../../types/api";
import { request } from "../../../api/client";

export const register = (data: RegisterRequest) =>
  request<AuthResponse>("POST", "/auth/register", data);

export const login = (data: LoginRequest) => request<AuthResponse>("POST", "/auth/login", data);

/**
 * Validates the stored token on startup. A 401 here only means "no valid
 * session", so it must not show the "session expired" message.
 */
export const me = async (): Promise<User> => {
  const { user } = await request<MeResponse>("GET", "/auth/me", undefined, {
    skipUnauthorizedHandler: true,
  });
  return user;
};
