import type { PropsWithChildren, ReactElement } from "react";
import { ScrollView, StyleSheet, View, type RefreshControlProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/constants/theme";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
}>;

export function Screen({ children, scroll = true, refreshControl }: ScreenProps) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.xl },
  scrollContent: { padding: spacing.xl, paddingBottom: 120 },
});
