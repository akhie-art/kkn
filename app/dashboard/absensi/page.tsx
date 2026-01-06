"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { toast } from "sonner"
import * as faceapi from 'face-api.js'
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  MapPin,
  Loader2,
  CheckCircle2,
  Sun,
  Moon,
  Clock,
  Calendar as CalendarIcon,
  AlertCircle,
  ScanFace
} from "lucide-react"

// --- TYPES ---
interface UserProfile {
  id: string
  email: string
  full_name: string
  face_descriptor: number[] | null
  avatar_url?: string
}

interface RadiusSettings {
  latitude: number
  longitude: number
  radius_meters: number
}

// --- SUPABASE SINGLETON ---
// Mencegah warning "Multiple GoTrueClient instances"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export default function AbsensiPage() {
  const router = useRouter()
  
  // State Data User & Settings
  const [user, setUser] = useState<UserProfile | null>(null)
  const [radiusSettings, setRadiusSettings] = useState<RadiusSettings | null>(null)
  
  // State Waktu & Sesi
  const [sessionTime, setSessionTime] = useState<"PAGI" | "MALAM">("PAGI")
  const [hasPagi, setHasPagi] = useState(false)
  const [hasMalam, setHasMalam] = useState(false)
  const [waktuPagi, setWaktuPagi] = useState<string | null>(null)
  const [waktuMalam, setWaktuMalam] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // State UI & Loading
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [openCamera, setOpenCamera] = useState(false)
  
  // State Absen Type: Tetap pakai Uppercase untuk UI logic, tapi convert saat kirim DB
  const [absenType, setAbsenType] = useState<"PAGI" | "MALAM">("PAGI")
  
  // State Validasi
  const [locationStatus, setLocationStatus] = useState({ valid: false, msg: "Mengecek lokasi..." })
  const [faceMatchStatus, setFaceMatchStatus] = useState({ matched: false })

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // --- LOGIC: Fetch Data ---
  const fetchData = useCallback(async () => {
    try {
      const sessionStr = localStorage.getItem("user_session")
      if (!sessionStr) {
        router.push("/auth/login")
        return
      }
      
      let sessionData
      try {
        sessionData = JSON.parse(sessionStr)
      } catch {
        localStorage.removeItem("user_session")
        router.push("/auth/login")
        return
      }

      // 1. Ambil User (Handle error 406 jika user tidak ada di tabel public)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', sessionData.email)
        .maybeSingle() // Gunakan maybeSingle agar tidak error 406 jika kosong

      if (userError) throw userError
      if (!userData) {
        toast.error("Data pengguna tidak ditemukan di database.")
        return
      }
      setUser(userData as UserProfile)

      // 2. Ambil Radius
      const { data: rad } = await supabase.from('radius_settings').select('*').single()
      if (rad) setRadiusSettings(rad as RadiusSettings)

      // 3. Cek Log Hari Ini
      const today = new Date().toISOString().split('T')[0]
      const { data: logs } = await supabase
        .from('absensi')
        .select('*')
        .eq('user_id', userData.id)
        .eq('tanggal', today)

      if (logs) {
        // Cek case-insensitive karena DB mungkin mengembalikan 'pagi'/'malam' (lowercase)
        const pagi = logs.find(l => l.tipe_absen?.toUpperCase() === "PAGI")
        const malam = logs.find(l => l.tipe_absen?.toUpperCase() === "MALAM")
        
        if (pagi) {
          setHasPagi(true)
          setWaktuPagi(new Date(pagi.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }))
        }
        if (malam) {
          setHasMalam(true)
          setWaktuMalam(new Date(malam.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }))
        }
      }
    } catch (err: unknown) { 
      let msg = "Gagal memuat data";
      if (err instanceof Error) msg = err.message;
      console.error("Fetch Error:", err)
      toast.error(msg) 
    } finally { 
      setIsLoading(false) 
    }
  }, [router])

  // --- LOGIC: Load AI Models ---
  const loadModels = async () => {
    try {
      // Pastikan path models benar di folder public/models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      ])
    } catch (e) { 
      console.error("Models failed to load", e) 
    }
  }

  // --- EFFECT: Clock & Init ---
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      // Logic sesi: Pagi < 15:00, Malam >= 15:00
      setSessionTime(now.getHours() >= 0 && now.getHours() < 15 ? "PAGI" : "MALAM")
    }, 1000)
    
    const init = async () => {
      await loadModels()
      await fetchData()
    }
    init()

    return () => {
      clearInterval(timer)
      stopCamera()
    }
  }, [fetchData])

  // --- LOGIC: Camera & Geo ---
  const startCamera = async (type: "PAGI" | "MALAM") => {
    setAbsenType(type)
    setOpenCamera(true)
    setFaceMatchStatus({ matched: false })
    setLocationStatus({ valid: false, msg: "Mengecek lokasi..." })

    if (navigator.geolocation && radiusSettings) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, radiusSettings.latitude, radiusSettings.longitude)
        // Validasi Radius
        const valid = dist <= radiusSettings.radius_meters
        setLocationStatus({ valid, msg: valid ? "Lokasi Sesuai" : `Di Luar Radius (${Math.round(dist)}m)` })
      }, () => {
        setLocationStatus({ valid: false, msg: "Gagal Deteksi Lokasi" })
        toast.error("Aktifkan GPS Anda")
      })
    } else {
        setLocationStatus({ valid: false, msg: "GPS Tidak Tersedia" })
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch { 
      toast.error("Kamera tidak aktif/diizinkan") 
      setOpenCamera(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
    }
    setOpenCamera(false)
  }

  const handleVideoPlay = () => {
    if (!videoRef.current || !user?.face_descriptor) return
    
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return

      try {
        const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor()
        
        if (detection && user?.face_descriptor) {
          const dist = faceapi.euclideanDistance(detection.descriptor, new Float32Array(user.face_descriptor))
          // Threshold 0.45 biasanya cukup ketat
          setFaceMatchStatus({ matched: dist < 0.45 })
        }
      } catch (err) {
        console.error("Face detection error:", err)
      }
    }, 800)
  }

  // --- LOGIC: Submit ---
  const handleSubmit = async () => {
    if (!videoRef.current || !canvasRef.current || !user) return
    setIsSubmitting(true)

    try {
      const canvas = canvasRef.current
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
      
      const blob = await (await fetch(canvas.toDataURL('image/jpeg'))).blob()
      const fileName = `abs_${user.id}_${Date.now()}.jpg`
      
      const { error: uploadError } = await supabase.storage.from('logbook-photos').upload(fileName, blob)
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('logbook-photos').getPublicUrl(fileName)

      // FIX UTAMA: Kirim 'pagi'/'malam' huruf kecil ke database untuk menghindari error ENUM
      const dbAbsenType = absenType.toLowerCase(); 

      const { error: insertError } = await supabase.from('absensi').insert({
        user_id: user.id,
        nama: user.full_name,
        tanggal: new Date().toISOString().split('T')[0],
        tipe_absen: dbAbsenType, // Menggunakan huruf kecil
        foto_url: publicUrlData.publicUrl,
        lokasi: locationStatus.valid ? "Dalam Radius" : "Bypass/Error", 
        created_at: new Date().toISOString()
      })
      
      if (insertError) throw insertError

      toast.success("Absensi berhasil tercatat!")
      stopCamera()
      fetchData()
    } catch (err: unknown) { 
      console.error(err)
      let msg = "Terjadi kesalahan";
      if (err instanceof Error) msg = err.message;
      // Tampilkan error spesifik dari Supabase jika ada
      if (JSON.stringify(msg).includes("enum")) {
         msg = "Format Tipe Absen tidak sesuai database. Hubungi admin."
      }
      toast.error("Gagal mengirim data: " + msg) 
    } finally { 
      setIsSubmitting(false) 
    }
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-50" />
          <p className="text-sm font-medium">Memuat Data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      <div className="max-w-xl mx-auto px-6 py-12 md:py-20">
        
        {/* HEADER */}
        <header className="mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div className="flex justify-between items-start">
             <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-2">
                  {user?.full_name || 'Karyawan'}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Silakan lakukan presensi sesuai jadwal.
                </p>
             </div>
          </div>
          
          <div className="mt-6 flex items-center gap-4 text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span className="text-[12px] font-medium">{currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[12px] font-medium tabular-nums">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second:'2-digit' })}</span>
            </div>
          </div>
        </header>

        {/* CARDS */}
        <div className="space-y-4">
          {/* CARD PAGI */}
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-none transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-colors
                  ${hasPagi 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' 
                    : 'bg-zinc-50 border-zinc-100 text-zinc-400 dark:bg-zinc-800/50 dark:border-zinc-700/50 dark:text-zinc-500'
                  }`}>
                  <Sun className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Presensi Pagi</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {hasPagi ? `Tercatat ${waktuPagi}` : 'Batas 14:59'}
                  </p>
                </div>
              </div>

              {/* ACTION BUTTON / BADGE */}
              {!hasPagi && sessionTime === "PAGI" ? (
                <Button onClick={() => startCamera("PAGI")} size="sm" className="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-lg h-8 px-4 text-xs font-medium shadow-none">
                  Absen
                </Button>
              ) : hasPagi ? (
                 <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase">Hadir</span>
                 </div>
              ) : (
                <div className="px-3 py-1.5 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                   <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-600">Belum Mulai</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CARD MALAM */}
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-none transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-colors
                  ${hasMalam 
                    ? 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400' 
                    : 'bg-zinc-50 border-zinc-100 text-zinc-400 dark:bg-zinc-800/50 dark:border-zinc-700/50 dark:text-zinc-500'
                  }`}>
                  <Moon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Presensi Malam</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {hasMalam ? `Tercatat ${waktuMalam}` : 'Mulai 15:00'}
                  </p>
                </div>
              </div>

              {/* ACTION BUTTON / BADGE */}
              {!hasMalam && sessionTime === "MALAM" ? (
                <Button onClick={() => startCamera("MALAM")} size="sm" className="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-lg h-8 px-4 text-xs font-medium shadow-none">
                  Absen
                </Button>
              ) : hasMalam ? (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase">Hadir</span>
                 </div>
              ) : (
                <div className="px-3 py-1.5 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-600">Belum Mulai</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL VERIFIKASI WAJAH - SHORT & COMPACT */}
      <Dialog open={openCamera} onOpenChange={(v) => !v && stopCamera()}>
        <DialogContent className="sm:max-w-85 p-0 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-[18px] shadow-none overflow-hidden gap-0">
          
          {/* Header Compact */}
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between bg-white dark:bg-zinc-950">
             <div className="flex items-center gap-2">
                 <ScanFace className="h-4 w-4 text-zinc-900 dark:text-zinc-50" />
                 <DialogTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                   Verifikasi
                 </DialogTitle>
             </div>
             <DialogDescription className="sr-only">Scan Wajah</DialogDescription>
             
             <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded">
               <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></div>
               <span className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase">Live</span>
            </div>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50">
            {/* Video Wrapper: Aspect Square (1:1) agar tidak terlalu tinggi */}
            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black border border-zinc-200 dark:border-zinc-800">
              
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                onPlay={handleVideoPlay} 
                className="w-full h-full object-cover scale-x-[-1]" 
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Overlay Status: Compact */}
              <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1.5">
                
                {/* Status Wajah */}
                <div className={`px-2.5 py-1.5 rounded-md border flex items-center justify-between transition-colors duration-300
                  ${faceMatchStatus.matched 
                    ? 'bg-emerald-50/95 border-emerald-200 text-emerald-700 dark:bg-emerald-900/90 dark:border-emerald-800 dark:text-emerald-100' 
                    : 'bg-white/95 border-zinc-200 text-zinc-600 dark:bg-zinc-950/90 dark:border-zinc-800 dark:text-zinc-300'
                  }`}>
                  <div className="flex items-center gap-2">
                    {faceMatchStatus.matched 
                      ? <CheckCircle2 className="h-3 w-3" /> 
                      : <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
                    <span className="text-[10px] font-bold">
                      {faceMatchStatus.matched ? "Wajah Cocok" : "Memindai..."}
                    </span>
                  </div>
                </div>

                {/* Status Lokasi */}
                <div className={`px-2.5 py-1.5 rounded-md border flex items-center justify-between transition-colors duration-300
                  ${locationStatus.valid 
                    ? 'bg-blue-50/95 border-blue-200 text-blue-700 dark:bg-blue-900/90 dark:border-blue-800 dark:text-blue-100' 
                    : 'bg-white/95 border-zinc-200 text-zinc-600 dark:bg-zinc-950/90 dark:border-zinc-800 dark:text-zinc-300'
                  }`}>
                   <div className="flex items-center gap-2">
                    {locationStatus.valid 
                      ? <MapPin className="h-3 w-3" /> 
                      : <AlertCircle className="h-3 w-3 text-amber-500" />}
                    <span className="text-[10px] font-bold">
                      {locationStatus.msg}
                    </span>
                   </div>
                </div>

              </div>
            </div>
          </div>

          <div className="px-4 pb-4 pt-3 flex gap-2 border-t border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950">
            <Button 
              variant="outline" 
              onClick={stopCamera} 
              className="flex-1 rounded-lg h-9 text-xs font-semibold border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-none"
            >
              Batal
            </Button>
            <Button 
              disabled={!faceMatchStatus.matched || !locationStatus.valid || isSubmitting}
              onClick={handleSubmit} 
              className="flex-2 rounded-lg h-9 bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold transition-all shadow-none disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>...</span>
                </div>
              ) : "Kirim"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
