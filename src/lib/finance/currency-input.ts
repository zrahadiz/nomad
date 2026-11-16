import { getCurrencyDecimalDigits } from "@/lib/finance/currency";

/**
 * Checks whether a user-entered amount follows
 * the decimal precision rules of its currency.
 */
export function isValidCurrencyAmountInput(
  value: string,
  currency: string,
): boolean {
  const normalizedValue = value.trim();

  if (!/^\d*\.?\d*$/.test(normalizedValue)) {
    return false;
  }

  const decimalPart = normalizedValue.split(".")[1];

  if (!decimalPart) {
    return true;
  }

  return decimalPart.length <= getCurrencyDecimalDigits(currency);
}
