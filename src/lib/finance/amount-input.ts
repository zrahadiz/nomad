import { getCurrencyDecimalDigits } from "@/lib/finance/currency";

/**
 * Sanitizes the amount while the user types.
 *
 * We deliberately avoid inserting thousands separators while editing
 * to prevent the cursor from jumping unexpectedly.
 */
export function sanitizeAmountInput(value: string, currency: string): string {
  const decimalDigits = getCurrencyDecimalDigits(currency);

  // IDR, JPY, and other zero-decimal currencies accept whole numbers.
  if (decimalDigits === 0) {
    return value.replace(/\D/g, "");
  }

  // For decimal currencies, accept either "." or "," as a decimal
  // separator while typing, then normalize it to "." internally.
  const cleaned = value.replace(/[^\d.,]/g, "");
  const separatorIndex = cleaned.search(/[.,]/);

  if (separatorIndex === -1) {
    return cleaned;
  }

  const whole = cleaned.slice(0, separatorIndex).replace(/[.,]/g, "");
  const fraction = cleaned
    .slice(separatorIndex + 1)
    .replace(/[.,]/g, "")
    .slice(0, decimalDigits);

  return `${whole || "0"}.${fraction}`;
}

/**
 * Parses the raw input into an integer in the currency's smallest unit.
 *
 * Examples:
 * MYR "25.50" -> 2550
 * IDR "25000" -> 25000
 * KWD "25.500" -> 25500
 */
export function parseAmountToMinor(
  value: string,
  currency: string,
): number | null {
  const decimalDigits = getCurrencyDecimalDigits(currency);
  const input = value.trim();

  if (!input) {
    return null;
  }

  const pattern =
    decimalDigits === 0
      ? /^\d+$/
      : new RegExp(`^\\d+(?:\\.\\d{1,${decimalDigits}})?$`);

  if (!pattern.test(input)) {
    return null;
  }

  const [whole, fraction = ""] = input.split(".");
  const minorDigits = fraction.padEnd(decimalDigits, "0");

  const amountMinor =
    Number(whole) * 10 ** decimalDigits +
    (minorDigits ? Number(minorDigits) : 0);

  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return null;
  }

  return amountMinor;
}
