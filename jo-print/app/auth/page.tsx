'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'


export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' })
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (error) { setError('البريد الإلكتروني أو كلمة المرور غير صحيحة'); setLoading(false); return }
    router.push('/account')
    router.refresh()
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName, phone: form.phone } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/account')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1 mb-4">
            <span className="bg-primary text-white font-bold px-3 py-1 rounded-lg text-xl">JO</span>
            <span className="text-primary font-bold text-xl">PRINT</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {tab === 'login' ? 'مرحباً بعودتك' : 'إنشاء حساب جديد'}
          </h1>
        </div>

        <div className="flex rounded-xl overflow-hidden border border-border mb-6">
          <button onClick={() => setTab('login')} className={`flex-1 py-3 font-medium text-sm transition-colors ${tab === 'login' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-surface'}`}>
            تسجيل الدخول
          </button>
          <button onClick={() => setTab('register')} className={`flex-1 py-3 font-medium text-sm transition-colors ${tab === 'register' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-surface'}`}>
            حساب جديد
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>}

        <form onSubmit={tab === 'login' ? handleLogin : handleRegister} className="space-y-4">
          {tab === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                <input type="text" required value={form.fullName} onChange={e => setForm(f => ({...f, fullName: e.target.value}))} className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="محمد أحمد" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="07xxxxxxxx" dir="ltr" />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
            <input type="email" required value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="example@email.com" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
            <input type="password" required minLength={6} value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="••••••••" dir="ltr" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-60">
            {loading ? 'جارٍ التحميل...' : tab === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
          </button>
        </form>
      </div>
    </div>
  )
}
