import { useRouter } from "expo-router";
import { Info, Plus } from "lucide-react-native";
import { useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { AccountColorPicker } from "@/components/accounts/account-color-picker";
import { AccountIcon } from "@/components/accounts/account-icon";
import { AccountIconPicker } from "@/components/accounts/account-icon-picker";
import { AmountInput } from "@/components/forms/amount-input";
import { SafeScreen } from "@/components/layout/safe-screen";

import {
  accountColors,
  accountIcons,
  type accountIconName,
} from "@/constants/account-options";
import { colors, radius, spacing, typography } from "@/constants/theme";

import { formatMoney } from "@/lib/finance/calculations";
import { getCurrencyDecimalDigits, toMinorUnits } from "@/lib/finance/currency";
import { isValidCurrencyAmountInput } from "@/lib/finance/currency-input";

import { useFinanceStore } from "@/stores/use-finance-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

import type { accountType } from "@/types/finances";

const accountTypeOptions: {
  label: string;
  value: accountType;
}[] = [
  { label: "Cash", value: "cash" },
  { label: "Bank", value: "bank" },
  { label: "E-wallet", value: "e-wallet" },
  { label: "Other", value: "other" },
];

function parseAmountToMinor(value: string, currency: string) {
  if (!isValidCurrencyAmountInput(value, currency)) {
    return null;
  }

  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  try {
    return toMinorUnits(amount, currency);
  } catch {
    return null;
  }
}

export default function NewAccountScreen() {
  const router = useRouter();

  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );

  const addAccount = useFinanceStore((state) => state.addAccount);

  const workspace = workspaces.find((item) => item.id === activeWorkspaceId);

  const [name, setName] = useState("");
  const [type, setType] = useState<accountType>("bank");
  const [icon, setIcon] = useState<accountIconName>("wallet");
  const [color, setColor] = useState<string>(accountColors[0]);
  const [openingBalance, setOpeningBalance] = useState("");
  const [saving, setSaving] = useState(false);

  const currency = workspace?.currency_code ?? "MYR";
  const decimalDigits = getCurrencyDecimalDigits(currency);

  const selectedIconLabel = useMemo(
    () => accountIcons.find((item) => item.name === icon)?.label ?? "Account",
    [icon],
  );

  const parsedBalance = parseAmountToMinor(openingBalance, currency);

  const previewBalance =
    parsedBalance !== null
      ? formatMoney(parsedBalance, currency)
      : formatMoney(0, currency);

  const handleOpeningBalanceChange = (value: string) => {
    if (isValidCurrencyAmountInput(value, currency)) {
      setOpeningBalance(value);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!workspace) {
      Alert.alert("No active workspace", "Please select a workspace first.");
      return;
    }

    if (!trimmedName) {
      Alert.alert("Account name required", "Please enter an account name.");
      return;
    }

    if (parsedBalance === null) {
      Alert.alert(
        "Invalid opening balance",
        `Please enter a valid amount with up to ${decimalDigits} decimal places.`,
      );
      return;
    }

    try {
      setSaving(true);

      await addAccount({
        workspaceId: workspace.id,
        name: trimmedName,
        type,
        currency,
        initialBalanceMinor: parsedBalance,
        icon,
        color,
      });

      Alert.alert("Account created", "Your account has been created.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Failed to create account:", error);

      Alert.alert(
        "Unable to create account",
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const typeLabel =
    accountTypeOptions.find((item) => item.value === type)?.label ?? "";

  const trimmedName = name.trim();
  const saveDisabled = saving || !workspace;

  return (
    <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 2. Name */}
          <View style={styles.group}>
            <Text style={styles.sectionTitle}>Account name</Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Maybank Savings"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              maxLength={40}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* 3. Type */}
          <View style={styles.group}>
            <Text style={styles.sectionTitle}>Account type</Text>

            <SegmentedControl
              options={accountTypeOptions}
              value={type}
              onChange={setType}
            />
          </View>

          {/* 4. Appearance: icon and color together, since they style the same thing */}
          <View style={styles.group}>
            <Text style={styles.sectionTitle}>Appearance</Text>

            <View style={[styles.card, styles.cardPadded]}>
              <Text style={styles.cardLabel}>Choose an icon</Text>

              <AccountIconPicker
                value={icon}
                color={color}
                onChange={setIcon}
              />

              <View style={styles.divider} />

              <Text style={styles.cardLabel}>Choose a color</Text>

              <AccountColorPicker value={color} onChange={setColor} />
            </View>
          </View>

          {/* 5. Opening balance */}
          <FormCard title="Opening balance" currency={currency}>
            <AmountInput
              value={openingBalance}
              onChangeText={handleOpeningBalanceChange}
              currency={currency}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              style={styles.amountInput}
              returnKeyType="done"
            />

            <Text style={styles.helperText}>Preview: {previewBalance}</Text>

            <Text style={styles.helperText}>
              Enter the amount currently available in this account.
              {` Maximum ${decimalDigits} decimal places for ${currency}.`}
            </Text>

            <View style={styles.divider} />

            <View style={styles.noteRow}>
              <Info size={14} color={colors.textSecondary} />

              <Text style={styles.helperText}>
                {`Account currency: ${currency}. This account uses your workspace currency.`}
              </Text>
            </View>
          </FormCard>
          {/* 1. Live preview: updates as you type and pick, so it stays at the top */}
          <View style={styles.group}>
            <Text style={styles.sectionTitle}>Account Preview</Text>

            <View style={styles.previewCard}>
              <AccountIcon name={icon} color={color} size={56} iconSize={26} />

              <View style={styles.flex}>
                <Text
                  style={[
                    styles.previewName,
                    !trimmedName && styles.previewNamePlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {trimmedName || "Account name"}
                </Text>

                <Text style={styles.previewType} numberOfLines={1}>
                  {selectedIconLabel} · {typeLabel}
                </Text>
              </View>

              <View style={styles.previewBalanceContainer}>
                <Text style={styles.previewBalanceLabel}>Opening balance</Text>

                <Text style={styles.previewBalance} numberOfLines={1}>
                  {previewBalance}
                </Text>
              </View>
            </View>
          </View>
        </KeyboardAwareScrollView>

        {/* Save: always visible, outside the scroll area */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleSave}
            disabled={saveDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: saveDisabled, busy: saving }}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              saveDisabled && styles.disabledButton,
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Plus size={20} color={colors.textOnPrimary} />
            )}

            <Text style={styles.saveButtonText}>
              {saving ? "Creating account..." : "Create account"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeScreen>
  );
}

/* -------------------------------------------------------------------------- */
/* Presentational pieces                                                       */
/* Same family as the transaction screens: share them when you extract.        */
/* -------------------------------------------------------------------------- */

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text
              style={[
                styles.segmentText,
                selected && styles.segmentTextSelected,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FormCard({
  title,
  currency,
  children,
}: {
  title: string;
  currency?: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.card, styles.cardPadded]}>
      <View style={styles.formCardHeader}>
        <Text style={styles.cardLabel}>{title}</Text>

        {currency ? (
          <View style={styles.currencyChip}>
            <Text style={styles.currencyChipText}>{currency}</Text>
          </View>
        ) : null}
      </View>

      {children}
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
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },

  group: {
    gap: spacing.sm,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  /* Preview */
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  previewName: {
    color: colors.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  previewNamePlaceholder: {
    color: colors.textSecondary,
    fontWeight: typography.weight.regular,
  },

  previewType: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    marginTop: 2,
  },

  previewBalanceContainer: {
    flexShrink: 0,
    maxWidth: "40%",
    alignItems: "flex-end",
    gap: 2,
  },

  previewBalanceLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },

  previewBalance: {
    color: colors.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  /* Inputs */
  input: {
    minHeight: 50,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: typography.size.md,
  },

  /* Segmented control */
  segmented: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },

  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },

  segmentSelected: {
    backgroundColor: colors.primaryLight,
  },

  segmentText: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  segmentTextSelected: {
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },

  /* Cards */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  cardPadded: {
    padding: spacing.md,
    gap: spacing.md,
  },

  cardLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  formCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  currencyChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },

  currencyChipText: {
    color: colors.primary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  /* Amount */
  amountInput: {
    height: 56,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    color: colors.text,
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
  },

  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  helperText: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    lineHeight: 18,
  },

  /* Save bar */
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  saveButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },

  saveButtonPressed: {
    backgroundColor: colors.primaryDark,
  },

  disabledButton: {
    opacity: 0.5,
  },

  saveButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
});
