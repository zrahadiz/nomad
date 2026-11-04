import type { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

type SafeScreenProps = {
  children: ReactNode;
  backgroundColor?: string;
  edges?: Array<"top" | "right" | "bottom" | "left">;
};

export function SafeScreen({
  children,
  backgroundColor,
  edges,
}: SafeScreenProps) {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor,
      }}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
}
