import { createPlansStore } from "/js/wix/plans-store.js";
import { createPlanPurchaseStore } from "/js/wix/plan-purchase-store.js";

const root = document.getElementById("plans");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const AR = { "per year": "سنويًا", "per month": "شهريًا", "per week": "أسبوعيًا" };
const money = (t) => { const n = String(t || "").match(/[0-9.,]+/); return n ? Number(n[0].replace(/,/g, "")).toLocaleString("en", { maximumFractionDigits: 2 }) + " د.إ" : t; };
const plans = createPlansStore();
const purchase = createPlanPurchaseStore();

function render() {
  const list = plans.getState();
  const p = purchase.getState();
  if (list.plans === null) { root.innerHTML = '<p class="note">جارٍ التحميل…</p>'; return; }
  if (list.error) { root.innerHTML = '<p class="alert">' + esc(list.error) + "</p>"; return; }
  if (!list.plans.length) { root.innerHTML = '<p class="note">لا توجد باقات اشتراك متاحة حاليًا.</p>'; return; }
  let html = "";
  list.plans.forEach((plan) => {
    const busy = p.purchasingId === plan.id;
    html += '<article class="plan"><h2>' + esc(plan.name) + "</h2>"
      + '<p><span class="amount">' + esc(money(plan.price)) + "</span> " + esc(AR[plan.billing] || plan.billing) + "</p>";
    (plan.fees || []).forEach((f) => { html += '<p class="note">' + esc(f.name) + " " + esc(f.amount) + "</p>"; });
    if (plan.duration) html += '<p class="note">' + esc(plan.duration) + "</p>";
    if (plan.description) html += "<p>" + esc(plan.description) + "</p>";
    if ((plan.perks || []).length) html += "<ul>" + plan.perks.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>";
    if (plan.buyable) {
      html += '<button class="btn pri" type="button" data-plan="' + esc(plan.id) + '"' + (p.purchasingId ? " disabled" : "") + ">"
        + (busy ? "جارٍ التحويل إلى الدفع…" : "اشترك") + "</button>";
    }
    html += "</article>";
  });
  if (p.error) html += '<p class="alert" role="alert">' + esc(p.error) + "</p>";
  root.innerHTML = html;
}

plans.subscribe(render);
purchase.subscribe(render);
render();
plans.start();
root.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-plan]");
  if (b) purchase.purchase(b.dataset.plan).catch(() => {});
});