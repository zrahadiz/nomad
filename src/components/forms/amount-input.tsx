import { useEffect, useState } from "react";
import { TextInput, type TextInputProps } from "react-native";

import {
  formatAmountInput,
  normalizeAmountInput,
} from "@/lib/finance/amount-input";

type AmountInputProps = Omit<
  TextInputProps,
  "value" | "onChangeText" | "onSelectionChange" | "keyboardType"
> & {
  value: string;
  currency: string;
  onChangeText: (value: string) => void;
};

export function AmountInput({
  value,
  currency,
  onChangeText,
  ...textInputProps
}: AmountInputProps) {
  const displayValue = formatAmountInput(value, currency);

  const [selection, setSelection] = useState({
    start: displayValue.length,
    end: displayValue.length,
  });

  useEffect(() => {
    setSelection({
      start: displayValue.length,
      end: displayValue.length,
    });
  }, [displayValue]);

  function handleChangeText(text: string) {
    const normalized = normalizeAmountInput(text, currency);

    if (normalized === null) return;

    onChangeText(normalized);
  }

  return (
    <TextInput
      {...textInputProps}
      value={displayValue}
      keyboardType="decimal-pad"
      onChangeText={handleChangeText}
      selection={selection}
      onSelectionChange={({ nativeEvent }) => {
        const end = displayValue.length;

        setSelection({
          start: end,
          end,
        });
      }}
    />
  );
}
