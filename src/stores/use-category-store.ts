import { create } from "zustand";

import { getCategories } from "@/services/category-service";

import type { financialCategory } from "@/types/finances";

type categoryState = {
  categories: financialCategory[];
  categoriesLoading: boolean;
  categoriesError: string | null;

  fetchCategories: () => Promise<void>;
  resetCategories: () => void;
};

let categoryRequestId = 0;

export const useCategoryStore = create<categoryState>((set) => ({
  categories: [],
  categoriesLoading: false,
  categoriesError: null,

  fetchCategories: async () => {
    const requestId = ++categoryRequestId;

    set({
      categories: [],
      categoriesLoading: true,
      categoriesError: null,
    });

    try {
      const categories = await getCategories();

      if (requestId !== categoryRequestId) return;

      set({ categories });
    } catch (error) {
      if (requestId !== categoryRequestId) return;

      console.error("Failed to fetch categories:", error);

      set({
        categoriesError:
          error instanceof Error ? error.message : "Failed to load categories.",
      });
    } finally {
      if (requestId === categoryRequestId) {
        set({ categoriesLoading: false });
      }
    }
  },

  resetCategories: () => {
    categoryRequestId++;

    set({
      categories: [],
      categoriesLoading: false,
      categoriesError: null,
    });
  },
}));
