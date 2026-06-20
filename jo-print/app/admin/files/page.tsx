'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PrintFile {
  id: string
  file_name: string
  file_type: string
  file_size: number
  status: string
  notes: string | null
  created_at: string
}

const statusLabels: Record<string, string> = {
  uploaded: 'مرفوع', reviewing: 'قيد المراجعة', approved: 'موافق عليه', rejected: 'مرفوض',
}

export default function AdminFiles() {
  const [files, setFiles] = useState<PrintFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('print_files').select('*').order('created_at', { ascending: false })
      setFiles(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const updateStatus = async (id: string, status: string) => {
    const supabase = createClient()
    await supabase.from('print_files').update({ status }).eq('id', id)
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status } : f))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ملفات الطباعة</h1>
        <span className="text-sm text-gray-500">{files.length} ملف</span>
      </div>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">اسم الملف</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">النوع</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الحجم</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">تاريخ الرفع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {files.map(file => (
                <tr key={file.id} className="hover:bg-surface/50">
                  <td className="px-4 py-3 font-medium max-w-xs truncate">{file.file_name}</td>
                  <td className="px-4 py-3 text-gray-500 uppercase text-xs font-mono">
                    {file.file_type?.split('/')[1] ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {file.file_size ? `${(file.file_size / 1024 / 1024).toFixed(1)} MB` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={file.status}
                      onChange={e => updateStatus(file.id, e.target.value)}
                      className="border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {Object.entries(statusLabels).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(file.created_at).toLocaleDateString('ar-JO')}
                  </td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  <div className="text-3xl mb-2">📁</div>
                  <div>لا توجد ملفات مرفوعة بعد</div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
