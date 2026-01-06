"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { 
  Search, Plus, FileDown,
  Trash2, X, Loader2, Pencil, FileUp, CheckSquare, Square,
  Baby
} from "lucide-react"

// --- SETUP SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// --- TYPES ---
type StuntingData = {
  id: string
  created_at: string
  nama_anak: string
  jk: "L" | "P"
  tgl_lahir: string
  usia_bulan: number | null
  tgl_ukur: string
  bb_kg: number
  tb_cm: number
  lingkar_kepala: number | null
  lila: number | null
  nama_ibu: string | null
  alamat: string | null
  posyandu: string | null
}

type StuntingForm = {
  nama_anak: string
  jk: "L" | "P"
  tgl_lahir: string
  usia_bulan: string | number
  tgl_ukur: string
  bb_kg: string | number
  tb_cm: string | number
  lingkar_kepala: string | number
  lila: string | number
  nama_ibu: string
  alamat: string
  posyandu: string
}

interface StatsCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  bg: string
}

export default function StuntingPage() {
  // --- STATE ---
  const [data, setData] = useState<StuntingData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal States
  const [showInputModal, setShowInputModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  
  // Action Loading States
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const initialForm: StuntingForm = {
    nama_anak: "",
    jk: "L",
    tgl_lahir: "",
    usia_bulan: "",
    tgl_ukur: new Date().toISOString().split('T')[0],
    bb_kg: "",
    tb_cm: "",
    lingkar_kepala: "",
    lila: "",
    nama_ibu: "",
    alamat: "",
    posyandu: ""
  }
  const [formData, setFormData] = useState<StuntingForm>(initialForm)

  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    const { data: result, error } = await supabase
      .from('stunting')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && result) {
      setData(result as StuntingData[])
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData, refreshKey])

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1)
    setSelectedIds([])
  }

  // --- SELECTION HANDLERS ---
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredData.map(item => item.id))
    }
  }

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  // --- ACTION HANDLERS ---
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    const reader = new FileReader()

    reader.onload = async (event) => {
      try {
        const binaryStr = event.target?.result
        if (typeof binaryStr !== "string") return

        const workbook = XLSX.read(binaryStr, { type: "binary" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(sheet) as Record<string, string | number | null>[]

        if (jsonData.length === 0) throw new Error("File Excel kosong")

        const mappedData = jsonData.map((row) => {
          // Helper membersihkan tanggal
          const formatExcelDate = (val: string | number | null | undefined): string | null => {
            if (!val) return null
            if (typeof val === 'number') {
              const date = new Date(Math.round((val - 25569) * 86400 * 1000))
              return date.toISOString().split('T')[0]
            }
            const s = String(val).trim()
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
            return s
          }

          // Pembersihan JK agar sesuai CHECK constraint database ('L' atau 'P')
          let jkValue = String(row["JK"] || row["Jenis Kelamin"] || "L").trim().toUpperCase()
          if (jkValue.startsWith("LA")) jkValue = "L"
          if (jkValue.startsWith("PE")) jkValue = "P"
          const finalJk = jkValue.charAt(0) === "P" ? "P" : "L"

          return {
            nama_anak: String(row["Nama Anak"] || "Tanpa Nama").trim(),
            jk: finalJk,
            tgl_lahir: formatExcelDate(row["Tgl Lahir"] || row["Tanggal Lahir"]),
            usia_bulan: row["Usia Bulan"] ? Number(row["Usia Bulan"]) : null,
            tgl_ukur: formatExcelDate(row["Tgl Ukur"] || row["Tanggal Ukur"]) || new Date().toISOString().split('T')[0],
            bb_kg: Number(row["BB KG"] || row["Berat Badan"] || 0),
            tb_cm: Number(row["TB CM"] || row["Tinggi Badan"] || 0),
            lingkar_kepala: row["Lingkar Kepala"] ? Number(row["Lingkar Kepala"]) : null,
            lila: row["LILA"] ? Number(row["LILA"]) : null,
            nama_ibu: row["Nama Ibu"] ? String(row["Nama Ibu"]).trim() : "",
            alamat: row["Alamat"] ? String(row["Alamat"]).trim() : "",
            posyandu: row["Posyandu"] ? String(row["Posyandu"]).trim() : ""
          }
        })

        const finalData = mappedData.filter(d => d.tgl_lahir !== null)
        const { error } = await supabase.from('stunting').insert(finalData)
        
        if (error) throw new Error(error.message)

        toast.success(`Berhasil mengimport ${finalData.length} data!`)
        triggerRefresh()
      } catch (err: unknown) { 
        console.error("Import Error:", err)
        const message = err instanceof Error ? err.message : "Periksa format Excel"
        toast.error("Gagal Import: " + message) 
      } finally { 
        setIsImporting(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleExportExcel = () => {
    setIsExporting(true)
    const dataToExport = data.map(item => ({
      "Nama Anak": item.nama_anak,
      "JK": item.jk,
      "Tanggal Lahir": item.tgl_lahir,
      "Usia Bulan": item.usia_bulan,
      "Tanggal Ukur": item.tgl_ukur,
      "BB KG": item.bb_kg,
      "TB CM": item.tb_cm,
      "Lingkar Kepala": item.lingkar_kepala,
      "LILA": item.lila,
      "Nama Ibu": item.nama_ibu,
      "Alamat": item.alamat,
      "Posyandu": item.posyandu
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Stunting")
    XLSX.writeFile(workbook, "Data_Stunting.xlsx")
    setIsExporting(false)
    toast.success("Data berhasil diekspor")
  }

  const handleDeleteBulk = async () => {
    setIsSubmitting(true)
    const { error } = await supabase.from('stunting').delete().in('id', selectedIds)
    if (!error) {
      toast.success(`${selectedIds.length} data dihapus`)
      setShowBulkDeleteModal(false)
      triggerRefresh()
    }
    setIsSubmitting(false)
  }

  const handleDelete = async () => {
    if (!selectedId) return
    setIsSubmitting(true)
    const { error } = await supabase.from('stunting').delete().eq('id', selectedId)
    if (!error) {
      toast.success("Data dihapus")
      setShowDeleteModal(false)
      triggerRefresh()
    }
    setIsSubmitting(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const payload = {
      nama_anak: formData.nama_anak,
      jk: formData.jk,
      tgl_lahir: formData.tgl_lahir,
      tgl_ukur: formData.tgl_ukur,
      bb_kg: Number(formData.bb_kg),
      tb_cm: Number(formData.tb_cm),
      usia_bulan: Number(formData.usia_bulan),
      lingkar_kepala: formData.lingkar_kepala ? Number(formData.lingkar_kepala) : null,
      lila: formData.lila ? Number(formData.lila) : null,
      nama_ibu: formData.nama_ibu,
      alamat: formData.alamat,
      posyandu: formData.posyandu
    }
    
    const result = isEditing 
      ? await supabase.from('stunting').update(payload).eq('id', selectedId) 
      : await supabase.from('stunting').insert([payload])
      
    if (!result.error) {
      setShowInputModal(false)
      triggerRefresh()
      toast.success("Data Berhasil Disimpan")
    } else { 
      toast.error(result.error.message) 
    }
    setIsSubmitting(false)
  }

  const filteredData = data.filter((item) =>
    item.nama_anak.toLowerCase().includes(search.toLowerCase()) ||
    (item.nama_ibu && item.nama_ibu.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950 p-4 md:p-8 space-y-8 transition-colors duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Data Stunting</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">Monitoring pertumbuhan balita secara real-time.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} ref={fileInputRef} className="hidden" />
          
          {selectedIds.length > 0 && (
            <button onClick={() => setShowBulkDeleteModal(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 h-10 px-4 py-2 transition-colors">
              <Trash2 className="mr-2 h-4 w-4" /> Hapus ({selectedIds.length})
            </button>
          )}

          <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-green-700 dark:text-green-500 h-10 px-4 py-2 transition-colors">
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />} Import
          </button>
          
          <button onClick={handleExportExcel} disabled={isExporting} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 h-10 px-4 py-2 transition-colors">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />} Export
          </button>

          <button onClick={() => { setFormData(initialForm); setIsEditing(false); setShowInputModal(true); }} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-blue-700 dark:text-blue-400 h-10 px-4 py-2 transition-colors">
            <Plus className="mr-2 h-4 w-4" /> Input Data
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid gap-4 md:grid-cols-1 max-w-sm">
        <StatsCard 
          label="Total Balita" 
          value={data.length} 
          icon={<Baby className="h-5 w-5 text-blue-600 dark:text-blue-400" />} 
          bg="bg-blue-50 dark:bg-blue-900/20" 
        />
      </div>

      {/* TABLE SECTION */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-none">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Cari balita atau ibu..." className="h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-10 pr-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 font-medium border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="h-12 px-4 text-center">
                  <button onClick={toggleSelectAll} className="text-zinc-400 hover:text-blue-500 transition-colors">
                    {selectedIds.length === filteredData.length && filteredData.length > 0 ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5" />}
                  </button>
                </th>
                <th className="h-12 px-2 text-center font-semibold">No</th>
                <th className="h-12 px-4">Nama Anak</th>
                <th className="h-12 px-2">JK</th>
                <th className="h-12 px-4">Usia</th>
                <th className="h-12 px-4 text-center">BB/TB</th>
                <th className="h-12 px-4 text-center">LK/LILA</th>
                <th className="h-12 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {isLoading ? (
                <tr><td colSpan={8} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" /></td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={8} className="h-24 text-center text-zinc-500">Data tidak ditemukan.</td></tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.id} className={`${selectedIds.includes(item.id) ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'} transition-colors border-b border-zinc-200 dark:border-zinc-800`}>
                    <td className="p-4 text-center">
                      <button onClick={() => toggleSelectRow(item.id)} className="text-zinc-400 hover:text-blue-500 transition-colors">
                        {selectedIds.includes(item.id) ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5" />}
                      </button>
                    </td>
                    <td className="px-2 text-center text-zinc-400 font-mono text-xs">{index + 1}</td>
                    <td className="p-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{item.nama_anak}</div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-tighter">Ibu: {item.nama_ibu || '-'}</div>
                    </td>
                    <td className="p-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.jk === 'L' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400'}`}>{item.jk}</span>
                    </td>
                    <td className="p-4 whitespace-nowrap text-xs font-medium text-zinc-700 dark:text-zinc-300">{item.usia_bulan ?? '-'} bln</td>
                    <td className="p-4 whitespace-nowrap text-center">
                      <div className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{item.bb_kg} <span className="text-[10px] font-normal text-zinc-400">kg</span></div>
                      <div className="text-[11px] text-zinc-400">{item.tb_cm} <span className="text-[9px]">cm</span></div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-center">
                       <div className="text-[11px] text-zinc-600 dark:text-zinc-400">LK: {item.lingkar_kepala || '-'}</div>
                       <div className="text-[11px] text-zinc-600 dark:text-zinc-400">LL: {item.lila || '-'}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => { 
                            setSelectedId(item.id); 
                            setIsEditing(true); 
                            setFormData({
                              nama_anak: item.nama_anak,
                              jk: item.jk,
                              tgl_lahir: item.tgl_lahir,
                              usia_bulan: item.usia_bulan ?? "",
                              tgl_ukur: item.tgl_ukur,
                              bb_kg: item.bb_kg,
                              tb_cm: item.tb_cm,
                              lingkar_kepala: item.lingkar_kepala ?? "",
                              lila: item.lila ?? "",
                              nama_ibu: item.nama_ibu ?? "",
                              alamat: item.alamat ?? "",
                              posyandu: item.posyandu ?? ""
                            }); 
                            setShowInputModal(true); 
                          }} 
                          className="text-zinc-400 hover:text-orange-500 p-1.5 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setSelectedId(item.id); setShowDeleteModal(true); }} className="text-zinc-400 hover:text-red-500 p-1.5 transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INPUT MODAL */}
      {showInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm text-zinc-900 dark:text-zinc-100">
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-none">
            <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <h2 className="text-lg font-bold">{isEditing ? "Edit Data Balita" : "Input Data Baru"}</h2>
              <button onClick={() => setShowInputModal(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nama Lengkap Anak</label>
                <input required className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" value={formData.nama_anak} onChange={e => setFormData({...formData, nama_anak: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Jenis Kelamin</label>
                <select className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 outline-none" value={formData.jk} onChange={e => setFormData({...formData, jk: e.target.value as "L" | "P"})}>
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tanggal Lahir</label>
                <input type="date" required className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 outline-none" value={formData.tgl_lahir} onChange={e => setFormData({...formData, tgl_lahir: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Usia (Bulan)</label>
                <input type="number" required className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 outline-none" value={formData.usia_bulan} onChange={e => setFormData({...formData, usia_bulan: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tanggal Ukur</label>
                <input type="date" required className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 outline-none" value={formData.tgl_ukur} onChange={e => setFormData({...formData, tgl_ukur: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Berat Badan (kg)</label>
                <input type="number" step="0.01" required className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 outline-none" value={formData.bb_kg} onChange={e => setFormData({...formData, bb_kg: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tinggi Badan (cm)</label>
                <input type="number" step="0.01" required className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 outline-none" value={formData.tb_cm} onChange={e => setFormData({...formData, tb_cm: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Lingkar Kepala (cm)</label>
                <input type="number" step="0.01" className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 outline-none" value={formData.lingkar_kepala} onChange={e => setFormData({...formData, lingkar_kepala: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">LILA (cm)</label>
                <input type="number" step="0.01" className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 outline-none" value={formData.lila} onChange={e => setFormData({...formData, lila: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nama Ibu</label>
                <input className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 outline-none" value={formData.nama_ibu} onChange={e => setFormData({...formData, nama_ibu: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Posyandu</label>
                <input className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 outline-none" value={formData.posyandu} onChange={e => setFormData({...formData, posyandu: e.target.value})} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Alamat</label>
                <textarea rows={2} className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 outline-none resize-none" value={formData.alamat} onChange={e => setFormData({...formData, alamat: e.target.value})} />
              </div>
              <div className="md:col-span-2 pt-6 flex gap-3">
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-none">
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto text-zinc-400" /> : "Simpan Data"}
                </button>
                <button type="button" onClick={() => setShowInputModal(false)} className="px-6 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-none">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK DELETE MODAL */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-none">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30"><Trash2 className="h-8 w-8" /></div>
              <div>
                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Hapus {selectedIds.length} Data?</h3>
                <p className="text-sm text-zinc-500 mt-1">Data yang dipilih akan dihapus permanen dari sistem.</p>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setShowBulkDeleteModal(false)} className="flex-1 py-3 text-sm font-medium border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-none">Batal</button>
              <button onClick={handleDeleteBulk} disabled={isSubmitting} className="flex-1 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-none disabled:opacity-50">Ya, Hapus Semua</button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm text-zinc-900 dark:text-zinc-100">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-none text-center">
            <h3 className="text-lg font-bold">Hapus Data Ini?</h3>
            <p className="text-sm text-zinc-500 mt-2">Data balita ini akan dihapus permanen.</p>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 text-sm font-medium border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-none">Batal</button>
              <button onClick={handleDelete} disabled={isSubmitting} className="flex-1 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-none">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatsCard({ label, value, icon, bg }: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex items-center gap-5 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <div className={`p-4 rounded-2xl ${bg} border border-transparent`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
        <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">{value}</span>
      </div>
    </div>
  )
}