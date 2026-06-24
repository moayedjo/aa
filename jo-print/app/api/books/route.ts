import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: "حدث خطأ، يرجى المحاولة لاحقاً" }, { status: 500 })
  return NextResponse.json(data)
}
