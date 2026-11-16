// اختبار نسخة الموقع من المحرّر (namq/site) عبر خادم محلي، بمحاكاة iPhone 13.
// التشغيل: node namq/tools/verify-site.mjs
import { chromium, devices } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(here, "../site");
const out = path.resolve(here, "../test-output");
const photo = path.resolve(here, "demo-photo-tajribi.jpg");
const fonts = fs.readFileSync(path.resolve(here, "fonts-embedded.css"), "utf8");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".mp4": "video/mp4" };
// بديل محلي لوحدة المتجر (على الموقع الحقيقي تأتي من Wix)
const mockCatalog = 'export async function fetchProductBySlug(s){return {name:"منتج اختبار — "+s.split("-")[0],price:"24.00 AED"}}';
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (u === "/js/wix/catalog.js") { res.writeHead(200, { "content-type": types[".js"] }); return res.end(mockCatalog); }
  const f = u === "/demo-bg.mp4" ? path.join(out, "demo-bg-tajribi.mp4") : path.join(site, u);
  if (!f.startsWith(site) && u !== "/demo-bg.mp4") { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});
await new Promise((r) => server.listen(0, r));
const base = "http://localhost:" + server.address().port;
const log = [];
const ok = (name, pass, detail = "") => { log.push({ name, pass: !!pass, detail }); console.log((pass ? "PASS " : "FAIL ") + name + (detail ? " — " + detail : "")); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"], acceptDownloads: true });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await ctx.addInitScript((css) => { addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }); }, fonts);
const errors = [];
const open = async (q) => { const p = await ctx.newPage(); p.on("pageerror", (e) => errors.push(String(e))); await p.goto(base + "/editor.html" + q); await p.evaluate(() => window.NAMQ.ready); await p.waitForTimeout(300); return p; };
const tools = (page) => {
  const at = async (x, y) => { const b = await page.locator("#pv").boundingBox(); return { x: b.x + (x / 1080) * b.width, y: b.y + (y / 1920) * b.height }; };
  return {
    drag: async (x1, y1, x2, y2) => { await page.evaluate(() => scrollTo(0, 0)); const a = await at(x1, y1), b = await at(x2, y2); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 }); await page.mouse.move(b.x, b.y, { steps: 4 }); await page.mouse.up(); },
    st: (id) => page.evaluate((id) => { const e = window.NAMQ.state.elements.find((x) => x.id === id); return e && JSON.parse(JSON.stringify(e)); }, id),
    dl: async (sel, name) => { const [d] = await Promise.all([page.waitForEvent("download"), page.click(sel)]); const p = path.join(out, name); await d.saveAs(p); return p; },
  };
};

// 1) بلا منتج: التبديل ثابت/متحرك ما زال يعمل، وتعديل النص والتصدير
{
  const page = await open(""); const t = tools(page);
  ok("بلا منتج: شريط المنتج مخفي ومفتاح النوع ظاهر", (await page.locator("#prod").isHidden()) && (await page.locator("#seg").isVisible()));
  await page.fill("#f-title", "عقد قران");
  ok("تعديل النص", (await t.st("title")).text === "عقد قران");
  const b = await t.st("details"); await t.drag(540, 1500, 700, 1640); const a = await t.st("details");
  ok("سحب النص", Math.abs(a.x - b.x) > 100 && Math.abs(a.y - b.y) > 100);
  await page.click("#mVideo"); await page.waitForFunction(() => window.NAMQ.state.kind === "video");
  ok("التبديل إلى المتحرك", (await t.st("title")).text === "عيدكم مبارك");
  await page.close();
}

