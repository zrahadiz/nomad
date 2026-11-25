import { useLocalSearchParams, useRouter } from "expo-router";

import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AlignLeft,
  ArrowDown,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Calendar,
  CreditCard,
  Globe,
  Info,
  Pencil,
  RefreshCw,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react-native";

import { SafeScreen } from "@/components/layout/safe-screen";
import { AppIcon } from "@/components/ui/app-icon";
import { getCountryByCode } from "@/constants/countries";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { formatMoney } from "@/lib/finance/calculations";
import { useCategoryStore } from "@/stores/use-category-store";
import { useFinanceStore } from "@/stores/use-finance-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

export default function TransactionDetailsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
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
    ? t("transactions.types.transfer")
    : isIncome
      ? t("transactions.types.income")
      : t("transactions.types.expense");

  const TransactionIcon = isTransfer
    ? ArrowLeftRight
    : isIncome
      ? ArrowDownLeft
      : ArrowUpRight;

  // Delete transaction
  const handleDelete = () => {
    if (!transaction) return;

    const title = isTransfer
      ? t("transactions.details.deleteTransferConfirm.title")
      : t("transactions.details.deleteTransactionConfirm.title");

    const message = isTransfer
      ? t("transactions.details.deleteTransferConfirm.message")
      : t("transactions.details.deleteTransactionConfirm.message");

    Alert.alert(title, message, [
      {
        text: t("common.cancel"),
        style: "cancel",
      },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await removeTransaction(transaction.id);

            router.replace("/(tabs)/transactions");
          } catch (error) {
            console.error("Failed to delete transaction:", error);

            Alert.alert(
              t("transactions.details.errors.deleteFailed"),
              error instanceof Error
                ? error.message
                : t("common.errors.generic"),
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

  if (isInitialLoading) {
    return (
      <SafeScreen backgroundColor={colors.background}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyDescription}>
            {t("transactions.details.loading")}
          </Text>
        </View>
      </SafeScreen>
    );
  }

  // Transaction not found
  if (!transaction) {
    return (
      <SafeScreen backgroundColor={colors.background}>
        <View style={styles.centerState}>
          <View style={styles.emptyIcon}>
            <Wallet size={32} color={colors.textSecondary} />
          </View>

          <Text style={styles.emptyTitle}>
            {t("transactions.details.notFound.title")}
          </Text>

          <Text style={styles.emptyDescription}>
            {t("transactions.details.notFound.description")}
          </Text>

          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>{t("common.goBack")}</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  // Display values
  const tone = isTransfer
    ? typeTones.transfer
    : isIncome
      ? typeTones.income
      : typeTones.expense;

  // Which side of a transfer this record is (the other side lives in the other workspace).
  const typeLabel = isTransferIn
    ? t("transactions.details.transferIn")
    : isTransfer
      ? t("transactions.details.transferOut")
      : transactionTitle;

  const amountColor = isPositive
    ? colors.success
    : isTransfer
      ? colors.text
      : colors.danger;

  const amountSign = isPositive ? "+" : isTransfer ? "" : "−";

  return (
    <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero: what happened, how much, when */}
          <View style={styles.heroCard}>
            <View
              style={[styles.heroIcon, { backgroundColor: tone.background }]}
            >
              <TransactionIcon size={26} color={tone.color} />
            </View>

            <Text style={styles.typeLabel}>{typeLabel}</Text>

            <Text
              style={[styles.amount, { color: amountColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {amountSign}
              {formatMoney(transaction.amountMinor, transaction.currency)}
            </Text>

            <View style={styles.dateRow}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={styles.dateLabel}>
                {formatDisplayDate(transaction.date, i18n.language)}
              </Text>
            </View>
          </View>

          {/* Transfer details: the most important part of a transfer, so it comes first */}
          {isTransfer && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("transactions.details.transferDetails")}
              </Text>

              {isTransferMetadataLoading ? (
                <View style={[styles.card, styles.messageCard]}>
                  <ActivityIndicator color={colors.primary} size="small" />

                  <Text style={styles.emptyDescription}>
                    {t("transactions.details.loadingTransfer")}
                  </Text>
                </View>
              ) : transfer ? (
                <View style={styles.card}>
                  {/* Source */}
                  <TransferLeg
                    label={t("transactions.details.from")}
                    account={fromAccount}
                    accountFallback={t("transactions.details.unknownAccount")}
                    workspace={fromWorkspace}
                    workspaceFallback={t(
                      "transactions.details.unknownWorkspace",
                    )}
                    amount={`−${formatMoney(
                      transfer.amountSentMinor,
                      transfer.fromCurrencyCode,
                    )}`}
                    amountColor={colors.danger}
                  />

                  <View style={styles.connector}>
                    <View style={styles.connectorLine} />

                    <View style={styles.connectorCircle}>
                      <ArrowDown size={16} color={colors.primary} />
                    </View>

                    <View style={styles.connectorLine} />
                  </View>

                  {/* Destination */}
                  <TransferLeg
                    label={t("transactions.details.to")}
                    account={toAccount}
                    accountFallback={t("transactions.details.unknownAccount")}
                    workspace={toWorkspace}
                    workspaceFallback={t(
                      "transactions.details.unknownWorkspace",
                    )}
                    amount={`+${formatMoney(
                      transfer.amountReceivedMinor,
                      transfer.toCurrencyCode,
                    )}`}
                    amountColor={colors.success}
                  />

                  <View style={styles.divider} />

                  <DetailRow
                    leading={
                      <IconTile>
                        <ArrowLeftRight size={18} color={colors.primary} />
                      </IconTile>
                    }
                    label={t("transactions.details.exchangeRate")}
                    value={`1 ${transfer.fromCurrencyCode} = ${transfer.exchangeRate.toLocaleString(
                      "en",
                      {
                        maximumFractionDigits: 8,
                      },
                    )} ${transfer.toCurrencyCode}`}
                  />

                  <View style={styles.divider} />

                  <DetailRow
                    leading={
                      <IconTile>
                        <Info size={18} color={colors.primary} />
                      </IconTile>
                    }
                    label={t("transactions.details.rateSource")}
                    value={
                      transfer.exchangeRateSource === "automatic"
                        ? t("transactions.details.rateSources.automatic")
                        : transfer.exchangeRateSource === "manual"
                          ? t("transactions.details.rateSources.manual")
                          : t(
                              "transactions.details.rateSources.actualReceivedAmount",
                            )
                    }
                  />

                  <View style={styles.divider} />

                  <DetailRow
                    leading={
                      <IconTile>
                        <Calendar size={18} color={colors.primary} />
                      </IconTile>
                    }
                    label={t("transactions.details.transferDate")}
                    value={formatDisplayDate(
                      transfer.transferDate,
                      i18n.language,
                    )}
                  />
                </View>
              ) : (
                <View style={[styles.card, styles.messageCard]}>
                  <Text style={styles.emptyDescription}>
                    {transfersError
                      ? t("transactions.details.transferLoadError")
                      : t("transactions.details.transferUnavailable")}
                  </Text>

                  <Pressable
                    onPress={() => void fetchTransfers(transaction.workspaceId)}
                    disabled={transfersLoading}
                    accessibilityRole="button"
                    style={[
                      styles.retryButton,
                      transfersLoading && styles.disabledButton,
                    ]}
                  >
                    {transfersLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.textOnPrimary}
                      />
                    ) : (
                      <RefreshCw size={16} color={colors.textOnPrimary} />
                    )}

                    <Text style={styles.retryButtonText}>
                      {transfersLoading
                        ? t("common.loading")
                        : t("common.tryAgain")}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* General information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("transactions.details.information")}
            </Text>

            <View style={styles.card}>
              <DetailRow
                leading={
                  account ? (
                    <AccountAvatar account={account} />
                  ) : (
                    <IconTile>
                      <CreditCard size={18} color={colors.primary} />
                    </IconTile>
                  )
                }
                label={t("transactions.details.account")}
                value={
                  account?.name ?? t("transactions.details.unknownAccount")
                }
                muted={!account}
              />

              {!isTransfer && (
                <>
                  <View style={styles.divider} />

                  <DetailRow
                    leading={
                      <IconTile>
                        <Tag size={18} color={colors.primary} />
                      </IconTile>
                    }
                    label={t("transactions.details.category")}
                    value={
                      category?.name ??
                      t("transactions.details.unknownCategory")
                    }
                    muted={!category}
                  />
                </>
              )}

              <View style={styles.divider} />

              <DetailRow
                leading={
                  <WorkspaceAvatar countryCode={workspace?.country_code} />
                }
                label={t("transactions.details.workspace")}
                value={
                  workspace?.name ?? t("transactions.details.unknownWorkspace")
                }
                muted={!workspace}
              />

              <View style={styles.divider} />

              <DetailRow
                leading={
                  <IconTile>
                    <AlignLeft size={18} color={colors.primary} />
                  </IconTile>
                }
                label={t("transactions.details.description")}
                value={
                  transaction.description ||
                  t("transactions.details.noDescription")
                }
                muted={!transaction.description}
              />
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {t("transactions.details.createdOn", {
                date: new Date(transaction.createdAt).toLocaleDateString(
                  i18n.language,
                ),
              })}
            </Text>
          </View>
        </KeyboardAwareScrollView>

        {/* Actions: always visible. Delete sits apart from Edit so it's harder to hit by accident. */}
        <View style={styles.actionBar}>
          <Pressable
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel={
              isTransfer
                ? t("transactions.details.deleteTransfer")
                : t("transactions.details.deleteTransaction")
            }
            style={({ pressed }) => [
              styles.deleteAction,
              pressed && styles.deleteActionPressed,
            ]}
          >
            <Trash2 size={18} color={colors.danger} />

            <Text style={styles.deleteActionText}>
              {isTransfer
                ? t("transactions.details.deleteTransfer")
                : t("common.delete")}
            </Text>
          </Pressable>

          {!isTransfer && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/transactions/edit/[id]",
                  params: { id: transaction.id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={t("transactions.details.editTransaction")}
              style={({ pressed }) => [
                styles.editAction,
                pressed && styles.editActionPressed,
              ]}
            >
              <Pencil size={18} color={colors.textOnPrimary} />

              <Text style={styles.editActionText}>
                {t("transactions.details.editTransaction")}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeScreen>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const typeTones = {
  expense: { color: colors.danger, background: colors.dangerLight },
  income: { color: colors.success, background: colors.successLight },
  transfer: { color: colors.primary, background: colors.primaryLight },
};

// "2026-11-13" -> "Fri, 13 Nov 2026". Falls back to the raw value if it isn't a date.
function formatDisplayDate(value: string, language: string): string {
  const locale = language.startsWith("id") ? "id-ID" : "en-GB";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (!match) return value;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  return date.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* -------------------------------------------------------------------------- */
/* Presentational pieces                                                       */
/* (same family as the Add Transaction screen: share them when you extract)    */
/* -------------------------------------------------------------------------- */

function IconTile({
  children,
  background = colors.primaryLight,
}: {
  children: ReactNode;
  background?: string;
}) {
  return (
    <View style={[styles.iconTile, { backgroundColor: background }]}>
      {children}
    </View>
  );
}

function WorkspaceAvatar({ countryCode }: { countryCode?: string | null }) {
  const flag = countryCode ? getCountryByCode(countryCode)?.flag : undefined;

  return (
    <IconTile background={colors.background}>
      {flag ? (
        <Text style={styles.flag}>{flag}</Text>
      ) : (
        <Globe size={18} color={colors.primary} />
      )}
    </IconTile>
  );
}

function AccountAvatar({
  account,
}: {
  account: { icon?: string | null; color?: string | null };
}) {
  return (
    <AppIcon
      name={account.icon ?? "wallet"}
      color={account.color ?? colors.primary}
      size={40}
      iconSize={20}
      background
    />
  );
}

function DetailRow({
  leading,
  label,
  value,
  muted = false,
}: {
  leading: ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      {leading}

      <View style={styles.flex}>
        <Text style={styles.detailLabel}>{label}</Text>

        <Text style={[styles.detailValue, muted && styles.detailValueMuted]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function TransferLeg({
  label,
  account,
  accountFallback,
  workspace,
  workspaceFallback,
  amount,
  amountColor,
}: {
  label: string;
  account?: { name: string; icon?: string | null; color?: string | null };
  accountFallback: string;
  workspace?: { name: string; country_code?: string | null };
  workspaceFallback: string;
  amount: string;
  amountColor: string;
}) {
  const flag = workspace?.country_code
    ? getCountryByCode(workspace.country_code)?.flag
    : undefined;

  return (
    <View style={styles.legRow}>
      {account ? (
        <AccountAvatar account={account} />
      ) : (
        <IconTile>
          <Wallet size={20} color={colors.primary} />
        </IconTile>
      )}

      <View style={styles.flex}>
        <Text style={styles.eyebrow}>{label}</Text>

        <Text
          style={[styles.legName, !account && styles.detailValueMuted]}
          numberOfLines={1}
        >
          {account?.name ?? accountFallback}
        </Text>

        <Text style={styles.legHint} numberOfLines={1}>
          {flag ? `${flag} ` : ""}
          {workspace?.name ?? workspaceFallback}
        </Text>
      </View>

      <Text
        style={[styles.legAmount, { color: amountColor }]}
        numberOfLines={1}
      >
        {amount}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  flex: {
    flex: 1,
  },

  content: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },

  /* Header */
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
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },

  headerSpacer: {
    width: 40,
  },

  /* Hero */
  heroCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },

  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },

  typeLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  amount: {
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },

  dateLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
  },

  /* Sections and cards */
  section: {
    gap: spacing.sm,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden",
  },

  messageCard: {
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.md,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  /* Detail rows */
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },

  flag: {
    fontSize: 20,
  },

  detailLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
  },

  detailValue: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    marginTop: 2,
  },

  detailValueMuted: {
    color: colors.textSecondary,
    fontWeight: typography.weight.regular,
  },

  /* Transfer legs */
  legRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  eyebrow: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  legName: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },

  legHint: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    marginTop: 2,
  },

  legAmount: {
    flexShrink: 0,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },

  connector: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  connectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },

  connectorCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Footer text */
  footer: {
    alignItems: "center",
  },

  footerText: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
  },

  /* Action bar */
  actionBar: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  deleteAction: {
    flex: 1,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
  },

  deleteActionPressed: {
    backgroundColor: colors.dangerLight,
  },

  deleteActionText: {
    color: colors.danger,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  editAction: {
    flex: 1.5,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },

  editActionPressed: {
    backgroundColor: colors.primaryDark,
  },

  editActionText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  /* Loading / empty */
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
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

  primaryButtonPressed: {
    backgroundColor: colors.primaryDark,
  },

  primaryButtonText: {
    color: colors.textOnPrimary,
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
    color: colors.textOnPrimary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  disabledButton: {
    opacity: 0.5,
  },
});
