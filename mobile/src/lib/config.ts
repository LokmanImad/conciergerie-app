export const appConfig = {
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  webAppUrl: (process.env.EXPO_PUBLIC_WEB_APP_URL ?? "").replace(/\/$/, ""),
  supabasePublishableKey:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    "",
};

export const missingConfig = [
  !appConfig.clerkPublishableKey && "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  !appConfig.supabaseUrl && "EXPO_PUBLIC_SUPABASE_URL",
  !appConfig.supabasePublishableKey && "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
].filter(Boolean) as string[];
