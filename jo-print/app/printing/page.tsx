import Link from 'next/link'
import { Upload, Phone } from 'lucide-react'

const printingServices = [
  { icon: '📄', title: 'طباعة وثائق', desc: 'PDF, Word, PowerPoint وجميع الصيغ', href: '/printing/upload' },
  { icon: '💼', title: 'بطاقات عمل', desc: 'بطاقات احترافية بجودة فاخرة', href: '/store/business-cards' },
  { icon: '📢', title: 'فلايرات وبروشورات', desc: 'مطبوعات تسويقية ملونة', href: '/store/brochures' },
  { icon: '🎌', title: 'طباعة كبيرة الحجم', desc: 'بانرات، ملصقات، لوحات', href: '/store/banners' },
  { icon: '📓', title: 'دفاتر مخصصة', desc: 'دفاتر بغلاف مطبوع حسب طلبك', href: '/store/notebooks' },
  { icon: '🎓', title: 'مطبوعات جامعية', desc: 'رسائل، أبحاث، تقارير', href: '/printing/upload' },
]

export default function PrintingPage() {
  return (
    <div className="py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">خدمات الطباعة</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            طباعة احترافية لجميع احتياجاتك. ارفع ملفك واستلم طلبك في أسرع وقت.
          </p>
        </div>

        {/* Upload CTA */}
        <div className="bg-gradient-to-l from-primary to-primary-dark text-white rounded-2xl p-8 mb-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">ارفع ملفك الآن</h2>
            <p className="text-white/80">PDF, Word, JPG, PNG, PPT — أسرع طريقة لطباعة احتياجاتك</p>
          </div>
          <Link
            href="/printing/upload"
            className="flex items-center gap-2 bg-white text-primary font-bold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            <Upload size={20} />
            ارفع ملفك
          </Link>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {printingServices.map(service => (
            <Link key={service.href + service.title} href={service.href}>
              <div className="bg-white border border-border rounded-[12px] p-5 hover:shadow-md transition-all hover:border-primary/30">
                <div className="text-3xl mb-3">{service.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{service.title}</h3>
                <p className="text-sm text-gray-500">{service.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Contact for custom orders */}
        <div className="bg-surface border border-border rounded-[12px] p-6 flex flex-col md:flex-row items-center gap-4">
          <Phone size={24} className="text-primary" />
          <div className="flex-1 text-center md:text-right">
            <h3 className="font-bold text-gray-900">هل تحتاج طلباً خاصاً؟</h3>
            <p className="text-sm text-gray-500">تواصل معنا لطلبات الجملة والطباعة الخاصة</p>
          </div>
          <a href="tel:0791234567" className="bg-primary text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors">
            اتصل بنا
          </a>
        </div>
      </div>
    </div>
  )
}
