import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, radius, shadow, spacing } from "@/constants/theme";
import type {
  MobileAccountAccessDecision,
  MobileAccountAccessStatus,
} from "@/hooks/use-account-access";

const messages: Record<
  MobileAccountAccessStatus,
  { title: string; description: string }
> = {
  checking: {
    title: "Vérification du compte",
    description: "Nous vérifions votre rattachement à la société.",
  },
  pending_approval: {
    title: "Compte en attente",
    description:
      "Votre inscription est terminée. Un administrateur doit maintenant autoriser votre accès.",
  },
  suspended: {
    title: "Compte suspendu",
    description: "Votre accès a été suspendu. Contactez un administrateur de la société.",
  },
  revoked: {
    title: "Accès révoqué",
    description: "Ce compte n’est plus autorisé à accéder à cette société.",
  },
  not_assigned: {
    title: "Aucune société associée",
    description:
      "Votre compte existe, mais il n’est pas encore rattaché à une société.",
  },
  error: {
    title: "Vérification impossible",
    description: "Vérifiez votre connexion puis réessayez dans un instant.",
  },
  active: { title: "Compte autorisé", description: "Votre accès est actif." },
  not_configured: { title: "Accès autorisé", description: "La validation n’est pas configurée." },
};

export function AccountAccessScreen({
  access,
  loading,
  onRetry,
  onSignOut,
}: {
  access: MobileAccountAccessDecision;
  loading: boolean;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  const message = messages[access.status] ?? messages.error;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.accent} />
        {access.company_logo_url ? (
          <Image source={{ uri: access.company_logo_url }} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={styles.icon}>
            <Ionicons
              name={access.status === "pending_approval" ? "time-outline" : "shield-outline"}
              size={31}
              color={colors.gold}
            />
          </View>
        )}

        {access.company_name ? <Text style={styles.company}>{access.company_name}</Text> : null}
        <Text style={styles.title}>{message.title}</Text>
        <Text style={styles.description}>{message.description}</Text>

        {access.display_name || access.email ? (
          <View style={styles.identity}>
            <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.identityText}>{access.display_name || access.email}</Text>
          </View>
        ) : null}

        <Pressable style={styles.primaryButton} onPress={onRetry} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons name="refresh-outline" size={19} color="#FFFFFF" />
          )}
          <Text style={styles.primaryButtonText}>Vérifier à nouveau</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onSignOut}>
          <Text style={styles.secondaryButtonText}>Se déconnecter</Text>
        </Pressable>

        {access.status === "pending_approval" ? (
          <Text style={styles.help}>Vérification automatique toutes les 30 secondes.</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  card: {
    width: "100%",
    maxWidth: 430,
    overflow: "hidden",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  accent: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    height: 6,
    backgroundColor: colors.primary,
  },
  icon: {
    width: 66,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  logo: {
    width: 66,
    height: 66,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
  },
  company: {
    marginTop: spacing.lg,
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    maxWidth: 350,
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  identityText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  primaryButton: {
    minWidth: 220,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  secondaryButton: {
    minHeight: 44,
    justifyContent: "center",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  secondaryButtonText: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  help: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
});