// 2) منتج الخطوبة: رمز العروسين
{
  const page = await open("?mode=static&p=" + encodeURIComponent("دعوة-خطوبة-ستوري-1080-1920-تجريبي")); const t = tools(page);
  await page.waitForFunction(() => !document.getElementById("prod").hidden);
  const bar = await page.locator("#prod").innerText();
  ok("شريط المنتج: الاسم والسعر والنوع والمقاس", bar.includes("24.00 AED") && bar.includes("ثابت") && bar.includes("1080×1920"), bar.replace(/\n/g, " | "));
  ok("مفتاح النوع مخفي عند فتح منتج", await page.locator("#seg").isHidden());
  let m = await t.st("mono");
  ok("رمز العروسين موجود بتكوين ابتدائي", m && m.a === "س" && m.b === "أ");
  ok("الصورة الاختيارية مخفية مبدئيًا في هذا القالب", (await t.st("photo")).hidden === true);
  await page.selectOption('select[data-k="a"]', "خ"); await page.selectOption('select[data-k="b"]', "ل");
  await page.click('[data-act="font"][data-id="mono"][data-v="Reem Kufi"]');
  await page.click('[data-act="color"][data-id="mono"][data-v="#D94F70"]');
  await page.locator('[data-act="mnum"][data-k="size"]').fill("380");
  await page.locator('[data-act="mnum"][data-k="gap"]').fill("10");
  await page.locator('[data-act="mnum"][data-k="rise"]').fill("-30");
  m = await t.st("mono");
  ok("اختيار الحرفين", m.a === "خ" && m.b === "ل");
  ok("خط ولون وحجم الرمز", m.font === "Reem Kufi" && m.color === "#D94F70" && m.size === 380);
  ok("التقارب والارتفاع", m.gap === 10 && m.rise === -30);
  await t.drag(540, 640, 400, 500); m = await t.st("mono");
  ok("تحريك الرمز كاملًا بالسحب", Math.abs(m.x - 400) < 12 && Math.abs(m.y - 500) < 12, `(${Math.round(m.x)},${Math.round(m.y)})`);
  await page.screenshot({ path: path.join(out, "screen-mono.png") });
  await t.dl("#xPng", "mono-export.png");
  await page.click('[data-act="reset"][data-id="mono"]'); m = await t.st("mono");
  ok("استعادة الوضع الأصلي تحفظ الحرفين", m.x === 540 && m.gap === 22 && m.size === 300 && m.a === "خ");
  await page.fill("#f-names", "خلود  و  لؤي"); await page.waitForTimeout(100);
  await page.reload(); await page.evaluate(() => window.NAMQ.ready);
  ok("المسودة محفوظة لكل منتج بعد إعادة التحميل", (await t.st("names")).text === "خلود  و  لؤي" && (await t.st("mono")).a === "خ");
  await page.close();
}

// 3) منتج العرض: الشعار + صورة ثانية + تحريك/تحجيم الإطار
{
  const page = await open("?mode=static&p=" + encodeURIComponent("عرض-خاص-ستوري-1080-1920-تجريبي")); const t = tools(page);
  ok("نصوص القالب حسب المنتج", (await t.st("title")).text === "عرض خاص");
  await page.setInputFiles('input[data-act="file"][data-id="logo"]', photo);
  await page.waitForSelector('[data-act="rmimg"][data-id="logo"]');
  await page.setInputFiles('input[data-act="file"][data-id="photo"]', photo);
  await page.waitForSelector('[data-act="rmimg"][data-id="photo"]');
  ok("رفع صورتين في نفس القالب (شعار + صورة)", await page.evaluate(() => document.querySelectorAll('[data-act="rmimg"]').length === 2));
  await page.locator('[data-act="fsize"][data-id="logo"]').fill("140");
  let l = await t.st("logo");
  ok("تحجيم الشعار مع الحفاظ على النسبة", Math.abs(l.frame.w - 420) < 1 && Math.abs(l.frame.h - 224) < 1 && Math.abs(l.frame.w / l.frame.h - 300 / 160) < 0.01, `${Math.round(l.frame.w)}×${Math.round(l.frame.h)}`);
  await t.drag(540, 1740, 300, 1650); l = await t.st("logo");
  ok("تحريك الشعار بالسحب", Math.abs(l.frame.x - 300) < 12 && Math.abs(l.frame.y - 1650) < 12);
  await t.drag(540, 640, 600, 640); let p = await t.st("photo");
  ok("السحب الافتراضي يحرّك الصورة داخل الإطار", p.frame.x === 540 && Math.abs(p.ox) > 10);
  await page.click('[data-act="fmode"][data-id="photo"][data-v="1"]');
  await t.drag(540, 640, 700, 760); p = await t.st("photo");
  ok("وضع «الإطار نفسه» يحرّك الإطار", Math.abs(p.frame.x - 700) < 12 && Math.abs(p.frame.y - 760) < 12);
  await page.locator('[data-act="fsize"][data-id="photo"]').fill("70"); p = await t.st("photo");
  ok("تغيير حجم الإطار", Math.abs(p.frame.w - 266) < 1);
  await page.click('[data-act="reset"][data-id="photo"]'); p = await t.st("photo");
  ok("إرجاع مكان وحجم الإطار", p.frame.x === 540 && p.frame.w === 380);
  await page.screenshot({ path: path.join(out, "screen-logo.png") });
  const f = await t.dl("#xPng", "logo-export.png");
  ok("تصدير PNG مع الشعار", fs.statSync(f).size > 50000);
  await page.close();
}

ok("لا أخطاء JavaScript", errors.length === 0, errors.join(" | "));
await browser.close(); server.close();
fs.writeFileSync(path.join(out, "results-site.json"), JSON.stringify(log, null, 2));
process.exit(log.every((x) => x.pass) ? 0 : 1);
