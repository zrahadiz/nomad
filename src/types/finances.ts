export type transactionType = "income" | "expense" | "transfer";

export type accountType = "cash" | "bank" | "ewallet";

export type financialWorkspace = {
  id: string;
  name: string;
  countryCode: string;
  currency: string;
};

export type financialAccount = {
  id: string;
  workspaceId: string;
  name: string;
  type: accountType;
  currency: string;
  initialBalanceMinor: number;
};

export type transaction = {
  id: string;
  workspaceId: string;
  accountId: string;
  type: transactionType;
  categoryId: string | null;
  amountMinor: number;
  currency: string;
  description: string;
  date: string;
  createdAt: string;
  destinationAccountId?: string;
};

export type createTransactionInput = {
  workspaceId: string;
  accountId: string;
  type: "income" | "expense";
  categoryId: string | null;
  amountMinor: number;
  description: string;
  date: string;
};
