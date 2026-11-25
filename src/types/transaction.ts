import type { ReactNode } from "react";

export type TransactionSheetOption = {
  id: string;
  label: string;
  description?: string;
  leading?: ReactNode;
};

export type TransactionSegmentOption<T extends string> = {
  label: string;
  value: T;
  icon?: import("lucide-react-native").LucideIcon;
  color?: string;
  background?: string;
};
