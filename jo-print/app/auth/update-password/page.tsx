'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('كلمتا المرور غير متطابقتين'); return }
    if (password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => router.push('/account'), 2000)
  }

  const inp = 'w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1 mb-4">
            <span className="bg-primary text-white font-bold px-3 py-1 rounded-lg text-xl">JO</span>
            <span className="text-primary font-bold text-xl">PRINT</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">تعيين كلمة مرور جديدة</h1>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
            <h3 className="font-bold text-gray-900 mb-2">تم تغيير كلمة المرور بنجاح</h3>
            <p className="text-sm text-gray-500">جارٍ التحويل إلى حسابك...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الجديدة</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className={inp} placeholder="••••••••" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تأكيد كلمة المرور</label>
              <input type="password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} className={inp} placeholder="••••••••" dir="ltr" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-60">
              {loading ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
