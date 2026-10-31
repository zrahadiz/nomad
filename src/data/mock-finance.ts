import type {
  financialAccount,
  financialWorkspace,
  transaction,
} from "@/types/finances";

export const mockWorkspaces: financialWorkspace[] = [
  {
    id: "my",
    name: "Malaysia",
    countryCode: "MY",
    currency: "MYR",
  },
  {
    id: "id",
    name: "Indonesia",
    countryCode: "ID",
    currency: "IDR",
  },
];

export const mockAccounts: financialAccount[] = [
  {
    id: "maybank",
    workspaceId: "my",
    name: "Maybank",
    type: "bank",
    currency: "MYR",
    initialBalanceMinor: 250000,
  },
  {
    id: "tng",
    workspaceId: "my",
    name: "Touch 'n Go",
    type: "ewallet",
    currency: "MYR",
    initialBalanceMinor: 35000,
  },
  {
    id: "cash",
    workspaceId: "my",
    name: "Cash",
    type: "cash",
    currency: "MYR",
    initialBalanceMinor: 60000,
  },
];

export const mockTransactions: transaction[] = [
  {
    id: "tx-1",
    workspaceId: "my",
    accountId: "tng",
    type: "expense",
    categoryId: "food",
    amountMinor: 1800,
    currency: "MYR",
    description: "Coffee & breakfast",
    date: "2026-10-25",
    createdAt: "2026-10-25T09:30:00+08:00",
  },
  {
    id: "tx-2",
    workspaceId: "my",
    accountId: "maybank",
    type: "income",
    categoryId: "allowance",
    amountMinor: 50000,
    currency: "MYR",
    description: "Monthly allowance",
    date: "2026-10-24",
    createdAt: "2026-10-24T10:00:00+08:00",
  },
  {
    id: "tx-3",
    workspaceId: "my",
    accountId: "tng",
    type: "expense",
    categoryId: "transport",
    amountMinor: 500,
    currency: "MYR",
    description: "Public transport",
    date: "2026-10-24",
    createdAt: "2026-10-24T08:00:00+08:00",
  },
];
