import Navbar from "@/components/Navbar";
import Link from "next/link";
import { ArrowLeft, Play, Sparkles, Check } from "lucide-react";
import { CATEGORIES } from "@/lib/templates-data";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#e4f1e1]/50 to-white" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#e4f1e1] border border-[#0d585f]/20 mb-8">
            <Sparkles size={16} className="text-[#0d585f]" />
            <span className="text-sm font-medium text-[#0d585f]">
              مدعوم بأحدث نماذج الذكاء الاصطناعي
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-[#0d585f] mb-6 leading-tight">
            عروض تقديمية عربية احترافية
            <br />
            <span className="text-[#0d585f]/70">في دقائق</span>
          </h1>

          <p className="text-lg md:text-xl text-[#0d585f]/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            اختر قالباً، خصّصه بالذكاء الاصطناعي، وقدّم بثقة. منصة عروض تجعل
            إنشاء العروض التقديمية أسهل مما تتخيل.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/dashboard"
              className="btn-primary text-lg flex items-center gap-2"
            >
              <Sparkles size={20} />
              ابدأ مجاناً
            </Link>
            <Link
              href="/templates"
              className="btn-secondary text-lg flex items-center gap-2"
            >
              <Play size={20} />
              استعراض القوالب
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            {[
              { n: "+١٠٠", label: "قالب جاهز" },
              { n: "+٥٠٠٠", label: "عرض مُنشأ" },
              { n: "٦", label: "قطاعات متخصصة" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-[#0d585f]">{s.n}</div>
                <div className="text-sm text-[#0d585f]/60 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-[#f8faf9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#0d585f] mb-4">
            قوالب متخصصة لكل مجال
          </h2>
          <p className="text-center text-[#0d585f]/60 mb-12">
            من الصحة إلى التعليم — لدينا القالب المناسب لك
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/templates?category=${cat.id}`}
                className="card-orooood p-6 flex items-center gap-4 group hover:border-[#0d585f]/30"
              >
                <span className="text-4xl">{cat.icon}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[#0d585f]">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-[#0d585f]/60 mt-1">
                    قوالب جاهزة ومحتوى ذكي
                  </p>
                </div>
                <ArrowLeft
                  size={20}
                  className="text-[#0d585f]/40 group-hover:text-[#0d585f] transition-colors"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#0d585f] mb-16">
            كيف تعمل المنصة؟
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "١",
                title: "اختر القالب",
                desc: "تصفح مكتبتنا الواسعة من القوالب العربية المتخصصة",
              },
              {
                step: "٢",
                title: "أدخل محتواك",
                desc: "اكتب موضوعك أو ارفع ملفاتك، ودع الذكاء الاصطناعي يبني الهيكل",
              },
              {
                step: "٣",
                title: "حمّل وشارك",
                desc: "صدّر عرضك بصيغة PDF أو PPTX واحصل على رابط مشاركة",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#e4f1e1] flex items-center justify-center mx-auto mb-6 border border-[#0d585f]/20">
                  <span className="text-2xl font-bold text-[#0d585f]">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#0d585f] mb-3">
                  {item.title}
                </h3>
                <p className="text-[#0d585f]/70 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-20 bg-[#f8faf9]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-[#0d585f] mb-8">
            اختر خطتك
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="card-orooood p-8 text-right">
              <h3 className="text-xl font-bold text-[#0d585f] mb-2">مجاني</h3>
              <p className="text-[#0d585f]/60 mb-6">للبدء والتجربة</p>
              <div className="text-4xl font-bold text-[#0d585f] mb-6">$0</div>
              <ul className="space-y-3 mb-8">
                {["٣ عروض شهرياً", "قوالب أساسية", "تصدير PDF"].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-[#0d585f]/80"
                  >
                    <Check size={18} className="text-[#0d585f] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="btn-secondary w-full block text-center"
              >
                ابدأ الآن
              </Link>
            </div>

            <div className="bg-[#0d585f] rounded-2xl p-8 text-white relative overflow-hidden text-right">
              <div className="absolute top-4 left-4 px-3 py-1 bg-[#e4f1e1] text-[#0d585f] text-xs font-bold rounded-full">
                الأكثر شيوعاً
              </div>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <p className="text-white/70 mb-6">للمحترفين والشركات</p>
              <div className="text-4xl font-bold mb-6">
                $19<span className="text-lg font-normal">/شهر</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "عروض غير محدودة",
                  "جميع القوالب",
                  "توليد AI متقدم",
                  "تصدير PPTX",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-white/90"
                  >
                    <Check size={18} className="shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className="block w-full py-3 px-6 rounded-xl bg-[#e4f1e1] text-[#0d585f] font-bold text-center hover:bg-white transition-colors"
              >
                الترقية الآن
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f8faf9] border-t border-[#0d585f]/10 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl font-bold text-[#0d585f]">عروض</span>
            <span className="px-2 py-0.5 text-xs font-bold bg-[#e4f1e1] text-[#0d585f] rounded-full border border-[#0d585f]/20">
              AI
            </span>
          </div>
          <p className="text-[#0d585f]/60">صنع بـ AI للعالم العربي 🇸🇦</p>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-[#0d585f]/50">
            <Link href="/pricing" className="hover:text-[#0d585f]">الأسعار</Link>
            <Link href="/templates" className="hover:text-[#0d585f]">القوالب</Link>
            <Link href="/login" className="hover:text-[#0d585f]">تسجيل الدخول</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
