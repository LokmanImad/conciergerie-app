import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { colors, radius, shadow, spacing } from "@/constants/theme";
import { useMobileEntitlements } from "@/hooks/use-mobile-entitlements";

type MenuItem = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: Href;
  tone: "primary" | "gold" | "success" | "neutral";
  module?: string;
};

const managementItems: MenuItem[] = [
  {
    title: "Charges",
    description: "Ajouter et consulter les dépenses",
    icon: "receipt-outline",
    route: "/charges",
    tone: "gold",
    module: "charges",
  },
  {
    title: "Tâches",
    description: "Organiser les tâches et les alertes",
    icon: "checkbox-outline",
    route: "/tasks",
    tone: "success",
    module: "tasks",
  },
  {
    title: "Contrats",
    description: "Gérer les contrats des propriétaires",
    icon: "document-text-outline",
    route: "/contracts",
    tone: "primary",
    module: "contracts",
  },
];

const accountItems: MenuItem[] = [
  {
    title: "Mon compte",
    description: "Profil, sécurité et déconnexion",
    icon: "person-circle-outline",
    route: "/profile",
    tone: "neutral",
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const entitlements = useMobileEntitlements(true);
  const visibleManagementItems = managementItems.filter(
    (item) => !item.module || entitlements.canUse(item.module),
  );

  return (
    <Screen>
      <PageHeading
        eyebrow="OUTILS"
        title="Plus"
        description="Retrouvez les fonctions complémentaires de votre conciergerie."
        action={
          <View style={styles.headingIcon}>
            <Ionicons name="apps-outline" size={23} color={colors.gold} />
          </View>
        }
      />

      <MenuSection
        title="Gestion"
        items={visibleManagementItems}
        onPress={(route) => router.push(route)}
      />
      <MenuSection
        title="Paramètres"
        items={accountItems}
        onPress={(route) => router.push(route)}
      />
    </Screen>
  );
}

function MenuSection({
  title,
  items,
  onPress,
}: {
  title: string;
  items: MenuItem[];
  onPress: (route: Href) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.title}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            activeOpacity={0.72}
            onPress={() => onPress(item.route)}
            style={[styles.row, index > 0 && styles.rowBorder]}
          >
            <View style={[styles.iconBox, iconToneStyles[item.tone]]}>
              <Ionicons
                name={item.icon}
                size={22}
                color={iconColorByTone[item.tone]}
              />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const iconColorByTone = {
  primary: colors.primary,
  gold: colors.gold,
  success: colors.success,
  neutral: colors.textMuted,
} as const;

const iconToneStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primarySoft },
  gold: { backgroundColor: colors.goldSoft },
  success: { backgroundColor: colors.successSoft },
  neutral: { backgroundColor: colors.surfaceMuted },
});

const styles = StyleSheet.create({
  headingIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  section: { marginBottom: spacing.xxl },
  sectionTitle: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  row: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  iconBox: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  copy: { flex: 1, marginHorizontal: spacing.md },
  title: { color: colors.text, fontSize: 15, fontWeight: "800" },
  description: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
});
