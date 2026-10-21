import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity } from "react-native";

import { colors, radius } from "@/constants/theme";

export function NavigationBackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityLabel="Retour" onPress={onPress} style={styles.button}>
      <Ionicons name="arrow-back" size={22} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
