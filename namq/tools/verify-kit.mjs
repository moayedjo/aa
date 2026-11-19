// يتحقق من «تنسيق حفلات» + الواجهة الإنجليزية للمحرّر والاشتراك + «متوفر بمقاسات أخرى»
// الاستخدام: node verify-kit.mjs [local|live]
import { chromium, devices } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const mode = process.argv[2] || "local";
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, "../live"), OUT = path.resolve(ROOT, "../test-output");
let base = "https://headless-ibjkosqmrcj-adlimoayed710-140d.wix-site-host.com", srv;
if (mode === "local") {
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".mp4": "video/mp4" };
  srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split("?")[0]); if (p === "/") p = "/index.html";
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
  }).listen(8792);
  base = "http://localhost:8792";
}
const res = []; const ok = (n, c, d = "") => { res.push({ n, ok: !!c, d }); console.log((c ? "✓ " : "✗ ") + n + (d ? " — " + d : "")); };
const b = await chromium.launch();
const errs = [];
const watch = (pg, tag) => pg.on("pageerror", (e) => errs.push(tag + ": " + e.message));
try {
  const ctx = await b.newContext({ ...devices["iPhone 13"], acceptDownloads: true });
  const pg = await ctx.newPage(); watch(pg, "kit");
  await pg.goto(base + "/kit.html?o=wedding", { waitUntil: "load" });
  await pg.evaluate(() => localStorage.removeItem("namq-kit-v1"));
  await pg.goto(base + "/kit.html?o=wedding", { waitUntil: "load" });
  await pg.waitForFunction(() => window.NAMQKIT && document.fonts.status === "loaded");
  await pg.waitForTimeout(700);
  ok("أربع مناسبات ظاهرة", (await pg.locator(".occ").count()) === 4);
  ok("ثلاثة طوابع للعرس", (await pg.locator(".theme").count()) === 3);
  await pg.screenshot({ path: path.join(OUT, "kit-" + mode + "-top.png") });
  // رفع ملف Excel
  await pg.setInputFiles("#gfile", path.join(HERE, "guests-sample.xlsx"));
  await pg.waitForFunction(() => window.NAMQKIT.state.guests.length > 0);
  const gs = await pg.evaluate(() => window.NAMQKIT.state.guests);
  ok("قراءة Excel: ٢٣ اسمًا مع اللقب", gs.length === 23 && gs[0] === "الأستاذ محمد أحمد" && gs[2] === "عائلة الخطيب", gs.slice(0, 3).join(" | "));
  // كل تبويبات المعاينة تُرسم بلا أخطاء
  for (const k of ["story", "post", "a5", "guest", "welcome", "place", "tables", "stickers", "thanks"]) {
    await pg.click(`[data-pv="${k}"]`); await pg.waitForTimeout(250);
    const blank = await pg.evaluate(() => { const c = document.getElementById("pv"); const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let s = new Set(); for (let i = 0; i < d.length; i += 4000) s.add(d[i] + "," + d[i + 1]); return s.size; });
    ok("معاينة " + k, blank > 5, blank + " لون");
    if (k === "guest" || k === "place") await pg.locator(".pv").screenshot({ path: path.join(OUT, "kit-" + mode + "-pv-" + k + ".png") });
  }
  // تبديل المناسبة والطابع
  await pg.click('[data-occ="birthday"]'); await pg.waitForTimeout(400);
  ok("عيد الميلاد: الطابع الملوّن افتراضيًا والأسماء محفوظة", await pg.evaluate(() => window.NAMQKIT.state.theme === "party" && window.NAMQKIT.state.guests.length === 23));
  await pg.click('[data-pv="story"]'); await pg.waitForTimeout(300);
  await pg.locator(".pv").screenshot({ path: path.join(OUT, "kit-" + mode + "-pv-birthday.png") });
  await pg.click('[data-occ="wedding"]'); await pg.waitForTimeout(300);
  await pg.click('[data-theme="navy"]'); await pg.waitForTimeout(300);
  // تجهيز المجموعة
  const dl = pg.waitForEvent("download", { timeout: 180000 });
  await pg.click("#build");
  const d = await dl;
  const zp = path.join(OUT, "kit-" + mode + ".zip"); await d.saveAs(zp);
  const size = fs.statSync(zp).size;
  ok("تنزيل ZIP", size > 100000, (size / 1048576).toFixed(1) + " MB · " + d.suggestedFilename());
  await pg.waitForFunction(() => document.querySelectorAll("#files li").length > 3);
  ok("قائمة الملفات للتنزيل المنفرد", (await pg.locator("#files li").count()) >= 9, (await pg.locator("#files li").count()) + " عنصر");
  await pg.screenshot({ path: path.join(OUT, "kit-" + mode + "-done.png"), fullPage: false });
  // الإنجليزية
  await pg.evaluate(() => localStorage.setItem("namq-lang", "en"));
  await pg.reload({ waitUntil: "load" }); await pg.waitForTimeout(800);
  const en = await pg.evaluate(() => ({ dir: document.documentElement.dir, h1: document.querySelector("h1").textContent, btn: document.getElementById("build").textContent, occ: document.querySelector(".occ b").textContent, title: document.title, field: document.querySelector("#fields label").childNodes[0].textContent.trim() }));
  ok("كِت بالإنجليزية", en.dir === "ltr" && en.h1 === "Event kits" && en.btn === "Build & download the set" && en.occ === "Wedding" && en.title === "Event kits — Namq", JSON.stringify(en));
  const arLeft = await pg.evaluate(() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (n.parentElement.closest("[data-notr],script,style,textarea,select#font option[value='Aref Ruqaa']")) continue; if (/[؀-ۿ]/.test(n.data) && n.parentElement.offsetParent !== null) out.push(n.data.trim()); } return out; });
  ok("لا نصوص عربية متبقية في واجهة الكِت (عدا المحتوى)", arLeft.filter((x) => !/^(Aref|Amiri|Reem|Tajawal)/.test(x)).length <= 1, arLeft.slice(0, 8).join(" | "));
  await pg.screenshot({ path: path.join(OUT, "kit-" + mode + "-en.png") });
  // المحرّر بالإنجليزية + مقاسات أخرى
  const ep = await ctx.newPage(); watch(ep, "editor");
  await ep.goto(base + "/editor.html?mode=static&p=" + encodeURIComponent("عرض-خاص-ستوري-1080-1920-تجريبي"), { waitUntil: "load" });
  await ep.evaluate(() => window.NAMQ.ready); await ep.waitForTimeout(2500);
  const ee = await ep.evaluate(() => ({ dir: document.documentElement.dir, exp: document.getElementById("goExport").textContent, prod: (document.querySelector("#prod span") || {}).textContent, lang: document.querySelector("[data-lang-toggle]").textContent, label: (document.querySelector("#fields label.t") || {}).textContent, sizes: (document.querySelector(".sizes") || {}).textContent || "" }));
  ok("المحرّر بالإنجليزية", ee.dir === "ltr" && ee.exp === "Export" && /Static/.test(ee.prod || "") && ee.lang === "العربية", JSON.stringify(ee));
  ok("المحرّر: «متوفر بمقاسات أخرى»", /Also available in/.test(ee.sizes) && /1080×1350/.test(ee.sizes), ee.sizes);
  await ep.screenshot({ path: path.join(OUT, "editor-" + mode + "-en.png") });
  // الاشتراك بالإنجليزية
  const pp = await ctx.newPage(); watch(pp, "plans");
  await pp.goto(base + "/plans.html", { waitUntil: "load" });
  await pp.waitForSelector(".plan", { timeout: 20000 }).catch(() => {});
  const pe = await pp.evaluate(() => document.querySelector("main").innerText);
  ok("الاشتراك بالإنجليزية", /Subscription/.test(pe) && /AED 599/.test(pe) && /per year/.test(pe) && /Yearly plan/.test(pe) && !/[؀-ۿ]/.test(pe), pe.replace(/\s+/g, " ").slice(0, 160));
  await pp.screenshot({ path: path.join(OUT, "plans-" + mode + "-en.png") });
  // العودة للعربية
  await pp.click("[data-lang-toggle]"); await pp.waitForLoadState("load"); await pp.waitForTimeout(400);
  ok("زر اللغة يعيد العربية", await pp.evaluate(() => document.documentElement.dir === "rtl" && localStorage.getItem("namq-lang") === "ar"));
  // المتجر: لافتة تنسيق حفلات
  const hp = await ctx.newPage(); watch(hp, "home");
  await hp.goto(base + "/index.html", { waitUntil: "load" }); await hp.waitForTimeout(1500);
  ok("لافتة «تنسيق حفلات» في الرئيسية", await hp.locator("#kitbanner").isVisible() && (await hp.locator(".kitocc a").count()) === 4);
  ok("رقاقة «تنسيق حفلات» في شريط الأقسام", (await hp.locator(".chip.kitchip").count()) === 1);
  await hp.screenshot({ path: path.join(OUT, "home-" + mode + "-kit.png") });
  ok("لا أخطاء جافاسكربت", errs.length === 0, errs.join(" | "));
} finally { await b.close(); srv && srv.close(); }
fs.writeFileSync(path.join(OUT, "verify-kit-" + mode + ".json"), JSON.stringify(res, null, 1));
console.log(res.filter((r) => r.ok).length + "/" + res.length);
