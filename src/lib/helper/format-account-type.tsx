import type { TFunction } from "i18next";

export function formatAccountType(type: string, t: TFunction): string {
  const key = type === "e-wallet" ? "eWallet" : type;

  const fallback =
    type === "e-wallet"
      ? "E-wallet"
      : type.charAt(0).toUpperCase() + type.slice(1);

  return t(`home.accountTypes.${key}`, {
    defaultValue: fallback,
  });
}
