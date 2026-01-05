"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation" 

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Plus,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Camera,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileText,
  MapPin,
  Loader2,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ScanFace
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import { createClient } from "@supabase/supabase-js"
import * as faceapi from 'face-api.js'

// --- SUPABASE SETUP ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null

/* ======================
   TYPE DEFINITION
====================== */
type Logbook = {
  id: number
  user_id: string // Ditambahkan untuk relasi user
  nama: string
  tanggal: string
  kegiatan: string
  foto: string
  lokasi: string
}

type RadiusSettings = {
  latitude: number
  longitude: number
  radius_meters: number
}

// Tipe untuk User Session
type UserSession = {
  id: string
  email: string
  full_name: string
  avatar_url?: string
}

/* ======================
   HELPER FUNCTIONS
====================== */
const formatDate = (dateString: string) => {
  if (!dateString) return "-"
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date)
  } catch (e) {
    return dateString
  }
}

const base64ToBlob = (base64: string, mimeType: string = 'image/jpeg') => {
  const byteString = atob(base64.split(',')[1])
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mimeType })
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3 
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c 
}

export default function LogbookPage() {
  const router = useRouter()

  /* ======================
     STATE MANAGEMENT
  ====================== */
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null)
  
  const [data, setData] = useState<Logbook[]>([])
  const [radiusSettings, setRadiusSettings] = useState<RadiusSettings | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)

  const [deleteId, setDeleteId] = useState<number | null>(null)

  // Form State
  const [nama, setNama] = useState("") 
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [kegiatan, setKegiatan] = useState("")
  const [foto, setFoto] = useState("") 
  const [lokasi, setLokasi] = useState("")
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  
  // Radius Check State
  const [distance, setDistance] = useState<number | null>(null)
  const [isInsideRadius, setIsInsideRadius] = useState(true)

  // --- FACE API STATES ---
  const [isFaceDetected, setIsFaceDetected] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelLoaded, setModelLoaded] = useState(false)

  // Camera Refs
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null) 
  const faceCanvasRef = useRef<HTMLCanvasElement | null>(null) 
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const perPage = 5

  /* ======================
     FETCH DATA FUNCTIONS
  ====================== */
  
  // Menggunakan useCallback agar tidak memicu re-render berlebih
  const fetchLogbooks = useCallback(async (userId: string) => {
    if (!supabase) return
    try {
      // PERBAIKAN: Filter berdasarkan user_id
      const { data: logbooks, error } = await supabase
        .from('logbooks')
        .select('*')
        .eq('user_id', userId) 
        .order('tanggal', { ascending: false })

      if (error) throw error
      if (logbooks) setData(logbooks as unknown as Logbook[])
    } catch (err: any) {
      console.error("Error fetching logbooks:", err)
      toast.error("Gagal Memuat Data", { description: err.message })
    }
  }, [])

  const fetchRadiusSettings = useCallback(async () => {
    if (!supabase) return
    try {
      const { data, error } = await supabase
        .from('radius_settings')
        .select('*')
        .single()
      
      if (data) {
        setRadiusSettings({
          latitude: data.latitude,
          longitude: data.longitude,
          radius_meters: data.radius_meters
        })
      }
    } catch (err) {
      console.error("Radius error:", err)
    }
  }, [])

  /* ======================
     AUTH & INITIAL LOAD
  ====================== */
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      // 1. Cek Koneksi Supabase
      if (!supabase) {
        setErrorMsg("Koneksi Supabase belum dikonfigurasi. Cek .env.local")
        setIsLoading(false)
        return
      }

      // 2. Cek Session dari LocalStorage
      const sessionStr = localStorage.getItem("user_session")
      
      if (!sessionStr) {
        router.replace("/auth/login")
        return 
      }

      try {
        const userSession = JSON.parse(sessionStr)
        setCurrentUser(userSession)
        
        // Auto-fill nama dari session jika form kosong
        if(!nama) setNama(userSession.full_name || "") 

        // 3. Ambil data hanya setelah user ID tersedia
        await Promise.all([
          fetchLogbooks(userSession.id),
          fetchRadiusSettings()
        ])
        
      } catch (e) {
        localStorage.removeItem("user_session")
        router.replace("/auth/login")
        return
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthAndLoadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, fetchLogbooks, fetchRadiusSettings]) 

  /* ======================
     CAMERA & FACE API LOGIC
  ====================== */

  const loadModels = async () => {
    if (modelLoaded) return
    setIsModelLoading(true)
    try {
      const MODEL_URL = '/models' 
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
      setModelLoaded(true)
    } catch (err) {
      console.error("Error loading FaceAPI models:", err)
      toast.error("Gagal Load AI", { description: "Cek folder /public/models" })
    } finally {
      setIsModelLoading(false)
    }
  }

  const startCamera = async () => {
    await loadModels()

    try {
      if (streamRef.current) stopCamera()

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 }
        },
      })
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error("Camera Error:", err)
      toast.error("Gagal Akses Kamera", { description: "Pastikan izin kamera diberikan." })
    }
  }

  const handleVideoOnPlay = () => {
    const video = videoRef.current
    const canvas = faceCanvasRef.current
    
    if (!video || !canvas) return

    const displaySize = { width: video.videoWidth, height: video.videoHeight }
    faceapi.matchDimensions(canvas, displaySize)

    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(async () => {
      if (!video || video.paused || video.ended) return

      const detections = await faceapi.detectAllFaces(
        video, 
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
      )

      const resizedDetections = faceapi.resizeResults(detections, displaySize)
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        faceapi.draw.drawDetections(canvas, resizedDetections)
        // Set state wajah terdeteksi
        setIsFaceDetected(detections.length > 0)
      }
    }, 200)
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsFaceDetected(false)
  }

  const getAddressFromCoords = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      )
      const data = await response.json()
      const address = data.address
      const simpleAddress = [
        address.village || address.hamlet || address.suburb,
        address.county || address.city_district,
        address.city || address.town
      ].filter(Boolean).join(", ")
      return simpleAddress || "Lokasi terdeteksi"
    } catch (error) {
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
    }
  }

  const capturePhotoAndLocation = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    
    if (ctx) {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0)
      
      const image = canvas.toDataURL("image/jpeg", 0.8)
      setFoto(image)
      stopCamera()
    }

    if ("geolocation" in navigator) {
      setIsGettingLocation(true)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const userLat = position.coords.latitude
          const userLon = position.coords.longitude
          
          const address = await getAddressFromCoords(userLat, userLon)
          setLokasi(address)

          if (radiusSettings) {
            const dist = calculateDistance(
              userLat, userLon, 
              radiusSettings.latitude, radiusSettings.longitude
            )
            setDistance(dist)

            if (dist <= radiusSettings.radius_meters) {
              setIsInsideRadius(true)
              toast.success("Lokasi Valid", { description: `Jarak ${Math.round(dist)}m dari pusat.` })
            } else {
              setIsInsideRadius(false)
              toast.error("Di Luar Radius!", { description: `Jarak ${Math.round(dist)}m. Max ${radiusSettings.radius_meters}m.` })
            }
          } else {
            // Jika tidak ada setting radius, anggap valid
            setIsInsideRadius(true) 
          }
          setIsGettingLocation(false)
        },
        (error) => {
          setLokasi("Gagal mengambil lokasi")
          setIsGettingLocation(false)
          toast.warning("GPS Error", { description: "Gagal mengambil GPS." })
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      )
    } else {
      setLokasi("Browser tidak mendukung geolokasi")
    }
  }

  useEffect(() => {
    if (open && !foto) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [open, foto])

  const retakePhoto = () => {
    setFoto("")
    setLokasi("")
    setDistance(null)
    setIsInsideRadius(true) 
    setIsFaceDetected(false) 
  }

  /* ======================
     DATA PROCESSING
  ====================== */
  const filteredData = useMemo(() => {
    return data
      .filter(
        (item) =>
          item.kegiatan.toLowerCase().includes(search.toLowerCase()) ||
          item.nama.toLowerCase().includes(search.toLowerCase()) ||
          item.tanggal.includes(search)
      )
      .sort((a, b) => {
        if (a.tanggal < b.tanggal) return sortDir === "asc" ? -1 : 1
        if (a.tanggal > b.tanggal) return sortDir === "asc" ? 1 : -1
        return 0
      })
  }, [data, search, sortDir])

  const totalPages = Math.ceil(filteredData.length / perPage)
  const paginatedData = filteredData.slice((page - 1) * perPage, page * perPage)

  /* ======================
     ACTIONS
  ====================== */
  const handleAdd = async () => {
    if (!supabase) return
    if (!currentUser) {
       toast.error("Sesi Habis", { description: "Silahkan login ulang." })
       return
    }

    if (!tanggal || !kegiatan || !foto || !nama) {
      toast.warning("Data Tidak Lengkap", { description: "Mohon lengkapi semua kolom." })
      return
    }
    if (!isInsideRadius) {
      toast.error("Gagal Simpan", { description: "Posisi di luar radius." })
      return
    }

    try {
      setIsSubmitting(true)
      const blob = base64ToBlob(foto)
      const fileName = `${currentUser.id}/${Date.now()}.jpg` // Simpan di folder ID User
      
      const { error: uploadError } = await supabase.storage
        .from('logbook-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false })

      if (uploadError) throw new Error(`Gagal upload foto: ${uploadError.message}`)

      const { data: publicUrlData } = supabase.storage
        .from('logbook-photos')
        .getPublicUrl(fileName)

      // PERBAIKAN: Insert user_id
      const { error: insertError } = await supabase
        .from('logbooks')
        .insert([{
          user_id: currentUser.id, 
          nama, 
          tanggal, 
          kegiatan, 
          foto: publicUrlData.publicUrl, 
          lokasi: lokasi || "Lokasi Manual"
        }])

      if (insertError) throw new Error(`Gagal simpan data: ${insertError.message}`)

      toast.success("Berhasil", { description: "Logbook ditambahkan." })
      setKegiatan("")
      setFoto("") 
      setLokasi("")
      setDistance(null) 
      setOpen(false)
      
      // Refresh data
      fetchLogbooks(currentUser.id)

    } catch (err: any) {
      toast.error("Error", { description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!supabase || !deleteId || !currentUser) return
    try {
      // PERBAIKAN: Pastikan menghapus data milik user sendiri
      const { error } = await supabase
        .from('logbooks')
        .delete()
        .eq('id', deleteId)
        .eq('user_id', currentUser.id) 

      if (error) throw error
      
      toast.success("Terhapus", { description: "Data logbook dihapus." })
      setDeleteId(null)
      fetchLogbooks(currentUser.id)
    } catch (err: any) {
      toast.error("Gagal Hapus", { description: err.message })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Logbook Harian</h1>
          <p className="text-muted-foreground mt-1">
             Halo, {currentUser?.full_name || 'Mahasiswa'}. Kelola catatan harian Anda di sini.
          </p>
        </div>
      </div>

      {errorMsg && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Konfigurasi</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden border-none shadow-md">
        <CardHeader className="bg-muted/30 px-6 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari kegiatan..."
                className="bg-background pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-sm w-full md:w-auto" disabled={!supabase}>
                  <Plus className="h-4 w-4" />
                  Tambah Logbook
                </Button>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Buat Logbook Baru (Face API)</DialogTitle>
                  <DialogDescription>
                    Sistem mendeteksi wajah secara otomatis menggunakan Face-API.js.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4 md:grid-cols-2">
                  
                  {/* FORM INPUT */}
                  <div className="space-y-6">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium leading-none">Nama Mahasiswa</label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Nama Mahasiswa" 
                          className="pl-9"
                          value={nama}
                          onChange={(e) => setNama(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium leading-none">Tanggal Kegiatan</label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="date" 
                          className="pl-9"
                          value={tanggal}
                          onChange={(e) => setTanggal(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium leading-none">Deskripsi Kegiatan</label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <textarea 
                          placeholder="Contoh: Mengajar TPA..."
                          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={kegiatan}
                          onChange={(e) => setKegiatan(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* KAMERA AREA */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none flex justify-between">
                      <span>Dokumentasi Wajah</span>
                      {foto && (
                        <span className="cursor-pointer text-xs text-primary hover:underline" onClick={retakePhoto}>
                          Ambil Ulang
                        </span>
                      )}
                    </label>
                    
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-zinc-950 shadow-inner group">
                      {!foto ? (
                        <>
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            onPlay={handleVideoOnPlay}
                            className="absolute inset-0 h-full w-full object-cover scale-x-[-1]" 
                          />
                          
                          <canvas 
                            ref={faceCanvasRef}
                            className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
                          />

                          {isModelLoading && (
                             <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                                <div className="text-white flex flex-col items-center">
                                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                  <span className="text-sm">Memuat Model Face API...</span>
                                </div>
                             </div>
                          )}

                          <div className="absolute inset-0 flex items-end justify-center pb-4 z-10 bg-gradient-to-t from-black/50 to-transparent">
                             <Button 
                               variant="default" 
                               size="icon"
                               className={`h-14 w-14 rounded-full border-4 shadow-xl transition-all 
                                 ${isFaceDetected 
                                   ? 'bg-red-600 hover:bg-red-700 border-white hover:scale-110 cursor-pointer' 
                                   : 'bg-gray-600 border-gray-400 cursor-not-allowed opacity-80'}`}
                               onClick={capturePhotoAndLocation}
                               disabled={!isFaceDetected || isModelLoading}
                             >
                                <Camera className={`h-6 w-6 text-white ${!isFaceDetected && 'opacity-50'}`} />
                             </Button>
                          </div>

                          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                            {!isModelLoading && (
                                <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md border flex items-center gap-2
                                  ${isFaceDetected 
                                    ? 'bg-green-500/80 text-white border-green-400' 
                                    : 'bg-yellow-500/80 text-white border-yellow-400'}`}>
                                  {isFaceDetected ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3" /> Wajah Terdeteksi
                                    </>
                                  ) : (
                                    <>
                                      <ScanFace className="h-3 w-3" /> Arahkan Wajah ke Kamera
                                    </>
                                  )}
                                </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <img src={foto} alt="Preview" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="secondary" onClick={retakePhoto} className="gap-2">
                              <Camera className="h-4 w-4" />
                              Foto Ulang
                            </Button>
                          </div>
                        </>
                      )}
                      
                      <canvas ref={canvasRef} hidden />
                    </div>
                    
                    {/* INFO LOCATION */}
                    <div className={`flex flex-col gap-1 rounded-md border border-dashed p-3 text-xs ${isInsideRadius ? 'bg-muted/50 border-muted' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center gap-2">
                        <MapPin className={`h-3.5 w-3.5 ${isInsideRadius ? 'text-primary' : 'text-red-600'}`} />
                        <div className="flex-1">
                          {isGettingLocation ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Mencari lokasi...</span>
                            </div>
                          ) : (
                            <span className="font-medium text-foreground">
                              {lokasi || "Lokasi belum diambil."}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {distance !== null && radiusSettings && (
                        <div className={`mt-1 flex items-center gap-2 font-semibold ${isInsideRadius ? 'text-green-600' : 'text-red-600'}`}>
                           {isInsideRadius ? (
                             <>
                               <CheckCircle2 className="h-3.5 w-3.5" />
                               <span>Dalam Radius ({Math.round(distance)}m)</span>
                             </>
                           ) : (
                             <>
                               <XCircle className="h-3.5 w-3.5" />
                               <span>Luar Radius ({Math.round(distance)}m)</span>
                             </>
                           )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter className="sm:justify-end">
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Batal</Button>
                  <Button 
                    onClick={handleAdd} 
                    disabled={isGettingLocation || isSubmitting || !isInsideRadius}
                    className={!isInsideRadius ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan Logbook"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
        </CardHeader>
        
        {/* TABLE CONTENT */}
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[50px] font-semibold text-center">No</TableHead>
                <TableHead className="w-[180px] cursor-pointer" onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}>
                  <div className="flex items-center gap-2 font-semibold">
                    Tanggal <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="w-[150px] font-semibold">Nama</TableHead>
                <TableHead className="font-semibold">Kegiatan</TableHead>
                <TableHead className="w-[150px] font-semibold">Dokumentasi</TableHead>
                <TableHead className="w-[80px] text-right font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-[300px] text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm mt-2 text-muted-foreground">Memuat data...</p>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-[300px] text-center text-muted-foreground">
                     Belum ada logbook
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item, index) => (
                  <TableRow key={item.id} className="hover:bg-muted/40">
                    <TableCell className="align-top py-4 text-center">
                      {(page - 1) * perPage + index + 1}
                    </TableCell>
                    <TableCell className="align-top py-4 font-medium">
                      {formatDate(item.tanggal)}
                    </TableCell>
                    <TableCell className="align-top py-4 text-sm">
                      {item.nama}
                    </TableCell>
                    <TableCell className="align-top py-4 text-sm line-clamp-2">
                      {item.kegiatan}
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="overflow-hidden rounded-md border w-24 aspect-[4/3] bg-muted">
                        <img src={item.foto} className="h-full w-full object-cover" alt="foto" />
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4 text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDeleteId(item.id)} className="text-red-600 cursor-pointer">
                            <Trash2 className="mr-2 h-4 w-4" /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {filteredData.length > 0 && (
          <CardFooter className="flex items-center justify-between border-t bg-muted/20 px-6 py-4">
             <div className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
             </div>
             <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
             </div>
          </CardFooter>
        )}
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data?</AlertDialogTitle>
            <AlertDialogDescription>Data yang dihapus tidak dapat dikembalikan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}