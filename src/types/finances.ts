export type transactionType =
  | "income"
  | "expense"
  | "transfer_out"
  | "transfer_in";

export type accountType = "cash" | "bank" | "e-wallet" | "other";
export type categoryType = "income" | "expense";
export type transferExchangeRateSource = "automatic" | "manual" | "actual";

export type financialWorkspace = {
  id: string;
  name: string;
  countryCode: string;
  currency: string;
};

export type financialCategory = {
  id: string;
  userId: string | null;
  name: string;
  type: categoryType;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  isArchived: boolean;
};

export type financialAccount = {
  id: string;
  workspaceId: string;
  name: string;
  type: accountType;
  currency: string;
  initialBalanceMinor: number;
  icon: string | null;
  color: string | null;
};

export type createAccountInput = {
  workspaceId: string;
  name: string;
  type: accountType;
  currency: string;
  initialBalanceMinor: number;
  icon?: string | null;
  color?: string | null;
};

export type updateAccountInput = {
  name?: string;
  type?: accountType;
  initialBalanceMinor?: number;
  icon?: string | null;
  color?: string | null;
};

export type financialTransfer = {
  id: string;

  fromWorkspaceId: string;
  fromAccountId: string;
  fromCurrencyCode: string;

  toWorkspaceId: string;
  toAccountId: string;
  toCurrencyCode: string;

  amountSentMinor: number;
  amountReceivedMinor: number;

  exchangeRate: number;
  exchangeRateSource: transferExchangeRateSource;

  description: string | null;
  transferDate: string;
  createdAt: string;
};

export type createTransferInput = {
  fromWorkspaceId: string;
  fromAccountId: string;

  toWorkspaceId: string;
  toAccountId: string;

  amountSentMinor: number;
  amountReceivedMinor: number;

  exchangeRate: number;
  exchangeRateSource: transferExchangeRateSource;

  description?: string | null;
  transferDate: string;
};

export type createdTransferResult = {
  transferId: string;
  sourceTransactionId: string;
  destinationTransactionId: string;
};

export type transaction = {
  id: string;
  workspaceId: string;
  accountId: string;
  destinationAccountId: string | null;
  transferId: string | null;
  type: transactionType;
  categoryId: string | null;
  amountMinor: number;
  currency: string;
  description: string | null;
  date: string;
  createdAt: string;
};

export type createTransactionInput = {
  workspaceId: string;
  accountId: string;
  type: "income" | "expense";
  categoryId: string;
  amountMinor: number;
  description?: string | null;
  date: string;
};

export type updateTransactionInput = {
  accountId?: string;
  categoryId?: string;
  amountMinor?: number;
  description?: string | null;
  date?: string;
};
