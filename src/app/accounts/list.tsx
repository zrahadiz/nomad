import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { ArrowLeft, EllipsisVertical, Plus, Wallet } from "lucide-react-native";

import { AccountIcon } from "@/components/accounts/account-icon";
import { WorkspaceGate } from "@/components/feedbacks/workspace-gate";
import { SafeScreen } from "@/components/layout/safe-screen";

import { colors, radius, spacing, typography } from "@/constants/theme";
import { formatMoney } from "@/lib/finance/calculations";

import { useFinanceStore } from "@/stores/use-finance-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

import type { accountIconName } from "@/constants/account-options";
import type { financialAccount, transaction } from "@/types/finances";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

function getAccountBalance(
  account: financialAccount,
  transactions: transaction[],
): number {
  return transactions.reduce((balance, item) => {
    if (item.workspaceId !== account.workspaceId) {
      return balance;
    }

    if (item.type === "income" && item.accountId === account.id) {
      return balance + item.amountMinor;
    }

    if (item.type === "expense" && item.accountId === account.id) {
      return balance - item.amountMinor;
    }

    if (item.type === "transfer") {
      if (item.accountId === account.id) {
        return balance - item.amountMinor;
      }

      if (item.destinationAccountId === account.id) {
        return balance + item.amountMinor;
      }
    }

    return balance;
  }, account.initialBalanceMinor);
}

function getAccountTypeLabel(type: financialAccount["type"]): string {
  if (type === "e-wallet") return "E-wallet";

  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function AccountsScreen() {
  const router = useRouter();

  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );

  const workspaces = useWorkspaceStore((state) => state.workspaces);

  const accounts = useFinanceStore((state) => state.accounts);
  const removeAccount = useFinanceStore((state) => state.removeAccount);

  const transactions = useFinanceStore((state) => state.transactions);

  const workspace = workspaces.find((item) => item.id === activeWorkspaceId);

  const currency = workspace?.currency_code ?? "MYR";

  const workspaceAccounts = useMemo(
    () =>
      accounts.filter((account) => account.workspaceId === activeWorkspaceId),
    [accounts, activeWorkspaceId],
  );

  const handleDeleteAccount = (account: financialAccount) => {
    Alert.alert(
      "Delete account?",
      `Are you sure you want to delete "${account.name}"? This will also permanently delete all transactions associated with this account.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await removeAccount(account.id);
            } catch (error) {
              console.error("Failed to delete account:", error);

              Alert.alert(
                "Unable to delete account",
                error instanceof Error
                  ? error.message
                  : "Something went wrong. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const handleAccountActions = (account: financialAccount) => {
    Alert.alert(account.name, "Manage this account", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Edit",
        onPress: () =>
          router.push({
            pathname: "/accounts/[id]/edit",
            params: { id: account.id },
          }),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDeleteAccount(account),
      },
    ]);
  };

  const totalBalanceMinor = useMemo(
    () =>
      workspaceAccounts.reduce(
        (total, account) => total + getAccountBalance(account, transactions),
        0,
      ),
    [workspaceAccounts, transactions],
  );

  const formatCurrency = (amountMinor: number) =>
    formatMoney(amountMinor, currency);

  return (
    <SafeScreen backgroundColor={colors.background} edges={["top"]}>
      <WorkspaceGate>
        <KeyboardAwareScrollView
          contentContainerStyle={[styles.content]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={22} color={colors.text} />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.title}>Accounts</Text>
              <Text style={styles.subtitle}>
                Manage your money in one place.
              </Text>
            </View>

            <Pressable
              style={styles.addButton}
              accessibilityRole="button"
              accessibilityLabel="Add account"
              onPress={() => router.push("/accounts/new")}
            >
              <Plus size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Total balance */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>TOTAL ACCOUNT BALANCE</Text>

            <Text style={styles.balanceAmount}>
              {formatCurrency(totalBalanceMinor)}
            </Text>

            <Text style={styles.balanceCaption}>
              Across {workspaceAccounts.length}{" "}
              {workspaceAccounts.length === 1 ? "account" : "accounts"}
            </Text>
          </View>

          {/* Account list */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Accounts</Text>
            <Text style={styles.accountCount}>{workspaceAccounts.length}</Text>
          </View>

          {workspaceAccounts.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Wallet size={28} color={colors.primary} />
              </View>

              <Text style={styles.emptyTitle}>No accounts yet</Text>

              <Text style={styles.emptySubtitle}>
                Add your first account to start tracking your money.
              </Text>

              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push("/accounts/new")}
                accessibilityRole="button"
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>
                  Add your first account
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.accountList}>
              {workspaceAccounts.map((account, index) => (
                <View key={account.id}>
                  {index > 0 && <View style={styles.divider} />}

                  <View style={styles.accountRow}>
                    <AccountIcon
                      name={(account.icon ?? "wallet") as accountIconName}
                      color={account.color ?? colors.primary}
                    />

                    <View style={styles.accountDetails}>
                      <Text style={styles.accountName} numberOfLines={1}>
                        {account.name}
                      </Text>

                      <Text style={styles.accountType}>
                        {getAccountTypeLabel(account.type)}
                      </Text>
                    </View>

                    <View style={styles.accountActions}>
                      <Text style={styles.accountBalance}>
                        {formatCurrency(
                          getAccountBalance(account, transactions),
                        )}
                      </Text>

                      <Pressable
                        onPress={() => handleAccountActions(account)}
                        style={styles.accountActionsButton}
                        accessibilityRole="button"
                        accessibilityLabel={`Actions for ${account.name}`}
                        hitSlop={8}
                      >
                        <EllipsisVertical
                          size={20}
                          color={colors.textSecondary}
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </KeyboardAwareScrollView>
      </WorkspaceGate>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },

  headerText: {
    flex: 1,
    gap: spacing.xs,
  },

  title: {
    color: colors.text,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },

  addButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },

  balanceLabel: {
    color: colors.primaryLight,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.8,
  },

  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: typography.weight.bold,
    marginTop: spacing.md,
  },

  balanceCaption: {
    color: colors.primaryLight,
    fontSize: typography.size.sm,
    marginTop: spacing.xs,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  accountActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  accountActionsButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },

  accountCount: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },

  accountList: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },

  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  accountDetails: {
    flex: 1,
    gap: spacing.xs,
  },

  accountName: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  accountType: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  accountBalance: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    textAlign: "center",
  },

  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },

  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
});
