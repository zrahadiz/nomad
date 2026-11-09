export const accountIcons = [
  { name: "wallet", label: "Wallet" },
  { name: "banknote", label: "Cash" },
  { name: "building-2", label: "Bank" },
  { name: "smartphone", label: "E-wallet" },
  { name: "credit-card", label: "Card" },
  { name: "landmark", label: "Banking" },
  { name: "piggy-bank", label: "Savings" },
  { name: "coins", label: "Coins" },
  { name: "briefcase-business", label: "Business" },
  { name: "circle-dollar-sign", label: "Money" },
  { name: "hand-coins", label: "Income" },
  { name: "vault", label: "Vault" },
  { name: "globe", label: "International" },
  { name: "shopping-bag", label: "Shopping" },
  { name: "house", label: "Home" },
  { name: "car", label: "Vehicle" },
  { name: "plane", label: "Travel" },
  { name: "gift", label: "Gift" },
  { name: "graduation-cap", label: "Education" },
  { name: "circle-ellipsis", label: "Other" },
] as const;

export type accountIconName = (typeof accountIcons)[number]["name"];

export const accountColors = [
  "#245C45",
  "#4388C8",
  "#8B6CFF",
  "#D99A35",
  "#C65B50",
  "#D47C9A",
  "#64748B",
  "#8B8178",
  "#3E8B65",
  "#319A9A",
] as const;
