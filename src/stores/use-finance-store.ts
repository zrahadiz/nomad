import { create } from "zustand";

import {
    mockAccounts,
    mockTransactions,
    mockWorkspaces,
} from "@/data/mock-finance";

import type {
    createTransactionInput,
    financialAccount,
    financialWorkspace,
    transaction,
} from "@/types/finances";

type financeState = {
  activeWorkspaceId: string;

  workspaces: financialWorkspace[];
  accounts: financialAccount[];
  transactions: transaction[];

  setActiveWorkspace: (workspaceId: string) => void;

  addTransaction: (input: createTransactionInput) => void;
};

export const useFinanceStore = create<financeState>((set, get) => ({
  activeWorkspaceId: "my",

  workspaces: mockWorkspaces,
  accounts: mockAccounts,
  transactions: mockTransactions,

  setActiveWorkspace: (workspaceId) => {
    const workspaceExists = get().workspaces.some(
      (workspace) => workspace.id === workspaceId,
    );

    if (!workspaceExists) {
      throw new Error("Workspace not found.");
    }

    set({ activeWorkspaceId: workspaceId });
  },

  addTransaction: (input) => {
    const account = get().accounts.find((item) => item.id === input.accountId);

    const workspace = get().workspaces.find(
      (item) => item.id === input.workspaceId,
    );

    if (!workspace) {
      throw new Error("Workspace not found.");
    }

    if (!account || account.workspaceId !== workspace.id) {
      throw new Error("Account does not belong to this workspace.");
    }

    if (account.currency !== workspace.currency) {
      throw new Error("Cross-currency transactions are not supported yet.");
    }

    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
      throw new Error("Amount must be a positive integer.");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      throw new Error("Date must use YYYY-MM-DD format.");
    }

    const newTransaction: transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      workspaceId: workspace.id,
      accountId: account.id,
      type: input.type,
      categoryId: input.categoryId,
      amountMinor: input.amountMinor,
      currency: account.currency,
      description: input.description.trim(),
      date: input.date,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      transactions: [newTransaction, ...state.transactions],
    }));
  },
}));
