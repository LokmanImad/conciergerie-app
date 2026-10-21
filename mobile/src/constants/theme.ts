export const colors = {
  primary: "#123F3A",
  primaryLight: "#1B5A52",
  primarySoft: "#E5EFEC",
  gold: "#C79A4A",
  goldSoft: "#F5EBD7",
  background: "#F6F3EC",
  surface: "#FFFFFF",
  surfaceMuted: "#EFEEE9",
  text: "#17201E",
  textMuted: "#68736F",
  border: "#E3E1DA",
  success: "#2E7D5B",
  successSoft: "#E5F3EC",
  warning: "#B7791F",
  warningSoft: "#FAEED6",
  danger: "#B54A4A",
  dangerSoft: "#F9E8E8",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: "#173F39",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
} as const;
