import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { EmptyView, ErrorView, LoadingView } from "@/components/state-view";
import { colors, radius, spacing } from "@/constants/theme";
import { chargePaymentMethodLabels, paidByPersonLabels, type Charge } from "@/features/charges/types";
import { useChargeOptions } from "@/hooks/use-charge-options";
import { useCharges } from "@/hooks/use-charges";

type PeriodFilter = "current" | "previous" | "all";
type Option = { label: string; value: string };

const moneyFormat = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", minimumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
const PAGE_SIZE = 10;

function periodBounds(period: PeriodFilter) {
  if (period === "all") return null;
  const today = new Date();
  const offset = period === "previous" ? -1 : 0;
  const start = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

export default function ChargesScreen() {
  const router = useRouter();
  const { charges, loading, refreshing, error, reload } = useCharges();
  const { apartments, serviceTypes } = useChargeOptions();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [apartmentId, setApartmentId] = useState("all");
  const [serviceTypeId, setServiceTypeId] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const firstFocus = useRef(true);

  useFocusEffect(useCallback(() => {
    if (firstFocus.current) {
      firstFocus.current = false;
      return;
    }
    void reload();
  }, [reload]));

  const filteredCharges = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    const bounds = periodBounds(period);
    return charges.filter((charge) => {
      const matchesSearch = !query
        || charge.service_type?.name.toLocaleLowerCase("fr").includes(query)
        || charge.supplier?.toLocaleLowerCase("fr").includes(query)
        || charge.apartment?.name.toLocaleLowerCase("fr").includes(query)
        || charge.description?.toLocaleLowerCase("fr").includes(query);
      const matchesPeriod = !bounds || (charge.date >= bounds.start && charge.date <= bounds.end);
      const matchesApartment = apartmentId === "all"
        || (apartmentId === "company" ? !charge.apartment_id : charge.apartment_id === apartmentId);
      const matchesService = serviceTypeId === "all" || charge.service_type_id === serviceTypeId;
      return matchesSearch && matchesPeriod && matchesApartment && matchesService;
    });
  }, [apartmentId, charges, period, search, serviceTypeId]);

  const totalPages = Math.max(1, Math.ceil(filteredCharges.length / PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);
  const pageStart = (activePage - 1) * PAGE_SIZE;
  const paginatedCharges = filteredCharges.slice(pageStart, pageStart + PAGE_SIZE);

  const activeCharges = filteredCharges.filter((charge) => !charge.cancelled_at);
  const total = activeCharges.reduce((sum, charge) => sum + Number(charge.amount), 0);
  const paid = activeCharges.filter((charge) => charge.is_paid).reduce((sum, charge) => sum + Number(charge.amount), 0);

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void reload(true)} tintColor={colors.primary} />}>
      <PageHeading
        eyebrow="SUIVI DES DÉPENSES"
        title="Charges"
        description="Enregistrez les dépenses et leurs justificatifs depuis votre téléphone."
        action={
          <TouchableOpacity accessibilityLabel="Ajouter une charge" onPress={() => router.push("/charges/new")} style={styles.addButton}>
            <Ionicons name="add" size={25} color="white" />
          </TouchableOpacity>
        }
      />

      <View style={styles.summaryRow}>
        <Summary label="Total filtré" value={moneyFormat.format(total)} icon="wallet-outline" />
        <Summary label="Déjà payé" value={moneyFormat.format(paid)} icon="checkmark-circle-outline" success />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput value={search} onChangeText={(value) => { setSearch(value); setCurrentPage(1); }} placeholder="Catégorie, fournisseur, appartement…" placeholderTextColor={colors.textMuted} style={styles.searchInput} />
        {search ? <TouchableOpacity onPress={() => { setSearch(""); setCurrentPage(1); }}><Ionicons name="close-circle" size={20} color={colors.textMuted} /></TouchableOpacity> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodFilters}>
        {([
          ["current", "Ce mois"],
          ["previous", "Mois dernier"],
          ["all", "Toutes les dates"],
        ] as [PeriodFilter, string][]).map(([value, label]) => (
          <TouchableOpacity key={value} onPress={() => { setPeriod(value); setCurrentPage(1); }} style={[styles.periodButton, period === value && styles.periodButtonActive]}>
            <Text style={[styles.periodText, period === value && styles.periodTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.selectRow}>
        <FilterSelect
          label="Appartement"
          value={apartmentId}
          options={[
            { label: "Tous les appartements", value: "all" },
            { label: "Charges société", value: "company" },
            ...apartments.map((apartment) => ({ label: apartment.name, value: apartment.id })),
          ]}
          onChange={(value) => { setApartmentId(value); setCurrentPage(1); }}
        />
        <FilterSelect
          label="Catégorie"
          value={serviceTypeId}
          options={[{ label: "Toutes les catégories", value: "all" }, ...serviceTypes.map((service) => ({ label: service.name, value: service.id }))]}
          onChange={(value) => { setServiceTypeId(value); setCurrentPage(1); }}
        />
      </View>

      <Text style={styles.resultCount}>
        {filteredCharges.length === 0
          ? "0 charge"
          : `${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filteredCharges.length)} sur ${filteredCharges.length} charges`}
      </Text>
      {loading ? <LoadingView /> : null}
      {!loading && error ? <ErrorView message={error} retry={() => void reload()} /> : null}
      {!loading && !error && charges.length === 0 ? <EmptyView title="Aucune charge" message="Ajoutez votre première dépense depuis le bouton +." /> : null}
      {!loading && !error && charges.length > 0 && filteredCharges.length === 0 ? <EmptyView title="Aucun résultat" message="Modifiez la recherche ou les filtres." /> : null}
      {!loading && !error ? paginatedCharges.map((charge) => (
        <ChargeCard key={charge.id} charge={charge} onPress={() => router.push(`/charges/${charge.id}` as Href)} />
      )) : null}
      {!loading && !error && totalPages > 1 ? (
        <View style={styles.pagination}>
          <TouchableOpacity
            accessibilityLabel="Page précédente"
            disabled={activePage === 1}
            onPress={() => setCurrentPage(Math.max(1, activePage - 1))}
            style={[styles.pageButton, activePage === 1 && styles.pageButtonDisabled]}
          >
            <Ionicons name="chevron-back" size={19} color={activePage === 1 ? colors.textMuted : colors.primary} />
            <Text style={[styles.pageButtonText, activePage === 1 && styles.pageButtonTextDisabled]}>Précédent</Text>
          </TouchableOpacity>
          <View style={styles.pageIndicator}>
            <Text style={styles.pageIndicatorLabel}>PAGE</Text>
            <Text style={styles.pageIndicatorValue}>{activePage} / {totalPages}</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Page suivante"
            disabled={activePage === totalPages}
            onPress={() => setCurrentPage(Math.min(totalPages, activePage + 1))}
            style={[styles.pageButton, activePage === totalPages && styles.pageButtonDisabled]}
          >
            <Text style={[styles.pageButtonText, activePage === totalPages && styles.pageButtonTextDisabled]}>Suivant</Text>
            <Ionicons name="chevron-forward" size={19} color={activePage === totalPages ? colors.textMuted : colors.primary} />
          </TouchableOpacity>
        </View>
      ) : null}
    </Screen>
  );
}

function Summary({ label, value, icon, success }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; success?: boolean }) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, success && styles.summaryIconSuccess]}><Ionicons name={icon} size={19} color={success ? colors.success : colors.primary} /></View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ChargeCard({ charge, onPress }: { charge: Charge; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={[styles.card, charge.cancelled_at && styles.cardCancelled]}>
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, charge.cancelled_at && styles.cardIconCancelled]}>
          <Ionicons name="receipt-outline" size={21} color={charge.cancelled_at ? colors.danger : colors.primary} />
        </View>
        <View style={styles.cardCopy}>
          <Text numberOfLines={1} style={styles.cardTitle}>{charge.service_type?.name ?? "Charge"}</Text>
          <Text numberOfLines={1} style={styles.cardSubtitle}>{charge.apartment?.name ?? "Charge société"}</Text>
        </View>
        <Text style={[styles.amount, charge.cancelled_at && styles.cancelledAmount]}>{moneyFormat.format(charge.amount)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Meta icon="calendar-outline" value={dateFormat.format(new Date(`${charge.date}T12:00:00`))} />
        <Meta icon="person-outline" value={paidByPersonLabels[charge.paid_by_person]} />
        <Meta icon={charge.payment_method === "cash" ? "cash-outline" : "card-outline"} value={chargePaymentMethodLabels[charge.payment_method]} />
      </View>
      <View style={styles.badgeRow}>
        {charge.cancelled_at ? <Badge label="Annulée" danger /> : charge.is_paid ? <Badge label="Payée" success /> : <Badge label="À payer" warning />}
        {charge.receipt_path ? <Badge label="Justificatif" /> : null}
        {charge.billable_to_owner ? <Badge label="Refacturable" /> : null}
        {charge.supplier ? <Text numberOfLines={1} style={styles.supplier}>{charge.supplier}</Text> : null}
        <Ionicons name="chevron-forward" size={18} color={colors.gold} />
      </View>
    </TouchableOpacity>
  );
}

