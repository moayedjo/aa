// اختبار آلي لنموذج المحرّر: يتفاعل مع الواجهة كعميل على تلفون ثم يصدّر PNG / PDF / MP4.
// التشغيل: node namq/tools/verify-prototype.mjs
import { chromium, devices } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const page_url = "file://" + path.resolve(here, "../prototype/editor-standalone.html");
const out = path.resolve(here, "../test-output");
const photo = path.resolve(here, "demo-photo-tajribi.jpg");
fs.mkdirSync(out, { recursive: true });
const log = [];
const ok = (name, pass, detail = "") => { log.push({ name, pass: !!pass, detail }); console.log((pass ? "PASS " : "FAIL ") + name + (detail ? " — " + detail : "")); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"], acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(page_url);
await page.evaluate(() => window.NAMQ.ready);

// نقطة على الكانفس بإحداثيات القالب (1080×1920)
const at = async (x, y) => { const b = await page.locator("#pv").boundingBox(); return { x: b.x + (x / 1080) * b.width, y: b.y + (y / 1920) * b.height }; };
const drag = async (x1, y1, x2, y2) => { const a = await at(x1, y1), b = await at(x2, y2); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 }); await page.mouse.move(b.x, b.y, { steps: 4 }); await page.mouse.up(); };
const st = (id) => page.evaluate((id) => { const e = window.NAMQ.state.elements.find((x) => x.id === id); return e && JSON.parse(JSON.stringify(e)); }, id);

// 1) تعديل النص
await page.fill("#f-title", "عقد قران");
await page.fill("#f-names", "ليلى  و  خالد");
ok("تعديل النص", (await st("title")).text === "عقد قران" && (await st("names")).text === "ليلى  و  خالد");

// 2) الخط واللون والحجم والمحاذاة من «تنسيق النص»
await page.click('[data-act="fmt"][data-id="names"]');
await page.click('[data-act="font"][data-id="names"][data-v="Reem Kufi"]');
await page.click('[data-act="color"][data-id="names"][data-v="#1F5A5A"]');
await page.locator('[data-act="size"][data-id="names"]').fill("80");
let n = await st("names");
ok("تغيير الخط", n.font === "Reem Kufi");
ok("تغيير اللون", n.color === "#1F5A5A");
ok("تغيير الحجم", n.size === 80);
ok("الخط محمّل فعليًا في المتصفح", await page.evaluate(() => document.fonts.check('80px "Reem Kufi"', "ليلى")));

// 3) تحريك النص بالسحب + خط التوسيط
const before = await st("details");
await drag(540, 1500, 700, 1640);
const after = await st("details");
ok("تحريك النص بالسحب", Math.abs(after.x - before.x) > 100 && Math.abs(after.y - before.y) > 100, `(${before.x},${before.y}) → (${Math.round(after.x)},${Math.round(after.y)})`);
await drag(Math.round(after.x), Math.round(after.y), 546, 1600);
ok("الالتقاط على خط المنتصف", (await st("details")).x === 540);

// 4) تراجع + إرجاع التنسيق الأصلي
await page.click("#undo");
ok("تراجع", Math.abs((await st("details")).x - after.x) < 1);
await page.click('[data-act="fmt"][data-id="details"]');
await page.click('[data-act="reset"][data-id="details"]');
const r = await st("details");
ok("إرجاع التنسيق الأصلي", r.x === r.base.x && r.y === r.base.y && r.size === r.base.size);

// 5) إضافة نص ثم حذفه + إخفاء عنصر اختياري
await page.click("#addText");
ok("إضافة نص جديد", !!(await st("added1")));
await page.fill("#f-added1", "بحضوركم تكتمل فرحتنا");
await page.click('[data-act="hide"][data-id="kicker"]');
ok("إخفاء عنصر اختياري", (await st("kicker")).hidden === true);
await page.click('[data-act="hide"][data-id="kicker"]');

// 6) نص طويل: تنبيه بدل القص الصامت + منع التصدير
await page.fill("#f-title", "هذا عنوان طويل جدًا جدًا لا يمكن أن تتسع له المساحة المحددة مهما صغّرنا الخط وسنضيف كلمات أكثر وأكثر وأكثر حتى يتجاوز الحد المسموح به تمامًا ثم نضيف المزيد من الكلمات الطويلة");
await page.waitForTimeout(100);
ok("تنبيه النص الطويل ظاهر", await page.locator('[data-warn="title"]').evaluate((e) => e.classList.contains("on")));
ok("التصدير ممنوع مع نص زائد", (await page.evaluate(() => window.NAMQ.validate())).length > 0);
await page.fill("#f-title", "عقد قران");
await page.waitForTimeout(100);
ok("التنبيه يختفي بعد الاختصار", !(await page.locator('[data-warn="title"]').evaluate((e) => e.classList.contains("on"))));

