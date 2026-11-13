// constants/theme.ts
// Additive update: every existing key is kept, so other screens won't break.

import "@/global.css";

import { Platform } from "react-native";

export const colors = {
  primary: "#245C45",
  primaryDark: "#194733",
  primaryLight: "#DCE8DD",

  background: "#F8F7F2",
  surface: "#FFFFFF",

  text: "#202824",
  textSecondary: "#7A817C",
  border: "#E8E9E3",

  success: "#3E8B65",
  warning: "#D99A35",
  danger: "#C65B50",

  // NEW: replaces hard-coded hex values scattered across screens
  textOnPrimary: "#FFFFFF",
  textOnPrimaryMuted: "#DCE8DD",
  onPrimarySubtle: "rgba(255,255,255,0.14)",
  successLight: "#E4F1EA",
  warningLight: "#FFF5E5",
  dangerLight: "#FCEDEA",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const typography = {
  size: {
    xs: 11,
    caption: 12, // NEW: matches the "Secondary text 12px" in the spec
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 28,
    xxxl: 32,
  },
  weight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
};

// NEW: one subtle, warm elevation for cards (use sparingly)
export const shadow = {
  card: {
    shadowColor: "#202824",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});
