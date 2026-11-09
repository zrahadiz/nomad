import { create } from "zustand";

import {
  createAccount,
  deleteAccount,
  getAccounts,
  updateAccount,
} from "@/services/account-service";

import type {
  createAccountInput,
  createTransactionInput,
  financialAccount,
  transaction,
  updateAccountInput,
} from "@/types/finances";

import { mockTransactions } from "@/data/mock-finance";

type financeState = {
  accounts: financialAccount[];
  transactions: transaction[];

  accountsLoading: boolean;
  accountsError: string | null;

  fetchAccounts: (workspaceId: string) => Promise<void>;
  addAccount: (input: createAccountInput) => Promise<financialAccount>;
  editAccount: (
    id: string,
    input: updateAccountInput,
  ) => Promise<financialAccount>;
  removeAccount: (id: string) => Promise<void>;

  addTransaction: (input: createTransactionInput) => void;

  resetFinance: () => void;
};

let accountRequestId = 0;

export const useFinanceStore = create<financeState>((set, get) => ({
  accounts: [],
  transactions: mockTransactions,

  accountsLoading: false,
  accountsError: null,

  fetchAccounts: async (workspaceId) => {
    const requestId = ++accountRequestId;

    set({
      accounts: [],
      accountsLoading: true,
      accountsError: null,
    });

    try {
      const accounts = await getAccounts(workspaceId);

      if (requestId !== accountRequestId) return;

      set({ accounts });
    } catch (error) {
      if (requestId !== accountRequestId) return;

      console.error("Failed to fetch accounts:", error);

      set({
        accountsError:
          error instanceof Error ? error.message : "Failed to load accounts.",
      });
    } finally {
      if (requestId === accountRequestId) {
        set({ accountsLoading: false });
      }
    }
  },

  addAccount: async (input) => {
    const account = await createAccount(input);

    set((state) => ({
      accounts: [...state.accounts, account],
    }));

    return account;
  },

  editAccount: async (id, input) => {
    const account = await updateAccount(id, input);

    set((state) => ({
      accounts: state.accounts.map((item) => (item.id === id ? account : item)),
    }));

    return account;
  },

  removeAccount: async (id) => {
    await deleteAccount(id);

    set((state) => ({
      accounts: state.accounts.filter((item) => item.id !== id),
    }));
  },

  addTransaction: (input) => {
    console.warn(
      "Transactions are still using mock functionality. Supabase integration is coming next.",
      input,
    );
  },

  resetFinance: () => {
    accountRequestId++;

    set({
      accounts: [],
      transactions: [],
      accountsLoading: false,
      accountsError: null,
    });
  },
}));
