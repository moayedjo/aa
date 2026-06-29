import Link from 'next/link'

const UPDATED = 'يونيو 2026'
const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'dxb3@yahoo.com'
const PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '+962781141113'

const sections = [
  {
    id: '1',
    title: 'المعلومات التي نجمعها',
    items: [
      {
        subtitle: 'معلومات تقدمها أنت',
        points: [
          'الاسم الكامل ورقم الهاتف والبريد الإلكتروني عند التسجيل أو تقديم الطلب.',
          'عنوان التوصيل عند اختيار خدمة التوصيل للمنزل.',
          'الملفات التي ترفعها للطباعة.',
          'أي ملاحظات أو تعليمات تضيفها مع طلبك.',
        ],
      },
      {
        subtitle: 'معلومات تُجمع تلقائياً',
        points: [
          'بيانات الاستخدام: الصفحات التي تزورها وعدد الزيارات ومدتها.',
          'عنوان IP والجهاز المستخدم ونوع المتصفح.',
          'ملفات الارتباط (Cookies) لتحسين تجربة الاستخدام.',
        ],
      },
    ],
  },
  {
    id: '2',
    title: 'كيف نستخدم معلوماتك',
    items: [
      {
        subtitle: 'لتقديم الخدمة',
        points: [
          'معالجة طلباتك وتنفيذها وإرسال تحديثات الحالة عبر واتساب أو الرسائل القصيرة.',
          'التواصل معك بشأن طلبك أو الإجابة على استفساراتك.',
          'ضمان جودة الملفات قبل الطباعة.',
        ],
      },
      {
        subtitle: 'لتحسين خدماتنا',
        points: [
          'تحليل أنماط الاستخدام لتطوير المنصة وإضافة ميزات جديدة.',
          'دراسة الطلبات الأكثر شيوعاً لتحسين المخزون وخيارات الطباعة.',
        ],
      },
      {
        subtitle: 'ما لن نفعله أبداً',
        points: [
          'لن نبيع بياناتك الشخصية لأي طرف ثالث.',
          'لن نستخدم ملفاتك أو محتوى طلباتك لأغراض تجارية أخرى.',
          'لن نرسل إليك رسائل تسويقية دون موافقتك الصريحة.',
        ],
      },
    ],
  },
  {
    id: '3',
    title: 'مشاركة المعلومات مع أطراف ثالثة',
    items: [
      {
        subtitle: 'الحالات التي قد نشارك فيها معلوماتك',
        points: [
          'شركات التوصيل: نشارك اسمك وعنوانك ورقم هاتفك لتنفيذ التوصيل فقط.',
          'مزودو الخدمات التقنية (كـ Supabase للتخزين وTwilio للإشعارات): وفق سياسات خصوصية صارمة.',
          'الجهات القانونية: إذا طُلب منا ذلك بموجب قانون أردني ساري.',
        ],
      },
    ],
  },
  {
    id: '4',
    title: 'أمان بياناتك وملفاتك',
    items: [
      {
        subtitle: 'إجراءات الحماية',
        points: [
          'تُخزَّن ملفاتك في خوادم آمنة ومشفّرة لا يصل إليها إلا فريق الطباعة المعتمد.',
          'جميع الاتصالات مشفّرة عبر بروتوكول HTTPS.',
          'كلمات المرور مخزّنة بصورة مشفّرة ولا يمكن لأي موظف الاطلاع عليها.',
          'يتم تقييد الوصول إلى بيانات العملاء بما يكفي لتنفيذ الطلب فقط.',
        ],
      },
      {
        subtitle: 'الاحتفاظ بالملفات',
        points: [
          'تُحذف ملفات الطباعة تلقائياً خلال 30 يوماً من إتمام الطلب أو إلغائه.',
          'بيانات الطلبات (بدون الملفات) تُحتفظ بها لمدة سنة لأغراض الدعم والضمان.',
          'يمكنك طلب حذف بياناتك في أي وقت (انظر: حقوقك أدناه).',
        ],
      },
    ],
  },
  {
    id: '5',
    title: 'ملفات الارتباط (Cookies)',
    items: [
      {
        subtitle: 'ما هي الكوكيز التي نستخدمها',
        points: [
          'كوكيز جلسة المستخدم: للحفاظ على تسجيل دخولك بين الصفحات.',
          'كوكيز السلة: لحفظ محتويات سلة التسوق.',
          'كوكيز التفضيلات: مثل اللغة وإعدادات العرض.',
        ],
      },
      {
        subtitle: 'كيف تتحكم فيها',
        points: [
          'يمكنك تعطيل الكوكيز من إعدادات متصفحك، لكن قد يؤثر ذلك على بعض وظائف الموقع.',
          'لا نستخدم كوكيز تتبع تابعة لجهات إعلانية.',
        ],
      },
    ],
  },
  {
    id: '6',
    title: 'حقوقك',
    items: [
      {
        subtitle: 'حقوقك فيما يتعلق ببياناتك',
        points: [
          'حق الاطلاع: يمكنك طلب نسخة من البيانات التي نحتفظ بها عنك.',
          'حق التصحيح: يمكنك تحديث بياناتك غير الدقيقة من صفحة الحساب أو بالتواصل معنا.',
          'حق الحذف: يمكنك طلب حذف حسابك وجميع بياناتك الشخصية.',
          'حق الاعتراض: يمكنك الاعتراض على استخدام بياناتك لأغراض التسويق.',
          'حق نقل البيانات: يمكنك طلب بياناتك بصيغة قابلة للقراءة.',
        ],
      },
      {
        subtitle: 'كيف تمارس حقوقك',
        points: [
          `أرسل طلبك عبر البريد الإلكتروني: ${EMAIL}`,
          'سنردّ على طلبك خلال 72 ساعة عمل.',
        ],
      },
    ],
  },
  {
    id: '7',
    title: 'خصوصية الأطفال',
    items: [
      {
        subtitle: '',
        points: [
          'خدماتنا المدفوعة موجّهة للبالغين (18 سنة فأكثر).',
          'لا نجمع معلومات عن قصد من الأطفال دون سن 18.',
          'إذا اكتشفنا أن طفلاً قدّم بياناته دون إذن ولي الأمر، سنحذف تلك البيانات فوراً.',
        ],
      },
    ],
  },
  {
    id: '8',
    title: 'التغييرات على سياسة الخصوصية',
    items: [
      {
        subtitle: '',
        points: [
          'قد نحدّث هذه السياسة من وقت لآخر. سننشر النسخة المحدّثة على هذه الصفحة مع ذكر تاريخ التحديث.',
          'في حال التغييرات الجوهرية، سنخطرك عبر البريد الإلكتروني المسجل أو برسالة واتساب.',
          'استمرارك في استخدام المنصة بعد نشر التغييرات يُعدّ موافقةً عليها.',
        ],
      },
    ],
  },
  {
    id: '9',
    title: 'التواصل بشأن الخصوصية',
    items: [
      {
        subtitle: 'للاستفسار أو تقديم شكوى',
        points: [
          `البريد الإلكتروني: ${EMAIL}`,
          `الهاتف / واتساب: ${PHONE}`,
          'ساعات العمل: الأحد – الخميس، 9 صباحاً – 6 مساءً',
          'سنسعى للردّ على جميع استفسارات الخصوصية خلال 72 ساعة عمل.',
        ],
      },
    ],
  },
]

