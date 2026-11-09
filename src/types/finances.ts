export type transactionType = "income" | "expense" | "transfer";

export type accountType = "cash" | "bank" | "e-wallet" | "other";

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

export type transaction = {
  id: string;
  workspaceId: string;
  accountId: string;
  destinationAccountId: string | null;
  type: transactionType;
  categoryId: string | null;
  amountMinor: number;
  currency: string;
  description: string | null;
  date: string;
  createdAt: string;
};

export type createTransactionInput =
  | {
      workspaceId: string;
      accountId: string;
      type: "income" | "expense";
      categoryId: string;
      amountMinor: number;
      description?: string | null;
      date: string;
    }
  | {
      workspaceId: string;
      accountId: string;
      destinationAccountId: string;
      type: "transfer";
      amountMinor: number;
      description?: string | null;
      date: string;
    };
