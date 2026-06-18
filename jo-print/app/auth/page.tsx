'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')

  return (
    <div className="py-16 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">JO</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">مرحباً بك في JO-PRINT</h1>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            إنشاء حساب
          </button>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6">
          {tab === 'login' ? (
            <div className="space-y-4">
              <Input label="رقم الهاتف أو البريد الإلكتروني" placeholder="07XXXXXXXX" type="text" />
              <Input label="كلمة المرور" placeholder="••••••••" type="password" />
              <div className="flex justify-end">
                <button className="text-sm text-primary hover:underline">نسيت كلمة المرور؟</button>
              </div>
              <button className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors">
                تسجيل الدخول
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input label="الاسم الكامل" placeholder="محمد أحمد" type="text" />
              <Input label="رقم الهاتف" placeholder="07XXXXXXXX" type="tel" />
              <Input label="البريد الإلكتروني" placeholder="example@email.com" type="email" />
              <Input label="كلمة المرور" placeholder="8 أحرف على الأقل" type="password" />
              <Input label="تأكيد كلمة المرور" placeholder="أعد إدخال كلمة المرور" type="password" />
              <button className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors">
                إنشاء حساب
              </button>
              <p className="text-xs text-gray-500 text-center">
                بإنشاء حساب توافق على <a href="#" className="text-primary">الشروط والأحكام</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
