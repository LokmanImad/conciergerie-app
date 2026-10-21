import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors, radius, spacing } from "@/constants/theme";

export function LoadingView() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.muted}>Chargement des données…</Text>
    </View>
  );
}

export function EmptyView({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Ionicons name="file-tray-outline" size={24} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.muted}>{message}</Text>
    </View>
  );
}

export function ErrorView({ message, retry }: { message: string; retry: () => void }) {
  return (
    <View style={styles.card}>
      <View style={[styles.icon, styles.errorIcon]}>
        <Ionicons name="alert-circle-outline" size={24} color={colors.danger} />
      </View>
      <Text style={styles.title}>Impossible de charger</Text>
      <Text style={styles.muted}>{message}</Text>
      <TouchableOpacity onPress={retry} style={styles.button} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: spacing.md },
  card: {
    minHeight: 220,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  errorIcon: { backgroundColor: colors.dangerSoft },
  title: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: spacing.sm },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: "center" },
  button: {
    marginTop: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  buttonText: { color: "white", fontWeight: "800" },
});
