'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FILE_STATUS_LABELS } from '@/lib/constants'
import { Eye, Download, CheckCircle, XCircle, Clock, MessageCircle, X } from 'lucide-react'

interface PrintFile {
  id: string
  file_name: string
  file_path: string
  file_size: number | null
  file_type: string | null
  status: string
  notes: string | null
  created_at: string
  print_options: Record<string, unknown> | null
  user_id: string | null
  order_id: string | null
  orders?: { order_number: string; customer_name: string; customer_phone: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  uploaded:  'bg-blue-50 text-blue-700 border-blue-200',
  reviewing: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved:  'bg-green-50 text-green-700 border-green-200',
  rejected:  'bg-red-50 text-red-700 border-red-200',
}

const STATUS_ICONS: Record<string, string> = {
  uploaded:  '📤',
  reviewing: '🔍',
  approved:  '✅',
  rejected:  '❌',
}

function formatSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatFileType(mime: string | null) {
  if (!mime) return '—'
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'application/vnd.ms-powerpoint': 'PPT',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  }
  return map[mime] ?? mime.split('/')[1]?.toUpperCase() ?? '—'
}

const PRINT_OPTIONS_LABELS: Record<string, string> = {
  size: 'الحجم', color: 'اللون', sides: 'الوجهة',
  paperType: 'الورق', copies: 'النسخ', quantity: 'الكمية',
}
const PRINT_OPTIONS_VALUES: Record<string, Record<string, string>> = {
  color:     { color: 'ألوان', blackwhite: 'أبيض وأسود' },
  sides:     { single: 'وجه واحد', double: 'وجهين' },
  paperType: { standard: 'عادي', glossy: 'لامع', matte: 'مطفي' },
}

