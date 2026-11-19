/* نمق — «تنسيق حفلات»: بيانات الحفل مرة واحدة ← مجموعة تصاميم كاملة للتنزيل والطباعة.
   كل شيء يُرسم ويُجهّز داخل المتصفح؛ أسماء المعازيم لا تغادر الجهاز. */
import { makeZip, readXlsx, readCsv, guestsFromRows, Pdf, MM } from "/kit-lib.js";

const $ = (id) => document.getElementById(id);
const I = window.NamqI18n || { lang: "ar", t: (s) => s };
const tr = (s) => (I.t ? I.t(s) : s);
const DIG = "٠١٢٣٤٥٦٧٨٩", ar = (s) => String(s).replace(/\d/g, (d) => DIG[d]);
const KEY = "namq-kit-v1";

/* ---------- الطوابع ---------- */
const THEMES = {
  rose:  { name: "وردي وذهبي", bg: ["#FDF1F4", "#F5D7E0"], ink: "#5A2236", name2: "#8E2F52", accent: "#B88A4A", soft: "#EDB9C8", title: "Aref Ruqaa", body: "Tajawal", orn: "arch" },
  ivory: { name: "عاجي وزيتوني", bg: ["#FBF8F0", "#EFE6D3"], ink: "#33402F", name2: "#4C6440", accent: "#B08D57", soft: "#C9D6BE", title: "Amiri", body: "Tajawal", orn: "frame" },
  navy:  { name: "كحلي وذهبي", bg: ["#22304F", "#111A2D"], ink: "#F3E6CC", name2: "#E7C98E", accent: "#D2AE69", soft: "#3A4A73", title: "Aref Ruqaa", body: "Tajawal", orn: "frame" },
  sky:   { name: "سماوي ناعم", bg: ["#F0F7FC", "#D6E9F6"], ink: "#24496A", name2: "#2D6390", accent: "#D9A84E", soft: "#B9DAF0", title: "Reem Kufi", body: "Tajawal", orn: "dots" },
  blush: { name: "زهري ناعم", bg: ["#FFF4F6", "#FBDDE5"], ink: "#6A2E45", name2: "#B4466E", accent: "#D9A84E", soft: "#F7C3D2", title: "Reem Kufi", body: "Tajawal", orn: "dots" },
  party: { name: "مرح وملوّن", bg: ["#FFF8E9", "#FFE8C4"], ink: "#3B2A5A", name2: "#E8505B", accent: "#F2A93B", soft: "#7FD1C7", title: "Reem Kufi", body: "Tajawal", orn: "confetti", pal: ["#E8505B", "#F2A93B", "#7FD1C7", "#6C5CE7", "#F9D56E"] },
};
const FONTS = [["Aref Ruqaa", "رقعة — Aref Ruqaa"], ["Amiri", "نسخ — Amiri"], ["Reem Kufi", "كوفي — Reem Kufi"], ["Tajawal", "حديث — Tajawal"]];

/* ---------- المناسبات ---------- */
const OCC = {
  wedding: {
    name: "عرس", hint: "زفاف وحفل عرس", themes: ["rose", "ivory", "navy"], couple: true, label: "حفل زفاف", welcome: "بكم في حفل زفاف",
    order: ["basmala", "hosts", "intro", "names", "div", "date", "time", "venue", "note", "rsvp", "closing"],
    d: { basmala: true, hosts: "عائلة الأحمد وعائلة السالم", intro: "يتشرفون بدعوتكم لحضور حفل زفاف", name1: "أحمد", name2: "سارة", sub: "",
      date: "2026-12-11", time: "20:00", venue: "قاعة الريم — دبي", note: "جنة الأطفال منازلهم", rsvp: "", closing: "وبحضوركم يكتمل فرحنا",
      thanks: "شكرًا لمشاركتنا فرحتنا", hashtag: "#أحمد_وسارة", prefix: "حضرة:" },
    labels: { name1: "اسم العريس", name2: "اسم العروس" },
  },
  engagement: {
    name: "خطوبة", hint: "حفل خطوبة أو ملكة", themes: ["rose", "navy", "ivory"], couple: true, label: "حفل خطوبة", welcome: "بكم في حفل خطوبة",
    order: ["basmala", "hosts", "intro", "names", "div", "date", "time", "venue", "note", "rsvp", "closing"],
    d: { basmala: true, hosts: "عائلة المنصوري وعائلة الحسن", intro: "يسعدهم دعوتكم لحضور حفل خطوبة", name1: "خالد", name2: "نور", sub: "",
      date: "2026-12-04", time: "19:30", venue: "فندق القصر — عمّان", note: "", rsvp: "", closing: "بحضوركم تكتمل فرحتنا",
      thanks: "شكرًا لمشاركتنا فرحتنا", hashtag: "#خالد_ونور", prefix: "حضرة:" },
    labels: { name1: "اسم الخاطب", name2: "اسم المخطوبة" },
  },
  birthday: {
    name: "عيد ميلاد", hint: "للصغار والكبار", themes: ["party", "sky", "navy"], couple: false, label: "حفل عيد ميلاد", welcome: "بكم في حفل عيد ميلاد",
    order: ["intro", "names", "sub", "div", "date", "time", "venue", "note", "rsvp", "hosts", "closing"],
    d: { basmala: false, hosts: "عائلة الخطيب", intro: "يسعدنا دعوتكم للاحتفال بعيد ميلاد", name1: "لين", name2: "", sub: "تكمل عامها السابع",
      date: "2026-12-19", time: "17:00", venue: "حديقة المرح — الشارقة", note: "", rsvp: "", closing: "ننتظركم لنحتفل معًا",
      thanks: "شكرًا لمشاركتنا الاحتفال", hashtag: "", prefix: "إلى:" },
    labels: { name1: "اسم صاحب/ة الحفل", sub: "سطر العمر" },
  },
  newborn: {
    name: "مولود جديد", hint: "حفل استقبال المولود", themes: ["sky", "blush", "ivory"], couple: false, label: "حفل استقبال المولود", welcome: "بكم في حفل استقبال",
    order: ["basmala", "intro", "names", "sub", "div", "date", "time", "venue", "note", "rsvp", "hosts", "closing"],
    d: { basmala: true, hosts: "عائلة النعيمي", intro: "رزقنا الله بمولودنا", name1: "يوسف", name2: "", sub: "ويسعدنا دعوتكم لحفل استقباله",
      date: "2026-12-12", time: "18:00", venue: "منزل العائلة — العين", note: "", rsvp: "", closing: "شاكرين دعواتكم",
      thanks: "شكرًا لتهنئتكم", hashtag: "", prefix: "إلى:" },
    labels: { name1: "اسم المولود", sub: "سطر إضافي" },
  },
};
const FIELDS = [
  ["basmala", "إضافة البسملة", "chk"], ["hosts", "الداعون"], ["intro", "عبارة الدعوة", "w"], ["name1", "الاسم"], ["name2", "الاسم الثاني"],
  ["sub", "سطر إضافي", "w"], ["date", "التاريخ", "date"], ["time", "الوقت", "time"], ["venue", "المكان", "w"], ["note", "ملاحظة (اختياري)", "w"],
  ["rsvp", "للتأكيد والاستفسار (اختياري)"], ["closing", "العبارة الختامية"], ["thanks", "عبارة الشكر (للملصقات وستوري الشكر)"],
  ["hashtag", "هاشتاق الحفل (اختياري)"], ["prefix", "ما يسبق اسم المدعو"],
];

