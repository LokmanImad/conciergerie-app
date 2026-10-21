import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/constants/theme";
import type { MobileDeviceStatus } from "@/hooks/use-device-access";

const messages: Record<MobileDeviceStatus, { title: string; description: string }> = {
  checking: { title: "Vérification de l’appareil", description: "Vérification de votre autorisation en cours." },
  pending: { title: "Appareil en attente", description: "Un administrateur doit approuver ce téléphone dans le centre de contrôle." },
  suspended: { title: "Appareil suspendu", description: "L’accès de ce téléphone a été suspendu." },
  revoked: { title: "Autorisation révoquée", description: "Ce téléphone n’est plus autorisé pour cette société." },
  expired: { title: "Autorisation expirée", description: "Demandez à un administrateur de renouveler cet accès." },
  certificate_required: { title: "Certificat obligatoire", description: "Cette société exige une protection d’entreprise supplémentaire." },
  limit_reached: { title: "Limite atteinte", description: "Le nombre maximal d’appareils autorisés a été atteint." },
  user_mismatch: { title: "Autre compte détecté", description: "Cet appareil est déjà associé à un autre utilisateur." },
  error: { title: "Vérification impossible", description: "Vérifiez votre connexion puis réessayez." },
  approved: { title: "Appareil approuvé", description: "Accès autorisé." },
  not_required: { title: "Accès autorisé", description: "Aucune approbation n’est nécessaire." },
};

export function DeviceAccessScreen({
  status,
  deviceId,
  loading,
  onRetry,
  onSignOut,
}: {
  status: MobileDeviceStatus;
  deviceId: string | null;
  loading: boolean;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  const message = messages[status] ?? messages.error;
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Ionicons name={status === "pending" ? "phone-portrait-outline" : "shield-outline"} size={30} color={colors.gold} />
      </View>
      <Text style={styles.title}>{message.title}</Text>
      <Text style={styles.description}>{message.description}</Text>
      {deviceId ? <Text style={styles.reference}>Référence : {deviceId.slice(0, 8)}</Text> : null}
      <Pressable style={styles.primaryButton} onPress={onRetry} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="refresh-outline" size={19} color="#FFFFFF" />}
        <Text style={styles.primaryButtonText}>Vérifier à nouveau</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={onSignOut}>
        <Text style={styles.secondaryButtonText}>Se déconnecter</Text>
      </Pressable>
      {status === "pending" ? <Text style={styles.help}>Vérification automatique toutes les 30 secondes.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    marginBottom: spacing.lg,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", textAlign: "center" },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 23, textAlign: "center", marginTop: spacing.sm, maxWidth: 360 },
  reference: { color: colors.textMuted, fontSize: 12, marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md },
  primaryButton: { marginTop: spacing.xl, minHeight: 48, minWidth: 220, borderRadius: radius.lg, backgroundColor: colors.primary, flexDirection: "row", gap: spacing.sm, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  secondaryButton: { marginTop: spacing.sm, minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.lg },
  secondaryButtonText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  help: { color: colors.textMuted, fontSize: 12, marginTop: spacing.lg, textAlign: "center" },
});
