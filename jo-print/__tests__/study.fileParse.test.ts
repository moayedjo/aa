import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { parseDocument, FileParseError } from '@/lib/study/fileParse'

const enc = (s: string): Uint8Array => new TextEncoder().encode(s)

describe('parseDocument — TXT', () => {
  it('parses Arabic+English text and detects Arabic-majority as ar', async () => {
    const r = await parseDocument(enc('مرحبا بالعالم هذا نص عربي طويل جدا abc'), 'txt')
    expect(r.text).toContain('مرحبا')
    expect(r.charCount).toBeGreaterThan(0)
    expect(r.language).toBe('ar')
  })

  it('detects English-majority as en', async () => {
    const r = await parseDocument(enc('this is a long english sentence ا'), 'txt')
    expect(r.language).toBe('en')
  })

  it('throws FileParseError on empty text', async () => {
    await expect(parseDocument(enc('   '), 'txt')).rejects.toThrow(FileParseError)
  })
})

describe('parseDocument — PPTX', () => {
  it('extracts text from a minimal in-memory pptx', async () => {
    const zip = new JSZip()
    zip.file(
      '[Content_Types].xml',
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
    )
    zip.file(
      'ppt/slides/slide1.xml',
      '<?xml version="1.0"?><p:sld xmlns:a="x"><a:t>مرحبا</a:t></p:sld>',
    )
    const bytes = await zip.generateAsync({ type: 'uint8array' })
    const r = await parseDocument(bytes, 'pptx')
    expect(r.text).toContain('مرحبا')
    expect(r.pageCount).toBe(1)
  })

  it('throws FileParseError when there are no slides', async () => {
    const zip = new JSZip()
    zip.file('foo.xml', '<x/>')
    const bytes = await zip.generateAsync({ type: 'uint8array' })
    await expect(parseDocument(bytes, 'pptx')).rejects.toThrow(FileParseError)
  })
})

describe('parseDocument — DOCX', () => {
  it('throws FileParseError on an invalid/empty docx buffer', async () => {
    await expect(parseDocument(enc('not a real docx'), 'docx')).rejects.toThrow()
  })
})

describe('parseDocument — unsupported & PDF', () => {
  it('throws FileParseError for an unsupported extension', async () => {
    await expect(parseDocument(enc('hi'), 'xlsx')).rejects.toThrow(FileParseError)
  })

  it('rejects a PDF made of garbage bytes', async () => {
    await expect(parseDocument(enc('%PDF garbage not a real pdf'), 'pdf')).rejects.toThrow()
  })
})