/* ---------- القطع ---------- */
const PIECES = [
  { id: "story", name: "دعوة ستوري", desc: "1080×1920 · PNG · للواتساب والإنستغرام" },
  { id: "post", name: "دعوة بوست", desc: "1080×1350 · PNG" },
  { id: "a5", name: "بطاقة دعوة للطباعة", desc: "A5 · PDF · 300dpi" },
  { id: "gwa", name: "دعوات بأسماء المعازيم — للواتساب", desc: "صورة لكل مدعو · JPG", guests: true },
  { id: "ga5", name: "دعوات بأسماء المعازيم — للطباعة", desc: "A5 · ملف PDF واحد، صفحة لكل مدعو", guests: true },
  { id: "welcome", name: "لوحة ترحيب", desc: "A3 · PDF · للمدخل" },
  { id: "place", name: "بطاقات أماكن الجلوس بالأسماء", desc: "A4 · ١٠ بطاقات في الصفحة مع علامات القص", guests: true },
  { id: "tables", name: "أرقام الطاولات", desc: "A4 · ٤ بطاقات في الصفحة" },
  { id: "stickers", name: "ملصقات التوزيعات", desc: "دوائر ٥ سم · A4 · ١٥ في الصفحة" },
  { id: "thanks", name: "ستوري شكر بعد الحفل", desc: "1080×1920 · PNG" },
];
const PV = [["story", "ستوري"], ["post", "بوست"], ["a5", "بطاقة A5"], ["guest", "دعوة باسم"], ["welcome", "لوحة الترحيب"], ["place", "بطاقات الأماكن"], ["tables", "الطاولات"], ["stickers", "الملصقات"], ["thanks", "شكر"]];

/* ---------- الحالة ---------- */
let st = load();
function fresh(occ) { const o = OCC[occ]; return { occ, theme: o.themes[0], font: "", d: { ...o.d }, guests: [], pieces: Object.fromEntries(PIECES.map((p) => [p.id, true])), tables: 10, stickers: 30, pv: "story" }; }
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && OCC[s.occ]) return { ...fresh(s.occ), ...s, d: { ...OCC[s.occ].d, ...s.d } }; } catch (e) { /* بداية جديدة */ }
  const q = new URLSearchParams(location.search).get("o");
  return fresh(OCC[q] ? q : "wedding");
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* المساحة ممتلئة: نكمل بلا حفظ */ } }
{ const q = new URLSearchParams(location.search).get("o"); if (OCC[q] && q !== st.occ) { const g = st.guests; st = fresh(q); st.guests = g; } }

/* ---------- أدوات الرسم ---------- */
const TH = () => THEMES[st.theme] || THEMES.rose;
const titleFont = () => st.font || TH().title;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function fitFont(c, s, font, w, z, maxW) { c.font = `${w} ${z}px "${font}"`; let m = c.measureText(s).width; if (m > maxW) { z = z * maxW / m; c.font = `${w} ${z}px "${font}"`; } return z; }
function text(c, s, x, y, { font, w = 400, z, color, maxW = 1e9, alpha = 1, align = "center" }) {
  if (!s) return;
  c.save(); c.globalAlpha = alpha; c.fillStyle = color; c.direction = "rtl"; c.textAlign = align; c.textBaseline = "middle";
  fitFont(c, s, font, w, z, maxW); c.fillText(s, x, y); c.restore();
}
function wrapLines(c, s, font, w, z, maxW) {
  c.font = `${w} ${z}px "${font}"`; const out = [];
  for (const para of String(s).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) { const t = line ? line + " " + word : word; if (line && c.measureText(t).width > maxW) { out.push(line); line = word; } else line = t; }
    if (line) out.push(line);
  }
  return out;
}
function diamond(c, x, y, r, color) { c.save(); c.fillStyle = color; c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * .7, y); c.lineTo(x, y + r); c.lineTo(x - r * .7, y); c.closePath(); c.fill(); c.restore(); }
function sparkle(c, x, y, r, color) { c.save(); c.fillStyle = color; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * .28 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); c.restore(); }
function divider(c, x, y, wd, th) {
  c.save(); c.strokeStyle = th.accent; c.lineWidth = Math.max(1, wd * .006);
  c.beginPath(); c.moveTo(x - wd / 2, y); c.lineTo(x - wd * .08, y); c.moveTo(x + wd * .08, y); c.lineTo(x + wd / 2, y); c.stroke();
  diamond(c, x, y, wd * .045, th.accent); diamond(c, x - wd * .05, y, wd * .018, th.accent); diamond(c, x + wd * .05, y, wd * .018, th.accent); c.restore();
}
function blob(c, x, y, r, color, a) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, color + "00"); c.save(); c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); }