function Meta({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string }) {
  return <View style={styles.meta}><Ionicons name={icon} size={14} color={colors.textMuted} /><Text numberOfLines={1} style={styles.metaText}>{value}</Text></View>;
}

function Badge({ label, success, warning, danger }: { label: string; success?: boolean; warning?: boolean; danger?: boolean }) {
  return <View style={[styles.badge, success && styles.badgeSuccess, warning && styles.badgeWarning, danger && styles.badgeDanger]}><Text style={[styles.badgeText, success && styles.badgeTextSuccess, warning && styles.badgeTextWarning, danger && styles.badgeTextDanger]}>{label}</Text></View>;
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <View style={styles.filterSelect}>
      <Text style={styles.filterLabel}>{label}</Text>
      <TouchableOpacity onPress={() => setOpen(true)} style={styles.filterSelectButton}>
        <Text numberOfLines={1} style={styles.filterSelectText}>{selected?.label}</Text>
        <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.optionSheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView>
              {options.map((option) => (
                <TouchableOpacity key={option.value} onPress={() => { onChange(option.value); setOpen(false); }} style={[styles.optionRow, option.value === value && styles.optionSelected]}>
                  <Text style={[styles.optionText, option.value === value && styles.optionTextSelected]}>{option.label}</Text>
                  {option.value === value ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  addButton: { width: 45, height: 45, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  summaryCard: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  summaryIcon: { width: 37, height: 37, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  summaryIconSuccess: { backgroundColor: colors.successSoft },
  summaryValue: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: spacing.sm },
  summaryLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  searchBox: { minHeight: 51, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: spacing.md },
  periodFilters: { gap: spacing.sm, paddingVertical: spacing.md },
  periodButton: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: 9 },
  periodButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  periodTextActive: { color: "white" },
  selectRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  filterSelect: { flex: 1, minWidth: 0 },
  filterLabel: { color: colors.textMuted, fontSize: 9, fontWeight: "800", marginBottom: 5, letterSpacing: 0.5 },
  filterSelectButton: { minHeight: 45, flexDirection: "row", alignItems: "center", gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  filterSelectText: { flex: 1, color: colors.text, fontSize: 11, fontWeight: "700" },
  resultCount: { color: colors.textMuted, fontSize: 11, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  cardCancelled: { opacity: 0.72, borderColor: "#EECACA" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  cardIcon: { width: 43, height: 43, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  cardIconCancelled: { backgroundColor: colors.dangerSoft },
  cardCopy: { flex: 1 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  cardSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  amount: { color: colors.primary, fontSize: 16, fontWeight: "900" },
  cancelledAmount: { color: colors.danger, textDecorationLine: "line-through" },
  metaRow: { flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.md, marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  meta: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { flex: 1, color: colors.textMuted, fontSize: 10 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  badge: { borderRadius: radius.pill, backgroundColor: colors.primarySoft, paddingHorizontal: 9, paddingVertical: 5 },
  badgeSuccess: { backgroundColor: colors.successSoft },
  badgeWarning: { backgroundColor: colors.warningSoft },
  badgeDanger: { backgroundColor: colors.dangerSoft },
  badgeText: { color: colors.primary, fontSize: 9, fontWeight: "800" },
  badgeTextSuccess: { color: colors.success },
  badgeTextWarning: { color: colors.warning },
  badgeTextDanger: { color: colors.danger },
  supplier: { flex: 1, color: colors.textMuted, fontSize: 10 },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.lg },
  pageButton: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, backgroundColor: colors.surface },
  pageButtonDisabled: { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  pageButtonText: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  pageButtonTextDisabled: { color: colors.textMuted },
  pageIndicator: { minWidth: 64, alignItems: "center" },
  pageIndicatorLabel: { color: colors.textMuted, fontSize: 8, fontWeight: "800", letterSpacing: 0.8 },
  pageIndicatorValue: { color: colors.text, fontSize: 13, fontWeight: "900", marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(10,27,24,0.55)", justifyContent: "flex-end", padding: spacing.lg },
  optionSheet: { maxHeight: "75%", backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: spacing.md },
  optionRow: { minHeight: 50, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md },
  optionSelected: { backgroundColor: colors.primarySoft },
  optionText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  optionTextSelected: { color: colors.primary, fontWeight: "800" },
});
