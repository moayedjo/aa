// فحص الواجهة: node namq/tools/ui-check.mjs [local|live]
import { chromium, devices } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../live"), out = path.resolve(here, "../test-output");
const mode = process.argv[2] || "local";
let B = "https://headless-ibjkosqmrcj-adlimoayed710-140d.wix-site-host.com", server;
if (mode === "local") {
  const T = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".mp4": "video/mp4" };
  server = http.createServer((q, s) => {
    const f = path.join(root, decodeURIComponent(new URL(q.url, "http://x").pathname));
    fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { "content-type": T[path.extname(f)] || "application/octet-stream" }); s.end(b); });
  });
  await new Promise((r) => server.listen(0, r));
  B = "http://localhost:" + server.address().port;
}
const log = [];
const ok = (n, p, d = "") => { log.push({ name: n, pass: !!p, detail: d }); console.log((p ? "PASS " : "FAIL ") + n + (d ? " — " + d : "")); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
const go = async (u) => { await page.goto(B + u, { waitUntil: "networkidle" }); await page.waitForFunction(() => !document.getElementById("view").textContent.includes("جارٍ"), null, { timeout: 20000 }); await page.waitForTimeout(700); };

await go("/index.html");
const cats = await page.$$eval("#cats a:not(.kitchip)", (a) => a.map((x) => [x.textContent.trim(), x.getAttribute("href")]));
ok("الرئيسية: 5 أقسام + الكل", cats.length === 6, cats.map((c) => c[0]).join(" | "));
ok("بطاقات الأقسام مع الأقسام الفرعية", (await page.$$("#view .catcard")).length === 5 && (await page.textContent("#view .catcard")).includes("·"));
const rails = await page.$$eval("section.sec", (s) => s.map((x) => x.querySelector("h2").textContent + ":" + x.querySelectorAll(".tile").length));
ok("الرئيسية تعرض كل القوالب (شبكة عند قلة القوالب، صفوف أفقية عند كثرتها)", rails.reduce((n, r) => n + +r.split(":")[1], 0) >= 5, rails.join(" | "));
ok("معاينة مرسومة لكل قالب", await page.$$eval("canvas[data-t]", (c) => c.length >= 5 && c.every((x) => x.width === 270 && x.dataset.done === "1")));
const t0 = await page.$eval(".tile", (t) => [t.querySelector(".name").textContent.trim(), t.querySelector(".size").textContent.trim(), t.querySelector(".price").textContent.trim(), t.querySelector(".kind").textContent]);
ok("البطاقة: اسم مختصر + مقاس + سعر + نوع", /\d+×\d+/.test(t0[1]) && /د\.إ/.test(t0[2]) && !t0[0].includes("تجريبي"), t0.join(" | "));
ok("لا تمرير أفقي للصفحة", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
await page.screenshot({ path: path.join(out, "ui-home.png"), fullPage: true });

await page.click('.seg [data-kind="متحرك"]'); await page.waitForTimeout(300);
ok("تصفية «متحرك»", await page.$$eval(".tile .kind", (k) => k.length >= 1 && k.every((x) => x.textContent === "متحرك")));
await page.click('.seg [data-kind="ثابت"]'); await page.waitForTimeout(300);
ok("تصفية «ثابت»", await page.$$eval(".tile .kind", (k) => k.length >= 4 && k.every((x) => x.textContent === "ثابت")));
await page.click('.seg [data-kind=""]');
await page.fill("#q", "عيد"); await page.waitForTimeout(2500);
ok("البحث «عيد»", (await page.$$(".grid .tile")).length === 1 && (await page.textContent(".sechead h2")) === "نتائج البحث");
await page.fill("#q", "زززز"); await page.waitForTimeout(2500);
ok("بحث بلا نتائج يعرض رسالة واضحة", (await page.textContent(".empty")).includes("لا توجد نتائج"));

const res = [];
for (const [name, href] of cats.slice(1)) {
  await go(href);
  const n = (await page.$$(".grid .tile")).length, subs = await page.$$eval("#subs .chip", (c) => c.map((x) => x.textContent));
  res.push(`${name}: ${n} قالب، فرعي [${subs.join("، ")}]`);
  if (name.includes("الأفراح")) {
    await page.click('#subs [data-sub="خطوبة"]'); await page.waitForTimeout(2500);
    const a = (await page.$$(".grid .tile")).length;
    await page.click('#subs [data-sub="زفاف"]'); await page.waitForTimeout(2500);
    const b = await page.textContent(".grid");
    ok("القسم الفرعي «خطوبة» يعرض قالبه و«زفاف» فارغ برسالة", a === 1 && b.includes("زفاف"), `خطوبة=${a}`);
    await page.screenshot({ path: path.join(out, "ui-category.png"), fullPage: true });
  }
}
ok("كل قسم يفتح وفيه قوالب وأقسام فرعية", res.length === 5 && res.every((r) => /: [1-9]/.test(r) && !r.includes("[]")), "\n  " + res.join("\n  "));
await go("/index.html?cat=xxxx");
ok("قسم غير موجود", (await page.textContent("#view")).includes("غير موجود"));

await go("/index.html");
await page.click(".tile .fav"); await page.click('.tabs [data-view="fav"]'); await page.waitForTimeout(300);
ok("المفضلة", (await page.$$(".grid .tile")).length === 1 && (await page.locator("#hero").isHidden()));
await page.click('.tabs [data-view="mine"]');
ok("تصاميمي (فارغة)", (await page.textContent("#drafts")).includes("لا توجد تصاميم"));
await page.click('.tabs [data-view="all"]');
const href = await page.$eval(".tile .name a", (a) => a.getAttribute("href"));
await page.goto(B + href, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.NAMQ); await page.evaluate(() => window.NAMQ.ready); await page.waitForTimeout(2500);
ok("فتح القالب من البطاقة يعرض اسمه وسعره", /AED/.test(await page.textContent("#prod")), (await page.textContent("#prod")).slice(0, 60));
await page.fill("#f-title", "اختبار"); await page.waitForTimeout(200);
await page.goto(B + "/index.html", { waitUntil: "networkidle" }); await page.click('.tabs [data-view="mine"]');
ok("المسودة تظهر في تصاميمي", (await page.textContent("#drafts")).includes("متابعة"), (await page.textContent("#drafts")).trim());
await page.goto(B + "/index.html", { waitUntil: "networkidle" }); await page.waitForTimeout(2500);
await page.click(".tabs .plus"); await page.waitForTimeout(200);
ok("زر «+» يفتح اختيار المناسبة", (await page.isVisible("#sheet")) && (await page.$$("#sheetCats .catcard")).length === 5);
await page.click("#sheet .sheet-head [data-close]");
ok("إغلاق النافذة", await page.isHidden("#sheet"));
await page.click("#lang"); await page.waitForTimeout(400);
const en = await page.evaluate(() => [document.documentElement.dir, document.querySelector("#view .catcard b").textContent, document.querySelector(".tabs [data-view=all] [data-i]").textContent.trim(), document.querySelector(".tile .price").textContent, document.querySelector(".tile .name").textContent.trim()]);
ok("الواجهة الإنجليزية: LTR والأقسام والأزرار بالإنجليزية والقوالب عربية", en[0] === "ltr" && en[1] === "Weddings & Occasions" && en[2] === "Templates" && en[3].startsWith("AED") && /[\u0600-\u06FF]/.test(en[4]), en.join(" | "));
await page.screenshot({ path: path.join(out, "ui-home-en.png") });
await page.reload({ waitUntil: "networkidle" });
ok("اللغة تُحفظ بعد إعادة التحميل", (await page.evaluate(() => document.documentElement.lang)) === "en");
await page.click("#lang"); await page.waitForTimeout(300);
ok("العودة للعربية", (await page.evaluate(() => document.documentElement.dir)) === "rtl");
await page.goto(B + "/plans.html", { waitUntil: "networkidle" }); await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(out, "ui-plans.png"), fullPage: true });
ok("صفحة الاشتراك: باقتان", (await page.$$(".plan")).length === 2);
const wide = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await wide.goto(B + "/index.html", { waitUntil: "networkidle" }); await wide.waitForTimeout(2500);
await wide.screenshot({ path: path.join(out, "ui-home-desktop.png") });
ok("الكمبيوتر: شريط جانبي ظاهر والشريط السفلي مخفي", (await wide.isVisible("aside.side")) && (await wide.isHidden(".tabs")));
ok("الكمبيوتر: لا تمرير أفقي", await wide.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await wide.close();
ok("لا أخطاء JavaScript", errs.length === 0, errs.join(" | "));
await browser.close();
if (server) server.close();
fs.writeFileSync(path.join(out, `results-ui-${mode}.json`), JSON.stringify(log, null, 2));
process.exit(log.every((x) => x.pass) ? 0 : 1);
