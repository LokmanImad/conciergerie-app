import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { NavigationBackButton } from "@/components/navigation-back-button";
import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { ErrorView, LoadingView } from "@/components/state-view";
import { StatusPill } from "@/components/status-pill";
import { colors, radius, spacing } from "@/constants/theme";
import { uploadContractPage } from "@/features/contracts/upload";
import { contractStatusLabels, type ContractDocument } from "@/features/contracts/types";
import { useOwnerContract } from "@/hooks/use-owner-contract";
import { useSupabaseClient } from "@/lib/supabase";

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { contract, documents, loading, error, reload } = useOwnerContract(id);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ContractDocument | null>(null);
  const firstFocus = useRef(true);

  useFocusEffect(useCallback(() => {
    if (firstFocus.current) { firstFocus.current = false; return; }
    void reload();
  }, [reload]));

  const uploadAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    if (!contract || assets.length === 0) return;
    setUploading(true);
    setActionError(null);
    try {
      let position = documents.reduce((max, document) => Math.max(max, document.position), 0) + 1;
      for (const asset of assets) {
        await uploadContractPage(supabase, contract.id, asset, position);
        position += 1;
      }
      const { error: updateError } = await supabase.from("owner_contracts").update({ status: "signed", signed_at: contract.signed_at ?? new Date().toISOString() }).eq("id", contract.id);
      if (updateError) throw updateError;
      await reload();
    } catch (uploadError) {
      setActionError(uploadError instanceof Error ? uploadError.message : "Impossible d’enregistrer les pages scannées.");
    } finally {
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { Alert.alert("Caméra non autorisée", "Autorisez la caméra pour scanner une page du contrat."); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.78, allowsEditing: false });
    if (!result.canceled) await uploadAssets(result.assets);
  };

  const choosePhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Photos non autorisées", "Autorisez l’accès aux photos pour ajouter les pages du contrat."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.82, allowsMultipleSelection: true, selectionLimit: 10 });
    if (!result.canceled) await uploadAssets(result.assets);
  };

  const removePage = (document: ContractDocument) => Alert.alert("Retirer cette page ?", "La page scannée sera supprimée du dossier.", [
    { text: "Retour", style: "cancel" },
    { text: "Supprimer", style: "destructive", onPress: () => void (async () => {
      const { error: deleteError } = await supabase.from("owner_contract_documents").delete().eq("id", document.id);
      if (deleteError) { setActionError(deleteError.message); return; }
      await supabase.storage.from("owner-contracts").remove([document.storage_path]);
      setPreview(null);
      await reload();
    })() },
  ]);

  return <>
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} tintColor={colors.primary} />}>
      <PageHeading eyebrow={contract?.contract_number ?? "CONTRAT"} title={contract?.apartment?.name ?? "Contrat propriétaire"} description={contract?.owner_name ?? "Dossier du propriétaire"} action={<NavigationBackButton onPress={() => router.back()} />} />
      {loading && !contract ? <LoadingView /> : null}
      {!loading && error ? <ErrorView message={error} retry={() => void reload()} /> : null}
      {actionError ? <View style={styles.error}><Ionicons name="alert-circle-outline" size={19} color={colors.danger} /><Text style={styles.errorText}>{actionError}</Text></View> : null}
      {contract ? <>
        <View style={styles.hero}><View style={styles.heroTop}><View><Text style={styles.heroLabel}>STATUT DU DOSSIER</Text><Text style={styles.heroTitle}>{contractStatusLabels[contract.status]}</Text></View><StatusPill label={contractStatusLabels[contract.status]} tone={contract.status === "signed" ? "success" : contract.status === "expired" ? "danger" : "warning"} /></View><Text style={styles.heroMeta}>Commission {Number(contract.commission_rate).toFixed(2)} % · début {formatDate(contract.start_date)}</Text></View>
        <View style={styles.card}><Text style={styles.cardTitle}>Parties</Text><Row icon="person-outline" label="Propriétaire" value={contract.owner_name} /><Row icon="call-outline" label="Contact" value={contract.owner_contact ?? "Non renseigné"} /><Row icon="business-outline" label="Gestionnaire" value={contract.manager_name} last /></View>
        <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Exemplaire signé</Text><Text style={styles.sectionHint}>{documents.length} page{documents.length > 1 ? "s" : ""} conservée{documents.length > 1 ? "s" : ""}</Text></View><Ionicons name="lock-closed-outline" size={18} color={colors.primary} /></View>
        <View style={styles.uploadRow}><TouchableOpacity disabled={uploading} onPress={() => void takePhoto()} style={styles.uploadButton}><Ionicons name="scan-outline" size={20} color={colors.primary} /><Text style={styles.uploadText}>{uploading ? "Envoi…" : "Scanner une page"}</Text></TouchableOpacity><TouchableOpacity disabled={uploading} onPress={() => void choosePhotos()} style={styles.uploadButton}><Ionicons name="images-outline" size={20} color={colors.primary} /><Text style={styles.uploadText}>Galerie</Text></TouchableOpacity></View>
        {documents.length === 0 ? <View style={styles.emptyScan}><Ionicons name="documents-outline" size={29} color={colors.textMuted} /><Text style={styles.emptyTitle}>Aucune page scannée</Text><Text style={styles.emptyText}>Photographiez le contrat après sa signature et son cachet.</Text></View> : <View style={styles.documentGrid}>{documents.map((document) => <TouchableOpacity key={document.id} onPress={() => setPreview(document)} style={styles.documentCard}>{document.signed_url ? <Image source={{ uri: document.signed_url }} contentFit="cover" style={styles.thumbnail} /> : <View style={styles.thumbnailFallback}><Ionicons name="document-outline" size={28} color={colors.textMuted} /></View>}<View style={styles.documentFooter}><Text style={styles.documentName}>Page {document.position}</Text><Ionicons name="expand-outline" size={16} color={colors.primary} /></View></TouchableOpacity>)}</View>}
        {contract.notes ? <View style={styles.notes}><Text style={styles.notesLabel}>NOTES INTERNES</Text><Text style={styles.notesText}>{contract.notes}</Text></View> : null}
      </> : null}
    </Screen>
    <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={() => setPreview(null)}><View style={styles.modal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Page {preview?.position}</Text><TouchableOpacity onPress={() => preview && removePage(preview)} style={styles.deleteButton}><Ionicons name="trash-outline" size={20} color="#FFB4B4" /></TouchableOpacity><TouchableOpacity onPress={() => setPreview(null)} style={styles.closeButton}><Ionicons name="close" size={24} color="white" /></TouchableOpacity></View>{preview?.signed_url ? <Image source={{ uri: preview.signed_url }} contentFit="contain" style={styles.fullImage} /> : null}</View></Modal>
  </>;
}

