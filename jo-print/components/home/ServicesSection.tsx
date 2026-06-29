import Link from 'next/link'

const services = [
  {
    href: '/printing',
    icon: '🖨️',
    title: 'خدمات الطباعة',
    description: 'ارفع ملفك وطبعه باحترافية. طباعة وثائق، بروشورات، بطاقات عمل، وأكثر.',
    color: 'bg-blue-50 border-blue-100',
    iconBg: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  {
    href: '/store',
    icon: '🛍️',
    title: 'المتجر',
    description: 'منتجات مطبوعة مخصصة: تيشيرتات، أكواب، دفاتر، وهدايا مميزة.',
    color: 'bg-green-50 border-green-100',
    iconBg: 'bg-green-100',
    textColor: 'text-green-700',
  },
  {
    href: '/books',
    icon: '📚',
    title: 'ملخصات الكتب',
    description: 'ملخصات منهجية لجميع المراحل الدراسية في الأردن. سهّل مراجعتك.',
    color: 'bg-purple-50 border-purple-100',
    iconBg: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
  {
    href: '/teachers',
    icon: '👨‍🏫',
    title: 'المعلمين',
    description: 'تواصل مع أفضل المعلمين والمدرسين الخصوصيين في جميع المواد.',
    color: 'bg-orange-50 border-orange-100',
    iconBg: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
]

export default function ServicesSection() {
  return (
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">خدماتنا</h2>
          <p className="text-gray-500">كل ما تحتاجه في مكان واحد</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map(service => (
            <Link key={service.href} href={service.href}>
              <div className={`rounded-[12px] border p-5 hover:shadow-md transition-all group ${service.color}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${service.iconBg}`}>
                  {service.icon}
                </div>
                <h3 className={`font-bold text-lg mb-2 ${service.textColor}`}>{service.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{service.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
