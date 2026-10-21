import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { colors, radius, spacing } from "@/constants/theme";
import {
  chargePaymentMethodLabels,
  chargePaymentMethods,
  paidByPeople,
  paidByPersonLabels,
  type ChargeFormState,
  type ChargePaymentMethod,
  type ChargeReceiptDraft,
  type ChargeReservationOption,
  type PaidByPerson,
  type ServiceTypeOption,
} from "@/features/charges/types";
import type { ApartmentOption } from "@/features/reservations/types";

type Option = { label: string; value: string };

export function ChargeForm({
  initialForm,
  apartments,
  serviceTypes,
  reservations,
  initialReceiptUrl,
  submitting,
  error,
  submitLabel,
  onSubmit,
}: {
  initialForm: ChargeFormState;
  apartments: ApartmentOption[];
  serviceTypes: ServiceTypeOption[];
  reservations: ChargeReservationOption[];
  initialReceiptUrl?: string | null;
  submitting: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (
    form: ChargeFormState,
    receipt: ChargeReceiptDraft | null,
    removeExistingReceipt: boolean,
  ) => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [receipt, setReceipt] = useState<ChargeReceiptDraft | null>(null);
  const [removeExistingReceipt, setRemoveExistingReceipt] = useState(false);

  const update = <Key extends keyof ChargeFormState>(
    key: Key,
    value: ChargeFormState[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const selectedService = serviceTypes.find(
    (service) => service.id === form.service_type_id,
  );
  const isCleaning =
    selectedService?.name.toLocaleLowerCase("fr").includes("ménage") ||
    selectedService?.name.toLocaleLowerCase("fr").includes("menage") ||
    selectedService?.name.toLocaleLowerCase("fr").includes("nettoyage");
  const availableReservations = useMemo(
    () =>
      reservations.filter(
        (reservation) =>
          !form.apartment_id || reservation.apartment_id === form.apartment_id,
      ),
    [form.apartment_id, reservations],
  );
  const visibleReceiptUrl =
    receipt?.uri ?? (!removeExistingReceipt ? initialReceiptUrl : null);

  const setSelectedReceipt = (asset: ImagePicker.ImagePickerAsset) => {
    if (asset.fileSize && asset.fileSize > 6 * 1024 * 1024) {
      Alert.alert(
        "Fichier trop volumineux",
        "Le justificatif doit faire moins de 6 Mo.",
      );
      return;
    }
    setReceipt({
      uri: asset.uri,
      mimeType: asset.mimeType ?? "image/jpeg",
      fileName: asset.fileName ?? `justificatif-${Date.now()}.jpg`,
      fileSize: asset.fileSize,
    });
    setRemoveExistingReceipt(Boolean(initialReceiptUrl));
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Caméra non autorisée",
        "Autorisez l’accès à la caméra pour photographier le justificatif.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.72,
      allowsEditing: false,
    });
    if (!result.canceled) setSelectedReceipt(result.assets[0]);
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photos non autorisées",
        "Autorisez l’accès aux photos pour sélectionner le justificatif.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.78,
      allowsEditing: false,
    });
    if (!result.canceled) setSelectedReceipt(result.assets[0]);
  };

  const removeReceipt = () => {
    setReceipt(null);
    setRemoveExistingReceipt(Boolean(initialReceiptUrl));
  };

  return (
    <View style={styles.form}>
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color={colors.danger}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FormSection
        icon="receipt-outline"
        title="Dépense"
        subtitle="Catégorie, montant et date de la charge."
      >
        <SelectField
          label="Catégorie *"
          placeholder="Sélectionner une catégorie"
          value={form.service_type_id}
          options={serviceTypes.map((service) => ({
            label: `${service.name} · ${service.paid_by === "owner" ? "Propriétaire" : "Société"}`,
            value: service.id,
          }))}
          onChange={(value) => {
            const service = serviceTypes.find((item) => item.id === value);
            const name = service?.name.toLocaleLowerCase("fr") ?? "";
            const cleaning = ["ménage", "menage", "cleaning", "nettoyage"].some(
              (term) => name.includes(term),
            );
            update("service_type_id", value);
            update("reservation_id", "");
            update(
              "billable_to_owner",
              Boolean(
                form.apartment_id && (service?.paid_by === "owner" || cleaning),
              ),
            );
          }}
        />
        <View style={styles.twoColumns}>
          <InputField
            compact
            label="Montant (DH) *"
            value={form.amount}
            keyboardType="decimal-pad"
            placeholder="0,00"
            onChangeText={(value) => update("amount", decimalOnly(value))}
          />
          <DateField
            compact
            label="Date *"
            value={form.date}
            onChange={(value) => update("date", value)}
          />
        </View>
        <InputField
          label="Fournisseur"
          value={form.supplier}
          autoCapitalize="words"
          placeholder="Ex. Société de nettoyage"
          onChangeText={(value) => update("supplier", value)}
        />
      </FormSection>

      <FormSection
        icon="business-outline"
        title="Affectation"
        subtitle="Appartement ou dépense générale de la société."
      >
        <SelectField
          label="Appartement"
          value={form.apartment_id}
          placeholder="Charge société — aucun appartement"
          options={[
            { label: "Charge société — aucun appartement", value: "" },
            ...apartments.map((apartment) => ({
              label: apartment.name,
              value: apartment.id,
            })),
          ]}
          onChange={(value) => {
            update("apartment_id", value);
            update("reservation_id", "");
            if (!value) update("billable_to_owner", false);
          }}
        />
        {isCleaning ? (
          <SelectField
            label="Réservation associée"
            value={form.reservation_id}
            placeholder="Aucune réservation"
            options={[
              { label: "Aucune réservation", value: "" },
              ...availableReservations.map((reservation) => ({
                label: `${reservation.reference} · ${reservation.client_name}`,
                value: reservation.id,
              })),
            ]}
            onChange={(value) => update("reservation_id", value)}
          />
        ) : null}
      </FormSection>

      <FormSection
        icon="wallet-outline"
        title="Paiement"
        subtitle="Qui a avancé la dépense et par quel moyen."
      >
        <View style={styles.twoColumns}>
          <SelectField
            compact
            label="Payé par *"
            value={form.paid_by_person}
            options={paidByPeople.map((person) => ({
              label: paidByPersonLabels[person],
              value: person,
            }))}
            onChange={(value) =>
              update("paid_by_person", value as PaidByPerson)
            }
          />
          <SelectField
            compact
            label="Mode *"
            value={form.payment_method}
            options={chargePaymentMethods.map((method) => ({
              label: chargePaymentMethodLabels[method],
              value: method,
            }))}
            onChange={(value) =>
              update("payment_method", value as ChargePaymentMethod)
            }
          />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={styles.switchTitle}>Charge déjà payée</Text>
            <Text style={styles.switchSubtitle}>
              Activez si le paiement a déjà été effectué.
            </Text>
          </View>
          <Switch
            value={form.is_paid}
            onValueChange={(value) => update("is_paid", value)}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor="white"
          />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={styles.switchTitle}>Refacturer au propriétaire</Text>
            <Text style={styles.switchSubtitle}>
              Ajoute cette charge à sa facture et la déduit de son versement.
            </Text>
          </View>
          <Switch
            value={form.billable_to_owner}
            disabled={!form.apartment_id}
            onValueChange={(value) => update("billable_to_owner", value)}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor="white"
          />
        </View>
      </FormSection>

      <FormSection
        icon="camera-outline"
        title="Justificatif"
        subtitle="Photographiez le ticket ou choisissez une facture dans la galerie."
      >
        {visibleReceiptUrl ? (
          <View style={styles.receiptPreview}>
            <Image
              source={{ uri: visibleReceiptUrl }}
              contentFit="contain"
              style={styles.receiptImage}
            />
            <TouchableOpacity
              accessibilityLabel="Retirer le justificatif"
              onPress={removeReceipt}
              style={styles.removeReceipt}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={styles.removeReceiptText}>Retirer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.receiptEmpty}>
            <Ionicons name="image-outline" size={28} color={colors.textMuted} />
            <Text style={styles.receiptEmptyText}>
              Aucun justificatif sélectionné
            </Text>
          </View>
        )}
        <View style={styles.twoColumns}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => void takePhoto()}
            style={styles.photoButton}
          >
            <Ionicons name="camera-outline" size={19} color={colors.primary} />
            <Text style={styles.photoButtonText}>Caméra</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => void choosePhoto()}
            style={styles.photoButton}
          >
            <Ionicons name="images-outline" size={19} color={colors.primary} />
            <Text style={styles.photoButtonText}>Galerie</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.fileHint}>
          Formats acceptés : JPG, PNG ou WebP · maximum 6 Mo.
        </Text>
      </FormSection>

      <FormSection
        icon="document-text-outline"
        title="Informations complémentaires"
      >
        <InputField
          label="Description"
          value={form.description}
          multiline
          placeholder="Détails de la charge…"
          onChangeText={(value) => update("description", value)}
        />
        <InputField
          label="Notes internes"
          value={form.notes}
          multiline
          placeholder="Informations utiles pour l’équipe…"
          onChangeText={(value) => update("notes", value)}
        />
      </FormSection>

      <TouchableOpacity
        activeOpacity={0.85}
        disabled={submitting}
        onPress={() => onSubmit(form, receipt, removeExistingReceipt)}
        style={[styles.submitButton, submitting && styles.disabledButton]}
      >
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Ionicons name="checkmark-circle-outline" size={21} color="white" />
        )}
        <Text style={styles.submitText}>
          {submitting ? "Enregistrement…" : submitLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function FormSection({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={19} color={colors.primary} />
        </View>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? (
            <Text style={styles.sectionSubtitle}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.fields}>{children}</View>
    </View>
  );
}

function InputField({
  label,
  compact,
  multiline,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  compact?: boolean;
}) {
  return (
    <View style={compact ? styles.compactField : styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor="#9AA19E"
        style={[styles.input, multiline && styles.textarea, props.style]}
      />
    </View>
  );
}

function SelectField({
  label,
  value,
  placeholder = "Sélectionner",
  options,
  onChange,
  compact,
}: {
  label: string;
  value: string;
  placeholder?: string;
  options: Option[];
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <View style={compact ? styles.compactField : styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => setOpen(true)}
        style={styles.selectButton}
      >
        <Text
          numberOfLines={1}
          style={[styles.selectText, !selected && styles.placeholder]}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={17} color={colors.textMuted} />
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={styles.optionSheet}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{label.replace(" *", "")}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <TouchableOpacity
                    key={option.value || "empty"}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    style={[
                      styles.optionRow,
                      isSelected && styles.selectedOption,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.selectedOptionLabel,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={21}
                        color={colors.primary}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function DateField({
  label,
  value,
  onChange,
  compact,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseDate(value));
  if (Platform.OS === "web")
    return (
      <InputField
        compact={compact}
        label={label}
        value={value}
        placeholder="AAAA-MM-JJ"
        onChangeText={onChange}
      />
    );
  return (
    <View style={compact ? styles.compactField : styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        onPress={() => {
          setDraft(parseDate(value));
          setOpen(true);
        }}
        style={styles.selectButton}
      >
        <Text style={styles.selectText}>{formatDisplayDate(value)}</Text>
        <Ionicons name="calendar-outline" size={17} color={colors.primary} />
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerCard}>
            <Text style={styles.sheetTitle}>Date de la charge</Text>
            <DateTimePicker
              value={draft}
              mode="date"
              presentation="inline"
              display="inline"
              locale="fr_FR"
              accentColor={colors.primary}
              onValueChange={(_event, date) => setDraft(date)}
            />
            <View style={styles.pickerActions}>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                style={styles.secondaryAction}
              >
                <Text style={styles.secondaryActionText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onChange(formatDate(draft));
                  setOpen(false);
                }}
                style={styles.primaryAction}
              >
                <Text style={styles.primaryActionText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day, 12) : new Date();
}

function formatDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(value: string) {
  return parseDate(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function decimalOnly(value: string) {
  const normalized = value.replace(",", ".").replace(/[^0-9.]/g, "");
  const [whole, ...decimals] = normalized.split(".");
  return decimals.length ? `${whole}.${decimals.join("")}` : whole;
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  errorBanner: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: "#EECACA",
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  fields: { gap: spacing.md, paddingTop: spacing.lg },
  field: { width: "100%" },
  compactField: { flex: 1, minWidth: 0 },
  twoColumns: { flexDirection: "row", gap: spacing.md },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
  },
  textarea: { minHeight: 92, paddingTop: spacing.md, textAlignVertical: "top" },
  selectButton: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  selectText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "600" },
  placeholder: { color: "#9AA19E", fontWeight: "400" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  switchCopy: { flex: 1 },
  switchTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  switchSubtitle: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  receiptPreview: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  receiptImage: {
    width: "100%",
    height: 210,
    backgroundColor: colors.background,
  },
  removeReceipt: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
  },
  removeReceiptText: { color: colors.danger, fontSize: 12, fontWeight: "800" },
  receiptEmpty: {
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  receiptEmptyText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  photoButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  photoButtonText: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  fileHint: { color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10,27,24,0.55)",
    justifyContent: "flex-end",
    padding: spacing.lg,
  },
  optionSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: "82%",
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  optionRow: {
    minHeight: 50,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  selectedOption: { backgroundColor: colors.primarySoft },
  optionLabel: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "600" },
  selectedOptionLabel: { color: colors.primary, fontWeight: "800" },
  pickerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  pickerActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryActionText: { color: colors.text, fontWeight: "800" },
  primaryAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  primaryActionText: { color: "white", fontWeight: "800" },
  submitButton: {
    minHeight: 58,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  disabledButton: { opacity: 0.65 },
  submitText: { color: "white", fontSize: 16, fontWeight: "800" },
});
