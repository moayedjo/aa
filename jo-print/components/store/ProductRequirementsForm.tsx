'use client'

import { useRef, useState } from 'react'
import { Upload, X, Paperclip, Loader2 } from 'lucide-react'
import type { ProductRequirements, RequirementValues } from '@/lib/productRequirements'

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx'
const MAX_MB = 50

interface Props {
  requirements: ProductRequirements
  values: RequirementValues
  onChange: (values: RequirementValues) => void
}

export default function ProductRequirementsForm({ requirements, values, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const showFile = requirements.designFile !== 'none'
  const fileRequired = requirements.designFile === 'required' && !requirements.imageOrTextRule

  async function handleFile(file: File) {
    setUploadError(null)
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadError(`حجم الملف يتجاوز الحد المسموح (${MAX_MB}MB)`)
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data: unknown = await res.json()
      if (!res.ok || !data || typeof data !== 'object' || !('fileId' in data)) {
        const msg = data && typeof data === 'object' && 'error' in data
          ? String((data as Record<string, unknown>).error)
          : 'فشل في رفع الملف'
        setUploadError(msg)
        return
      }
      const d = data as { fileId: string }
      onChange({ ...values, fileId: d.fileId, fileName: file.name })
    } catch {
      setUploadError('تعذر الاتصال بالخادم، حاول مرة أخرى')
    } finally {
      setUploading(false)
    }
  }

  function removeFile() {
    onChange({ ...values, fileId: null, fileName: null })
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 mb-5">
      <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
        <span aria-hidden>📋</span> مطلوب لإكمال الطلب
      </h3>
      {requirements.note && <p className="text-xs text-amber-700 mb-3">{requirements.note}</p>}

      <div className="space-y-4 mt-3">
        {/* حقول نصية خاصة بالمنتج */}
        {requirements.textFields.map(field => (
          <div key={field.key}>
            <label htmlFor={`req-${field.key}`} className="block text-sm font-semibold text-gray-700 mb-1.5">
              {field.label}
              {field.required && !requirements.imageOrTextRule && <span className="text-red-500 mr-1">*</span>}
            </label>
            {field.multiline ? (
              <textarea
                id={`req-${field.key}`}
                rows={3}
                value={values.texts[field.key] ?? ''}
                onChange={e => onChange({ ...values, texts: { ...values.texts, [field.key]: e.target.value } })}
                placeholder={field.placeholder}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            ) : (
              <input
                id={`req-${field.key}`}
                type="text"
                value={values.texts[field.key] ?? ''}
                onChange={e => onChange({ ...values, texts: { ...values.texts, [field.key]: e.target.value } })}
                placeholder={field.placeholder}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            )}
          </div>
        ))}

        {/* رفع ملف التصميم */}
        {showFile && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {requirements.fileLabel ?? 'ملف التصميم'}
              {fileRequired && <span className="text-red-500 mr-1">*</span>}
            </label>
            {values.fileId && values.fileName ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                <Paperclip size={15} className="text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-800 truncate flex-1">{values.fileName}</span>
                <button type="button" onClick={removeFile} aria-label="إزالة الملف"
                  className="text-gray-400 hover:text-red-500 flex-shrink-0">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl px-4 py-4 text-sm text-gray-500 bg-white hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {uploading
                  ? <><Loader2 size={16} className="animate-spin" /> جاري رفع الملف...</>
                  : <><Upload size={16} /> اضغط لرفع الملف (PDF, JPG, PNG, DOCX...)</>}
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
          </div>
        )}

        {/* تعليمات خاصة — لكل المنتجات */}
        <div>
          <label htmlFor="req-instructions" className="block text-sm font-semibold text-gray-700 mb-1.5">
            تعليمات خاصة <span className="text-gray-400 text-xs font-normal">(اختياري)</span>
          </label>
          <textarea
            id="req-instructions"
            rows={2}
            value={values.instructions}
            onChange={e => onChange({ ...values, instructions: e.target.value })}
            placeholder="ألوان معينة، مقاس خاص، ملاحظات للمصمم..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          />
        </div>
      </div>
    </div>
  )
}
