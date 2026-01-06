"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  MapPin, 
  Save, 
  Navigation, 
  Info, 
  Loader2, 
  RotateCcw,
  AlertTriangle,
  CheckCircle2
} from "lucide-react"

// --- TOAST IMPORT ---
import { toast } from "sonner"

// --- SUPABASE SETUP ---
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Helper untuk cek koneksi
const isSupabaseConfigured = supabaseUrl && supabaseKey

const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseKey)
  : null

// --- LEAFLET SETUP (DYNAMIC IMPORT) ---
import dynamic from "next/dynamic"
import "leaflet/dist/leaflet.css"

// Import type saja agar aman dari SSR
import type { LeafletMouseEvent } from "leaflet"

const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false })
const Circle = dynamic(() => import("react-leaflet").then(mod => mod.Circle), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false })

// FIX: Component Wrapper untuk handle click map secara dinamis
const MapClickHandler = dynamic(
  async () => {
    const { useMapEvents } = await import("react-leaflet")
    return function MapEvents({ onLocationSelected }: { onLocationSelected: (lat: number, lng: number) => void }) {
      useMapEvents({
        click(e: LeafletMouseEvent) {
          onLocationSelected(e.latlng.lat, e.latlng.lng)
        },
      })
      return null
    }
  },
  { ssr: false }
)

/* ======================
   TYPE & DEFAULT
====================== */
const DEFAULT_LAT = -7.0865
const DEFAULT_LNG = 110.9167
const DEFAULT_RADIUS = 50 

