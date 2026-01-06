"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { 
  BookOpen, 
  Users, 
  Baby,
  Loader2 
} from "lucide-react"

// Inisialisasi Supabase menggunakan environment variables dari .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  const [stats, setStats] = useState({
    totalLogbook: 0,
    totalMahasiswa: 0,
    totalStunting: 0
  })

  useEffect(() => {
    const fetchData = async () => {
      // 1. Validasi Session dari Local Storage
      const sessionStr = localStorage.getItem("user_session")
      if (!sessionStr) {
        router.replace("/auth/login")
        return
      }

      try {
        const parsedUser = JSON.parse(sessionStr)
        setUser(parsedUser)

        // 2. Fetch data jumlah baris dari tabel terkait
        const [resLogbook, resMahasiswa, resStunting] = await Promise.all([
          supabase.from('logbooks').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'mahasiswa'),
          supabase.from('stunting').select('*', { count: 'exact', head: true })
        ])

        setStats({
          totalLogbook: resLogbook.count || 0,
          totalMahasiswa: resMahasiswa.count || 0,
          totalStunting: resStunting.count || 0
        })
      } catch (e) {
        console.error("Gagal mengambil data statistik:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  })

  // Data mapping untuk 3 Card Utama yang diminta
  const cardsData = [
    {
      title: "Total Logbook",
      value: stats.totalLogbook.toLocaleString(),
      desc: "Laporan kegiatan terkumpul",
      icon: BookOpen,
      color: "text-blue-500"
    },
    {
      title: "Total Mahasiswa",
      value: stats.totalMahasiswa.toLocaleString(),
      desc: "Mahasiswa KKN terdaftar",
      icon: Users,
      color: "text-emerald-500"
    },
    {
      title: "Total Stunting",
      value: stats.totalStunting.toLocaleString(),
      desc: "Anak dalam pendataan",
      icon: Baby,
      color: "text-rose-500"
    }
  ]

  if (loading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-50" />
          <p className="text-sm font-medium">Memuat Data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-1">
      
      {/* HEADER SECTION (Tanpa Button) */}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Halo, {user?.full_name?.split(" ")[0] || "User"}! 👋
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Ringkasan data program KKN, <span className="font-medium text-zinc-700 dark:text-zinc-300">{today}</span>.
        </p>
      </div>

      {/* STATS CARDS (3 UTAMA) */}
      <div className="grid gap-4 md:grid-cols-3">
        {cardsData.map((card, i) => (
          <Card key={i} className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {card.value}
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                {card.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  )
}