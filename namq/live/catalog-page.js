import { fetchCategories, searchCatalog } from "/js/wix/catalog.js";

const $ = (id) => document.getElementById(id);
const $$ = (s) => document.querySelectorAll(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const favs = () => store.get("namq-favs", []);

/* ---------- اللغة: واجهة الموقع فقط؛ القوالب ومحتواها عربية دائمًا ---------- */
const T = {
  ar: { brand: "نمق", start: "+ ابدأ تصميمًا", tabAll: "القوالب", tabFav: "المفضلة", tabSearch: "بحث", tabMine: "تصاميمي", mine: "تصاميمي", plans: "الاشتراك", close: "إغلاق",
    search: "ابحث عن قالب…", heroTitle: "صمّم دعوتك بخط عربي", heroText: "اختر قالبًا، اكتب بياناتك، ونزّل تصميمك من تلفونك.",
    kAll: "الكل", kStatic: "ثابت", kVideo: "متحرك", home: "الرئيسية", browse: "تصفّح حسب المناسبة", allT: "كل القوالب", seeAll: "عرض الكل", results: "نتائج البحث", count: (n) => n + " قالب",
    mineNote: "تصاميمك محفوظة على هذا الجهاز فقط، وتختفي إذا مسحت بيانات المتصفح.", noDrafts: "لا توجد تصاميم بعد. افتح أي قالب وابدأ التعديل.", cont: "متابعة",
    s1: "اختر قالبًا", s2: "اكتب بياناتك", s3: "نزّل تصميمك", subTitle: "كل القوالب باشتراك واحد", subText: "تخصيص وتنزيل بلا حدود، شهريًا أو سنويًا", foot: "قوالب هذه النسخة تجريبية لعرض طريقة العمل.",
    favNote: "محفوظة على هذا الجهاز فقط.", favEmptyT: "لا توجد قوالب في المفضلة", favEmpty: "اضغط ♡ على أي قالب ليظهر هنا.", noRes: "لا توجد نتائج", tryOther: "جرّب كلمة أخرى.", noSub: (s) => `لا توجد قوالب «${s}» بعد.`,
    emptyCatT: "لا توجد قوالب هنا بعد", emptyCat: "ستُضاف قريبًا.", noKindT: (k) => `لا توجد قوالب ${k} بعد`, noKind: "جرّب «الكل».", noCatT: "هذا القسم غير موجود", backAll: "عرض كل القوالب",
    loading: "جارٍ تحميل القوالب…", error: "تعذّر تحميل القوالب. تحقق من الاتصال ثم", retry: "أعد المحاولة", favAdd: "إضافة إلى المفضلة", favDel: "إزالة من المفضلة", preview: "معاينة",
    sheetTitle: "ابدأ تصميمك — اختر المناسبة", aed: "د.إ", video: "متحرك", static: "ثابت",
    kit: "تنسيق حفلات", kitTitle: "تنسيق حفلات — كل تصاميم حفلتك مرة وحدة", kitText: "أدخل بيانات الحفل مرة واحدة ونزّل مجموعة كاملة: دعوات بأسماء المعازيم من ملف Excel، ستوري، بطاقة A5 للطباعة، لوحة ترحيب، أرقام طاولات وملصقات توزيعات.", oWed: "عرس", oEng: "خطوبة", oBday: "عيد ميلاد", oBaby: "مولود جديد" },
  en: { brand: "Namq", start: "+ Start a design", tabAll: "Templates", tabFav: "Favorites", tabSearch: "Search", tabMine: "My designs", mine: "My designs", plans: "Subscription", close: "Close",
    search: "Search templates…", heroTitle: "Design your invitation in Arabic calligraphy", heroText: "Pick a template, type your details and download your design from your phone.",
    kAll: "All", kStatic: "Static", kVideo: "Animated", home: "Home", browse: "Browse by occasion", allT: "All templates", seeAll: "See all", results: "Search results", count: (n) => n + (n === 1 ? " template" : " templates"),
    mineNote: "Your designs are saved on this device only and disappear if you clear browser data.", noDrafts: "No designs yet. Open any template to start.", cont: "Continue",
    s1: "Pick a template", s2: "Type your details", s3: "Download", subTitle: "Every template, one subscription", subText: "Unlimited editing and downloads, monthly or yearly", foot: "Templates in this version are demos showing how it works.",
    favNote: "Saved on this device only.", favEmptyT: "No favorites yet", favEmpty: "Tap ♡ on any template to keep it here.", noRes: "No results", tryOther: "Try another word.", noSub: (s) => `No “${s}” templates yet.`,
    emptyCatT: "No templates here yet", emptyCat: "Coming soon.", noKindT: (k) => `No ${k.toLowerCase()} templates yet`, noKind: "Try “All”.", noCatT: "This category doesn't exist", backAll: "See all templates",
    loading: "Loading templates…", error: "Couldn't load templates. Check your connection, then", retry: "try again", favAdd: "Add to favorites", favDel: "Remove from favorites", preview: "Preview",
    sheetTitle: "Start your design — pick an occasion", aed: "AED", video: "Animated", static: "Static",
    kit: "Event kits", kitTitle: "Event kits — every design for your event, at once", kitText: "Enter your event details once and download a full set: invitations named from your Excel guest list, stories, an A5 print card, a welcome sign, table numbers and favor stickers.", oWed: "Wedding", oEng: "Engagement", oBday: "Birthday", oBaby: "New baby" },
};
let lang = store.get("namq-lang", "ar") === "en" ? "en" : "ar";
const t = (k, ...a) => { const v = T[lang][k]; return typeof v === "function" ? v(...a) : v; };

/* الأقسام: ألوان البطاقة، الأقسام الفرعية، والاسم الإنجليزي. تُعرَّف بكلمة مميزة في اسم القسم في المتجر. */
const CATS = [
  { key: "الأفراح", en: "Weddings & Occasions", subs: [["زفاف", "Wedding"], ["خطوبة", "Engagement"], ["عقد قران", "Nikah"]], words: ["زفاف", "خطوبة", "قران", "عرس"], bg: ["#6B2238", "#3F1020"], ink: "#F1D9A6", accent: "#C9A86A", glyph: "ف" },
  { key: "المواليد", en: "Newborn", subs: [["إعلان مولود", "Birth announcement"], ["تهنئة", "Congratulations"], ["عقيقة", "Aqiqah"]], words: ["مولود", "مولودة", "عقيقة"], bg: ["#DCEAF7", "#B9D3EC"], ink: "#21456E", accent: "#6E9CCB", glyph: "م" },
  { key: "الأعياد", en: "Eid & Greetings", subs: [["رمضان", "Ramadan"], ["عيد الفطر", "Eid al-Fitr"], ["عيد الأضحى", "Eid al-Adha"]], words: ["عيد", "رمضان"], bg: ["#18294F", "#0B1530"], ink: "#E9CF8E", accent: "#C9A86A", glyph: "ع" },
  { key: "شخصية", en: "Personal", subs: [["تخرج", "Graduation"], ["نجاح", "Success"], ["عيد ميلاد", "Birthday"]], words: ["تخرج", "نجاح", "ميلاد"], bg: ["#245E50", "#123D33"], ink: "#F3E7C9", accent: "#D8C08A", glyph: "ش" },
  { key: "السوشيال", en: "Social & Business", subs: [["بوست", "Post"], ["ستوري", "Story"], ["عرض", "Offer"]], words: ["عرض", "خصم", "بوست"], bg: ["#E25A7B", "#B8375A"], ink: "#FFFFFF", accent: "#FFE1E9", glyph: "س" },
];
const FALLBACK = { key: "", en: "", subs: [], words: [], bg: ["#F3F1EE", "#E7E2DC"], ink: "#3F2E5C", accent: "#C9A86A", glyph: "ن" };
const metaOf = (cat) => (cat && CATS.find((c) => cat.name.includes(c.key))) || FALLBACK;
const catName = (cat) => (lang === "en" && metaOf(cat).en) || cat.name;

const params = new URLSearchParams(location.search);
const catSlug = params.get("cat") || "";
const state = { view: "all", kind: "", q: "", sub: "", cats: [], cat: null, all: null, byCat: {}, catOf: {}, error: false };

/* ---------- بيانات المنتج للعرض ---------- */
function info(p) {
  const kinds = (p.ribbons || []).map((r) => (typeof r === "string" ? r : (r && r.name) || "")).filter(Boolean);
  const video = kinds.includes("متحرك");
  const parts = String(p.name || "").split(" — ");
  const size = (parts[1] || "").replace(/\(تجريبي\)/, "").trim();
  const num = String(p.price || "").match(/[0-9.,]+/);
  const amount = num ? Number(num[0].replace(/,/g, "")).toLocaleString("en", { maximumFractionDigits: 2 }) : "";
  const price = amount ? (lang === "en" ? "AED " + amount : amount + " د.إ") : p.price || "";
  return { video, title: parts[0].trim(), size, price, href: "/editor.html?mode=" + (video ? "video" : "static") + "&p=" + encodeURIComponent(p.slug || "") };
}
function styleOf(p) {
  const c = state.cat || state.catOf[p.id];
  if (c) return metaOf(c);
  const name = String(p.name || "");
  return CATS.find((m) => m.words.some((w) => name.includes(w))) || FALLBACK;
}

/* معاينة مرسومة للقوالب التي لا تملك صورة في المتجر (القوالب التجريبية) */
function thumb(c, title, video, st) {
  const W = 270, H = 480, x = c.getContext("2d");
  c.width = W; c.height = H;
  const g = x.createLinearGradient(0, 0, W * 0.4, H);
  g.addColorStop(0, st.bg[0]); g.addColorStop(1, st.bg[1]);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // قوس الإطار
  const ax = 30, aw = W - 60, top = 84, bot = H - 64;
  x.strokeStyle = st.accent; x.globalAlpha = 0.75; x.lineWidth = 1.4;
  x.beginPath(); x.moveTo(ax, bot); x.lineTo(ax, top + aw / 2); x.arc(W / 2, top + aw / 2, aw / 2, Math.PI, 0); x.lineTo(ax + aw, bot); x.closePath(); x.stroke();
  x.globalAlpha = 0.4; x.beginPath(); x.moveTo(ax + 8, bot - 8); x.lineTo(ax + 8, top + aw / 2); x.arc(W / 2, top + aw / 2, aw / 2 - 8, Math.PI, 0); x.lineTo(ax + aw - 8, bot - 8); x.closePath(); x.stroke();
  // نجمة/معين أعلى القوس
  x.globalAlpha = 1; x.fillStyle = st.accent; const sy = top - 10;
  x.beginPath(); x.moveTo(W / 2, sy - 9); x.lineTo(W / 2 + 7, sy); x.lineTo(W / 2, sy + 9); x.lineTo(W / 2 - 7, sy); x.closePath(); x.fill();
  // حرف زخرفي خفيف
  x.globalAlpha = 0.08; x.fillStyle = st.ink; x.textAlign = "center"; x.textBaseline = "middle"; x.direction = "rtl";
  x.font = '400 230px "Aref Ruqaa", serif'; x.fillText(st.glyph, W / 2, H * 0.6);
  // العنوان
  x.globalAlpha = 1; x.fillStyle = st.ink; let size = 46;
  do { x.font = `700 ${size}px "Aref Ruqaa", serif`; size -= 2; } while (x.measureText(title).width > aw - 26 && size > 18);
  x.fillText(title, W / 2, H * 0.5);
  x.fillStyle = st.accent; x.fillRect(W / 2 - 22, H * 0.585, 44, 1.5);
  x.globalAlpha = 0.85; x.fillStyle = st.ink; x.font = '400 14px "Tajawal", sans-serif'; x.fillText("اكتب بياناتك هنا", W / 2, H * 0.635);
  x.globalAlpha = 1;
  if (video) { x.fillStyle = "rgba(255,255,255,.92)"; x.beginPath(); x.arc(W / 2, H * 0.76, 19, 0, 7); x.fill(); x.fillStyle = "#222"; x.beginPath(); x.moveTo(W / 2 - 6, H * 0.76 - 9); x.lineTo(W / 2 + 10, H * 0.76); x.lineTo(W / 2 - 6, H * 0.76 + 9); x.fill(); }
}
const thumbStyle = {};
function paintThumbs() {
  const draw = () => $$("canvas[data-t]").forEach((c) => { if (!c.dataset.done) { thumb(c, c.dataset.t, c.dataset.v === "1", thumbStyle[c.dataset.s] || FALLBACK); c.dataset.done = "1"; } });
  draw();
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('700 40px "Aref Ruqaa"', "نمق"), document.fonts.load('400 40px "Aref Ruqaa"', "نمق"), document.fonts.load('14px "Tajawal"', "نمق")]).then(() => { $$("canvas[data-t]").forEach((c) => delete c.dataset.done); draw(); }).catch(() => {});
}