export const metadata = { title: 'سياسة الخصوصية | JO-PRINT' }

export default function PrivacyPage() {
  return (
    <div className="py-14 px-4 bg-surface min-h-screen">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">سياسة الخصوصية</h1>
          <p className="text-gray-500">نلتزم بحماية بياناتك وخصوصيتك بأعلى المعايير</p>
          <p className="text-sm text-gray-400 mt-2">آخر تحديث: {UPDATED}</p>
        </div>

        {/* Intro banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 mb-8 text-sm text-gray-700 leading-relaxed">
          <span className="font-bold text-primary">JO-PRINT</span> تحترم خصوصيتك وتلتزم بحماية بياناتك الشخصية.
          توضّح هذه السياسة ما نجمعه من معلومات وكيف نستخدمها وحقوقك في التحكم بها،
          وفقاً للقوانين الأردنية المعمول بها.
        </div>

        {/* Quick nav */}
        <div className="bg-white border border-border rounded-xl p-5 mb-8">
          <h2 className="font-bold text-gray-900 mb-3 text-sm">محتويات الصفحة</h2>
          <div className="grid grid-cols-2 gap-1.5 text-sm">
            {sections.map(s => (
              <a key={s.id} href={`#section-${s.id}`}
                className="text-primary hover:underline flex items-center gap-1.5">
                <span className="text-gray-400 text-xs font-mono">{s.id}.</span>
                {s.title}
              </a>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map(s => (
            <div key={s.id} id={`section-${s.id}`}
              className="bg-white border border-border rounded-xl p-6 scroll-mt-20">
              <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <span className="bg-primary text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                  {s.id}
                </span>
                {s.title}
              </h2>
              <div className="space-y-4">
                {s.items.map((item, idx) => (
                  <div key={idx}>
                    {item.subtitle && (
                      <h3 className="font-semibold text-gray-800 text-sm mb-2">{item.subtitle}</h3>
                    )}
                    <ul className="space-y-2">
                      {item.points.map((point, i) => (
                        <li key={i} className="text-sm text-gray-600 leading-relaxed flex gap-2">
                          <span className="text-primary mt-1.5 flex-shrink-0">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Related links */}
        <div className="mt-8 bg-white border border-border rounded-xl p-5">
          <h3 className="font-bold text-gray-900 mb-3 text-sm">صفحات ذات صلة</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/terms" className="text-sm text-primary hover:underline">الشروط والأحكام</Link>
            <span className="text-gray-300">|</span>
            <Link href="/faq" className="text-sm text-primary hover:underline">الأسئلة الشائعة</Link>
            <span className="text-gray-300">|</span>
            <Link href="/orders/track" className="text-sm text-primary hover:underline">تتبع الطلب</Link>
          </div>
        </div>

      </div>
    </div>
  )
}
