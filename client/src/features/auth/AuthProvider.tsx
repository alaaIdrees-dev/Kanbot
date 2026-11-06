import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as authApi from "./api/authApi";
import { ApiError, setTokenProvider, setUnauthorizedHandler } from "../../api/client";
import type { LoginRequest, RegisterRequest, User } from "../../types/api";
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  type SignOutReason,
} from "./AuthContext";

const TOKEN_KEY = "kanbot.token";

// Only the JWT is stored client-side (NFR-7). Storage can throw (private mode): the token is then
// kept in memory, so the session works but won't survive a reload.
let memoryToken: string | null = null;
let storageUsable = true;
const storage = {
  get: (): string | null => {
    if (storageUsable) {
      try {
        return localStorage.getItem(TOKEN_KEY);
      } catch {
        storageUsable = false;
      }
    }
    return memoryToken;
  },
  set: (token: string) => {
    memoryToken = token;
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      storageUsable = false;
    }
  },
  clear: () => {
    memoryToken = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* nothing to clear */
    }
  },
};

// Registered at import time so the very first request already has its token source.
setTokenProvider(storage.get);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    storage.get() ? "loading" : "unauthenticated",
  );
  const [signOutReason, setSignOutReason] = useState<SignOutReason>(null);
  const [attempt, setAttempt] = useState(0);
  // True while this tab holds a verified session; gates the 401 handler (not the storage content).
  const sessionActive = useRef(false);

  const startSession = useCallback((token: string, nextUser: User) => {
    storage.set(token);
    sessionActive.current = true;
    setUser(nextUser);
    setSignOutReason(null);
    setStatus("authenticated");
  }, []);

  const endSession = useCallback(
    (reason: SignOutReason) => {
      storage.clear();
      sessionActive.current = false;
      setUser(null);
      setSignOutReason(reason);
      setStatus("unauthenticated");
      queryClient.clear();
    },
    [queryClient],
  );

  // AUTH-6: any 401 (except login) ends the session, even if the token was removed from storage.
  // Ignored when already signed out.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (sessionActive.current) endSession("expired");
    });
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  // AUTH-3: verify the stored token with /auth/me on startup.
  useEffect(() => {
    const token = storage.get();
    if (!token) return;
    let cancelled = false;
    authApi
      .me()
      .then((currentUser) => {
        if (cancelled) return;
        sessionActive.current = true;
        setUser(currentUser);
        setStatus("authenticated");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          endSession(null); // no valid session: plain login page, no "expired" message
        } else {
          setStatus("error"); // keep the token: the server may just be down
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, endSession]);

  const login = useCallback(
    async (data: LoginRequest) => {
      const { token, user: nextUser } = await authApi.login(data);
      startSession(token, nextUser);
    },
    [startSession],
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      const { token, user: nextUser } = await authApi.register(data);
      startSession(token, nextUser);
    },
    [startSession],
  );

  const logout = useCallback(() => endSession("manual"), [endSession]);

  const clearSignOutReason = useCallback(() => setSignOutReason(null), []);

  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, signOutReason, login, register, logout, clearSignOutReason, retry }),
    [user, status, signOutReason, login, register, logout, clearSignOutReason, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