/* الخلفية والزخرفة حسب الطابع؛ W×H مساحة الرسم الحالية */
function paintBg(c, W, H, th, { small = false, seed = 7 } = {}) {
  const g = c.createLinearGradient(0, 0, W * .3, H); g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const m = Math.min(W, H), R = rng(seed), lw = Math.max(1, m * .004);
  c.save();
  if (th.orn === "arch") {
    blob(c, W * .95, H * .04, m * .7, th.soft, .55); blob(c, W * .05, H * .97, m * .75, th.soft, .5);
    const p = m * .07, r = W / 2 - p, top = small ? p : Math.max(p, H * .04);
    const arch = (ins) => { c.beginPath(); c.moveTo(p + ins, H - p - ins); c.lineTo(p + ins, top + r); c.arc(W / 2, top + r, r - ins, Math.PI, 0); c.lineTo(W - p - ins, H - p - ins); c.closePath(); };
    c.strokeStyle = th.accent; c.lineWidth = lw; arch(0); c.stroke(); c.lineWidth = lw * .45; arch(m * .018); c.stroke();
    diamond(c, W / 2, top, m * .022, th.accent);
    if (!small) { sparkle(c, W * .2, top + r * .55, m * .02, th.accent); sparkle(c, W * .8, top + r * .55, m * .014, th.accent); }
  } else if (th.orn === "frame") {
    blob(c, W * .5, H * .5, m * .9, th.soft, .25);
    const p = m * .05, q = m * .068;
    c.strokeStyle = th.accent; c.lineWidth = lw; c.strokeRect(p, p, W - p * 2, H - p * 2); c.lineWidth = lw * .45; c.strokeRect(q, q, W - q * 2, H - q * 2);
    const cr = m * .09;
    for (const [x, y, a] of [[q, q, 0], [W - q, q, Math.PI / 2], [W - q, H - q, Math.PI], [q, H - q, -Math.PI / 2]]) {
      c.save(); c.translate(x, y); c.rotate(a); c.lineWidth = lw * .8; c.beginPath(); c.arc(0, 0, cr, 0, Math.PI / 2); c.stroke();
      c.beginPath(); c.arc(0, 0, cr * .6, 0, Math.PI / 2); c.stroke(); diamond(c, cr * .78, cr * .78, m * .012, th.accent); c.restore();
    }
    diamond(c, W / 2, p, m * .02, th.accent); diamond(c, W / 2, H - p, m * .02, th.accent);
  } else if (th.orn === "dots") {
    for (let i = 0; i < (small ? 10 : 26); i++) {
      const x = R() * W, y = R() * H, r = m * (.02 + R() * .09);
      if (Math.abs(x - W / 2) < W * .3 && Math.abs(y - H / 2) < H * .32) continue;
      c.globalAlpha = .25 + R() * .35; c.fillStyle = th.soft; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
    c.globalAlpha = 1;
    for (let i = 0; i < (small ? 4 : 10); i++) { const x = R() * W, y = R() * H; if (Math.abs(x - W / 2) < W * .32 && Math.abs(y - H / 2) < H * .34) continue; sparkle(c, x, y, m * (.012 + R() * .018), th.accent); }
    const p = m * .05; c.strokeStyle = th.accent; c.lineWidth = lw * .7; c.beginPath(); c.roundRect(p, p, W - p * 2, H - p * 2, m * .06); c.stroke();
  } else if (th.orn === "confetti") {
    const pal = th.pal;
    if (!small) {
      const n = 9, sag = H * .035, y0 = H * .045;
      c.strokeStyle = th.ink; c.globalAlpha = .5; c.lineWidth = lw * .6; c.beginPath();
      for (let i = 0; i <= 40; i++) { const t = i / 40, x = t * W; c.lineTo(x, y0 + Math.sin(t * Math.PI) * sag); } c.stroke(); c.globalAlpha = 1;
      for (let i = 0; i < n; i++) {
        const t = (i + .5) / n, x = t * W, y = y0 + Math.sin(t * Math.PI) * sag, s = W / n * .42;
        c.fillStyle = pal[i % pal.length]; c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.lineTo(x, y + s * 1.5); c.closePath(); c.fill();
      }
    }
    for (let i = 0; i < (small ? 16 : 60); i++) {
      const x = R() * W, y = (small ? 0 : H * .1) + R() * H;
      if (Math.abs(x - W / 2) < W * .34 && Math.abs(y - H / 2) < H * .36) continue;
      c.save(); c.translate(x, y); c.rotate(R() * 6.28); c.fillStyle = pal[(R() * pal.length) | 0]; c.globalAlpha = .85;
      const s = m * (.008 + R() * .014); if (R() < .5) c.fillRect(-s, -s * 2, s * 2, s * 4); else { c.beginPath(); c.arc(0, 0, s * 1.3, 0, 7); c.fill(); }
      c.restore();
    }
  }
  c.restore();
}

/* ---------- نصوص الحفل ---------- */
function dateText(d) {
  if (!d.date) return ""; const dt = new Date(d.date + "T12:00:00"); if (isNaN(dt)) return "";
  try { return new Intl.DateTimeFormat("ar-u-nu-arab-ca-gregory", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(dt); } catch (e) { return ar(d.date); }
}
function timeText(d) {
  if (!d.time) return ""; const [h, m] = d.time.split(":").map(Number); if (isNaN(h)) return "";
  return "الساعة " + ar(((h + 11) % 12) + 1) + (m ? ":" + ar(String(m).padStart(2, "0")) : "") + " " + (h < 12 ? "صباحًا" : "مساءً");
}
const namesText = (d) => (OCC[st.occ].couple && d.name2 ? d.name1 + " و " + d.name2 : d.name1);
const shortDate = (d) => { if (!d.date) return ""; const [y, mo, da] = d.date.split("-"); return ar(+da + "/" + +mo + "/" + y); };

/* ---------- الدعوة (ستوري، بوست، A5، دعوة بالاسم) ---------- */
function invite(c, W, H, { slot = false } = {}) {
  const th = TH(), d = st.d, o = OCC[st.occ], u = W / 1000, tf = titleFont(), bf = th.body;
  paintBg(c, W, H, th, { seed: 11 });
  const B = [], maxW = W * .74;
  const add = (h, draw) => B.push({ h, draw });
  const one = (s, font, w, z, color, gap = 22, alpha = 1) => { if (s) add(z * 1.3 + gap, (y, k) => text(c, s, W / 2, y + z * 1.3 * k * u / 2, { font, w, z: z * k * u, color, alpha, maxW })); };
  const many = (s, font, w, z, color, gap = 22, alpha = 1) => {
    if (!s) return; const L = wrapLines(c, s, font, w, z * u, maxW); const lh = z * 1.45;
    add(L.length * lh + gap, (y, k) => L.forEach((l, i) => text(c, l, W / 2, y + (i + .5) * lh * k * u, { font, w, z: z * k * u, color, alpha, maxW })));
  };
  let slotRect = null;
  if (slot) add(118, (y, k) => { slotRect = { y: y + 30 * k * u, h: 70 * k * u }; });
  for (const key of o.order) {
    if (key === "basmala") { if (d.basmala) one("بسم الله الرحمن الرحيم", "Amiri", 400, 34, th.ink, 26, .8); }
    else if (key === "hosts") one(d.hosts, bf, 700, 36, th.ink, 14);
    else if (key === "intro") many(d.intro, bf, 500, 36, th.ink, 22);
    else if (key === "names") {
      if (o.couple) { one(d.name1, tf, 700, 132, th.name2, 0); if (d.name2) { one("و", tf, 400, 64, th.accent, 0); one(d.name2, tf, 700, 132, th.name2, 18); } }
      else one(d.name1, tf, 700, 168, th.name2, 10);
    } else if (key === "sub") many(d.sub, bf, 500, 36, th.ink, 18);
    else if (key === "div") add(70, (y, k) => divider(c, W / 2, y + 35 * k * u, 420 * u, th));
    else if (key === "date") one(dateText(d), bf, 700, 38, th.ink, 8);
    else if (key === "time") one(timeText(d), bf, 500, 34, th.ink, 8);
    else if (key === "venue") many(d.venue, bf, 500, 34, th.ink, 18);
    else if (key === "note") many(d.note, bf, 400, 28, th.ink, 10, .75);
    else if (key === "rsvp") many(d.rsvp, bf, 400, 28, th.ink, 10, .75);
    else if (key === "closing") one(d.closing, tf, 400, 52, th.accent, 0);
  }
  const top = H * (th.orn === "arch" ? .15 : th.orn === "confetti" ? .12 : .09), bot = H * .075;
  const total = B.reduce((s, b) => s + b.h, 0) * u, avail = H - top - bot;
  const k = Math.max(.55, Math.min(H / W > 1.6 ? 1.6 : 1.35, avail / total));
  let y = top + (avail - total * k) / 2;
  for (const b of B) { b.draw(y, k); y += b.h * k * u; }
  if (!slotRect) return null;
  const g = 16, x0 = Math.floor(W * .17 / g) * g, x1 = Math.ceil(W * .83 / g) * g;
  const y0 = Math.floor(slotRect.y / g) * g, y1 = Math.ceil((slotRect.y + slotRect.h) / g) * g;
  return { x: x0, y: y0, w: Math.min(W, x1) - x0, h: Math.min(H, y1) - y0 };
}
function drawGuest(c, r, guest) {
  const th = TH(), s = ((st.d.prefix || "").trim() + " " + guest).trim();
  text(c, s, r.x + r.w / 2, r.y + r.h / 2, { font: th.body, w: 700, z: r.h * .46, color: th.name2, maxW: r.w * .94 });
}

/* لوحة الترحيب وستوري الشكر */
function welcome(c, W, H) {
  const th = TH(), d = st.d, u = W / 1000, tf = titleFont();
  paintBg(c, W, H, th, { seed: 5 });
  const cy = H * .52;
  text(c, "أهلًا وسهلًا", W / 2, cy - 330 * u, { font: tf, w: 700, z: 150 * u, color: th.accent, maxW: W * .76 });
  text(c, OCC[st.occ].welcome, W / 2, cy - 175 * u, { font: th.body, w: 500, z: 48 * u, color: th.ink, maxW: W * .76 });
  text(c, namesText(d), W / 2, cy, { font: tf, w: 700, z: 170 * u, color: th.name2, maxW: W * .8 });
  divider(c, W / 2, cy + 175 * u, 440 * u, th);
  text(c, dateText(d), W / 2, cy + 260 * u, { font: th.body, w: 700, z: 40 * u, color: th.ink, maxW: W * .76 });
  text(c, d.hashtag, W / 2, cy + 340 * u, { font: th.body, w: 700, z: 40 * u, color: th.accent, maxW: W * .76 });
}
function thanks(c, W, H) {
  const th = TH(), d = st.d, u = W / 1000, tf = titleFont();
  paintBg(c, W, H, th, { seed: 9 });
  const cy = H * .5;
  text(c, "شكرًا", W / 2, cy - 300 * u, { font: tf, w: 700, z: 250 * u, color: th.accent, maxW: W * .76 });
  text(c, String(d.thanks || "").replace(/^شكرًا\s*(لكم\s*)?/, ""), W / 2, cy - 90 * u, { font: th.body, w: 700, z: 52 * u, color: th.ink, maxW: W * .78 });
  text(c, namesText(d), W / 2, cy + 70 * u, { font: tf, w: 700, z: 110 * u, color: th.name2, maxW: W * .78 });
  divider(c, W / 2, cy + 200 * u, 380 * u, th);
  text(c, dateText(d), W / 2, cy + 270 * u, { font: th.body, w: 500, z: 36 * u, color: th.ink, maxW: W * .76 });
  text(c, d.hashtag, W / 2, cy + 340 * u, { font: th.body, w: 700, z: 36 * u, color: th.accent, maxW: W * .76 });
}

/* ---------- البطاقات الصغيرة على أوراق A4 ---------- */
function placeCard(c, x, y, w, h) {
  const th = TH(), d = st.d;
  c.save(); c.translate(x, y); c.beginPath(); c.rect(0, 0, w, h); c.clip();
  paintBg(c, w, h, { ...th, orn: th.orn === "confetti" ? "confetti" : "none" }, { small: true, seed: 3 });
  const p = h * .07; c.strokeStyle = th.accent; c.lineWidth = Math.max(1, h * .008); c.strokeRect(p, p, w - p * 2, h - p * 2);
  diamond(c, w / 2, p, h * .035, th.accent);
  text(c, OCC[st.occ].label + " · " + namesText(d), w / 2, h * .8, { font: th.body, w: 500, z: h * .075, color: th.ink, maxW: w * .8, alpha: .8 });
  c.restore();
  return { x: x + w * .08, y: y + h * .2, w: w * .84, h: h * .44 };
}
function placeName(c, r, guest) { const th = TH(); text(c, guest, r.x + r.w / 2, r.y + r.h / 2, { font: titleFont(), w: 700, z: r.h * .62, color: th.name2, maxW: r.w * .95 }); }
function tableCard(c, x, y, w, h, n) {
  const th = TH(), d = st.d;
  c.save(); c.translate(x, y); c.beginPath(); c.rect(0, 0, w, h); c.clip();
  paintBg(c, w, h, th, { small: true, seed: 20 + n });
  text(c, "طاولة", w / 2, h * .3, { font: titleFont(), w: 700, z: w * .14, color: th.accent, maxW: w * .7 });
  text(c, ar(n), w / 2, h * .54, { font: "Reem Kufi", w: 700, z: w * .38, color: th.name2, maxW: w * .7 });
  text(c, namesText(d), w / 2, h * .8, { font: th.body, w: 500, z: w * .055, color: th.ink, maxW: w * .7, alpha: .85 });
  c.restore();
}
function sticker(c, cx, cy, r) {
  const th = TH(), d = st.d;
  c.save(); c.beginPath(); c.arc(cx, cy, r, 0, 7); c.clip();
  const g = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]); c.fillStyle = g; c.fillRect(cx - r, cy - r, r * 2, r * 2);
  c.strokeStyle = th.accent; c.lineWidth = r * .03; c.beginPath(); c.arc(cx, cy, r * .9, 0, 7); c.stroke(); c.lineWidth = r * .012; c.beginPath(); c.arc(cx, cy, r * .84, 0, 7); c.stroke();
  diamond(c, cx, cy - r * .62, r * .06, th.accent);
  text(c, namesText(d), cx, cy - r * .12, { font: titleFont(), w: 700, z: r * .3, color: th.name2, maxW: r * 1.3 });
  text(c, d.thanks, cx, cy + r * .22, { font: th.body, w: 700, z: r * .11, color: th.ink, maxW: r * 1.35 });
  text(c, shortDate(d), cx, cy + r * .45, { font: th.body, w: 500, z: r * .1, color: th.ink, maxW: r, alpha: .8 });
  c.restore();
}
function cropMarks(c, xs, ys, x0, y0, x1, y1, px) {
  c.save(); c.strokeStyle = "#9a9a9a"; c.lineWidth = Math.max(1, px * .15); const L = px * 5, o = px * 2;
  c.beginPath();
  for (const x of xs) { c.moveTo(x, y0 - o); c.lineTo(x, y0 - o - L); c.moveTo(x, y1 + o); c.lineTo(x, y1 + o + L); }
  for (const y of ys) { c.moveTo(x0 - o, y); c.lineTo(x0 - o - L, y); c.moveTo(x1 + o, y); c.lineTo(x1 + o + L, y); }
  c.stroke(); c.restore();
}
/* ورقة A4 بالأماكن: تُعيد مستطيلات أماكن الأسماء */
function placeSheet(c, dpi) {
  const px = dpi / 25.4, W = Math.round(210 * px), H = Math.round(297 * px);
  c.canvas.width = W; c.canvas.height = H; c.fillStyle = "#fff"; c.fillRect(0, 0, W, H);
  const cw = 90 * px, ch = 50 * px, x0 = 15 * px, y0 = 23.5 * px, slots = [];
  for (let r = 0; r < 5; r++) for (let k = 0; k < 2; k++) slots.push(placeCard(c, x0 + (1 - k) * cw, y0 + r * ch, cw, ch));
  cropMarks(c, [x0, x0 + cw, x0 + cw * 2], [0, 1, 2, 3, 4, 5].map((i) => y0 + i * ch), x0, y0, x0 + cw * 2, y0 + ch * 5, px);
  return slots;
}
function tableSheet(c, dpi, from, to) {
  const px = dpi / 25.4, W = Math.round(210 * px), H = Math.round(297 * px);
  c.canvas.width = W; c.canvas.height = H; c.fillStyle = "#fff"; c.fillRect(0, 0, W, H);
  const cw = W / 2, ch = H / 2;
  for (let i = from; i <= to; i++) { const j = i - from; tableCard(c, (1 - (j % 2)) * cw, Math.floor(j / 2) * ch, cw, ch, i); }
  c.save(); c.strokeStyle = "#ffffff"; c.lineWidth = px * .4; c.beginPath(); c.moveTo(cw, 0); c.lineTo(cw, H); c.moveTo(0, ch); c.lineTo(W, ch); c.stroke(); c.restore();
}
function stickerSheet(c, dpi, count = 15) {
  const px = dpi / 25.4, W = Math.round(210 * px), H = Math.round(297 * px);
  c.canvas.width = W; c.canvas.height = H; c.fillStyle = "#fff"; c.fillRect(0, 0, W, H);
  let n = 0;
  for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) { if (n++ >= count) break; sticker(c, (45 + (2 - k) * 60) * px, (38.5 + r * 55) * px, 25 * px); }
}

