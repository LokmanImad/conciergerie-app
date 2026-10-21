import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { colors, radius, spacing } from "@/constants/theme";
import {
  bookingStatuses,
  bookingStatusLabels,
  paymentMethods,
  paymentMethodLabels,
  reservationSources,
  reservationSourceLabels,
  type ApartmentOption,
  type ReservationFormState,
} from "@/features/reservations/types";

type Option = { label: string; value: string };

export function ReservationForm({
  initialForm,
  apartments,
  submitting,
  error,
  submitLabel,
  onSubmit,
}: {
  initialForm: ReservationFormState;
  apartments: ApartmentOption[];
  submitting: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (form: ReservationFormState) => void;
}) {
  const [form, setForm] = useState(initialForm);
  const update = <Key extends keyof ReservationFormState>(key: Key, value: ReservationFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const total = Number(form.total_amount) || 0;
  const paid = Number(form.amount_paid) || 0;

  return (
    <View style={styles.form}>
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FormSection icon="home-outline" title="Réservation" subtitle="Appartement, origine et statut du dossier.">
        <SelectField
          label="Appartement *"
          placeholder="Sélectionner un appartement"
          value={form.apartment_id}
          options={apartments.map((apartment) => ({ label: apartment.name, value: apartment.id }))}
          onChange={(value) => update("apartment_id", value)}
        />
        <View style={styles.twoColumns}>
          <SelectField
            compact
            label="Source *"
            value={form.source}
            options={reservationSources.map((source) => ({ label: reservationSourceLabels[source], value: source }))}
            onChange={(value) => update("source", value as ReservationFormState["source"])}
          />
          <SelectField
            compact
            label="Statut *"
            value={form.booking_status}
            options={bookingStatuses.map((status) => ({ label: bookingStatusLabels[status], value: status }))}
            onChange={(value) => update("booking_status", value as ReservationFormState["booking_status"])}
          />
        </View>
      </FormSection>

      <FormSection icon="calendar-outline" title="Séjour" subtitle="Dates, horaires et nombre de voyageurs.">
        <View style={styles.twoColumns}>
          <DateTimeField compact label="Arrivée *" mode="date" value={form.check_in} onChange={(value) => update("check_in", value)} />
          <DateTimeField compact label="Départ *" mode="date" value={form.check_out} minimumDate={parseDate(form.check_in)} onChange={(value) => update("check_out", value)} />
        </View>
        <View style={styles.twoColumns}>
          <DateTimeField compact label="Heure d’arrivée" mode="time" value={form.check_in_time} onChange={(value) => update("check_in_time", value)} />
          <DateTimeField compact label="Heure de départ" mode="time" value={form.check_out_time} onChange={(value) => update("check_out_time", value)} />
        </View>
        <View style={styles.twoColumns}>
          <InputField compact label="Adultes *" value={form.adults} keyboardType="number-pad" onChangeText={(value) => update("adults", digitsOnly(value))} />
          <InputField compact label="Enfants" value={form.children} keyboardType="number-pad" onChangeText={(value) => update("children", digitsOnly(value))} />
        </View>
      </FormSection>

      <FormSection icon="person-outline" title="Voyageur principal" subtitle="Le contact responsable de la réservation.">
        <InputField label="Nom complet *" value={form.client_name} placeholder="Ex. Ahmed Alaoui" autoCapitalize="words" onChangeText={(value) => update("client_name", value)} />
        <InputField label="Téléphone" value={form.client_number} placeholder="Ex. +212 6XX XX XX XX" keyboardType="phone-pad" onChangeText={(value) => update("client_number", value)} />
      </FormSection>

      <FormSection icon="wallet-outline" title="Paiement" subtitle="Le reste à payer est calculé automatiquement.">
        <View style={styles.twoColumns}>
          <InputField compact label="Total (DH) *" value={form.total_amount} placeholder="0" keyboardType="decimal-pad" onChangeText={(value) => update("total_amount", decimalOnly(value))} />
          <InputField compact label="Déjà payé (DH)" value={form.amount_paid} placeholder="0" keyboardType="decimal-pad" onChangeText={(value) => update("amount_paid", decimalOnly(value))} />
        </View>
        <SelectField
          label="Mode de paiement *"
          value={form.payment_method}
          options={paymentMethods.map((method) => ({ label: paymentMethodLabels[method], value: method }))}
          onChange={(value) => update("payment_method", value as ReservationFormState["payment_method"])}
        />
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Reste à payer</Text>
          <Text style={styles.balanceValue}>{Math.max(total - paid, 0).toFixed(2)} DH</Text>
        </View>
      </FormSection>

      <FormSection icon="document-text-outline" title="Notes internes">
        <InputField
          label="Informations utiles"
          value={form.notes}
          placeholder="Informations pour l’équipe…"
          multiline
          onChangeText={(value) => update("notes", value)}
        />
      </FormSection>

      <TouchableOpacity
        activeOpacity={0.85}
        disabled={submitting}
        onPress={() => onSubmit(form)}
        style={[styles.submitButton, submitting && styles.disabledButton]}
      >
        {submitting ? <ActivityIndicator color="white" /> : <Ionicons name="checkmark-circle-outline" size={21} color="white" />}
        <Text style={styles.submitText}>{submitting ? "Enregistrement…" : submitLabel}</Text>
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
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.fields}>{children}</View>
    </View>
  );
}

