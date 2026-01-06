"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image" // Import Image component
import { createClient } from "@supabase/supabase-js"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Camera,
  Loader2,
  Eye,
  EyeOff,
  ScanFace,
  CheckCircle2,
  RefreshCw,
} from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import * as faceapi from 'face-api.js'

// --- SUPABASE CLIENT ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Definisi tipe sederhana untuk titik koordinat wajah
type FacePoint = { x: number; y: number }

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Form States
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  
  // Camera & Face API States
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [isModelLoading, setIsModelLoading] = useState(true)
  const [isFaceDetected, setIsFaceDetected] = useState(false)
  
  // Data Wajah
  // FIX 1: Menghapus 'any' dan mengganti dengan tipe spesifik
  const [faceData, setFaceData] = useState<{
    descriptor: number[] | null,
    landmarks: FacePoint[] | null
  }>({ descriptor: null, landmarks: null })

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const faceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // --- 1. LOAD FACE API MODELS ---
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models' 
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ])
        console.log("Face API Models Loaded")
        setIsModelLoading(false)
      } catch (err) {
        console.error("Gagal load model:", err)
        toast.error("Gagal Memuat AI", { description: "Cek folder public/models" })
        setIsModelLoading(false)
      }
    }
    loadModels()

    return () => stopCamera()
  }, [])

  // --- 2. CAMERA CONTROL ---
  const startCamera = async () => {
    if (isModelLoading) {
      toast.info("Tunggu sebentar", { description: "Sedang memuat model AI..." })
      return
    }

    try {
      setIsCameraOpen(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error(err)
      toast.error("Gagal membuka kamera", { description: "Izinkan akses kamera di browser." })
      setIsCameraOpen(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsCameraOpen(false)
  }

  // --- 3. FACE DETECTION LOOP ---
  const handleVideoPlay = () => {
    const video = videoRef.current
    const canvas = faceCanvasRef.current

    if (!video || !canvas) return

    const displaySize = { width: video.videoWidth, height: video.videoHeight }
    faceapi.matchDimensions(canvas, displaySize)

    intervalRef.current = setInterval(async () => {
      if (!video || video.paused || video.ended) return

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        if (detection) {
          setIsFaceDetected(true)
          
          const resizedDetections = faceapi.resizeResults(detection, displaySize)
          const box = resizedDetections.detection.box
          ctx.strokeStyle = '#22c55e' 
          ctx.lineWidth = 2
          ctx.strokeRect(box.x, box.y, box.width, box.height)

          setFaceData({
            descriptor: Array.from(detection.descriptor),
            landmarks: detection.landmarks.positions
          })
        } else {
          setIsFaceDetected(false)
          setFaceData({ descriptor: null, landmarks: null })
        }
      }
    }, 500)
  }

  // --- 4. CAPTURE PHOTO ---
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    
    if (!isFaceDetected || !faceData.descriptor) {
      toast.warning("Wajah Tidak Terdeteksi", { description: "Posisikan wajah di dalam kotak." })
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1) 
      ctx.drawImage(video, 0, 0)
      
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8)
      setPhoto(dataUrl)
      stopCamera()
    }
  }

  const retakePhoto = () => {
    setPhoto(null)
    setFaceData({ descriptor: null, landmarks: null })
    setIsFaceDetected(false)
    startCamera()
  }

  const base64ToBlob = (base64: string) => {
    const byteString = atob(base64.split(',')[1])
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    return new Blob([ab], { type: 'image/jpeg' })
  }

  // --- 5. REGISTER ACTION ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!photo || !faceData.descriptor) {
      toast.warning("Data Wajah Kurang", { description: "Harap ambil foto wajah terlebih dahulu." })
      return
    }

    setIsLoading(true)

    try {
      const uniqueId = `user-${Date.now()}`
      const photoBlob = base64ToBlob(photo)
      const fileName = `${uniqueId}.jpg`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, photoBlob, { contentType: 'image/jpeg', upsert: true })

      if (uploadError) throw new Error(`Gagal upload foto: ${uploadError.message}`)

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const { error: insertError } = await supabase
        .from('users')
        .insert({
            full_name: name,
            email: email,
            password: password, 
            avatar_url: publicUrlData.publicUrl,
            face_descriptor: faceData.descriptor, 
            face_landmarks: faceData.landmarks,
            role: 'mahasiswa'
        })

      if (insertError) throw new Error("Gagal menyimpan data ke database.")

      toast.success("Registrasi Berhasil", { description: "Akun mahasiswa telah dibuat." })
      router.push("/auth/login") 

    // FIX 2: Mengganti 'any' dengan 'unknown' dan pengecekan tipe Error
    } catch (error: unknown) {
      console.error(error)
      let errorMessage = "Terjadi kesalahan.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error("Registrasi Gagal", { description: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 font-sans text-zinc-900 dark:text-zinc-50 transition-colors duration-300">
      
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>

      {/* FIX 3: max-w-[420px] -> max-w-105 */}
      <Card className="w-full max-w-105 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none rounded-2xl overflow-hidden transition-colors duration-300">
        
        <CardHeader className="text-center pb-6 pt-8 space-y-1">
          <CardTitle className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Buat Akun Baru</CardTitle>
          <CardDescription className="text-zinc-500 dark:text-zinc-400">
            Lengkapi data diri dan scan wajah Anda
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-5 px-8">
            
            {/* Input Nama */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Nama Lengkap</Label>
              <Input 
                id="name" 
                placeholder="Nama Lengkap Anda" 
                className="h-11 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-400 dark:focus:border-zinc-700 focus:ring-0 rounded-xl transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Input Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="nama@email.com" 
                className="h-11 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-400 dark:focus:border-zinc-700 focus:ring-0 rounded-xl transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Input Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Minimal 6 karakter" 
                  className="h-11 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-400 dark:focus:border-zinc-700 focus:ring-0 rounded-xl transition-all pr-10 placeholder:text-zinc-400 dark:placeholder:text-zinc-600" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* CAMERA SECTION (Clean & Flat) */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                 <Label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Foto Wajah</Label>
                 {photo && (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-500 animate-in fade-in">
                       <CheckCircle2 className="h-3 w-3" /> Siap
                    </span>
                 )}
              </div>
              
              <div className="flex justify-center">
                <div className="relative h-48 w-48 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 group transition-colors">
                  {!photo ? (
                    isCameraOpen ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          onPlay={handleVideoPlay}
                          className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
                        />
                        <canvas 
                          ref={faceCanvasRef}
                          className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
                        />
                        
                        {/* Overlay Capture Button */}
                        <div className="absolute inset-x-0 bottom-4 flex justify-center z-30">
                           <button
                            type="button"
                            onClick={capturePhoto}
                            disabled={!isFaceDetected}
                            className={`flex items-center justify-center h-10 w-10 rounded-full transition-all duration-300
                              ${isFaceDetected 
                                ? 'bg-white dark:bg-zinc-100 text-zinc-900 hover:scale-110 shadow-sm' 
                                : 'bg-white/50 dark:bg-black/50 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                              }`}
                          >
                            <Camera className="h-5 w-5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      // State: Camera Closed
                      <div className="flex h-full w-full flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 gap-2">
                        {isModelLoading ? (
                           <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                           <ScanFace className="h-10 w-10 opacity-50" />
                        )}
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {isModelLoading ? "Memuat AI..." : "Belum ada foto"}
                        </span>
                        {!isModelLoading && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={startCamera}
                            className="mt-2 h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg shadow-none"
                          >
                            Buka Kamera
                          </Button>
                        )}
                      </div>
                    )
                  ) : (
                    // State: Photo Taken
                    // FIX 4: Ganti <img> dengan <Image /> Next.js
                    <>
                      <Image 
                        src={photo} 
                        alt="Preview" 
                        fill
                        className="object-cover"
                        unoptimized // Diperlukan untuk base64 string
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                        <Button 
                          type="button" 
                          variant="secondary" 
                          size="sm" 
                          onClick={retakePhoto}
                          className="h-8 rounded-lg bg-white/90 dark:bg-black/90 text-zinc-900 dark:text-white hover:bg-white dark:hover:bg-black border-none shadow-none text-xs"
                        >
                          <RefreshCw className="mr-2 h-3 w-3" /> Ulangi
                        </Button>
                      </div>
                    </>
                  )}
                  <canvas ref={canvasRef} hidden />
                </div>
              </div>
              
              {/* Status Text di bawah kamera */}
              <div className="h-5 mt-2 text-center">
                 {isCameraOpen && !photo && !isFaceDetected && !isModelLoading && (
                    <span className="text-xs text-amber-500 font-medium animate-pulse">
                      Posisikan wajah di tengah area
                    </span>
                 )}
              </div>
            </div>

          </CardContent>

          <CardFooter className="flex flex-col gap-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 py-6 mt-2 transition-colors">
            <Button 
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl font-medium tracking-wide shadow-none transition-all" 
              type="submit" 
              disabled={isLoading || !photo || !faceData.descriptor}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? "Memproses..." : "Daftar Sebagai Mahasiswa"}
            </Button>

            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Sudah punya akun?{" "}
              <Link href="/auth/login" className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline">
                Masuk
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}