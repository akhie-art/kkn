"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { toast } from "sonner"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  ScanFace, 
  UserCheck,
  UserX
} from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import * as faceapi from 'face-api.js'

// --- SUPABASE CONFIG ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null

// Tipe data user
type UserProfile = {
  id: string
  email: string
  full_name: string
  face_descriptor: number[] | null
  avatar_url?: string
}

export default function LoginPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("manual")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // Form State
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // --- FACE LOGIN STATE ---
  const [, setIsCameraOpen] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [faceMatchStatus, setFaceMatchStatus] = useState<"scanning" | "found" | "unknown">("scanning")
  const [detectedName, setDetectedName] = useState("")
  const [isLoginSuccess, setIsLoginSuccess] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const usersRef = useRef<UserProfile[]>([]) 

  // --- 1. INISIALISASI ---
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      if (activeTab === "face") {
        await loadModels()
        if(mounted) {
           await fetchUsersForFaceLogin()
           startCamera()
        }
      } else {
        stopCamera()
      }
    }
    init()

    return () => {
      mounted = false;
      stopCamera()
    }
  }, [activeTab])

  // --- 2. LOAD MODELS & USERS ---
  const loadModels = async () => {
    try {
      if (faceapi.nets.faceRecognitionNet.isLoaded) return;
      
      setIsModelLoading(true)
      const MODEL_URL = '/models'
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ])
    } catch (err) {
      console.error(err)
      toast.error("Gagal Load AI", { description: "Cek folder public/models." })
    } finally {
      setIsModelLoading(false)
    }
  }

  const fetchUsersForFaceLogin = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, face_descriptor, avatar_url')
      .not('face_descriptor', 'is', null) 

    if (error) {
      console.error("Gagal ambil data user:", error)
      return
    }

    if (data) {
      usersRef.current = data.map((u) => ({
        ...(u as UserProfile),
        face_descriptor: u.face_descriptor
      }))
    }
  }

  // --- 3. LOGIKA LOGIN SUKSES ---
  const performLoginSuccess = (user: UserProfile) => {
    if (isLoginSuccess) return
    setIsLoginSuccess(true)
    
    localStorage.setItem("user_session", JSON.stringify({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url
    }))

    toast.success(`Selamat Datang, ${user.full_name}`)
    stopCamera()
    router.push("/dashboard") 
  }

  // --- 4. LOGIN MANUAL ---
  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return;
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password) // Note: Production should use hashing
        .single()

      if (error || !data) throw new Error("Kredensial tidak valid.")

      performLoginSuccess(data as UserProfile)

    } catch {
      toast.error("Login Gagal", { description: "Email atau password salah." })
    } finally {
      setIsLoading(false)
    }
  }

  // --- 5. LOGIKA KAMERA ---
  const startCamera = async () => {
    try {
      setIsCameraOpen(true)
      setFaceMatchStatus("scanning")
      setIsLoginSuccess(false)
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      toast.error("Akses Kamera Ditolak")
      setIsCameraOpen(false)
    }
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
    setIsCameraOpen(false)
  }

  // --- 6. FACE MATCHING LOOP ---
  const handleVideoPlay = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const displaySize = { width: video.videoWidth, height: video.videoHeight }
    faceapi.matchDimensions(canvas, displaySize)

    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(async () => {
      if (!video || video.paused || video.ended || usersRef.current.length === 0 || isLoginSuccess) return

      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor()

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          if (detection) {
            // Visualisasi deteksi
            const resizedDetections = faceapi.resizeResults(detection, displaySize)
            const box = resizedDetections.detection.box
            
            ctx.strokeStyle = '#22c55e' // Green-500
            ctx.lineWidth = 2
            ctx.strokeRect(box.x, box.y, box.width, box.height)

            // ALGORITMA MATCHING
            let bestMatch: UserProfile | null = null
            let lowestDistance = 1.0 

            for (const user of usersRef.current) {
              if (user.face_descriptor) {
                const dbDescriptor = new Float32Array(user.face_descriptor)
                const distance = faceapi.euclideanDistance(detection.descriptor, dbDescriptor)
                
                if (distance < 0.45 && distance < lowestDistance) {
                  lowestDistance = distance
                  bestMatch = user
                }
              }
            }

            if (bestMatch) {
              setFaceMatchStatus("found")
              setDetectedName(bestMatch.full_name)
              if (intervalRef.current) clearInterval(intervalRef.current)
              setTimeout(() => performLoginSuccess(bestMatch as UserProfile), 800) 
            } else {
              setFaceMatchStatus("unknown")
            }
          }
        }
      } catch (err) {
         console.error("Face Detection Loop Error", err)
      }
    }, 500)
  }

  return (
    // Background responsif dark/light
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 font-sans text-zinc-900 dark:text-zinc-50 transition-colors duration-300">
      
      {/* Dark Mode Toggle Positioned Absolutely */}
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>

      {/* Card Wrapper */}
      <Card className="w-full max-w-100 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none rounded-2xl overflow-hidden transition-colors duration-300">
        
        <CardHeader className="text-center pb-6 pt-8 space-y-1">
          <CardTitle className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Selamat Datang</CardTitle>
          <CardDescription className="text-zinc-500 dark:text-zinc-400">
            Silakan masuk untuk melanjutkan akses
          </CardDescription>
        </CardHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full px-6">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-100/50 dark:bg-zinc-800/50 p-1 rounded-xl mb-6">
            <TabsTrigger 
              value="manual" 
              className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-50 data-[state=active]:shadow-sm text-zinc-500 dark:text-zinc-400 transition-all text-sm font-medium"
            >
              Password
            </TabsTrigger>
            <TabsTrigger 
              value="face" 
              className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-50 data-[state=active]:shadow-sm text-zinc-500 dark:text-zinc-400 transition-all text-sm font-medium"
            >
              Wajah
            </TabsTrigger>
          </TabsList>

          {/* --- TAB 1: MANUAL LOGIN --- */}
          <TabsContent value="manual" className="mt-0">
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div className="space-y-4 pb-4">
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
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Password</Label>
                    <Link href="#" className="text-xs text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Lupa?</Link>
                  </div>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••" 
                      className="h-11 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-400 dark:focus:border-zinc-700 focus:ring-0 rounded-xl transition-all pr-10 placeholder:text-zinc-400 dark:placeholder:text-zinc-600" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
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
              </div>
              
              <Button 
                className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl font-medium tracking-wide shadow-none transition-all" 
                type="submit" 
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Masuk"}
              </Button>
            </form>
          </TabsContent>

          {/* --- TAB 2: FACE LOGIN --- */}
          <TabsContent value="face" className="mt-0 pb-6">
            <div className="flex flex-col items-center justify-center space-y-6">
              
              {/* Camera Container */}
              <div className="relative h-48 w-48 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                {isModelLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 z-20 transition-colors">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400 mb-2" />
                    <span className="text-xs font-medium text-zinc-400">Memuat AI...</span>
                  </div>
                )}
                
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onPlay={handleVideoPlay}
                  className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
                />
                <canvas 
                  ref={canvasRef} 
                  className="absolute inset-0 h-full w-full object-cover scale-x-[-1]" 
                />
              </div>

              {/* Minimal Status Indicators */}
              <div className="text-center w-full min-h-15">
                {faceMatchStatus === "scanning" && (
                  <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-2">
                    <ScanFace className="h-5 w-5 text-zinc-400 dark:text-zinc-500 mb-2 animate-pulse" />
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Pindai wajah...</p>
                  </div>
                )}

                {faceMatchStatus === "found" && (
                  <div className="flex flex-col items-center animate-in zoom-in duration-300">
                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
                        <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{detectedName}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Terverifikasi</p>
                  </div>
                )}

                {faceMatchStatus === "unknown" && (
                  <div className="flex flex-col items-center animate-in shake duration-300">
                    <div className="h-8 w-8 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-2">
                        <UserX className="h-4 w-4 text-red-500 dark:text-red-400" />
                    </div>
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Wajah tidak dikenali</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">Coba atur pencahayaan</p>
                  </div>
                )}
              </div>

            </div>
          </TabsContent>
        </Tabs>
        
        <CardFooter className="flex justify-center border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 py-4 mt-2 transition-colors">
           <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Belum punya akun?{" "}
              <Link href="/auth/register" className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline">
                Daftar
              </Link>
            </div>
        </CardFooter>

      </Card>
    </div>
  )
}