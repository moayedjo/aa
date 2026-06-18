const steps = [
  {
    number: '01',
    icon: '🎯',
    title: 'اختر الخدمة',
    description: 'اختر من بين خدمات الطباعة، المتجر، الملخصات، أو التواصل مع معلم.',
  },
  {
    number: '02',
    icon: '📤',
    title: 'ارفع الملف',
    description: 'ارفع ملفك بسهولة (PDF, Word, صور) وحدد خيارات الطباعة المناسبة.',
  },
  {
    number: '03',
    icon: '📦',
    title: 'استلم طلبك',
    description: 'نطبع بجودة عالية ونوصل لبابك أو يمكنك الاستلام من أقرب مكتب طباعة.',
  },
]

export default function HowItWorksSection() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">كيف يعمل؟</h2>
          <p className="text-gray-500">ثلاث خطوات بسيطة للحصول على طلبك</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="text-center relative">
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-0 w-full border-t-2 border-dashed border-gray-200 -z-0" style={{ width: '50%', left: '75%' }} />
              )}
              <div className="relative z-10">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                  {step.icon}
                </div>
                <div className="text-xs font-bold text-primary mb-2">الخطوة {step.number}</div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
