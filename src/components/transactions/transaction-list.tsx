import { StyleSheet, View } from "react-native";

import { TransactionItem } from "@/components/transactions/transaction-item";
import { colors } from "@/constants/theme";
import { useCategoryStore } from "@/stores/use-category-store";
import type { workspaceCurrencyConverter } from "@/types/currency-converter";
import type { financialAccount, transaction } from "@/types/finances";

type TransactionListProps = {
  transactions: transaction[];
  accounts: financialAccount[];
  primaryCurrency: string;
  converter?: workspaceCurrencyConverter | null;
  onTransactionPress?: (item: transaction) => void;
  showDate?: boolean;
};

export function TransactionList({
  transactions,
  accounts,
  primaryCurrency,
  converter = null,
  onTransactionPress,
  showDate = true,
}: TransactionListProps) {
  const categories = useCategoryStore((state) => state.categories);

  return (
    <View style={styles.container}>
      {transactions.map((item, index) => {
        const account = accounts.find(
          (account) =>
            account.id === item.accountId &&
            account.workspaceId === item.workspaceId,
        );

        const category = categories.find(
          (category) => category.id === item.categoryId,
        );

        return (
          <View key={item.id}>
            {index > 0 && <View style={styles.divider} />}

            <TransactionItem
              item={item}
              accountName={account?.name}
              categoryName={category?.name}
              categoryIcon={category?.icon}
              primaryCurrency={primaryCurrency}
              converter={converter}
              showDate={showDate}
              onPress={
                onTransactionPress ? () => onTransactionPress(item) : undefined
              }
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
