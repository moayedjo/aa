// فحص الرابط الحي في متصفح (iPhone 13): node namq/tools/live-check.mjs [prefix]
import { chromium, devices } from "playwright";
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), out = path.resolve(here, "../test-output");
const B = "https://headless-ibjkosqmrcj-adlimoayed710-140d.wix-site-host.com", pre = process.argv[2] || "live";
const browser = await chromium.launch(); const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage(); const errs = [], fails = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
page.on("requestfailed", (r) => fails.push(r.url().slice(0, 90) + " " + (r.failure() || {}).errorText));
page.on("response", (r) => { if (r.status() >= 400) fails.push(r.status() + " " + r.url().slice(0, 110)); });
await page.goto(B + "/index.html", { waitUntil: "networkidle" }); await page.waitForTimeout(2500);
const cats = await page.$$eval("#cats a", (a) => a.map((x) => [x.textContent.trim(), x.getAttribute("href")]));
const tiles = async () => page.$$eval("#grid .tile", (t) => t.map((x) => x.querySelector(".name").textContent.trim() + " | " + x.querySelector(".price").textContent.trim() + " | " + [...x.querySelectorAll(".kind")].map((k) => k.textContent).join(",")));
console.log("HOME", JSON.stringify(await tiles(), null, 1)); console.log("COUNT", await page.textContent("#count"));
await page.screenshot({ path: path.join(out, pre + "-home.png"), fullPage: true });
const res = {};
for (const [name, href] of cats.slice(1)) { await page.goto(B + href, { waitUntil: "networkidle" }); await page.waitForTimeout(1500); res[name] = (await tiles()).length + " :: " + (await page.textContent("#grid")).trim().slice(0, 60); }
console.log("CATS", JSON.stringify(res, null, 1));
await page.goto(B + "/index.html", { waitUntil: "networkidle" }); await page.fill("#q", "عيد"); await page.waitForTimeout(2500); console.log("SEARCH عيد", (await tiles()).length);
const href = await page.$eval("#grid .tile a.pic", (a) => a.getAttribute("href")).catch(() => null);
await page.goto(B + "/plans.html", { waitUntil: "networkidle" }); await page.waitForTimeout(2000); await page.screenshot({ path: path.join(out, pre + "-plans.png"), fullPage: true });
console.log("PLANS", (await page.textContent("#plans")).replace(/\s+/g, " ").slice(0, 300));
await page.goto(B + "/editor.html?mode=static&p=" + encodeURIComponent("دعوة-خطوبة-ستوري-1080-1920-تجريبي"), { waitUntil: "networkidle" }); await page.waitForTimeout(3000);
console.log("EDITOR bar:", await page.textContent("#prod"), "| fonts:", await page.evaluate(() => ["Tajawal", "Amiri", "Aref Ruqaa", "Reem Kufi"].map((f) => document.fonts.check('40px "' + f + '"', "نمق")).join()));
await page.screenshot({ path: path.join(out, pre + "-editor.png") });
console.log("ERRORS", JSON.stringify(errs), "FAILS", JSON.stringify([...new Set(fails)].slice(0, 12), null, 1));
await browser.close();
