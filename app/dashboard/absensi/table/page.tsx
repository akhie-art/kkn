"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@supabase/supabase-js"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  Clock,
  MapPin, 
  User as UserIcon,
  RefreshCcw,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

// --- SINGLETON SUPABASE INSTANCE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface AbsensiRecord {
  id: number           
  created_at: string   
  user_id: string      
  nama: string | null  
  tanggal: string      
  tipe_absen: "PAGI" | "MALAM" 
  foto_url: string | null      
  lokasi: string | null        
}

export default function AbsensiTablePage() {
  const [records, setRecords] = useState<AbsensiRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const fetchAbsensi = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('absensi')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRecords(data || [])
    
    // FIX 1: Mengganti any dengan unknown
    } catch (error: unknown) {
      console.error("Fetch error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAbsensi()
  }, [])

  const filteredRecords = useMemo(() => {
    return records.filter(rec => 
      (rec.nama?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    )
  }, [records, searchTerm])

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Log Presensi
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              <Input 
                placeholder="Cari nama karyawan..." 
                className="pl-9 w-full md:w-72 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Refresh Button */}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={fetchAbsensi} 
              disabled={isLoading}
              className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <RefreshCcw className={`h-4 w-4 text-zinc-600 dark:text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* --- TABLE CARD --- */}
        <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none dark:border dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden rounded-2xl transition-all">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                  <TableRow className="hover:bg-transparent border-zinc-100 dark:border-zinc-800">
                    {/* FIX 2: w-[60px] -> w-15 */}
                    <TableHead className="w-15 text-center font-semibold text-zinc-600 dark:text-zinc-400">No</TableHead>
                    {/* FIX 3: w-[80px] -> w-20 */}
                    <TableHead className="w-20 font-semibold text-zinc-600 dark:text-zinc-400">Foto</TableHead>
                    <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">Nama Karyawan</TableHead>
                    <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400 text-center">Sesi</TableHead>
                    <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">Tanggal & Waktu</TableHead>
                    <TableHead className="font-semibold text-zinc-600 dark:text-zinc-400">Lokasi Presensi</TableHead>
                    {/* FIX 4: w-[50px] -> w-12.5 */}
                    <TableHead className="w-12.5"></TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {isLoading ? (
                    // --- LOADING SKELETON ---
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-b border-zinc-50 dark:border-zinc-800">
                        <TableCell colSpan={7} className="h-20 py-4">
                          <div className="flex items-center space-x-4 px-4">
                            <div className="h-10 w-10 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-full" />
                            <div className="space-y-2 flex-1">
                              <div className="h-4 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded w-1/4" />
                              <div className="h-3 bg-zinc-50 dark:bg-zinc-800/50 animate-pulse rounded w-1/3" />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredRecords.length === 0 ? (
                    // --- EMPTY STATE ---
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 space-y-2">
                          <div className="h-16 w-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center">
                             <UserIcon className="h-8 w-8 opacity-50" />
                          </div>
                          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Belum ada data terekam</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    // --- DATA ROWS ---
                    filteredRecords.map((record, index) => (
                      <TableRow 
                        key={record.id} 
                        className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-0"
                      >
                        {/* Index */}
                        <TableCell className="text-center font-mono text-xs text-zinc-400 dark:text-zinc-500">
                          {index + 1}
                        </TableCell>

                        {/* Avatar */}
                        <TableCell>
                          <div className="relative h-10 w-10 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-2 ring-white dark:ring-zinc-800 shadow-sm dark:shadow-none">
                            {record.foto_url ? (
                              <Image 
                                src={record.foto_url} 
                                alt={record.nama || "User"}
                                fill
                                unoptimized={true}
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <UserIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Nama */}
                        <TableCell>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-100 tracking-tight">
                            {record.nama || 'User'}
                          </span>
                        </TableCell>

                        {/* Badge Sesi */}
                        <TableCell className="text-center">
                          <Badge 
                            className={`px-3 py-0.5 rounded-full border-none text-[10px] font-bold tracking-wider uppercase ${
                              record.tipe_absen === "PAGI" 
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-sm dark:shadow-none" 
                                : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 shadow-sm dark:shadow-none"
                            }`}
                          >
                            {record.tipe_absen}
                          </Badge>
                        </TableCell>

                        {/* Waktu */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              {new Date(record.tanggal).toLocaleDateString('id-ID', {
                                day: '2-digit', month: 'short', year: 'numeric'
                              })}
                            </span>
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 font-mono">
                              <Clock className="h-3 w-3" />
                              {new Date(record.created_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit', minute: '2-digit'
                              })} WIB
                            </span>
                          </div>
                        </TableCell>

                        {/* Lokasi */}
                        <TableCell>
                          {/* FIX 5: max-w-[240px] -> max-w-60 */}
                          <div className="flex items-start gap-1.5 max-w-60">
                            <MapPin className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400 mt-0.5 shrink-0" />
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-snug">
                              {record.lokasi || 'Koordinat terekam'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Action */}
                        <TableCell>
                           <ChevronRight className="h-4 w-4 text-zinc-200 dark:text-zinc-700 group-hover:text-zinc-400 dark:group-hover:text-zinc-400 transition-colors" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="flex flex-col sm:flex-row justify-between items-center px-4 text-[11px] text-zinc-400 dark:text-zinc-500 font-medium gap-2">
          <p>Total {filteredRecords.length} presensi terekam</p>
        </div>
      </div>
    </div>
  )
}