import type { Metadata } from 'next'
import { Tajawal } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-tajawal',
})

export const metadata: Metadata = {
  title: {
    default: 'JO-PRINT | خدمات طباعة احترافية في الأردن',
    template: '%s | JO-PRINT',
  },
  description: 'منصة طباعة رقمية متكاملة في الأردن — طباعة وثائق، بطاقات عمل، بانرات، ملخصات كتب، ومعلمين خصوصيين',
  keywords: ['طباعة', 'أردن', 'عمان', 'بطاقات عمل', 'طباعة وثائق', 'jo-print'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://jo-print.com'),
  openGraph: {
    type: 'website',
    locale: 'ar_JO',
    siteName: 'JO-PRINT',
    title: 'JO-PRINT | خدمات طباعة احترافية في الأردن',
    description: 'منصة طباعة رقمية متكاملة في الأردن — طباعة وثائق، بطاقات عمل، بانرات، ملخصات كتب، ومعلمين خصوصيين',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JO-PRINT | خدمات طباعة احترافية في الأردن',
    description: 'منصة طباعة رقمية متكاملة في الأردن',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="font-sans bg-white text-gray-900 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
