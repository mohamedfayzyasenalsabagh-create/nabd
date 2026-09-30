// لوحة مالك المنصة: العيادات، الاشتراكات، الدفعات، والإعدادات
import {
  P, list, one, updateDoc, setDoc, query, where, orderBy, serverTimestamp, Timestamp,
  SPECIALTIES, DEFAULT_PLANS, ALL_FEATURES, tsMs, clinicState
} from "./fb.js";
import {
  $, $$, esc, toast, errMsg, modal, confirmBox, info, field, select, empty, tsDate, fmtDate, ymd,
  platformMark, waLink, debounce, applyTheme
} from "./ui.js";
import { S, LS, logout, PLATFORM } from "./app.js";

const main = () => $("#main");
const plans = () => (S.platform?.plans?.length ? S.platform.plans : DEFAULT_PLANS);
const planOf = (id) => plans().find((p) => p.id === id);
const STATUS = { trial: ["تجربة", "warn"], active: ["فعّال", "ok"], suspended: ["موقوف", "danger"], expired: ["منتهٍ", "danger"] };
function statusChip(c) {
  const st = clinicState(c);
  const key = !st.ok && c.status !== "suspended" ? "expired" : c.status;
  const [t, cls] = STATUS[key] || [key, ""];
  return `<span class="chip ${cls}">${t}</span>`;
}
const baseUrl = () => location.origin + location.pathname;

