import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

// Setup font Inter
const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "KKN Logbook App",
  description: "Sistem Manajemen Logbook, Absensi, dan Pelaporan KKN Mahasiswa",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // suppressHydrationWarning ditambahkan karena sering diperlukan oleh provider theme (next-themes)
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased bg-zinc-50 dark:bg-zinc-950 flex flex-col`}>
        {/* Render halaman */}
        {children}
        
        {/* Toaster Global */}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}