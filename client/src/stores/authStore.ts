// import { create } from "zustand";
// import { createJSONStorage, persist } from "zustand/middleware";
// import type { User } from "../types/api";

// export type SignOutReason = "expired" | "manual" | null;

// interface AuthState {
//   token: string | null;
//   user: User | null;
//   /** In-memory only: why the user is signed out (drives the expiry message and ?redirect=). */
//   signOutReason: SignOutReason;
//   setSession: (token: string, user: User) => void;
//   setUser: (user: User) => void;
//   clearSession: () => void;
//   markSignedOut: (reason: Exclude<SignOutReason, null>) => void;
// }

// export const useAuthStore = create<AuthState>()(
//   persist(
//     (set) => ({
//       token: null,
//       user: null,
//       signOutReason: null,
//       setSession: (token, user) => set({ token, user, signOutReason: null }),
//       setUser: (user) => set({ user }),
//       clearSession: () => set({ token: null, user: null }),
//       markSignedOut: (reason) => set({ signOutReason: reason }),
//     }),
//     {
//       name: "kanbot.auth",
//       version: 1,
//       storage: createJSONStorage(() => localStorage),
//       // Persist only what is needed to restore a session; never UI flags.
//       partialize: (state) => ({ token: state.token, user: state.user }),
//     },
//   ),
// );
