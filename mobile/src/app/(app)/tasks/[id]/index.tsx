import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { NavigationBackButton } from "@/components/navigation-back-button";
import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { ErrorView, LoadingView } from "@/components/state-view";
import { StatusPill } from "@/components/status-pill";
import { colors, radius, spacing } from "@/constants/theme";
import {
  assigneeLabels,
  priorityLabels,
  recurrenceLabels,
  statusLabels,
  type TaskStatus,
} from "@/features/tasks/types";
import { useTask } from "@/hooks/use-task";
import { useSupabaseClient } from "@/lib/supabase";

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});
export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { task, loading, error, reload } = useTask(id);
  const [working, setWorking] = useState(false);
  const updateStatus = async (status: TaskStatus) => {
    if (!task) return;
    setWorking(true);
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", task.id);
    setWorking(false);
    if (updateError) return;
    await reload();
  };
  return (
    <Screen>
      <PageHeading
        eyebrow="DÉTAIL DE LA TÂCHE"
        title={task?.title ?? "Tâche"}
        description={task?.apartment?.name ?? "Opération de la société"}
        action={<NavigationBackButton onPress={() => router.back()} />}
      />
      {loading ? <LoadingView /> : null}
      {!loading && error ? (
        <ErrorView message={error} retry={() => void reload()} />
      ) : null}
      {task ? (
        <>
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <Ionicons name="alarm-outline" size={24} color={colors.gold} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroLabel}>ÉCHÉANCE</Text>
                <Text style={styles.heroDate}>
                  {dateTime.format(new Date(task.scheduled_at))}
                </Text>
              </View>
              <StatusPill
                label={statusLabels[task.status]}
                tone={
                  task.status === "completed"
                    ? "success"
                    : task.status === "cancelled"
                      ? "danger"
                      : task.status === "in_progress"
                        ? "warning"
                        : "primary"
                }
              />
            </View>
            {task.reminder_at ? (
              <Text style={styles.reminder}>
                Rappel : {dateTime.format(new Date(task.reminder_at))}
              </Text>
            ) : null}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informations</Text>
            <Row
              icon="person-outline"
              label="Assignée à"
              value={assigneeLabels[task.assignee]}
            />
            <Row
              icon="flag-outline"
              label="Priorité"
              value={priorityLabels[task.priority]}
            />
            <Row
              icon="repeat-outline"
              label="Récurrence"
              value={recurrenceLabels[task.recurrence]}
            />
            <Row
              icon="business-outline"
              label="Affectation"
              value={task.apartment?.name ?? "Société"}
              last
            />
          </View>
          {task.reservation ? (
            <View style={styles.reservation}>
              <Ionicons
                name="calendar-outline"
                size={21}
                color={colors.primary}
              />
              <View>
                <Text style={styles.resTitle}>
                  {task.reservation.reference}
                </Text>
                <Text style={styles.resText}>
                  {task.reservation.client_name}
                </Text>
              </View>
            </View>
          ) : null}
          {task.description ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Description</Text>
              <Text style={styles.description}>{task.description}</Text>
            </View>
          ) : null}
          {task.source === "manual" && task.status !== "cancelled" ? (
            <TouchableOpacity
              onPress={() => router.push(`/tasks/${task.id}/edit` as Href)}
              style={styles.edit}
            >
              <Ionicons name="create-outline" size={20} color="white" />
              <Text style={styles.editText}>Modifier</Text>
            </TouchableOpacity>
          ) : null}
          {task.status === "todo" ? (
            <Action
              label="Commencer"
              icon="play-circle-outline"
              disabled={working}
              onPress={() => void updateStatus("in_progress")}
            />
          ) : null}
          {!["completed", "cancelled"].includes(task.status) ? (
            <Action
              label="Marquer terminée"
              icon="checkmark-circle-outline"
              primary
              disabled={working}
              onPress={() => void updateStatus("completed")}
            />
          ) : null}
          {task.status === "completed" && task.source === "manual" ? (
            <Action
              label="Rouvrir"
              icon="refresh-outline"
              disabled={working}
              onPress={() => void updateStatus("todo")}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
function Row({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.last]}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}
function Action({
  label,
  icon,
  primary,
  disabled,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  primary?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, primary && styles.actionPrimary]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={primary ? "white" : colors.primary}
      />
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1 },
  heroLabel: {
    color: colors.gold,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroDate: {
    color: "white",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    marginTop: 4,
  },
  reminder: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.14)",
    paddingTop: spacing.md,
    marginTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: spacing.sm,
  },
  row: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  last: { borderBottomWidth: 0 },
  rowCopy: { flex: 1 },
  rowLabel: { color: colors.textMuted, fontSize: 10 },
  rowValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3,
  },
  reservation: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  resTitle: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  resText: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  description: { color: colors.text, fontSize: 13, lineHeight: 20 },
  edit: {
    minHeight: 53,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  editText: { color: "white", fontWeight: "900", fontSize: 14 },
  action: {
    minHeight: 51,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionPrimary: { backgroundColor: colors.success },
  actionText: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  actionTextPrimary: { color: "white" },
});
