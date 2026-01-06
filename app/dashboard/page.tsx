"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from "@/components/ui/card"
import { 
  Activity, 
  BookOpen, 
  CalendarCheck, 
  Users, 
  ArrowUpRight,
  MoreHorizontal,
  Clock,
  Loader2 
} from "lucide-react"
import { Button } from "@/components/ui/button"

type UserSession = {
  id: string
  email: string
  full_name: string
  avatar_url?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const sessionStr = localStorage.getItem("user_session")
      
      if (!sessionStr) {
        router.replace("/auth/login") 
        return
      }

      try {
        const parsedUser = JSON.parse(sessionStr)
        setUser(parsedUser)
        setLoading(false)
      } catch (e) {
        console.error("Gagal parsing session", e)
        localStorage.removeItem("user_session")
        router.replace("/auth/login")
      }
    }

    checkAuth()
  }, [router])

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  })

  const stats = [
    {
      title: "Total Logbook",
      value: "12",
      desc: "+2 minggu ini",
      icon: BookOpen,
      trend: "up" 
    },
    {
      title: "Sisa Hari",
      value: "32",
      desc: "Menuju penarikan",
      icon: CalendarCheck,
      trend: "neutral"
    },
    {
      title: "Kehadiran",
      value: "98%",
      desc: "Sangat Baik",
      icon: Users,
      trend: "up"
    },
    {
      title: "Status",
      value: "Aktif",
      desc: "Mahasiswa KKN",
      icon: Activity,
      trend: "neutral"
    }
  ]

  const recentActivities = [
    { id: 1, title: "Sosialisasi Pentingnya Gizi", date: "Hari ini, 09:00", status: "Disetujui" },
    { id: 2, title: "Kerja Bakti Balai Desa", date: "Kemarin, 15:30", status: "Menunggu" },
    { id: 3, title: "Mengajar TPA Sore", date: "2 Jan 2026", status: "Disetujui" },
  ]

  if (loading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-50" />
          <p className="text-sm font-medium">Memuat Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-1">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Halo, {user?.full_name?.split(" ")[0] || "Mahasiswa"}! 👋
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Ringkasan aktivitas KKN Anda hari ini, <span className="font-medium text-zinc-700 dark:text-zinc-300">{today}</span>.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
           <Button variant="outline" className="h-9 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
             <Clock className="mr-2 h-4 w-4" /> Riwayat
           </Button>
           <Button className="h-9 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">
             <ArrowUpRight className="mr-2 h-4 w-4" /> Export Laporan
           </Button>
        </div>
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm hover:shadow-md dark:shadow-none transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                {stat.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        
        {/* GRAFIK */}
        <Card className="col-span-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Aktivitas Mingguan</CardTitle>
            <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">Grafik partisipasi kegiatan KKN</CardDescription>
          </CardHeader>
          <CardContent className="pl-6 pr-6 pb-6">
            {/* FIX: h-[250px] -> h-62.5 */}
            <div className="h-62.5 w-full flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-950/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 gap-3">
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-full border border-zinc-100 dark:border-zinc-800 shadow-sm">
                 <Activity className="h-6 w-6 text-zinc-300 dark:text-zinc-700" />
              </div>
              <span className="text-sm font-medium">Data grafik belum tersedia</span>
            </div>
          </CardContent>
        </Card>
        
        {/* LOGBOOK TERBARU */}
        <Card className="col-span-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
               <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Logbook Terbaru</CardTitle>
               <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">3 kegiatan terakhir yang Anda catat</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200">
               <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
               {recentActivities.map((item) => (
                 <div key={item.id} className="flex items-start justify-between group">
                   <div className="flex gap-3">
                     {/* Timeline Line */}
                     <div className="relative mt-1">
                        <div className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700 ring-4 ring-zinc-50 dark:ring-zinc-900 group-hover:bg-zinc-900 dark:group-hover:bg-zinc-200 group-hover:ring-zinc-100 dark:group-hover:ring-zinc-800 transition-all"></div>
                     </div>
                     
                     <div className="space-y-1">
                       <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer">
                         {item.title}
                       </p>
                       <p className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                         {item.date}
                       </p>
                     </div>
                   </div>

                   {/* Status Badge */}
                   <div className={`text-[10px] font-medium px-2.5 py-1 rounded-full border 
                      ${item.status === "Disetujui" 
                        ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" 
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                      }`}>
                     {item.status}
                   </div>
                 </div>
               ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
               <Button variant="outline" className="w-full text-xs h-9 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors">
                  Lihat Semua Logbook
               </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}