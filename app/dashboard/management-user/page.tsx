"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Shield, 
  User,
  Mail,
  Loader2,
  Briefcase,
  Lock,
  Eye,
  EyeOff,
  RefreshCcw
} from "lucide-react"
import { toast } from "sonner"

// --- KONFIGURASI SUPABASE ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// --- TIPE DATA ---
type UserData = {
  id: string
  full_name: string
  email: string
  role: "admin" | "mahasiswa" | "dpl"
  avatar_url?: string
  created_at: string
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  
  // State Modal Create
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "mahasiswa"
  })

  // State Modal Edit
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editFormData, setEditFormData] = useState({
    id: "",
    name: "",
    email: "",
    password: "", // Opsional saat edit
    role: "mahasiswa"
  })
  
  const [showPassword, setShowPassword] = useState(false)

  // --- 1. FETCH USERS ---
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error: any) {
      console.error("Error fetching users:", error)
      toast.error("Gagal Memuat Data", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // --- 2. ADD USER ---
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    
    try {
      if (!formData.name || !formData.email || !formData.password) {
        throw new Error("Mohon lengkapi semua data.")
      }

      const { error } = await supabase
        .from('users')
        .insert({
          full_name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`
        })

      if (error) throw error

      toast.success("Berhasil", { description: "User baru telah ditambahkan." })
      setIsDialogOpen(false)
      setFormData({ name: "", email: "", password: "", role: "mahasiswa" })
      fetchUsers()

    } catch (error: any) {
      toast.error("Gagal Menambah User", { description: error.message })
    } finally {
      setActionLoading(false)
    }
  }

  // --- 3. PREPARE EDIT ---
  const handleEditClick = (user: UserData) => {
    setEditFormData({
      id: user.id,
      name: user.full_name,
      email: user.email,
      password: "", 
      role: user.role
    })
    setIsEditOpen(true)
  }

  // --- 4. UPDATE USER ACTION ---
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)

    try {
      const updates: any = {
        full_name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(editFormData.name)}&background=random`
      }

      if (editFormData.password.trim() !== "") {
        updates.password = editFormData.password
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', editFormData.id)

      if (error) throw error

      toast.success("Berhasil", { description: "Data user telah diperbarui." })
      setIsEditOpen(false)
      fetchUsers()

    } catch (error: any) {
      toast.error("Gagal Update", { description: error.message })
    } finally {
      setActionLoading(false)
    }
  }

  // --- 5. DELETE USER ---
  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus user ini?")) return

    try {
      const { error } = await supabase.from('users').delete().eq('id', id)
      if (error) throw error
      toast.success("User Dihapus")
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (error: any) {
      toast.error("Gagal Menghapus", { description: error.message })
    }
  }

  // Helpers
  const filteredUsers = users.filter(user => 
    (user.full_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (user.email?.toLowerCase() || "").includes(search.toLowerCase())
  )

  const getInitials = (name: string) => {
    if (!name) return "??"
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
  }

  const getRoleIcon = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin": return <Shield className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
      case "dpl": return <Briefcase className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
      default: return <User className="h-4 w-4 text-blue-500 dark:text-blue-400" />
    }
  }

  const formatRole = (role: string) => {
    if (!role) return "-"
    if (role === 'dpl') return "DPL"
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  return (
    <div className="flex flex-col gap-6 p-1">
      
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Manajemen Pengguna</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Kelola data mahasiswa, DPL, dan admin.</p>
      </div>

      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="p-4 md:p-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search */}
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input 
                placeholder="Cari nama atau email..." 
                className="pl-9 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-zinc-900 dark:focus:ring-zinc-100" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={fetchUsers} 
                className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Refresh Data"
              >
                <RefreshCcw className={`h-4 w-4 text-zinc-600 dark:text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
              </Button>

              {/* --- MODAL CREATE USER --- */}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-none px-4">
                    <Plus className="mr-2 h-4 w-4" /> Tambah User
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <DialogHeader>
                    <DialogTitle className="text-zinc-900 dark:text-zinc-50">Buat Akun Baru</DialogTitle>
                    <DialogDescription className="text-zinc-500 dark:text-zinc-400">Data akan disimpan langsung ke database.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddUser} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="create-name" className="text-zinc-700 dark:text-zinc-300">Nama Lengkap</Label>
                      <Input 
                        id="create-name" placeholder="Nama Lengkap" required
                        className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="create-email" className="text-zinc-700 dark:text-zinc-300">Email</Label>
                      <Input 
                        id="create-email" type="email" placeholder="nama@email.com" required 
                        className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="create-pass" className="text-zinc-700 dark:text-zinc-300">Password</Label>
                      <Input 
                        id="create-pass" type="password" placeholder="Minimal 6 karakter" required minLength={6}
                        className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                       <Label className="text-zinc-700 dark:text-zinc-300">Role Pengguna</Label>
                       <select 
                          className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                          value={formData.role}
                          onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                       >
                            <option value="mahasiswa">Mahasiswa</option>
                            <option value="dpl">DPL</option>
                            <option value="admin">Admin</option>
                       </select>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={actionLoading} className="w-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200">
                        {actionLoading ? "Menyimpan..." : "Simpan Akun"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
              <TableRow className="hover:bg-transparent border-zinc-100 dark:border-zinc-800">
                <TableHead className="w-[60px] text-center font-medium text-zinc-500 dark:text-zinc-400">No</TableHead>
                <TableHead className="font-medium text-zinc-500 dark:text-zinc-400">Pengguna</TableHead>
                <TableHead className="w-[150px] font-medium text-zinc-500 dark:text-zinc-400">Role</TableHead>
                <TableHead className="w-[80px] text-right font-medium text-zinc-500 dark:text-zinc-400">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-zinc-500 dark:text-zinc-400">
                     <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" /> Memuat data...
                     </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-zinc-500 dark:text-zinc-400">Tidak ada data ditemukan.</TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user, index) => (
                  <TableRow key={user.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800">
                    <TableCell className="text-center font-medium text-zinc-500 dark:text-zinc-400">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-zinc-200 dark:border-zinc-800">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.full_name}</span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{formatRole(user.role)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                          <DropdownMenuLabel className="text-zinc-900 dark:text-zinc-100">Aksi User</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
                          
                          {/* TOMBOL EDIT */}
                          <DropdownMenuItem 
                            className="cursor-pointer text-zinc-700 dark:text-zinc-300 focus:bg-zinc-100 dark:focus:bg-zinc-800"
                            onClick={() => handleEditClick(user)}
                          >
                            <Pencil className="mr-2 h-4 w-4 text-zinc-500 dark:text-zinc-400" /> Edit Data
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            className="cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/10 focus:text-red-700 dark:focus:text-red-300"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Hapus User
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
      </Card>

      {/* --- MODAL EDIT USER (DI LUAR LOOP) --- */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-50">Edit Data Pengguna</DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">Ubah detail user di bawah ini.</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateUser} className="grid gap-4 py-4">
            {/* Nama */}
            <div className="grid gap-2">
              <Label htmlFor="edit-name" className="text-zinc-700 dark:text-zinc-300">Nama Lengkap</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input 
                  id="edit-name" 
                  className="pl-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                />
              </div>
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="edit-email" className="text-zinc-700 dark:text-zinc-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input 
                  id="edit-email" 
                  type="email" 
                  className="pl-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                  required 
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                />
              </div>
            </div>

            {/* Password (Opsional) */}
            <div className="grid gap-2">
              <Label htmlFor="edit-password" className="text-zinc-700 dark:text-zinc-300">Password Baru (Opsional)</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input 
                  id="edit-password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Kosongkan jika tidak diubah" 
                  className="pl-9 pr-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="grid gap-2">
                <Label className="text-zinc-700 dark:text-zinc-300">Role Pengguna</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <select 
                  className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({...editFormData, role: e.target.value as any})}
                  >
                    <option value="mahasiswa">Mahasiswa</option>
                    <option value="dpl">DPL (Dosen Pembimbing)</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
            </div>

            <DialogFooter className="mt-2">
              <Button type="submit" disabled={actionLoading} className="w-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 h-10">
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                {actionLoading ? "Menyimpan Perubahan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>

        </DialogContent>
      </Dialog>

    </div>
  )
}