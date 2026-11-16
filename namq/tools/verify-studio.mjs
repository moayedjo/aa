// اختبار أداة إعداد القوالب (studio) مع المحرّر: node namq/tools/verify-studio.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(here, "../site"), out = path.resolve(here, "../test-output");
const photo = path.resolve(here, "demo-photo-tajribi.jpg"), video = path.join(out, "demo-bg-tajribi.mp4");
const fonts = fs.readFileSync(path.resolve(here, "fonts-embedded.css"), "utf8");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mp4": "video/mp4" };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const f = u === "/demo-bg.mp4" ? video : path.join(site, u);
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});
await new Promise((r) => server.listen(0, r));
const base = "http://localhost:" + server.address().port;
const log = [];
const ok = (n, p, d = "") => { log.push({ name: n, pass: !!p, detail: d }); console.log((p ? "PASS " : "FAIL ") + n + (d ? " — " + d : "")); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await ctx.addInitScript((css) => { addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }); }, fonts);
const errors = [];
const page = await ctx.newPage(); page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(base + "/studio.html");
const cur = () => page.evaluate(() => JSON.parse(localStorage.getItem("namq-tpls"))[0]);
const frame = async () => { await page.waitForTimeout(900); const f = page.frame({ url: /editor\.html/ }); await f.waitForFunction(() => window.NAMQ); await f.evaluate(() => window.NAMQ.ready); return f; };

await page.click("#new");
ok("إنشاء قالب جديد", (await cur()).w === 1080);
await page.setInputFiles("#bg", photo);
await page.waitForFunction(() => document.getElementById("bgInfo").textContent.includes("1600×1000"));
let t = await cur();
ok("رفع خلفية صورة يضبط المقاس النهائي", t.w === 1600 && t.h === 1000 && t.kind === "static", `${t.w}×${t.h}`);
await page.fill("#t-name", "قالب اختبار الإدارة");
await page.click('[data-add="text"]');
await page.fill('textarea[data-p="text"]', "أهلًا بكم في نمق");
await page.selectOption('select[data-p="font"]', "Aref Ruqaa");
await page.click('[data-add="image"]');
await page.click('[data-add="mono"]');
await page.click('[data-el="1"] summary'); await page.locator('[data-el="1"] input[data-p="required"]').check();
t = await cur();
ok("إضافة نص وصورة ورمز وحفظها", t.elements.length === 3 && t.elements[0].text === "أهلًا بكم في نمق" && t.elements[0].font === "Aref Ruqaa");
ok("تحديد عنصر كإجباري", t.elements[1].required === true);
// خط مرفوع
const sys = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"].find((p) => fs.existsSync(p));
if (sys) { await page.setInputFiles("#font", sys); await page.waitForFunction(() => JSON.parse(localStorage.getItem("namq-tpls"))[0].customFonts.length === 1); t = await cur(); ok("رفع خط وإضافته لمكتبة القالب", t.fonts.includes(t.customFonts[0]), t.customFonts[0]); }
else ok("رفع خط (لا يوجد ملف خط في بيئة الاختبار)", true, "لم يُختبر");

let f = await frame();
const info = await f.evaluate(() => ({ n: window.NAMQ.state.elements.length, ids: window.NAMQ.state.elements.map((e) => e.type), ar: document.querySelector(".stage .wrap").style.aspectRatio, seg: document.getElementById("seg").hidden, fits: document.getElementById("pv").getBoundingClientRect().left >= 0 && document.getElementById("pv").getBoundingClientRect().right <= innerWidth + 1 }));
ok("المعاينة تعرض القالب المخصص بعناصره", info.n === 3 && info.ids.join() === "text,image,mono" && info.ar.replace(/\s/g, "") === "1600/1000" && info.seg && info.fits, JSON.stringify(info));
// السحب في المعاينة يحدّث تعريف القالب
const cv = f.locator("#pv"); await cv.scrollIntoViewIfNeeded(); const b = await cv.boundingBox();
const pt = (x, y) => ({ x: b.x + (x / 1600) * b.width, y: b.y + (y / 1000) * b.height });
const a = pt(300, 500), z = pt(200, 800);
await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move((a.x + z.x) / 2, (a.y + z.y) / 2, { steps: 4 }); await page.mouse.move(z.x, z.y, { steps: 4 }); await page.mouse.up();
await page.waitForTimeout(300); t = await cur();
ok("سحب النص في المعاينة يحفظ موضعه في القالب", Math.abs(t.elements[0].x - 700) < 25 && Math.abs(t.elements[0].y - 800) < 25, `(${t.elements[0].x},${t.elements[0].y})`);
await page.screenshot({ path: path.join(out, "screen-studio.png") });

// معاينة كعميل + تصدير بالمقاس النهائي
const client = await ctx.newPage(); client.on("pageerror", (e) => errors.push(String(e)));
await client.goto(base + "/editor.html?tpl=" + t.id); await client.evaluate(() => window.NAMQ.ready); await client.waitForTimeout(300);
ok("العميل يرى الخطوط المحددة للقالب", await client.evaluate((n) => { document.querySelector('[data-act="fmt"]').click(); return document.querySelectorAll('[data-act="font"][data-id]').length >= n; }, t.fonts.length));
const [d] = await Promise.all([client.waitForEvent("download"), client.click("#xPng")]);
const png = path.join(out, "studio-export.png"); await d.saveAs(png);
const buf = fs.readFileSync(png); const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
ok("تصدير PNG بمقاس الخلفية المرفوعة", w === 1600 && h === 1000, `${w}×${h}`);
await client.close();

// نسخ + قالب فيديو
await page.click("#dup"); await page.waitForFunction(() => JSON.parse(localStorage.getItem("namq-tpls")).length === 2);
ok("نسخ القالب مع خلفيته", await page.evaluate(() => JSON.parse(localStorage.getItem("namq-tpls")).length === 2));
await page.click("#new"); await page.setInputFiles("#bg", video);
await page.waitForFunction(() => document.getElementById("bgInfo").textContent.includes("فيديو"));
const v = await page.evaluate(() => JSON.parse(localStorage.getItem("namq-tpls"))[2]);
ok("رفع فيديو: النوع والمدة والمقاس تُقرأ تلقائيًا", v.kind === "video" && Math.abs(v.duration - 4) < 0.1 && v.w === 540 && v.h === 960, `${v.w}×${v.h} · ${v.duration}ث · مشهد ${v.refT}`);
await page.click('[data-add="text"]');
ok("حقول التوقيت تظهر لنص القالب المتحرك", await page.locator('input[data-p="in"]').count() === 1 && await page.locator("#refWrap").isVisible());
f = await frame();
ok("معاينة قالب الفيديو تعمل", await f.evaluate(() => window.NAMQ.state.kind === "video" && document.getElementById("vid").readyState >= 2));
// المحرّر العادي لم يتأثر
const plain = await ctx.newPage(); plain.on("pageerror", (e) => errors.push(String(e)));
await plain.goto(base + "/editor.html"); await plain.evaluate(() => window.NAMQ.ready);
ok("المحرّر العادي (بلا قالب مخصص) ما زال يعمل", await plain.evaluate(() => window.NAMQ.state.elements.length === 5));
ok("لا أخطاء JavaScript", errors.length === 0, errors.join(" | "));
await browser.close(); server.close();
fs.writeFileSync(path.join(out, "results-studio.json"), JSON.stringify(log, null, 2));
process.exit(log.every((x) => x.pass) ? 0 : 1);