function InputField({ label, compact, multiline, ...props }: React.ComponentProps<typeof TextInput> & { label: string; compact?: boolean }) {
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
      <TouchableOpacity activeOpacity={0.75} onPress={() => setOpen(true)} style={styles.selectButton}>
        <Text numberOfLines={1} style={[styles.selectText, !selected && styles.placeholder]}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={17} color={colors.textMuted} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.optionSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{label.replace(" *", "")}</Text>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={[styles.optionRow, isSelected && styles.selectedOption]}
                >
                  <Text style={[styles.optionLabel, isSelected && styles.selectedOptionLabel]}>{option.label}</Text>
                  {isSelected ? <Ionicons name="checkmark-circle" size={21} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function DateTimeField({
  label,
  value,
  mode,
  minimumDate,
  onChange,
  compact,
}: {
  label: string;
  value: string;
  mode: "date" | "time";
  minimumDate?: Date;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => (mode === "date" ? parseDate(value) : parseTime(value)));

  if (Platform.OS === "web") {
    return (
      <InputField
        compact={compact}
        label={label}
        value={value}
        placeholder={mode === "date" ? "AAAA-MM-JJ" : "HH:MM"}
        onChangeText={onChange}
      />
    );
  }

  const show = () => {
    setDraft(mode === "date" ? parseDate(value) : parseTime(value));
    setOpen(true);
  };
  const save = () => {
    onChange(mode === "date" ? formatDate(draft) : formatTime(draft));
    setOpen(false);
  };

  return (
    <View style={compact ? styles.compactField : styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity activeOpacity={0.75} onPress={show} style={styles.selectButton}>
        <Text style={styles.selectText}>{mode === "date" ? formatDisplayDate(value) : value}</Text>
        <Ionicons name={mode === "date" ? "calendar-outline" : "time-outline"} size={17} color={colors.primary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerCard}>
            <Text style={styles.sheetTitle}>{label.replace(" *", "")}</Text>
            <DateTimePicker
              value={draft}
              mode={mode}
              presentation="inline"
              display={mode === "date" ? "inline" : "spinner"}
              locale="fr_FR"
              is24Hour
              minimumDate={minimumDate}
              accentColor={colors.primary}
              onValueChange={(_event, selectedDate) => setDraft(selectedDate)}
            />
            <View style={styles.pickerActions}>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.secondaryAction}>
                <Text style={styles.secondaryActionText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={save} style={styles.primaryAction}>
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

function parseTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(hours) ? hours : 12, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return date;
}

function formatDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function formatTime(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

function formatDisplayDate(value: string) {
  const date = parseDate(value);
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function digitsOnly(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function decimalOnly(value: string) {
  const normalized = value.replace(",", ".").replace(/[^0-9.]/g, "");
  const [whole, ...decimals] = normalized.split(".");
  return decimals.length ? `${whole}.${decimals.join("")}` : whole;
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  errorBanner: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: "#EECACA" },
  errorText: { flex: 1, color: colors.danger, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  sectionHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  sectionSubtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  fields: { gap: spacing.md, paddingTop: spacing.lg },
  field: { width: "100%" },
  compactField: { flex: 1, minWidth: 0 },
  twoColumns: { flexDirection: "row", gap: spacing.md },
  label: { color: colors.text, fontSize: 12, fontWeight: "700", marginBottom: 7 },
  input: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, fontSize: 15, paddingHorizontal: spacing.md },
  textarea: { minHeight: 100, paddingTop: spacing.md, textAlignVertical: "top" },
  selectButton: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, gap: spacing.sm },
  selectText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "600" },
  placeholder: { color: "#9AA19E", fontWeight: "400" },
  balanceCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.goldSoft, borderRadius: radius.md, padding: spacing.md },
  balanceLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  balanceValue: { color: colors.text, fontSize: 17, fontWeight: "900" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(10, 27, 24, 0.55)", justifyContent: "flex-end", padding: spacing.lg },
  optionSheet: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, maxHeight: "82%" },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.lg },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: spacing.md },
  optionRow: { minHeight: 50, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md },
  selectedOption: { backgroundColor: colors.primarySoft },
  optionLabel: { color: colors.text, fontSize: 15, fontWeight: "600" },
  selectedOptionLabel: { color: colors.primary, fontWeight: "800" },
  pickerCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg },
  pickerActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  secondaryAction: { flex: 1, minHeight: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  secondaryActionText: { color: colors.text, fontWeight: "800" },
  primaryAction: { flex: 1, minHeight: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  primaryActionText: { color: "white", fontWeight: "800" },
  submitButton: { minHeight: 58, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  disabledButton: { opacity: 0.65 },
  submitText: { color: "white", fontSize: 16, fontWeight: "800" },
});
