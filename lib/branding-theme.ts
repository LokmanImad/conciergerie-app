import type { CSSProperties } from "react";

import type { PublicCompanyBranding } from "@/features/platform/types";

export const DEFAULT_BRANDING_COLORS = {
  primary: "#123F3A",
  accent: "#C79A4A",
} as const;

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;

function normalizeHex(value: string | null | undefined, fallback: string) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : fallback;
}

function readableForeground(hex: string) {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const linear = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
  return luminance > 0.48 ? "#172021" : "#FFFFFF";
}

export function getBrandingThemeStyle(
  branding: Pick<PublicCompanyBranding, "primary_color" | "accent_color"> | null,
): ThemeStyle | undefined {
  if (!branding) return undefined;

  const primary = normalizeHex(branding.primary_color, DEFAULT_BRANDING_COLORS.primary);
  const accent = normalizeHex(branding.accent_color, DEFAULT_BRANDING_COLORS.accent);

  return {
    "--primary": primary,
    "--primary-foreground": readableForeground(primary),
    "--ring": primary,
    "--accent": accent,
    "--accent-foreground": readableForeground(accent),
    "--secondary": `color-mix(in srgb, ${accent} 14%, white)`,
    "--secondary-foreground": primary,
    "--chart-1": primary,
    "--chart-3": accent,
    "--sidebar": `color-mix(in srgb, ${primary} 42%, #07191B)`,
    "--sidebar-foreground": "#EAF1F0",
    "--sidebar-primary": accent,
    "--sidebar-primary-foreground": readableForeground(accent),
    "--sidebar-accent": `color-mix(in srgb, ${primary} 62%, #19383A)`,
    "--sidebar-accent-foreground": "#FFFFFF",
    "--sidebar-border": `color-mix(in srgb, ${primary} 58%, #6D8585)`,
    "--sidebar-ring": accent,
  };
}
