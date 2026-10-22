// لوحة مالك المنصة: العيادات، الاشتراكات، الدفعات، والإعدادات
import {
  P, list, one, doc, updateDoc, setDoc, query, where, orderBy, serverTimestamp, Timestamp, collection, db,
  SPECIALTIES, DEFAULT_PLANS, ALL_FEATURES, tsMs, clinicState, yearlyDisc, periodPrice
} from "./fb.js";
import {
  $, $$, esc, toast, errMsg, modal, confirmBox, info, field, select, empty, tsDate, fmtDate, ymd,
  platformMark, waLink, debounce, applyTheme, pickFile, compressImage
} from "./ui.js";
import { PUB } from "./ui.js";
import { S, LS, logout, PLATFORM } from "./app.js";

const main = () => $("#main");
const plans = () => (S.platform?.plans?.length ? S.platform.plans : DEFAULT_PLANS);
const planOf = (id) => plans().find((p) => p.id === id);
export const PAY_METHODS = { shamcash: "شام كاش", syriatel: "سيريتل كاش", mtn: "MTN كاش", bank: "تحويل بنكي", cash: "نقداً", other: "أخرى" };
const STATUS = { trial: ["تجربة", "warn"], active: ["فعّال", "ok"], suspended: ["موقوف", "danger"], expired: ["منتهٍ", "danger"] };
function statusChip(c) {
  const st = clinicState(c);
  const key = !st.ok && c.status !== "suspended" ? "expired" : c.status;
  const [t, cls] = STATUS[key] || [key, ""];
  return `<span class="chip ${cls}">${t}</span>`;
}
const baseUrl = () => PUB;

