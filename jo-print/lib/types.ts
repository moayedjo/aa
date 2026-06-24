export interface Product {
  id: string
  name: string
  nameEn: string
  category: string
  price: number
  priceUnit: string
  description: string
  icon: string
  color: string
  popular?: boolean
  options?: ProductOption[]
}

export interface ProductOption {
  name: string
  label: string
  values: string[]
}

export interface Category {
  id: string
  name: string
  icon: string
  count: number
}

export interface Book {
  id: string
  title: string
  subject: string
  grade: string
  price: number
  pages: number
  description: string
}

export interface Teacher {
  id: string
  name: string
  subjects: string[]
  experience: number
  rating: number
  ratePerHour: number
  location: string
  available: boolean
  bio: string
}

export interface PrintShop {
  id: string
  name: string
  address: string
  area: string
  phone: string
  hours: string
  rating: number
  services: string[]
}

export interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  type?: 'product' | 'print' | 'book'
  options?: Record<string, string>
}

export interface Order {
  id: string
  status: OrderStatus
  items: CartItem[]
  total: number
  createdAt: string
  estimatedDelivery: string
}

export type OrderStatus =
  | 'received'
  | 'reviewing'
  | 'approved'
  | 'production'
  | 'ready'
  | 'delivered'

export interface PrintOptions {
  // نوع المنتج
  productType: 'paper' | 'poster' | 'rollup' | 'gradalbum'

  // طباعة ورق
  size: 'A4' | 'A3' | 'Letter'
  color: 'color' | 'blackwhite'
  sides: 'single' | 'double'
  paperType: 'standard' | 'glossy' | 'matte'
  binding: 'none' | 'staple' | 'wire'
  copies: number
  pageRange: 'all' | 'custom'
  pageRangeValue: string

  // إضافات الورق
  customCut: boolean
  coverFront: 'none' | 'transparent' | 'cardboard'
  coverBack: 'none' | 'transparent' | 'cardboard'

  // إضافات البوستر
  posterFoamBoard: boolean

  // دفتر التخرج
  gradName: string
  gradSpecialization: string
  gradUniversity: string
  gradYear: string
  gradText: string

  // ملاحظات العميل
  notes: string

  // legacy
  quantity: number
  addCover: boolean
  addPageNumbers: boolean
  addTOC: boolean
}