/* ---------- مساعدات التصدير ---------- */
const mk = (w, h) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; return cv; };
const blobOf = (cv, type, q) => new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), type, q));
const bytes = async (b) => new Uint8Array(await b.arrayBuffer());
const tick = () => new Promise((r) => setTimeout(r, 0));
const safe = (s) => String(s).replace(/[\\/:*?"<>|#\n\r\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || "x";
const A5 = (dpi) => [Math.round(148 * dpi / 25.4), Math.round(210 * dpi / 25.4)];

async function fontsReady() {
  const fams = ["Aref Ruqaa", "Amiri", "Reem Kufi", "Tajawal"];
  try { await Promise.all(fams.flatMap((f) => [400, 500, 700].map((w) => document.fonts.load(`${w} 40px "${f}"`, "أبجد ١٢٣")))); } catch (e) { /* نكمل بخط بديل */ }
}

/* ---------- المعاينة ---------- */
const pv = $("pv"), pctx = pv.getContext("2d");
function renderPreview() {
  const id = st.pv, guest = st.guests[0] || "محمد أحمد";
  const S = (w, h) => { pv.width = w; pv.height = h; };
  let note = "";
  if (id === "story" || id === "thanks") { S(540, 960); (id === "story" ? invite : thanks)(pctx, 540, 960); }
  else if (id === "post") { S(600, 750); invite(pctx, 600, 750); }
  else if (id === "a5") { S(560, 794); invite(pctx, 560, 794); note = "A5 — 148×210 مم"; }
  else if (id === "guest") { S(600, 750); const r = invite(pctx, 600, 750, { slot: true }); drawGuest(pctx, r, guest); note = st.guests.length ? "معاينة بأول اسم في القائمة" : "اسم تجريبي — أضف المعازيم في الخطوة ٤"; }
  else if (id === "welcome") { S(560, 792); welcome(pctx, 560, 792); note = "A3 — 297×420 مم"; }
  else if (id === "place") { const slots = placeSheet(pctx, 72); (st.guests.length ? st.guests : ["محمد أحمد", "سارة علي"]).slice(0, 10).forEach((g, i) => placeName(pctx, slots[i], g)); note = "ورقة A4 — اقطع على العلامات الرمادية"; }
  else if (id === "tables") { tableSheet(pctx, 72, 1, 4); note = "ورقة A4 — ٤ طاولات"; }
  else if (id === "stickers") { stickerSheet(pctx, 72); note = "ورقة A4 — ملصقات دائرية ٥ سم"; }
  $("pvnote").textContent = note;
}
let tmr = 0;
const refresh = () => { clearTimeout(tmr); tmr = setTimeout(() => { renderPreview(); save(); updateGo(); }, 120); };

/* ---------- الواجهة ---------- */
function ui() {
  const o = OCC[st.occ];
  $("occs").innerHTML = Object.entries(OCC).map(([k, v]) => `<button type="button" class="occ" data-occ="${k}" aria-pressed="${k === st.occ}"><b>${v.name}</b><span>${v.hint}</span></button>`).join("");
  $("themes").innerHTML = o.themes.map((k) => `<button type="button" class="theme" data-theme="${k}" aria-pressed="${k === st.theme}"><canvas width="184" height="328" data-th="${k}"></canvas><span>${THEMES[k].name}</span></button>`).join("");
  $("font").innerHTML = `<option value="">تلقائي حسب الطابع</option>` + FONTS.map(([f, n]) => `<option value="${f}"${st.font === f ? " selected" : ""}>${n}</option>`).join("");
  const used = new Set(o.order.concat(["thanks", "hashtag", "prefix"]));
  if (o.couple) used.add("name2");
  $("fields").innerHTML = FIELDS.filter(([k]) => used.has(k) || (k === "name1")).map(([k, label, kind]) => {
    const lb = (o.labels && o.labels[k]) || label;
    if (kind === "chk") return `<label class="f chk w"><input type="checkbox" data-k="${k}"${st.d[k] ? " checked" : ""}>${lb}</label>`;
    const type = kind === "date" ? "date" : kind === "time" ? "time" : "text";
    const tag = kind === "w" ? `<textarea data-k="${k}" rows="1" data-notr></textarea>` : `<input type="${type}" data-k="${k}" data-notr>`;
    return `<label class="f${kind === "w" ? " w" : ""}">${lb}${tag}</label>`;
  }).join("");
  $("fields").querySelectorAll("[data-k]").forEach((el) => { if (el.type !== "checkbox") el.value = st.d[el.dataset.k] || ""; });
  $("pieces").innerHTML = PIECES.map((p) => `<label class="piece" data-piece="${p.id}"><input type="checkbox" data-p="${p.id}"${st.pieces[p.id] ? " checked" : ""}><div><b>${p.name}</b><span>${p.desc}</span>${p.guests ? `<span class="need" data-need hidden> — تحتاج قائمة المعازيم</span>` : ""}</div></label>`).join("");
  $("pvtabs").innerHTML = PV.map(([k, n]) => `<button type="button" data-pv="${k}" aria-pressed="${k === st.pv}">${n}</button>`).join("");
  $("tables").value = st.tables; $("stickers").value = st.stickers;
  $("glist").value = st.guests.join("\n");
  thumbs(); guestStat(); refresh();
}
function thumbs() {
  const keep = st.theme;
  document.querySelectorAll("canvas[data-th]").forEach((cv) => { st.theme = cv.dataset.th; invite(cv.getContext("2d"), cv.width, cv.height); });
  st.theme = keep;
}
function guestStat() {
  const n = st.guests.length;
  $("gstat").innerHTML = n ? `عدد المعازيم: <b>${n}</b>` : "لم تُضف أسماء بعد — الدعوات بالأسماء وبطاقات الأماكن تحتاج القائمة.";
  document.querySelectorAll("[data-need]").forEach((el) => (el.hidden = n > 0));
  document.querySelectorAll(".piece").forEach((el) => { const p = PIECES.find((x) => x.id === el.dataset.piece); el.classList.toggle("off", !!(p.guests && !n)); });
}
function updateGo() {
  const sel = PIECES.filter((p) => st.pieces[p.id] && (!p.guests || st.guests.length));
  $("build").disabled = !sel.length;
  $("goNote").textContent = sel.length ? `${sel.length} تصاميم` : "اختر تصميمًا واحدًا على الأقل";
}

document.addEventListener("click", (e) => {
  const oc = e.target.closest("[data-occ]");
  if (oc && oc.dataset.occ !== st.occ) { const g = st.guests, pv0 = st.pv; st = fresh(oc.dataset.occ); st.guests = g; st.pv = pv0; ui(); return; }
  const tb = e.target.closest("[data-theme]");
  if (tb) { st.theme = tb.dataset.theme; document.querySelectorAll("[data-theme]").forEach((b) => b.setAttribute("aria-pressed", b === tb)); refresh(); return; }
  const pb = e.target.closest("[data-pv]");
  if (pb) { st.pv = pb.dataset.pv; document.querySelectorAll("[data-pv]").forEach((b) => b.setAttribute("aria-pressed", b === pb)); refresh(); }
});
$("fields").addEventListener("input", (e) => {
  const k = e.target.dataset.k; if (!k) return;
  st.d[k] = e.target.type === "checkbox" ? e.target.checked : e.target.value; refresh(); clearTimeout(thumbs.t); thumbs.t = setTimeout(thumbs, 400);
});
$("font").addEventListener("change", (e) => { st.font = e.target.value; thumbs(); refresh(); });
$("pieces").addEventListener("change", (e) => { const p = e.target.dataset.p; if (p) { st.pieces[p] = e.target.checked; refresh(); } });
$("tables").addEventListener("input", (e) => { st.tables = Math.max(1, Math.min(200, parseInt(e.target.value, 10) || 1)); refresh(); });
$("stickers").addEventListener("input", (e) => { st.stickers = Math.max(1, Math.min(600, parseInt(e.target.value, 10) || 1)); refresh(); });
const setGuests = (list) => { st.guests = list.map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 1000); guestStat(); refresh(); };
$("glist").addEventListener("input", (e) => setGuests(e.target.value.split(/\r?\n/)));
$("gclear").onclick = () => { $("glist").value = ""; setGuests([]); };
$("gfile").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    let rows;
    if (/\.xlsx$/i.test(f.name)) rows = await readXlsx(await f.arrayBuffer());
    else if (/\.xls$/i.test(f.name)) throw new Error("XLS");
    else rows = readCsv(await f.text());
    const list = guestsFromRows(rows);
    if (!list.length) { $("gstat").textContent = "لم نجد أسماء في الملف. تأكد أن الأسماء في العمود الأول أو في عمود عنوانه «الاسم»."; return; }
    $("glist").value = list.join("\n"); setGuests(list);
  } catch (err) {
    $("gstat").textContent = err.message === "XLS" ? "صيغة xls القديمة غير مدعومة. احفظ الملف بصيغة xlsx أو CSV ثم ارفعه."
      : err.message === "NO_INFLATE" ? "هذا المتصفح لا يقرأ ملفات Excel. احفظ الملف بصيغة CSV أو الصق الأسماء."
      : "تعذّرت قراءة الملف. احفظه بصيغة xlsx أو CSV، أو الصق الأسماء.";
  }
});
$("gsample").onclick = () => {
  const csv = "﻿الاسم,اللقب\nمحمد أحمد,الأستاذ\nسارة علي,الدكتورة\nعائلة الخطيب,\n";
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "namq-guests.csv"; a.click();
};