export function start() {
  document.documentElement.style.setProperty("--accent", "#0E7C7B");
  document.title = `لوحة المالك · ${PLATFORM()}`;
  const nav = [["clinics", "العيادات", "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"], ["payments", "الدفعات", "M3 6h18v12H3zM3 10h18"], ["errors", "الأعطال", "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"], ["settings", "الإعدادات", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"]];
  $("#app").innerHTML = `
    <header class="topbar"><div class="tb-brand">${platformMark(34)}<span>${esc(PLATFORM())} · لوحة المالك</span></div>
      <div class="row gap"><span class="muted small hide-sm">${esc(S.profile.name || "")}</span><button class="btn small ghost out">خروج</button></div></header>
    <main id="main" class="page"></main>
    <nav class="bottomnav" aria-label="التنقل">${nav.map(([k, t, d]) => `<a href="#/${k}" data-r="${k}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg><span>${t}</span><b class="badge hidden" data-badge="${k}"></b></a>`).join("")}</nav>`;
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
    list(query(collection(db, "errors"), where("at", ">=", Timestamp.fromMillis(Date.now() - 864e5)))).then((e) => { const x = $('[data-badge="errors"]'); if (x) { x.textContent = e.length; x.classList.toggle("hidden", !e.length); } }).catch(() => {});
    if (r === "payments") return await renderPayments();
    if (r === "settings") return renderSettings();
    if (r === "errors") return await renderErrors();
    return await renderClinics();
  } catch (e) { console.error(e); main().innerHTML = `<p class="alert">${esc(errMsg(e))}</p>`; }
}

// ---------- أعطال التطبيق (تُسجَّل تلقائياً من أجهزة المستخدمين، دون بيانات مرضى) ----------
async function renderErrors() {
  const arr = (await list(query(collection(db, "errors"), where("at", ">=", Timestamp.fromMillis(Date.now() - 14 * 864e5))))).sort((a, b) => tsMs(b.at) - tsMs(a.at));
  const groups = {};
  arr.forEach((e) => { const g = (groups[e.msg] ||= { msg: e.msg, n: 0, last: e, routes: new Set(), roles: new Set(), clinics: new Set() }); g.n++; g.routes.add(e.route); g.roles.add(e.role); if (e.cid) g.clinics.add(e.cid); });
  const gs = Object.values(groups).sort((a, b) => tsMs(b.last.at) - tsMs(a.last.at));
  main().innerHTML = `<h2 class="page-title">أعطال التطبيق</h2>
    <p class="muted small">تُسجَّل تلقائياً من أجهزة المستخدمين خلال آخر 14 يوماً: رسالة الخطأ ومكانه فقط، دون أي بيانات مرضى.</p>
    ${gs.length ? gs.map((g) => `<section class="card"><div class="row-between"><b class="notr" dir="ltr" style="word-break:break-word">${esc(g.msg)}</b><span class="chip ${g.n > 3 ? "danger" : ""}">${g.n} مرة</span></div>
      <p class="muted small">آخر مرة: ${esc(tsDate(g.last.at))} · الصفحات: <span dir="ltr">${esc([...g.routes].join(" ، "))}</span> · الأدوار: ${esc([...g.roles].join("، "))} · عدد العيادات: ${g.clinics.size}</p>
      <details><summary class="small">التفاصيل التقنية</summary><pre dir="ltr" class="small" style="white-space:pre-wrap">${esc(g.last.stack || "")}\n${esc(g.last.ua || "")}</pre></details></section>`).join("") : empty("لا توجد أعطال مسجلة ✓")}`;
}

// ---------- العيادات ----------
let filter = "all", q = "";
const FL = { active: "اشتراك فعّال", trial: "في التجربة", soon: "تنتهي خلال 7 أيام", expired: "منتهية أو موقوفة", used: "تستخدم التطبيق هذا الأسبوع" };
async function renderClinics() {
  const all = (await list(P.clinics())).sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt));
  const now = Date.now();
  const st = all.map((c) => ({ c, s: clinicState(c) }));
  const active = st.filter((x) => x.s.ok && x.c.status === "active");
  const trial = st.filter((x) => x.s.ok && x.c.status === "trial");
  const expired = st.filter((x) => !x.s.ok);
  const soon = st.filter((x) => x.s.ok && x.s.days <= 7);
  const mrr = active.reduce((sum, x) => sum + (Number(planOf(x.c.plan)?.price) || 0), 0);
  // المقبوض من الاشتراكات: هذا الشهر والشهر السابق
  const pays = await list(P.subPays()).catch(() => []);
  const amt = (p) => Number(String(p.amount || "").replace(/[^\d.]/g, "")) || 0;
  const mKey = (t) => { const d = new Date(tsMs(t)); return `${d.getFullYear()}-${d.getMonth()}`; };
  const nowD = new Date(), thisM = `${nowD.getFullYear()}-${nowD.getMonth()}`, lastD = new Date(nowD.getFullYear(), nowD.getMonth() - 1, 1), lastM = `${lastD.getFullYear()}-${lastD.getMonth()}`;
  const approved = pays.filter((p) => p.status === "approved");
  const got = (k) => approved.filter((p) => mKey(p.reviewedAt || p.createdAt) === k).reduce((s, p) => s + amt(p), 0);
  const gotThis = got(thisM), gotLast = got(lastM);
  // عيادات تحتاج متابعة: تنتهي قريباً أو انتهت خلال آخر 30 يوماً
  const follow = st.filter((x) => x.c.plan !== "gift" && x.c.status !== "suspended" && x.s.days <= 7 && x.s.days > -30)
    .sort((a, b) => a.s.days - b.s.days);
  // استخدام العيادات: آخر نشاط وعدد المرضى ومواعيد الشهر (أرقام فقط)
  const acts = Object.fromEntries((await list(collection(db, "activity")).catch(() => [])).map((a) => [a.id, a]));
  const ago = (id) => { const a = acts[id]; return a?.lastAt ? Math.floor((Date.now() - tsMs(a.lastAt)) / 864e5) : null; };
  // الاستخدام السابق من الحسابات (موجود منذ البداية): حسابات المرضى وآخر إضافة ودخول الفريق — أرقام فقط
  const H = {};
  (await list(P.users()).catch(() => [])).forEach((u) => {
    if (!u.clinicId) return;
    const h = (H[u.clinicId] ||= { pts: 0, ptsOpened: 0, staff: 0, staffIn: 0, last: 0 });
    if (u.role === "patient") { h.pts++; if (u.consentAt) h.ptsOpened++; }
    else { h.staff++; if (!u.mustChangePassword) h.staffIn++; }
    h.last = Math.max(h.last, tsMs(u.createdAt) || 0);
  });
  const hist = (id) => { const h = H[id]; if (!h) return ""; const d = h.last ? Math.floor((Date.now() - h.last) / 864e5) : null;
    return `<br><small class="muted">منذ البداية: ${h.pts} حساب مريض${d !== null ? ` · آخر إضافة ${d ? `منذ ${d} يوم` : "اليوم"}` : ""}</small>`; };
  const usage = (id) => {
    const a = acts[id], d = ago(id);
    if (d === null) return `<span class="chip">⚪ لا نشاط مسجل بعد</span>${hist(id)}`;
    const lbl = d === 0 ? "🟢 اليوم" : d <= 3 ? `🟢 منذ ${d} يوم` : d <= 14 ? `🟡 منذ ${d} يوم` : `🔴 منذ ${d} يوم`;
    return `<span class="chip">${lbl}</span><br><small class="muted">${a.patients || 0} مريض · ${a.apptsMonth || 0} موعد هذا الشهر</small>${hist(id)}`;
  };
  const usedWeek = all.filter((c) => { const d = ago(c.id); return d !== null && d <= 7; }).length;
  const used = st.filter((x) => { const d = ago(x.c.id); return d !== null && d <= 7; });
  const F = { all: st, active, trial, expired, soon, used };
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
      <button class="stat f ${filter === "used" ? "sel" : ""}" data-f="used"><b>${usedWeek}</b><span>عيادات تستخدم التطبيق هذا الأسبوع</span></button>
      <button class="stat f" data-f="active"><b>${mrr}$</b><span>الدخل الشهري المتوقع</span></button>
      <a class="stat" href="#/payments"><b>${gotThis}$</b><span>المقبوض هذا الشهر${gotLast ? ` (السابق ${gotLast}$)` : ""}</span></a>
      <button class="stat us-stat"><b>…</b><span>استهلاك Firebase اليوم (من الحد المجاني)</span></button>
      <button class="stat dl-stat"><b>…</b><span>تحميلات تطبيق أندرويد</span></button>
      <button class="stat vs vs-today"><b>…</b><span>زوار الموقع اليوم</span></button>
      <button class="stat vs vs-month"><b>…</b><span>زوار الموقع هذا الشهر</span></button>
      <button class="stat vs vs-all"><b>…</b><span>كل زوار الموقع (الزيارات)</span></button>
    </div>
    ${follow.length ? `<section class="card follow"><h3>⏰ تحتاج متابعة للتجديد</h3><p class="muted small">أرسل تذكيراً بالتجديد قبل انتهاء الاشتراك، فالعيادة المنتهية تصبح للقراءة فقط.</p>
      <ul class="remind-list">${follow.map(({ c, s: x }) => `<li class="${c.renewRemindedAt && tsMs(c.renewRemindedAt) > Date.now() - 3 * 864e5 ? "done" : ""}">
        <span class="t ${x.days <= 0 ? "danger-t" : ""}">${x.days > 0 ? `${x.days} يوم` : x.days === 0 ? "اليوم" : `منذ ${-x.days} يوم`}</span>
        <span class="n">${esc(c.name)}<small>${c.status === "trial" ? "تجربة مجانية" : esc(planOf(c.plan)?.name || c.plan || "")} · <span dir="ltr">${esc(c.ownerPhone || "")}</span></small></span>
        ${c.ownerPhone ? `<span class="row gap"><a class="btn small primary rn" data-id="${esc(c.id)}" target="_blank" rel="noopener" href="${esc(waLink(c.ownerPhone, renewText(c, x.days)))}">📲 تذكير</a><button class="btn small cpm" data-id="${esc(c.id)}" data-days="${x.days}" title="نسخ الرسالة لإرسالها من أي واتساب">📋 نسخ</button></span>` : ""}
      </li>`).join("")}</ul></section>` : ""}
    <input class="search" type="search" id="cq" placeholder="بحث بالاسم أو الرمز أو البريد" value="${esc(q)}" aria-label="بحث">
    <section class="card" id="ctbl">${filter !== "all" ? `<p class="row gap"><span class="chip">${esc(FL[filter] || "")} · ${rows.length}</span><button class="btn small ghost f-all">✕ عرض الكل</button></p>` : ""}${rows.length ? `<div class="tbl-wrap"><table class="tbl wide"><thead><tr><th>العيادة</th><th>الاختصاص</th><th>الحالة</th><th>الاستخدام</th><th>الباقة</th><th>ينتهي</th><th></th></tr></thead><tbody>
      ${rows.map(({ c, s }) => `<tr><td><b>${esc(c.name)}</b><br><small class="muted" dir="ltr">${esc(c.slug || c.id)}</small></td>
        <td>${esc(SPECIALTIES[c.specialty]?.name || c.specialty || "")}</td><td>${statusChip(c)}</td><td>${usage(c.id)}</td>
        <td>${esc(c.plan === "trial" ? "تجربة" : c.plan === "gift" ? "هدية" : planOf(c.plan)?.name || c.plan || "")}</td>
        <td>${c.plan === "gift" ? "مدى الحياة" : `${esc(fmtDate(ymd(new Date(tsMs(c.expiresAt))), false))}<br><small class="${s.days <= 7 ? "danger-t" : "muted"}">${s.days > 0 ? `بعد ${s.days} يوم` : "انتهى"}</small>`}</td>
        <td><button class="btn small man" data-id="${esc(c.id)}">إدارة</button></td></tr>`).join("")}
      </tbody></table></div>` : empty("لا توجد عيادات")}</section>`;
  loadDownloads(); loadVisits();
  $$(".stat.f").forEach((b) => b.onclick = async () => { filter = b.dataset.f; await renderClinics(); $("#ctbl")?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  $(".f-all")?.addEventListener("click", () => { filter = "all"; renderClinics(); });
  $(".dl-stat").onclick = showDownloads;
  $(".us-stat").onclick = showUsage;
  loadUsage();
  $$(".stat.vs").forEach((b) => b.onclick = showVisits);
  $("#cq").oninput = debounce((e) => { q = e.target.value; renderClinics().then(() => { const i = $("#cq"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); }, 250);
  $$(".man").forEach((b) => b.onclick = () => manageClinic(all.find((c) => c.id === b.dataset.id), { act: acts[b.dataset.id], h: H[b.dataset.id] }));
  $$(".cpm").forEach((b) => b.onclick = async () => {
    const c = all.find((x) => x.id === b.dataset.id);
    try { await navigator.clipboard.writeText(renewText(c, Number(b.dataset.days))); toast(`نُسخت الرسالة · الرقم: ${c.ownerPhone}`); }
    catch { info("انسخ الرسالة", `<p dir="ltr">${esc(c.ownerPhone)}</p><textarea rows="8" data-novoice style="width:100%">${esc(renewText(c, Number(b.dataset.days)))}</textarea>`); }
    b.closest("li").classList.add("done");
    updateDoc(P.clinic(c.id), { renewRemindedAt: Timestamp.now() }).catch(() => {});
  });
  $$(".rn").forEach((b) => b.addEventListener("click", () => {
    b.closest("li").classList.add("done");
    updateDoc(P.clinic(b.dataset.id), { renewRemindedAt: Timestamp.now() }).catch(() => {});
  }));
}

function renewText(c, days) {
  const pay = S.platform?.payment || {};
  const ps = plans().map((p) => `• ${p.name}: ${p.price}${p.currency || "$"} شهرياً${yearlyDisc(p) ? ` (أو ${periodPrice(p, 12)}${p.currency || "$"} سنوياً، بحسم ${yearlyDisc(p)}%)` : ""}`).join("\n");
  const tr = c.status === "trial";
  const subj = tr ? "تجربتكم المجانية" : "اشتراككم";
  const dd = days === 1 ? "يوم واحد" : days === 2 ? "يومين" : days <= 10 ? `${days} أيام` : `${days} يوماً`;
  const when = days > 0 ? `بانتهاء ${subj} بعد ${dd}` : `بانتهاء ${subj}، والعيادة الآن للقراءة فقط`;
  return `مرحباً د. ${c.doctorName || ""} 👋\n\nأسعدنا وجودكم معنا، نأمل أن تكون منصة ${PLATFORM()} قد نالت إعجابكم ونأسف لإعلامكم ${when}.\n\nللتجديد يمكنكم اختيار الباقة المناسبة:\n${ps}\n\nيمكنكم الدفع من داخل التطبيق: المزيد ← الاشتراك والفواتير${pay.syriatel ? `\nأو عبر سيريتل كاش: ${pay.syriatel}` : ""}\n\nبياناتكم المدخلة محفوظة بالكامل لديكم وللأبد.\nلأي استفسار نتشرف بمساعدتكم\n\n${PLATFORM()} .. معاً نحو أنظمة أرقى`;
}

async function manageClinic(c, use = {}) {
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
      <tr><th>آخر استخدام</th><td>${use.act?.lastAt ? esc(tsDate(use.act.lastAt)) + ` · ${use.act.patients || 0} مريض · ${use.act.apptsMonth || 0} موعد هذا الشهر` : "لا نشاط مسجل بعد"}</td></tr>
      ${use.h ? `<tr><th>منذ البداية</th><td>${use.h.pts} حساب مريض (فتح التطبيق منهم ${use.h.ptsOpened}) · فريق العيادة ${use.h.staff} (دخل منهم ${use.h.staffIn})${use.h.last ? ` · آخر إضافة ${esc(tsDate(use.h.last))}` : ""}</td></tr>` : ""}
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
  const M = PAY_METHODS;
  const row = (p) => `<li class="req">
    <div class="row-between"><b>${esc(p.clinicName)}</b>${p.status === "pending" ? `<span class="chip warn">بانتظار المراجعة</span>` : p.status === "approved" ? `<span class="chip ok">مقبولة</span>` : `<span class="chip danger">مرفوضة</span>`}</div>
    <div>${esc(planOf(p.plan)?.name || p.plan)} · ${esc(p.months)} شهر · <b>${esc(p.amount)}</b> · ${esc(M[p.method] || p.method)}</div>
    <div class="muted small">${p.txn ? `رقم العملية: <span dir="ltr">${esc(p.txn)}</span> · ` : ""}${esc(tsDate(p.createdAt))}${p.note ? ` · ${esc(p.note)}` : ""}</div>
    ${p.receipt ? `<button type="button" class="receipt-thumb" data-id="${esc(p.id)}" aria-label="عرض صورة الإيصال"><img src="${esc(p.receipt)}" alt=""><span>صورة الإيصال · اضغط للتكبير</span></button>` : ""}
    ${p.status === "pending" ? `<div class="row gap"><button class="btn primary small ap" data-id="${esc(p.id)}">قبول وتفعيل</button><button class="btn small rj" data-id="${esc(p.id)}">رفض</button></div>` : ""}</li>`;
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
  $$(".receipt-thumb").forEach((b) => b.onclick = () => {
    const p = all.find((x) => x.id === b.dataset.id);
    info(`إيصال ${p.clinicName}`, `<img src="${esc(p.receipt)}" alt="صورة الإيصال" class="full">`);
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
        <fieldset class="stack"><legend>شام كاش</legend>
          <div class="sc-qr-edit"><div class="qr-prev">${pay.shamcashQr ? `<img src="${esc(pay.shamcashQr)}" alt="رمز QR لشام كاش">` : `<span class="muted small">لا توجد صورة</span>`}</div>
            <div class="stack"><button type="button" class="btn small up-qr">${pay.shamcashQr ? "تغيير صورة QR" : "رفع صورة QR"}</button>${pay.shamcashQr ? `<button type="button" class="btn small ghost rm-qr">حذف الصورة</button>` : ""}</div></div>
          ${field("اسم الحساب أو رقمه في شام كاش", "shamcash", { value: pay.shamcash || "", attrs: 'dir="auto"' })}
        </fieldset>
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
          ${field("حسم الاشتراك السنوي (%)", `pd${i}`, { type: "number", value: yearlyDisc(p), attrs: 'min="0" max="90" step="1"' })}
          ${field("المزايا (سطر لكل ميزة)", `pk${i}`, { type: "textarea", value: (p.perks || []).join("\n"), attrs: "data-novoice" })}
          <div class="row gap wrap">${[["booking", "صفحة الحجز"], ["inventory", "المخزون"], ["qr", "وصفة QR"], ["multiDoctor", "تعدد الأطباء"], ["multiSpecialty", "تعدد الاختصاصات"]].map(([k, t]) => `<label class="check small"><input type="checkbox" name="pf${i}_${k}" ${p.features?.[k] ? "checked" : ""}><span>${t}</span></label>`).join("")}</div>
        </fieldset>`).join("")}
      </section>
      <button class="btn primary block">حفظ الإعدادات</button>
    </form>
    <section class="card stack"><h3>روابط مفيدة</h3>
      <p>صفحة المنصة للعيادات الجديدة:</p><code class="copy" dir="ltr">${esc(baseUrl())}#/home</code>
      <p>تسجيل عيادة جديدة مباشرة:</p><code class="copy" dir="ltr">${esc(baseUrl())}#/signup</code>
    </section>`;
  $$(".th").forEach((b) => b.onclick = () => { LS.set("theme", b.dataset.m); applyTheme(b.dataset.m); renderSettings(); });
  let qrImg = pay.shamcashQr || null;
  $(".up-qr").onclick = async () => {
    const file = await pickFile("image/*"); if (!file) return;
    try {
      qrImg = await compressImage(file, 900, 0.85);
      $(".qr-prev").innerHTML = `<img src="${qrImg}" alt="رمز QR لشام كاش">`;
      toast("اضغط «حفظ الإعدادات» لاعتماد الصورة");
    } catch (e) { toast(errMsg(e), true); }
  };
  $(".rm-qr")?.addEventListener("click", () => { qrImg = null; $(".qr-prev").innerHTML = `<span class="muted small">لا توجد صورة</span>`; });
  $$("code.copy").forEach((c) => c.onclick = async () => { try { await navigator.clipboard.writeText(c.textContent); toast("تم النسخ"); } catch {} });
  $("#ps").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const newPlans = ps.map((p, i) => ({
      ...p, name: f[`pn${i}`].value.trim(), price: Number(f[`pp${i}`].value) || 0, currency: f[`pc${i}`].value.trim() || "$",
      maxDoctors: Number(f[`pl${i}`].value) || 1, maxStaff: Number(f[`pl${i}`].value) || 1,
      yearlyDiscount: Math.max(0, Math.min(90, Number(f[`pd${i}`].value) || 0)),
      perks: f[`pk${i}`].value.split("\n").map((x) => x.trim()).filter(Boolean),
      features: Object.fromEntries(["booking", "inventory", "qr", "multiDoctor", "multiSpecialty"].map((k) => [k, f[`pf${i}_${k}`].checked])),
    }));
    const data = {
      name: f.name.value.trim(), plans: newPlans,
      payment: { shamcash: f.shamcash.value.trim(), shamcashQr: qrImg, syriatel: f.syriatel.value.trim(), mtn: f.mtn.value.trim(), bank: f.bank.value.trim(), whatsapp: f.whatsapp.value.trim(), notes: f.notes.value.trim() },
      updatedAt: serverTimestamp()
    };
    try { await updateDoc(P.platform(), data); S.platform = { ...S.platform, ...data }; toast("حُفظت الإعدادات"); start(); }
    catch (err) { toast(errMsg(err), true); }
  };
}

// عدد تحميلات التطبيق: مجموع تنزيلات ملف nabd.apk في كل إصدارات GitHub
async function loadDownloads() {
  const el = document.querySelector(".dl-stat b"); if (!el) return;
  try {
    let n = 0;
    for (let page = 1; page <= 5; page++) {
      const r = await fetch(`https://api.github.com/repos/mohamedfayzyasenalsabagh-create/nabd/releases?per_page=100&page=${page}`);
      if (!r.ok) throw new Error(r.status);
      const arr = await r.json();
      arr.forEach((rel) => (rel.assets || []).forEach((a) => { if (/\.apk$/i.test(a.name)) n += a.download_count || 0; }));
      if (arr.length < 100) break;
    }
    const site = (await list(collection(db, "downloads")).catch(() => [])).reduce((s, x) => s + (x.n || 0), 0);
    el.textContent = n + site;
  } catch { el.textContent = "—"; }
}

