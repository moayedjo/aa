/**
 * JO Study — print-ready HTML templates (A4, RTL, page-break aware).
 * Pure string builders; all dynamic values are HTML-escaped to prevent
 * injection from AI/user content into the rendered document.
 */
import type { StudySummary, StudyQuiz, StudyFlashcardSet } from './schemas'

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export interface DocMeta {
  title: string
  courseName?: string
  studentName?: string
  printMode: 'bw' | 'color'
  language: 'ar' | 'en'
  generatedAt: string // ISO
  /** Optional base64 Arabic font (data URI body) to embed for reliable shaping. */
  fontDataUri?: string
}

function shell(meta: DocMeta, bodyHtml: string): string {
  const dir = meta.language === 'ar' ? 'rtl' : 'ltr'
  const accent = meta.printMode === 'color' ? '#1E88E5' : '#000000'
  const fontFace = meta.fontDataUri
    ? `@font-face{font-family:'StudyArabic';src:url(${meta.fontDataUri}) format('truetype');font-display:swap;}`
    : ''
  const fontFamily = meta.fontDataUri
    ? `'StudyArabic', 'DejaVu Sans', system-ui, sans-serif`
    : `'DejaVu Sans', system-ui, sans-serif`
  return `<!doctype html><html lang="${meta.language}" dir="${dir}"><head><meta charset="utf-8">
<style>
${fontFace}
@page { size: A4; margin: 18mm 16mm; }
* { box-sizing: border-box; }
body { font-family: ${fontFamily}; color: #111; line-height: 1.7; font-size: 12pt; }
h1 { font-size: 20pt; margin: 0 0 4pt; color: ${accent}; }
h2 { font-size: 14pt; margin: 16pt 0 6pt; border-bottom: 2px solid ${accent}; padding-bottom: 3pt; }
h3 { font-size: 12pt; margin: 10pt 0 4pt; }
.muted { color: #666; font-size: 9pt; }
.header { border-bottom: 3px solid ${accent}; padding-bottom: 8pt; margin-bottom: 14pt; }
.brand { font-weight: bold; color: ${accent}; }
ul, ol { margin: 4pt 0; padding-${dir === 'rtl' ? 'right' : 'left'}: 18pt; }
li { margin: 3pt 0; }
.cite { color: #555; font-size: 9pt; }
.card { border: 1px solid #bbb; border-radius: 6px; padding: 10pt; margin: 0 0 8pt; page-break-inside: avoid; }
.card .front { font-weight: bold; }
.card .back { margin-top: 6pt; color: #222; }
.q { page-break-inside: avoid; margin: 0 0 10pt; }
.q .opts { margin-top: 4pt; }
.warn { background: #fff8e1; border: 1px solid #ffe082; padding: 8pt; border-radius: 6px; margin: 8pt 0; }
.section { page-break-inside: avoid; }
.footer-note { margin-top: 18pt; border-top: 1px solid #ddd; padding-top: 6pt; }
</style></head>
<body>
<div class="header">
  <h1>${esc(meta.title)}</h1>
  <div class="muted">
    <span class="brand">JO Study · JO-PRINT</span>
    ${meta.courseName ? ` · ${esc(meta.courseName)}` : ''}
    ${meta.studentName ? ` · ${esc(meta.studentName)}` : ''}
    · ${esc(new Date(meta.generatedAt).toISOString().slice(0, 10))}
  </div>
</div>
${bodyHtml}
</body></html>`
}

function citeText(c: { fileName?: string; page?: number | null }): string {
  if (!c) return ''
  const parts = [c.fileName, c.page ? `ص ${c.page}` : null].filter(Boolean)
  return parts.length ? `<span class="cite"> [${esc(parts.join(' — '))}]</span>` : ''
}

export function summaryHtml(meta: DocMeta, s: StudySummary): string {
  const body = [
    s.overview ? `<div class="section"><h2>نظرة عامة</h2><p>${esc(s.overview)}</p></div>` : '',
    s.mainIdeas.length ? `<div class="section"><h2>الأفكار الرئيسية</h2>${s.mainIdeas.map(m =>
      `<h3>${esc(m.title)}</h3><p>${esc(m.explanation)}${(m.sources ?? []).map(citeText).join('')}</p>`).join('')}</div>` : '',
    s.definitions.length ? `<div class="section"><h2>التعريفات</h2><ul>${s.definitions.map(d =>
      `<li><strong>${esc(d.term)}:</strong> ${esc(d.definition)}${d.page ? citeText({ page: d.page }) : ''}</li>`).join('')}</ul></div>` : '',
    s.keyFacts.length ? `<div class="section"><h2>حقائق أساسية</h2><ul>${s.keyFacts.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>` : '',
    s.reviewPoints.length ? `<div class="section"><h2>نقاط للمراجعة</h2><ul>${s.reviewPoints.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>` : '',
    s.practiceQuestions.length ? `<div class="section"><h2>أسئلة تدريبية محتملة</h2><ol>${s.practiceQuestions.map(q => `<li>${esc(q)}</li>`).join('')}</ol></div>` : '',
    s.warnings.length ? `<div class="warn">${s.warnings.map(w => `<div>⚠️ ${esc(w)}</div>`).join('')}</div>` : '',
  ].join('\n')
  return shell(meta, body)
}

export function quizHtml(meta: DocMeta, q: StudyQuiz, opts: { withAnswers: boolean }): string {
  const body = q.questions.map((question, i) => {
    const opts_ = question.options.length
      ? `<div class="opts"><ol type="A">${question.options.map(o => `<li>${esc(o)}</li>`).join('')}</ol></div>`
      : (question.type === 'true_false' ? `<div class="opts">صح / خطأ</div>` : '<div class="opts" style="height:36pt;border-bottom:1px dotted #999"></div>')
    const answer = opts.withAnswers
      ? `<div class="cite"><strong>الإجابة:</strong> ${esc(question.correctAnswer)}${question.explanation ? ` — ${esc(question.explanation)}` : ''}${question.source ? citeText(question.source) : ''}</div>`
      : ''
    return `<div class="q"><strong>${i + 1}.</strong> ${esc(question.question)}${opts_}${answer}</div>`
  }).join('\n')
  const heading = opts.withAnswers ? '<div class="muted">نموذج الإجابة</div>' : '<div class="muted">سؤال تدريبي — للمراجعة فقط</div>'
  return shell(meta, heading + body)
}

export function flashcardsHtml(meta: DocMeta, set: StudyFlashcardSet): string {
  const body = `<div>${set.cards.map(c =>
    `<div class="card"><div class="front">${esc(c.front)}</div><div class="back">${esc(c.back)}</div>` +
    `<div class="cite">${esc(c.category || '')}${c.sourcePage ? citeText({ page: c.sourcePage }) : ''}</div></div>`,
  ).join('')}</div>`
  return shell(meta, body)
}
