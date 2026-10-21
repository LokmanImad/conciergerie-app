import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { colors, radius, spacing } from "@/constants/theme";
import {
  assigneeLabels,
  priorityLabels,
  recurrenceLabels,
  typeLabels,
  type TaskAssignee,
  type TaskFormState,
  type TaskPriority,
  type TaskRecurrence,
  type TaskType,
} from "@/features/tasks/types";
import type { TaskApartment, TaskReservation } from "@/hooks/use-task-options";

type Option = { value: string; label: string };

export function TaskForm({
  initialForm,
  apartments,
  reservations,
  submitting,
  error,
  submitLabel,
  onSubmit,
}: {
  initialForm: TaskFormState;
  apartments: TaskApartment[];
  reservations: TaskReservation[];
  submitting: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (form: TaskFormState) => void;
}) {
  const [form, setForm] = useState(initialForm);
  const update = <K extends keyof TaskFormState>(
    key: K,
    value: TaskFormState[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const availableReservations = useMemo(
    () =>
      reservations.filter(
        (item) => !form.apartment_id || item.apartment_id === form.apartment_id,
      ),
    [form.apartment_id, reservations],
  );

  return (
    <View style={styles.form}>
      {error ? (
        <View style={styles.error}>
          <Ionicons
            name="alert-circle-outline"
            size={19}
            color={colors.danger}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <Section
        icon="checkbox-outline"
        title="Tâche"
        subtitle="Décrivez clairement l’action à réaliser."
      >
        <Input
          label="Titre *"
          value={form.title}
          maxLength={160}
          onChangeText={(value) => update("title", value)}
        />
        <Input
          label="Description"
          value={form.description}
          multiline
          onChangeText={(value) => update("description", value)}
        />
        <View style={styles.columns}>
          <Picker
            compact
            label="Type"
            value={form.task_type}
            options={entries(typeLabels)}
            onChange={(value) => update("task_type", value as TaskType)}
          />
          <Picker
            compact
            label="Priorité"
            value={form.priority}
            options={entries(priorityLabels)}
            onChange={(value) => update("priority", value as TaskPriority)}
          />
        </View>
      </Section>
      <Section
        icon="business-outline"
        title="Affectation"
        subtitle="Laissez vide pour une tâche générale de la société."
      >
        <Picker
          label="Appartement"
          value={form.apartment_id}
          options={[
            { value: "", label: "Société — aucun appartement" },
            ...apartments.map((item) => ({ value: item.id, label: item.name })),
          ]}
          onChange={(value) => {
            update("apartment_id", value);
            update("reservation_id", "");
          }}
        />
        <Picker
          label="Réservation"
          value={form.reservation_id}
          options={[
            { value: "", label: "Aucune réservation" },
            ...availableReservations.map((item) => ({
              value: item.id,
              label: `${item.reference} · ${item.client_name}`,
            })),
          ]}
          onChange={(value) => {
            update("reservation_id", value);
            const reservation = reservations.find((item) => item.id === value);
            if (reservation) update("apartment_id", reservation.apartment_id);
          }}
        />
      </Section>
      <Section
        icon="alarm-outline"
        title="Planning et alarme"
        subtitle="Le téléphone affichera le rappel même si l’application est fermée."
      >
        <View style={styles.columns}>
          <Input
            compact
            label="Date *"
            value={form.date}
            placeholder="AAAA-MM-JJ"
            onChangeText={(value) => update("date", value)}
          />
          <Input
            compact
            label="Heure *"
            value={form.time}
            placeholder="HH:MM"
            onChangeText={(value) => update("time", value)}
          />
        </View>
        <Picker
          label="Rappel"
          value={form.reminder_minutes_before}
          options={reminders}
          onChange={(value) => update("reminder_minutes_before", value)}
        />
        <View style={styles.columns}>
          <Picker
            compact
            label="Assignée à"
            value={form.assignee}
            options={entries(assigneeLabels)}
            onChange={(value) => update("assignee", value as TaskAssignee)}
          />
          <Picker
            compact
            label="Récurrence"
            value={form.recurrence}
            options={entries(recurrenceLabels)}
            onChange={(value) => update("recurrence", value as TaskRecurrence)}
          />
        </View>
      </Section>
      <TouchableOpacity
        disabled={submitting}
        onPress={() => onSubmit(form)}
        style={[styles.submit, submitting && styles.disabled]}
      >
        <Ionicons name="checkmark-circle-outline" size={20} color="white" />
        <Text style={styles.submitText}>
          {submitting ? "Enregistrement…" : submitLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: React.PropsWithChildren<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}>) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={styles.icon}>
          <Ionicons name={icon} size={19} color={colors.primary} />
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.fields}>{children}</View>
    </View>
  );
}
function Input({
  label,
  compact,
  multiline,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  compact?: boolean;
}) {
  return (
    <View style={compact ? styles.compact : styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor="#9AA19E"
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}
function Picker({
  label,
  value,
  options,
  onChange,
  compact,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((item) => item.value === value);
  return (
    <View style={compact ? styles.compact : styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity onPress={() => setOpen(true)} style={styles.select}>
        <Text numberOfLines={1} style={styles.selectText}>
          {selected?.label ?? "Sélectionner"}
        </Text>
        <Ionicons name="chevron-down" size={17} color={colors.textMuted} />
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={styles.sheet}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView>
              {options.map((item) => (
                <TouchableOpacity
                  key={item.value || "empty"}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={[
                    styles.option,
                    item.value === value && styles.selected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.selectedText,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Ionicons
                      name="checkmark-circle"
                      size={21}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
function entries<T extends string>(record: Record<T, string>) {
  return Object.entries(record).map(([value, label]) => ({
    value,
    label: label as string,
  }));
}
const reminders = [
  { value: "none", label: "Aucun rappel" },
  { value: "15", label: "15 minutes avant" },
  { value: "60", label: "1 heure avant" },
  { value: "1440", label: "1 jour avant" },
  { value: "2880", label: "2 jours avant" },
];
const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  error: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 12, lineHeight: 18 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeading: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headingCopy: { flex: 1 },
  sectionTitle: { color: colors.text, fontWeight: "900", fontSize: 16 },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  fields: { gap: spacing.md, paddingTop: spacing.lg },
  columns: { flexDirection: "row", gap: spacing.md },
  field: { width: "100%" },
  compact: { flex: 1, minWidth: 0 },
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
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  textarea: { minHeight: 90, paddingTop: spacing.md, textAlignVertical: "top" },
  select: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  selectText: { flex: 1, color: colors.text, fontWeight: "600", fontSize: 13 },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(10,20,18,0.45)",
  },
  sheet: {
    maxHeight: "70%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: spacing.md,
  },
  option: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  selected: { backgroundColor: colors.primarySoft },
  optionText: { flex: 1, color: colors.text, fontSize: 14 },
  selectedText: { color: colors.primary, fontWeight: "800" },
  submit: {
    minHeight: 55,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  submitText: { color: "white", fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.55 },
});