function tile(p) {
  const i = info(p), on = favs().includes(p.id), st = styleOf(p);
  thumbStyle[st.key || "_"] = st;
  const pic = p.imageUrl ? `<img loading="lazy" src="${esc(p.imageUrl)}" alt="">` : `<canvas data-t="${esc(i.title)}" data-v="${i.video ? 1 : 0}" data-s="${esc(st.key || "_")}" role="img" aria-label="${t("preview")} ${esc(i.title)}"></canvas>`;
  return `<article class="tile">
    <div class="media"><a class="pic" href="${i.href}" tabindex="-1" aria-hidden="true">${pic}${i.video ? `<span class="badge mov">▶ ${t("video")}</span>` : ""}</a>
    <span class="price">${esc(i.price)}</span>
    <button class="fav" type="button" data-fav="${esc(p.id)}" aria-pressed="${on}" aria-label="${on ? t("favDel") : t("favAdd")}">${on ? "♥" : "♡"}</button></div>
    <div class="meta"><p class="name"><a href="${i.href}">${esc(i.title)}</a></p>
    <div class="row"><p class="size">${esc(i.size)}</p><span class="kind${i.video ? " mov" : ""}">${i.video ? t("video") : t("static")}</span></div></div></article>`;
}
const byKind = (list) => (state.kind ? list.filter((p) => (info(p).video ? "متحرك" : "ثابت") === state.kind) : list);
const empty = (title, text) => `<div class="empty"><b>${title}</b>${text}</div>`;
const catCard = (c) => { const m = metaOf(c); return `<a class="catcard" style="background:linear-gradient(135deg,${m.bg[0]},${m.bg[1]});color:${m.ink}" href="/index.html?cat=${encodeURIComponent(c.slug)}"><i aria-hidden="true">${m.glyph}</i><b>${esc(catName(c))}</b><span>${esc(m.subs.map((s) => (lang === "en" ? s[1] : s[0])).join(" · "))}</span></a>`; };

