import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  EllipsisVertical,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react-native";

import { WorkspaceGate } from "@/components/feedbacks/workspace-gate";
import { SafeScreen } from "@/components/layout/safe-screen";
import { BottomSheetModal } from "@/components/ui/bottom-modal";

import { getCountryByCode } from "@/constants/countries";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { formatMoney, getAccountBalance } from "@/lib/finance/calculations";

import { useFinanceStore } from "@/stores/use-finance-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

import { AppIcon } from "@/components/ui/app-icon";
import type { financialAccount } from "@/types/finances";

export default function AccountsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  // Which account's actions sheet is open. Stored as an id so the sheet closes
  // by itself if that account is deleted.
  const [actionAccountId, setActionAccountId] = useState<string | null>(null);

  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );
  const workspaces = useWorkspaceStore((state) => state.workspaces);

  const accounts = useFinanceStore((state) => state.accounts);
  const removeAccount = useFinanceStore((state) => state.removeAccount);
  const transactions = useFinanceStore((state) => state.transactions);

  const workspace = workspaces.find((item) => item.id === activeWorkspaceId);
  const currency = workspace?.currency_code ?? "MYR";
  const flag = getCountryByCode(workspace?.country_code ?? "")?.flag ?? "🌍";

  const workspaceAccounts = useMemo(
    () =>
      accounts.filter((account) => account.workspaceId === activeWorkspaceId),
    [accounts, activeWorkspaceId],
  );

  const actionAccount = workspaceAccounts.find(
    (account) => account.id === actionAccountId,
  );

  const getAccountTypeLabel = (type: financialAccount["type"]): string => {
    switch (type) {
      case "e-wallet":
        return t("accounts.list.typeEwallet");
      case "cash":
        return t("accounts.list.typeCash");
      case "bank":
        return t("accounts.list.typeBank");
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const handleDeleteAccount = (account: financialAccount) => {
    Alert.alert(
      t("accounts.list.deleteConfirmTitle"),
      t("accounts.list.deleteConfirmMessage", { name: account.name }),
      [
        { text: t("accounts.list.cancel"), style: "cancel" },
        {
          text: t("accounts.list.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await removeAccount(account.id);
            } catch (error) {
              console.error(t("accounts.list.deleteErrorLog"), error);
              Alert.alert(
                t("accounts.list.deleteFailedTitle"),
                error instanceof Error
                  ? error.message
                  : t("accounts.list.deleteFailedMessage"),
              );
            }
          },
        },
      ],
    );
  };

  const handleEditAccount = (account: financialAccount) => {
    setActionAccountId(null);
    router.push({
      pathname: "/accounts/[id]/edit",
      params: { id: account.id },
    });
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
    <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
      <WorkspaceGate>
        <View style={styles.screen}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Total balance */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <View style={styles.balanceLabelRow}>
                  <Wallet size={18} color={colors.primaryLight} />
                  <Text style={styles.balanceLabel}>
                    {t("accounts.list.title")}
                  </Text>
                </View>
                <View style={styles.balanceBadge}>
                  <Text style={styles.balanceBadgeText}>{currency}</Text>
                </View>
              </View>

              <Text
                style={styles.balanceAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(totalBalanceMinor)}
              </Text>

              <View style={styles.balanceFooter}>
                <Text style={styles.balanceCaption}>
                  {t("accounts.list.across", {
                    count: workspaceAccounts.length,
                    accountLabel:
                      workspaceAccounts.length === 1
                        ? t("accounts.list.account")
                        : t("accounts.list.accounts"),
                    workspace: workspace?.name,
                  })}{" "}
                </Text>
                <View style={styles.workspacePill}>
                  <Text style={styles.workspaceFlag}>{flag}</Text>
                  <Text style={styles.workspaceName} numberOfLines={1}>
                    {workspace?.name ?? t("accounts.list.workspaceFallback")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Account list */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t("accounts.list.allAccounts")}
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {workspaceAccounts.length}
                </Text>
              </View>
            </View>

            {workspaceAccounts.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Wallet size={28} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>
                  {t("accounts.list.noAccounts")}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {t("accounts.list.emptyDescription")}
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.emptyButton,
                    pressed && styles.emptyButtonPressed,
                  ]}
                  onPress={() => router.push("/accounts/new")}
                  accessibilityRole="button"
                >
                  <Plus size={18} color={colors.textOnPrimary} />
                  <Text style={styles.emptyButtonText}>
                    {t("accounts.list.addFirst")}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.accountList}>
                {workspaceAccounts.map((account, index) => {
                  const balance = getAccountBalance(account, transactions);
                  return (
                    <View key={account.id}>
                      {index > 0 && <View style={styles.divider} />}
                      <Pressable
                        onPress={() => setActionAccountId(account.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`${account.name}, ${getAccountTypeLabel(account.type)}, ${t("accounts.list.balanceAccessibility", { amount: formatCurrency(balance) })}`}
                        accessibilityHint={t("accounts.list.openActionsHint")}
                        style={({ pressed }) => [
                          styles.accountRow,
                          pressed && styles.accountRowPressed,
                        ]}
                      >
                        <AppIcon
                          name={account.icon ?? "wallet"}
                          color={account.color ?? colors.primary}
                          size={44}
                          iconSize={21}
                          background
                        />
                        <View style={styles.accountDetails}>
                          <Text style={styles.accountName} numberOfLines={1}>
                            {account.name}
                          </Text>
                          <Text style={styles.accountType}>
                            {getAccountTypeLabel(account.type)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.accountBalance,
                            balance < 0 && styles.negativeBalance,
                          ]}
                          numberOfLines={1}
                        >
                          {formatCurrency(balance)}
                        </Text>
                        <EllipsisVertical
                          size={20}
                          color={colors.textSecondary}
                        />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Floating add button (the empty state has its own button) */}
          {workspaceAccounts.length > 0 && (
            <Pressable
              onPress={() => router.push("/accounts/new")}
              style={({ pressed }) => [
                styles.fab,
                pressed && styles.fabPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("accounts.list.addAccount")}
            >
              <Plus size={26} color={colors.textOnPrimary} />
            </Pressable>
          )}
        </View>

        {/* Account actions */}
        <BottomSheetModal
          visible={Boolean(actionAccount)}
          onClose={() => setActionAccountId(null)}
          title={actionAccount?.name ?? t("accounts.list.accountFallback")}
          subtitle={t("accounts.list.manageAccount")}
        >
          {actionAccount && (
            <>
              <Pressable
                onPress={() => handleEditAccount(actionAccount)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.actionOption,
                  pressed && styles.actionOptionPressed,
                ]}
              >
                <View style={styles.actionIcon}>
                  <Pencil size={20} color={colors.primary} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.actionLabel}>
                    {t("accounts.list.editAccount")}
                  </Text>
                  <Text style={styles.actionDescription}>
                    {t("accounts.list.editDescription")}
                  </Text>
                </View>
              </Pressable>

              {/* The confirmation alert appears over the sheet; the sheet closes on its own once the account is gone. */}
              <Pressable
                onPress={() => handleDeleteAccount(actionAccount)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.actionOption,
                  pressed && styles.actionOptionPressed,
                ]}
              >
                <View style={[styles.actionIcon, styles.actionIconDanger]}>
                  <Trash2 size={20} color={colors.danger} />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.actionLabel, styles.actionLabelDanger]}>
                    {t("accounts.list.deleteAccount")}
                  </Text>
                  <Text style={styles.actionDescription}>
                    {t("accounts.list.deleteDescription")}
                  </Text>
                </View>
              </Pressable>
            </>
          )}
        </BottomSheetModal>
      </WorkspaceGate>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 96,
    gap: spacing.lg,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  balanceLabel: {
    color: colors.primaryLight,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.8,
  },
  balanceBadge: {
    backgroundColor: colors.onPrimarySubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  balanceBadgeText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  balanceAmount: {
    color: colors.textOnPrimary,
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
    marginTop: spacing.lg,
  },
  balanceFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  balanceCaption: { color: colors.primaryLight, fontSize: typography.size.sm },
  workspacePill: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.onPrimarySubtle,
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  workspaceFlag: { fontSize: 14 },
  workspaceName: {
    flexShrink: 1,
    color: colors.textOnPrimary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  countBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countBadgeText: {
    color: colors.primary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  accountList: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  accountRowPressed: { backgroundColor: colors.background },
  accountDetails: { flex: 1, gap: 2 },
  accountName: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  accountType: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
  },
  accountBalance: {
    flexShrink: 0,
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  negativeBalance: { color: colors.danger },
  divider: { height: 1, backgroundColor: colors.border },
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
  emptyButtonPressed: { backgroundColor: colors.primaryDark },
  emptyButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    shadowColor: "#202824",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPressed: { backgroundColor: colors.primaryDark },
  actionOption: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  actionOptionPressed: { backgroundColor: colors.background },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconDanger: { backgroundColor: colors.dangerLight },
  actionLabel: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  actionLabelDanger: { color: colors.danger },
  actionDescription: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    marginTop: 2,
  },
});
