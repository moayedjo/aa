/**
 * JO Study — server-side document text extraction.
 * Pure data extraction; document content is treated as untrusted text.
 * Returns a clear error for formats/files that cannot be parsed reliably.
 */
import JSZip from 'jszip'

export interface ParseResult {
  text: string
  pageCount: number | null
  charCount: number
  language: 'ar' | 'en'
}

export class FileParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileParseError'
  }
}

const MAX_CHARS = 200_000 // cap stored/processed text to bound cost

function detectLanguage(text: string): 'ar' | 'en' {
  const arabic = (text.match(/[؀-ۿ]/g) ?? []).length
  const latin = (text.match(/[A-Za-z]/g) ?? []).length
  return arabic >= latin ? 'ar' : 'en'
}

function clamp(text: string): string {
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text
}

async function parseTxt(bytes: Uint8Array): Promise<ParseResult> {
  const text = clamp(new TextDecoder('utf-8').decode(bytes).trim())
  if (!text) throw new FileParseError('الملف فارغ')
  return { text, pageCount: null, charCount: text.length, language: detectLanguage(text) }
}

async function parseDocx(bytes: Uint8Array): Promise<ParseResult> {
  // mammoth extracts the document body as plain text.
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
  const text = clamp(result.value.trim())
  if (!text) throw new FileParseError('تعذر استخراج نص من ملف Word')
  return { text, pageCount: null, charCount: text.length, language: detectLanguage(text) }
}

async function parsePptx(bytes: Uint8Array): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(bytes)
  const slidePaths = Object.keys(zip.files)
    .filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort()
  if (slidePaths.length === 0) throw new FileParseError('لا توجد شرائح في الملف')

  const parts: string[] = []
  for (const p of slidePaths) {
    const xml = await zip.files[p].async('string')
    // Extract text inside <a:t>...</a:t> runs
    const matches = xml.match(/<a:t>([\s\S]*?)<\/a:t>/g) ?? []
    const slideText = matches
      .map(m => m.replace(/<a:t>/, '').replace(/<\/a:t>/, ''))
      .join(' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    parts.push(slideText)
  }
  const text = clamp(parts.join('\n\n').trim())
  if (!text) throw new FileParseError('تعذر استخراج نص من العرض التقديمي')
  return { text, pageCount: slidePaths.length, charCount: text.length, language: detectLanguage(text) }
}

async function parsePdf(bytes: Uint8Array): Promise<ParseResult> {
  // pdfjs legacy build works in Node for text extraction.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const loadingTask = pdfjs.getDocument({
    data: bytes,
    // Disable worker/font fetching in Node
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: false,
  })
  const doc = await loadingTask.promise
  const pageCount = doc.numPages
  const parts: string[] = []
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items
      .map(it => (typeof it === 'object' && it && 'str' in it ? (it as { str: string }).str : ''))
    parts.push(strings.join(' '))
    if (parts.join('').length > MAX_CHARS) break
  }
  const text = clamp(parts.join('\n').trim())
  if (!text) {
    // Likely a scanned PDF with no embedded text layer.
    throw new FileParseError('تعذر قراءة نص من ملف PDF — قد يكون ملفاً ممسوحاً ضوئياً يتطلب OCR')
  }
  return { text, pageCount, charCount: text.length, language: detectLanguage(text) }
}

/** Parse by canonical extension. Throws FileParseError on unsupported/failed parse. */
export async function parseDocument(bytes: Uint8Array, ext: string): Promise<ParseResult> {
  switch (ext) {
    case 'txt':  return parseTxt(bytes)
    case 'docx': return parseDocx(bytes)
    case 'pptx': return parsePptx(bytes)
    case 'pdf':  return parsePdf(bytes)
    default: throw new FileParseError('نوع الملف غير مدعوم')
  }
}
