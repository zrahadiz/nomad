import { create } from "zustand";

import {
    deleteWorkspaceCurrencyConverter as deleteWorkspaceCurrencyConverterService,
    getWorkspaceCurrencyConverter,
    saveWorkspaceCurrencyConverter as saveWorkspaceCurrencyConverterService,
} from "@/services/currency-converter-service";

import type {
    saveWorkspaceCurrencyConverterInput,
    workspaceCurrencyConverter,
} from "@/types/currency-converter";

type currencyConverterState = {
  converter: workspaceCurrencyConverter | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  loadedWorkspaceId: string | null;

  fetchConverter: (workspaceId: string) => Promise<void>;

  saveConverter: (
    input: saveWorkspaceCurrencyConverterInput,
  ) => Promise<workspaceCurrencyConverter>;

  deleteConverter: (workspaceId: string) => Promise<void>;

  resetConverter: () => void;
};

let fetchRequestId = 0;

export const useCurrencyConverterStore = create<currencyConverterState>(
  (set, get) => ({
    converter: null,
    loading: false,
    saving: false,
    error: null,
    loadedWorkspaceId: null,

    fetchConverter: async (workspaceId) => {
      const requestId = ++fetchRequestId;

      set({
        converter: null,
        loading: true,
        error: null,
        loadedWorkspaceId: workspaceId,
      });

      try {
        const converter = await getWorkspaceCurrencyConverter(workspaceId);

        if (requestId !== fetchRequestId) return;

        set({
          converter,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (requestId !== fetchRequestId) return;

        console.error("Failed to fetch currency converter:", error);

        set({
          converter: null,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load currency converter.",
        });
      }
    },

    saveConverter: async (input) => {
      set({ saving: true, error: null });

      try {
        const converter = await saveWorkspaceCurrencyConverterService(input);

        if (get().loadedWorkspaceId === input.workspaceId) {
          set({ converter });
        }

        return converter;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to save currency converter.";

        set({ error: message });
        throw error;
      } finally {
        set({ saving: false });
      }
    },

    deleteConverter: async (workspaceId) => {
      set({ saving: true, error: null });

      try {
        await deleteWorkspaceCurrencyConverterService(workspaceId);

        if (get().loadedWorkspaceId === workspaceId) {
          set({ converter: null });
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to delete currency converter.";

        set({ error: message });
        throw error;
      } finally {
        set({ saving: false });
      }
    },

    resetConverter: () => {
      fetchRequestId++;

      set({
        converter: null,
        loading: false,
        saving: false,
        error: null,
        loadedWorkspaceId: null,
      });
    },
  }),
);
