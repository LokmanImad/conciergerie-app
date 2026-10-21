import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { NavigationBackButton } from "@/components/navigation-back-button";
import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { ErrorView, LoadingView } from "@/components/state-view";
import { StatusPill } from "@/components/status-pill";
import { colors, radius, spacing } from "@/constants/theme";
import { chargePaymentMethodLabels, paidByPersonLabels } from "@/features/charges/types";
import { getChargeDatabaseError } from "@/features/charges/validation";
import { useCharge } from "@/hooks/use-charge";
import { useSupabaseClient } from "@/lib/supabase";

const moneyFormat = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" });
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });
const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

export default function ChargeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { charge, receiptUrl, loading, error, reload } = useCharge(id);
  const [working, setWorking] = useState<"paid" | "cancel" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const firstFocus = useRef(true);

  useFocusEffect(useCallback(() => {
    if (firstFocus.current) {
      firstFocus.current = false;
      return;
    }
    void reload();
  }, [reload]));

  const markAsPaid = async () => {
    if (!charge) return;
    setWorking("paid");
    setActionError(null);
    const { error: updateError } = await supabase.rpc("mark_charge_as_paid", { charge_id: charge.id });
    setWorking(null);
    if (updateError) {
      setActionError(getChargeDatabaseError(updateError));
      return;
    }
    await reload();
  };

  const cancelCharge = async () => {
    if (!charge) return;
    setWorking("cancel");
    setActionError(null);
    const { error: cancelError } = await supabase.rpc("cancel_charge", { p_charge_id: charge.id, p_reason: null });
    setWorking(null);
    if (cancelError) {
      setActionError(getChargeDatabaseError(cancelError));
      return;
    }
    await reload();
  };

  const confirmPaid = () => Alert.alert(
    "Marquer comme payée ?",
    "Cette charge sera comptabilisée comme réglée.",
    [{ text: "Retour", style: "cancel" }, { text: "Confirmer", onPress: () => void markAsPaid() }],
  );

  const confirmCancellation = () => Alert.alert(
    "Annuler cette charge ?",
    "La charge restera dans l’historique, mais elle ne sera plus incluse dans les totaux comptables.",
    [{ text: "Retour", style: "cancel" }, { text: "Annuler la charge", style: "destructive", onPress: () => void cancelCharge() }],
  );

  return (
    <>
      <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} tintColor={colors.primary} />}>
        <PageHeading
          eyebrow="DÉTAIL DE LA CHARGE"
          title={charge?.service_type?.name ?? "Charge"}
          description={charge?.apartment?.name ?? "Dépense de la société"}
          action={<NavigationBackButton onPress={() => router.back()} />}
        />
        {loading && !charge ? <LoadingView /> : null}
        {!loading && error ? <ErrorView message={error} retry={() => void reload()} /> : null}
        {charge ? (
          <>
            <View style={[styles.hero, charge.cancelled_at && styles.heroCancelled]}>
              <View style={styles.heroTop}>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroLabel}>MONTANT</Text>
                  <Text style={[styles.heroAmount, charge.cancelled_at && styles.amountCancelled]}>{moneyFormat.format(charge.amount)}</Text>
                </View>
                {charge.cancelled_at ? <StatusPill label="Annulée" tone="danger" /> : charge.is_paid ? <StatusPill label="Payée" tone="success" /> : <StatusPill label="À payer" tone="warning" />}
              </View>
              <View style={styles.heroMeta}>
                <Ionicons name="calendar-outline" size={16} color={colors.gold} />
                <Text style={styles.heroMetaText}>{dateFormat.format(new Date(`${charge.date}T12:00:00`))}</Text>
              </View>
            </View>

            {actionError ? <View style={styles.errorBanner}><Ionicons name="alert-circle-outline" size={19} color={colors.danger} /><Text style={styles.errorText}>{actionError}</Text></View> : null}
            {charge.cancelled_at ? (
              <View style={styles.cancelledBanner}>
                <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
                <View style={styles.bannerCopy}>
                  <Text style={styles.cancelledTitle}>Charge annulée</Text>
                  <Text style={styles.cancelledText}>{dateTimeFormat.format(new Date(charge.cancelled_at))}{charge.cancellation_reason ? ` · ${charge.cancellation_reason}` : ""}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Informations</Text>
              <DetailRow icon="business-outline" label="Appartement" value={charge.apartment?.name ?? "Charge société"} />
              <DetailRow icon="storefront-outline" label="Fournisseur" value={charge.supplier ?? "Non renseigné"} />
              <DetailRow icon="person-outline" label="Payé par" value={paidByPersonLabels[charge.paid_by_person]} />
              <DetailRow icon={charge.payment_method === "cash" ? "cash-outline" : "card-outline"} label="Mode de paiement" value={chargePaymentMethodLabels[charge.payment_method]} />
              <DetailRow icon="people-outline" label="À la charge de" value={charge.service_type?.paid_by === "owner" ? "Propriétaire" : "Société"} />
              <DetailRow icon="document-text-outline" label="Facture propriétaire" value={charge.billable_to_owner ? "Oui — sera déduite" : "Non — charge interne"} last />
            </View>

            {charge.reservation ? (
              <View style={styles.reservationCard}>
                <Ionicons name="calendar-number-outline" size={21} color={colors.primary} />
                <View style={styles.bannerCopy}>
                  <Text style={styles.reservationTitle}>{charge.reservation.reference}</Text>
                  <Text style={styles.reservationText}>{charge.reservation.client_name} · arrivée {dateFormat.format(new Date(`${charge.reservation.check_in}T12:00:00`))}</Text>
                </View>
              </View>
            ) : null}

            {receiptUrl ? (
              <View style={styles.card}>
                <View style={styles.receiptHeading}>
                  <View>
                    <Text style={styles.cardTitle}>Justificatif</Text>
                    <Text style={styles.receiptHint}>Photo privée visible uniquement par les administrateurs.</Text>
                  </View>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                </View>
                <TouchableOpacity activeOpacity={0.85} onPress={() => setPreviewOpen(true)}>
                  <Image source={{ uri: receiptUrl }} contentFit="contain" style={styles.receiptImage} />
                  <Text style={styles.zoomText}>Appuyer pour agrandir</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noReceipt}><Ionicons name="image-outline" size={23} color={colors.textMuted} /><Text style={styles.noReceiptText}>Aucun justificatif</Text></View>
            )}

            {charge.description || charge.notes ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Détails</Text>
                {charge.description ? <Text style={styles.description}>{charge.description}</Text> : null}
                {charge.notes ? <Text style={styles.notes}>{charge.notes}</Text> : null}
              </View>
            ) : null}

            {!charge.cancelled_at ? (
              <>
                <TouchableOpacity activeOpacity={0.82} onPress={() => router.push(`/charges/${charge.id}/edit` as Href)} style={styles.editButton}>
                  <Ionicons name="create-outline" size={20} color="white" />
                  <Text style={styles.editText}>Modifier la charge</Text>
                </TouchableOpacity>
                {!charge.is_paid ? (
                  <TouchableOpacity disabled={Boolean(working)} activeOpacity={0.82} onPress={confirmPaid} style={styles.paidButton}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                    <Text style={styles.paidText}>{working === "paid" ? "Enregistrement…" : "Marquer comme payée"}</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity disabled={Boolean(working)} activeOpacity={0.82} onPress={confirmCancellation} style={styles.cancelButton}>
                  <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
                  <Text style={styles.cancelText}>{working === "cancel" ? "Annulation…" : "Annuler la charge"}</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </>
        ) : null}
      </Screen>

      <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Justificatif de charge</Text>
            <TouchableOpacity onPress={() => setPreviewOpen(false)} style={styles.closeButton}><Ionicons name="close" size={24} color="white" /></TouchableOpacity>
          </View>
          {receiptUrl ? <Image source={{ uri: receiptUrl }} contentFit="contain" style={styles.fullImage} /> : null}
        </View>
      </Modal>
    </>
  );
}

function DetailRow({ icon, label, value, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, last && styles.noBorder]}>
      <View style={styles.detailIcon}><Ionicons name={icon} size={18} color={colors.primary} /></View>
      <View style={styles.detailCopy}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.md },
  heroCancelled: { backgroundColor: "#5D3D3D" },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  heroCopy: { flex: 1 },
  heroLabel: { color: colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  heroAmount: { color: "white", fontSize: 31, fontWeight: "900", marginTop: 4 },
  amountCancelled: { textDecorationLine: "line-through" },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.13)" },
  heroMetaText: { color: "rgba(255,255,255,0.75)", fontSize: 12, textTransform: "capitalize" },
  errorBanner: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, backgroundColor: colors.dangerSoft, borderRadius: radius.md, marginBottom: spacing.md },
  errorText: { flex: 1, color: colors.danger, fontSize: 12, lineHeight: 18 },
  cancelledBanner: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, padding: spacing.md, backgroundColor: colors.dangerSoft, borderRadius: radius.md, marginBottom: spacing.md },
  bannerCopy: { flex: 1 },
  cancelledTitle: { color: colors.danger, fontSize: 13, fontWeight: "800" },
  cancelledText: { color: colors.danger, fontSize: 11, marginTop: 3 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: spacing.sm },
  detailRow: { minHeight: 61, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border },
  noBorder: { borderBottomWidth: 0 },
  detailIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  detailCopy: { flex: 1 },
  detailLabel: { color: colors.textMuted, fontSize: 10 },
  detailValue: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 3 },
  reservationCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.primarySoft, borderRadius: radius.lg, marginBottom: spacing.md },
  reservationTitle: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  reservationText: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  receiptHeading: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  receiptHint: { color: colors.textMuted, fontSize: 10, marginTop: -4, marginBottom: spacing.md },
  receiptImage: { width: "100%", height: 250, borderRadius: radius.md, backgroundColor: colors.background },
  zoomText: { color: colors.primary, fontSize: 10, fontWeight: "700", textAlign: "center", marginTop: spacing.sm },
  noReceipt: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 70, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, marginBottom: spacing.md },
  noReceiptText: { color: colors.textMuted, fontSize: 12 },
  description: { color: colors.text, fontSize: 13, lineHeight: 20 },
  notes: { color: colors.textMuted, fontSize: 12, fontStyle: "italic", lineHeight: 18, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  editButton: { minHeight: 54, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  editText: { color: "white", fontSize: 14, fontWeight: "800" },
  paidButton: { minHeight: 51, borderRadius: radius.md, backgroundColor: colors.successSoft, borderWidth: 1, borderColor: "#C8E6D5", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.sm },
  paidText: { color: colors.success, fontSize: 13, fontWeight: "800" },
  cancelButton: { minHeight: 51, borderRadius: radius.md, backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: "#EECACA", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.sm },
  cancelText: { color: colors.danger, fontSize: 13, fontWeight: "800" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.94)", paddingTop: 55, paddingBottom: 30 },
  modalHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  modalTitle: { flex: 1, color: "white", fontSize: 16, fontWeight: "800" },
  closeButton: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)" },
  fullImage: { flex: 1, width: "100%" },
});
