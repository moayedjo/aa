import Navbar from "@/components/Navbar";
import { Check, Crown, Zap } from "lucide-react";
import Link from "next/link";

const tiers = [
  {
    name: "Basic",
    price: "$19.99",
    period: "شهر",
    description: "اشتراك خفيف لتفعيل موظفك الرقمي الأول.",
    features: [
      "١٠٬٠٠٠ رصيد / شهر",
      "قوالب أساسية",
      "تصدير PDF",
      "دعم بالبريد الإلكتروني",
    ],
    cta: "ابدأ الآن",
    href: "/login",
    highlighted: false,
    badge: null,
    colorClass: "border-[#0d585f]/10",
    btnClass: "btn-secondary",
    iconColor: "text-[#0d585f]",
  },
  {
    name: "Plus",
    price: "$49.99",
    period: "شهر",
    description: "المركز المتكامل للإنتاجية لمستخدمي القوة.",
    features: [
      "٢٨٬٠٠٠ رصيد / شهر",
      "جميع القوالب",
      "تصدير PPTX",
      "أولوية AI",
      "تحليلات الاستخدام",
    ],
    cta: "الترقية",
    href: "/login",
    highlighted: true,
    badge: "الأكثر شيوعاً",
    colorClass: "border-[#0d585f] ring-2 ring-[#e4f1e1]",
    btnClass: "btn-primary",
    iconColor: "text-[#0d585f]",
  },
  {
    name: "Ultra",
    price: "$249.99",
    period: "شهر",
    description: "المركز المتميز للمؤسسات والمهنيين.",
    features: [
      "١٥٠٬٠٠٠ رصيد / شهر",
      "تدريب AI مخصص",
      "White-label",
      "وصول API",
      "دعم مخصص",
    ],
    cta: "الترقية",
    href: "/login",
    highlighted: false,
    badge: "الأكثر قيمة",
    colorClass: "border-[#d4a373]",
    btnClass:
      "bg-[#d4a373] text-white w-full py-3 rounded-xl font-semibold hover:bg-[#b8935f] transition-all active:scale-95",
    iconColor: "text-[#d4a373]",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-[#0d585f] mb-4">
            اختر خطتك المناسبة
          </h1>
          <p className="text-[#0d585f]/60 text-lg">
            ابدأ مجاناً وقم بالترقية عند الحاجة
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-3xl p-8 border-2 bg-white flex flex-col ${tier.colorClass}`}
            >
              {tier.badge && (
                <div
                  className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold ${
                    tier.name === "Plus"
                      ? "bg-[#0d585f] text-white"
                      : "bg-[#d4a373] text-white"
                  }`}
                >
                  {tier.badge}
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className={tier.iconColor}>
                    {tier.name === "Ultra" ? (
                      <Zap size={20} />
                    ) : (
                      <Crown size={20} />
                    )}
                  </span>
                  <h3 className="text-xl font-bold text-[#0d585f]">
                    {tier.name}
                  </h3>
                </div>
                <p className="text-sm text-[#0d585f]/60 leading-relaxed">
                  {tier.description}
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[#0d585f]">
                    {tier.price}
                  </span>
                  <span className="text-[#0d585f]/60">/ {tier.period}</span>
                </div>
              </div>

              <Link
                href={tier.href}
                className={`block text-center mb-6 ${
                  tier.name === "Ultra" || tier.name === "Plus"
                    ? tier.btnClass
                    : "btn-secondary w-full"
                }`}
              >
                {tier.cta}
              </Link>

              <div className="mt-auto pt-6 border-t border-[#0d585f]/10">
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-[#0d585f]/70"
                    >
                      <Check size={16} className="text-[#0d585f] shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Annual Toggle */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 p-1 rounded-full bg-[#f8faf9] border border-[#0d585f]/10">
            <button className="px-6 py-2 rounded-full bg-[#0d585f] text-white text-sm font-medium">
              شهري
            </button>
            <button className="px-6 py-2 rounded-full text-[#0d585f]/70 text-sm font-medium hover:text-[#0d585f] transition-colors">
              سنوي{" "}
              <span className="text-green-600 text-xs mr-1">وفر 21%</span>
            </button>
          </div>
          <p className="mt-4 text-sm text-[#0d585f]/60">
            الخطة السنوية: $15/شهر (تُحسب $180 سنوياً)
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-center text-[#0d585f] mb-10">
            أسئلة شائعة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                q: "هل يمكنني إلغاء الاشتراك في أي وقت؟",
                a: "نعم، يمكنك الإلغاء في أي وقت دون رسوم إضافية.",
              },
              {
                q: "ما الفرق بين الرصيد والعرض؟",
                a: "كل عملية توليد أو تصدير تستهلك رصيداً محدداً من رصيدك الشهري.",
              },
              {
                q: "هل القوالب متاحة باللغة العربية؟",
                a: "نعم، جميع قوالبنا مصممة خصيصاً للمحتوى العربي مع دعم RTL الكامل.",
              },
              {
                q: "هل يمكنني تجربة المنصة قبل الاشتراك؟",
                a: "نعم، الخطة المجانية تتيح لك إنشاء ٣ عروض شهرياً بلا بطاقة ائتمانية.",
              },
            ].map((faq) => (
              <div key={faq.q} className="card-orooood p-6">
                <h4 className="font-bold text-[#0d585f] mb-2">{faq.q}</h4>
                <p className="text-sm text-[#0d585f]/70 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
