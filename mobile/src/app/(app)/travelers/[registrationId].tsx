import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { NavigationBackButton } from "@/components/navigation-back-button";
import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { ErrorView, LoadingView } from "@/components/state-view";
import { StatusPill } from "@/components/status-pill";
import { colors, radius, spacing } from "@/constants/theme";
import { printPoliceForm, sharePoliceForm } from "@/features/travelers/police-form";
import {
  documentTypeLabels,
  genderLabels,
  registrationStatusLabels,
  type RegistrationStatus,
  type TravelerRecord,
} from "@/features/travelers/types";
import { useTravelerRegistration } from "@/hooks/use-traveler-registration";
import { useSupabaseClient } from "@/lib/supabase";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

function statusTone(status: RegistrationStatus) {
  if (status === "verified") return "success" as const;
  if (status === "rejected") return "danger" as const;
  if (status === "submitted") return "warning" as const;
  return "primary" as const;
}

export default function TravelerRegistrationScreen() {
  const { registrationId } = useLocalSearchParams<{ registrationId: string }>();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { registration, documentUrls, loading, error, documentError, reload } = useTravelerRegistration(registrationId);
  const [reviewing, setReviewing] = useState(false);
  const [pdfBusy, setPdfBusy] = useState<"print" | "share" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; label: string } | null>(null);
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

  const review = async (status: "verified" | "rejected") => {
    if (!registration) return;
    setReviewing(true);
    setActionError(null);
    const { error: reviewError } = await supabase.rpc("review_traveler_registration", {
      p_registration_id: registration.id,
      p_status: status,
    });
    setReviewing(false);

    if (reviewError) {
      setActionError("Impossible d’enregistrer cette décision. Réessayez dans quelques instants.");
      return;
    }
    await reload();
  };

  const confirmReview = (status: "verified" | "rejected") => {
    const isValidation = status === "verified";
    Alert.alert(
      isValidation ? "Valider le dossier ?" : "Demander une correction ?",
      isValidation
        ? "Confirmez que les informations, les documents et la signature ont été contrôlés."
        : "Le voyageur devra recevoir un nouveau lien pour corriger puis renvoyer le formulaire.",
      [
        { text: "Retour", style: "cancel" },
        {
          text: isValidation ? "Valider" : "Demander la correction",
          style: isValidation ? "default" : "destructive",
          onPress: () => void review(status),
        },
      ],
    );
  };

  const createPdf = async (mode: "print" | "share") => {
    if (!registration) return;
    setPdfBusy(mode);
    setActionError(null);
    try {
      if (mode === "print") await printPoliceForm(registration, documentUrls);
      else await sharePoliceForm(registration, documentUrls);
    } catch {
      setActionError("Impossible de générer la fiche de police sur cet appareil.");
    } finally {
      setPdfBusy(null);
    }
  };

  return (
    <>
      <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} tintColor={colors.primary} />}>
        <PageHeading
          eyebrow="DOSSIER VOYAGEURS"
          title={registration?.reservation?.reference ?? "Fiche de police"}
          description={registration?.reservation?.apartment?.name ?? "Contrôle des informations"}
          action={<NavigationBackButton onPress={() => router.back()} />}
        />

        {loading && !registration ? <LoadingView /> : null}
        {!loading && error ? <ErrorView message={error} retry={() => void reload()} /> : null}

        {registration ? (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroName}>{registration.reservation?.client_name ?? "Voyageur principal"}</Text>
                  <Text style={styles.heroMeta}>{registration.travelers.length}/{registration.expected_adults} adultes enregistrés</Text>
                </View>
                <StatusPill label={registrationStatusLabels[registration.status]} tone={statusTone(registration.status)} />
              </View>
              <View style={styles.stayRow}>
                <StayDate label="ARRIVÉE" value={registration.reservation?.check_in} />
                <Ionicons name="arrow-forward" size={19} color={colors.gold} />
                <StayDate label="DÉPART" value={registration.reservation?.check_out} right />
              </View>
            </View>

            {actionError ? <Banner icon="alert-circle-outline" text={actionError} danger /> : null}
            {documentError ? <Banner icon="image-outline" text={documentError} danger /> : null}

            {registration.travelers.length === 0 ? (
              <View style={styles.waitingCard}>
                <View style={styles.waitingIcon}><Ionicons name="hourglass-outline" size={25} color={colors.primary} /></View>
                <Text style={styles.waitingTitle}>Informations en attente</Text>
                <Text style={styles.waitingText}>Le voyageur principal n’a pas encore envoyé les informations des adultes.</Text>
              </View>
            ) : registration.travelers.map((traveler) => (
              <TravelerCard
                key={traveler.id}
                traveler={traveler}
                documentUrls={documentUrls}
                onPreview={(url, label) => setPreview({ url, label })}
              />
            ))}

            {registration.signature_data_url ? (
              <View style={styles.card}>
                <View style={styles.sectionHeading}>
                  <View style={styles.sectionIcon}><Ionicons name="pencil-outline" size={19} color={colors.primary} /></View>
                  <View style={styles.sectionCopy}>
                    <Text style={styles.sectionTitle}>Signature du voyageur principal</Text>
                    <Text style={styles.sectionSubtitle}>
                      {registration.signed_by ?? "Signataire"}{registration.signed_at ? ` · ${dateTimeFormat.format(new Date(registration.signed_at))}` : ""}
                    </Text>
                  </View>
                </View>
                <Image source={{ uri: registration.signature_data_url }} contentFit="contain" style={styles.signature} />
                <Text style={styles.declaration}>Cette signature certifie l’exactitude des informations et autorise son utilisation pour les fiches liées à ce séjour.</Text>
              </View>
            ) : null}

            {registration.status === "submitted" ? (
              <View style={styles.actionCard}>
                <Text style={styles.actionTitle}>Décision sur le dossier</Text>
                <Text style={styles.actionSubtitle}>Contrôlez chaque adulte, les pièces d’identité et la signature avant de valider.</Text>
                <TouchableOpacity disabled={reviewing} activeOpacity={0.82} onPress={() => confirmReview("verified")} style={styles.validateButton}>
                  <Ionicons name="checkmark-circle-outline" size={21} color="white" />
                  <Text style={styles.validateText}>{reviewing ? "Enregistrement…" : "Valider le dossier"}</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={reviewing} activeOpacity={0.82} onPress={() => confirmReview("rejected")} style={styles.rejectButton}>
                  <Ionicons name="refresh-circle-outline" size={21} color={colors.danger} />
                  <Text style={styles.rejectText}>Demander une correction</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {registration.status === "verified" ? (
              <View style={styles.actionCard}>
                <Text style={styles.actionTitle}>Fiches de police prêtes</Text>
                <Text style={styles.actionSubtitle}>Une fiche individuelle sera générée pour chaque adulte validé.</Text>
                <View style={styles.pdfRow}>
                  <TouchableOpacity disabled={Boolean(pdfBusy)} activeOpacity={0.82} onPress={() => void createPdf("print")} style={styles.pdfSecondary}>
                    <Ionicons name="print-outline" size={20} color={colors.primary} />
                    <Text style={styles.pdfSecondaryText}>{pdfBusy === "print" ? "Ouverture…" : "Imprimer"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={Boolean(pdfBusy)} activeOpacity={0.82} onPress={() => void createPdf("share")} style={styles.pdfPrimary}>
                    <Ionicons name="share-social-outline" size={20} color="white" />
                    <Text style={styles.validateText}>{pdfBusy === "share" ? "Génération…" : "Partager le PDF"}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity disabled={reviewing} onPress={() => confirmReview("rejected")} style={styles.reopenButton}>
                  <Text style={styles.reopenText}>Rouvrir pour correction</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {registration.status === "rejected" ? (
              <Banner icon="information-circle-outline" text="Le dossier attend une correction. Créez un nouveau lien depuis la réservation pour permettre un nouvel envoi." danger />
            ) : null}
          </>
        ) : null}
      </Screen>

      <Modal animationType="fade" visible={Boolean(preview)} transparent onRequestClose={() => setPreview(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{preview?.label}</Text>
            <TouchableOpacity accessibilityLabel="Fermer la photo" onPress={() => setPreview(null)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          {preview ? <Image source={{ uri: preview.url }} contentFit="contain" style={styles.fullImage} /> : null}
        </View>
      </Modal>
    </>
  );
}

function StayDate({ label, value, right }: { label: string; value?: string; right?: boolean }) {
  return (
    <View style={[styles.stayDate, right && styles.stayDateRight]}>
      <Text style={styles.stayLabel}>{label}</Text>
      <Text style={styles.stayValue}>{value ? dateFormat.format(new Date(`${value}T12:00:00`)) : "—"}</Text>
    </View>
  );
}

function Banner({ icon, text, danger }: { icon: keyof typeof Ionicons.glyphMap; text: string; danger?: boolean }) {
  return (
    <View style={[styles.banner, danger && styles.bannerDanger]}>
      <Ionicons name={icon} size={19} color={danger ? colors.danger : colors.primary} />
      <Text style={[styles.bannerText, danger && styles.bannerTextDanger]}>{text}</Text>
    </View>
  );
}

function TravelerCard({ traveler, documentUrls, onPreview }: { traveler: TravelerRecord; documentUrls: Record<string, string>; onPreview: (url: string, label: string) => void }) {
  const frontLabel = traveler.document_type === "cin" ? "CIN — recto" : "Page d’identité";
  return (
    <View style={styles.card}>
      <View style={styles.travelerHeading}>
        <View style={styles.position}><Text style={styles.positionText}>{traveler.position}</Text></View>
        <View style={styles.sectionCopy}>
          <Text style={styles.travelerName}>{traveler.first_name} {traveler.last_name}</Text>
          <Text style={styles.sectionSubtitle}>{traveler.is_primary ? "Voyageur principal" : `Adulte ${traveler.position}`}</Text>
        </View>
        {traveler.is_primary ? <StatusPill label="Principal" tone="primary" /> : null}
      </View>

      <Text style={styles.groupTitle}>IDENTITÉ</Text>
      <View style={styles.fieldsGrid}>
        <Detail label="Sexe" value={genderLabels[traveler.gender]} />
        <Detail label="Date de naissance" value={traveler.birth_date} />
        <Detail label="Lieu de naissance" value={traveler.birth_place} />
        <Detail label="Nationalité" value={traveler.nationality} />
        <Detail label="Pays de résidence" value={traveler.country_of_residence} />
        <Detail label="Profession" value={traveler.profession || "—"} />
      </View>
      <Detail label="Adresse" value={traveler.address} wide />

      <Text style={styles.groupTitle}>DOCUMENT ET ITINÉRAIRE</Text>
      <View style={styles.fieldsGrid}>
        <Detail label="Document" value={documentTypeLabels[traveler.document_type]} />
        <Detail label="Numéro" value={traveler.document_number} />
        <Detail label="Expiration" value={traveler.document_expiry_date || "—"} />
        <Detail label="Provenance" value={traveler.arrival_from} />
        <Detail label="Destination suivante" value={traveler.next_destination} />
      </View>

      <View style={styles.documentsRow}>
        <DocumentPreview label={frontLabel} url={documentUrls[traveler.document_front_path]} onPress={onPreview} />
        {traveler.document_back_path ? <DocumentPreview label="CIN — verso" url={documentUrls[traveler.document_back_path]} onPress={onPreview} /> : null}
      </View>
    </View>
  );
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.detail, wide && styles.detailWide]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function DocumentPreview({ label, url, onPress }: { label: string; url?: string; onPress: (url: string, label: string) => void }) {
  return (
    <TouchableOpacity disabled={!url} activeOpacity={0.82} onPress={() => url && onPress(url, label)} style={styles.document}>
      <Text style={styles.documentLabel}>{label}</Text>
      {url ? (
        <Image source={{ uri: url }} contentFit="contain" style={styles.documentImage} />
      ) : (
        <View style={styles.documentPlaceholder}>
          <Ionicons name="image-outline" size={24} color={colors.textMuted} />
          <Text style={styles.documentMissing}>Indisponible</Text>
        </View>
      )}
      {url ? <Text style={styles.zoomText}>Appuyer pour agrandir</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.md },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  heroCopy: { flex: 1 },
  heroName: { color: "white", fontSize: 21, fontWeight: "900" },
  heroMeta: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 5 },
  stayRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.13)" },
  stayDate: { flex: 1 },
  stayDateRight: { alignItems: "flex-end" },
  stayLabel: { color: colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  stayValue: { color: "white", fontSize: 12, fontWeight: "700", marginTop: 5, textTransform: "capitalize" },
  banner: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, marginBottom: spacing.md },
  bannerDanger: { backgroundColor: colors.dangerSoft },
  bannerText: { flex: 1, color: colors.primary, fontSize: 12, lineHeight: 18 },
  bannerTextDanger: { color: colors.danger },
  waitingCard: { minHeight: 210, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.xxl, marginBottom: spacing.md },
  waitingIcon: { width: 50, height: 50, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft, marginBottom: spacing.md },
  waitingTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  waitingText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  travelerHeading: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  position: { width: 38, height: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  positionText: { color: "white", fontSize: 15, fontWeight: "900" },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  sectionIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  sectionSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  travelerName: { color: colors.text, fontSize: 16, fontWeight: "900" },
  groupTitle: { color: colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm },
  fieldsGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.md },
  detail: { width: "47%", paddingVertical: spacing.sm },
  detailWide: { width: "100%", borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.xs },
  detailLabel: { color: colors.textMuted, fontSize: 10 },
  detailValue: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 3, lineHeight: 18 },
  documentsRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.md },
  document: { flex: 1, minWidth: 0, padding: spacing.sm, backgroundColor: colors.background, borderRadius: radius.md },
  documentLabel: { color: colors.text, fontSize: 11, fontWeight: "800", marginBottom: spacing.sm },
  documentImage: { width: "100%", height: 135, backgroundColor: "white", borderRadius: radius.sm },
  documentPlaceholder: { height: 135, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
  documentMissing: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  zoomText: { color: colors.primary, fontSize: 9, fontWeight: "700", textAlign: "center", marginTop: spacing.xs },
  signature: { height: 130, width: "100%", backgroundColor: colors.background, borderRadius: radius.md, marginTop: spacing.md },
  declaration: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: spacing.sm },
  actionCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  actionTitle: { color: colors.text, fontSize: 17, fontWeight: "900" },
  actionSubtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.xs, marginBottom: spacing.md },
  validateButton: { minHeight: 53, borderRadius: radius.md, backgroundColor: colors.success, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  validateText: { color: "white", fontSize: 14, fontWeight: "800" },
  rejectButton: { minHeight: 51, borderRadius: radius.md, backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: "#EECACA", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.sm },
  rejectText: { color: colors.danger, fontSize: 13, fontWeight: "800" },
  pdfRow: { flexDirection: "row", gap: spacing.sm },
  pdfSecondary: { flex: 1, minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  pdfSecondaryText: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  pdfPrimary: { flex: 1, minHeight: 52, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  reopenButton: { alignItems: "center", paddingVertical: spacing.md, marginTop: spacing.xs },
  reopenText: { color: colors.danger, fontSize: 12, fontWeight: "800" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.94)", paddingTop: 55, paddingBottom: 30 },
  modalHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  modalTitle: { flex: 1, color: "white", fontSize: 16, fontWeight: "800" },
  closeButton: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)" },
  fullImage: { flex: 1, width: "100%" },
});
