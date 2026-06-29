import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', params.id)
    .eq('active', true)
    .single()
  if (error || !data) return NextResponse.json({ error: 'الملخص غير موجود' }, { status: 404 })
  return NextResponse.json(data)
}
