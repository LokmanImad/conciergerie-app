import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/constants/theme";

type Tone = "neutral" | "success" | "warning" | "danger" | "primary";

const tones: Record<Tone, { backgroundColor: string; color: string }> = {
  neutral: { backgroundColor: colors.surfaceMuted, color: colors.textMuted },
  success: { backgroundColor: colors.successSoft, color: colors.success },
  warning: { backgroundColor: colors.warningSoft, color: colors.warning },
  danger: { backgroundColor: colors.dangerSoft, color: colors.danger },
  primary: { backgroundColor: colors.primarySoft, color: colors.primary },
};

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.pill, { backgroundColor: tones[tone].backgroundColor }]}>
      <Text style={[styles.label, { color: tones[tone].color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  label: { fontSize: 11, fontWeight: "800" },
});
