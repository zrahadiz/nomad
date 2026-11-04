import type { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

type SafeScreenProps = {
  children: ReactNode;
  backgroundColor?: string;
};

export function SafeScreen({ children, backgroundColor }: SafeScreenProps) {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor,
      }}
      edges={["top", "bottom"]}
    >
      {children}
    </SafeAreaView>
  );
}
