import { Sparkles } from 'lucide-react'

const AI_UNAVAILABLE_MESSAGE =
  'ميزات الذكاء الاصطناعي غير مفعّلة حالياً. يمكنك إدارة ملفاتك، وسيتم تفعيل التحليل والتلخيص بعد إعداد مزود الذكاء الاصطناعي.'

interface AiUnavailableNoticeProps {
  message?: string
  className?: string
}

export default function AiUnavailableNotice({ message, className }: AiUnavailableNoticeProps) {
  return (
    <div
      role="status"
      className={
        'flex items-start gap-3 rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 ' +
        (className ?? '')
      }
    >
      <Sparkles size={18} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
      <p className="leading-relaxed">{message ?? AI_UNAVAILABLE_MESSAGE}</p>
    </div>
  )
}
