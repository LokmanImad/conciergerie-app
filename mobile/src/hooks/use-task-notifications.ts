import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";

import { useSupabaseClient } from "@/lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useTaskNotifications(enabled: boolean) {
  const supabase = useSupabaseClient();
  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;
    const sync = async () => {
      if (Platform.OS === "android")
        await Notifications.setNotificationChannelAsync("tasks", {
          name: "Tâches et rappels",
          importance: Notifications.AndroidImportance.HIGH,
          sound: "default",
        });
      const current = await Notifications.getPermissionsAsync();
      const permission = current.granted
        ? current
        : await Notifications.requestPermissionsAsync();
      if (!permission.granted) return;
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduled
          .filter((item) => item.content.data?.source === "concierge-task")
          .map((item) =>
            Notifications.cancelScheduledNotificationAsync(item.identifier),
          ),
      );
      const { data } = await supabase
        .from("tasks")
        .select(
          "id, title, scheduled_at, reminder_at, apartment:apartments(name)",
        )
        .in("status", ["todo", "in_progress"])
        .not("reminder_at", "is", null)
        .gte("scheduled_at", new Date(Date.now() - 3_600_000).toISOString())
        .order("reminder_at")
        .limit(50);
      for (const item of data ?? []) {
        const relation = Array.isArray(item.apartment)
          ? item.apartment[0]
          : item.apartment;
        const reminder = Math.max(
          new Date(item.reminder_at as string).getTime(),
          Date.now() + 3_000,
        );
        await Notifications.scheduleNotificationAsync({
          content: {
            title: item.title,
            body: relation?.name ?? "Tâche société",
            sound: "default",
            data: { source: "concierge-task", taskId: item.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(reminder),
            channelId: Platform.OS === "android" ? "tasks" : undefined,
          },
        });
      }
    };
    void sync();
    const interval = setInterval(() => void sync(), 15 * 60 * 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void sync();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [enabled, supabase]);
}
