import { clsx } from 'clsx'

interface SkeletonBlockProps {
  className?: string
  count?: number
}

export default function SkeletonBlock({ className, count = 1 }: SkeletonBlockProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={clsx('animate-pulse rounded-lg bg-gray-100', className ?? 'h-20 w-full')}
        />
      ))}
    </>
  )
}
