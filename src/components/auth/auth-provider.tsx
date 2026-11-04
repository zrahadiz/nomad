import { useEffect, type PropsWithChildren } from "react";

import { supabase } from "@/lib/supabase/client";
import { getMyProfile } from "@/services/profile-service";
import { useAuthStore } from "@/stores/use-auth-store";
import { useProfileStore } from "@/stores/use-profile-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

export function AuthProvider({ children }: PropsWithChildren) {
  const setSession = useAuthStore((state) => state.setSession);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const userId = useAuthStore((state) => state.user?.id);

  // Listen for authentication changes
  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setSession(session);
      setInitialized(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSession, setInitialized]);

  // Load the user's profile
  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!userId) {
        useProfileStore.getState().setProfile(null);
        useProfileStore.getState().setLoading(false);
        return;
      }

      useProfileStore.getState().setLoading(true);

      try {
        const profile = await getMyProfile();

        if (active) {
          useProfileStore.getState().setProfile(profile);
        }
      } catch (error) {
        console.error("Failed to load profile:", error);

        if (active) {
          useProfileStore.getState().setProfile(null);
        }
      } finally {
        if (active) {
          useProfileStore.getState().setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [userId]);

  // Load the user's workspaces
  useEffect(() => {
    const workspaceStore = useWorkspaceStore.getState();

    // Clear previous user's workspace data and invalidate old requests.
    workspaceStore.resetWorkspaces();

    // Don't fetch if there is no authenticated user.
    if (!userId) return;

    // Fetch workspaces for the current user.
    void useWorkspaceStore.getState().fetchWorkspaces();
  }, [userId]);

  return <>{children}</>;
}
