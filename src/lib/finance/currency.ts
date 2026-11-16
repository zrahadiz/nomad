const currencyLocales: Record<string, string> = {
  MYR: "en-MY",
  IDR: "id-ID",
  USD: "en-US",
  JPY: "ja-JP",
  KWD: "en-KW",
};

const currencyDecimalDigits: Record<string, number> = {
  IDR: 0,
  JPY: 0,
  KRW: 0,
  MYR: 2,
  USD: 2,
  AUD: 2,
  SGD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
  KWD: 3,
  BHD: 3,
  OMR: 3,
};

/**
 * Returns the standard number of decimal places for a currency.
 */
export function getCurrencyDecimalDigits(currency: string): number {
  const normalizedCurrency = currency.toUpperCase();

  return (
    currencyDecimalDigits[normalizedCurrency] ??
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: normalizedCurrency,
    }).resolvedOptions().maximumFractionDigits
  );
}

/**
 * Returns the preferred display locale for a currency.
 */
export function getCurrencyLocale(currency: string): string {
  return currencyLocales[currency.toUpperCase()] ?? "en";
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
  if (!Number.isFinite(amount)) {
    throw new Error("Amount must be a finite number.");
  }

  const digits = getCurrencyDecimalDigits(currency);
  const amountMinor = Math.round(amount * 10 ** digits);

  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error("Amount exceeds the supported range.");
  }

  return amountMinor;
}
