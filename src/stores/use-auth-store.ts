import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

type authState = {
  session: Session | null;
  user: User | null;
  initialized: boolean;

  setSession: (session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
};

export const useAuthStore = create<authState>((set) => ({
  session: null,
  user: null,
  initialized: false,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
    }),

  setInitialized: (initialized) => set({ initialized }),
}));
