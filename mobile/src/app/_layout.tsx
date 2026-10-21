import "react-native-url-polyfill/auto";

import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ConfigurationRequired } from "@/components/configuration-required";
import { colors } from "@/constants/theme";
import { appConfig, missingConfig } from "@/lib/config";

export default function RootLayout() {
  if (missingConfig.length > 0) {
    return <ConfigurationRequired variables={missingConfig} />;
  }

  return (
    <ClerkProvider publishableKey={appConfig.clerkPublishableKey} tokenCache={tokenCache}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "fade",
        }}
      />
    </ClerkProvider>
  );
}
