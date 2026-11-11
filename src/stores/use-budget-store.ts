import { create } from "zustand";

import {
    createBudgetCategory as createBudgetCategoryService,
    createBudget as createBudgetService,
    deleteBudgetCategory as deleteBudgetCategoryService,
    deleteBudget as deleteBudgetService,
    getBudgetOverview,
    updateBudgetCategory as updateBudgetCategoryService,
    updateBudget as updateBudgetService,
} from "@/services/budget-service";

import type {
    budgetOverview,
    createBudgetCategoryInput,
    createBudgetInput,
    monthlyBudget,
    updateBudgetCategoryInput,
    updateBudgetInput,
} from "@/types/budget";

type budgetStore = {
  overview: budgetOverview | null;

  loading: boolean;
  error: string | null;

  loadedWorkspaceId: string | null;
  loadedBudgetMonth: string | null;

  fetchBudgetOverview: (
    workspaceId: string,
    budgetMonth: string,
  ) => Promise<void>;

  createBudget: (input: createBudgetInput) => Promise<monthlyBudget>;

  updateBudget: (budgetId: string, input: updateBudgetInput) => Promise<void>;

  deleteBudget: (budgetId: string) => Promise<void>;

  createBudgetCategory: (input: createBudgetCategoryInput) => Promise<void>;

  updateBudgetCategory: (
    categoryBudgetId: string,
    input: updateBudgetCategoryInput,
  ) => Promise<void>;

  deleteBudgetCategory: (categoryBudgetId: string) => Promise<void>;

  resetBudget: () => void;
};

let fetchRequestId = 0;

export const useBudgetStore = create<budgetStore>((set, get) => {
  const refreshBudget = async () => {
    const { loadedWorkspaceId, loadedBudgetMonth } = get();

    if (!loadedWorkspaceId || !loadedBudgetMonth) return;

    const requestId = ++fetchRequestId;

    set({
      loading: true,
      error: null,
    });

    try {
      const overview = await getBudgetOverview(
        loadedWorkspaceId,
        loadedBudgetMonth,
      );

      if (requestId !== fetchRequestId) return;

      set({
        overview,
        loading: false,
        error: null,
      });
    } catch (error) {
      if (requestId !== fetchRequestId) return;

      set({
        loading: false,
        error:
          error instanceof Error ? error.message : "Failed to load budget.",
      });

      throw error;
    }
  };

  return {
    overview: null,

    loading: false,
    error: null,

    loadedWorkspaceId: null,
    loadedBudgetMonth: null,

    // =================================================
    // FETCH BUDGET OVERVIEW
    // =================================================

    fetchBudgetOverview: async (workspaceId, budgetMonth) => {
      const requestId = ++fetchRequestId;

      set({
        overview: null,
        loading: true,
        error: null,
        loadedWorkspaceId: workspaceId,
        loadedBudgetMonth: budgetMonth,
      });

      try {
        const overview = await getBudgetOverview(workspaceId, budgetMonth);

        if (requestId !== fetchRequestId) return;

        set({
          overview,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (requestId !== fetchRequestId) return;

        set({
          overview: null,
          loading: false,
          error:
            error instanceof Error ? error.message : "Failed to load budget.",
        });
      }
    },

    // =================================================
    // CREATE BUDGET
    // =================================================

    createBudget: async (input) => {
      set({ error: null });

      try {
        const budget = await createBudgetService(input);

        if (
          get().loadedWorkspaceId === input.workspaceId &&
          get().loadedBudgetMonth === input.budgetMonth
        ) {
          await refreshBudget();
        }

        return budget;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create budget.";

        set({ error: message });
        throw error;
      }
    },

    // =================================================
    // UPDATE BUDGET
    // =================================================

    updateBudget: async (budgetId, input) => {
      set({ error: null });

      try {
        await updateBudgetService(budgetId, input);
        await refreshBudget();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update budget.";

        set({ error: message });
        throw error;
      }
    },

    // =================================================
    // DELETE BUDGET
    // =================================================

    deleteBudget: async (budgetId) => {
      set({ error: null });

      try {
        await deleteBudgetService(budgetId);

        await refreshBudget();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete budget.";

        set({ error: message });
        throw error;
      }
    },

    // =================================================
    // CREATE CATEGORY BUDGET
    // =================================================

    createBudgetCategory: async (input) => {
      set({ error: null });

      try {
        await createBudgetCategoryService(input);
        await refreshBudget();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create category budget.";

        set({ error: message });
        throw error;
      }
    },

    // =================================================
    // UPDATE CATEGORY BUDGET
    // =================================================

    updateBudgetCategory: async (categoryBudgetId, input) => {
      set({ error: null });

      try {
        await updateBudgetCategoryService(categoryBudgetId, input);

        await refreshBudget();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update category budget.";

        set({ error: message });
        throw error;
      }
    },

    // =================================================
    // DELETE CATEGORY BUDGET
    // =================================================

    deleteBudgetCategory: async (categoryBudgetId) => {
      set({ error: null });

      try {
        await deleteBudgetCategoryService(categoryBudgetId);
        await refreshBudget();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to delete category budget.";

        set({ error: message });
        throw error;
      }
    },

    // =================================================
    // RESET
    // =================================================

    resetBudget: () => {
      fetchRequestId++;

      set({
        overview: null,
        loading: false,
        error: null,
        loadedWorkspaceId: null,
        loadedBudgetMonth: null,
      });
    },
  };
});
