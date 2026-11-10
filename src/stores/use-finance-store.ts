import { create } from "zustand";

import {
  createAccount,
  deleteAccount,
  getAccounts,
  updateAccount,
} from "@/services/account-service";

import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction,
} from "@/services/transaction-service";

import {
  createTransfer,
  deleteTransfer,
  getTransfers,
} from "@/services/transfer-service";

import type {
  createAccountInput,
  createTransactionInput,
  createTransferInput,
  createdTransferResult,
  financialAccount,
  financialTransfer,
  transaction,
  updateAccountInput,
  updateTransactionInput,
} from "@/types/finances";

type financeState = {
  accounts: financialAccount[];
  transactions: transaction[];

  accountsLoading: boolean;
  accountsError: string | null;

  transfers: financialTransfer[];
  transfersLoading: boolean;
  transfersError: string | null;
  transfersWorkspaceId: string | null;

  transactionsLoading: boolean;
  transactionsError: string | null;
  transactionsWorkspaceId: string | null;

  fetchAccounts: (workspaceId: string) => Promise<void>;
  addAccount: (input: createAccountInput) => Promise<financialAccount>;
  editAccount: (
    id: string,
    input: updateAccountInput,
  ) => Promise<financialAccount>;
  removeAccount: (id: string) => Promise<void>;

  fetchTransactions: (workspaceId: string) => Promise<void>;
  addTransaction: (input: createTransactionInput) => Promise<transaction>;
  editTransaction: (
    id: string,
    input: updateTransactionInput,
  ) => Promise<transaction>;
  removeTransaction: (id: string) => Promise<void>;

  fetchTransfers: (workspaceId: string) => Promise<void>;

  addTransfer: (input: createTransferInput) => Promise<createdTransferResult>;

  resetFinance: () => void;
};

let accountRequestId = 0;
const accountWorkspaceRequests = new Map<string, number>();

let transactionRequestId = 0;
let transferRequestId = 0;

