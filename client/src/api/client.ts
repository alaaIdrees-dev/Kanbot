import axios, { AxiosError, type Method } from "axios";
import type { ApiErrorBody, ErrorCode } from "../types/api";

/** Error codes from the server contract, plus one raised by the client itself. */
export type ApiErrorCode = ErrorCode | "NETWORK_ERROR";

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: ApiErrorDetail[];

  constructor(status: number, code: ApiErrorCode, message: string, details?: ApiErrorDetail[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Maps `details[]` of a validation error to `{ [field]: message }` for form `setError`. */
export function fieldErrors(err: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (err instanceof ApiError) {
    for (const { path, message } of err.details ?? []) {
      if (!(path in result)) result[path] = message;
    }
  }
  return result;
}

// ───────────────────── Session hooks (set by the AuthProvider) ─────────────────────
// The client never imports React code: the AuthProvider registers these instead,
// which avoids a circular dependency between `api/` and `features/auth/`.

let tokenProvider: (() => string | null) | null = null;
let unauthorizedHandler: (() => void) | null = null;

/**
 * The token is read on every request (not cached), so a token that was removed from storage,
 * e.g. in DevTools, is never sent again and the next 401 ends the session (AUTH-6).
 */
export function setTokenProvider(provider: (() => string | null) | null): void {
  tokenProvider = provider;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

// ───────────────────────────────── Request ─────────────────────────────────

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  headers: { "Content-Type": "application/json" },
});

/** 401 on these paths means "wrong credentials", not "session expired". */
const PUBLIC_AUTH_PATHS = ["/auth/login", "/auth/register"];

export interface RequestOptions {
  /** Do not trigger the session-expired flow on 401 (used by the startup `/auth/me`). */
  skipUnauthorizedHandler?: boolean;
}

export async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  try {
    const token = tokenProvider?.() ?? null;
    const response = await http.request<T>({
      method,
      url: path,
      data: body,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    // 204 No Content has an empty body.
    return response.status === 204 ? (undefined as T) : response.data;
  } catch (error) {
    throw toApiError(error, path, options);
  }
}

/**
 * Fire-and-forget request that survives the page being closed (`keepalive`). Only used to commit a
 * pending, undoable delete when the tab is closed or reloaded; there is nobody left to show errors to.
 */
export function sendKeepalive(method: "DELETE", path: string): void {
  const token = tokenProvider?.() ?? null;
  if (!token) return;
  const base = (import.meta.env.VITE_API_URL as string).replace(/\/$/, "");
  fetch(`${base}${path}`, {
    method,
    keepalive: true,
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => undefined);
}

function toApiError(error: unknown, path: string, options: RequestOptions): ApiError {
  if (!axios.isAxiosError(error)) {
    return new ApiError(0, "INTERNAL_ERROR", "Something went wrong.");
  }
  const axiosError = error as AxiosError<ApiErrorBody>;

  // No response at all: server down, CORS, offline.
  if (!axiosError.response) {
    return new ApiError(0, "NETWORK_ERROR", "Cannot reach the server. Is it running?");
  }

  const { status, data } = axiosError.response;
  const apiError = new ApiError(
    status,
    data?.error?.code ?? "INTERNAL_ERROR",
    data?.error?.message ?? "Something went wrong on our side.",
    data?.error?.details,
  );

  if (status === 401 && !PUBLIC_AUTH_PATHS.includes(path) && !options.skipUnauthorizedHandler) {
    unauthorizedHandler?.();
  }
  return apiError;
}
