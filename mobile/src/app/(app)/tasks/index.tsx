import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { EmptyView, ErrorView, LoadingView } from "@/components/state-view";
import { StatusPill } from "@/components/status-pill";
import { colors, radius, spacing } from "@/constants/theme";
import {
  assigneeLabels,
  priorityLabels,
  statusLabels,
  type Task,
} from "@/features/tasks/types";
import { useTasks } from "@/hooks/use-tasks";

type Filter = "today" | "upcoming" | "late" | "all";
const dateTime = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default function TasksScreen() {
  const router = useRouter();
  const { tasks, loading, refreshing, error, reload } = useTasks();
  const [filter, setFilter] = useState<Filter>("today");
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
  const visible = useMemo(
    () => tasks.filter((task) => matches(task, filter)),
    [filter, tasks],
  );
  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void reload(true)}
          tintColor={colors.primary}
        />
      }
    >
      <PageHeading
        eyebrow="ORGANISATION"
        title="Tâches du jour"
        description="Check-in, check-out et opérations de la société."
        action={
          <TouchableOpacity
            accessibilityLabel="Nouvelle tâche"
            onPress={() => router.push("/tasks/new" as Href)}
            style={styles.add}
          >
            <Ionicons name="add" size={25} color="white" />
          </TouchableOpacity>
        }
      />
      <View style={styles.filters}>
        {(["today", "upcoming", "late", "all"] as Filter[]).map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => setFilter(item)}
            style={[styles.filter, filter === item && styles.filterActive]}
          >
            <Text
              style={[
                styles.filterText,
                filter === item && styles.filterTextActive,
              ]}
            >
              {labels[item]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? <LoadingView /> : null}
      {!loading && error ? (
        <ErrorView message={error} retry={() => void reload()} />
      ) : null}
      {!loading && !error && visible.length === 0 ? (
        <EmptyView
          title="Aucune tâche"
          message="Votre planning est à jour pour cette vue."
        />
      ) : null}
      {!loading && !error
        ? visible.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() => router.push(`/tasks/${task.id}` as Href)}
            />
          ))
        : null}
    </Screen>
  );
}
function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const late =
    new Date(task.scheduled_at) < new Date() &&
    !["completed", "cancelled"].includes(task.status);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, late && styles.late]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.icon, late && styles.iconLate]}>
          <Ionicons
            name={
              task.task_type === "check_in"
                ? "log-in-outline"
                : task.task_type === "check_out"
                  ? "log-out-outline"
                  : "checkbox-outline"
            }
            size={21}
            color={late ? colors.danger : colors.primary}
          />
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={2} style={styles.title}>
            {task.title}
          </Text>
          <Text style={styles.scope}>
            {task.apartment?.name ?? "Tâche société"}
          </Text>
        </View>
        <StatusPill
          label={statusLabels[task.status]}
          tone={
            task.status === "completed"
              ? "success"
              : late
                ? "danger"
                : task.status === "in_progress"
                  ? "warning"
                  : "primary"
          }
        />
      </View>
      <View style={styles.meta}>
        <Text style={styles.when}>
          {dateTime.format(new Date(task.scheduled_at))}
        </Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.assignee}>{assigneeLabels[task.assignee]}</Text>
        <Text style={styles.priority}>{priorityLabels[task.priority]}</Text>
      </View>
    </TouchableOpacity>
  );
}
function matches(task: Task, filter: Filter) {
  const date = new Date(task.scheduled_at);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86_400_000);
  const active = !["completed", "cancelled"].includes(task.status);
  if (filter === "today") return active && date >= start && date < end;
  if (filter === "upcoming") return active && date >= end;
  if (filter === "late") return active && date < now;
  return true;
}
const labels: Record<Filter, string> = {
  today: "Aujourd’hui",
  upcoming: "À venir",
  late: "En retard",
  all: "Toutes",
};
const styles = StyleSheet.create({
  add: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  filters: { flexDirection: "row", gap: 7, marginBottom: spacing.lg },
  filter: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: { color: colors.textMuted, fontSize: 10, fontWeight: "800" },
  filterTextActive: { color: "white" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  late: { borderColor: "#E9B9B9" },
  cardTop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLate: { backgroundColor: colors.dangerSoft },
  copy: { flex: 1 },
  title: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },
  scope: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  when: { color: colors.text, fontSize: 11, fontWeight: "700" },
  dot: { color: colors.textMuted },
  assignee: { color: colors.textMuted, fontSize: 11 },
  priority: {
    marginLeft: "auto",
    color: colors.gold,
    fontSize: 10,
    fontWeight: "900",
  },
});
