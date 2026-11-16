"use strict";
/* نمق — أداة إعداد القوالب (محلية: localStorage + IndexedDB). لا تكتب في المتجر. */
const $ = (id) => document.getElementById(id);
const BASE = ["Tajawal", "Amiri", "Aref Ruqaa", "Reem Kufi"];
const KEY = "namq-tpls";
const idb = () => new Promise((r, j) => { const q = indexedDB.open("namq", 1); q.onupgradeneeded = () => q.result.createObjectStore("f"); q.onsuccess = () => r(q.result); q.onerror = () => j(q.error); });
const fput = async (k, v) => { const d = await idb(); return new Promise((r, j) => { const t = d.transaction("f", "readwrite"); t.objectStore("f").put(v, k); t.oncomplete = r; t.onerror = () => j(t.error); }); };
const fget = async (k) => { const d = await idb(); return new Promise((r) => { const q = d.transaction("f").objectStore("f").get(k); q.onsuccess = () => r(q.result); q.onerror = () => r(null); }); };
const fdel = async (k) => { const d = await idb(); return new Promise((r) => { const t = d.transaction("f", "readwrite"); t.objectStore("f").delete(k); t.oncomplete = r; t.onerror = r; }); };

let L = [];
try { L = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { L = []; }
let cur = null, timer = 0;
const uid = () => "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const get = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
const set = (o, p, v) => { const ks = p.split("."), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };

function persist(reload) {
  cur.v = (cur.v || 0) + 1;
  try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) { alert("تعذّر الحفظ: مساحة المتصفح ممتلئة."); }
  if (reload !== false) { clearTimeout(timer); timer = setTimeout(preview, 350); }
}
function preview() {
  if (!cur) return;
  $("pv").src = "/editor.html?tpl=" + cur.id + "&admin=1&v=" + cur.v;
  $("asClient").href = "/editor.html?tpl=" + cur.id;
}

const FIELDS = {
  text: [["label", "اسم الحقل", "t"], ["text", "النص الافتراضي", "ta"], ["font", "الخط", "font"], ["size", "حجم الخط", "n"], ["color", "اللون", "c"], ["align", "المحاذاة", "al"], ["x", "X", "n"], ["y", "Y", "n"], ["box.w", "عرض المساحة", "n"], ["box.h", "ارتفاع المساحة", "n"], ["required", "إجباري", "b"]],
  image: [["label", "اسم الحقل", "t"], ["frame.x", "X", "n"], ["frame.y", "Y", "n"], ["frame.w", "العرض", "n"], ["frame.h", "الارتفاع", "n"], ["frame.round", "إطار دائري", "b"], ["movable", "العميل يحرّك الإطار", "b"], ["resizable", "العميل يغيّر الحجم", "b"], ["required", "إجباري", "b"]],
  mono: [["label", "اسم الحقل", "t"], ["a", "حرف العريس", "t"], ["b", "حرف العروس", "t"], ["font", "الخط", "font"], ["size", "الحجم", "n"], ["color", "اللون", "c"], ["gap", "التقارب", "n"], ["rise", "الارتفاع", "n"], ["x", "X", "n"], ["y", "Y", "n"], ["required", "إجباري", "b"]],
};
const TIMING = [["in", "يظهر عند (ثانية)", "n"], ["out", "يختفي عند (ثانية)", "n"]];
const KIND = { text: "نص", image: "صورة", mono: "رمز العروسين" };

