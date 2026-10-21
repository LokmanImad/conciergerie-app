"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignInButton, UserButton, useClerk, useUser } from "@clerk/nextjs";
import {
  Building2Icon,
  CalendarDaysIcon,
  CalculatorIcon,
  CoinsIcon,
  FileSignatureIcon,
  FileTextIcon,
  HomeIcon,
  LayoutDashboardIcon,
  LogInIcon,
  LogOutIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ListTodoIcon,
  UsersRoundIcon,
  WalletCardsIcon,
  WrenchIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useEntitlements } from "@/hooks/use-entitlements";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const menuSections = [
  {
    label: "Vue générale",
    items: [{ title: "Tableau de bord", href: "/", icon: LayoutDashboardIcon, module: "dashboard" }],
  },
  {
    label: "Opérations",
    items: [
      { title: "Réservations", href: "/reservations", icon: CalendarDaysIcon, module: "reservations" },
      { title: "Voyageurs", href: "/voyageurs", icon: UsersRoundIcon, module: "travelers" },
      { title: "Appartements", href: "/appartements", icon: Building2Icon, module: "apartments" },
      { title: "Charges", href: "/charges", icon: ReceiptTextIcon, module: "charges" },
      { title: "Tâches", href: "/taches", icon: ListTodoIcon, module: "tasks" },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Comptabilité", href: "/comptabilite", icon: CalculatorIcon, module: "accounting" },
      { title: "Factures", href: "/factures", icon: FileTextIcon, module: "invoices" },
      { title: "Portefeuilles", href: "/portefeuilles", icon: WalletCardsIcon, module: "wallets" },
      { title: "Paiements", href: "/paiements", icon: CoinsIcon, module: "payments" },
      { title: "Propriétaires", href: "/proprietaires", icon: HomeIcon, module: "owner_billing" },
      { title: "Contrats", href: "/contrats", icon: FileSignatureIcon, module: "contracts" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { title: "Types de services", href: "/services", icon: WrenchIcon, module: "services" },
      { title: "Plateforme", href: "/plateforme", icon: ShieldCheckIcon, platformOnly: true },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const entitlements = useEntitlements();

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
    router.refresh();
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border/60 px-3 py-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div
            className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_8px_24px_rgba(0,0,0,0.18)] group-data-[collapsible=icon]:hidden"
            style={entitlements.branding?.primary_color ? { backgroundColor: entitlements.branding.primary_color } : undefined}
          >
            {entitlements.branding?.logo_url ? (
              <img src={entitlements.branding.logo_url} alt="" className="size-full object-cover" />
            ) : (
              <SparklesIcon className="size-5" />
            )}
          </div>
          <SidebarTrigger className="hidden size-10 shrink-0 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white group-data-[collapsible=icon]:flex!" />
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <h2 className="truncate text-base font-bold tracking-tight text-white">
              {entitlements.branding?.name ?? "Concierge"}
            </h2>
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.15em] text-sidebar-foreground/55">
              Espace de gestion
            </p>
          </div>
          <SidebarTrigger className="shrink-0 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {menuSections.map((section) => {
          const visibleItems = section.items.filter(
            (item) =>
              (!("platformOnly" in item) || !item.platformOnly || entitlements.platformAdmin) &&
              entitlements.canUse("module" in item ? item.module : undefined),
          );
          if (visibleItems.length === 0) return null;
          return (
          <SidebarGroup key={section.label} className="py-2">
            <SidebarGroupLabel className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/35">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {visibleItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive(item.href)}
                      className="h-10 rounded-xl px-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white data-[active=true]:bg-sidebar-primary data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-[0_8px_22px_rgba(0,0,0,0.16)] group-data-[collapsible=icon]:size-10!"
                    >
                      <Link href={item.href}>
                        <item.icon className="size-[18px]" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 p-3">
        {isSignedIn ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-2xl bg-sidebar-accent/70 p-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "size-9 ring-2 ring-sidebar-primary/35",
                  },
                }}
              />
              <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.fullName || "Administrateur"}
                </p>
                <p className="truncate text-[11px] text-sidebar-foreground/50">
                  Accès administrateur
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
              onClick={handleSignOut}
              title="Se déconnecter"
            >
              <LogOutIcon className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">
                Se déconnecter
              </span>
            </Button>
          </div>
        ) : (
          <SignInButton mode="modal">
            <Button variant="outline" className="w-full">
              <LogInIcon className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">
                Se connecter
              </span>
            </Button>
          </SignInButton>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