/* ---------- العرض ---------- */
function applyLang() {
  const h = document.documentElement;
  h.lang = lang; h.dir = lang === "en" ? "ltr" : "rtl";
  $$("[data-i]").forEach((e) => { const v = T[lang][e.dataset.i]; if (typeof v === "string") e.textContent = v; });
  $$("[data-i-aria]").forEach((e) => e.setAttribute("aria-label", T[lang][e.dataset.iAria]));
  $("q").placeholder = t("search"); $("q").setAttribute("aria-label", t("search"));
  const b = $("lang"); b.textContent = lang === "en" ? "عربي" : "EN"; b.setAttribute("aria-label", lang === "en" ? "العربية" : "English");
}
function render() {
  const v = $("view"), home = state.view === "all" && !state.cat && !state.q && !catSlug;
  const browsing = state.view === "all";
  $("mine").hidden = state.view !== "mine";
  v.hidden = state.view === "mine";
  ["hero", "kitbanner", "steps", "subbanner"].forEach((id) => ($(id).hidden = !home));
  document.querySelector(".filters").hidden = !browsing;
  $$("[data-view]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.view === state.view)));
  $("cats").innerHTML = `<a class="chip" href="/index.html" aria-current="${!catSlug && browsing}">${t("home")}</a><a class="chip kitchip" href="/kit.html">✦ ${t("kit")}</a>` + state.cats.map((c) => `<a class="chip" href="/index.html?cat=${encodeURIComponent(c.slug)}" aria-current="${!!(state.cat && state.cat.id === c.id)}">${esc(catName(c))}</a>`).join("");
  const subs = state.cat ? metaOf(state.cat).subs : [];
  $("subs").hidden = !browsing || !subs.length;
  $("subs").innerHTML = subs.map(([ar, en]) => `<button type="button" class="chip" data-sub="${esc(ar)}" aria-pressed="${state.sub === ar}">${esc(lang === "en" ? en : ar)}</button>`).join("");
  $("sheetCats").innerHTML = state.cats.map(catCard).join("");
  if (state.view === "mine") { drafts(); return; }
  if (state.error) { v.innerHTML = `<p class="alert">${t("error")} <button class="btn" type="button" id="retry">${t("retry")}</button></p>`; return; }
  if (state.all === null) { v.innerHTML = `<p class="note">${t("loading")}</p>`; return; }
  if (catSlug && !state.cat) { v.innerHTML = empty(t("noCatT"), ` <a href="/index.html">${t("backAll")}</a>`); return; }

  if (state.view === "fav") {
    const f = favs(), list = state.all.filter((p) => f.includes(p.id));
    v.innerHTML = `<div class="sec"><div class="sechead"><h2>${t("tabFav")}</h2></div><p class="note">${t("favNote")}</p><div class="grid">${list.map(tile).join("") || empty(t("favEmptyT"), t("favEmpty"))}</div></div>`;
  } else if (home) {
    let h = `<div class="sec"><div class="sechead"><h2>${t("browse")}</h2></div><div class="rail catrail">${state.cats.map(catCard).join("")}</div></div>`;
    let shown = 0;
    const few = state.all.length <= 8, flat = byKind(state.all);
    if (few && flat.length) { shown = 1; h += `<section class="sec"><div class="sechead"><h2>${t("allT")}</h2><span class="note">${t("count", flat.length)}</span></div><div class="grid">${flat.map(tile).join("")}</div></section>`; }
    for (const c of few ? [] : state.cats) {
      const list = byKind(state.byCat[c.id] || []); if (!list.length) continue; shown++;
      h += `<section class="sec"><div class="sechead"><h2>${esc(catName(c))}</h2><a href="/index.html?cat=${encodeURIComponent(c.slug)}">${t("seeAll")}</a></div><div class="rail">${list.map(tile).join("")}</div></section>`;
    }
    if (!shown) h += `<div class="grid">${empty(t("noKindT", state.kind === "متحرك" ? t("kVideo") : t("kStatic")), t("noKind"))}</div>`;
    v.innerHTML = h;
  } else {
    const list = byKind(state.all), title = state.cat ? catName(state.cat) : t("results");
    const subLabel = state.sub && (subs.find((s) => s[0] === state.sub) || [state.sub, state.sub])[lang === "en" ? 1 : 0];
    const none = state.q || state.sub ? empty(t("noRes"), state.sub ? t("noSub", subLabel) : t("tryOther")) : empty(t("emptyCatT"), t("emptyCat"));
    v.innerHTML = `<div class="sec"><div class="sechead"><h2>${esc(title)}</h2><span class="note">${t("count", list.length)}</span></div><div class="grid">${list.map(tile).join("") || none}</div></div>`;
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
      out.push(`<p><a class="btn" href="/editor.html?mode=${video ? "video" : "static"}${isProd ? "&p=" + encodeURIComponent(slug) : ""}">${t("cont")}: ${esc(label)}</a></p>`);
    }
  } catch (e) {}
  $("drafts").innerHTML = out.join("") || `<p class="note">${t("noDrafts")}</p>`;
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
      state.cats.forEach((c, i) => { state.byCat[c.id] = lists[i]; lists[i].forEach((p) => { if (!state.catOf[p.id]) state.catOf[p.id] = c; }); });
    }
    state.all = (await main).products;
    const eng = state.all.find((p) => String(p.name).includes("خطوبة"));
    if (eng) $("hero").href = info(eng).href;
  } catch (e) { state.error = true; }
  render();
}

