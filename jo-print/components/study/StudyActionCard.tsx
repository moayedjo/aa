import Link from 'next/link'
import type { ReactNode } from 'react'
import Card from '@/components/ui/Card'

interface StudyActionCardProps {
  href: string
  title: string
  description: string
  icon: ReactNode
  disabled?: boolean
}

export default function StudyActionCard({ href, title, description, icon, disabled }: StudyActionCardProps) {
  const inner = (
    <Card
      hover={!disabled}
      className={
        'flex h-full items-start gap-4 p-5 ' + (disabled ? 'opacity-60' : '')
      }
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-bold text-gray-800">{title}</span>
        <span className="mt-0.5 block text-sm leading-relaxed text-gray-500">{description}</span>
      </span>
    </Card>
  )

  if (disabled) {
    return <div aria-disabled="true">{inner}</div>
  }
  return (
    <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-[12px]">
      {inner}
    </Link>
  )
}
