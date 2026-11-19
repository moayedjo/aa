// يتحقق من ربط أداة الإعداد بالمتجر عبر Wix CMS (NamqTemplates)
// الاستخدام: node verify-cms.mjs [local|live]
import { chromium, devices } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const mode = process.argv[2] || "local";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../live");
const OUT = path.resolve(ROOT, "../test-output");
let base = "https://headless-ibjkosqmrcj-adlimoayed710-140d.wix-site-host.com", srv;
if (mode === "local") {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
  srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split("?")[0]); if (p === "/") p = "/index.html";
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
  }).listen(8791);
  base = "http://localhost:8791";
}
const res = []; const ok = (n, c, d = "") => { res.push({ n, ok: !!c, d }); console.log((c ? "✓ " : "✗ ") + n + (d ? " — " + d : "")); };
const b = await chromium.launch();
try {
  const ctx = await b.newContext({ ...devices["iPhone 13"] });
  const pg = await ctx.newPage();
  const errs = []; pg.on("pageerror", e => errs.push("editor: " + e.message + " @ " + (e.stack||"").split("\n").slice(1,3).join(" ")));
  const slug = "عرض-خاص-ستوري-1080-1920-تجريبي";
  await pg.goto(base + "/editor.html?mode=static&p=" + encodeURIComponent(slug), { waitUntil: "load" });
  await pg.waitForFunction(() => window.NAMQ && window.NAMQ.ready, null, { timeout: 15000 });
  await pg.evaluate(() => window.NAMQ.ready);
  await pg.waitForTimeout(800);
  const st = await pg.evaluate(() => { const s = window.NAMQ.state; return { texts: JSON.stringify(s).slice(0, 4000) }; });
  ok("المحرر يقرأ القالب المنشور من Wix", st.texts.includes("خصم ٣٠٪"), "");
  ok("نص العنوان من التعريف", st.texts.includes("عرض خاص"));
  const segHidden = await pg.evaluate(() => document.getElementById("seg").hidden);
  ok("أزرار ثابت/متحرك مخفية للقالب المنشور", segHidden);
  const px = await pg.evaluate(() => { const c = document.getElementById("pv"); const d = c.getContext("2d").getImageData(Math.floor(c.width * 0.1), Math.floor(c.height * 0.05), 1, 1).data; return [...d]; });
  ok("الخلفية الوردية مرسومة", px[0] > 150 && px[0] > px[2] - 10 && px[3] === 255, px.join(","));
  await pg.screenshot({ path: path.join(OUT, "cms-editor-" + mode + ".png") });
  // منتج بلا قالب منشور يبقى على القالب الداخلي
  await pg.goto(base + "/editor.html?mode=static", { waitUntil: "load" });
  await pg.evaluate(() => window.NAMQ.ready);
  const st2 = await pg.evaluate(() => JSON.stringify(window.NAMQ.state));
  ok("بدون منتج: القالب الداخلي كما هو", !st2.includes("خصم ٣٠٪"));
  // أداة الإعداد: بطاقة النشر
  const sp = await ctx.newPage(); sp.on("pageerror", e => errs.push("studio: " + e.message + " @ " + (e.stack||"").split("\n").slice(1,3).join(" ")));
  await sp.goto(base + "/studio.html", { waitUntil: "load" });
  await sp.click("#new").catch(() => {});
  await sp.waitForFunction(() => document.querySelectorAll("#pubProd option").length > 3, null, { timeout: 15000 });
  const n = await sp.locator("#pubProd option").count();
  ok("قائمة المنتجات في بطاقة النشر", n > 3, n + " خيار");
  await sp.waitForFunction(() => !/جارٍ/.test(document.getElementById("pubList").textContent), null, { timeout: 15000 });
  const lt = await sp.locator("#pubList").innerText();
  ok("قائمة المنشور تعرض القالب التجريبي", lt.includes("عرض خاص"), lt.slice(0, 80));
  await sp.selectOption("#pubProd", slug);
  ok("الرابط المختصر يظهر", (await sp.locator("#pubSlug").innerText()) === slug);
  ok("لا أخطاء جافاسكربت", errs.length === 0, errs.join(" | "));
} finally { await b.close(); srv && srv.close(); }
fs.writeFileSync(path.join(OUT, "verify-cms-" + mode + ".json"), JSON.stringify(res, null, 1));
console.log(res.filter(r => r.ok).length + "/" + res.length);
