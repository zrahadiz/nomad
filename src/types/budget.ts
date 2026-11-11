export type monthlyBudget = {
  id: string;
  workspaceId: string;
  budgetMonth: string;
  amountLimit: number;
  createdAt: string;
  updatedAt: string;
};

export type budgetCategory = {
  id: string;
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  amountLimit: number;
  createdAt: string;
  updatedAt: string;
};

export type createBudgetInput = {
  workspaceId: string;
  budgetMonth: string;
  amountLimit: number;
};

export type updateBudgetInput = {
  amountLimit: number;
};

export type createBudgetCategoryInput = {
  budgetId: string;
  categoryId: string;
  amountLimit: number;
};

export type updateBudgetCategoryInput = {
  amountLimit: number;
};

export type categoryBudgetOverview = budgetCategory & {
  amountSpent: number;
  remainingAmount: number;
};

export type budgetOverview = {
  budget: monthlyBudget;
  amountSpent: number;
  remainingAmount: number;
  categories: categoryBudgetOverview[];
};

export type monthlySpending = {
  totalSpent: number;
  categorySpending: Record<string, number>;
};
