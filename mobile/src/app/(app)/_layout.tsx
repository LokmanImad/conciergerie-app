import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, useRouter, type Href } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { colors, radius, shadow, spacing } from "@/constants/theme";
import { AccountAccessScreen } from "@/components/account-access-screen";
import { DeviceAccessScreen } from "@/components/device-access-screen";
import { useAccountAccess } from "@/hooks/use-account-access";
import { useDeviceAccess } from "@/hooks/use-device-access";
import { useTaskNotifications } from "@/hooks/use-task-notifications";
import { useMobileEntitlements } from "@/hooks/use-mobile-entitlements";

const quickActions: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
  module: string;
}[] = [
  {
    title: "Ajouter une charge",
    description: "Enregistrer rapidement une nouvelle dépense",
    icon: "receipt-outline",
    href: "/charges/new",
    module: "charges",
  },
  {
    title: "Ajouter une réservation",
    description: "Créer un nouveau séjour",
    icon: "calendar-outline",
    href: "/reservations/new",
    module: "reservations",
  },
  {
    title: "Ajouter une tâche",
    description: "Planifier une tâche ou une alerte",
    icon: "checkbox-outline",
    href: "/tasks/new",
    module: "tasks",
  },
];

export default function AppLayout() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const router = useRouter();
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const accountAccess = useAccountAccess(Boolean(isLoaded && isSignedIn));
  const entitlements = useMobileEntitlements(Boolean(
    isLoaded && isSignedIn && accountAccess.allowed,
  ));
  const deviceCheckEnabled = Boolean(
    isLoaded
    && isSignedIn
    && accountAccess.allowed
    && entitlements.configured
    && entitlements.mobileAllowed,
  );
  const deviceAccess = useDeviceAccess(deviceCheckEnabled);
  useTaskNotifications(Boolean(
    deviceCheckEnabled
    && !deviceAccess.loading
    && (!deviceAccess.configured || deviceAccess.allowed),
  ));

  if (!isLoaded || accountAccess.loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  if (accountAccess.configured && !accountAccess.allowed) {
    return (
      <AccountAccessScreen
        access={accountAccess}
        loading={accountAccess.checking}
        onRetry={() => void accountAccess.retry()}
        onSignOut={() => void signOut()}
      />
    );
  }

  if (entitlements.loading || deviceAccess.loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!entitlements.mobileAllowed) {
    return (
      <View style={styles.accessBlocked}>
        <View style={styles.accessBlockedIcon}>
          <Ionicons name="phone-portrait-outline" size={28} color={colors.gold} />
        </View>
        <Text style={styles.accessBlockedTitle}>Accès mobile non inclus</Text>
        <Text style={styles.accessBlockedText}>
          La licence de votre société n’autorise pas actuellement l’application mobile.
          Contactez votre administrateur pour activer cette option.
        </Text>
      </View>
    );
  }

  if (deviceAccess.configured && !deviceAccess.allowed) {
    return (
      <DeviceAccessScreen
        status={deviceAccess.status}
        deviceId={deviceAccess.device_id}
        loading={deviceAccess.loading}
        onRetry={() => void deviceAccess.retry()}
        onSignOut={() => void signOut()}
      />
    );
  }

  const openQuickAction = (href: Href) => {
    setQuickActionsOpen(false);
    router.push(href);
  };
  const availableQuickActions = quickActions.filter((action) =>
    entitlements.canUse(action.module),
  );

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.background },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: "#8A938F",
          tabBarHideOnKeyboard: true,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: "Réservations",
          href: entitlements.canUse("reservations") ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="quick-add"
        options={{
          title: "",
          href:
            entitlements.canUse("charges") ||
            entitlements.canUse("reservations") ||
            entitlements.canUse("tasks")
              ? undefined
              : null,
          tabBarLabel: () => null,
          tabBarButton: () => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Ajouter"
              activeOpacity={0.86}
              onPress={() => setQuickActionsOpen(true)}
              style={styles.quickAddTab}
            >
              <Ionicons name="add" color={colors.surface} size={34} />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="travelers"
        options={{
          title: "Voyageurs",
          href: entitlements.canUse("travelers") ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Plus",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal-circle-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="charges" options={{ href: null }} />
      <Tabs.Screen name="tasks" options={{ href: null }} />
      <Tabs.Screen name="contracts" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>

      <Modal
        animationType="fade"
        onRequestClose={() => setQuickActionsOpen(false)}
        transparent
        visible={quickActionsOpen}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Fermer les actions rapides"
            onPress={() => setQuickActionsOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.quickSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeading}>
              <View>
                <Text style={styles.sheetEyebrow}>ACTION RAPIDE</Text>
                <Text style={styles.sheetTitle}>Que voulez-vous ajouter ?</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                onPress={() => setQuickActionsOpen(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.quickActionList}>
              {availableQuickActions.map((action) => (
                <TouchableOpacity
                  key={action.title}
                  accessibilityRole="button"
                  accessibilityLabel={action.title}
                  activeOpacity={0.76}
                  onPress={() => openQuickAction(action.href)}
                  style={styles.quickAction}
                >
                  <View style={styles.quickActionIcon}>
                    <Ionicons name={action.icon} size={22} color={colors.primary} />
                  </View>
                  <View style={styles.quickActionCopy}>
                    <Text style={styles.quickActionTitle}>{action.title}</Text>
                    <Text style={styles.quickActionDescription}>{action.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  tabBar: {
    height: 72,
    paddingTop: 8,
    paddingBottom: 9,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
  },
  tabLabel: { fontSize: 10, fontWeight: "700" },
  accessBlocked: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxxl,
    backgroundColor: colors.background,
  },
  accessBlockedIcon: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  accessBlockedTitle: {
    marginTop: spacing.xl,
    color: colors.text,
    fontSize: 23,
    fontWeight: "900",
    textAlign: "center",
  },
  accessBlockedText: {
    maxWidth: 360,
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  quickAddTab: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: -15,
    borderWidth: 4,
    borderColor: colors.background,
    borderRadius: 29,
    backgroundColor: colors.primary,
    ...shadow.card,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(12, 25, 22, 0.46)",
  },
  quickSheet: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.background,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    alignSelf: "center",
    marginBottom: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  sheetHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sheetEyebrow: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  sheetTitle: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  quickActionList: {
    overflow: "hidden",
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  quickAction: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quickActionIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  quickActionCopy: { flex: 1, marginHorizontal: spacing.md },
  quickActionTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  quickActionDescription: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
});
