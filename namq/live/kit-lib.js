/* نمق — أدوات «تنسيق حفلات»: ZIP، قراءة Excel/CSV، وPDF متعدد الصفحات. كلها داخل المتصفح بلا مكتبات خارجية. */

/* ---------- ZIP (تخزين بلا ضغط، أسماء UTF-8) ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

export async function makeZip(files) {
  const enc = new TextEncoder(), parts = [], central = [];
  let off = 0, clen = 0;
  const d = new Date();
  const dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  for (const f of files) {
    let data = f.data;
    if (typeof data === "string") data = enc.encode(data);
    else if (data instanceof Blob) data = new Uint8Array(await data.arrayBuffer());
    const nm = enc.encode(f.name), crc = crc32(data), sz = data.length;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, tm, true); h.setUint16(12, dt, true); h.setUint32(14, crc, true); h.setUint32(18, sz, true); h.setUint32(22, sz, true);
    h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    parts.push(h.buffer, nm, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, tm, true); c.setUint16(14, dt, true); c.setUint32(16, crc, true); c.setUint32(20, sz, true); c.setUint32(24, sz, true);
    c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    central.push(c.buffer, nm);
    off += 30 + nm.length + sz; clen += 46 + nm.length;
  }
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, clen, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, e.buffer], { type: "application/zip" });
}

/* ---------- قراءة ملف ZIP (لملفات xlsx) ---------- */
async function inflateRaw(u8) {
  if (typeof DecompressionStream === "undefined") throw new Error("NO_INFLATE");
  const s = new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function openZip(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf), dec = new TextDecoder();
  let e = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error("NOT_ZIP");
  const n = dv.getUint16(e + 10, true), out = {};
  let p = dv.getUint32(e + 16, true);
  for (let k = 0; k < n; k++) {
    const method = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true);
    const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    out[dec.decode(u8.subarray(p + 46, p + 46 + nl))] = { method, csz, lo };
    p += 46 + nl + xl + cl;
  }
  return {
    names: Object.keys(out),
    async text(name) {
      const f = out[name]; if (!f) return null;
      const st = f.lo + 30 + dv.getUint16(f.lo + 26, true) + dv.getUint16(f.lo + 28, true);
      const raw = u8.subarray(st, st + f.csz);
      return dec.decode(f.method === 0 ? raw : await inflateRaw(raw));
    },
  };
}
const colIdx = (s) => { let n = 0; for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
const tags = (node, name) => Array.from(node.getElementsByTagNameNS("*", name));

export async function readXlsx(buf) {
  const z = await openZip(buf), P = new DOMParser();
  const xml = (s) => P.parseFromString(s, "application/xml");
  const ss = [];
  const sst = await z.text("xl/sharedStrings.xml");
  if (sst) for (const si of tags(xml(sst), "si")) ss.push(tags(si, "t").filter((t) => t.parentNode.localName !== "rPh").map((t) => t.textContent).join(""));
  let sheet = null;
  try {
    const wb = xml(await z.text("xl/workbook.xml"));
    const s1 = tags(wb, "sheet")[0];
    const rid = s1.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || s1.getAttribute("r:id");
    for (const r of tags(xml(await z.text("xl/_rels/workbook.xml.rels")), "Relationship"))
      if (r.getAttribute("Id") === rid) { const t = r.getAttribute("Target"); sheet = t.startsWith("/") ? t.slice(1) : "xl/" + t.replace(/^\.\//, ""); }
  } catch (e) { /* نكمل بأول ورقة */ }
  if (!sheet || !z.names.includes(sheet)) sheet = z.names.filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  if (!sheet) throw new Error("NO_SHEET");
  const rows = [];
  for (const r of tags(xml(await z.text(sheet)), "row")) {
    const row = [];
    for (const c of tags(r, "c")) {
      const ref = (c.getAttribute("r") || "").replace(/\d+/g, ""), t = c.getAttribute("t");
      const v = tags(c, "v")[0];
      let val = "";
      if (t === "s") val = ss[+(v ? v.textContent : -1)] || "";
      else if (t === "inlineStr") val = tags(c, "t").map((x) => x.textContent).join("");
      else val = v ? v.textContent : "";
      row[ref ? colIdx(ref) : row.length] = val;
    }
    rows.push(Array.from(row, (x) => (x == null ? "" : String(x).trim())));
  }
  return rows;
}

export function readCsv(text) {
  text = text.replace(/^﻿/, "");
  const first = text.split(/\r?\n/)[0] || "";
  const delim = [",", ";", "\t"].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell.trim()); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell.trim()); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

/* من الجدول إلى قائمة المعازيم: عمود «الاسم» (أو أول عمود) وعمود «اللقب» اختياري */
export function guestsFromRows(rows) {
  rows = rows.filter((r) => r.some((x) => x));
  if (!rows.length) return [];
  const H = rows[0].map((x) => String(x || "").trim().toLowerCase());
  const isName = (x) => /^(الاسم|اسم|الأسماء|اسم المدعو|المدعو|اسم الضيف|الضيف|name|names|guest|guest name|full name)$/.test(x);
  const isTitle = (x) => /^(اللقب|لقب|الصفة|title|prefix)$/.test(x);
  let ni = H.findIndex(isName), ti = H.findIndex(isTitle), start = 0;
  if (ni >= 0 || ti >= 0) start = 1;
  if (ni < 0) ni = ti === 0 ? 1 : 0;
  const out = [];
  for (const r of rows.slice(start)) {
    const n = String(r[ni] || "").replace(/\s+/g, " ").trim();
    if (!n) continue;
    const t = ti >= 0 ? String(r[ti] || "").trim() : "";
    out.push(t ? t + " " + n : n);
  }
  return out;
}

/* ---------- PDF: صفحات بصور JPEG، والصورة المكررة تُضمَّن مرة واحدة ---------- */
export class Pdf {
  constructor() { this.imgs = []; this.pages = []; }
  image(jpg, w, h) { this.imgs.push({ jpg, w, h }); return this.imgs.length - 1; }
  /* المقاسات بالنقاط (1/72 بوصة) والإحداثيات من أعلى اليسار */
  page(wpt, hpt, items) { this.pages.push({ wpt, hpt, items }); }
  blob(title = "Namq") {
    const enc = new TextEncoder(), parts = [], offs = [];
    let len = 0;
    const push = (b) => { parts.push(b); len += b.length; }, str = (s) => push(enc.encode(s));
    const ni = this.imgs.length, np = this.pages.length;
    const imgId = (i) => 4 + i, pageId = (p) => 4 + ni + p * 2, contId = (p) => 5 + ni + p * 2;
    const total = 4 + ni + np * 2;
    const f = (n) => Number(n).toFixed(2);
    str("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    const obj = (n, body) => { offs[n] = len; str(n + " 0 obj\n" + body + "\nendobj\n"); };
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, "<< /Type /Pages /Kids [" + this.pages.map((_, p) => pageId(p) + " 0 R").join(" ") + "] /Count " + np + " >>");
    obj(3, "<< /Title (" + String(title).replace(/[^\x20-\x7E]/g, "").replace(/[()\\]/g, "") + ") /Producer (Namq) >>");
    this.imgs.forEach((im, i) => {
      offs[imgId(i)] = len;
      str(imgId(i) + " 0 obj\n<< /Type /XObject /Subtype /Image /Width " + im.w + " /Height " + im.h + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + im.jpg.length + " >>\nstream\n");
      push(im.jpg); str("\nendstream\nendobj\n");
    });
    this.pages.forEach((pg, p) => {
      const used = [...new Set(pg.items.map((it) => it.img))];
      obj(pageId(p), "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + f(pg.wpt) + " " + f(pg.hpt) + "] /Resources << /XObject << " + used.map((i) => "/Im" + i + " " + imgId(i) + " 0 R").join(" ") + " >> >> /Contents " + contId(p) + " 0 R >>");
      const cs = pg.items.map((it) => "q " + f(it.w) + " 0 0 " + f(it.h) + " " + f(it.x) + " " + f(pg.hpt - it.y - it.h) + " cm /Im" + it.img + " Do Q").join("\n");
      obj(contId(p), "<< /Length " + enc.encode(cs).length + " >>\nstream\n" + cs + "\nendstream");
    });
    const xr = len;
    str("xref\n0 " + total + "\n0000000000 65535 f \n");
    for (let i = 1; i < total; i++) str(String(offs[i]).padStart(10, "0") + " 00000 n \n");
    str("trailer\n<< /Size " + total + " /Root 1 0 R /Info 3 0 R >>\nstartxref\n" + xr + "\n%%EOF\n");
    return new Blob(parts, { type: "application/pdf" });
  }
}
export const MM = 72 / 25.4;
