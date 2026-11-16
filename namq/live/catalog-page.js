import { fetchCategories, searchCatalog } from "/js/wix/catalog.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const FAV_KEY = "namq-favs";
const favs = () => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch (e) { return []; } };
const setFavs = (a) => { try { localStorage.setItem(FAV_KEY, JSON.stringify(a)); } catch (e) {} };

/* الأقسام الفرعية: كلمات بحث داخل القسم. القسم يُعرَّف بأول كلمة مميزة في اسمه. */
const SUBS = [
  ["الأفراح", ["زفاف", "خطوبة", "عقد قران"], "#FBE9EE"],
  ["المواليد", ["إعلان مولود", "تهنئة", "عقيقة"], "#EAF3FB"],
  ["الأعياد", ["رمضان", "عيد الفطر", "عيد الأضحى"], "#FFF3DC"],
  ["شخصية", ["تخرج", "نجاح", "عيد ميلاد"], "#EAF6F0"],
  ["السوشيال", ["بوست", "ستوري", "عرض"], "#F1ECFA"],
];
const subsOf = (c) => SUBS.find((s) => c.name.includes(s[0])) || ["", [], "#F3F1EE"];

const params = new URLSearchParams(location.search);
const catSlug = params.get("cat") || "";
const state = { view: "all", kind: "", q: "", sub: "", cats: [], cat: null, all: null, byCat: {}, error: false };

/* ---------- بيانات المنتج للعرض ---------- */
function info(p) {
  const kinds = (p.ribbons || []).map((r) => (typeof r === "string" ? r : (r && r.name) || "")).filter(Boolean);
  const video = kinds.includes("متحرك");
  const parts = String(p.name || "").split(" — ");
  const rest = (parts[1] || "").replace(/\(تجريبي\)/, "").trim();
  const num = String(p.price || "").match(/[0-9.,]+/);
  const price = num ? Number(num[0].replace(/,/g, "")).toLocaleString("en", { maximumFractionDigits: 2 }) + " د.إ" : p.price || "";
  return { video, title: parts[0].trim(), size: rest, price, href: "/editor.html?mode=" + (video ? "video" : "static") + "&p=" + encodeURIComponent(p.slug || "") };
}

/* معاينة مرسومة للقوالب التي لا تملك صورة في المتجر (القوالب التجريبية) */
function thumb(c, title, video) {
  const W = 270, H = 480, x = c.getContext("2d");
  c.width = W; c.height = H;
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, video ? "#EFE7F6" : "#FBF4EE"); g.addColorStop(1, video ? "#DCEBEC" : "#F3E9F4");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.globalAlpha = 0.55;
  [[-20, -15, 105, "#EBD9F1"], [W + 15, 62, 75, "#FBDDE5"], [-10, H - 30, 90, "#FBDDE5"], [W + 10, H + 5, 115, "#E3D3EE"]].forEach(([a, b, r, col]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fillStyle = col; x.fill(); });
  x.globalAlpha = 0.9; x.strokeStyle = "#C9A86A"; x.lineWidth = 1;
  [[-20, -15, 118], [W + 10, H + 5, 128]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.stroke(); });
  x.globalAlpha = 1; x.strokeStyle = "#E3D8CC"; x.strokeRect(13.5, 13.5, W - 27, H - 27);
  x.direction = "rtl"; x.textAlign = "center"; x.textBaseline = "middle";
  let size = 46; x.fillStyle = "#3F2E5C";
  do { x.font = `400 ${size}px "Aref Ruqaa", serif`; size -= 2; } while (x.measureText(title).width > W - 50 && size > 18);
  x.fillText(title, W / 2, H * 0.47);
  x.fillStyle = "#D94F70"; x.font = '400 15px "Tajawal", sans-serif'; x.fillText("اكتب بياناتك هنا", W / 2, H * 0.58);
  x.fillStyle = "#8A6A3B"; x.fillRect(W / 2 - 18, H * 0.36, 36, 1.5);
  if (video) { x.fillStyle = "rgba(34,34,34,.78)"; x.beginPath(); x.arc(W / 2, H * 0.78, 20, 0, 7); x.fill(); x.fillStyle = "#fff"; x.beginPath(); x.moveTo(W / 2 - 6, H * 0.78 - 9); x.lineTo(W / 2 + 10, H * 0.78); x.lineTo(W / 2 - 6, H * 0.78 + 9); x.fill(); }
}
function paintThumbs() {
  const draw = () => document.querySelectorAll("canvas[data-t]").forEach((c) => { if (!c.dataset.done) { thumb(c, c.dataset.t, c.dataset.v === "1"); c.dataset.done = "1"; } });
  draw();
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('40px "Aref Ruqaa"', "نمق"), document.fonts.load('15px "Tajawal"', "نمق")]).then(() => { document.querySelectorAll("canvas[data-t]").forEach((c) => delete c.dataset.done); draw(); }).catch(() => {});
}

