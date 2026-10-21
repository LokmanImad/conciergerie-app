import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { ErrorView, LoadingView } from "@/components/state-view";
import { StatusPill } from "@/components/status-pill";
import { ReservationTravelerCard } from "@/components/travelers/reservation-traveler-card";
import { colors, radius, spacing } from "@/constants/theme";
import {
  bookingStatusLabels,
  paymentMethodLabels,
  reservationSourceLabels,
  type BookingStatus,
} from "@/features/reservations/types";
import { getReservationDatabaseError } from "@/features/reservations/validation";
import { useReservation } from "@/hooks/use-reservation";
import { useSupabaseClient } from "@/lib/supabase";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });
const moneyFormat = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", minimumFractionDigits: 0 });

function statusTone(status: BookingStatus) {
  if (status === "completed") return "success" as const;
  if (status === "cancelled") return "danger" as const;
  if (status === "option") return "warning" as const;
  return "primary" as const;
}

export default function ReservationDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { reservation, loading, error, reload } = useReservation(params.id);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const firstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void reload();
    }, [reload]),
  );

  const confirmCancellation = () => {
    if (!reservation) return;
    Alert.alert(
      "Annuler la réservation",
      `Confirmez-vous l’annulation de ${reservation.reference} ? Les données resteront conservées.`,
      [
        { text: "Retour", style: "cancel" },
        {
          text: "Annuler la réservation",
          style: "destructive",
          onPress: () => void cancelReservation(),
        },
      ],
    );
  };

  const cancelReservation = async () => {
    if (!reservation) return;
    setCancelling(true);
    setActionError(null);
    const { error: updateError } = await supabase
      .from("reservations")
      .update({ booking_status: "cancelled" })
      .eq("id", reservation.id);
    setCancelling(false);

    if (updateError) {
      setActionError(getReservationDatabaseError(updateError));
      return;
    }
    await reload();
  };

  return (
    <Screen>
      <PageHeading
        eyebrow="DÉTAIL DU SÉJOUR"
        title={reservation?.reference ?? "Réservation"}
        description={reservation?.apartment?.name ?? "Informations de la réservation"}
        action={
          <TouchableOpacity accessibilityLabel="Retour" onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      {loading ? <LoadingView /> : null}
      {!loading && error ? <ErrorView message={error} retry={() => void reload()} /> : null}
      {!loading && !error && reservation ? (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.clientCopy}>
                <Text style={styles.clientName}>{reservation.client_name}</Text>
                <Text style={styles.phone}>{reservation.client_number || "Téléphone non renseigné"}</Text>
              </View>
              <StatusPill label={bookingStatusLabels[reservation.booking_status]} tone={statusTone(reservation.booking_status)} />
            </View>
            <View style={styles.stayRow}>
              <DateBlock label="ARRIVÉE" date={reservation.check_in} time={reservation.check_in_time} />
              <Ionicons name="arrow-forward" size={20} color={colors.gold} />
              <DateBlock label="DÉPART" date={reservation.check_out} time={reservation.check_out_time} alignRight />
            </View>
          </View>

          {actionError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={19} color={colors.danger} />
              <Text style={styles.errorText}>{actionError}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Séjour</Text>
            <DetailRow icon="people-outline" label="Voyageurs" value={`${reservation.adults} adulte${reservation.adults > 1 ? "s" : ""} · ${reservation.children} enfant${reservation.children > 1 ? "s" : ""}`} />
            <DetailRow icon="navigate-outline" label="Source" value={reservationSourceLabels[reservation.source]} />
            <DetailRow icon="card-outline" label="Paiement" value={paymentMethodLabels[reservation.payment_method]} last />
          </View>

          <ReservationTravelerCard
            reservationId={reservation.id}
            reference={reservation.reference}
            principalGuest={reservation.client_name}
            checkOut={reservation.check_out}
            expectedAdults={reservation.adults}
          />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Situation financière</Text>
            <MoneyRow label="Montant total" value={moneyFormat.format(reservation.total_amount)} />
            <MoneyRow label="Déjà payé" value={moneyFormat.format(reservation.amount_paid)} />
            <MoneyRow label="Reste à payer" value={moneyFormat.format(reservation.balance_due)} highlight last />
          </View>

          {reservation.notes ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Notes internes</Text>
              <Text style={styles.notes}>{reservation.notes}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => router.push(`/reservations/${reservation.id}/edit` as Href)}
            style={styles.editButton}
          >
            <Ionicons name="create-outline" size={20} color="white" />
            <Text style={styles.editButtonText}>Modifier la réservation</Text>
          </TouchableOpacity>

          {reservation.booking_status !== "cancelled" && reservation.booking_status !== "completed" ? (
            <TouchableOpacity disabled={cancelling} onPress={confirmCancellation} style={styles.cancelButton} activeOpacity={0.8}>
              <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
              <Text style={styles.cancelButtonText}>{cancelling ? "Annulation…" : "Annuler la réservation"}</Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function DateBlock({ label, date, time, alignRight }: { label: string; date: string; time: string; alignRight?: boolean }) {
  return (
    <View style={[styles.dateBlock, alignRight && styles.alignRight]}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Text style={styles.dateValue}>{dateFormat.format(new Date(`${date}T12:00:00`))}</Text>
      <Text style={styles.timeValue}>{time.slice(0, 5)}</Text>
    </View>
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

function MoneyRow({ label, value, highlight, last }: { label: string; value: string; highlight?: boolean; last?: boolean }) {
  return (
    <View style={[styles.moneyRow, last && styles.noBorder]}>
      <Text style={styles.moneyLabel}>{label}</Text>
      <Text style={[styles.moneyValue, highlight && styles.moneyHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  heroCard: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg },
  heroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  clientCopy: { flex: 1 },
  clientName: { color: "white", fontSize: 23, fontWeight: "800" },
  phone: { color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 5 },
  stayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xxl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.13)" },
  dateBlock: { flex: 1 },
  alignRight: { alignItems: "flex-end" },
  dateLabel: { color: colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  dateValue: { color: "white", fontSize: 13, fontWeight: "700", marginTop: 5, textTransform: "capitalize" },
  timeValue: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 3 },
  errorBanner: { flexDirection: "row", gap: spacing.sm, backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  errorText: { flex: 1, color: colors.danger, fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: spacing.sm },
  detailRow: { minHeight: 62, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border },
  detailIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  detailCopy: { flex: 1 },
  detailLabel: { color: colors.textMuted, fontSize: 11 },
  detailValue: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 2 },
  noBorder: { borderBottomWidth: 0 },
  moneyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.border },
  moneyLabel: { color: colors.textMuted, fontSize: 13 },
  moneyValue: { color: colors.text, fontSize: 14, fontWeight: "800" },
  moneyHighlight: { color: colors.warning, fontSize: 17 },
  notes: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  editButton: { minHeight: 55, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.sm },
  editButtonText: { color: "white", fontSize: 15, fontWeight: "800" },
  cancelButton: { minHeight: 53, borderRadius: radius.md, backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: "#EECACA", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.md },
  cancelButtonText: { color: colors.danger, fontSize: 14, fontWeight: "800" },
});