export function start() {
  document.documentElement.style.setProperty("--accent", "#0E7C7B");
  document.title = `لوحة المالك · ${PLATFORM()}`;
  const nav = [["clinics", "العيادات", "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"], ["payments", "الدفعات", "M3 6h18v12H3zM3 10h18"], ["settings", "الإعدادات", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"]];
  $("#app").innerHTML = `
    <header class="topbar"><div class="tb-brand">${platformMark(34)}<span>${esc(PLATFORM())} · لوحة المالك</span></div>
      <div class="row gap"><span class="muted small hide-sm">${esc(S.profile.name || "")}</span><button class="btn small ghost out">خروج</button></div></header>
    <main id="main" class="page"></main>
    <nav class="bottomnav cols-3" aria-label="التنقل">${nav.map(([k, t, d]) => `<a href="#/${k}" data-r="${k}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg><span>${t}</span><b class="badge hidden" data-badge="${k}"></b></a>`).join("")}</nav>`;
  $(".out").onclick = logout;
  window.onhashchange = render;
  render();
}

function routeName() { return (location.hash.replace(/^#\/?/, "").split(/[/?]/)[0]) || "clinics"; }
async function render() {
  const r = routeName();
  $$(".bottomnav a").forEach((a) => a.classList.toggle("on", a.dataset.r === r));
  main().innerHTML = `<div class="loading">جارٍ التحميل…</div>`;
  try {
    const pend = await list(query(P.subPays(), where("status", "==", "pending")));
    const b = $('[data-badge="payments"]'); if (b) { b.textContent = pend.length; b.classList.toggle("hidden", !pend.length); }
    if (r === "payments") return await renderPayments();
    if (r === "settings") return renderSettings();
    return await renderClinics();
  } catch (e) { console.error(e); main().innerHTML = `<p class="alert">${esc(errMsg(e))}</p>`; }
}

// ---------- العيادات ----------
let filter = "all", q = "";
async function renderClinics() {
  const all = (await list(P.clinics())).sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt));
  const now = Date.now();
  const st = all.map((c) => ({ c, s: clinicState(c) }));
  const active = st.filter((x) => x.s.ok && x.c.status === "active");
  const trial = st.filter((x) => x.s.ok && x.c.status === "trial");
  const expired = st.filter((x) => !x.s.ok);
  const soon = st.filter((x) => x.s.ok && x.s.days <= 7);
  const mrr = active.reduce((sum, x) => sum + (Number(planOf(x.c.plan)?.price) || 0), 0);
  const F = { all: st, active, trial, expired, soon };
  let rows = F[filter] || st;
  if (q) rows = rows.filter((x) => [x.c.name, x.c.doctorName, x.c.slug, x.c.ownerEmail, x.c.ownerPhone].join(" ").toLowerCase().includes(q.toLowerCase()));
  main().innerHTML = `
    <h2 class="page-title">العيادات</h2>
    <div class="stats">
      <button class="stat f ${filter === "all" ? "sel" : ""}" data-f="all"><b>${all.length}</b><span>كل العيادات</span></button>
      <button class="stat f ${filter === "active" ? "sel" : ""}" data-f="active"><b>${active.length}</b><span>اشتراك فعّال</span></button>
      <button class="stat f ${filter === "trial" ? "sel" : ""}" data-f="trial"><b>${trial.length}</b><span>في التجربة</span></button>
      <button class="stat f ${filter === "soon" ? "sel" : ""}" data-f="soon"><b>${soon.length}</b><span>تنتهي خلال 7 أيام</span></button>
      <button class="stat f ${filter === "expired" ? "sel" : ""}" data-f="expired"><b>${expired.length}</b><span>منتهية أو موقوفة</span></button>
      <div class="stat"><b>${mrr}$</b><span>الدخل الشهري المتوقع</span></div>
    </div>
    <input class="search" type="search" id="cq" placeholder="بحث بالاسم أو الرمز أو البريد" value="${esc(q)}" aria-label="بحث">
    <section class="card">${rows.length ? `<div class="tbl-wrap"><table class="tbl wide"><thead><tr><th>العيادة</th><th>الاختصاص</th><th>الحالة</th><th>الباقة</th><th>ينتهي</th><th></th></tr></thead><tbody>
      ${rows.map(({ c, s }) => `<tr><td><b>${esc(c.name)}</b><br><small class="muted" dir="ltr">${esc(c.slug || c.id)}</small></td>
        <td>${esc(SPECIALTIES[c.specialty]?.name || c.specialty || "")}</td><td>${statusChip(c)}</td>
        <td>${esc(c.plan === "trial" ? "تجربة" : c.plan === "gift" ? "هدية" : planOf(c.plan)?.name || c.plan || "")}</td>
        <td>${c.plan === "gift" ? "مدى الحياة" : `${esc(fmtDate(ymd(new Date(tsMs(c.expiresAt))), false))}<br><small class="${s.days <= 7 ? "danger-t" : "muted"}">${s.days > 0 ? `بعد ${s.days} يوم` : "انتهى"}</small>`}</td>
        <td><button class="btn small man" data-id="${c.id}">إدارة</button></td></tr>`).join("")}
      </tbody></table></div>` : empty("لا توجد عيادات")}</section>`;
  $$(".stat.f").forEach((b) => b.onclick = () => { filter = b.dataset.f; renderClinics(); });
  $("#cq").oninput = debounce((e) => { q = e.target.value; renderClinics().then(() => { const i = $("#cq"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); }, 250);
  $$(".man").forEach((b) => b.onclick = () => manageClinic(all.find((c) => c.id === b.dataset.id)));
}

async function manageClinic(c) {
  const s = clinicState(c);
  const link = `${baseUrl()}#/c/${c.slug}`;
  await modal(c.name, `
    <table class="kv">
      <tr><th>الطبيب</th><td>${esc(c.doctorName || "")} · ${esc(c.title || "")}</td></tr>
      <tr><th>الاختصاص</th><td>${esc(SPECIALTIES[c.specialty]?.name || "")}</td></tr>
      <tr><th>الحالة</th><td>${statusChip(c)} ${c.plan === "gift" ? "هدية مدى الحياة" : s.days > 0 ? `باقي ${s.days} يوم` : "انتهى الاشتراك"}</td></tr>
      <tr><th>البريد</th><td dir="ltr">${esc(c.ownerEmail || "")}</td></tr>
      <tr><th>الجوال</th><td dir="ltr">${esc(c.ownerPhone || "")}</td></tr>
      <tr><th>رابط الدخول</th><td dir="ltr" class="small">${esc(link)}</td></tr>
      <tr><th>تاريخ التسجيل</th><td>${esc(tsDate(c.createdAt))}</td></tr>
    </table>
    <form class="stack act">
      <h4>تفعيل أو تمديد الاشتراك</h4>
      <div class="grid2">
        ${select("الباقة", "plan", [...plans().map((p) => [p.id, `${p.name} · ${p.price}${p.currency || "$"}`]), ["gift", "هدية مجانية مدى الحياة"]], c.plan === "trial" ? plans()[0].id : c.plan)}
        ${select("المدة", "months", [[1, "شهر"], [3, "3 أشهر"], [6, "6 أشهر"], [12, "سنة"]], 1)}
      </div>
      <button type="button" class="btn primary go">تفعيل</button>
    </form>
    <div class="row gap wrap">
      ${c.ownerPhone ? `<a class="btn small" target="_blank" rel="noopener" href="${esc(waLink(c.ownerPhone, `مرحباً د. ${c.doctorName}، `))}">مراسلة واتساب</a>` : ""}
      ${c.status === "suspended" ? `<button class="btn small unsus">إلغاء الإيقاف</button>` : `<button class="btn small danger sus">إيقاف العيادة</button>`}
    </div>`, {
    ok: null, cancel: "إغلاق", wide: true,
    onOpen: (w) => {
      w.querySelector(".go").onclick = async () => {
        const f = w.querySelector(".act");
        const plan = f.plan.value, months = Number(f.months.value);
        try {
          await activate(c, plan, months);
          toast("تم التفعيل"); w.remove(); render();
        } catch (e) { toast(errMsg(e), true); }
      };
      w.querySelector(".sus")?.addEventListener("click", async () => {
        if (!(await confirmBox("إيقاف العيادة", "ستصبح العيادة للقراءة فقط حتى إلغاء الإيقاف.", "إيقاف", true))) return;
        await updateDoc(P.clinic(c.id), { status: "suspended" }); w.remove(); render();
      });
      w.querySelector(".unsus")?.addEventListener("click", async () => {
        await updateDoc(P.clinic(c.id), { status: c.plan === "trial" ? "trial" : "active" }); w.remove(); render();
      });
    }
  });
}

export async function activate(c, planId, months) {
  const fresh = (await one(P.clinic(c.id))) || c;
  if (planId === "gift") {
    await updateDoc(P.clinic(c.id), {
      status: "active", plan: "gift", expiresAt: Timestamp.fromMillis(Date.UTC(2100, 0, 1)),
      features: ALL_FEATURES, maxDoctors: 50, maxStaff: 50, activatedAt: serverTimestamp()
    });
    return;
  }
  const p = planOf(planId);
  if (!p) throw new Error("باقة غير معروفة");
  const from = Math.max(Date.now(), fresh.status === "active" ? tsMs(fresh.expiresAt) : 0);
  const d = new Date(from); d.setMonth(d.getMonth() + months);
  await updateDoc(P.clinic(c.id), {
    status: "active", plan: p.id, expiresAt: Timestamp.fromMillis(d.getTime()),
    features: p.features || ALL_FEATURES, maxDoctors: p.maxDoctors || 1, maxStaff: p.maxStaff || 1, activatedAt: serverTimestamp()
  });
}

// ---------- الدفعات ----------
async function renderPayments() {
  const all = (await list(P.subPays())).sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt));
  const pend = all.filter((p) => p.status === "pending"), done = all.filter((p) => p.status !== "pending");
  const M = { syriatel: "سيريتل كاش", mtn: "MTN كاش", bank: "تحويل بنكي", cash: "نقداً", other: "أخرى" };
  const row = (p) => `<li class="req">
    <div class="row-between"><b>${esc(p.clinicName)}</b>${p.status === "pending" ? `<span class="chip warn">بانتظار المراجعة</span>` : p.status === "approved" ? `<span class="chip ok">مقبولة</span>` : `<span class="chip danger">مرفوضة</span>`}</div>
    <div>${esc(planOf(p.plan)?.name || p.plan)} · ${esc(p.months)} شهر · <b>${esc(p.amount)}</b> · ${esc(M[p.method] || p.method)}</div>
    <div class="muted small">رقم العملية: <span dir="ltr">${esc(p.txn || "")}</span> · ${esc(tsDate(p.createdAt))}${p.note ? ` · ${esc(p.note)}` : ""}</div>
    ${p.status === "pending" ? `<div class="row gap"><button class="btn primary small ap" data-id="${p.id}">قبول وتفعيل</button><button class="btn small rj" data-id="${p.id}">رفض</button></div>` : ""}</li>`;
  main().innerHTML = `<h2 class="page-title">دفعات الاشتراك</h2>
    <section class="card"><h3>بانتظار المراجعة</h3>${pend.length ? `<ul class="plain">${pend.map(row).join("")}</ul>` : empty("لا توجد دفعات جديدة")}</section>
    <section class="card"><h3>السابقة</h3>${done.length ? `<ul class="plain">${done.slice(0, 100).map(row).join("")}</ul>` : empty("لا يوجد")}</section>`;
  $$(".ap").forEach((b) => b.onclick = async () => {
    const p = all.find((x) => x.id === b.dataset.id);
    try {
      const c = await one(P.clinic(p.clinicId));
      await activate(c, p.plan, Number(p.months) || 1);
      await updateDoc(P.subPay(p.id), { status: "approved", reviewedAt: serverTimestamp() });
      toast("تم قبول الدفعة وتفعيل الاشتراك"); render();
    } catch (e) { toast(errMsg(e), true); }
  });
  $$(".rj").forEach((b) => b.onclick = async () => {
    const r = await modal("رفض الدفعة", `<form>${field("السبب (يظهر للعيادة)", "reason", { required: true })}</form>`, { ok: "رفض", danger: true });
    if (!r) return;
    await updateDoc(P.subPay(b.dataset.id), { status: "rejected", reason: r.reason, reviewedAt: serverTimestamp() });
    render();
  });
}

// ---------- الإعدادات ----------
function renderSettings() {
  const pf = S.platform || {};
  const pay = pf.payment || {};
  const ps = plans().map((p) => ({ ...p }));
  main().innerHTML = `<h2 class="page-title">إعدادات المنصة</h2>
    <form id="ps" class="stack">
      <section class="card stack"><h3>عام</h3>
        ${field("اسم المنصة", "name", { value: pf.name || "نبض", required: true })}
        <div class="row gap wrap"><span class="muted small">المظهر:</span>
          ${["auto", "light", "dark"].map((m) => `<button type="button" class="btn small th ${(LS.get("theme") || "auto") === m ? "primary" : ""}" data-m="${m}">${{ auto: "تلقائي", light: "فاتح", dark: "داكن" }[m]}</button>`).join("")}</div>
      </section>
      <section class="card stack"><h3>طرق الدفع (تظهر للعيادات)</h3>
        ${field("رقم سيريتل كاش", "syriatel", { value: pay.syriatel, attrs: 'dir="ltr"' })}
        ${field("رقم MTN كاش", "mtn", { value: pay.mtn, attrs: 'dir="ltr"' })}
        ${field("بيانات التحويل البنكي", "bank", { type: "textarea", value: pay.bank, attrs: "data-novoice" })}
        ${field("رقم واتساب للتواصل", "whatsapp", { value: pay.whatsapp, attrs: 'dir="ltr"' })}
        ${field("ملاحظة للعيادات", "notes", { type: "textarea", value: pay.notes, attrs: "data-novoice" })}
      </section>
      <section class="card stack"><h3>الباقات</h3>
        ${ps.map((p, i) => `<fieldset class="plan-edit"><legend>${esc(p.name)}</legend>
          <div class="grid2">${field("الاسم", `pn${i}`, { value: p.name, required: true })}${field("السعر الشهري", `pp${i}`, { type: "number", value: p.price, attrs: 'min="0" step="0.5"' })}</div>
          <div class="grid2">${field("العملة", `pc${i}`, { value: p.currency || "$" })}${field("أقصى عدد أطباء / موظفين", `pl${i}`, { type: "number", value: p.maxDoctors, attrs: 'min="1"' })}</div>
          ${field("المزايا (سطر لكل ميزة)", `pk${i}`, { type: "textarea", value: (p.perks || []).join("\n"), attrs: "data-novoice" })}
          <div class="row gap wrap">${[["booking", "صفحة الحجز"], ["inventory", "المخزون"], ["qr", "وصفة QR"], ["multiDoctor", "تعدد الأطباء"]].map(([k, t]) => `<label class="check small"><input type="checkbox" name="pf${i}_${k}" ${p.features?.[k] ? "checked" : ""}><span>${t}</span></label>`).join("")}</div>
        </fieldset>`).join("")}
      </section>
      <button class="btn primary block">حفظ الإعدادات</button>
    </form>
    <section class="card stack"><h3>روابط مفيدة</h3>
      <p>صفحة المنصة للعيادات الجديدة:</p><code class="copy" dir="ltr">${esc(baseUrl())}#/home</code>
      <p>تسجيل عيادة جديدة مباشرة:</p><code class="copy" dir="ltr">${esc(baseUrl())}#/signup</code>
    </section>`;
  $$(".th").forEach((b) => b.onclick = () => { LS.set("theme", b.dataset.m); applyTheme(b.dataset.m); renderSettings(); });
  $$("code.copy").forEach((c) => c.onclick = async () => { try { await navigator.clipboard.writeText(c.textContent); toast("تم النسخ"); } catch {} });
  $("#ps").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const newPlans = ps.map((p, i) => ({
      ...p, name: f[`pn${i}`].value.trim(), price: Number(f[`pp${i}`].value) || 0, currency: f[`pc${i}`].value.trim() || "$",
      maxDoctors: Number(f[`pl${i}`].value) || 1, maxStaff: Number(f[`pl${i}`].value) || 1,
      perks: f[`pk${i}`].value.split("\n").map((x) => x.trim()).filter(Boolean),
      features: Object.fromEntries(["booking", "inventory", "qr", "multiDoctor"].map((k) => [k, f[`pf${i}_${k}`].checked])),
    }));
    const data = {
      name: f.name.value.trim(), plans: newPlans,
      payment: { syriatel: f.syriatel.value.trim(), mtn: f.mtn.value.trim(), bank: f.bank.value.trim(), whatsapp: f.whatsapp.value.trim(), notes: f.notes.value.trim() },
      updatedAt: serverTimestamp()
    };
    try { await updateDoc(P.platform(), data); S.platform = { ...S.platform, ...data }; toast("حُفظت الإعدادات"); start(); }
    catch (err) { toast(errMsg(err), true); }
  };
}
