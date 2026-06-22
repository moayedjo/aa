'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Tab = 'login' | 'register' | 'reset'

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' })
  const router = useRouter()

  const upd = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [f]: e.target.value }))

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (error) { setError('البريد الإلكتروني أو كلمة المرور غير صحيحة'); setLoading(false); return }
    router.push('/account')
    router.refresh()
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName, phone: form.phone } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess('تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد الحساب.')
    setLoading(false)
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.')
    setLoading(false)
  }

  const switchTab = (t: Tab) => { setTab(t); setError(''); setSuccess('') }

  const inp = 'w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1 mb-4">
            <span className="bg-primary text-white font-bold px-3 py-1 rounded-lg text-xl">JO</span>
            <span className="text-primary font-bold text-xl">PRINT</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {tab === 'login' ? 'مرحباً بعودتك' : tab === 'register' ? 'إنشاء حساب جديد' : 'إعادة تعيين كلمة المرور'}
          </h1>
        </div>

        {tab !== 'reset' && (
          <div className="flex rounded-xl overflow-hidden border border-border mb-6">
            <button onClick={() => switchTab('login')} className={`flex-1 py-3 font-medium text-sm transition-colors ${tab === 'login' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-surface'}`}>
              تسجيل الدخول
            </button>
            <button onClick={() => switchTab('register')} className={`flex-1 py-3 font-medium text-sm transition-colors ${tab === 'register' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-surface'}`}>
              حساب جديد
            </button>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm mb-4">{success}</div>}

        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <input type="email" required value={form.email} onChange={upd('email')} className={inp} placeholder="example@email.com" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
              <input type="password" required minLength={6} value={form.password} onChange={upd('password')} className={inp} placeholder="••••••••" dir="ltr" />
            </div>
            <div className="text-left">
              <button type="button" onClick={() => switchTab('reset')} className="text-xs text-primary hover:underline">نسيت كلمة المرور؟</button>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-60">
              {loading ? 'جارٍ التحميل...' : 'تسجيل الدخول'}
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
              <input type="text" required value={form.fullName} onChange={upd('fullName')} className={inp} placeholder="محمد أحمد" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
              <input type="tel" value={form.phone} onChange={upd('phone')} className={inp} placeholder="07xxxxxxxx" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <input type="email" required value={form.email} onChange={upd('email')} className={inp} placeholder="example@email.com" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
              <input type="password" required minLength={6} value={form.password} onChange={upd('password')} className={inp} placeholder="••••••••" dir="ltr" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-60">
              {loading ? 'جارٍ التحميل...' : 'إنشاء الحساب'}
            </button>
          </form>
        )}

        {tab === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-gray-500 mb-2">أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <input type="email" required value={form.email} onChange={upd('email')} className={inp} placeholder="example@email.com" dir="ltr" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-60">
              {loading ? 'جارٍ الإرسال...' : 'إرسال رابط إعادة التعيين'}
            </button>
            <button type="button" onClick={() => switchTab('login')} className="w-full text-sm text-gray-500 hover:text-gray-700">
              العودة لتسجيل الدخول
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