function input(i, [p, label, t], e) {
  const v = get(e, p), a = `data-i="${i}" data-p="${p}" data-t="${t}"`;
  if (t === "b") return `<label class="c"><input type="checkbox" ${a} ${v ? "checked" : ""}> ${label}</label>`;
  if (t === "ta") return `<label class="f w">${label}<textarea rows="2" ${a}>${esc(v)}</textarea></label>`;
  if (t === "font") return `<label class="f">${label}<select ${a}>${cur.fonts.map((f) => `<option ${f === v ? "selected" : ""}>${esc(f)}</option>`).join("")}</select></label>`;
  if (t === "al") return `<label class="f">${label}<select ${a}>${[["right", "يمين"], ["center", "وسط"], ["left", "يسار"]].map(([k, n]) => `<option value="${k}" ${k === v ? "selected" : ""}>${n}</option>`).join("")}</select></label>`;
  if (t === "c") return `<label class="f">${label}<input type="color" ${a} value="${esc(v)}"></label>`;
  if (t === "n") return `<label class="f">${label}<input type="number" step="any" ${a} value="${esc(v)}"></label>`;
  return `<label class="f">${label}<input type="text" ${a} value="${esc(v)}"></label>`;
}
function render() {
  $("pick").innerHTML = L.map((t) => `<option value="${t.id}" ${cur && t.id === cur.id ? "selected" : ""}>${esc(t.name)} — ${t.kind === "video" ? "متحرك" : "ثابت"} ${t.w}×${t.h}</option>`).join("") || "<option>لا توجد قوالب بعد</option>";
  $("work").hidden = $("side").hidden = !cur;
  if (!cur) return;
  $("t-name").value = cur.name; $("t-w").value = cur.w; $("t-h").value = cur.h; $("t-ref").value = cur.refT || 0;
  $("refWrap").hidden = cur.kind !== "video";
  $("bgInfo").textContent = cur.bgName ? `الخلفية: ${cur.bgName} — ${cur.kind === "video" ? "فيديو، المدة " + (cur.duration || 0).toFixed(2) + " ث" : "صورة"} · المقاس النهائي ${cur.w}×${cur.h}` : "لم تُرفع خلفية بعد — ستظهر خلفية تجريبية في المعاينة.";
  $("fonts").innerHTML = BASE.concat(cur.customFonts).map((f) => `<label class="c"><input type="checkbox" data-font="${esc(f)}" ${cur.fonts.includes(f) ? "checked" : ""}> ${esc(f)}</label>`).join("");
  $("els").innerHTML = cur.elements.map((e, i) => {
    const fs = FIELDS[e.type].concat(cur.kind === "video" && e.type === "text" ? TIMING : []);
    const plain = fs.filter((f) => f[2] !== "b"), checks = fs.filter((f) => f[2] === "b");
    return `<details class="card el" ${i === render.open ? "open" : ""} data-el="${i}"><summary>${esc(e.label)} <span class="note">· ${e.kind === "logo" ? "شعار" : KIND[e.type]} · ${e.required ? "إجباري" : "اختياري"}</span></summary>
      <div class="grid">${plain.map((f) => input(i, f, e)).join("")}</div>
      <div class="row" style="margin-top:8px">${checks.map((f) => input(i, f, e)).join("")}</div>
      <div class="row" style="margin-top:8px"><button class="btn" data-up="${i}">▲</button><button class="btn" data-down="${i}">▼</button><button class="btn" data-rm="${i}">حذف العنصر</button></div></details>`;
  }).join("") || '<p class="note">أضف أول عنصر من الأزرار أعلاه.</p>';
}
function select(t) { cur = t || null; render.open = -1; render(); preview(); }

function addEl(kind) {
  const w = cur.w, h = cur.h, n = cur.elements.length + 1, id = "e" + Date.now().toString(36);
  let e;
  if (kind === "text") e = { id, type: "text", label: "نص " + n, text: "نص تجريبي", font: cur.fonts[0] || "Tajawal", weight: 400, size: Math.round(w * 0.06), color: "#222222", align: "center", x: w / 2, y: Math.round(h / 2), box: { w: Math.round(w * 0.78), h: Math.round(w * 0.2) }, required: true };
  else if (kind === "mono") e = { id, type: "mono", label: "رمز العروسين", a: "س", b: "أ", font: cur.fonts[0] || "Aref Ruqaa", size: Math.round(w * 0.28), color: "#C9A86A", gap: 22, rise: 16, x: w / 2, y: Math.round(h * 0.33), required: false };
  else e = { id, type: "image", label: kind === "logo" ? "الشعار" : "صورة " + n, frame: { x: w / 2, y: Math.round(h * (kind === "logo" ? 0.88 : 0.33)), w: Math.round(w * (kind === "logo" ? 0.28 : 0.35)), h: Math.round(w * (kind === "logo" ? 0.15 : 0.35)), round: false }, movable: kind === "logo", resizable: kind === "logo", required: false };
  if (kind === "logo") e.kind = "logo";
  if (cur.kind === "video" && kind === "text") { e.in = 0.3; e.out = 99; }
  cur.elements.push(e); render.open = cur.elements.length - 1; render(); persist();
}

