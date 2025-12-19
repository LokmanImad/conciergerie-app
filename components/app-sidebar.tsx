"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  BuildingIcon,
  WrenchIcon,
  ReceiptIcon,
  CalendarIcon,
  WalletIcon,
  CoinsIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const menuItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboardIcon },
  { title: "Appartements", href: "/appartements", icon: BuildingIcon },
  { title: "Types de services", href: "/services", icon: WrenchIcon },
  { title: "Charges", href: "/charges", icon: ReceiptIcon },
  { title: "Réservations", href: "/reservations", icon: CalendarIcon },
  { title: "Portefeuilles", href: "/portefeuilles", icon: WalletIcon },
  { title: "Paiements", href: "/paiements", icon: CoinsIcon },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Conciergerie</h2>
            <p className="text-xs text-muted-foreground">Gestion d'appartements</p>
          </div>
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
