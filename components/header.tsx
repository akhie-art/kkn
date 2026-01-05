"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { 
  Moon, 
  Sun, 
  LogOut, 
  User, 
  Settings, 
  ChevronDown 
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [dark, setDark] = useState(false)
  const [user, setUser] = useState<{ full_name: string; email: string; avatar_url?: string } | null>(null)

  // 1. Load User Session & Theme (Updated Logic)
  useEffect(() => {
    // Cek Session
    const session = localStorage.getItem("user_session")
    if (session) {
      try {
        setUser(JSON.parse(session))
      } catch (e) {
        console.error("Error parsing session", e)
      }
    }

    // Cek Theme dari LocalStorage atau System Preference saat load
    const savedTheme = localStorage.getItem("theme")
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      setDark(true)
      document.documentElement.classList.add("dark")
    } else {
      setDark(false)
      document.documentElement.classList.remove("dark")
    }
  }, [])

  // Fungsi Toggle Theme dengan Persistence
  const toggleTheme = () => {
    const newDark = !dark
    setDark(newDark)
    if (newDark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  // 2. Logic Logout
  const handleLogout = () => {
    localStorage.removeItem("user_session")
    toast.success("Logout Berhasil", { description: "Sampai jumpa lagi!" })
    router.replace("/auth/login") 
  }

  // 3. Dynamic Title Helper
  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard"
    if (pathname.includes("/logbook")) return "Logbook Harian"
    if (pathname.includes("/profile")) return "Profil Saya"
    if (pathname.includes("/settings")) return "Pengaturan"
    return "Aplikasi"
  }

  const getInitials = (name: string) => {
    return name?.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2) || "US"
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 px-4 backdrop-blur-md md:px-6 transition-colors duration-200">
      <div className="flex items-center gap-2">
        {/* Tombol Sidebar */}
        <SidebarTrigger className="-ml-1 h-8 w-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50" />
        
        <Separator orientation="vertical" className="mr-2 h-4 bg-zinc-200 dark:bg-zinc-800" />
        
        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block text-zinc-300 dark:text-zinc-700" />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-zinc-900 dark:text-zinc-50">
                {getPageTitle()}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex items-center gap-3">
        
        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme} 
          className="h-9 w-9 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 rounded-full pl-2 pr-1 gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 data-[state=open]:bg-zinc-100 dark:data-[state=open]:bg-zinc-800 transition-colors">
              <div className="text-right hidden sm:block mr-1">
                <p className="text-sm font-medium leading-none text-zinc-900 dark:text-zinc-50">
                  {user?.full_name || "Guest"}
                </p>
              </div>
              <Avatar className="h-8 w-8 border border-zinc-200 dark:border-zinc-800">
                <AvatarImage src={user?.avatar_url} alt={user?.full_name} className="object-cover" />
                <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold">
                  {getInitials(user?.full_name || "")}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3 w-3 text-zinc-400 dark:text-zinc-500 sm:block hidden" />
            </Button>
          </DropdownMenuTrigger>
          
          {/* Dropdown Content */}
          <DropdownMenuContent className="w-56 mt-1 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg rounded-xl" align="end" forceMount>
            <DropdownMenuLabel className="font-normal p-3">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-zinc-900 dark:text-zinc-50">
                  {user?.full_name || "Pengguna"}
                </p>
                <p className="text-xs leading-none text-zinc-500 dark:text-zinc-400 truncate">
                  {user?.email || "Belum login"}
                </p>
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
            
            <DropdownMenuItem className="cursor-pointer text-zinc-600 dark:text-zinc-400 focus:text-zinc-900 dark:focus:text-zinc-50 focus:bg-zinc-50 dark:focus:bg-zinc-800 rounded-lg mx-1 my-0.5" onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" /> 
              <span>Profil Saya</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem className="cursor-pointer text-zinc-600 dark:text-zinc-400 focus:text-zinc-900 dark:focus:text-zinc-50 focus:bg-zinc-50 dark:focus:bg-zinc-800 rounded-lg mx-1 my-0.5" onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" /> 
              <span>Pengaturan</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
            
            <DropdownMenuItem 
              onClick={handleLogout}
              className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300 focus:bg-red-50 dark:focus:bg-red-900/20 rounded-lg mx-1 my-0.5 mb-1"
            >
              <LogOut className="mr-2 h-4 w-4" /> 
              <span>Keluar Aplikasi</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}