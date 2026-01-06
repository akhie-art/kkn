"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import * as XLSX from "xlsx"
import { 
  Baby, Search, Plus, FileDown, Calendar,
  Ruler, Weight, User, Trash2, X, Loader2, Pencil
} from "lucide-react"

// --- SETUP SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// --- TYPES ---
type StuntingData = {
  id: string
  nama_anak: string
  jk: "L" | "P"
  tgl_lahir: string
  usia_bulan: number
  tgl_ukur: string
  bb_kg: number
  tb_cm: number
  nama_ibu: string
  posyandu: string
  alamat: string
  created_at?: string
}

type StuntingForm = {
  nama_anak: string
  jk: "L" | "P"
  tgl_lahir: string
  tgl_ukur: string
  bb_kg: string | number
  tb_cm: string | number
  nama_ibu: string
  posyandu: string
  alamat: string
}

export default function StuntingPage() {
  // --- STATE ---
  const [data, setData] = useState<StuntingData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  
  // TRIGGER REFRESH (Solusi untuk error useEffect)
  const [refreshKey, setRefreshKey] = useState(0)

  // Modal States
  const [showInputModal, setShowInputModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Form State
  const initialForm: StuntingForm = {
    nama_anak: "",
    jk: "L",
    tgl_lahir: "",
    tgl_ukur: new Date().toISOString().split('T')[0],
    bb_kg: "",
    tb_cm: "",
    nama_ibu: "",
    posyandu: "",
    alamat: ""
  }
  const [formData, setFormData] = useState<StuntingForm>(initialForm)

  // --- USE EFFECT (DATA FETCHING) ---
  // Kita definisikan logic fetch di dalam useEffect langsung.
  // Dependency [refreshKey] artinya setiap kali refreshKey berubah, data diambil ulang.
  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      // Hanya set loading jika ini bukan load pertama (opsional, agar transisi halus)
      if (refreshKey > 0) setIsLoading(true)

      const { data: result, error } = await supabase
        .from('stunting')
        .select('*')
        .order('created_at', { ascending: false })

      if (mounted) {
        if (!error && result) {
          setData(result as StuntingData[])
        }
        setIsLoading(false)
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [refreshKey]) // <- Kunci perbaikan di sini

  // --- HANDLERS ---

  // Fungsi helper untuk memicu refresh
  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }
  
  const handleExportExcel = () => {
    setIsExporting(true)
    const dataToExport = data.map(item => ({
      "Nama Anak": item.nama_anak,
      "Jenis Kelamin": item.jk === 'L' ? "Laki-laki" : "Perempuan",
      "Tanggal Lahir": item.tgl_lahir,
      "Usia (Bulan)": item.usia_bulan,
      "Tanggal Ukur": item.tgl_ukur,
      "Berat Badan (kg)": item.bb_kg,
      "Tinggi Badan (cm)": item.tb_cm,
      "Nama Ibu": item.nama_ibu,
      "Posyandu": item.posyandu,
      "Alamat": item.alamat
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Stunting")
    XLSX.writeFile(workbook, "Data_Stunting_Logbook.xlsx")
    setIsExporting(false)
  }

  const handleOpenCreate = () => {
    setFormData(initialForm)
    setIsEditing(false)
    setSelectedId(null)
    setShowInputModal(true)
  }

  const handleOpenEdit = (item: StuntingData) => {
    setFormData({
        nama_anak: item.nama_anak,
        jk: item.jk,
        tgl_lahir: item.tgl_lahir,
        tgl_ukur: item.tgl_ukur,
        bb_kg: item.bb_kg,
        tb_cm: item.tb_cm,
        nama_ibu: item.nama_ibu || "",
        posyandu: item.posyandu || "",
        alamat: item.alamat || ""
    })
    setSelectedId(item.id)
    setIsEditing(true)
    setShowInputModal(true)
  }

  const handleInputString = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const payload = {
      nama_anak: formData.nama_anak,
      jk: formData.jk,
      tgl_lahir: formData.tgl_lahir,
      tgl_ukur: formData.tgl_ukur,
      bb_kg: parseFloat(formData.bb_kg.toString()),
      tb_cm: parseFloat(formData.tb_cm.toString()),
      nama_ibu: formData.nama_ibu,
      posyandu: formData.posyandu,
      alamat: formData.alamat
    }

    let error;

    if (isEditing && selectedId) {
        const result = await supabase.from('stunting').update(payload).eq('id', selectedId)
        error = result.error
    } else {
        const result = await supabase.from('stunting').insert([payload])
        error = result.error
    }

    if (!error) {
      setShowInputModal(false)
      triggerRefresh() // Panggil refresh di sini
    } else {
      alert("Gagal menyimpan data: " + error.message)
    }
    setIsSubmitting(false)
  }

  const confirmDelete = (id: string) => {
    setSelectedId(id)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!selectedId) return
    setIsSubmitting(true)

    const { error } = await supabase.from('stunting').delete().eq('id', selectedId)

    if (!error) {
      setShowDeleteModal(false)
      setSelectedId(null)
      triggerRefresh() // Panggil refresh di sini
    }
    setIsSubmitting(false)
  }

  // --- FILTERING ---
  const filteredData = data.filter((item) =>
    item.nama_anak.toLowerCase().includes(search.toLowerCase()) ||
    (item.nama_ibu && item.nama_ibu.toLowerCase().includes(search.toLowerCase())) ||
    (item.posyandu && item.posyandu.toLowerCase().includes(search.toLowerCase()))
  )

  const totalAnak = data.length
  const rataRataUsia = totalAnak > 0 
    ? Math.round(data.reduce((acc, curr) => acc + (curr.usia_bulan || 0), 0) / totalAnak) 
    : 0

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50 dark:bg-zinc-950 p-4 md:p-8 space-y-8 transition-colors duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Data Stunting</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Monitoring pertumbuhan balita & gizi (Real-time DB).</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={handleExportExcel}
            disabled={isExporting || data.length === 0}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-200 h-10 px-4 py-2 transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            {isExporting ? "Exporting..." : "Export Excel"}
          </button>
          <button onClick={handleOpenCreate} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white h-10 px-4 py-2 w-full sm:w-auto transition-colors">
            <Plus className="mr-2 h-4 w-4" /> Input Data
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatsCard label="Total Balita Terdata" value={totalAnak} icon={<Baby className="h-5 w-5 text-blue-600 dark:text-blue-400" />} bg="bg-blue-50 dark:bg-blue-900/20" />
        <StatsCard label="Rata-rata Usia Anak" value={`${rataRataUsia} Bln`} icon={<Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />} bg="bg-orange-50 dark:bg-orange-900/20" />
      </div>

      {/* TABLE */}
      <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Cari nama, ibu, atau posyandu..." className="h-10 w-full rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-10 pr-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-zinc-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-100 dark:border-zinc-800">
              <tr>
                <th className="h-12 px-6 align-middle">Identitas Anak</th>
                <th className="h-12 px-6 align-middle">Usia</th>
                <th className="h-12 px-6 align-middle">Fisik (TB/BB)</th>
                <th className="h-12 px-6 align-middle">Orang Tua</th>
                <th className="h-12 px-6 align-middle">Lokasi</th>
                <th className="h-12 px-6 align-middle text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="h-32 text-center align-middle">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="h-6 w-6 animate-spin mb-2" />
                        <span>Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-6 align-middle">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{item.nama_anak}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                          <span className={`px-1.5 rounded text-[10px] font-bold ${item.jk === 'L' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300' : 'text-pink-600 bg-pink-50 dark:bg-pink-900/30 dark:text-pink-300'}`}>
                            {item.jk}
                          </span>
                          Lahir: {item.tgl_lahir}
                        </span>
                      </div>
                    </td>
                    <td className="p-6 align-middle"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300">{item.usia_bulan} Bulan</span></td>
                    <td className="p-6 align-middle">
                      <div className="flex flex-col gap-1.5 text-slate-700 dark:text-slate-300">
                         <div className="flex items-center gap-2"><Ruler className="h-3.5 w-3.5 text-slate-400" /><span className="font-mono">{item.tb_cm} cm</span></div>
                         <div className="flex items-center gap-2"><Weight className="h-3.5 w-3.5 text-slate-400" /><span className="font-mono">{item.bb_kg} kg</span></div>
                      </div>
                    </td>
                    <td className="p-6 align-middle"><div className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><User className="h-3.5 w-3.5 text-slate-400" />{item.nama_ibu || "-"}</div></td>
                    <td className="p-6 align-middle">
                       <div className="flex flex-col"><span className="font-medium text-slate-700 dark:text-slate-300">{item.posyandu || "-"}</span><span className="text-xs text-slate-500 truncate max-w-30">{item.alamat || "-"}</span></div>
                    </td>
                    <td className="p-6 align-middle text-right">
                      <div className="flex justify-end gap-2">
                          <button onClick={() => handleOpenEdit(item)} className="text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => confirmDelete(item.id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="h-24 text-center text-slate-500 dark:text-slate-400">Data tidak ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INPUT MODAL */}
      {showInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{isEditing ? "Edit Data Stunting" : "Input Data Baru"}</h2>
              <button onClick={() => setShowInputModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nama Anak</label>
                  <input required name="nama_anak" value={formData.nama_anak} onChange={handleInputString} className="w-full rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">L/P</label>
                  <select name="jk" value={formData.jk} onChange={handleInputString} className="w-full rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-sm dark:text-white outline-none">
                    <option value="L">L</option><option value="P">P</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-xs font-medium text-slate-500 dark:text-slate-400">Tgl Lahir</label><input required type="date" name="tgl_lahir" value={formData.tgl_lahir} onChange={handleInputString} className="w-full rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-sm dark:text-white outline-none" /></div>
                <div className="space-y-2"><label className="text-xs font-medium text-slate-500 dark:text-slate-400">Tgl Ukur</label><input required type="date" name="tgl_ukur" value={formData.tgl_ukur} onChange={handleInputString} className="w-full rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-sm dark:text-white outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-xs font-medium text-slate-500 dark:text-slate-400">Berat (kg)</label><input required type="number" step="0.01" name="bb_kg" value={formData.bb_kg} onChange={handleInputString} className="w-full rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-sm dark:text-white outline-none" /></div>
                <div className="space-y-2"><label className="text-xs font-medium text-slate-500 dark:text-slate-400">Tinggi (cm)</label><input required type="number" step="0.01" name="tb_cm" value={formData.tb_cm} onChange={handleInputString} className="w-full rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-sm dark:text-white outline-none" /></div>
              </div>
              <div className="space-y-2"><label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nama Ibu</label><input required name="nama_ibu" value={formData.nama_ibu} onChange={handleInputString} className="w-full rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-sm dark:text-white outline-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-xs font-medium text-slate-500 dark:text-slate-400">Posyandu</label><input required name="posyandu" value={formData.posyandu} onChange={handleInputString} className="w-full rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-sm dark:text-white outline-none" /></div>
                <div className="space-y-2"><label className="text-xs font-medium text-slate-500 dark:text-slate-400">Alamat</label><input name="alamat" value={formData.alamat} onChange={handleInputString} className="w-full rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-sm dark:text-white outline-none" /></div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setShowInputModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 rounded-md hover:bg-slate-200">Batal</button>
                <button disabled={isSubmitting} type="submit" className={`px-4 py-2 text-sm font-medium text-white rounded-md flex items-center ${isEditing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isEditing ? "Update" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-6">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400"><Trash2 className="h-6 w-6" /></div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Hapus Data?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
              <div className="mt-6 flex gap-2 w-full">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 rounded-md hover:bg-slate-200">Batal</button>
                <button onClick={handleDelete} disabled={isSubmitting} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">{isSubmitting ? "Menghapus..." : "Ya, Hapus"}</button>
              </div>
           </div>
        </div>
      )}

    </div>
  )
}

interface StatsCardProps { label: string; value: string | number; icon: React.ReactNode; bg: string }
function StatsCard({ label, value, icon, bg }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex items-center gap-4">
      <div className={`p-3 rounded-full ${bg}`}>{icon}</div>
      <div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p><span className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</span></div>
    </div>
  )
}