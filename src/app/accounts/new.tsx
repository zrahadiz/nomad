import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
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
import { colors, radius, spacing } from "@/constants/theme";

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

  return (
    <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Account Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account name</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Maybank Savings"
            placeholderTextColor={colors.textSecondary}
            style={styles.textInput}
            maxLength={40}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        {/* Account Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account type</Text>

          <View style={styles.typeContainer}>
            {accountTypeOptions.map((option) => {
              const selected = type === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setType(option.value)}
                  style={[
                    styles.typeOption,
                    selected && styles.selectedTypeOption,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      selected && styles.selectedTypeText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Account Icon */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose an icon</Text>

          <AccountIconPicker value={icon} color={color} onChange={setIcon} />
        </View>

        {/* Account Color */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a color</Text>

          <AccountColorPicker value={color} onChange={setColor} />
        </View>

        {/* Opening Balance */}
        <View style={styles.section}>
          <View style={styles.balanceHeader}>
            <Text style={styles.sectionTitle}>Opening balance</Text>
            <Text style={styles.currencyLabel}>{currency}</Text>
          </View>

          <AmountInput
            value={openingBalance}
            onChangeText={handleOpeningBalanceChange}
            currency={currency}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            style={styles.textInput}
            returnKeyType="done"
          />

          <Text style={styles.previewBalance}>Preview: {previewBalance}</Text>

          <Text style={styles.helperText}>
            Enter the amount currently available in this account.
            {` Maximum ${decimalDigits} decimal places for ${currency}.`}
          </Text>
        </View>

        {/* Workspace Currency */}
        <View style={styles.currencyInfo}>
          <View style={styles.currencyInfoText}>
            <Text style={styles.currencyInfoTitle}>Account currency</Text>
            <Text style={styles.helperText}>
              This account uses your workspace currency.
            </Text>
          </View>

          <Text style={styles.currencyCode}>{currency}</Text>
        </View>

        {/* Account Preview */}
        <Text style={styles.sectionTitle}>Account Preview</Text>

        <View style={styles.previewCard}>
          <AccountIcon name={icon} color={color} size={56} iconSize={26} />

          <View style={styles.previewDetails}>
            <Text style={styles.previewName}>
              {name.trim() || "Account name"}
            </Text>

            <Text style={styles.previewType}>
              {selectedIconLabel} ·{" "}
              {accountTypeOptions.find((item) => item.value === type)?.label}
            </Text>
          </View>

          <View style={styles.previewBalanceContainer}>
            <Text style={styles.previewBalanceLabel}>Opening balance</Text>
            <Text style={styles.previewBalance}>{previewBalance}</Text>
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          onPress={handleSave}
          disabled={saving || !workspace}
          style={[
            styles.saveButton,
            (saving || !workspace) && styles.disabledButton,
          ]}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>
            {saving ? "Creating account..." : "Create Account"}
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewDetails: {
    flex: 1,
    gap: 4,
  },
  previewName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  previewType: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  previewBalanceContainer: {
    alignItems: "flex-end",
    gap: 4,
  },
  previewBalanceLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  previewBalance: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  textInput: {
    height: 50,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  typeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  typeOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectedTypeOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  selectedTypeText: {
    color: colors.primary,
    fontWeight: "600",
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currencyLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  currencyInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
  },
  currencyInfoText: {
    flex: 1,
    gap: 4,
  },
  currencyInfoTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  currencyCode: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  saveButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
