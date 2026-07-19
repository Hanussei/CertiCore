import { create } from "zustand";
import type { User } from "@/types";
import { currentUser, signIn as bridgeSignIn, signOut as bridgeSignOut } from "@/lib/bridge/auth";

type AuthState = {
  user: User | null;
  status: "idle" | "loading" | "ready";
  error: string | null;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  error: null,
  hydrate: async () => {
    set({ status: "loading" });
    const res = await currentUser();
    set({ user: res.ok ? res.data : null, status: "ready" });
  },
  signIn: async (email, password) => {
    set({ status: "loading", error: null });
    const res = await bridgeSignIn(email, password);
    if (!res.ok) {
      set({ status: "ready", error: res.error.message });
      return false;
    }
    set({ user: res.data, status: "ready", error: null });
    return true;
  },
  signOut: async () => {
    await bridgeSignOut();
    set({ user: null });
  },
}));
