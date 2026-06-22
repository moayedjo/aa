import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-12 pb-6 mt-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-primary text-white font-bold px-2.5 py-1 rounded-lg text-sm">JO</span>
              <span className="text-white font-bold text-lg">PRINT</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              منصة الطباعة الرقمية الأولى في الأردن. جودة عالية وتوصيل سريع لجميع محافظات المملكة.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4 text-sm">خدماتنا</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/printing" className="hover:text-white transition-colors">خدمات الطباعة</Link></li>
              <li><Link href="/printing/upload" className="hover:text-white transition-colors">ارفع ملفك</Link></li>
              <li><Link href="/store" className="hover:text-white transition-colors">المتجر</Link></li>
              <li><Link href="/books" className="hover:text-white transition-colors">ملخصات الكتب</Link></li>
              <li><Link href="/teachers" className="hover:text-white transition-colors">المعلمون</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4 text-sm">الدعم</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/faq" className="hover:text-white transition-colors">الأسئلة الشائعة</Link></li>
              <li><Link href="/delivery" className="hover:text-white transition-colors">سياسة التوصيل</Link></li>
              <li><Link href="/orders/track" className="hover:text-white transition-colors">تتبع الطلب</Link></li>
              <li><Link href="/shops" className="hover:text-white transition-colors">مكاتب الطباعة</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4 text-sm">الشركة</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/privacy" className="hover:text-white transition-colors">سياسة الخصوصية</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">الشروط والأحكام</Link></li>
              <li><a href={`tel:${process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '+96279123456'}`} className="hover:text-white transition-colors" dir="ltr">{process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '+962-79-123456'}</a></li>
              <li><a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'info@jo-print.jo'}`} className="hover:text-white transition-colors" dir="ltr">{process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'info@jo-print.jo'}</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} JO-PRINT. جميع الحقوق محفوظة.</p>
          <p>صُنع بـ ❤️ في الأردن 🇯🇴</p>
        </div>
      </div>
    </footer>
  )
}
