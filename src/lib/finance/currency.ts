const currencyLocales: Record<string, string> = {
  MYR: "en-MY",
  IDR: "id-ID",
  USD: "en-US",
  JPY: "ja-JP",
  KWD: "en-KW",
};

/**
 * Returns the number of decimal places used by a currency.
 * Examples: MYR = 2, IDR = 0, KWD = 3.
 */
export function getCurrencyDecimalDigits(currency: string): number {
  return (
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

/**
 * Returns the preferred display locale for a currency.
 */
export function getCurrencyLocale(currency: string): string {
  return currencyLocales[currency] ?? "en";
}

/**
 * Converts an integer amount in the currency's smallest unit
 * into a decimal amount.
 */
export function fromMinorUnits(amountMinor: number, currency: string): number {
  const digits = getCurrencyDecimalDigits(currency);

  return amountMinor / 10 ** digits;
}

/**
 * Converts a decimal amount into an integer in the currency's
 * smallest unit.
 */
export function toMinorUnits(amount: number, currency: string): number {
  const digits = getCurrencyDecimalDigits(currency);
  const amountMinor = Math.round(amount * 10 ** digits);

  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error("Amount exceeds the supported range.");
  }

  return amountMinor;
}
