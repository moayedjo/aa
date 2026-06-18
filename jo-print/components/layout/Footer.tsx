import Link from 'next/link'
import { Phone, Mail, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-12 pb-6 mt-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">JO</span>
              </div>
              <span className="text-white font-bold text-xl">PRINT</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              منصة طباعة رقمية متكاملة في الأردن. نوفر خدمات طباعة احترافية بجودة عالية وأسعار منافسة.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">الخدمات</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/printing" className="hover:text-primary transition-colors">خدمات الطباعة</Link></li>
              <li><Link href="/printing/upload" className="hover:text-primary transition-colors">رفع ملف للطباعة</Link></li>
              <li><Link href="/store" className="hover:text-primary transition-colors">المتجر</Link></li>
              <li><Link href="/books" className="hover:text-primary transition-colors">ملخصات الكتب</Link></li>
              <li><Link href="/teachers" className="hover:text-primary transition-colors">المعلمين</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">الشركة</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/shops" className="hover:text-primary transition-colors">مكاتب الطباعة</Link></li>
              <li><Link href="/orders/track" className="hover:text-primary transition-colors">تتبع الطلب</Link></li>
              <li><Link href="/account" className="hover:text-primary transition-colors">حسابي</Link></li>
              <li><a href="#" className="hover:text-primary transition-colors">سياسة الخصوصية</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">الشروط والأحكام</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">تواصل معنا</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone size={15} className="text-primary shrink-0" />
                <span>0791234567</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={15} className="text-primary shrink-0" />
                <span>info@jo-print.jo</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={15} className="text-primary shrink-0 mt-0.5" />
                <span>عمان، الأردن</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
          <p>© 2025 JO-PRINT. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  )
}
