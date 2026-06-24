import { NextResponse } from 'next/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUUID(id: string): boolean {
  return UUID_RE.test(id)
}

export function invalidUUIDResponse() {
  return NextResponse.json({ error: 'معرف غير صالح' }, { status: 400 })
}

export function dbError(label: string, error: unknown) {
  console.error(`[${label}]`, error)
  return NextResponse.json({ error: 'حدث خطأ، يرجى المحاولة لاحقاً' }, { status: 500 })
}
