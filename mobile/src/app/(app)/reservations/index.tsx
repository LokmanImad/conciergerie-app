import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useRef } from "react";
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { EmptyView, ErrorView, LoadingView } from "@/components/state-view";
import { StatusPill } from "@/components/status-pill";
import { colors, radius, spacing } from "@/constants/theme";
import { bookingStatusLabels, type BookingStatus, type Reservation } from "@/features/reservations/types";
import { useReservations } from "@/hooks/use-reservations";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" });
const moneyFormat = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", maximumFractionDigits: 0 });

function statusTone(status: BookingStatus) {
  if (status === "completed") return "success" as const;
  if (status === "cancelled") return "danger" as const;
  if (status === "option") return "warning" as const;
  return "primary" as const;
}

export default function ReservationsScreen() {
  const router = useRouter();
  const { reservations, loading, refreshing, error, reload } = useReservations();
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

  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void reload(true)} tintColor={colors.primary} />}
    >
      <PageHeading
        eyebrow="OPÉRATIONS"
        title="Réservations"
        description="Créez et gérez les séjours depuis votre téléphone."
        action={
          <TouchableOpacity accessibilityLabel="Nouvelle réservation" onPress={() => router.push("/reservations/new")} style={styles.addButton}>
            <Ionicons name="add" size={25} color="white" />
          </TouchableOpacity>
        }
      />
      {loading ? <LoadingView /> : null}
      {!loading && error ? <ErrorView message={error} retry={() => void reload()} /> : null}
      {!loading && !error && reservations.length === 0 ? (
        <EmptyView title="Aucune réservation" message="Appuyez sur + pour enregistrer votre premier séjour." />
      ) : null}
      {!loading && !error
        ? reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onPress={() => router.push(`/reservations/${reservation.id}` as Href)}
            />
          ))
        : null}
    </Screen>
  );
}

function ReservationCard({ reservation, onPress }: { reservation: Reservation; onPress: () => void }) {
  const start = dateFormat.format(new Date(`${reservation.check_in}T12:00:00`));
  const end = dateFormat.format(new Date(`${reservation.check_out}T12:00:00`));

  return (
    <TouchableOpacity activeOpacity={0.78} onPress={onPress} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.referenceWrap}>
          <Text style={styles.reference}>{reservation.reference}</Text>
          <Text style={styles.apartment}>{reservation.apartment?.name ?? "Appartement"}</Text>
        </View>
        <StatusPill label={bookingStatusLabels[reservation.booking_status]} tone={statusTone(reservation.booking_status)} />
      </View>
      <Text style={styles.client}>{reservation.client_name}</Text>
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>{start} — {end}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="people-outline" size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>{reservation.adults} ad. · {reservation.children} enf.</Text>
        </View>
      </View>
      <View style={styles.amountRow}>
        <View>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amount}>{moneyFormat.format(reservation.total_amount)}</Text>
        </View>
        <View style={styles.alignRight}>
          <Text style={styles.amountLabel}>Reste</Text>
          <Text style={[styles.amount, reservation.balance_due > 0 && styles.balance]}>{moneyFormat.format(reservation.balance_due)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  addButton: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  referenceWrap: { flex: 1 },
  reference: { color: colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },
  apartment: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  client: { color: colors.text, fontSize: 19, fontWeight: "800", marginTop: spacing.lg },
  infoRow: { gap: spacing.sm, marginTop: spacing.md },
  infoItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  infoText: { color: colors.textMuted, fontSize: 13 },
  amountRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.lg, paddingTop: spacing.md },
  amountLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  amount: { color: colors.text, fontSize: 15, fontWeight: "800", marginTop: 3 },
  balance: { color: colors.warning },
  alignRight: { alignItems: "flex-end", marginLeft: "auto", marginRight: spacing.md },
});
