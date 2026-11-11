import { supabase } from "@/lib/supabase/client";

import type {
    budgetCategory,
    budgetOverview,
    createBudgetCategoryInput,
    createBudgetInput,
    monthlyBudget,
    monthlySpending,
    updateBudgetCategoryInput,
    updateBudgetInput
} from "@/types/budget";

// =====================================================
// DATABASE ROW TYPES
// =====================================================

type budgetRow = {
  id: string;
  workspace_id: string;
  budget_month: string;
  amount_limit: number | string;
  created_at: string;
  updated_at: string;
};

type budgetCategoryRow = {
  id: string;
  budget_id: string;
  category_id: string;
  amount_limit: number | string;
  created_at: string;
  updated_at: string;
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
};

type transactionSpendingRow = {
  amount: number | string;
  category_id: string | null;
};

// =====================================================
// MAPPERS
// =====================================================

function mapBudget(row: budgetRow): monthlyBudget {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    budgetMonth: row.budget_month,
    amountLimit: Number(row.amount_limit),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBudgetCategory(row: budgetCategoryRow): budgetCategory {
  return {
    id: row.id,
    budgetId: row.budget_id,
    categoryId: row.category_id,
    categoryName: row.category?.name ?? "Unknown category",
    categoryIcon: row.category?.icon ?? null,
    categoryColor: row.category?.color ?? null,
    amountLimit: Number(row.amount_limit),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =====================================================
// VALIDATION HELPERS
// =====================================================

function validateAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Budget amount must be a positive safe integer.");
  }
}

function validateBudgetMonth(budgetMonth: string): void {
  if (!/^\d{4}-\d{2}-01$/.test(budgetMonth)) {
    throw new Error(
      "Budget month must be the first day of a month (YYYY-MM-01).",
    );
  }

  const date = new Date(`${budgetMonth}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== budgetMonth
  ) {
    throw new Error("Invalid budget month.");
  }
}

function getNextMonthDate(budgetMonth: string): string {
  const [year, month] = budgetMonth.split("-").map(Number);

  const nextMonth = new Date(Date.UTC(year, month, 1));

  return nextMonth.toISOString().slice(0, 10);
}

function toSafeAmount(value: number | string): number {
  const amount = Number(value);

  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error("Invalid spending amount returned from database.");
  }

  return amount;
}

// =====================================================
// FETCH BUDGET
// =====================================================

export async function getBudgetByMonth(
  workspaceId: string,
  budgetMonth: string,
): Promise<monthlyBudget | null> {
  validateBudgetMonth(budgetMonth);

  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("budget_month", budgetMonth)
    .maybeSingle();

  if (error) throw error;

  return data ? mapBudget(data as budgetRow) : null;
}

// =====================================================
// FETCH CATEGORY BUDGETS
// =====================================================

export async function getBudgetCategories(
  budgetId: string,
): Promise<budgetCategory[]> {
  const { data, error } = await supabase
    .from("budget_categories")
    .select(
      `
      id,
      budget_id,
      category_id,
      amount_limit,
      created_at,
      updated_at,
      category:categories (
        id,
        name,
        icon,
        color
      )
    `,
    )
    .eq("budget_id", budgetId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data as unknown as budgetCategoryRow[]).map(mapBudgetCategory);
}

// =====================================================
// CALCULATE MONTHLY EXPENSE SPENDING
// =====================================================

export async function getMonthlySpending(
  workspaceId: string,
  budgetMonth: string,
): Promise<monthlySpending> {
  validateBudgetMonth(budgetMonth);

  const nextMonth = getNextMonthDate(budgetMonth);

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, category_id")
    .eq("workspace_id", workspaceId)
    .eq("type", "expense")
    .gte("transaction_date", budgetMonth)
    .lt("transaction_date", nextMonth);

  if (error) throw error;

  const categorySpending: Record<string, number> = {};
  let totalSpent = 0;

  for (const transaction of (data ?? []) as transactionSpendingRow[]) {
    const amount = toSafeAmount(transaction.amount);

    totalSpent += amount;

    if (transaction.category_id) {
      categorySpending[transaction.category_id] =
        (categorySpending[transaction.category_id] ?? 0) + amount;
    }
  }

  if (!Number.isSafeInteger(totalSpent)) {
    throw new Error("Total spending exceeds the safe integer range.");
  }

  return {
    totalSpent,
    categorySpending,
  };
}

// =====================================================
// FETCH COMPLETE BUDGET OVERVIEW
// =====================================================

export async function getBudgetOverview(
  workspaceId: string,
  budgetMonth: string,
): Promise<budgetOverview | null> {
  const budget = await getBudgetByMonth(workspaceId, budgetMonth);

  if (!budget) return null;

  const [categories, spending] = await Promise.all([
    getBudgetCategories(budget.id),
    getMonthlySpending(workspaceId, budgetMonth),
  ]);

  return {
    budget,
    amountSpent: spending.totalSpent,
    remainingAmount: budget.amountLimit - spending.totalSpent,
    categories: categories.map((category) => {
      const amountSpent = spending.categorySpending[category.categoryId] ?? 0;

      return {
        ...category,
        amountSpent,
        remainingAmount: category.amountLimit - amountSpent,
      };
    }),
  };
}

// =====================================================
// CREATE BUDGET
// =====================================================

export async function createBudget(
  input: createBudgetInput,
): Promise<monthlyBudget> {
  validateAmount(input.amountLimit);
  validateBudgetMonth(input.budgetMonth);

  const { data, error } = await supabase
    .from("budgets")
    .insert({
      workspace_id: input.workspaceId,
      budget_month: input.budgetMonth,
      amount_limit: input.amountLimit,
    })
    .select("*")
    .single();

  if (error) throw error;

  return mapBudget(data as budgetRow);
}

// =====================================================
// UPDATE BUDGET
// =====================================================

export async function updateBudget(
  budgetId: string,
  input: updateBudgetInput,
): Promise<monthlyBudget> {
  validateAmount(input.amountLimit);

  const { data, error } = await supabase
    .from("budgets")
    .update({
      amount_limit: input.amountLimit,
    })
    .eq("id", budgetId)
    .select("*")
    .single();

  if (error) throw error;

  return mapBudget(data as budgetRow);
}

// =====================================================
// DELETE BUDGET
// =====================================================

export async function deleteBudget(budgetId: string): Promise<void> {
  const { error } = await supabase.from("budgets").delete().eq("id", budgetId);

  if (error) throw error;
}

// =====================================================
// CREATE CATEGORY BUDGET
// =====================================================

export async function createBudgetCategory(
  input: createBudgetCategoryInput,
): Promise<budgetCategory> {
  validateAmount(input.amountLimit);

  const { data, error } = await supabase
    .from("budget_categories")
    .insert({
      budget_id: input.budgetId,
      category_id: input.categoryId,
      amount_limit: input.amountLimit,
    })
    .select(
      `
      id,
      budget_id,
      category_id,
      amount_limit,
      created_at,
      updated_at,
      category:categories (
        id,
        name,
        icon,
        color
      )
    `,
    )
    .single();

  if (error) throw error;

  return mapBudgetCategory(data as unknown as budgetCategoryRow);
}

// =====================================================
// UPDATE CATEGORY BUDGET
// =====================================================

export async function updateBudgetCategory(
  categoryBudgetId: string,
  input: updateBudgetCategoryInput,
): Promise<budgetCategory> {
  validateAmount(input.amountLimit);

  const { data, error } = await supabase
    .from("budget_categories")
    .update({
      amount_limit: input.amountLimit,
    })
    .eq("id", categoryBudgetId)
    .select(
      `
      id,
      budget_id,
      category_id,
      amount_limit,
      created_at,
      updated_at,
      category:categories (
        id,
        name,
        icon,
        color
      )
    `,
    )
    .single();

  if (error) throw error;

  return mapBudgetCategory(data as unknown as budgetCategoryRow);
}

// =====================================================
// DELETE CATEGORY BUDGET
// =====================================================

export async function deleteBudgetCategory(
  categoryBudgetId: string,
): Promise<void> {
  const { error } = await supabase
    .from("budget_categories")
    .delete()
    .eq("id", categoryBudgetId);

  if (error) throw error;
}