$("new").onclick = () => { const t = { id: uid(), name: "قالب جديد " + (L.length + 1), kind: "static", w: 1080, h: 1920, refT: 0, v: 0, fonts: BASE.slice(), customFonts: [], newText: { in: 0.5, out: 99 }, elements: [] }; L.push(t); select(t); persist(); };
$("dup").onclick = async () => { if (!cur) return; const t = JSON.parse(JSON.stringify(cur)); t.id = uid(); t.name = cur.name + " (نسخة)"; const b = await fget("bg:" + cur.id); if (b) await fput("bg:" + t.id, b); L.push(t); select(t); persist(); };
$("del").onclick = async () => { if (!cur || !confirm("حذف القالب «" + cur.name + "» من هذا الجهاز؟")) return; await fdel("bg:" + cur.id); L = L.filter((t) => t !== cur); localStorage.setItem(KEY, JSON.stringify(L)); select(L[0]); };
$("exp").onclick = () => { if (!cur) return; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(cur, null, 2)], { type: "application/json" })); a.download = "namq-template-" + cur.id + ".json"; document.body.appendChild(a); a.click(); a.remove(); };
$("imp").onchange = async (ev) => { const f = ev.target.files[0]; if (!f) return; try { const t = JSON.parse(await f.text()); if (!t.elements || !t.w) throw 0; t.id = uid(); delete t.bgName; L.push(t); select(t); persist(); } catch (e) { alert("ملف القالب غير صالح."); } ev.target.value = ""; };
$("pick").onchange = () => select(L.find((t) => t.id === $("pick").value));
$("reload").onclick = preview;
document.querySelectorAll("[data-add]").forEach((b) => (b.onclick = () => addEl(b.dataset.add)));
$("t-name").oninput = () => { cur.name = $("t-name").value; persist(false); };
$("t-w").onchange = () => { cur.w = Math.max(100, +$("t-w").value || 1080); persist(); };
$("t-h").onchange = () => { cur.h = Math.max(100, +$("t-h").value || 1920); persist(); };
$("t-ref").onchange = () => { cur.refT = Math.max(0, +$("t-ref").value || 0); persist(); };

$("bg").onchange = async (ev) => {
  const f = ev.target.files[0]; if (!f) return;
  const url = URL.createObjectURL(f), video = f.type.startsWith("video");
  try {
    if (video) { const v = document.createElement("video"); v.muted = true; v.preload = "metadata"; await new Promise((r, j) => { v.onloadedmetadata = r; v.onerror = j; v.src = url; }); cur.w = v.videoWidth; cur.h = v.videoHeight; cur.duration = v.duration; if (!cur.refT || cur.refT >= v.duration) cur.refT = Math.round(v.duration * 8) / 10; }
    else { const im = new Image(); await new Promise((r, j) => { im.onload = r; im.onerror = j; im.src = url; }); cur.w = im.naturalWidth; cur.h = im.naturalHeight; }
  } catch (e) { alert("تعذّر قراءة الملف."); return; }
  cur.kind = video ? "video" : "static"; cur.bgName = f.name;
  await fput("bg:" + cur.id, f); render(); persist();
};
$("font").onchange = async (ev) => {
  const f = ev.target.files[0]; if (!f) return;
  const name = f.name.replace(/\.[^.]+$/, "").replace(/["\\]/g, "").trim() || "خط";
  try { const ff = new FontFace(name, await f.arrayBuffer()); await ff.load(); document.fonts.add(ff); } catch (e) { alert("ملف الخط غير صالح."); return; }
  await fput("font:" + name, f);
  if (!cur.customFonts.includes(name)) cur.customFonts.push(name);
  if (!cur.fonts.includes(name)) cur.fonts.push(name);
  ev.target.value = ""; render(); persist();
};
$("fonts").onchange = (ev) => { const f = ev.target.dataset.font; if (!f) return; cur.fonts = BASE.concat(cur.customFonts).filter((x) => (x === f ? ev.target.checked : cur.fonts.includes(x))); if (!cur.fonts.length) cur.fonts = [f]; render(); persist(); };

$("els").addEventListener("input", (ev) => {
  const t = ev.target, i = t.dataset.i; if (i == null) return;
  const e = cur.elements[+i], k = t.dataset.t;
  set(e, t.dataset.p, k === "b" ? t.checked : k === "n" ? (t.value === "" ? 0 : +t.value) : t.value);
  persist();
});
$("els").addEventListener("click", (ev) => {
  const b = ev.target.closest("button"); if (!b) return;
  const E = cur.elements;
  if (b.dataset.rm != null) E.splice(+b.dataset.rm, 1);
  else if (b.dataset.up != null && +b.dataset.up > 0) { const i = +b.dataset.up; [E[i - 1], E[i]] = [E[i], E[i - 1]]; render.open = i - 1; }
  else if (b.dataset.down != null && +b.dataset.down < E.length - 1) { const i = +b.dataset.down; [E[i + 1], E[i]] = [E[i], E[i + 1]]; render.open = i + 1; }
  else return;
  render(); persist();
});
$("els").addEventListener("toggle", (ev) => { if (ev.target.open) render.open = +ev.target.dataset.el; }, true);

/* السحب داخل المعاينة يعيد الموضع إلى تعريف القالب */
addEventListener("message", (ev) => {
  if (ev.origin !== location.origin || !ev.data || !ev.data.namq || !cur) return;
  const i = cur.elements.findIndex((x) => x.id === ev.data.id); if (i < 0) return;
  const e = cur.elements[i];
  if (e.type === "image") { e.frame.x = Math.round(ev.data.frame.x); e.frame.y = Math.round(ev.data.frame.y); } else { e.x = ev.data.x; e.y = ev.data.y; }
  render.open = i; render(); persist(false);
});
select(L[0]);