export default function RadiusPage() {
  /* ======================
     STATE
  ====================== */
  const [settingId, setSettingId] = useState<number | null>(null)
  const [lat, setLat] = useState(DEFAULT_LAT)
  const [lng, setLng] = useState(DEFAULT_LNG)
  const [radius, setRadius] = useState(DEFAULT_RADIUS)
  
  const [isLocating, setIsLocating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // FIX: Mengganti require dengan import async untuk fix icon Leaflet
  useEffect(() => {
    setIsMounted(true)
    
    const fixLeafletIcon = async () => {
      try {
        const L = (await import("leaflet")).default
        // @ts-expect-error - _getIconUrl is internal Leaflet method
        delete L.Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        })
      } catch (e) {
        console.error("Leaflet icon fix error:", e)
      }
    }
    
    fixLeafletIcon()
  }, [])

  /* ======================
     FETCH DATA (INIT)
  ====================== */
  useEffect(() => {
    if (!supabase) {
      setIsLoadingData(false)
      setErrorMsg("Koneksi Supabase belum dikonfigurasi. Cek .env.local")
      toast.error("Konfigurasi Database Hilang", {
        description: "Pastikan file .env.local sudah diisi dengan benar."
      })
      return
    }

    const fetchSettings = async () => {
      try {
        setIsLoadingData(true)
        const { data, error } = await supabase
          .from('radius_settings')
          .select('*')
          .single()

        if (error) {
          if (error.code !== 'PGRST116') {
             console.error("Supabase Error:", error.message)
             toast.error("Gagal Memuat Data", { description: error.message })
          }
          return
        }

        if (data) {
          setSettingId(data.id)
          setLat(data.latitude)
          setLng(data.longitude)
          setRadius(data.radius_meters)
        }
      } catch (err) {
        console.error("Unexpected error:", err)
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchSettings()
  }, [])

  /* ======================
     HANDLERS
  ====================== */
  
  const handleMapClick = (newLat: number, newLng: number) => {
    setLat(newLat)
    setLng(newLng)
  }

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Browser Error", { description: "Perangkat ini tidak mendukung Geolocation." })
      return
    }

    setIsLocating(true)
    const toastId = toast.loading("Mencari lokasi Anda...")

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude)
        setLng(position.coords.longitude)
        setIsLocating(false)
        toast.dismiss(toastId)
        toast.success("Lokasi Ditemukan", { description: "Titik pusat berhasil diperbarui." })
      },
      (error) => {
        console.error(error)
        setIsLocating(false)
        toast.dismiss(toastId)
        toast.error("Gagal Mengambil Lokasi", { description: "Pastikan GPS aktif dan izin diberikan." })
      },
      { enableHighAccuracy: true }
    )
  }

  const handleSave = async () => {
    if (!supabase) return toast.error("Database Error", { description: "Supabase client not initialized" })

    try {
      setIsSaving(true)
      
      const payload = {
        latitude: lat,
        longitude: lng,
        radius_meters: radius,
        updated_at: new Date().toISOString()
      }

      let result
      if (settingId) {
        result = await supabase
          .from('radius_settings')
          .update(payload)
          .eq('id', settingId)
      } else {
        result = await supabase
          .from('radius_settings')
          .insert([payload])
      }

      const { error } = result
      if (error) throw error

      toast.success("Pengaturan Disimpan", {
        description: `Radius ${radius}m ditetapkan pada titik ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />
      })

    } catch (err: unknown) {
      console.error("Gagal menyimpan:", err)
      let msg = 'Terjadi kesalahan sistem.'
      if (err instanceof Error) {
        msg = err.message
      }
      toast.error("Gagal Menyimpan", {
        description: msg
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    toast("Reset Pengaturan?", {
      description: "Lokasi akan kembali ke pengaturan default sistem.",
      action: {
        label: "Ya, Reset",
        onClick: () => {
          setLat(DEFAULT_LAT)
          setLng(DEFAULT_LNG)
          setRadius(DEFAULT_RADIUS)
          toast.info("Pengaturan Direset", { description: "Silakan simpan untuk menerapkan perubahan." })
        },
      },
    })
  }

  /* ======================
     RENDER
  ====================== */
  return (
    <div className="flex flex-col gap-6">
      
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Pengaturan Lokasi</h1>
        <p className="text-muted-foreground">
          Tentukan titik pusat Posko KKN dan radius area yang diizinkan untuk absensi.
        </p>
      </div>

      {/* ERROR ALERT */}
      {errorMsg && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Konfigurasi Error</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* KOLOM KIRI: KONTROL */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Konfigurasi Radius</CardTitle>
              <CardDescription>
                {isLoadingData ? "Sedang memuat data..." : "Atur koordinat dan jarak toleransi."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {isLoadingData ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-2 text-muted-foreground">
                   <Loader2 className="h-8 w-8 animate-spin text-primary" />
                   <span className="text-xs">Sinkronisasi Database...</span>
                </div>
              ) : (
                <>
                  {/* Radius Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Jarak Radius (Meter)</Label>
                      <span className="text-sm font-bold text-primary">{radius} m</span>
                    </div>
                    <Slider
                      defaultValue={[radius]}
                      value={[radius]}
                      onValueChange={(vals) => setRadius(vals[0])}
                      max={500}
                      min={10}
                      step={10}
                      className="py-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Geser untuk mengubah ukuran lingkaran wilayah.
                    </p>
                  </div>

                  {/* Koordinat Inputs */}
                  <div className="space-y-3">
                    <Label>Titik Koordinat Pusat</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase text-muted-foreground font-bold">Latitude</span>
                        <Input 
                          value={lat} 
                          onChange={(e) => setLat(parseFloat(e.target.value))} 
                          type="number"
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase text-muted-foreground font-bold">Longitude</span>
                        <Input 
                          value={lng} 
                          onChange={(e) => setLng(parseFloat(e.target.value))} 
                          type="number"
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/5"
                    onClick={handleGetCurrentLocation}
                    disabled={isLocating}
                  >
                    {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                    Gunakan Lokasi Saya Saat Ini
                  </Button>
                </>
              )}

            </CardContent>
            <CardFooter className="flex flex-col gap-2 border-t bg-muted/20 p-4">
               <Button className="w-full gap-2" onClick={handleSave} disabled={isSaving || isLoadingData || !supabase}>
                 {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                 Simpan Pengaturan
               </Button>
               <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={handleReset} disabled={isLoadingData}>
                 <RotateCcw className="mr-2 h-3 w-3" /> Reset Default
               </Button>
            </CardFooter>
          </Card>

          {/* Info Card */}
          <Alert className="bg-blue-50 text-blue-900 border-blue-100 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-900">
            <Info className="h-4 w-4" />
            <AlertTitle>Informasi Geofencing</AlertTitle>
            <AlertDescription className="text-xs mt-1 leading-relaxed">
              Mahasiswa hanya dapat mengisi logbook jika posisi GPS mereka berada di dalam <strong>Lingkaran Biru</strong> yang Anda tentukan di peta.
            </AlertDescription>
          </Alert>
        </div>

        {/* KOLOM KANAN: PETA */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden h-125 lg:h-full flex flex-col shadow-md border-muted">
            <div className="relative flex-1 z-0">
              {isMounted ? (
                <MapContainer 
                  center={[lat, lng]} 
                  zoom={18} 
                  scrollWheelZoom={true} 
                  className="h-full w-full z-0"
                  key={`${lat}-${lng}`}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* Menggunakan Handler yang sudah di-wrap dynamic import */}
                  <MapClickHandler onLocationSelected={handleMapClick} />

                  <Circle 
                    center={[lat, lng]} 
                    radius={radius} 
                    pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.2 }} 
                  />

                  <Marker position={[lat, lng]}>
                    <Popup>
                      <div className="text-center">
                        <span className="font-bold block">Pusat Lokasi</span>
                        Radius: {radius} meter
                      </div>
                    </Popup>
                  </Marker>
                  
                </MapContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-muted">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>Memuat Peta...</p>
                  </div>
                </div>
              )}

              <div className="absolute top-4 right-4 z-400 bg-background/90 backdrop-blur px-3 py-1.5 rounded-md shadow-sm border text-xs font-medium">
                Klik peta untuk pindah titik
              </div>
            </div>
            
            <div className="bg-background border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
               <div className="flex items-center gap-1">
                 <MapPin className="h-3 w-3" />
                 Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
               </div>
               <div>
                 {isLoadingData ? "Syncing..." : "Ready"}
               </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}