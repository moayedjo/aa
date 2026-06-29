import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6">🔍</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">الصفحة غير موجودة</h2>
        <p className="text-gray-500 mb-8">عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
            العودة للرئيسية
          </Link>
          <Link href="/store" className="border border-border text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
            تصفح المتجر
          </Link>
        </div>
      </div>
    </div>
  )
}
