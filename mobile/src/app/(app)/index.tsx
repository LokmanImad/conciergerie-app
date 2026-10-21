import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { LoadingView } from "@/components/state-view";
import { colors, radius, shadow, spacing } from "@/constants/theme";
import { useReservations } from "@/hooks/use-reservations";

const money = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", maximumFractionDigits: 0 });

export default function DashboardScreen() {
  const router = useRouter();
  const { reservations, loading } = useReservations();
  const today = new Date().toISOString().slice(0, 10);
  const active = reservations.filter(
    (reservation) => reservation.check_in <= today && reservation.check_out > today && reservation.booking_status !== "cancelled",
  );
  const upcoming = reservations.filter(
    (reservation) => reservation.check_in > today && reservation.booking_status !== "cancelled",
  );
  const balance = reservations.reduce((sum, reservation) => sum + Number(reservation.balance_due || 0), 0);

  return (
    <Screen>
      <PageHeading
        eyebrow="VUE GÉNÉRALE"
        title="Bonjour"
        description="L’essentiel de votre activité, en un coup d’œil."
        action={
          <View style={styles.brandIcon}>
            <Ionicons name="sparkles" size={22} color={colors.gold} />
          </View>
        }
      />

      {loading ? (
        <LoadingView />
      ) : (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel}>À ENCAISSER</Text>
              <Ionicons name="wallet-outline" size={22} color={colors.gold} />
            </View>
            <Text style={styles.heroValue}>{money.format(balance)}</Text>
            <Text style={styles.heroHint}>Solde restant sur les réservations enregistrées</Text>
          </View>

          <View style={styles.statsGrid}>
            <Metric icon="bed-outline" label="Séjours en cours" value={String(active.length)} />
            <Metric icon="calendar-outline" label="À venir" value={String(upcoming.length)} />
            <Metric icon="people-outline" label="Adultes attendus" value={String(upcoming.reduce((sum, item) => sum + item.adults, 0))} />
            <Metric icon="receipt-outline" label="Réservations" value={String(reservations.length)} />
          </View>

          <TouchableOpacity activeOpacity={0.82} onPress={() => router.push("/contracts" as Href)} style={styles.contractShortcut}>
            <View style={styles.contractShortcutIcon}><Ionicons name="document-text-outline" size={22} color={colors.primary} /></View>
            <View style={styles.contractShortcutCopy}><Text style={styles.contractShortcutTitle}>Contrats propriétaires</Text><Text style={styles.contractShortcutText}>Consulter et scanner les contrats signés</Text></View>
            <Ionicons name="chevron-forward" size={20} color={colors.gold} />
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Prochaines arrivées</Text>
          <View style={styles.listCard}>
            {upcoming.slice(0, 3).map((reservation, index) => (
              <View key={reservation.id} style={[styles.arrivalRow, index > 0 && styles.rowBorder]}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateDay}>{new Date(`${reservation.check_in}T12:00:00`).getDate()}</Text>
                  <Text style={styles.dateMonth}>
                    {new Date(`${reservation.check_in}T12:00:00`).toLocaleDateString("fr-FR", { month: "short" }).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.arrivalCopy}>
                  <Text style={styles.arrivalName}>{reservation.client_name}</Text>
                  <Text style={styles.arrivalMeta}>{reservation.apartment?.name ?? "Appartement"}</Text>
                </View>
                <Text style={styles.guestCount}>{reservation.adults} ad.</Text>
              </View>
            ))}
            {upcoming.length === 0 ? <Text style={styles.noArrival}>Aucune arrivée prochaine.</Text> : null}
          </View>
        </>
      )}
    </Screen>
  );
}

function Metric({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brandIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  heroCard: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.xxl, ...shadow.card },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroLabel: { color: "rgba(255,255,255,0.66)", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  heroValue: { color: "white", fontSize: 34, fontWeight: "800", letterSpacing: -1, marginTop: spacing.md },
  heroHint: { color: "rgba(255,255,255,0.62)", fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md },
  metric: { width: "48%", flexGrow: 1, minWidth: 140, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  metricIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  metricValue: { color: colors.text, fontSize: 25, fontWeight: "800" },
  metricLabel: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  contractShortcut: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  contractShortcutIcon: { width: 45, height: 45, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  contractShortcutCopy: { flex: 1 },
  contractShortcutTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  contractShortcutText: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: spacing.xxxl, marginBottom: spacing.md },
  listCard: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border },
  arrivalRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.lg },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  dateBox: { width: 48, height: 52, borderRadius: radius.md, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  dateDay: { color: colors.text, fontSize: 18, fontWeight: "800" },
  dateMonth: { color: colors.gold, fontSize: 9, fontWeight: "900" },
  arrivalCopy: { flex: 1, marginLeft: spacing.md },
  arrivalName: { color: colors.text, fontSize: 14, fontWeight: "800" },
  arrivalMeta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  guestCount: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  noArrival: { color: colors.textMuted, textAlign: "center", paddingVertical: spacing.xxl },
});
