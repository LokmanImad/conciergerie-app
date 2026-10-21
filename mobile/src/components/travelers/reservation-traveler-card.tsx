import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { StatusPill } from "@/components/status-pill";
import { colors, radius, spacing } from "@/constants/theme";
import { createTravelerRegistrationLink } from "@/features/travelers/traveler-link";
import { registrationStatusLabels, type RegistrationStatus } from "@/features/travelers/types";
import { useReservationTravelers } from "@/hooks/use-reservation-travelers";
import { useSupabaseClient } from "@/lib/supabase";

const expiryFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function statusTone(status: RegistrationStatus) {
  if (status === "verified") return "success" as const;
  if (status === "submitted") return "warning" as const;
  if (status === "rejected") return "danger" as const;
  return "primary" as const;
}

export function ReservationTravelerCard({
  reservationId,
  reference,
  principalGuest,
  checkOut,
  expectedAdults,
}: {
  reservationId: string;
  reference: string;
  principalGuest: string;
  checkOut: string;
  expectedAdults: number;
}) {
  const supabase = useSupabaseClient();
  const { registration, loading, error: loadError, reload } = useReservationTravelers(reservationId);
  const [link, setLink] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  const isClosed = registration?.status === "submitted" || registration?.status === "verified";
  const registeredAdults = registration?.registered_adults ?? 0;
  const adultTotal = registration?.expected_adults ?? expectedAdults;

  const generate = async () => {
    setCreating(true);
    setActionError(null);
    try {
      const result = await createTravelerRegistrationLink({
        reservationId,
        checkOut,
        createRegistration: async (parameters) => {
          const { error } = await supabase.rpc("create_traveler_registration_link", parameters);
          return { error: error ? { message: error.message } : null };
        },
      });
      setLink(result.url);
      setExpiresAt(result.expiresAt);
      await reload();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Impossible de créer le lien.");
    } finally {
      setCreating(false);
    }
  };

  const requestGeneration = () => {
    if (!registration) {
      void generate();
      return;
    }

    Alert.alert(
      "Remplacer le lien ?",
      "Le lien précédent sera immédiatement désactivé. Le voyageur devra utiliser le nouveau lien.",
      [
        { text: "Retour", style: "cancel" },
        { text: "Remplacer", onPress: () => void generate() },
      ],
    );
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(link);
    setCopied(true);
  };

  const shareLink = async () => {
    const message = `Bonjour ${principalGuest}, merci de compléter les informations de tous les adultes pour la réservation ${reference} : ${link}`;
    await Share.share({ title: `Voyageurs — ${reference}`, message, url: link });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="id-card-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Voyageurs et fiche de police</Text>
          <Text style={styles.subtitle}>Le voyageur principal renseigne tous les adultes.</Text>
        </View>
        {registration ? (
          <StatusPill label={registrationStatusLabels[registration.status]} tone={statusTone(registration.status)} />
        ) : null}
      </View>

      <View style={styles.progressBox}>
        <View>
          <Text style={styles.progressLabel}>ADULTES ENREGISTRÉS</Text>
          <Text style={styles.progressValue}>{registeredAdults}/{adultTotal}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${adultTotal > 0 ? Math.min((registeredAdults / adultTotal) * 100, 100) : 0}%` },
            ]}
          />
        </View>
      </View>

      {loading ? <Text style={styles.helper}>Chargement du dossier voyageurs…</Text> : null}
      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

      {isClosed ? (
        <View style={styles.infoBox}>
          <Ionicons name="checkmark-circle-outline" size={19} color={colors.success} />
          <Text style={styles.infoText}>
            Le formulaire a été transmis. Retrouvez son contrôle dans le module Voyageurs.
          </Text>
        </View>
      ) : link ? (
        <View style={styles.linkArea}>
          <Text selectable numberOfLines={2} style={styles.linkText}>{link}</Text>
          <Text style={styles.expiry}>Valable jusqu’au {expiryFormat.format(new Date(expiresAt))}</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => void copyLink()} style={styles.secondaryButton}>
              <Ionicons name={copied ? "checkmark" : "copy-outline"} size={19} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>{copied ? "Copié" : "Copier"}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.82} onPress={() => void shareLink()} style={styles.primaryButton}>
              <Ionicons name="share-social-outline" size={19} color="white" />
              <Text style={styles.primaryButtonText}>Partager</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.securityNote}>Conservez ou partagez ce lien avant de quitter cet écran.</Text>
        </View>
      ) : (
        <>
          {registration ? (
            <Text style={styles.helper}>
              Pour des raisons de sécurité, le lien existant n’est pas réaffiché. Vous pouvez le remplacer.
            </Text>
          ) : null}
          <TouchableOpacity
            activeOpacity={0.82}
            disabled={creating || loading || Boolean(loadError)}
            onPress={requestGeneration}
            style={[styles.generateButton, (creating || loading || Boolean(loadError)) && styles.disabledButton]}
          >
            <Ionicons name={registration ? "refresh" : "link-outline"} size={20} color="white" />
            <Text style={styles.primaryButtonText}>
              {creating ? "Création…" : registration ? "Créer un nouveau lien" : "Créer le lien voyageurs"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  headerIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 16, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  progressBox: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background },
  progressLabel: { color: colors.textMuted, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  progressValue: { color: colors.primary, fontSize: 24, fontWeight: "900", marginTop: 2 },
  progressTrack: { height: 7, borderRadius: radius.pill, backgroundColor: colors.border, overflow: "hidden", marginTop: spacing.sm },
  progressFill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.gold },
  helper: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.successSoft, marginTop: spacing.md },
  infoText: { flex: 1, color: colors.success, fontSize: 12, lineHeight: 18 },
  linkArea: { marginTop: spacing.md },
  linkText: { color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: radius.sm, padding: spacing.md, fontSize: 12, lineHeight: 17 },
  expiry: { color: colors.textMuted, fontSize: 11, marginTop: spacing.sm },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  secondaryButton: { flex: 1, minHeight: 49, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  secondaryButtonText: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  primaryButton: { flex: 1, minHeight: 49, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  primaryButtonText: { color: "white", fontSize: 14, fontWeight: "800" },
  securityNote: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: spacing.sm },
  generateButton: { minHeight: 52, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.md },
  disabledButton: { opacity: 0.55 },
});
