export default function DeliveryPage() {
  return (
    <div className="py-14 px-4 bg-surface min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-3 text-center">سياسة التوصيل</h1>
        <p className="text-gray-500 text-center mb-10">كل ما تحتاج معرفته عن التوصيل والاستلام</p>
        <div className="space-y-6">
          {[
            { icon: '🚚', title: 'التوصيل للمنزل', content: 'نوصّل لجميع مناطق عمّان والزرقاء وإربد والعقبة وسائر المدن الأردنية. رسوم التوصيل 2 دينار أردني للطلبات أقل من 20 دينار، ومجاني للطلبات فوق 20 دينار. مدة التوصيل 24-48 ساعة من تأكيد الطلب.' },
            { icon: '🏪', title: 'الاستلام من المكتب', content: 'يمكنك استلام طلبك من مكتبنا في عمّان مجاناً. ساعات العمل: السبت-الخميس من 9 صباحاً حتى 8 مساءً. سنتواصل معك عندما يكون طلبك جاهزاً للاستلام.' },
            { icon: '⚡', title: 'الطباعة العاجلة', content: 'لمن يحتاج طلبه بشكل عاجل، نوفر خدمة الطباعة في نفس اليوم بسعر إضافي يبدأ من 3 دينار. يجب تقديم الطلب قبل الساعة 12 ظهراً لاستلامه في نفس اليوم.' },
            { icon: '📦', title: 'تغليف الطلبات', content: 'يُغلَّف كل طلب بعناية لحمايته أثناء التوصيل. الطلبات الكبيرة تُغلَّف في صناديق مخصصة. لا توجد رسوم تغليف إضافية.' },
          ].map(item => (
            <div key={item.title} className="bg-white border border-border rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <span className="text-3xl">{item.icon}</span>
                <div>
                  <h2 className="font-bold text-gray-900 mb-2">{item.title}</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
