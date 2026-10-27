import {
  fromMinorUnits,
  getCurrencyDecimalDigits,
  getCurrencyLocale,
} from "@/lib/finance/currency";
import type { financialAccount, transaction } from "@/types/finances";

export function getAccountBalance(
  account: financialAccount,
  transactions: transaction[],
): number {
  let balance = account.initialBalanceMinor;

  for (const item of transactions) {
    if (item.workspaceId !== account.workspaceId) {
      continue;
    }

    if (item.currency !== account.currency) {
      continue;
    }

    if (item.type === "income" && item.accountId === account.id) {
      balance += item.amountMinor;
    }

    if (item.type === "expense" && item.accountId === account.id) {
      balance -= item.amountMinor;
    }

    if (item.type === "transfer") {
      if (item.accountId === account.id) {
        balance -= item.amountMinor;
      }

      if (item.destinationAccountId === account.id) {
        balance += item.amountMinor;
      }
    }
  }

  return balance;
}

export function getWorkspaceBalance(
  workspaceId: string,
  accounts: financialAccount[],
  transactions: transaction[],
): number {
  const workspaceAccounts = accounts.filter(
    (account) => account.workspaceId === workspaceId,
  );

  // This total is valid only when all accounts share one currency.
  const currencies = new Set(
    workspaceAccounts.map((account) => account.currency),
  );

  if (currencies.size > 1) {
    throw new Error(
      "Cannot total accounts with different currencies without conversion.",
    );
  }

  return workspaceAccounts.reduce(
    (total, account) => total + getAccountBalance(account, transactions),
    0,
  );
}

export function getMonthlySpending(
  workspaceId: string,
  transactions: transaction[],
  year: number,
  month: number,
): number {
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;

  return transactions
    .filter(
      (item) =>
        item.workspaceId === workspaceId &&
        item.type === "expense" &&
        item.date.startsWith(monthPrefix),
    )
    .reduce((total, item) => total + item.amountMinor, 0);
}

export function formatMoney(
  amountMinor: number,
  currency = "MYR",
  locale?: string,
): string {
  const decimalDigits = getCurrencyDecimalDigits(currency);
  const amount = fromMinorUnits(amountMinor, currency);

  return new Intl.NumberFormat(locale ?? getCurrencyLocale(currency), {
    style: "currency",
    currency,
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
  }).format(amount);
}
