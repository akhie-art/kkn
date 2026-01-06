"use client"

import * as React from "react"
import {
  BookOpen,
  LayoutDashboard,
  MapPin,
  CircleDot,
  Users,
  Baby,
  Fingerprint,
  ClipboardList,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

// Data Menu Utama
const mainNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Absensi", url: "/dashboard/absensi", icon: Fingerprint },
  { title: "Data Absensi", url: "/dashboard/absensi/table", icon: ClipboardList },
  { title: "Logbook Harian", url: "/dashboard/logbook", icon: BookOpen },
  { title: "Stunting", url: "/dashboard/stunting", icon: Baby },
]

// Data Menu Pengaturan/Admin
const adminNav = [
  { title: "Radius Lokasi", url: "/dashboard/radius", icon: CircleDot },
  { title: "Manajemen User", url: "/dashboard/management-user", icon: Users },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r" {...props}>
      {/* --- HEADER --- */}
      <SidebarHeader className="py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <Link href="/dashboard">
                <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 text-primary-foreground">
                  <MapPin className="size-5" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                  <span className="truncate font-bold text-base">Logbook KKN</span>
                  <span className="truncate text-xs text-muted-foreground font-medium">Kab. Grobogan</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* GROUP 1: OPERASIONAL */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Menu Utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url))
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.title}
                      className={`mb-1 transition-all duration-200 ${isActive ? 'bg-primary/10 font-medium' : 'hover:bg-secondary'}`}
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon className={`size-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={isActive ? "text-primary" : "text-foreground"}>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* GROUP 2: PENGATURAN */}
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Administrasi
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNav.map((item) => {
                const isActive = pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.title}
                      className={`mb-1 transition-all duration-200 ${isActive ? 'bg-primary/10 font-medium' : 'hover:bg-secondary'}`}
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon className={`size-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={isActive ? "text-primary" : "text-foreground"}>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}