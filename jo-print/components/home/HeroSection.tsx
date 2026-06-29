import Link from 'next/link'
import { Upload, FileText, ArrowLeft } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-primary to-primary-dark text-white py-20 px-4">
      <div className="max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-sm mb-6">
          <span>🇯🇴</span>
          <span>منصة الطباعة الأولى في الأردن</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
          خدمات طباعة احترافية
          <br />
          <span className="text-primary-light">في الأردن</span>
        </h1>
        <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
          ارفع ملفك، اختر خياراتك، واستلم طلبك. طباعة عالية الجودة بأسعار منافسة وتوصيل سريع لجميع أنحاء المملكة.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/printing/upload"
            className="flex items-center justify-center gap-2 bg-white text-primary font-semibold px-6 py-3.5 rounded-xl hover:bg-gray-50 transition-colors shadow-lg"
          >
            <Upload size={20} />
            ارفع ملفك الآن
          </Link>
          <Link
            href="/printing"
            className="flex items-center justify-center gap-2 border-2 border-white text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <FileText size={20} />
            اطلب عرض سعر
            <ArrowLeft size={18} />
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-white/70">
          <span>✓ جودة مضمونة</span>
          <span>✓ دعم على مدار الساعة</span>
          <span>✓ توصيل سريع</span>
          <span>✓ أسعار منافسة</span>
        </div>
      </div>
    </section>
  )
}
