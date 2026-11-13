import { supabase } from "@/lib/supabase/client";

import type {
    saveWorkspaceCurrencyConverterInput,
    workspaceCurrencyConverter,
} from "@/types/currency-converter";

type workspaceCurrencyConverterRow = {
  id: string;
  workspace_id: string;
  target_currency_code: string;
  exchange_rate: number | string;
  rate_source: "manual" | "automatic";
  last_updated_at: string;
  created_at: string;
  updated_at: string;
};

const mapWorkspaceCurrencyConverter = (
  row: workspaceCurrencyConverterRow,
): workspaceCurrencyConverter => ({
  id: row.id,
  workspaceId: row.workspace_id,
  targetCurrencyCode: row.target_currency_code,
  exchangeRate: Number(row.exchange_rate),
  rateSource: row.rate_source,
  lastUpdatedAt: row.last_updated_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const validateConverterInput = (input: saveWorkspaceCurrencyConverterInput) => {
  if (!/^[A-Z]{3}$/.test(input.targetCurrencyCode)) {
    throw new Error("Please select a valid target currency.");
  }

  if (!Number.isFinite(input.exchangeRate) || input.exchangeRate <= 0) {
    throw new Error("Exchange rate must be greater than zero.");
  }
};

export async function getWorkspaceCurrencyConverter(
  workspaceId: string,
): Promise<workspaceCurrencyConverter | null> {
  const { data, error } = await supabase
    .from("workspace_currency_converters")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;

  return data
    ? mapWorkspaceCurrencyConverter(data as workspaceCurrencyConverterRow)
    : null;
}

export async function saveWorkspaceCurrencyConverter(
  input: saveWorkspaceCurrencyConverterInput,
): Promise<workspaceCurrencyConverter> {
  validateConverterInput(input);

  // Get the workspace's primary currency.
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("currency_code")
    .eq("id", input.workspaceId)
    .single();

  if (workspaceError) throw workspaceError;

  if (workspace.currency_code === input.targetCurrencyCode) {
    throw new Error(
      "Secondary currency must be different from the workspace currency.",
    );
  }

  const { data, error } = await supabase
    .from("workspace_currency_converters")
    .upsert(
      {
        workspace_id: input.workspaceId,
        target_currency_code: input.targetCurrencyCode,
        exchange_rate: input.exchangeRate,
        rate_source: input.rateSource,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" },
    )
    .select("*")
    .single();

  if (error) throw error;

  return mapWorkspaceCurrencyConverter(data as workspaceCurrencyConverterRow);
}

export async function deleteWorkspaceCurrencyConverter(
  workspaceId: string,
): Promise<void> {
  const { error } = await supabase
    .from("workspace_currency_converters")
    .delete()
    .eq("workspace_id", workspaceId);

  if (error) throw error;
}
