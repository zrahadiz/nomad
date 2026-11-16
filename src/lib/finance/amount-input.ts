import {
  getCurrencyDecimalDigits,
  getCurrencyLocale,
} from "@/lib/finance/currency";

function getAmountSeparators(currency: string) {
  const parts = new Intl.NumberFormat(
    getCurrencyLocale(currency),
  ).formatToParts(12345.6);

  return {
    group: parts.find((part) => part.type === "group")?.value ?? ",",
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
  };
}

export function normalizeAmountInput(
  value: string,
  currency: string,
): string | null {
  if (!value) return "";

  const { group, decimal } = getAmountSeparators(currency);
  const decimalDigits = getCurrencyDecimalDigits(currency);

  let normalized = value.split(group).join("");

  if (decimal !== ".") {
    normalized = normalized.split(decimal).join(".");
  }

  if (!/^\d*\.?\d*$/.test(normalized)) {
    return null;
  }

  const decimalPart = normalized.split(".")[1];

  if (decimalPart && decimalPart.length > decimalDigits) {
    return null;
  }

  if (decimalDigits === 0 && normalized.includes(".")) {
    return null;
  }

  return normalized;
}

export function formatAmountInput(value: string, currency: string): string {
  if (!value) return "";

  const normalized = normalizeAmountInput(value, currency);

  if (normalized === null) return value;

  const { decimal } = getAmountSeparators(currency);
  const [integerPart, decimalPart] = normalized.split(".");

  const formattedInteger = integerPart
    ? new Intl.NumberFormat(getCurrencyLocale(currency), {
        maximumFractionDigits: 0,
        useGrouping: true,
      }).format(Number(integerPart))
    : "";

  if (normalized.includes(".")) {
    return `${formattedInteger}${decimal}${decimalPart ?? ""}`;
  }

  return formattedInteger;
}
