import { useLocalSearchParams, useRouter } from "expo-router";

import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Calendar,
  CreditCard,
  Pencil,
  RefreshCw,
  Trash2,
  Wallet,
} from "lucide-react-native";

import { SafeScreen } from "@/components/layout/safe-screen";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { formatMoney } from "@/lib/finance/calculations";
import { useCategoryStore } from "@/stores/use-category-store";
import { useFinanceStore } from "@/stores/use-finance-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

export default function TransactionDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Finance store
  const transactions = useFinanceStore((state) => state.transactions);
  const accounts = useFinanceStore((state) => state.accounts);
  const transfers = useFinanceStore((state) => state.transfers);

  const removeTransaction = useFinanceStore((state) => state.removeTransaction);

  const transactionsLoading = useFinanceStore(
    (state) => state.transactionsLoading,
  );

  const transfersLoading = useFinanceStore((state) => state.transfersLoading);
  const transfersError = useFinanceStore((state) => state.transfersError);

  const transfersWorkspaceId = useFinanceStore(
    (state) => state.transfersWorkspaceId,
  );

  const fetchTransfers = useFinanceStore((state) => state.fetchTransfers);

  // Workspace store
  const workspaces = useWorkspaceStore((state) => state.workspaces);

  // Category store
  const categories = useCategoryStore((state) => state.categories);

  // Find transaction
  const transaction = useMemo(
    () => transactions.find((item) => item.id === id),
    [transactions, id],
  );

  const isTransfer =
    transaction?.type === "transfer_in" || transaction?.type === "transfer_out";

  const isIncome = transaction?.type === "income";
  const isTransferIn = transaction?.type === "transfer_in";
  const isPositive = isIncome || isTransferIn;

  // Find transfer metadata
  const transfer = useMemo(
    () =>
      transaction?.transferId
        ? transfers.find((item) => item.id === transaction.transferId)
        : undefined,
    [transfers, transaction?.transferId],
  );

  // Find category
  const category = transaction?.categoryId
    ? categories.find((item) => item.id === transaction.categoryId)
    : undefined;

  // Fetch transfer metadata only if it has not already been loaded
  // for the transaction's workspace.
  useEffect(() => {
    if (
      !transaction?.transferId ||
      transfer ||
      transfersLoading ||
      transfersWorkspaceId === transaction.workspaceId
    ) {
      return;
    }

    void fetchTransfers(transaction.workspaceId);
  }, [
    transaction?.transferId,
    transaction?.workspaceId,
    transfer,
    transfersLoading,
    transfersWorkspaceId,
    fetchTransfers,
  ]);

  // Find transaction account and workspace
  const account = accounts.find(
    (item) =>
      item.id === transaction?.accountId &&
      item.workspaceId === transaction?.workspaceId,
  );

  const workspace = workspaces.find(
    (item) => item.id === transaction?.workspaceId,
  );

  // Find transfer accounts and workspaces
  const fromAccount = transfer
    ? accounts.find(
        (item) =>
          item.id === transfer.fromAccountId &&
          item.workspaceId === transfer.fromWorkspaceId,
      )
    : undefined;

  const toAccount = transfer
    ? accounts.find(
        (item) =>
          item.id === transfer.toAccountId &&
          item.workspaceId === transfer.toWorkspaceId,
      )
    : undefined;

  const fromWorkspace = transfer
    ? workspaces.find((item) => item.id === transfer.fromWorkspaceId)
    : undefined;

  const toWorkspace = transfer
    ? workspaces.find((item) => item.id === transfer.toWorkspaceId)
    : undefined;

  // Transaction display
  const transactionTitle = isTransfer
    ? "Transfer"
    : isIncome
      ? "Income"
      : "Expense";

  const TransactionIcon = isTransfer
    ? ArrowLeftRight
    : isIncome
      ? ArrowDownLeft
      : ArrowUpRight;

  // Delete transaction
  const handleDelete = () => {
    if (!transaction) return;

    const title = isTransfer ? "Delete transfer?" : "Delete transaction?";

    const message = isTransfer
      ? "This will permanently delete the transfer and both linked transactions, including the transaction in the other workspace. This action cannot be undone."
      : "Are you sure you want to permanently delete this transaction? This action cannot be undone.";

    Alert.alert(title, message, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeTransaction(transaction.id);

            router.replace("/(tabs)/transactions");
          } catch (error) {
            console.error("Failed to delete transaction:", error);

            Alert.alert(
              "Unable to delete",
              error instanceof Error
                ? error.message
                : "Something went wrong. Please try again.",
            );
          }
        },
      },
    ]);
  };

  // Loading state
  const isInitialLoading = !transaction && transactionsLoading;

  const isTransferMetadataLoading =
    !transfer &&
    transfersLoading &&
    transfersWorkspaceId === transaction?.workspaceId;

  // Transaction not found
  if (isInitialLoading) {
    return (
      <SafeScreen backgroundColor={colors.background}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyDescription}>Loading transaction...</Text>
        </View>
      </SafeScreen>
    );
  }

  if (!transaction) {
    return (
      <SafeScreen backgroundColor={colors.background}>
        <View style={styles.centerState}>
          <Wallet size={36} color={colors.textSecondary} />

          <Text style={styles.emptyTitle}>Transaction not found</Text>

          <Text style={styles.emptyDescription}>
            This transaction may have been deleted or is no longer available.
          </Text>

          <Pressable onPress={() => router.back()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen backgroundColor={colors.background} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
          >
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>

          <Text style={styles.headerTitle}>Transaction details</Text>

          <View style={styles.headerActions}>
            {!isTransfer && (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/transactions/edit/[id]",
                    params: { id: transaction.id },
                  })
                }
                style={styles.editButton}
                hitSlop={8}
              >
                <Pencil size={18} color={colors.primary} />
              </Pressable>
            )}

            <Pressable
              onPress={handleDelete}
              style={styles.deleteButton}
              hitSlop={8}
            >
              <Trash2 size={18} color={colors.danger} />
            </Pressable>
          </View>
        </View>

        {/* Amount summary */}
        <View style={styles.amountCard}>
          <View style={styles.mainIcon}>
            <TransactionIcon
              size={26}
              color={
                isTransfer
                  ? colors.primary
                  : isPositive
                    ? colors.success
                    : colors.danger
              }
            />
          </View>

          <Text style={styles.typeLabel}>{transactionTitle}</Text>

          <Text
            style={[
              styles.amount,
              isPositive && styles.incomeText,
              !isPositive && !isTransfer && styles.expenseText,
            ]}
          >
            {isPositive ? "+" : isTransfer ? "" : "−"}
            {formatMoney(transaction.amountMinor, transaction.currency)}
          </Text>

          <Text style={styles.dateLabel}>{transaction.date}</Text>
        </View>

        {/* General information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>

          <View style={styles.detailCard}>
            <DetailRow
              icon={<Wallet size={18} color={colors.textSecondary} />}
              label="Transaction type"
              value={transactionTitle}
            />

            <View style={styles.divider} />

            <DetailRow
              icon={<CreditCard size={18} color={colors.textSecondary} />}
              label="Account"
              value={account?.name ?? "Unknown account"}
            />

            {!isTransfer && (
              <>
                <View style={styles.divider} />

                <DetailRow
                  label="Category"
                  value={category?.name ?? "Unknown category"}
                />
              </>
            )}

            <View style={styles.divider} />

            <DetailRow
              icon={<Calendar size={18} color={colors.textSecondary} />}
              label="Date"
              value={transaction.date}
            />

            <View style={styles.divider} />

            <DetailRow
              icon={<Wallet size={18} color={colors.textSecondary} />}
              label="Workspace"
              value={workspace?.name ?? "Unknown workspace"}
            />

            <View style={styles.divider} />

            <DetailRow
              icon={<Wallet size={18} color={colors.textSecondary} />}
              label="Description"
              value={transaction.description || "No description"}
            />
          </View>
        </View>

        {/* Transfer information */}
        {isTransfer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transfer details</Text>

            {isTransferMetadataLoading ? (
              <View style={styles.detailCard}>
                <ActivityIndicator color={colors.primary} size="small" />

                <Text style={styles.emptyDescription}>
                  Loading transfer details...
                </Text>
              </View>
            ) : transfer ? (
              <View style={styles.detailCard}>
                {/* Source */}
                <View style={styles.transferAccount}>
                  <Text style={styles.detailLabel}>From</Text>

                  <Text style={styles.detailValue}>
                    {fromAccount?.name ?? "Unknown account"}
                  </Text>

                  <Text style={styles.detailHint}>
                    {fromWorkspace?.name ?? "Unknown workspace"}
                  </Text>

                  <Text style={styles.transferAmountOut}>
                    −
                    {formatMoney(
                      transfer.amountSentMinor,
                      transfer.fromCurrencyCode,
                    )}
                  </Text>
                </View>

                <View style={styles.transferArrow}>
                  <ArrowDownLeft size={20} color={colors.primary} />
                </View>

                {/* Destination */}
                <View style={styles.transferAccount}>
                  <Text style={styles.detailLabel}>To</Text>

                  <Text style={styles.detailValue}>
                    {toAccount?.name ?? "Unknown account"}
                  </Text>

                  <Text style={styles.detailHint}>
                    {toWorkspace?.name ?? "Unknown workspace"}
                  </Text>

                  <Text style={styles.transferAmountIn}>
                    +
                    {formatMoney(
                      transfer.amountReceivedMinor,
                      transfer.toCurrencyCode,
                    )}
                  </Text>
                </View>

                <View style={styles.divider} />

                <DetailRow
                  label="Exchange rate"
                  value={`1 ${transfer.fromCurrencyCode} = ${transfer.exchangeRate.toLocaleString(
                    "en",
                    {
                      maximumFractionDigits: 8,
                    },
                  )} ${transfer.toCurrencyCode}`}
                />

                <View style={styles.divider} />

                <DetailRow
                  label="Rate source"
                  value={
                    transfer.exchangeRateSource === "automatic"
                      ? "Automatic"
                      : transfer.exchangeRateSource === "manual"
                        ? "Manual"
                        : "Actual received amount"
                  }
                />

                <View style={styles.divider} />

                <DetailRow
                  label="Transfer date"
                  value={transfer.transferDate}
                />
              </View>
            ) : (
              <View style={styles.detailCard}>
                <Text style={styles.emptyDescription}>
                  {transfersError
                    ? "Unable to load transfer information. Please try again."
                    : "Transfer information is not available."}
                </Text>

                <Pressable
                  onPress={() => void fetchTransfers(transaction.workspaceId)}
                  disabled={transfersLoading}
                  style={[
                    styles.retryButton,
                    transfersLoading && styles.disabledButton,
                  ]}
                >
                  {transfersLoading ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <RefreshCw size={16} color={colors.surface} />
                  )}

                  <Text style={styles.retryButtonText}>
                    {transfersLoading ? "Loading..." : "Try again"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Created on {new Date(transaction.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      {icon && <View style={styles.detailRowIcon}>{icon}</View>}

      <View style={styles.detailRowContent}>
        <Text style={styles.detailLabel}>{label}</Text>

        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  editButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: "#FCE8E6",
    alignItems: "center",
    justifyContent: "center",
  },

  amountCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },

  mainIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },

  typeLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },

  amount: {
    color: colors.text,
    fontSize: 30,
    fontWeight: typography.weight.bold,
  },

  incomeText: {
    color: colors.success,
  },

  expenseText: {
    color: colors.danger,
  },

  dateLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  section: {
    gap: spacing.md,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  detailCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  detailRowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  detailRowContent: {
    flex: 1,
    gap: spacing.xs,
  },

  detailLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  detailValue: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  transferAccount: {
    gap: spacing.xs,
  },

  transferArrow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
  },

  transferAmountOut: {
    color: colors.danger,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    marginTop: spacing.xs,
  },

  transferAmountIn: {
    color: colors.success,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    marginTop: spacing.xs,
  },

  detailHint: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  footer: {
    alignItems: "center",
    paddingTop: spacing.sm,
  },

  footerText: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },

  emptyDescription: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    textAlign: "center",
  },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },

  primaryButtonText: {
    color: colors.surface,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  retryButtonText: {
    color: colors.surface,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  disabledButton: {
    opacity: 0.5,
  },
});
