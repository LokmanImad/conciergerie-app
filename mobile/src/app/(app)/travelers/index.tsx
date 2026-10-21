import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { EmptyView, ErrorView, LoadingView } from "@/components/state-view";
import { StatusPill } from "@/components/status-pill";
import { colors, radius, spacing } from "@/constants/theme";
import { registrationStatusLabels, type RegistrationStatus, type TravelerRegistration } from "@/features/travelers/types";
import { useTravelerRegistrations } from "@/hooks/use-traveler-registrations";

type StatusFilter = "all" | "active" | "submitted" | "verified" | "rejected";

const filters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "submitted", label: "À vérifier" },
  { value: "active", label: "En cours" },
  { value: "verified", label: "Vérifiés" },
  { value: "rejected", label: "À corriger" },
];

function statusTone(status: RegistrationStatus) {
  if (status === "verified") return "success" as const;
  if (status === "rejected") return "danger" as const;
  if (status === "submitted") return "warning" as const;
  return "primary" as const;
}

export default function TravelersScreen() {
  const router = useRouter();
  const { registrations, loading, refreshing, error, reload } = useTravelerRegistrations();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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

  const filteredRegistrations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return registrations.filter((registration) => {
      const matchesSearch = !query
        || registration.reservation?.reference.toLocaleLowerCase("fr").includes(query)
        || registration.reservation?.client_name.toLocaleLowerCase("fr").includes(query)
        || registration.reservation?.apartment?.name.toLocaleLowerCase("fr").includes(query);
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "active" && ["sent", "opened"].includes(registration.status))
        || registration.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [registrations, search, statusFilter]);

  const pendingCount = registrations.filter((item) => item.status === "submitted").length;
  const verifiedCount = registrations.filter((item) => item.status === "verified").length;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void reload(true)} tintColor={colors.primary} />}>
      <PageHeading eyebrow="FICHES DE POLICE" title="Voyageurs" description="Contrôlez les identités, les signatures et les fiches de chaque séjour." />

      <View style={styles.summaryRow}>
        <SummaryCard icon="documents-outline" label="Dossiers" value={registrations.length} />
        <SummaryCard icon="alert-circle-outline" label="À vérifier" value={pendingCount} warning />
        <SummaryCard icon="checkmark-circle-outline" label="Vérifiés" value={verifiedCount} success />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          accessibilityLabel="Rechercher un dossier voyageur"
          autoCapitalize="none"
          onChangeText={setSearch}
          placeholder="Référence, voyageur ou appartement…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={search}
        />
        {search ? (
          <TouchableOpacity accessibilityLabel="Effacer la recherche" onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((filter) => {
          const selected = filter.value === statusFilter;
          return (
            <TouchableOpacity
              key={filter.value}
              activeOpacity={0.8}
              onPress={() => setStatusFilter(filter.value)}
              style={[styles.filter, selected && styles.filterSelected]}
            >
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{filter.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? <LoadingView /> : null}
      {!loading && error ? <ErrorView message={error} retry={() => void reload()} /> : null}
      {!loading && !error && registrations.length === 0 ? (
        <EmptyView title="Aucun dossier voyageur" message="Créez un lien depuis une réservation pour démarrer un dossier." />
      ) : null}
      {!loading && !error && registrations.length > 0 && filteredRegistrations.length === 0 ? (
        <EmptyView title="Aucun résultat" message="Modifiez la recherche ou le filtre sélectionné." />
      ) : null}
      {!loading && !error ? filteredRegistrations.map((registration) => (
        <RegistrationCard
          key={registration.id}
          registration={registration}
          onPress={() => router.push(`/travelers/${registration.id}` as Href)}
        />
      )) : null}
    </Screen>
  );
}

function SummaryCard({ icon, label, value, warning, success }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number; warning?: boolean; success?: boolean }) {
  const color = warning ? colors.warning : success ? colors.success : colors.primary;
  const backgroundColor = warning ? colors.warningSoft : success ? colors.successSoft : colors.primarySoft;
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor }]}><Ionicons name={icon} size={18} color={color} /></View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function RegistrationCard({ registration, onPress }: { registration: TravelerRegistration; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.icon}>
          <Ionicons name="id-card-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.name}>{registration.reservation?.client_name ?? "Voyageur principal"}</Text>
          <Text style={styles.reference}>{registration.reservation?.reference ?? "Réservation"}</Text>
        </View>
        <StatusPill label={registrationStatusLabels[registration.status]} tone={statusTone(registration.status)} />
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaCopy}>
          <Text style={styles.meta}>{registration.reservation?.apartment?.name ?? "Appartement"}</Text>
          <Text style={styles.progress}>{registration.registered_adults}/{registration.expected_adults} adulte{registration.expected_adults > 1 ? "s" : ""} enregistré{registration.expected_adults > 1 ? "s" : ""}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.gold} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  summaryCard: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  summaryIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  summaryValue: { color: colors.text, fontSize: 22, fontWeight: "900", marginTop: spacing.sm },
  summaryLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  searchBox: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: spacing.md },
  filters: { gap: spacing.sm, paddingVertical: spacing.md },
  filter: { borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: 9 },
  filterSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  filterTextSelected: { color: "white" },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  topRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  name: { color: colors.text, fontSize: 15, fontWeight: "800" },
  reference: { color: colors.gold, fontSize: 11, fontWeight: "800", marginTop: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  metaCopy: { flex: 1 },
  meta: { color: colors.text, fontSize: 12, fontWeight: "700" },
  progress: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
});
