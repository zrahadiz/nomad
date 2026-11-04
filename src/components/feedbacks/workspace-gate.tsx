import { useRouter } from "expo-router";
import {
  AlertCircle,
  BriefcaseBusiness,
  Plus,
  RefreshCw,
} from "lucide-react-native";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

type WorkspaceGateProps = {
  children: ReactNode;
};

export function WorkspaceGate({ children }: WorkspaceGateProps) {
  const router = useRouter();

  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const loading = useWorkspaceStore((state) => state.loading);
  const initialized = useWorkspaceStore((state) => state.initialized);
  const error = useWorkspaceStore((state) => state.error);
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces);
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );

  if (loading || !initialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading workspaces...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.errorIconContainer}>
          <AlertCircle size={36} color={colors.danger} />
        </View>

        <Text style={styles.title}>Unable to load workspaces</Text>

        <Text style={styles.description}>
          Something went wrong while loading your workspaces. Please check your
          connection and try again.
        </Text>

        <Pressable
          style={styles.createButton}
          accessibilityRole="button"
          accessibilityLabel="Retry loading workspaces"
          onPress={fetchWorkspaces}
        >
          <RefreshCw size={18} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (workspaces.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.iconContainer}>
          <BriefcaseBusiness size={36} color={colors.primary} />
        </View>

        <Text style={styles.title}>Create your first workspace</Text>

        <Text style={styles.description}>
          Before you can manage your finances, you need to create a workspace.
          Choose a name and country to get started.
        </Text>

        <Pressable
          style={styles.createButton}
          accessibilityRole="button"
          accessibilityLabel="Create your first workspace"
          onPress={() => router.push("/workspaces/new")}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create workspace</Text>
        </Pressable>
      </View>
    );
  }

  if (!workspaces.some((item) => item.id === activeWorkspaceId)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Preparing your workspace...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: "#FCE8E6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    textAlign: "center",
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    lineHeight: 22,
    textAlign: "center",
    marginTop: spacing.sm,
    maxWidth: 300,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
    borderRadius: radius.lg,
    marginTop: spacing.xl,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
});
