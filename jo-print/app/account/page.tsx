'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, User, Settings, LogOut } from 'lucide-react'

const recentOrders = [
  { id: 'JO-2025-00847', date: '15 يونيو 2025', status: 'قيد الإنتاج', total: 19.00 },
  { id: 'JO-2025-00821', date: '10 يونيو 2025', status: 'تم التوصيل', total: 35.50 },
  { id: 'JO-2025-00799', date: '5 يونيو 2025', status: 'تم التوصيل', total: 12.00 },
]

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState('orders')

  return (
    <div className="py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">حسابي</h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="bg-white border border-border rounded-[12px] p-4 h-fit">
            <div className="text-center pb-4 mb-4 border-b border-gray-100">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-3xl mx-auto mb-2">👤</div>
              <p className="font-bold text-gray-900">محمد أحمد</p>
              <p className="text-sm text-gray-500">m.ahmed@email.com</p>
            </div>
            <nav className="space-y-1">
              {[
                { key: 'orders', label: 'طلباتي', icon: <Package size={16} /> },
                { key: 'profile', label: 'الملف الشخصي', icon: <User size={16} /> },
                { key: 'settings', label: 'الإعدادات', icon: <Settings size={16} /> },
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-right ${
                    activeTab === item.key ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50">
                <LogOut size={16} />
                تسجيل الخروج
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {activeTab === 'orders' && (
              <div>
                <h2 className="font-bold text-xl text-gray-900 mb-4">طلباتي</h2>
                <div className="space-y-3">
                  {recentOrders.map(order => (
                    <div key={order.id} className="bg-white border border-border rounded-[12px] p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{order.id}</p>
                        <p className="text-sm text-gray-500">{order.date}</p>
                      </div>
                      <div className="text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          order.status === 'تم التوصيل' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>{order.status}</span>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-primary">{order.total.toFixed(2)} د.أ</p>
                        <Link href="/orders/track" className="text-xs text-gray-500 hover:text-primary">تتبع الطلب</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'profile' && (
              <div className="bg-white border border-border rounded-[12px] p-5">
                <h2 className="font-bold text-xl text-gray-900 mb-4">الملف الشخصي</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">الاسم</label>
                      <p className="font-medium">محمد أحمد</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">رقم الهاتف</label>
                      <p className="font-medium">0791234567</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">البريد الإلكتروني</label>
                      <p className="font-medium">m.ahmed@email.com</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
