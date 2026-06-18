import HeroSection from '@/components/home/HeroSection'
import ServicesSection from '@/components/home/ServicesSection'
import HowItWorksSection from '@/components/home/HowItWorksSection'
import FeaturedProducts from '@/components/home/FeaturedProducts'

const trustIndicators = [
  { icon: '🏆', title: 'الجودة مضمونة', desc: 'طباعة عالية الجودة أو نعيد طباعة مجاناً' },
  { icon: '🕐', title: 'دعم 24/7', desc: 'فريق دعم متاح على مدار الساعة' },
  { icon: '🚚', title: 'توصيل سريع', desc: 'توصيل لجميع مناطق الأردن خلال 24-48 ساعة' },
  { icon: '💳', title: 'دفع آمن', desc: 'دفع عند الاستلام أو بطاقة ائتمان بأمان تام' },
]

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <HowItWorksSection />
      <FeaturedProducts />

      {/* Trust Indicators */}
      <section className="py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">لماذا JO-PRINT؟</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {trustIndicators.map(item => (
              <div key={item.title} className="text-center p-5 rounded-[12px] bg-surface border border-border">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