// زوار الموقع: الزائر الفريد يُحسب مرة واحدة يومياً لكل جهاز، والزيارات كل مرة تُفتح فيها الصفحة
// استهلاك Firestore التقريبي مقارنة بالحد المجاني اليومي (50 ألف قراءة و20 ألف كتابة، يتجدد بتوقيت المحيط الهادئ)
const pacificDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(d);
const usePct = (x) => Math.max(Math.round(((x?.r || 0) / 50000) * 100), Math.round(((x?.w || 0) / 20000) * 100));
async function loadUsage() {
  const el = $(".us-stat b"); if (!el) return;
  try { const x = await one(doc(db, "usage", pacificDay())); const p = usePct(x); el.textContent = `${p}%`; el.style.color = p >= 70 ? "var(--danger, #c0392b)" : ""; }
  catch { el.textContent = "—"; }
}
async function showUsage() {
  let body;
  try {
    const rows = (await list(collection(db, "usage"))).sort((a, b) => b.id.localeCompare(a.id)).slice(0, 14);
    body = `<p class="muted small">أرقام تقريبية يحسبها التطبيق. الحد المجاني اليومي: 50,000 قراءة و20,000 كتابة، ويتجدد يومياً قرابة العاشرة صباحاً بتوقيت دمشق. إذا تجاوزناه يتوقف التطبيق عند الجميع حتى التجديد.</p>
      ${rows.length ? `<table class="tbl"><thead><tr><th>اليوم</th><th>القراءات</th><th>الكتابات</th><th>النسبة</th></tr></thead><tbody>${rows.map((x) => `<tr><td>${esc(fmtDate(x.id, false))}</td><td>${x.r || 0}</td><td>${x.w || 0}</td><td><b>${usePct(x)}%</b></td></tr>`).join("")}</tbody></table>` : empty("لا أرقام بعد، تبدأ بالظهور مع استخدام التطبيق")}`;
  } catch (e) { body = `<p class="alert">${esc(errMsg(e))}</p>`; }
  info("استهلاك Firebase", body);
}
// تفاصيل التحميلات لكل إصدار من تطبيق أندرويد
async function showDownloads() {
  let body;
  try {
    const r = await fetch("https://api.github.com/repos/mohamedfayzyasenalsabagh-create/nabd/releases?per_page=100");
    if (!r.ok) throw new Error(r.status);
    const rows = (await r.json()).map((rel) => [rel.name || rel.tag_name, (rel.published_at || "").slice(0, 10), (rel.assets || []).filter((a) => /\.apk$/i.test(a.name)).reduce((s, a) => s + (a.download_count || 0), 0)]);
    body = rows.length ? `<table class="tbl"><thead><tr><th>الإصدار</th><th>تاريخ النشر</th><th>التحميلات</th></tr></thead><tbody>${rows.map(([n, d, c]) => `<tr><td dir="ltr">${esc(n)}</td><td>${esc(d)}</td><td><b>${c}</b></td></tr>`).join("")}</tbody></table>` : empty("لا توجد إصدارات");
  } catch { body = `<p class="alert">تعذّر جلب التحميلات، تحقق من الاتصال وحاول مجدداً.</p>`; }
  try {
    const days = (await list(collection(db, "downloads"))).sort((a, b) => b.id.localeCompare(a.id)).slice(0, 30);
    if (days.length) body = `<h4>من الموقع (يومياً)</h4><table class="tbl"><thead><tr><th>اليوم</th><th>التنزيلات</th></tr></thead><tbody>${days.map((x) => `<tr><td>${esc(fmtDate(x.id, false))}</td><td><b>${x.n || 0}</b></td></tr>`).join("")}</tbody></table><h4>السابقة من GitHub</h4>` + body;
  } catch {}
  info("تحميلات تطبيق أندرويد", body);
}
// زوار الموقع يوماً بيوم (آخر 30 يوماً)
async function showVisits() {
  let body;
  try {
    const all = (await list(collection(db, "visits"))).filter((x) => /^\d{4}-\d\d-\d\d$/.test(x.id || "")).sort((a, b) => b.id.localeCompare(a.id)).slice(0, 30);
    body = all.length ? `<p class="muted small">الزائر: جهاز مختلف في اليوم نفسه · الزيارات: عدد مرات فتح الموقع</p><table class="tbl"><thead><tr><th>اليوم</th><th>الزوار</th><th>الزيارات</th></tr></thead><tbody>${all.map((x) => `<tr><td>${esc(fmtDate(x.id, false))}</td><td><b>${x.uniq || 0}</b></td><td>${x.views || 0}</td></tr>`).join("")}</tbody></table>` : empty("لا توجد زيارات مسجلة بعد");
  } catch (e) { body = `<p class="alert">${esc(errMsg(e))}</p>`; }
  info("زوار الموقع", body);
}
async function loadVisits() {
  const set = (c, v) => { const el = document.querySelector(`.${c} b`); if (el) el.textContent = v; };
  try {
    const all = await list(collection(db, "visits"));
    const today = ymd(), m = today.slice(0, 7);
    const t = all.find((x) => x.id === today);
    set("vs-today", t ? `${t.uniq || 0}` : "0");
    set("vs-month", all.filter((x) => (x.id || "").startsWith(m)).reduce((s, x) => s + (x.uniq || 0), 0));
    set("vs-all", `${all.reduce((s, x) => s + (x.uniq || 0), 0)} (${all.reduce((s, x) => s + (x.views || 0), 0)})`);
  } catch { ["vs-today", "vs-month", "vs-all"].forEach((c) => set(c, "—")); }
}
