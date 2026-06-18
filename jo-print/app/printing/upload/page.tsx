'use client'

import { useState } from 'react'
import UploadZone from '@/components/printing/UploadZone'
import PrintOptionsForm from '@/components/printing/PrintOptions'
import type { PrintOptions } from '@/lib/types'
import { formatPrice } from '@/lib/pricing'

const steps = ['رفع الملف', 'خيارات الطباعة', 'مراجعة', 'الدفع']

export default function UploadPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    size: 'A4',
    color: 'blackwhite',
    sides: 'single',
    paperType: 'standard',
    quantity: 1,
    copies: 1,
  })
  const estimatedPages = 10

  return (
    <div className="py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">رفع ملف للطباعة</h1>

        {/* Steps */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                index === currentStep ? 'bg-primary text-white' :
                index < currentStep ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-400'
              }`}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                  border-2 border-current">
                  {index < currentStep ? '✓' : index + 1}
                </span>
                <span className="hidden sm:inline">{step}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-6 h-0.5 ${index < currentStep ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl border border-border p-6">
          {currentStep === 0 && (
            <div>
              <h2 className="font-bold text-xl text-gray-900 mb-5">ارفع ملفك</h2>
              <UploadZone onFileSelect={(file) => setUploadedFile(file)} />
              <button
                disabled={!uploadedFile}
                onClick={() => setCurrentStep(1)}
                className="mt-6 w-full bg-primary text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors"
              >
                التالي: خيارات الطباعة
              </button>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <h2 className="font-bold text-xl text-gray-900 mb-5">خيارات الطباعة</h2>
              <PrintOptionsForm
                options={printOptions}
                onChange={setPrintOptions}
                pageCount={estimatedPages}
              />
              <div className="flex gap-3 mt-6">
                <button onClick={() => setCurrentStep(0)} className="flex-1 border border-gray-200 py-3 rounded-xl font-medium text-gray-600 hover:border-gray-300">
                  السابق
                </button>
                <button onClick={() => setCurrentStep(2)} className="flex-2 flex-grow bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors">
                  التالي: مراجعة الطلب
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="font-bold text-xl text-gray-900 mb-5">مراجعة الطلب</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">الملف</span>
                  <span className="font-medium">{uploadedFile?.name || 'ملف مرفوع'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">الحجم</span>
                  <span className="font-medium">{printOptions.size}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">اللون</span>
                  <span className="font-medium">{printOptions.color === 'color' ? 'ألوان' : 'أبيض وأسود'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">الطباعة</span>
                  <span className="font-medium">{printOptions.sides === 'single' ? 'وجه واحد' : 'وجهين'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">نوع الورق</span>
                  <span className="font-medium">{printOptions.paperType === 'standard' ? 'عادي' : printOptions.paperType === 'glossy' ? 'لامع' : 'مطفي'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">عدد النسخ</span>
                  <span className="font-medium">{printOptions.copies}</span>
                </div>
                <div className="flex justify-between py-3 bg-primary/5 rounded-lg px-3">
                  <span className="font-bold text-gray-900">الإجمالي</span>
                  <span className="font-bold text-primary text-lg">{formatPrice(estimatedPages * 0.05 * printOptions.copies)}</span>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setCurrentStep(1)} className="flex-1 border border-gray-200 py-3 rounded-xl font-medium text-gray-600">
                  السابق
                </button>
                <button onClick={() => setCurrentStep(3)} className="flex-grow bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors">
                  التالي: الدفع
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="font-bold text-2xl text-gray-900 mb-2">تم استلام طلبك!</h2>
              <p className="text-gray-500 mb-6">سيتم التواصل معك لتأكيد الطلب ومعالجة الدفع</p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <p className="text-green-700 font-medium">رقم طلبك: JO-2025-00847</p>
              </div>
              <a href="/orders/track" className="bg-primary text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors inline-block">
                تتبع طلبك
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
