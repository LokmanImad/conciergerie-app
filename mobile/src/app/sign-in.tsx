import { useAuth } from "@clerk/expo";
import { useHostedAuth } from "@clerk/expo/hosted-auth";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, spacing } from "@/constants/theme";

export default function SignInScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const { startHostedAuth } = useHostedAuth();
  const [pending, setPending] = useState(false);

  if (isLoaded && isSignedIn) {
    return <Redirect href="/(app)" />;
  }

  const signIn = async () => {
    setPending(true);
    try {
      await startHostedAuth({ mode: "sign-in" });
    } catch {
      Alert.alert("Connexion impossible", "Vérifiez la configuration Clerk et réessayez.");
    } finally {
      setPending(false);
    }
  };

  return (
    <LinearGradient colors={[colors.primary, "#0C2E2B"]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="sparkles" size={26} color={colors.gold} />
          </View>
          <Text style={styles.brandName}>CONCIERGERIE</Text>
          <Text style={styles.brandTag}>GESTION PRIVÉE</Text>
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>Vos opérations,{"\n"}partout avec vous.</Text>
          <Text style={styles.subtitle}>
            Gérez les réservations et les dossiers voyageurs directement depuis votre téléphone.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.lockRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
            <Text style={styles.lockText}>Accès réservé aux administrateurs</Text>
          </View>
          <TouchableOpacity disabled={pending || !isLoaded} onPress={signIn} style={styles.button} activeOpacity={0.85}>
            {pending ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.buttonText}>Se connecter</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.help}>Utilisez le même compte que sur l’application web.</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1, padding: spacing.xxl },
  brand: { alignItems: "center", paddingTop: spacing.xxl },
  logo: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    marginBottom: spacing.md,
  },
  brandName: { color: "white", fontSize: 15, fontWeight: "900", letterSpacing: 2.4 },
  brandTag: { color: colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 2, marginTop: 4 },
  copy: { flex: 1, justifyContent: "center" },
  title: { color: "white", fontSize: 38, lineHeight: 44, fontWeight: "800", letterSpacing: -1 },
  subtitle: { color: "rgba(255,255,255,0.7)", fontSize: 16, lineHeight: 24, marginTop: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl },
  lockRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  lockText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  button: {
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "800" },
  help: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: spacing.md },
});
