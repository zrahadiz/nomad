import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeftRight, Info, Save } from "lucide-react-native";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
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

import { AmountInput } from "@/components/forms/amount-input";
import { SafeScreen } from "@/components/layout/safe-screen";
import {
  TransactionFormCard,
  TransactionInlineNotice,
  TransactionOptionSheet,
  TransactionSectionHeader,
  TransactionSelectRow,
} from "@/components/transactions";
import { AppIcon } from "@/components/ui/app-icon";
import { DatePickerField } from "@/components/ui/date-picker-field";
import type { TransactionSheetOption } from "@/types/transaction";

import { colors, radius, spacing, typography } from "@/constants/theme";
import { isValidCurrencyAmountInput } from "@/lib/finance/currency-input";
import { formatAccountType } from "@/lib/helper/format-account-type";
import { useCategoryStore } from "@/stores/use-category-store";
import { useFinanceStore } from "@/stores/use-finance-store";

function getCurrencyDecimals(currency: string) {
  return (
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

function formatCurrency(amountMinor: number, currency: string) {
  const decimals = getCurrencyDecimals(currency);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amountMinor / 10 ** decimals);
}

function formatMinorToInput(amountMinor: number, currency: string) {
  const decimals = getCurrencyDecimals(currency);
  return (amountMinor / 10 ** decimals).toFixed(decimals);
}

function parseAmountToMinor(value: string, currency: string) {
  if (!isValidCurrencyAmountInput(value, currency)) return null;
  const decimals = getCurrencyDecimals(currency);
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const minorAmount = Math.round(amount * 10 ** decimals);
  if (!Number.isSafeInteger(minorAmount) || minorAmount <= 0) return null;
  return minorAmount;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10))
  );
}

