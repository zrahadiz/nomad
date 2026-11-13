import { getCurrencyDecimalDigits } from "@/lib/finance/currency";

import { formatMoney } from "@/lib/finance/calculations";

import type { workspaceCurrencyConverter } from "@/types/currency-converter";

/**
 * Converts an amount from the workspace's primary currency
 * into the configured secondary currency.
 *
 * The exchange rate represents:
 * 1 unit of primary currency = exchangeRate units of secondary currency.
 *
 * Returns the converted amount in the secondary currency's minor units.
 */
export function convertMinorUnits(
  amountMinor: number,
  primaryCurrency: string,
  converter: workspaceCurrencyConverter,
): number {
  if (!Number.isFinite(amountMinor)) {
    throw new Error("Amount must be a finite number.");
  }

  if (!Number.isFinite(converter.exchangeRate) || converter.exchangeRate <= 0) {
    throw new Error("Exchange rate must be greater than zero.");
  }

  const primaryDigits = getCurrencyDecimalDigits(primaryCurrency);
  const secondaryDigits = getCurrencyDecimalDigits(
    converter.targetCurrencyCode,
  );

  // Convert the primary amount into major currency units.
  const primaryMajor = amountMinor / 10 ** primaryDigits;

  // Apply the exchange rate.
  const secondaryMajor = primaryMajor * converter.exchangeRate;

  // Convert the result into secondary currency minor units.
  return Math.round(secondaryMajor * 10 ** secondaryDigits);
}

/**
 * Converts and formats an amount using the workspace's
 * configured secondary currency.
 *
 * Returns null when no converter is configured.
 */
export function formatConvertedMoney(
  amountMinor: number,
  primaryCurrency: string,
  converter: workspaceCurrencyConverter | null,
): string | null {
  if (!converter) {
    return null;
  }

  const convertedMinor = convertMinorUnits(
    amountMinor,
    primaryCurrency,
    converter,
  );

  return formatMoney(convertedMinor, converter.targetCurrencyCode);
}