function Row({ icon, label, value, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; last?: boolean }) {
  return <View style={[styles.row, last && styles.rowLast]}><View style={styles.rowIcon}><Ionicons name={icon} size={18} color={colors.primary} /></View><View style={styles.rowCopy}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View></View>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T12:00:00`)); }

const styles = StyleSheet.create({
  error: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.dangerSoft, marginBottom: spacing.md },
  errorText: { flex: 1, color: colors.danger, fontSize: 12, lineHeight: 18 },
  hero: { padding: spacing.xl, borderRadius: radius.xl, backgroundColor: colors.primary, marginBottom: spacing.md },
  heroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  heroLabel: { color: colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  heroTitle: { color: "white", fontSize: 25, fontWeight: "900", marginTop: 5 },
  heroMeta: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: spacing.lg },
  card: { padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, marginBottom: spacing.xl },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: spacing.sm },
  row: { minHeight: 59, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { width: 35, height: 35, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft, marginRight: spacing.md },
  rowCopy: { flex: 1 }, rowLabel: { color: colors.textMuted, fontSize: 10 }, rowValue: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 3 },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" }, sectionHint: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  uploadRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  uploadButton: { flex: 1, minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, backgroundColor: colors.surface },
  uploadText: { color: colors.primary, fontSize: 12, fontWeight: "900" },
  emptyScan: { minHeight: 180, alignItems: "center", justifyContent: "center", padding: spacing.xl, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: "800", marginTop: spacing.sm }, emptyText: { color: colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 4 },
  documentGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  documentCard: { width: "47%", flexGrow: 1, overflow: "hidden", borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  thumbnail: { width: "100%", height: 165, backgroundColor: colors.background }, thumbnailFallback: { width: "100%", height: 165, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  documentFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md }, documentName: { color: colors.text, fontSize: 12, fontWeight: "800" },
  notes: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.goldSoft }, notesLabel: { color: colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1 }, notesText: { color: colors.text, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  modal: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", paddingTop: 52, paddingBottom: 25 }, modalHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg }, modalTitle: { flex: 1, color: "white", fontSize: 16, fontWeight: "900" }, deleteButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: "rgba(180,40,40,0.28)" }, closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.13)" }, fullImage: { flex: 1, width: "100%" },
});
