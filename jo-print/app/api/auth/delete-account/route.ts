import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function DELETE() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    // Delete user's print files from storage
    const { data: files } = await supabase
      .from('print_files')
      .select('file_path')
      .eq('user_id', user.id)

    if (files?.length) {
      const paths = files.map(f => f.file_path).filter(Boolean)
      if (paths.length) await supabase.storage.from('print-files').remove(paths)
    }

    // Delete DB data (RLS cascades orders/files/notifications via FK, profile too)
    await supabase.from('print_files').delete().eq('user_id', user.id)
    await supabase.from('orders').delete().eq('user_id', user.id)
    await supabase.from('profiles').delete().eq('id', user.id)

    // Delete auth user — requires service role key
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { error } = await adminSupabase.auth.admin.deleteUser(user.id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/auth/delete-account error:', error)
    return NextResponse.json({ error: 'فشل في حذف الحساب' }, { status: 500 })
  }
}
