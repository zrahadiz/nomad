import { supabase } from "@/lib/supabase/client";

import type {
  createTransactionInput,
  transaction,
  transactionType,
  updateTransactionInput,
} from "@/types/finances";

type transactionRow = {
  id: string;
  workspace_id: string;
  account_id: string;
  destination_account_id: string | null;
  transfer_id: string | null;
  type: transactionType;
  category_id: string | null;
  amount: number | string;
  description: string | null;
  transaction_date: string;
  created_at: string;
};

type accountCurrencyRow = {
  id: string;
  currency_code: string;
};

function mapTransaction(row: transactionRow, currency: string): transaction {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    accountId: row.account_id,
    destinationAccountId: row.destination_account_id,
    transferId: row.transfer_id,
    type: row.type,
    categoryId: row.category_id,
    amountMinor: Number(row.amount),
    currency,
    description: row.description,
    date: row.transaction_date,
    createdAt: row.created_at,
  };
}

function validateAmount(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("Transaction amount must be a positive integer.");
  }
}

function normalizeDescription(description?: string | null) {
  return description?.trim() || null;
}

// Fetch all transactions belonging to a workspace.
export async function getTransactions(
  workspaceId: string,
): Promise<transaction[]> {
  const [transactionResult, accountResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),

    supabase
      .from("accounts")
      .select("id, currency_code")
      .eq("workspace_id", workspaceId),
  ]);

  if (transactionResult.error) throw transactionResult.error;
  if (accountResult.error) throw accountResult.error;

  const accounts = accountResult.data as accountCurrencyRow[];

  const currencyByAccountId = new Map(
    accounts.map((account) => [account.id, account.currency_code]),
  );

  return (transactionResult.data as transactionRow[]).map((row) => {
    const currency = currencyByAccountId.get(row.account_id);

    if (!currency) {
      throw new Error(`Currency not found for account ${row.account_id}.`);
    }

    return mapTransaction(row, currency);
  });
}

// Create an income or expense transaction.
export async function createTransaction(
  input: createTransactionInput,
): Promise<transaction> {
  validateAmount(input.amountMinor);

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("currency_code")
    .eq("id", input.accountId)
    .eq("workspace_id", input.workspaceId)
    .single();

  if (accountError) throw accountError;

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      workspace_id: input.workspaceId,
      account_id: input.accountId,
      type: input.type,
      category_id: input.categoryId,
      amount: input.amountMinor,
      description: normalizeDescription(input.description),
      transaction_date: input.date,
    })
    .select()
    .single();

  if (error) throw error;

  return mapTransaction(data as transactionRow, account.currency_code);
}

// Update an existing income or expense transaction.
export async function updateTransaction(
  id: string,
  input: updateTransactionInput,
): Promise<transaction> {
  const updates: Record<string, unknown> = {};

  if (input.accountId !== undefined) {
    updates.account_id = input.accountId;
  }

  if (input.categoryId !== undefined) {
    updates.category_id = input.categoryId;
  }

  if (input.amountMinor !== undefined) {
    validateAmount(input.amountMinor);
    updates.amount = input.amountMinor;
  }

  if (input.description !== undefined) {
    updates.description = normalizeDescription(input.description);
  }

  if (input.date !== undefined) {
    updates.transaction_date = input.date;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("No transaction changes were provided.");
  }

  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id)
    .in("type", ["income", "expense"])
    .select()
    .single();

  if (error) throw error;

  const row = data as transactionRow;

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("currency_code")
    .eq("id", row.account_id)
    .eq("workspace_id", row.workspace_id)
    .single();

  if (accountError) throw accountError;

  return mapTransaction(row, account.currency_code);
}

// Delete an income or expense transaction.
export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .in("type", ["income", "expense"]);

  if (error) throw error;
}
