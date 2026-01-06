import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, BookOpen, MapPin, ShieldCheck } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      
      {/* --- HEADER / NAVBAR --- */}
      {/* FIX 1: supports-[backdrop-filter] diubah menjadi syntax standar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          {/* Logo Section */}
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <span>KKN App</span>
          </div>

          {/* Navigation Buttons */}
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Masuk
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm">Daftar Akun</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        
        {/* --- HERO SECTION --- */}
        {/* FIX 2: bg-gradient-to-b diubah menjadi bg-linear-to-b (Standar Tailwind v4) */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-linear-to-b from-white via-zinc-50 to-white dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="inline-block rounded-lg bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 mb-4">
                🎉 Sistem KKN Terintegrasi 2026
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-zinc-900 dark:text-zinc-50">
                  Dokumentasi KKN <br className="hidden md:inline" />
                  <span className="text-primary">Lebih Mudah & Terstruktur</span>
                </h1>
                {/* FIX 3: max-w-[700px] diubah menjadi max-w-175 (700px / 4 = 175) */}
                <p className="mx-auto max-w-175 text-zinc-500 md:text-xl dark:text-zinc-400">
                  Sistem logbook digital dengan fitur absensi wajah, validasi radius lokasi, dan pelaporan real-time untuk mahasiswa dan DPL.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <Link href="/auth/login">
                  <Button className="h-11 px-8 w-full sm:w-auto" size="lg">
                    Mulai Sekarang <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/about">
                  <Button variant="outline" className="h-11 px-8 w-full sm:w-auto bg-background" size="lg">
                    Pelajari Sistem
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* --- FEATURES SECTION --- */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-zinc-950 border-t">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Fitur Unggulan</h2>
              <p className="text-zinc-500 mt-2">Teknologi modern untuk mendukung kegiatan pengabdian.</p>
            </div>
            
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              
              {/* Feature 1 */}
              <div className="group flex flex-col items-center space-y-4 text-center p-6 border rounded-2xl bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                <div className="p-4 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <BookOpen className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Logbook Digital</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Catat kegiatan harian dengan mudah, lengkap dengan upload foto dokumentasi kegiatan secara real-time.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group flex flex-col items-center space-y-4 text-center p-6 border rounded-2xl bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                <div className="p-4 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Absensi Wajah (AI)</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Validasi kehadiran anti-titip absen menggunakan teknologi Face Recognition yang akurat dan cepat.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group flex flex-col items-center space-y-4 text-center p-6 border rounded-2xl bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                <div className="p-4 rounded-full bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 group-hover:scale-110 transition-transform">
                  <MapPin className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Geotagging Radius</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Presensi terkunci secara otomatis jika mahasiswa berada di luar radius lokasi posko yang ditentukan.
                </p>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* --- FOOTER --- */}
      <footer className="w-full border-t bg-zinc-50 dark:bg-zinc-900">
        <div className="container mx-auto flex flex-col gap-4 py-8 px-4 md:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2 font-semibold text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                <span>KKN App System</span>
             </div>
             <p className="text-xs text-muted-foreground">
               &copy; 2026 KKN App. Built for Community Service.
             </p>
          </div>
          
          <nav className="flex gap-4 sm:gap-6">
            <Link className="text-xs hover:underline underline-offset-4 text-muted-foreground" href="#">
              Bantuan
            </Link>
            <Link className="text-xs hover:underline underline-offset-4 text-muted-foreground" href="#">
              Syarat & Ketentuan
            </Link>
            <Link className="text-xs hover:underline underline-offset-4 text-muted-foreground" href="#">
              Kebijakan Privasi
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}