/* ---------- التفاعل ---------- */
let timer = 0;
$("q").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => { state.q = $("q").value.trim(); state.view = "all"; load(); }, 350); });
document.querySelector(".seg").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-kind]"); if (!b) return;
  state.kind = b.dataset.kind;
  $$(".seg button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  render();
});
$("subs").addEventListener("click", (e) => { const b = e.target.closest("[data-sub]"); if (!b) return; state.sub = state.sub === b.dataset.sub ? "" : b.dataset.sub; load(); });
$("view").addEventListener("click", (e) => {
  if (e.target.id === "retry") { load(); return; }
  const b = e.target.closest("[data-fav]"); if (!b) return;
  const id = b.dataset.fav, f = favs();
  store.set("namq-favs", f.includes(id) ? f.filter((x) => x !== id) : f.concat(id));
  render();
});
const sheet = $("sheet");
const openSheet = () => { sheet.hidden = false; const c = sheet.querySelector(".catcard"); if (c) c.focus(); };
const closeSheet = () => { sheet.hidden = true; };
document.addEventListener("click", (e) => {
  const v = e.target.closest("[data-view]");
  if (v) { state.view = state.view === v.dataset.view && v.dataset.view !== "all" ? "all" : v.dataset.view; render(); scrollTo(0, 0); return; }
  if (e.target.closest("[data-start]")) { openSheet(); return; }
  if (e.target.closest("[data-close]")) { closeSheet(); return; }
  if (e.target.closest("[data-focus-search]")) { state.view = "all"; render(); scrollTo(0, 0); $("q").focus(); }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) closeSheet(); });
$("lang").addEventListener("click", () => { lang = lang === "en" ? "ar" : "en"; store.set("namq-lang", lang); applyLang(); render(); });
applyLang();
load();
