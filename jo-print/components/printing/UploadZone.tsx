'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, X } from 'lucide-react'

interface UploadedFile {
  name: string
  size: number
  type: string
}

interface UploadZoneProps {
  onFileSelect: (file: File) => void
}

export default function UploadZone({ onFileSelect }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const acceptedFormats = ['PDF', 'DOC', 'DOCX', 'JPG', 'PNG', 'PPT', 'PPTX']

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setUploadedFile({ name: file.name, size: file.size, type: file.type })
      onFileSelect(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile({ name: file.name, size: file.size, type: file.type })
      onFileSelect(file)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div>
      {!uploadedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary hover:bg-gray-50'
          }`}
        >
          <Upload size={40} className="mx-auto text-gray-400 mb-3" />
          <h3 className="font-semibold text-gray-700 mb-2">اسحب ملفك هنا أو اضغط للاختيار</h3>
          <p className="text-sm text-gray-500 mb-3">
            الصيغ المدعومة: {acceptedFormats.join(', ')}
          </p>
          <p className="text-xs text-gray-400">الحد الأقصى لحجم الملف: 50 ميغابايت</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.ppt,.pptx"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <FileText size={20} className="text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 text-sm">{uploadedFile.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(uploadedFile.size)}</p>
          </div>
          <button onClick={() => setUploadedFile(null)} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
