import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, spacing } from "@/constants/theme";

export function ConfigurationRequired({ variables }: { variables: string[] }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.icon}>
          <Ionicons name="settings-outline" size={28} color={colors.gold} />
        </View>
        <Text style={styles.eyebrow}>CONFIGURATION MOBILE</Text>
        <Text style={styles.title}>Connexion à préparer</Text>
        <Text style={styles.description}>
          Ajoutez les variables publiques suivantes dans le fichier mobile/.env.local,
          puis redémarrez Expo.
        </Text>
        <View style={styles.codeBox}>
          {variables.map((variable) => (
            <Text key={variable} style={styles.code}>
              {variable}=...
            </Text>
          ))}
        </View>
        <Text style={styles.note}>
          N’ajoutez jamais CLERK_SECRET_KEY ou SUPABASE_SECRET_KEY dans l’application mobile.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: "center", padding: spacing.xxl },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    marginBottom: spacing.xl,
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: spacing.sm,
  },
  title: { color: colors.text, fontSize: 30, fontWeight: "800", marginBottom: spacing.md },
  description: { color: colors.textMuted, fontSize: 16, lineHeight: 24 },
  codeBox: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  code: { color: "#E9F3F0", fontSize: 12, fontFamily: "monospace" },
  note: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: spacing.lg },
});
