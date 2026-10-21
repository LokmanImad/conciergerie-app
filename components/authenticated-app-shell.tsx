"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Loader2Icon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { MobileAppHeader } from "@/components/mobile-app-header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { WebAccessGate } from "@/components/web-access-gate";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/check-in"];

export function AuthenticatedAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  useEffect(() => {
    if (isLoaded && !isSignedIn && !isPublic) {
      router.replace("/sign-in");
    }
  }, [isLoaded, isPublic, isSignedIn, router]);

  if (isPublic) return children;

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2Icon className="size-7 animate-spin text-primary" />
        <span className="sr-only">Vérification de la session</span>
      </div>
    );
  }

  return (
    <WebAccessGate>
      <SidebarProvider>
        <AppSidebar />
        <main className="app-main min-w-0 w-full">
          <MobileAppHeader />
          {children}
        </main>
      </SidebarProvider>
    </WebAccessGate>
  );
}
