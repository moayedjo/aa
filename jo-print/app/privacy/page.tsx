export default function PrivacyPage() {
  return (
    <div className="py-14 px-4 bg-surface min-h-screen">
      <div className="max-w-2xl mx-auto prose prose-sm max-w-none">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 text-center">سياسة الخصوصية</h1>
        <p className="text-gray-400 text-center mb-10">آخر تحديث: يونيو 2025</p>
        {[
          { title: 'المعلومات التي نجمعها', body: 'نجمع المعلومات التي تزودنا بها عند التسجيل أو تقديم الطلب، مثل الاسم ورقم الهاتف والبريد الإلكتروني والعنوان. كما نحتفظ بالملفات التي ترفعها للطباعة لمدة 30 يوماً من تاريخ استلام الطلب.' },
          { title: 'كيف نستخدم معلوماتك', body: 'نستخدم معلوماتك لمعالجة طلباتك والتواصل معك بشأنها، وتحسين خدماتنا، وإرسال تحديثات الطلب. لا نبيع معلوماتك أو نشاركها مع أطراف ثالثة إلا لتنفيذ خدمة التوصيل.' },
          { title: 'أمان ملفاتك', body: 'الملفات التي ترفعها محمية ولا يمكن الوصول إليها إلا من فريق الطباعة المعتمد. يتم حذف الملفات تلقائياً بعد 30 يوماً من استلام طلبك.' },
          { title: 'حقوقك', body: 'يحق لك طلب حذف بياناتك في أي وقت، والاطلاع على المعلومات التي نحتفظ بها عنك، وتصحيح أي معلومات غير دقيقة. تواصل معنا عبر البريد الإلكتروني لممارسة هذه الحقوق.' },
          { title: 'التواصل', body: 'لأي استفسار حول سياسة الخصوصية تواصل معنا عبر البريد الإلكتروني: privacy@jo-print.jo' },
        ].map(s => (
          <div key={s.title} className="bg-white border border-border rounded-xl p-6 mb-4">
            <h2 className="font-bold text-gray-900 mb-2">{s.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
