'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Printer, Check, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { addToCart } from '@/lib/cart'
import type { CartItem } from '@/lib/types'
import { studyPost, errorMessage, StudyApiError } from '@/lib/study/client'

type ExportSourceType = 'summary' | 'quiz' | 'answer_key' | 'flashcards' | 'study_plan' | 'booklet'

interface PrintWithJoPrintProps {
  /** Use an already-created export id directly. */
  exportId?: string
  /** Or create an export first from a source. */
  sourceType?: ExportSourceType
  sourceId?: string
  printMode?: 'bw' | 'color'
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

interface ExportCreated {
  id: string
}

export default function PrintWithJoPrint({
  exportId,
  sourceType,
  sourceId,
  printMode = 'bw',
  label = 'اطبع عبر JO-PRINT',
  className,
  size = 'md',
}: PrintWithJoPrintProps) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      let id = exportId
      if (!id) {
        if (!sourceType || !sourceId) throw new StudyApiError('بيانات الطباعة غير مكتملة', 'VALIDATION')
        const created = await studyPost<ExportCreated>('/api/study/exports', {
          sourceType,
          sourceId,
          printMode,
        })
        id = created.id
      }
      // The add-to-cart endpoint returns a server-built cart-item descriptor.
      const descriptor = await studyPost<Omit<CartItem, 'id'>>(
        `/api/study/exports/${id}/add-to-cart`,
        {},
      )
      // Never set price client-side beyond what the server returned.
      addToCart(descriptor)
      window.dispatchEvent(new Event('cart-updated'))
      setDone(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className={clsx('flex flex-wrap items-center gap-2 text-sm', className)} role="status">
        <span className="inline-flex items-center gap-1 font-medium text-green-700">
          <Check size={16} aria-hidden="true" /> تمت الإضافة إلى السلة
        </span>
        <Link href="/cart" className="font-medium text-primary underline-offset-2 hover:underline">
          عرض السلة
        </Link>
      </div>
    )
  }

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-label={label}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-lg border-2 border-primary font-medium text-primary transition-colors hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60',
          size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm',
        )}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Printer size={16} aria-hidden="true" />
        )}
        {label}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