function tile(p) {
  const i = info(p), on = favs().includes(p.id);
  const pic = p.imageUrl ? `<img loading="lazy" src="${esc(p.imageUrl)}" alt="">` : `<canvas data-t="${esc(i.title)}" data-v="${i.video ? 1 : 0}" role="img" aria-label="معاينة ${esc(i.title)}"></canvas>`;
  return `<article class="tile">
    <button class="fav" type="button" data-fav="${esc(p.id)}" aria-pressed="${on}" aria-label="${on ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}">${on ? "♥" : "♡"}</button>
    <a class="pic" href="${i.href}" tabindex="-1" aria-hidden="true">${pic}</a>
    <div class="meta"><p class="name"><a href="${i.href}">${esc(i.title)}</a></p>
    <p class="size">${esc(i.size)}</p>
    <div class="row"><span class="price">${esc(i.price)}</span><span class="kind${i.video ? " mov" : ""}">${i.video ? "متحرك" : "ثابت"}</span></div></div></article>`;
}
const byKind = (list) => (state.kind ? list.filter((p) => (info(p).video ? "متحرك" : "ثابت") === state.kind) : list);
const empty = (title, text) => `<div class="empty"><b>${title}</b>${text}</div>`;

/* ---------- العرض ---------- */
function render() {
  const v = $("view"), home = state.view === "all" && !state.cat && !state.q && !catSlug;
  const browsing = state.view === "all";
  $("mine").hidden = state.view !== "mine";
  v.hidden = state.view === "mine";
  ["hero", "steps", "subbanner"].forEach((id) => ($(id).hidden = !home));
  document.querySelector(".searchbar").hidden = document.querySelector(".seg").hidden = $("cats").hidden = !browsing;
  $("cats").innerHTML = `<a class="chip" href="/index.html" aria-current="${!catSlug}">الكل</a>` + state.cats.map((c) => `<a class="chip" href="/index.html?cat=${encodeURIComponent(c.slug)}" aria-current="${!!(state.cat && state.cat.id === c.id)}">${esc(c.name)}</a>`).join("");
  const subs = state.cat ? subsOf(state.cat)[1] : [];
  $("subs").hidden = !browsing || !subs.length;
  $("subs").innerHTML = subs.map((s) => `<button type="button" class="chip" data-sub="${esc(s)}" aria-pressed="${state.sub === s}">${esc(s)}</button>`).join("");
  if (state.view === "mine") { drafts(); return; }
  if (state.error) { v.innerHTML = `<p class="alert">تعذّر تحميل القوالب. تحقق من الاتصال ثم <button class="btn" type="button" id="retry">أعد المحاولة</button></p>`; return; }
  if (state.all === null) { v.innerHTML = '<p class="note">جارٍ تحميل القوالب…</p>'; return; }
  if (catSlug && !state.cat) { v.innerHTML = empty("هذا القسم غير موجود", ' <a href="/index.html">عرض كل القوالب</a>'); return; }

  if (state.view === "fav") {
    const f = favs(), list = state.all.filter((p) => f.includes(p.id));
    v.innerHTML = `<div class="sec"><div class="sechead"><h2>المفضلة</h2></div><p class="note">محفوظة على هذا الجهاز فقط.</p><div class="grid">${list.map(tile).join("") || empty("لا توجد قوالب في المفضلة", "اضغط ♡ على أي قالب ليظهر هنا.")}</div></div>`;
  } else if (home) {
    let h = `<div class="sec"><div class="sechead"><h2>تصفّح حسب المناسبة</h2></div><div class="rail catrail">` + state.cats.map((c) => { const s = subsOf(c); return `<a class="catcard" style="background:${s[2]}" href="/index.html?cat=${encodeURIComponent(c.slug)}"><b>${esc(c.name)}</b><span>${esc(s[1].join(" · "))}</span></a>`; }).join("") + "</div></div>";
    let shown = 0;
    const few = state.all.length <= 8, flat = byKind(state.all);
    if (few && flat.length) { shown = 1; h += `<section class="sec"><div class="sechead"><h2>كل القوالب</h2><span class="note">${flat.length} قالب</span></div><div class="grid">${flat.map(tile).join("")}</div></section>`; }
    for (const c of few ? [] : state.cats) {
      const list = byKind(state.byCat[c.id] || []); if (!list.length) continue; shown++;
      h += `<section class="sec"><div class="sechead"><h2>${esc(c.name)}</h2><a href="/index.html?cat=${encodeURIComponent(c.slug)}">عرض الكل</a></div><div class="rail">${list.map(tile).join("")}</div></section>`;
    }
    if (!shown) h += `<div class="grid">${empty("لا توجد قوالب " + esc(state.kind) + " بعد", "جرّب «الكل».")}</div>`;
    v.innerHTML = h;
  } else {
    const list = byKind(state.all), title = state.cat ? state.cat.name : "نتائج البحث";
    const none = state.q || state.sub ? empty("لا توجد نتائج", state.sub ? `لا توجد قوالب «${esc(state.sub)}» بعد.` : "جرّب كلمة أخرى.") : empty("لا توجد قوالب هنا بعد", "ستُضاف قريبًا.");
    v.innerHTML = `<div class="sec"><div class="sechead"><h2>${esc(title)}</h2><span class="note">${list.length} قالب</span></div><div class="grid">${list.map(tile).join("") || none}</div></div>`;
  }
  paintThumbs();
}

