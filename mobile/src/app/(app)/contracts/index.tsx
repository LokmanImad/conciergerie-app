import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { NavigationBackButton } from "@/components/navigation-back-button";
import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { EmptyView, ErrorView, LoadingView } from "@/components/state-view";
import { colors, radius, spacing } from "@/constants/theme";
import { contractStatusLabels, type ContractStatus, type OwnerContract } from "@/features/contracts/types";
import { useOwnerContracts } from "@/hooks/use-owner-contracts";

type Filter = "all" | "pending" | "signed";

export default function ContractsScreen() {
  const router = useRouter();
  const { contracts, loading, refreshing, error, reload } = useOwnerContracts();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const firstFocus = useRef(true);

  useFocusEffect(useCallback(() => {
    if (firstFocus.current) { firstFocus.current = false; return; }
    void reload();
  }, [reload]));

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return contracts.filter((contract) => {
      const matchesFilter = filter === "all" || (filter === "signed" ? contract.status === "signed" : contract.status !== "signed" && contract.status !== "archived");
      const matchesSearch = !query || [contract.contract_number, contract.owner_name, contract.apartment?.name, contract.title].some((value) => value?.toLocaleLowerCase("fr").includes(query));
      return matchesFilter && matchesSearch;
    });
  }, [contracts, filter, search]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void reload(true)} tintColor={colors.primary} />}>
      <PageHeading eyebrow="DOCUMENTS PROPRIÉTAIRES" title="Contrats" description="Consultez les contrats et scannez les exemplaires signés." action={<NavigationBackButton onPress={() => router.back()} />} />
      <View style={styles.searchBox}><Ionicons name="search-outline" size={19} color={colors.textMuted} /><TextInput value={search} onChangeText={setSearch} placeholder="Propriétaire, appartement, numéro…" placeholderTextColor={colors.textMuted} style={styles.searchInput} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {([['all', 'Tous'], ['pending', 'À signer'], ['signed', 'Signés']] as [Filter, string][]).map(([value, label]) => <TouchableOpacity key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}><Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</Text></TouchableOpacity>)}
      </ScrollView>
      <Text style={styles.count}>{filtered.length} contrat{filtered.length > 1 ? "s" : ""}</Text>
      {loading ? <LoadingView /> : null}
      {!loading && error ? <ErrorView message={error} retry={() => void reload()} /> : null}
      {!loading && !error && contracts.length === 0 ? <EmptyView title="Aucun contrat" message="Créez d’abord un contrat depuis l’application web." /> : null}
      {!loading && !error && contracts.length > 0 && filtered.length === 0 ? <EmptyView title="Aucun résultat" message="Modifiez la recherche ou le filtre." /> : null}
      {!loading && !error ? filtered.map((contract) => <ContractCard key={contract.id} contract={contract} onPress={() => router.push(`/contracts/${contract.id}` as Href)} />) : null}
    </Screen>
  );
}

function ContractCard({ contract, onPress }: { contract: OwnerContract; onPress: () => void }) {
  const tone = contract.status === "signed" ? colors.success : contract.status === "expired" ? colors.danger : colors.warning;
  return <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.card}><View style={[styles.icon, { backgroundColor: `${tone}18` }]}><Ionicons name={contract.status === "signed" ? "document-text" : "document-text-outline"} size={22} color={tone} /></View><View style={styles.cardCopy}><Text numberOfLines={1} style={styles.cardTitle}>{contract.apartment?.name ?? contract.title}</Text><Text numberOfLines={1} style={styles.cardOwner}>{contract.owner_name}</Text><View style={styles.cardMeta}><Text style={[styles.status, { color: tone }]}>{contractStatusLabels[contract.status as ContractStatus]}</Text><Text style={styles.number}>{contract.contract_number}</Text></View></View><Ionicons name="chevron-forward" size={19} color={colors.gold} /></TouchableOpacity>;
}

const styles = StyleSheet.create({
  searchBox: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  filters: { gap: spacing.sm, paddingVertical: spacing.md },
  filter: { paddingHorizontal: spacing.lg, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  filterTextActive: { color: "white" },
  count: { color: colors.textMuted, fontSize: 11, marginBottom: spacing.sm },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  icon: { width: 46, height: 46, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  cardOwner: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  status: { fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
  number: { color: colors.textMuted, fontSize: 9 },
});
