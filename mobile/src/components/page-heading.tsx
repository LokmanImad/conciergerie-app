import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/constants/theme";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  copy: { flex: 1 },
  eyebrow: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
    marginBottom: spacing.xs,
  },
  title: { color: colors.text, fontSize: 29, fontWeight: "800", letterSpacing: -0.6 },
  description: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
});
