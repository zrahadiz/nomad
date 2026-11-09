import { supabase } from "@/lib/supabase/client";

import type {
    accountType,
    createAccountInput,
    financialAccount,
    updateAccountInput,
} from "@/types/finances";

type accountRow = {
  id: string;
  workspace_id: string;
  name: string;
  type: accountType;
  currency_code: string;
  opening_balance: number;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
};

function mapAccount(row: accountRow): financialAccount {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    type: row.type,
    currency: row.currency_code,
    initialBalanceMinor: Number(row.opening_balance),
    icon: row.icon,
    color: row.color,
  };
}

// Fetch all accounts belonging to a workspace.
export async function getAccounts(
  workspaceId: string,
): Promise<financialAccount[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data as accountRow[]).map(mapAccount);
}

// Fetch one account by ID.
export async function getAccountById(
  id: string,
): Promise<financialAccount | null> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapAccount(data as accountRow);
}

// Create a new account.
export async function createAccount(
  input: createAccountInput,
): Promise<financialAccount> {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Account name is required.");
  }

  if (
    !Number.isSafeInteger(input.initialBalanceMinor) ||
    input.initialBalanceMinor < 0
  ) {
    throw new Error("Opening balance must be a non-negative integer.");
  }

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      workspace_id: input.workspaceId,
      name,
      type: input.type,
      currency_code: input.currency.toUpperCase(),
      opening_balance: input.initialBalanceMinor,
      icon: input.icon ?? null,
      color: input.color ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  return mapAccount(data as accountRow);
}

// Update an existing account.
export async function updateAccount(
  id: string,
  input: updateAccountInput,
): Promise<financialAccount> {
  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) {
    const name = input.name.trim();

    if (!name) {
      throw new Error("Account name is required.");
    }

    updates.name = name;
  }

  if (input.type !== undefined) updates.type = input.type;

  if (input.initialBalanceMinor !== undefined) {
    if (
      !Number.isSafeInteger(input.initialBalanceMinor) ||
      input.initialBalanceMinor < 0
    ) {
      throw new Error("Opening balance must be a non-negative integer.");
    }

    updates.opening_balance = input.initialBalanceMinor;
  }

  if (input.icon !== undefined) updates.icon = input.icon;
  if (input.color !== undefined) updates.color = input.color;

  if (Object.keys(updates).length === 0) {
    throw new Error("No account changes were provided.");
  }

  const { data, error } = await supabase
    .from("accounts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return mapAccount(data as accountRow);
}

// Delete an account.
export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from("accounts").delete().eq("id", id);

  if (error) throw error;
}
