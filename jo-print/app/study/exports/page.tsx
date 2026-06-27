import Link from 'next/link'
import { Printer, BookOpen, ListChecks, Layers, ArrowLeft } from 'lucide-react'
import Card from '@/components/ui/Card'

/**
 * JO Study — printing hub.
 *
 * Note: app/api/study/exports/route.ts exposes POST only (it creates a
 * print-ready export on demand); there is no list endpoint to read existing
 * exports from. Rather than invent one, this page explains where to print each
 * artifact: the "اطبع عبر JO-PRINT" button lives on the summaries, quizzes and
 * flashcards pages and creates the export + adds it to the cart in one step.
 */

const DESTINATIONS: Array<{
  href: string
  title: string
  description: string
  icon: typeof BookOpen
}> = [
  {
    href: '/study/summaries',
    title: 'الملخصات',
    description: 'افتح أي ملخص ثم اضغط «اطبع عبر JO-PRINT» لطباعته.',
    icon: BookOpen,
  },
  {
    href: '/study/quizzes',
    title: 'الاختبارات',
    description: 'من صفحة الاختبار يمكنك طباعة ورقة الأسئلة أو نموذج الإجابة.',
    icon: ListChecks,
  },
  {
    href: '/study/flashcards',
    title: 'بطاقات الحفظ',
    description: 'اطبع أي مجموعة بطاقات لمراجعتها بعيداً عن الشاشة.',
    icon: Layers,
  },
]

export default function StudyExportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">الطباعة والتصدير</h2>
        <p className="mt-1 text-sm text-gray-500">
          جهّز موادك الدراسية للطباعة عبر JO-PRINT مباشرةً من صفحاتها.
        </p>
      </div>

      <Card className="flex flex-col gap-2 p-5">
        <div className="flex items-center gap-2 text-gray-800">
          <Printer size={18} aria-hidden="true" />
          <h3 className="font-bold">كيف تطبع؟</h3>
        </div>
        <p className="text-sm leading-relaxed text-gray-600">
          افتح الملخص أو الاختبار أو مجموعة البطاقات التي تريد طباعتها، ثم اضغط زر
          «اطبع عبر JO-PRINT». سنجهّز ملف PDF منسّقاً ونضيفه إلى سلة الطباعة
          ليصلك مطبوعاً.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {DESTINATIONS.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-[12px] focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <Card hover className="flex h-full flex-col gap-3 p-5">
              <div className="flex items-center gap-2 text-primary">
                <Icon size={20} aria-hidden="true" />
                <h3 className="font-bold text-gray-800">{title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-gray-600">{description}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-primary">
                اذهب الآن <ArrowLeft size={15} aria-hidden="true" />
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <Link href="/study" className="text-sm font-medium text-primary hover:underline">
        العودة إلى لوحة المذاكرة
      </Link>
    </div>
  )
}
