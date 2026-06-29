'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">حدث خطأ غير متوقع</h1>
        <p className="text-gray-500 mb-8">نعتذر عن هذا الخطأ. يمكنك المحاولة مجدداً أو العودة للصفحة الرئيسية.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
            حاول مجدداً
          </button>
          <a href="/" className="border border-border text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            الرئيسية
          </a>
        </div>
      </div>
    </div>
  )
}