export const useFinanceStore = create<financeState>((set, get) => ({
  accounts: [],
  transactions: [],
  transfers: [],

  accountsLoading: false,
  accountsError: null,

  transfersLoading: false,
  transfersError: null,
  transfersWorkspaceId: null,

  transactionsLoading: false,
  transactionsError: null,
  transactionsWorkspaceId: null,

  fetchAccounts: async (workspaceId) => {
    const requestId = ++accountRequestId;

    accountWorkspaceRequests.set(workspaceId, requestId);

    set({
      accountsLoading: true,
      accountsError: null,
    });

    try {
      const accounts = await getAccounts(workspaceId);

      // Ignore outdated requests for this workspace.
      if (accountWorkspaceRequests.get(workspaceId) !== requestId) {
        return;
      }

      // Replace only this workspace's accounts.
      // Keep accounts belonging to other workspaces.
      set((state) => ({
        accounts: [
          ...state.accounts.filter(
            (account) => account.workspaceId !== workspaceId,
          ),
          ...accounts,
        ],
      }));
    } catch (error) {
      if (accountWorkspaceRequests.get(workspaceId) !== requestId) {
        return;
      }

      console.error("Failed to fetch accounts:", error);

      set({
        accountsError:
          error instanceof Error ? error.message : "Failed to load accounts.",
      });
    } finally {
      if (accountWorkspaceRequests.get(workspaceId) === requestId) {
        accountWorkspaceRequests.delete(workspaceId);
        set({ accountsLoading: accountWorkspaceRequests.size > 0 });
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

      transactions: state.transactions.filter(
        (item) => item.accountId !== id && item.destinationAccountId !== id,
      ),

      transfers: state.transfers.filter(
        (item) => item.fromAccountId !== id && item.toAccountId !== id,
      ),
    }));
  },

  fetchTransactions: async (workspaceId) => {
    const requestId = ++transactionRequestId;

    set({
      transactions: [],
      transactionsLoading: true,
      transactionsError: null,
      transactionsWorkspaceId: workspaceId,
    });

    try {
      const transactions = await getTransactions(workspaceId);

      if (requestId !== transactionRequestId) return;

      set({ transactions });
    } catch (error) {
      if (requestId !== transactionRequestId) return;

      console.error("Failed to fetch transactions:", error);

      set({
        transactionsError:
          error instanceof Error
            ? error.message
            : "Failed to load transactions.",
      });
    } finally {
      if (requestId === transactionRequestId) {
        set({ transactionsLoading: false });
      }
    }
  },

  addTransaction: async (input) => {
    const transaction = await createTransaction(input);

    set((state) => ({
      transactions:
        state.transactionsWorkspaceId === transaction.workspaceId
          ? [...state.transactions, transaction]
          : state.transactions,
    }));

    return transaction;
  },

  editTransaction: async (id, input) => {
    const transaction = await updateTransaction(id, input);

    set((state) => ({
      transactions:
        state.transactionsWorkspaceId === transaction.workspaceId
          ? state.transactions.map((item) =>
              item.id === id ? transaction : item,
            )
          : state.transactions,
    }));

    return transaction;
  },

  removeTransaction: async (id) => {
    const transaction = get().transactions.find((item) => item.id === id);

    if (!transaction) {
      throw new Error("Transaction not found.");
    }

    const isTransfer =
      transaction.type === "transfer_out" || transaction.type === "transfer_in";

    if (isTransfer) {
      if (!transaction.transferId) {
        throw new Error("Transfer information could not be found.");
      }

      // Delete the transfer and both linked transaction records.
      await deleteTransfer(transaction.transferId);

      set((state) => ({
        transactions: state.transactions.filter(
          (item) => item.transferId !== transaction.transferId,
        ),

        transfers: state.transfers.filter(
          (item) => item.id !== transaction.transferId,
        ),
      }));

      return;
    }

    if (transaction.type !== "income" && transaction.type !== "expense") {
      throw new Error("This transaction cannot be deleted.");
    }

    // Delete a normal income or expense transaction.
    await deleteTransaction(id);

    set((state) => ({
      transactions: state.transactions.filter((item) => item.id !== id),
    }));
  },

  fetchTransfers: async (workspaceId) => {
    const requestId = ++transferRequestId;

    set({
      transfers: [],
      transfersLoading: true,
      transfersError: null,
      transfersWorkspaceId: workspaceId,
    });

    try {
      const transfers = await getTransfers(workspaceId);

      if (requestId !== transferRequestId) return;

      set({ transfers });
    } catch (error) {
      if (requestId !== transferRequestId) return;

      console.error("Failed to fetch transfers:", error);

      set({
        transfersError:
          error instanceof Error ? error.message : "Failed to load transfers.",
      });
    } finally {
      if (requestId === transferRequestId) {
        set({ transfersLoading: false });
      }
    }
  },

  addTransfer: async (input) => {
    const result = await createTransfer(input);

    const state = get();

    const currentWorkspaceId = state.transactionsWorkspaceId;
    const currentTransfersWorkspaceId = state.transfersWorkspaceId;

    if (
      currentWorkspaceId &&
      currentWorkspaceId === currentTransfersWorkspaceId &&
      (currentWorkspaceId === input.fromWorkspaceId ||
        currentWorkspaceId === input.toWorkspaceId)
    ) {
      await Promise.all([
        get().fetchTransactions(currentWorkspaceId),
        get().fetchTransfers(currentWorkspaceId),
      ]);
    }

    return result;
  },

  resetFinance: () => {
    accountRequestId++;
    accountWorkspaceRequests.clear();

    transactionRequestId++;
    transferRequestId++;
    set({
      accounts: [],
      transactions: [],
      transfers: [],

      accountsLoading: false,
      accountsError: null,

      transfersLoading: false,
      transfersError: null,
      transfersWorkspaceId: null,

      transactionsLoading: false,
      transactionsError: null,
      transactionsWorkspaceId: null,
    });
  },
}));