export default function EditTransactionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const transactions = useFinanceStore((state) => state.transactions);
  const accounts = useFinanceStore((state) => state.accounts);
  const accountsLoading = useFinanceStore((state) => state.accountsLoading);
  const fetchAccounts = useFinanceStore((state) => state.fetchAccounts);
  const editTransaction = useFinanceStore((state) => state.editTransaction);
  const transactionsLoading = useFinanceStore(
    (state) => state.transactionsLoading,
  );

  const categories = useCategoryStore((state) => state.categories);
  const categoriesLoading = useCategoryStore(
    (state) => state.categoriesLoading,
  );
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);

  const transaction = useMemo(
    () => transactions.find((item) => item.id === id),
    [transactions, id],
  );
  const isEditable =
    transaction?.type === "income" || transaction?.type === "expense";
  const currency = transaction?.currency ?? "MYR";

  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  useEffect(() => {
    if (!transaction || initialized) return;
    setAccountId(transaction.accountId);
    setCategoryId(transaction.categoryId ?? "");
    setAmount(
      formatMinorToInput(transaction.amountMinor, transaction.currency),
    );
    setDate(transaction.date);
    setDescription(transaction.description ?? "");
    setInitialized(true);
  }, [transaction, initialized]);

  useEffect(() => {
    if (!transaction) return;
    void fetchAccounts(transaction.workspaceId);
  }, [transaction?.workspaceId, fetchAccounts]);

  useEffect(() => {
    if (categories.length === 0 && !categoriesLoading) {
      void fetchCategories();
    }
  }, [categories.length, categoriesLoading, fetchCategories]);

  const availableAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.workspaceId === transaction?.workspaceId,
      ),
    [accounts, transaction?.workspaceId],
  );

  const availableCategories = useMemo(() => {
    if (!transaction) return [];
    return categories.filter(
      (category) =>
        category.type === transaction.type &&
        (!category.isArchived || category.id === transaction.categoryId),
    );
  }, [categories, transaction]);

  const selectedAccount = availableAccounts.find(
    (account) => account.id === accountId,
  );
  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );

  const getCategoryDescription = (category: (typeof categories)[number]) => {
    if (category.isArchived) {
      return t("transactions.edit.categoryStatus.archived", {
        defaultValue: "Currently assigned · Archived",
      });
    }
    if (category.isDefault) {
      return t("transactions.edit.categoryStatus.default", {
        defaultValue: "Default category",
      });
    }
    return t("transactions.edit.categoryStatus.custom", {
      defaultValue: "Custom category",
    });
  };

  const accountOptions: TransactionSheetOption[] = availableAccounts.map(
    (account) => ({
      id: account.id,
      label: account.name,
      description: `${formatAccountType(account.type, t)} · ${account.currency}`,
      leading: (
        <AppIcon
          name={account.icon ?? "wallet"}
          color={account.color ?? colors.primary}
          size={40}
          iconSize={20}
          background
        />
      ),
    }),
  );

  const categoryOptions: TransactionSheetOption[] = availableCategories.map(
    (category) => ({
      id: category.id,
      label: category.name,
      description: getCategoryDescription(category),
      leading: (
        <AppIcon
          name={category.icon ?? "ellipsis"}
          color={colors.primary}
          size={40}
          iconSize={20}
          background
          backgroundColor={category.color ?? colors.primaryLight}
        />
      ),
    }),
  );

  const parsedAmount = parseAmountToMinor(amount, currency);
  const canSave =
    Boolean(transaction) &&
    isEditable &&
    initialized &&
    Boolean(selectedAccount) &&
    Boolean(selectedCategory) &&
    parsedAmount !== null &&
    isValidDate(date) &&
    !saving;

  const handleAmountChange = (value: string) => {
    if (isValidCurrencyAmountInput(value, currency)) setAmount(value);
  };

  const handleSave = async () => {
    if (!transaction || !isEditable) return;

    if (!selectedAccount) {
      Alert.alert(
        t("transactions.edit.validation.accountRequired.title", {
          defaultValue: "Account required",
        }),
        t("transactions.edit.validation.accountRequired.message", {
          defaultValue: "Please select an account.",
        }),
      );
      return;
    }
    if (selectedAccount.workspaceId !== transaction.workspaceId) {
      Alert.alert(
        t("transactions.edit.validation.invalidAccount.title", {
          defaultValue: "Invalid account",
        }),
        t("transactions.edit.validation.invalidAccount.message", {
          defaultValue: "Please select an account from the original workspace.",
        }),
      );
      return;
    }
    if (!selectedCategory) {
      Alert.alert(
        t("transactions.edit.validation.categoryRequired.title", {
          defaultValue: "Category required",
        }),
        t("transactions.edit.validation.categoryRequired.message", {
          defaultValue: "Please select a category.",
        }),
      );
      return;
    }
    if (selectedCategory.type !== transaction.type) {
      Alert.alert(
        t("transactions.edit.validation.invalidCategory.title", {
          defaultValue: "Invalid category",
        }),
        t("transactions.edit.validation.invalidCategory.message", {
          defaultValue:
            "Please select a category matching this transaction type.",
        }),
      );
      return;
    }
    if (
      selectedCategory.isArchived &&
      selectedCategory.id !== transaction.categoryId
    ) {
      Alert.alert(
        t("transactions.edit.validation.archivedCategory.title", {
          defaultValue: "Archived category",
        }),
        t("transactions.edit.validation.archivedCategory.message", {
          defaultValue: "Please select an active category.",
        }),
      );
      return;
    }
    if (parsedAmount === null) {
      Alert.alert(
        t("transactions.edit.validation.invalidAmount.title", {
          defaultValue: "Invalid amount",
        }),
        t("transactions.edit.validation.invalidAmount.message", {
          defaultValue: "Please enter an amount greater than zero.",
        }),
      );
      return;
    }
    if (!isValidDate(date)) {
      Alert.alert(
        t("transactions.edit.validation.invalidDate.title", {
          defaultValue: "Invalid date",
        }),
        t("transactions.edit.validation.invalidDate.message", {
          defaultValue: "Please enter a valid date.",
        }),
      );
      return;
    }

    try {
      setSaving(true);
      await editTransaction(transaction.id, {
        accountId: selectedAccount.id,
        categoryId: selectedCategory.id,
        amountMinor: parsedAmount,
        description: description.trim() || null,
        date,
      });
      router.back();
    } catch (error) {
      console.error("Failed to update transaction:", error);
      Alert.alert(
        t("transactions.edit.errors.updateFailed.title", {
          defaultValue: "Unable to update transaction",
        }),
        error instanceof Error
          ? error.message
          : t("common.errors.generic", {
              defaultValue: "Something went wrong. Please try again.",
            }),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!transaction && transactionsLoading) {
    return (
      <SafeScreen backgroundColor={colors.background}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateDescription}>
            {t("transactions.edit.loading", {
              defaultValue: "Loading transaction...",
            })}
          </Text>
        </View>
      </SafeScreen>
    );
  }

  if (!transaction) {
    return (
      <StateScreen
        icon={
          <AppIcon
            name="wallet"
            size={48}
            iconSize={28}
            color={colors.textSecondary}
            background={false}
          />
        }
        title={t("transactions.edit.notFound.title", {
          defaultValue: "Transaction not found",
        })}
        description={t("transactions.edit.notFound.description", {
          defaultValue:
            "This transaction may have been deleted or is no longer available.",
        })}
        backLabel={t("common.goBack", { defaultValue: "Go back" })}
        onBack={() => router.back()}
      />
    );
  }

  if (!isEditable) {
    return (
      <StateScreen
        icon={<ArrowLeftRight size={32} color={colors.textSecondary} />}
        title={t("transactions.edit.transferNotEditable.title", {
          defaultValue: "Transfer cannot be edited here",
        })}
        description={t("transactions.edit.transferNotEditable.description", {
          defaultValue:
            "Transfer records are linked to another transaction and must be managed together.",
        })}
        backLabel={t("common.goBack", { defaultValue: "Go back" })}
        onBack={() => router.back()}
      />
    );
  }

  const transactionTypeLabel = t(`transactions.types.${transaction.type}`, {
    defaultValue: transaction.type,
  });
  const amountChanged =
    parsedAmount !== null && parsedAmount !== transaction.amountMinor;

  return (
    <SafeScreen backgroundColor={colors.background} edges={["bottom"]}>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TransactionFormCard
            title={t("transactions.add.amount", {
              defaultValue: "Amount",
            })}
            currency={currency}
          >
            <AmountInput
              value={amount}
              onChangeText={handleAmountChange}
              currency={currency}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              style={styles.amountInput}
            />
            <Text style={styles.helperText}>
              {parsedAmount !== null
                ? t("transactions.edit.amountPreview", {
                    amount: formatCurrency(parsedAmount, currency),
                    defaultValue: `Preview: ${formatCurrency(parsedAmount, currency)}`,
                  })
                : t("transactions.edit.amountPlaceholder", {
                    currency,
                    defaultValue: `Enter the amount in ${currency}.`,
                  })}
            </Text>
            {amountChanged ? (
              <Text style={styles.helperText}>
                {t("transactions.edit.originalAmount", {
                  amount: formatCurrency(transaction.amountMinor, currency),
                  defaultValue: `Originally ${formatCurrency(transaction.amountMinor, currency)}`,
                })}
              </Text>
            ) : null}
            <View style={styles.divider} />
            <View style={styles.noteRow}>
              <Info size={14} color={colors.textSecondary} />
              <Text style={styles.helperText}>
                {t("transactions.edit.currencyNote", {
                  defaultValue:
                    "The currency is determined by your account and workspace.",
                })}
              </Text>
            </View>
          </TransactionFormCard>

          <View style={styles.group}>
            <TransactionSectionHeader
              title={t("transactions.add.details", {
                defaultValue: "Details",
              })}
            />
            <View style={styles.card}>
              <TransactionSelectRow
                label={t("transactions.add.account", {
                  defaultValue: "Account",
                })}
                value={selectedAccount?.name}
                placeholder={t("transactions.add.selectAccount", {
                  defaultValue: "Select an account",
                })}
                hint={
                  selectedAccount
                    ? `${formatAccountType(selectedAccount.type, t)} · ${selectedAccount.currency}`
                    : t("transactions.edit.accountHint", {
                        defaultValue: "Choose an account for this transaction",
                      })
                }
                leading={
                  <AppIcon
                    name={selectedAccount?.icon ?? "wallet"}
                    color={selectedAccount?.color ?? colors.primary}
                    size={40}
                    iconSize={20}
                    background
                  />
                }
                onPress={() => setAccountModalVisible(true)}
              />
              <View style={styles.divider} />
              <TransactionSelectRow
                label={t("transactions.add.category", {
                  defaultValue: "Category",
                })}
                value={selectedCategory?.name}
                placeholder={t("transactions.add.selectCategory", {
                  defaultValue: "Select a category",
                })}
                hint={
                  selectedCategory
                    ? getCategoryDescription(selectedCategory)
                    : t("transactions.edit.categoryHint", {
                        type: transactionTypeLabel.toLowerCase(),
                        defaultValue: `Choose an ${transaction.type} category`,
                      })
                }
                leading={
                  <AppIcon
                    name={selectedCategory?.icon ?? "ellipsis"}
                    color={colors.primary}
                    size={40}
                    iconSize={20}
                    background
                    backgroundColor={
                      selectedCategory?.color ?? colors.primaryLight
                    }
                  />
                }
                onPress={() => setCategoryModalVisible(true)}
              />
            </View>
            {availableAccounts.length === 0 && !accountsLoading ? (
              <TransactionInlineNotice
                text={t("transactions.edit.noAccounts", {
                  defaultValue: "No accounts are available in this workspace.",
                })}
              />
            ) : null}
            {availableCategories.length === 0 && !categoriesLoading ? (
              <TransactionInlineNotice
                text={t("transactions.edit.noCategories", {
                  defaultValue:
                    "No categories available for this transaction type.",
                })}
              />
            ) : null}
          </View>

          <DatePickerField
            label={t("transactions.add.date", { defaultValue: "Date" })}
            value={date}
            onChange={setDate}
          />

          <View style={styles.group}>
            <TransactionSectionHeader
              title={t("transactions.add.description", {
                defaultValue: "Description",
              })}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t("transactions.add.descriptionPlaceholder", {
                defaultValue: "e.g. Lunch with friends",
              })}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, styles.descriptionInput]}
              maxLength={150}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.helperText}>
              {t("transactions.add.descriptionHint", {
                defaultValue: "Optional, up to 150 characters.",
              })}
            </Text>
          </View>
        </KeyboardAwareScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave, busy: saving }}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              !canSave && styles.disabledButton,
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Save size={20} color={colors.textOnPrimary} />
            )}
            <Text style={styles.saveButtonText}>
              {saving
                ? t("transactions.edit.saving", {
                    defaultValue: "Saving changes...",
                  })
                : t("transactions.edit.saveChanges", {
                    defaultValue: "Save changes",
                  })}
            </Text>
          </Pressable>
        </View>
      </View>

      <TransactionOptionSheet
        visible={accountModalVisible}
        onClose={() => setAccountModalVisible(false)}
        title={t("transactions.add.selectAccount", {
          defaultValue: "Select account",
        })}
        subtitle={t("transactions.edit.accountSheetSubtitle", {
          defaultValue: "Choose an account in this workspace.",
        })}
        options={accountOptions}
        selectedId={accountId}
        emptyText={
          accountsLoading
            ? t("transactions.edit.loadingAccounts", {
                defaultValue: "Loading accounts...",
              })
            : t("transactions.edit.emptyAccounts", {
                defaultValue: "No accounts available.",
              })
        }
        onSelect={(optionId) => {
          setAccountId(optionId);
          setAccountModalVisible(false);
        }}
      />
      <TransactionOptionSheet
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        title={t("transactions.add.selectCategory", {
          defaultValue: "Select category",
        })}
        subtitle={t("transactions.edit.categorySheetSubtitle", {
          type: transactionTypeLabel.toLowerCase(),
          defaultValue: `Choose a category for this ${transaction.type}.`,
        })}
        options={categoryOptions}
        selectedId={categoryId}
        emptyText={
          categoriesLoading
            ? t("transactions.edit.loadingCategories", {
                defaultValue: "Loading categories...",
              })
            : t("transactions.edit.emptyCategories", {
                defaultValue: "No categories available.",
              })
        }
        onSelect={(optionId) => {
          setCategoryId(optionId);
          setCategoryModalVisible(false);
        }}
      />
    </SafeScreen>
  );
}

function StateScreen({
  icon,
  title,
  description,
  backLabel,
  onBack,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <SafeScreen backgroundColor={colors.background}>
      <View style={styles.centerState}>
        <View style={styles.stateIcon}>{icon}</View>
        <Text style={styles.stateTitle}>{title}</Text>
        <Text style={styles.stateDescription}>{description}</Text>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>{backLabel}</Text>
        </Pressable>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  group: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
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
  descriptionInput: {
    minHeight: 96,
    paddingTop: spacing.md,
  },
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
  saveButtonPressed: { backgroundColor: colors.primaryDark },
  disabledButton: { opacity: 0.5 },
  saveButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: {
    color: colors.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    textAlign: "center",
  },
  stateDescription: {
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
  primaryButtonPressed: { backgroundColor: colors.primaryDark },
  primaryButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
});
