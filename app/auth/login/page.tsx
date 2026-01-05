"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
  Mail, 
  Lock, 
  LogIn, 
  Eye, 
  EyeOff, 
  ScanFace, 
  UserCheck,
  UserX
} from "lucide-react"
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
  const [isCameraOpen, setIsCameraOpen] = useState(false)
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
      usersRef.current = data.map((u: any) => ({
        ...u,
        face_descriptor: u.face_descriptor
      }))
    }
  }

  // --- 3. LOGIKA LOGIN SUKSES ---
  const performLoginSuccess = (user: any) => {
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

      performLoginSuccess(data)

    } catch (error: any) {
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
    } catch (err) {
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
            // Visualisasi deteksi (Optional: bisa dihapus jika ingin super clean)
            const resizedDetections = faceapi.resizeResults(detection, displaySize)
            const box = resizedDetections.detection.box
            
            // Draw custom cleaner box instead of default library box
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
              setTimeout(() => performLoginSuccess(bestMatch), 800) 
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
    // Background bersih (putih/off-white) tanpa pattern
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 p-4 font-sans text-zinc-900">
      
      {/* Card tanpa shadow, border tipis, rounded modern */}
      <Card className="w-full max-w-[400px] border border-zinc-200 bg-white shadow-none rounded-2xl overflow-hidden">
        
        <CardHeader className="text-center pb-6 pt-8 space-y-1">
          <CardTitle className="text-xl font-semibold tracking-tight">Selamat Datang</CardTitle>
          <CardDescription className="text-zinc-500">
            Silakan masuk untuk melanjutkan akses
          </CardDescription>
        </CardHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full px-6">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-100/50 p-1 rounded-xl mb-6">
            <TabsTrigger 
              value="manual" 
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 transition-all text-sm font-medium"
            >
              Password
            </TabsTrigger>
            <TabsTrigger 
              value="face" 
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 transition-all text-sm font-medium"
            >
              Wajah
            </TabsTrigger>
          </TabsList>

          {/* --- TAB 1: MANUAL LOGIN --- */}
          <TabsContent value="manual" className="mt-0">
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div className="space-y-4 pb-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-medium text-zinc-600 uppercase tracking-wider">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="nama@email.com" 
                    className="h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:border-zinc-400 focus:ring-0 rounded-xl transition-all" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-xs font-medium text-zinc-600 uppercase tracking-wider">Password</Label>
                    <Link href="#" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors">Lupa?</Link>
                  </div>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••" 
                      className="h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:border-zinc-400 focus:ring-0 rounded-xl transition-all pr-10" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              
              <Button 
                className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium tracking-wide shadow-none transition-all" 
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
              
              {/* Camera Container - Clean Circle without heavy borders */}
              <div className="relative h-48 w-48 overflow-hidden rounded-full bg-zinc-100 border border-zinc-200">
                {isModelLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20">
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
              <div className="text-center w-full min-h-[60px]">
                {faceMatchStatus === "scanning" && (
                  <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-2">
                    <ScanFace className="h-5 w-5 text-zinc-400 mb-2 animate-pulse" />
                    <p className="text-sm font-medium text-zinc-600">Pindai wajah...</p>
                  </div>
                )}

                {faceMatchStatus === "found" && (
                  <div className="flex flex-col items-center animate-in zoom-in duration-300">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mb-2">
                        <UserCheck className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-sm font-semibold text-zinc-900">{detectedName}</p>
                    <p className="text-xs text-zinc-500">Terverifikasi</p>
                  </div>
                )}

                {faceMatchStatus === "unknown" && (
                  <div className="flex flex-col items-center animate-in shake duration-300">
                    <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center mb-2">
                        <UserX className="h-4 w-4 text-red-500" />
                    </div>
                    <p className="text-sm font-medium text-zinc-600">Wajah tidak dikenali</p>
                    <p className="text-xs text-zinc-400">Coba atur pencahayaan</p>
                  </div>
                )}
              </div>

            </div>
          </TabsContent>
        </Tabs>
        
        <CardFooter className="flex justify-center border-t border-zinc-100 bg-zinc-50/50 py-4 mt-2">
           <div className="text-xs text-zinc-500">
              Belum punya akun?{" "}
              <Link href="/auth/register" className="font-medium text-zinc-900 hover:underline">
                Daftar
              </Link>
            </div>
        </CardFooter>

      </Card>
    </div>
  )
}