function drafts() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("namq-draft-") || k.startsWith("namq-draft-tpl-")) continue;
      const d = JSON.parse(localStorage.getItem(k) || "null");
      if (!d) continue;
      const slug = k.slice(11), isProd = slug !== "static" && slug !== "video", video = d.kind === "video";
      const label = (d.pname || (video ? "قالب متحرك" : "قالب ثابت")).split(" — ")[0];
      out.push(`<p><a class="btn" href="/editor.html?mode=${video ? "video" : "static"}${isProd ? "&p=" + encodeURIComponent(slug) : ""}">متابعة: ${esc(label)}</a></p>`);
    }
  } catch (e) {}
  $("drafts").innerHTML = out.join("") || '<p class="note">لا توجد تصاميم بعد. افتح أي قالب وابدأ التعديل.</p>';
}

/* ---------- التحميل ---------- */
async function load() {
  state.error = false; render();
  try {
    if (!state.cats.length) {
      state.cats = (await fetchCategories()).filter((c) => !c.parentId).sort((a, b) => a.index - b.index);
      state.cat = catSlug ? state.cats.find((c) => c.slug === catSlug) || null : null;
    }
    const search = [state.sub, state.q].filter(Boolean).join(" ");
    const main = searchCatalog({ limit: 100, categoryId: state.cat ? state.cat.id : null, search: search || undefined });
    if (!catSlug && !Object.keys(state.byCat).length) {
      const lists = await Promise.all(state.cats.map((c) => searchCatalog({ limit: 12, categoryId: c.id }).then((r) => r.products).catch(() => [])));
      state.cats.forEach((c, i) => (state.byCat[c.id] = lists[i]));
    }
    state.all = (await main).products;
  } catch (e) { state.error = true; }
  render();
}

let timer = 0;
$("q").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => { state.q = $("q").value.trim(); load(); }, 350); });
document.querySelector(".seg").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-kind]"); if (!b) return;
  state.kind = b.dataset.kind;
  document.querySelectorAll(".seg button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  render();
});
$("subs").addEventListener("click", (e) => { const b = e.target.closest("[data-sub]"); if (!b) return; state.sub = state.sub === b.dataset.sub ? "" : b.dataset.sub; load(); });
$("view").addEventListener("click", (e) => {
  if (e.target.id === "retry") { load(); return; }
  const b = e.target.closest("[data-fav]"); if (!b) return;
  const id = b.dataset.fav, f = favs();
  setFavs(f.includes(id) ? f.filter((x) => x !== id) : f.concat(id));
  render();
});
document.querySelector(".tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-view]"); if (!b) return;
  state.view = b.dataset.view;
  document.querySelectorAll(".tabs button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  render(); scrollTo(0, 0);
});
load();