export default function AdminFilesPage() {
  const [files, setFiles] = useState<PrintFile[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<PrintFile | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('print_files')
      .select('*, orders(order_number, customer_name, customer_phone)')
      .order('created_at', { ascending: false })
    setFiles((data ?? []) as PrintFile[])
    setLoading(false)
  }

  const updateStatus = async (fileId: string, status: string, note?: string) => {
    setUpdating(fileId)
    const supabase = createClient()
    await supabase.from('print_files')
      .update({ status, ...(note !== undefined ? { notes: note } : {}) })
      .eq('id', fileId)
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status, notes: note ?? f.notes } : f))
    if (selected?.id === fileId) setSelected(p => p ? { ...p, status, notes: note ?? p.notes } : null)
    setUpdating(null)
  }

  const openDetail = async (file: PrintFile) => {
    setSelected(file)
    setNoteInput(file.notes ?? '')
    setFileUrl(null)
    setLoadingUrl(true)
    const supabase = createClient()
    const { data } = await supabase.storage
      .from('print-files')
      .createSignedUrl(file.file_path, 3600)
    setFileUrl(data?.signedUrl ?? null)
    setLoadingUrl(false)
  }

  const openWhatsApp = (file: PrintFile, type: 'approved' | 'rejected' | 'custom') => {
    const phone = file.orders?.customer_phone
    if (!phone) return
    const waNum = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '962781141113'
    const name = file.orders?.customer_name ?? 'العميل'
    const fname = file.file_name
    const order = file.orders?.order_number ? `رقم الطلب: ${file.orders.order_number}` : ''
    let msg = ''
    if (type === 'approved')
      msg = `مرحباً ${name} 👋\nتمت الموافقة على ملفك "${fname}" وسيبدأ الطباعة قريباً.\n${order}`
    else if (type === 'rejected')
      msg = `مرحباً ${name} 👋\nنأسف، تعذّر قبول الملف "${fname}".\nالسبب: ${noteInput || 'يرجى التواصل معنا'}\n${order}`
    else
      msg = `مرحباً ${name}، بخصوص ملف الطباعة "${fname}":\n${noteInput || '...'}`
    window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const filtered = filter === 'all' ? files : files.filter(f => f.status === filter)
  const counts = files.reduce<Record<string, number>>((acc, f) => {
    acc[f.status] = (acc[f.status] ?? 0) + 1; return acc
  }, {})

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ملفات الطباعة</h1>
          <p className="text-sm text-gray-500 mt-0.5">مراجعة وإدارة ملفات الطباعة المرفوعة من العملاء</p>
        </div>
        <button onClick={load} className="text-sm text-primary hover:underline">تحديث</button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { key: 'uploaded',  label: 'مرفوعة جديدة',   color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100'   },
          { key: 'reviewing', label: 'قيد المراجعة',    color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
          { key: 'approved',  label: 'تمت الموافقة',    color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100'  },
          { key: 'rejected',  label: 'مرفوضة',           color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100'    },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`${s.bg} border ${s.border} rounded-xl p-4 text-center transition-all hover:shadow-sm ${filter === s.key ? 'ring-2 ring-primary/30' : ''}`}
          >
            <div className={`text-2xl font-bold ${s.color}`}>{counts[s.key] ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([['all', 'الكل', files.length]] as [string, string, number][])
          .concat(Object.entries(FILE_STATUS_LABELS).map(([k, v]) => [k, v, counts[k] ?? 0]))
          .map(([val, label, count]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              filter === val ? 'bg-primary text-white' : 'bg-white border border-border text-gray-600 hover:bg-surface'
            }`}
          >
            {STATUS_ICONS[val] ?? '📋'} {label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${filter === val ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الملف</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">النوع</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الحجم</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الطلب</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">العميل</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">تاريخ الرفع</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(file => (
                <tr key={file.id} className={`hover:bg-surface/50 ${file.status === 'uploaded' ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 max-w-52 truncate" title={file.file_name}>
                      {file.file_name}
                    </div>
                    {file.notes && (
                      <div className="text-xs text-gray-400 mt-0.5 truncate max-w-52">💬 {file.notes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                      {formatFileType(file.file_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatSize(file.file_size)}</td>
                  <td className="px-4 py-3">
                    {file.orders?.order_number
                      ? <span className="font-mono text-primary text-xs">{file.orders.order_number}</span>
                      : <span className="text-gray-400 text-xs">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-sm">{file.orders?.customer_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${STATUS_COLORS[file.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {STATUS_ICONS[file.status]} {FILE_STATUS_LABELS[file.status] ?? file.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(file.created_at).toLocaleDateString('ar-JO')}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(file)}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                      title="معاينة وإدارة"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-gray-400">
                    <div className="text-4xl mb-2">📁</div>
                    <div className="text-sm">لا توجد ملفات في هذه الفئة</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex" dir="rtl">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">

            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="font-bold text-gray-900">مراجعة الملف</h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-64">{selected.file_name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Status badge */}
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border ${STATUS_COLORS[selected.status] ?? ''}`}>
                  {STATUS_ICONS[selected.status]} {FILE_STATUS_LABELS[selected.status] ?? selected.status}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(selected.created_at).toLocaleString('ar-JO')}
                </span>
              </div>

              {/* File info */}
              <div className="bg-surface rounded-xl p-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">نوع الملف</span>
                  <span className="font-mono font-medium bg-gray-100 px-2 py-0.5 rounded text-xs">{formatFileType(selected.file_type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الحجم</span>
                  <span className="font-medium">{formatSize(selected.file_size)}</span>
                </div>
                {selected.orders && (
                  <>
                    <div className="border-t border-gray-100 pt-2.5 flex justify-between">
                      <span className="text-gray-500">رقم الطلب</span>
                      <span className="font-mono text-primary text-xs">{selected.orders.order_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">العميل</span>
                      <span className="font-medium">{selected.orders.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">الهاتف</span>
                      <span className="font-mono text-xs" dir="ltr">{selected.orders.customer_phone}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Print options */}
              {selected.print_options && Object.keys(selected.print_options).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">خيارات الطباعة المطلوبة</h3>
                  <div className="bg-surface rounded-xl p-4 space-y-2 text-sm">
                    {Object.entries(selected.print_options).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-gray-500">{PRINT_OPTIONS_LABELS[k] ?? k}</span>
                        <span className="font-medium">
                          {PRINT_OPTIONS_VALUES[k]?.[String(v)] ?? String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* File access */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">الوصول للملف</h3>
                {loadingUrl ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                    جارٍ إنشاء رابط الوصول...
                  </div>
                ) : fileUrl ? (
                  <div className="flex gap-3">
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline py-2">
                      <Eye size={15} /> معاينة في المتصفح
                    </a>
                    <span className="text-gray-200 py-2">|</span>
                    <a href={fileUrl} download={selected.file_name}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:underline py-2">
                      <Download size={15} /> تنزيل الملف
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-red-500 py-2">تعذّر إنشاء رابط الوصول — تحقق من إعدادات التخزين</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">ملاحظة (تُرسل للعميل)</h3>
                <textarea
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  rows={3}
                  placeholder="اكتب ملاحظة للعميل — تظهر عند الرفض أو الموافقة..."
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="p-5 border-t border-border space-y-3 flex-shrink-0 bg-white">
              {/* Status actions */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => updateStatus(selected.id, 'reviewing')}
                  disabled={updating === selected.id || selected.status === 'reviewing'}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-yellow-200 bg-yellow-50 text-yellow-700 text-xs font-semibold hover:bg-yellow-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Clock size={16} />
                  قيد المراجعة
                </button>
                <button
                  onClick={async () => {
                    await updateStatus(selected.id, 'approved', noteInput || undefined)
                    openWhatsApp(selected, 'approved')
                  }}
                  disabled={updating === selected.id || selected.status === 'approved'}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-green-200 bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={16} />
                  موافقة ✓
                </button>
                <button
                  onClick={async () => {
                    if (!noteInput.trim()) {
                      alert('اكتب سبب الرفض في خانة الملاحظات أولاً')
                      return
                    }
                    await updateStatus(selected.id, 'rejected', noteInput)
                    openWhatsApp(selected, 'rejected')
                  }}
                  disabled={updating === selected.id || selected.status === 'rejected'}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <XCircle size={16} />
                  رفض ✗
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center">
                عند الموافقة أو الرفض، سيفتح واتساب تلقائياً لإرسال إشعار للعميل
              </p>

              {/* Manual WhatsApp */}
              {selected.orders?.customer_phone && (
                <button
                  onClick={() => openWhatsApp(selected, 'custom')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors"
                >
                  <MessageCircle size={15} />
                  رسالة مخصصة عبر واتساب
                </button>
              )}

              {/* Save note only */}
              <button
                onClick={async () => { await updateStatus(selected.id, selected.status, noteInput) }}
                disabled={updating === selected.id}
                className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
              >
                حفظ الملاحظة فقط (بدون تغيير الحالة)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
