import { useClerk, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { colors, radius, spacing } from "@/constants/theme";

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();

  const handleSignOut = () => {
    Alert.alert("Se déconnecter", "Voulez-vous fermer votre session sur ce téléphone ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/sign-in");
        },
      },
    ]);
  };

  return (
    <Screen>
      <PageHeading eyebrow="PARAMÈTRES" title="Mon compte" description="Votre session administrateur sécurisée." />
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{user?.firstName?.[0] ?? user?.primaryEmailAddress?.emailAddress[0]?.toUpperCase() ?? "A"}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName ?? "Administrateur"}</Text>
        <Text style={styles.email}>{user?.primaryEmailAddress?.emailAddress ?? "Compte Clerk"}</Text>
        <View style={styles.role}>
          <Ionicons name="shield-checkmark" size={15} color={colors.success} />
          <Text style={styles.roleText}>Accès administrateur</Text>
        </View>
      </View>
      <TouchableOpacity onPress={handleSignOut} style={styles.logout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
      <Text style={styles.version}>Conciergerie mobile · Version 1.0.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xxl, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  initials: { color: colors.gold, fontSize: 26, fontWeight: "900" },
  name: { color: colors.text, fontSize: 21, fontWeight: "800" },
  email: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  role: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.successSoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.lg },
  roleText: { color: colors.success, fontSize: 12, fontWeight: "800" },
  logout: { minHeight: 54, borderRadius: radius.md, borderWidth: 1, borderColor: "#EECACA", backgroundColor: colors.dangerSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.xxl },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: "800" },
  version: { color: colors.textMuted, fontSize: 11, textAlign: "center", marginTop: spacing.xl },
});
