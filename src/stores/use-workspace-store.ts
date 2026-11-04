import { create } from "zustand";

import {
  createWorkspace,
  deleteWorkspace,
  getMyWorkspaces,
  updateWorkspace,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
  type Workspace,
} from "@/services/workspace-service";

type workspaceState = {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;

  fetchWorkspaces: () => Promise<void>;
  setActiveWorkspace: (id: string) => void;

  addWorkspace: (input: CreateWorkspaceInput) => Promise<Workspace>;
  editWorkspace: (
    id: string,
    input: UpdateWorkspaceInput,
  ) => Promise<Workspace>;
  removeWorkspace: (id: string) => Promise<void>;

  resetWorkspaces: () => void;
};

let workspaceRequestId = 0;

export const useWorkspaceStore = create<workspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  loading: false,
  initialized: false,
  error: null,

  fetchWorkspaces: async () => {
    // Create a unique ID for this request.
    const requestId = ++workspaceRequestId;

    set({ loading: true, error: null });

    try {
      const workspaces = await getMyWorkspaces();

      // Ignore the result if a newer request has started.
      if (requestId !== workspaceRequestId) return;

      const currentActiveId = get().activeWorkspaceId;

      const activeWorkspaceExists = workspaces.some(
        (workspace) => workspace.id === currentActiveId,
      );

      set({
        workspaces,
        activeWorkspaceId: activeWorkspaceExists
          ? currentActiveId
          : (workspaces[0]?.id ?? null),
        initialized: true,
        error: null,
      });
    } catch (error) {
      // Ignore errors from outdated requests too.
      if (requestId !== workspaceRequestId) return;

      console.error("Failed to fetch workspaces:", error);

      set({
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while loading your workspaces.",
        initialized: true,
      });
    } finally {
      // Only the latest request can change the loading state.
      if (requestId === workspaceRequestId) {
        set({ loading: false });
      }
    }
  },

  setActiveWorkspace: (id) => {
    const exists = get().workspaces.some((workspace) => workspace.id === id);

    if (exists) set({ activeWorkspaceId: id });
  },

  addWorkspace: async (input) => {
    const workspace = await createWorkspace(input);

    set((state) => ({
      workspaces: [...state.workspaces, workspace],
      activeWorkspaceId: state.activeWorkspaceId ?? workspace.id,
    }));

    return workspace;
  },

  editWorkspace: async (id, input) => {
    const workspace = await updateWorkspace(id, input);

    set((state) => ({
      workspaces: state.workspaces.map((item) =>
        item.id === id ? workspace : item,
      ),
    }));

    return workspace;
  },

  removeWorkspace: async (id) => {
    await deleteWorkspace(id);

    set((state) => {
      const workspaces = state.workspaces.filter(
        (workspace) => workspace.id !== id,
      );

      return {
        workspaces,
        activeWorkspaceId:
          state.activeWorkspaceId === id
            ? (workspaces[0]?.id ?? null)
            : state.activeWorkspaceId,
      };
    });
  },

  resetWorkspaces: () => {
    // Invalidate any workspace request currently in progress.
    workspaceRequestId++;

    set({
      workspaces: [],
      activeWorkspaceId: null,
      loading: false,
      initialized: false,
      error: null,
    });
  },
}));
