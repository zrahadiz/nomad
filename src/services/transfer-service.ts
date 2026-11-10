import { supabase } from "@/lib/supabase/client";

import type {
    createTransferInput,
    createdTransferResult,
    financialTransfer,
} from "@/types/finances";

type transferRpcRow = {
  created_transfer_id: string;
  source_transaction_id: string;
  destination_transaction_id: string;
};

type transferRow = {
  id: string;

  from_workspace_id: string;
  from_account_id: string;
  from_currency_code: string;

  to_workspace_id: string;
  to_account_id: string;
  to_currency_code: string;

  amount_sent: number;
  amount_received: number;

  exchange_rate: number;
  exchange_rate_source: "automatic" | "manual" | "actual";

  description: string | null;
  transfer_date: string;

  created_at: string;
};

export async function getTransfers(
  workspaceId: string,
): Promise<financialTransfer[]> {
  const { data, error } = await supabase
    .from("transfers")
    .select("*")
    .or(`from_workspace_id.eq.${workspaceId},to_workspace_id.eq.${workspaceId}`)
    .order("transfer_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch transfers:", error);
    throw error;
  }

  return ((data ?? []) as transferRow[]).map((item) => ({
    id: item.id,

    fromWorkspaceId: item.from_workspace_id,
    fromAccountId: item.from_account_id,
    fromCurrencyCode: item.from_currency_code,

    toWorkspaceId: item.to_workspace_id,
    toAccountId: item.to_account_id,
    toCurrencyCode: item.to_currency_code,

    amountSentMinor: Number(item.amount_sent),
    amountReceivedMinor: Number(item.amount_received),

    exchangeRate: Number(item.exchange_rate),
    exchangeRateSource: item.exchange_rate_source,

    description: item.description,
    transferDate: item.transfer_date,
    createdAt: item.created_at,
  }));
}

export async function createTransfer(
  input: createTransferInput,
): Promise<createdTransferResult> {
  if (
    !Number.isSafeInteger(input.amountSentMinor) ||
    !Number.isSafeInteger(input.amountReceivedMinor) ||
    input.amountSentMinor <= 0 ||
    input.amountReceivedMinor <= 0
  ) {
    throw new Error("Transfer amounts must be positive safe integers.");
  }

  if (!Number.isFinite(input.exchangeRate) || input.exchangeRate <= 0) {
    throw new Error("Exchange rate must be greater than zero.");
  }

  if (input.fromAccountId === input.toAccountId) {
    throw new Error("Source and destination accounts must be different.");
  }

  const { data, error } = await supabase.rpc("create_transfer", {
    p_from_workspace_id: input.fromWorkspaceId,
    p_from_account_id: input.fromAccountId,
    p_to_workspace_id: input.toWorkspaceId,
    p_to_account_id: input.toAccountId,
    p_amount_sent: input.amountSentMinor,
    p_amount_received: input.amountReceivedMinor,
    p_exchange_rate: input.exchangeRate,
    p_exchange_rate_source: input.exchangeRateSource,
    p_transfer_date: input.transferDate,
    p_description: input.description?.trim() || null,
  });

  if (error) {
    console.error("Failed to create transfer:", error);
    throw error;
  }

  const result = (data as transferRpcRow[] | null)?.[0];

  if (!result) {
    throw new Error("Transfer was not created successfully.");
  }

  return {
    transferId: result.created_transfer_id,
    sourceTransactionId: result.source_transaction_id,
    destinationTransactionId: result.destination_transaction_id,
  };
}