/* ---------- تجهيز المجموعة ---------- */
let busy = false, urls = [];
$("build").onclick = async () => {
  if (busy) return; busy = true; $("build").disabled = true;
  const out = $("out"), msg = $("outMsg"), bar = $("prog"), fill = bar.firstElementChild, list = $("files");
  out.hidden = false; bar.hidden = false; list.innerHTML = ""; urls.forEach(URL.revokeObjectURL); urls = [];
  out.scrollIntoView({ behavior: "smooth", block: "start" });
  const files = [], g = st.guests, fpush = (id, o) => files.push({ ...o, id }), P = (id) => st.pieces[id] && (!PIECES.find((p) => p.id === id).guests || g.length);
  const jobs = PIECES.filter((p) => P(p.id)).map((p) => p.id);
  const weight = (id) => (id === "gwa" || id === "ga5" ? Math.max(1, g.length / 6) : id === "place" ? Math.max(1, g.length / 30) : 1);
  const totalW = jobs.reduce((s, id) => s + weight(id), 0); let doneW = 0;
  const prog = (id, frac, label) => { fill.style.width = Math.round(((doneW + weight(id) * frac) / totalW) * 100) + "%"; msg.textContent = label; };
  const num = (i) => String(i + 1).padStart(2, "0");
    try {
    await fontsReady();
    for (const [ji, id] of jobs.entries()) {
      const p = PIECES.find((x) => x.id === id), pre = num(ji) + "-";
      prog(id, 0, "جارٍ تجهيز: " + tr(p.name));
      await tick();
      if (id === "story" || id === "thanks") { const cv = mk(1080, 1920); (id === "story" ? invite : thanks)(cv.getContext("2d"), 1080, 1920); fpush(id, { name: pre + (id === "story" ? "دعوة-ستوري" : "ستوري-شكر") + ".png", data: await blobOf(cv, "image/png") }); }
      else if (id === "post") { const cv = mk(1080, 1350); invite(cv.getContext("2d"), 1080, 1350); fpush(id, { name: pre + "دعوة-بوست.png", data: await blobOf(cv, "image/png") }); }
      else if (id === "a5" || id === "welcome") {
        const [w, h] = id === "a5" ? A5(300) : [Math.round(297 * 250 / 25.4), Math.round(420 * 250 / 25.4)];
        const cv = mk(w, h); (id === "a5" ? invite : welcome)(cv.getContext("2d"), w, h);
        const pdf = new Pdf(), im = pdf.image(await bytes(await blobOf(cv, "image/jpeg", .93)), w, h);
        const mm = id === "a5" ? [148, 210] : [297, 420];
        pdf.page(mm[0] * MM, mm[1] * MM, [{ img: im, x: 0, y: 0, w: mm[0] * MM, h: mm[1] * MM }]);
        fpush(id, { name: pre + (id === "a5" ? "بطاقة-دعوة-A5.pdf" : "لوحة-ترحيب-A3.pdf"), data: pdf.blob("Namq " + id) }); cv.width = 0;
      } else if (id === "gwa") {
        const cv = mk(1080, 1350), c = cv.getContext("2d"), r = invite(c, 1080, 1350, { slot: true });
        const baseImg = c.getImageData(0, 0, 1080, 1350);
        for (let i = 0; i < g.length; i++) {
          c.putImageData(baseImg, 0, 0); drawGuest(c, r, g[i]);
          fpush(id, { name: pre + "دعوات-واتساب/" + String(i + 1).padStart(3, "0") + "-" + safe(g[i]) + ".jpg", data: await blobOf(cv, "image/jpeg", .9) });
          if (i % 5 === 4) { prog(id, i / g.length, "دعوات الواتساب: " + (i + 1) + " / " + g.length); await tick(); }
        }
      } else if (id === "ga5") {
        const [w, h] = A5(300), cv = mk(w, h), c = cv.getContext("2d"), r = invite(c, w, h, { slot: true });
        const pdf = new Pdf(), bi = pdf.image(await bytes(await blobOf(cv, "image/jpeg", .93)), w, h), s = 148 * MM / w;
        const pc = mk(r.w, r.h), pcx = pc.getContext("2d");
        for (let i = 0; i < g.length; i++) {
          pcx.setTransform(1, 0, 0, 1, 0, 0); pcx.drawImage(cv, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
          pcx.translate(-r.x, -r.y); drawGuest(pcx, r, g[i]);
          const pi = pdf.image(await bytes(await blobOf(pc, "image/jpeg", .93)), r.w, r.h);
          pdf.page(148 * MM, 210 * MM, [{ img: bi, x: 0, y: 0, w: 148 * MM, h: 210 * MM }, { img: pi, x: r.x * s, y: r.y * s, w: r.w * s, h: r.h * s }]);
          if (i % 5 === 4) { prog(id, i / g.length, "دعوات الطباعة: " + (i + 1) + " / " + g.length); await tick(); }
        }
        fpush(id, { name: pre + "دعوات-بالأسماء-A5.pdf", data: pdf.blob("Namq invitations") }); cv.width = 0;
      } else if (id === "place") {
        const cv = mk(10, 10), c = cv.getContext("2d"), slots = placeSheet(c, 300), W = cv.width, s = 210 * MM / W;
        const pdf = new Pdf(), bi = pdf.image(await bytes(await blobOf(cv, "image/jpeg", .92)), cv.width, cv.height);
        for (let pg = 0; pg * 10 < g.length; pg++) {
          const items = [{ img: bi, x: 0, y: 0, w: 210 * MM, h: 297 * MM }];
          for (let j = 0; j < 10 && pg * 10 + j < g.length; j++) {
            const r0 = slots[j], r = { x: Math.floor(r0.x), y: Math.floor(r0.y), w: Math.ceil(r0.w), h: Math.ceil(r0.h) };
            const pc = mk(r.w, r.h), x = pc.getContext("2d"); x.drawImage(cv, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h); x.translate(-r.x, -r.y); placeName(x, r, g[pg * 10 + j]);
            items.push({ img: pdf.image(await bytes(await blobOf(pc, "image/jpeg", .92)), r.w, r.h), x: r.x * s, y: r.y * s, w: r.w * s, h: r.h * s });
          }
          pdf.page(210 * MM, 297 * MM, items); prog(id, (pg * 10) / g.length, "بطاقات الأماكن: " + Math.min(g.length, pg * 10 + 10) + " / " + g.length); await tick();
        }
        fpush(id, { name: pre + "بطاقات-الأماكن-A4.pdf", data: pdf.blob("Namq place cards") }); cv.width = 0;
      } else if (id === "tables") {
        const pdf = new Pdf(), cv = mk(10, 10), c = cv.getContext("2d");
        for (let a = 1; a <= st.tables; a += 4) {
          tableSheet(c, 300, a, Math.min(st.tables, a + 3));
          const im = pdf.image(await bytes(await blobOf(cv, "image/jpeg", .9)), cv.width, cv.height);
          pdf.page(210 * MM, 297 * MM, [{ img: im, x: 0, y: 0, w: 210 * MM, h: 297 * MM }]); prog(id, a / st.tables, "أرقام الطاولات"); await tick();
        }
        fpush(id, { name: pre + "أرقام-الطاولات-A4.pdf", data: pdf.blob("Namq tables") }); cv.width = 0;
      } else if (id === "stickers") {
        const pdf = new Pdf(), cv = mk(10, 10), c = cv.getContext("2d"), pages = Math.ceil(st.stickers / 15);
        stickerSheet(c, 300, 15); const full = pdf.image(await bytes(await blobOf(cv, "image/jpeg", .92)), cv.width, cv.height);
        const rest = st.stickers % 15; let last = full;
        if (rest) { stickerSheet(c, 300, rest); last = pdf.image(await bytes(await blobOf(cv, "image/jpeg", .92)), cv.width, cv.height); }
        for (let i = 0; i < pages; i++) pdf.page(210 * MM, 297 * MM, [{ img: i === pages - 1 ? last : full, x: 0, y: 0, w: 210 * MM, h: 297 * MM }]);
        fpush(id, { name: pre + "ملصقات-التوزيعات-A4.pdf", data: pdf.blob("Namq stickers") }); cv.width = 0;
      }
      doneW += weight(id); prog(id, 0, "");
    }
    files.push({ name: "اقرأني.txt", data: readme(jobs) });
    msg.textContent = "جارٍ ضغط الملفات…"; await tick();
    const zip = await makeZip(files.map((f) => ({ name: f.name, data: f.data })));
    const zname = "namq-" + st.occ + (st.d.date ? "-" + st.d.date : "") + ".zip";
    const zu = URL.createObjectURL(zip); urls.push(zu);
    fill.style.width = "100%";
    msg.textContent = `جاهزة: ${files.length} ملفات (${(zip.size / 1048576).toFixed(1)} م.ب). إذا لم يبدأ التنزيل، اضغط «تنزيل الكل» أو نزّل كل ملف وحده.`;
    const li = (name, url, size, dl) => `<li><span>${name}<small class="note"> · ${size}</small></span><a href="${url}" download="${dl}">تنزيل</a></li>`;
    const kb = (b) => (b.size > 1048576 ? (b.size / 1048576).toFixed(1) + " م.ب" : Math.max(1, Math.round(b.size / 1024)) + " ك.ب");
    const groups = new Map();
    for (const f of files) { const folder = f.name.includes("/") ? f.name.split("/")[0] : null; if (folder) { if (!groups.has(folder)) groups.set(folder, []); groups.get(folder).push(f); } }
    let html = `<li><b>تنزيل الكل (ZIP)</b><a href="${zu}" download="${zname}">تنزيل</a></li>`;
    for (const f of files) {
      if (f.name.includes("/") || f.name === "اقرأني.txt") continue;
      const blob = f.data instanceof Blob ? f.data : new Blob([f.data]); const u = URL.createObjectURL(blob); urls.push(u); html += li(f.name, u, kb(blob), "namq-" + st.occ + "-" + f.id + "." + f.name.split(".").pop());
    }
    for (const [folder, fs] of groups) html += `<li><span>${folder}<small class="note"> · ${fs.length} صورة — داخل ملف ZIP</small></span></li>`;
    list.innerHTML = html;
    const a = document.createElement("a"); a.href = zu; a.download = zname; document.body.appendChild(a); a.click(); a.remove();
  } catch (err) {
    msg.textContent = "تعذّر التجهيز: " + (err && err.message ? err.message : err) + " — جرّب عددًا أقل من المعازيم أو متصفحًا آخر.";
  } finally { busy = false; bar.hidden = true; updateGo(); }
};
function readme(jobs) {
  const L = ["نمق — مجموعة " + OCC[st.occ].label + ": " + namesText(st.d), "",
    "نصائح الطباعة:",
    "- اطبع ملفات PDF بمقاس 100% (Actual size) بدون «ملاءمة الصفحة».",
    "- بطاقة الدعوة A5 ولوحة الترحيب A3 بدقة طباعة عالية؛ يفضَّل ورق مقوّى غير لامع.",
    "- بطاقات الأماكن 9×5 سم: اقطع على العلامات الرمادية في الأطراف.",
    "- أرقام الطاولات: ٤ بطاقات A6 في كل صفحة؛ اقطع الصفحة نصفين طولًا وعرضًا.",
    "- ملصقات التوزيعات دوائر قطرها ٥ سم: اطبعها على ورق لاصق A4.",
    "- لا يوجد هامش قص إضافي (bleed)؛ إن طلبته المطبعة أخبرنا.",
    "", "الملفات: " + jobs.length + " تصاميم.", "صُمم في نمق — نسخة تجريبية."];
  return "﻿" + L.join("\r\n");
}

/* ---------- البداية ---------- */
ui();
fontsReady().then(() => { thumbs(); renderPreview(); });
window.NAMQKIT = { get state() { return st; }, set(s) { st = { ...st, ...s }; ui(); }, invite, OCC, THEMES };