// 7) رفع صورة وضبط القص
await page.setInputFiles('input[data-act="file"][data-id="photo"]', photo);
await page.waitForSelector('[data-act="zoom"][data-id="photo"]');
await page.locator('[data-act="zoom"][data-id="photo"]').fill("180");
await drag(540, 640, 640, 600);
const ph = await st("photo");
ok("رفع صورة + تكبير + تحريك داخل الإطار", ph.zoom === 1.8 && Math.abs(ph.ox) > 20, `zoom=${ph.zoom} ox=${Math.round(ph.ox)} oy=${Math.round(ph.oy)}`);
await page.screenshot({ path: path.join(out, "screen-mobile-static.png") });

// 8) تصدير PNG و PDF عبر الأزرار الحقيقية (تنزيل فعلي)
const dl = async (sel, name) => { const [d] = await Promise.all([page.waitForEvent("download"), page.click(sel)]); const p = path.join(out, name); await d.saveAs(p); return p; };
const png = await dl("#xPng", "static-export.png");
const pdf = await dl("#xPdf", "static-export.pdf");
ok("تنزيل PNG", fs.statSync(png).size > 50000, fs.statSync(png).size + " bytes");
ok("تنزيل PDF", fs.statSync(pdf).size > 50000, fs.statSync(pdf).size + " bytes");

// 9) القالب المتحرك: تعديل النص + إطارات النص الشفافة ثم دمجها على الفيديو بـ ffmpeg
await page.click("#mVideo");
await page.waitForFunction(() => window.NAMQ.state && window.NAMQ.state.kind === "video");
await page.waitForTimeout(600);
await page.fill("#f-title", "عيد أضحى مبارك");
await page.fill("#f-from", "مع تحيات عائلة نمق");
const dur = await page.evaluate(() => document.getElementById("vid").duration);
ok("قراءة مدة الفيديو تلقائيًا", dur > 0, dur.toFixed(2) + " ث");
await page.screenshot({ path: path.join(out, "screen-mobile-video.png") });
const vpng = await dl("#xPng", "video-refscene.png");
const vpdf = await dl("#xPdf", "video-refscene.pdf");
ok("PNG/PDF للمشهد المرجعي", fs.statSync(vpng).size > 20000 && fs.statSync(vpdf).size > 20000);

// خلفية الفيديو التجريبية مضمّنة في الصفحة — نستخرجها كما هي
const src = await page.evaluate(() => document.getElementById("vid").getAttribute("src"));
const bgPath = path.join(out, "demo-bg-tajribi.mp4");
fs.writeFileSync(bgPath, Buffer.from(src.split(",")[1], "base64"));
const fps = 30, frames = Math.round(dur * fps), fdir = path.join(out, "frames");
fs.rmSync(fdir, { recursive: true, force: true }); fs.mkdirSync(fdir);
for (let i = 0; i < frames; i++) {
  const b64 = await page.evaluate((t) => window.NAMQ.textFrame(t), i / fps);
  fs.writeFileSync(path.join(fdir, String(i).padStart(5, "0") + ".png"), Buffer.from(b64, "base64"));
}
const mp4 = path.join(out, "video-export.mp4");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", bgPath, "-framerate", String(fps), "-i", path.join(fdir, "%05d.png"),
  "-filter_complex", `[0:v]fps=${fps},scale=1080:1920[b];[b][1:v]overlay=0:0:format=auto,format=yuv420p[v]`, "-map", "[v]", "-an",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-movflags", "+faststart", "-frames:v", String(frames), mp4]);
fs.rmSync(fdir, { recursive: true, force: true });
ok("إنتاج MP4", fs.statSync(mp4).size > 10000, fs.statSync(mp4).size + " bytes");
const refT = await page.evaluate(() => 3.2);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(refT), "-i", mp4, "-frames:v", "1", path.join(out, "video-export-frame-ref.png")]);

ok("لا أخطاء JavaScript في الصفحة", errors.length === 0, errors.join(" | "));
await browser.close();
fs.writeFileSync(path.join(out, "results.json"), JSON.stringify(log, null, 2));
process.exit(log.every((x) => x.pass) ? 0 : 1);
