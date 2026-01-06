"use client"

import * as React from "react"
import {
  BookOpen,
  LayoutDashboard,
  MapPin,
  CircleDot,
  Users,
  Fingerprint,   // Icon Baru untuk Absensi
  ClipboardList  // Icon Baru untuk Data Absensi
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* --- HEADER --- */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <MapPin className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Logbook KKN</span>
                  <span className="truncate text-xs">Kabupaten Grobogan</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* --- CONTENT --- */}
      <SidebarContent>
        {/* GROUP: MENU UTAMA */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* 1. Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === "/dashboard"} 
                  tooltip="Dashboard"
                >
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 2. Absensi (BARU) */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === "/dashboard/absensi"} 
                  tooltip="Absensi"
                >
                  <Link href="/dashboard/absensi">
                    <Fingerprint />
                    <span>Absensi</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 3. Logbook Harian */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname.startsWith("/dashboard/logbook")} 
                  tooltip="Logbook Harian"
                >
                  <Link href="/dashboard/logbook">
                    <BookOpen />
                    <span>Logbook Harian</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 4. Data Absensi (BARU) */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname.startsWith("/dashboard/absensi/table")} 
                  tooltip="Data Absensi"
                >
                  <Link href="/dashboard/absensi/table">
                    <ClipboardList />
                    <span>Data Absensi</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 5. Radius */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname.startsWith("/dashboard/radius")} 
                  tooltip="Pengaturan Radius"
                >
                  <Link href="/dashboard/radius">
                    <CircleDot />
                    <span>Radius Lokasi</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 6. Manajemen User */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname.startsWith("/dashboard/management-user")} 
                  tooltip="Manajemen User"
                >
                  <Link href="/dashboard/management-user">
                    <Users />
                    <span>Manajemen User</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname.startsWith("/dashboard/stunting")} 
                  tooltip="Stunting"
                >
                  <Link href="/dashboard/stunting">
                    <Users />
                    <span>Stunting</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}