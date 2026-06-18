import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export default function Card({ children, className, hover = false }: CardProps) {
  return (
    <div className={clsx(
      'bg-white rounded-[12px] border border-border shadow-sm',
      hover && 'hover:shadow-md transition-shadow cursor-pointer',
      className
    )}>
      {children}
    </div>
  )
}
