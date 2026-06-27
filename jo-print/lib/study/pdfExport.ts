/**
 * JO Study — server-side HTML→PDF rendering via headless Chromium (playwright-core).
 *
 * This is server-side rendering (NOT a browser-only client download), which
 * produces consistent print-ready A4 output. Arabic shaping requires an Arabic
 * font: set STUDY_PDF_FONT_PATH to a .ttf to embed it (no remote font deps).
 */
import { readFile } from 'node:fs/promises'

export class PdfRenderUnavailableError extends Error {
  constructor(message = 'PDF renderer (Chromium) is not available') {
    super(message)
    this.name = 'PdfRenderUnavailableError'
  }
}

let fontDataUriCache: string | null | undefined

/** Load the configured Arabic font once and cache as a data URI, or null. */
export async function getArabicFontDataUri(): Promise<string | undefined> {
  if (fontDataUriCache !== undefined) return fontDataUriCache ?? undefined
  const path = process.env.STUDY_PDF_FONT_PATH
  if (!path) { fontDataUriCache = null; return undefined }
  try {
    const buf = await readFile(path)
    fontDataUriCache = `data:font/ttf;base64,${buf.toString('base64')}`
    return fontDataUriCache
  } catch {
    fontDataUriCache = null
    return undefined
  }
}

export interface RenderedPdf {
  bytes: Uint8Array
  pageCount: number
}

/** Count pages in a PDF buffer (regex over the page tree — no extra deps). */
export function countPdfPages(bytes: Uint8Array): number {
  const text = Buffer.from(bytes).toString('latin1')
  const countMatch = text.match(/\/Count\s+(\d+)/)
  if (countMatch) {
    const n = parseInt(countMatch[1], 10)
    if (n > 0) return n
  }
  const pageMatches = text.match(/\/Type\s*\/Page[^s]/g)
  return pageMatches ? pageMatches.length : 1
}

/**
 * Render HTML to a print-ready A4 PDF using headless Chromium.
 * Throws PdfRenderUnavailableError if Chromium cannot launch.
 */
export async function renderHtmlToPdf(html: string): Promise<RenderedPdf> {
  let chromium
  try {
    ({ chromium } = await import('playwright-core'))
  } catch {
    throw new PdfRenderUnavailableError('playwright-core not installed')
  }

  let browser
  try {
    browser = await chromium.launch({ headless: true })
  } catch (err) {
    throw new PdfRenderUnavailableError(
      err instanceof Error ? err.message : 'cannot launch Chromium',
    )
  }

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate:
        '<div style="font-size:8px;width:100%;text-align:center;color:#888;">' +
        '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    })
    const bytes = new Uint8Array(pdf)
    return { bytes, pageCount: countPdfPages(bytes) }
  } finally {
    await browser.close()
  }
}

export function isPdfRenderConfigured(): boolean {
  // playwright-core is a dependency; actual launch is attempted at render time.
  return true
}
