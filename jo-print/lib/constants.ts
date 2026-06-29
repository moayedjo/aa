export const FILE_STATUS_LABELS: Record<string, string> = {
  uploaded:  'مرفوع',
  reviewing: 'قيد المراجعة',
  approved:  'موافق عليه',
  rejected:  'مرفوض',
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  received:   'استُلم',
  reviewing:  'قيد المراجعة',
  approved:   'موافق عليه',
  production: 'في الإنتاج',
  ready:      'جاهز للاستلام',
  delivered:  'تم التوصيل',
  cancelled:  'ملغي',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  received:   'bg-blue-50 text-blue-700',
  reviewing:  'bg-yellow-50 text-yellow-700',
  approved:   'bg-green-50 text-green-700',
  production: 'bg-purple-50 text-purple-700',
  ready:      'bg-teal-50 text-teal-700',
  delivered:  'bg-gray-100 text-gray-600',
  cancelled:  'bg-red-50 text-red-600',
}
