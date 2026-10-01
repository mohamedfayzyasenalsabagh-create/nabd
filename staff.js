// واجهة فريق العيادة: الأطباء والسكرتارية
import { SPECIALTIES, fileData,
  db, P, C, list, one, doc, setDoc, updateDoc, addDoc, query, where, onSnapshot,
  serverTimestamp, runTransaction, arrayUnion, arrayRemove, orderBy, limit, registerPatient, audit,
  normPhone, clinicState, tsMs
} from "./fb.js";
import { APP_URL, COPYRIGHT,
  $, $$, esc, ymd, addDays, parseYmd, fmtDate, fmtTime, tsDate, money, toast, errMsg, modal, confirmBox, info,
  field, select, logoHtml, waLink, debounce, download, empty, DAYS, daysBetween, printDoc
} from "./ui.js";
import { S, logout, showChangePassword, PLATFORM } from "./app.js";

export const isDoctor = () => S.profile.role === "doctor";
export const isAdmin = () => isDoctor() && !!S.profile.admin;
// تعدد الاختصاصات متاح لباقة المراكز الطبية فقط
export const multiSpec = () => !!S.clinic?.features?.multiSpecialty || S.clinic?.plan === "center";
export const specMods = (spec = S.clinic?.specialty) => SPECIALTIES[spec]?.modules || [];
export const hasMod = (m) => (multiSpec() ? (S.clinic?.modules || specMods()) : specMods()).includes(m);
export const feat = (f) => !!S.clinic?.features?.[f];
export const doctors = () => (S.clinic?.doctors || []).filter((d) => d.active !== false);
export const multiDoc = () => doctors().length > 1;
export const docName = (id) => doctors().find((d) => d.id === id)?.name || (S.clinic?.doctors || []).find((d) => d.id === id)?.name || "";
const defaultDoc = () => (isDoctor() && S.profile.doctorId && doctors().some((d) => d.id === S.profile.doctorId) ? S.profile.doctorId : doctors()[0]?.id || "main");
const apptDoc = (a) => a.doctorId || doctors()[0]?.id || "main";
export const STATUS = { confirmed: "مؤكد", arrived: "في الانتظار", in: "لدى الطبيب", done: "انتهى", noshow: "لم يحضر", cancelled: "ملغى" };
export const cur = () => S.clinic?.currency || "ل.س";
export const readOnly = () => !clinicState(S.clinic).ok;

// ---------- ذاكرة المرضى ----------
export const PC = { list: [], byId: {} };
function watchPatients() {
  S.unsub.push(onSnapshot(P.patients(), (s) => {
    PC.list = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name, "ar"));
    PC.byId = Object.fromEntries(PC.list.map((p) => [p.id, p]));
    if (routeName() === "patients") renderPatients();
  }));
}

// ---------- الهيكل والتنقل ----------
const main = () => $("#main");
function routeName() { return (location.hash.replace(/^#\/?/, "").split(/[/?]/)[0]) || "home"; }
function params() { return new URLSearchParams(location.hash.split("?")[1] || ""); }
if (S.docFilter === undefined) S.docFilter = null;

export function start() {
  S.docFilter = isDoctor() && multiDoc() ? S.profile.doctorId : "all";
  const nav = [
    ["home", "الرئيسية", "M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"],
    ["appts", "المواعيد", "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"],
    ["patients", "المرضى", "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.9M15 3.1a3.5 3.5 0 0 1 0 6.8"],
    ["money", "المالية", "M3 6h18v12H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
    ["more", "المزيد", "M5 12h.01M12 12h.01M19 12h.01"],
  ];
  const roleName = isAdmin() ? "مسؤول العيادة" : isDoctor() ? "طبيب" : "السكرتارية";
  $("#app").innerHTML = `
    <header class="topbar">
      <a href="#/" class="tb-brand">${logoHtml(S.pub, 36)}<span>${esc(S.pub.name || "العيادة")}</span></a>
      <div class="tb-user"><span class="muted small">${esc(S.profile.name || "")} · ${roleName}</span></div>
    </header>
    <div id="subbar"></div>
    <main id="main" class="page"></main>
    <nav class="bottomnav" aria-label="التنقل">
      ${nav.map(([k, t, d]) => `<a href="#/${k === "home" ? "" : k}" data-r="${k}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg><span>${t}</span><b class="badge hidden" data-badge="${k}"></b></a>`).join("")}
    </nav>`;
  subBar();
  window.addEventListener("clinic-updated", subBar);
  watchPatients();
  watchBadges();
  window.onhashchange = render;
  render();
}

function subBar() {
  const el = $("#subbar");
  if (!el) return;
  const st = clinicState(S.clinic);
  window.__readOnly = !st.ok;
  const link = isAdmin() ? `<a href="#/subscription">${st.ok ? "اشترك الآن" : "تجديد الاشتراك"}</a>` : "";
  if (!st.ok) el.innerHTML = `<div class="subbar bad">${S.clinic?.status === "suspended" ? "العيادة موقوفة مؤقتاً." : "انتهى اشتراك العيادة."} النظام للقراءة فقط. ${link || "يرجى التواصل مع مسؤول العيادة."}</div>`;
  else if (st.trial) el.innerHTML = `<div class="subbar">${st.days > 0 ? `تجربة مجانية: باقي ${st.days} يوم.` : ""} ${link}</div>`;
  else if (st.days <= 7 && S.clinic?.plan !== "gift") el.innerHTML = `<div class="subbar warn">ينتهي الاشتراك بعد ${st.days} يوم. ${link}</div>`;
  else el.innerHTML = "";
}

function watchBadges() {
  const upd = () => setBadge("more", (S._reqCount || 0) + (S._pubCount || 0) + (S._msgCount || 0));
  S.unsub.push(onSnapshot(query(P.col("requests"), where("status", "==", "new")), (s) => { S._reqCount = s.size; upd(); }, () => {}));
  S.unsub.push(onSnapshot(query(P.col("publicRequests"), where("status", "==", "new")), (s) => { S._pubCount = s.size; upd(); }, () => {}));
  S.unsub.push(onSnapshot(query(P.patients(), where("lastMsgFrom", "==", "patient")), (s) => { S._msgCount = s.size; upd(); }, () => {}));
}
function setBadge(k, n) {
  const b = $(`[data-badge="${k}"]`);
  if (!b) return;
  b.textContent = n > 9 ? "9+" : n;
  b.classList.toggle("hidden", !n);
}

async function render() {
  const r = routeName();
  $$(".bottomnav a").forEach((a) => a.classList.toggle("on", a.dataset.r === r || (r === "p" && a.dataset.r === "patients")));
  window.scrollTo(0, 0);
  const m = main();
  if (!m) return;
  m.innerHTML = `<div class="loading">جارٍ التحميل…</div>`;
  const admin = () => import("./admin.js");
  try {
    switch (r) {
      case "home": return await renderHome();
      case "appts": return await renderAppts();
      case "patients": return renderPatients();
      case "p": { const m2 = await import("./card.js"); return await m2.renderCard(); }
      case "money": return await renderMoney();
      case "more": return renderMore();
      case "requests": return await renderRequests();
      case "waitlist": return await renderWaitlist();
      case "messages": return await renderMessages();
      case "tv": return renderTv();
      case "inventory": return feat("inventory") ? (await admin()).renderInventory() : renderMore();
      case "settings": return isAdmin() ? (await admin()).renderSettings() : renderMore();
      case "team": return isAdmin() ? (await admin()).renderTeam() : renderMore();
      case "subscription": return isAdmin() ? (await admin()).renderSubscription() : renderMore();
      case "reports": return isDoctor() ? await renderReports() : renderMore();
      case "audit": return isAdmin() ? await renderAudit() : renderMore();
      case "backup": return isAdmin() ? renderBackup() : renderMore();
      case "password": return showChangePassword(false);
      default: return await renderHome();
    }
  } catch (e) {
    console.error(e);
    m.innerHTML = `<div class="card"><p class="alert">${esc(errMsg(e))}</p></div>`;
  }
}
export { render };
export const go = (h) => { if (location.hash === h) render(); else location.hash = h; };

function docFilterBar(onChange) {
  if (!multiDoc()) return "";
  const opts = [["all", "كل الأطباء"], ...doctors().map((d) => [d.id, `د. ${d.name}`])];
  return `<div class="seg-scroll" role="tablist">${opts.map(([id, t]) => `<button class="pill ${S.docFilter === id ? "on" : ""}" data-doc="${id}">${esc(t)}</button>`).join("")}</div>`;
}
function bindDocFilter(cb) {
  $$("[data-doc]").forEach((b) => b.onclick = () => { S.docFilter = b.dataset.doc; cb(); });
}
const byDoc = (arr) => (S.docFilter && S.docFilter !== "all" ? arr.filter((a) => apptDoc(a) === S.docFilter) : arr);

// ---------- الرئيسية ----------
async function renderHome() {
  const today = ymd();
  const appts = byDoc((await list(query(P.col("appointments"), where("date", "==", today))))
    .filter((a) => a.status !== "cancelled")).sort((a, b) => a.time.localeCompare(b.time));
  const week = byDoc((await list(query(P.col("appointments"), where("date", ">", today), where("date", "<=", addDays(today, 7)))))
    .filter((a) => a.status !== "cancelled")).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const waiting = appts.filter((a) => a.status === "arrived").length;
  const done = appts.filter((a) => a.status === "done").length;
  const alerts = [];

  if ((S._reqCount || 0) + (S._pubCount || 0)) alerts.push(`<li><a href="#/requests">📅 ${(S._reqCount || 0) + (S._pubCount || 0)} طلب موعد بانتظار التأكيد</a></li>`);
  if (S._msgCount) alerts.push(`<li><a href="#/messages">💬 ${S._msgCount} رسالة من المرضى بانتظار الرد</a></li>`);
  if (hasMod("peds")) {
    const due = PC.list.filter((p) => !p.archived && p.nextVaccine?.date && p.nextVaccine.date <= addDays(today, 7)).sort((a, b) => a.nextVaccine.date.localeCompare(b.nextVaccine.date));
    due.slice(0, 8).forEach((p) => alerts.push(`<li><a href="#/p/${p.id}/peds">💉 ${esc(p.name)}: ${esc(p.nextVaccine.name)} (${p.nextVaccine.date < today ? "متأخر" : esc(fmtDate(p.nextVaccine.date, false))})</a></li>`));
  }
  if (feat("inventory")) {
    const inv = await list(P.col("inventory")).catch(() => []);
    const low = inv.filter((i) => !i.archived && Number(i.qty) <= Number(i.min || 0));
    const exp = inv.filter((i) => !i.archived && i.expiry && i.expiry <= addDays(today, 30));
    if (low.length) alerts.push(`<li><a href="#/inventory">📦 ${low.length} صنف وصل إلى الحد الأدنى: ${esc(low.slice(0, 3).map((i) => i.name).join("، "))}</a></li>`);
    if (exp.length) alerts.push(`<li><a href="#/inventory">⏳ ${exp.length} صنف ينتهي خلال شهر</a></li>`);
  }

  let doctorBits = "";
  if (isDoctor()) {
    const pays = await list(query(P.col("payments"), where("date", "==", today)));
    const income = pays.reduce((s, p) => s + (p.paid || 0), 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const newPts = PC.list.filter((p) => tsMs(p.createdAt) >= monthStart.getTime()).length;
    if (hasMod("preg")) {
      const pa = await list(query(P.col("pregAlerts"), where("active", "==", true)));
      pa.filter((a) => a.edd && daysBetween(today, a.edd) <= 28 && daysBetween(today, a.edd) >= -14)
        .forEach((a) => alerts.push(`<li><a href="#/p/${a.patientId}/preg">🤰 ${esc(a.patientName)}: الولادة المتوقعة ${esc(fmtDate(a.edd, false))} (${daysBetween(today, a.edd) >= 0 ? "بعد " + daysBetween(today, a.edd) + " يوم" : "تجاوزت الموعد"})</a></li>`));
      pa.filter((a) => a.highRisk).forEach((a) => alerts.push(`<li><a href="#/p/${a.patientId}/preg"><span class="chip danger">حمل عالي الخطورة</span> ${esc(a.patientName)}</a></li>`));
    }
    const inbox = await list(query(P.col("inbox"), where("seen", "==", false)));
    inbox.forEach((i) => alerts.push(`<li><a href="#/p/${i.patientId}/files">📎 ${esc(i.patientName)} رفع ${esc(i.label || "ملفاً")}</a></li>`));
    doctorBits = `<div class="stat"><b>${money(income, cur())}</b><span>دخل اليوم</span></div><div class="stat"><b>${newPts}</b><span>مرضى جدد هذا الشهر</span></div>`;
  }

  main().innerHTML = `
    <h2 class="page-title">${esc(fmtDate(today))}</h2>
    ${docFilterBar()}
    <div class="stats">
      <div class="stat"><b>${appts.length}</b><span>مواعيد اليوم</span></div>
      <div class="stat"><b>${waiting}</b><span>في الانتظار</span></div>
      <div class="stat"><b>${done}</b><span>انتهت</span></div>
      ${doctorBits}
    </div>
    ${alerts.length ? `<section class="card alerts"><h3>تنبيهات</h3><ul class="plain">${alerts.join("")}</ul></section>` : ""}
    ${waiting ? `<button class="btn primary block call-next">📢 استدعاء الدور التالي · ${waiting} بالانتظار</button>` : ""}
    <section class="card">
      <div class="row-between"><h3>مواعيد اليوم</h3><div class="row gap"><button class="btn small primary new">+ موعد</button><a class="btn small" href="#/appts">الجدول</a></div></div>
      ${appts.length ? `<ul class="appt-list">${appts.map(apptRow).join("")}</ul>` : empty("لا توجد مواعيد اليوم")}
    </section>
    <section class="card">
      <h3>الأسبوع القادم</h3>
      ${week.length ? `<ul class="appt-list compact">${week.map((a) => `<li><button class="appt" data-a="${a.id}">
        <span class="t">${esc(DAYS[parseYmd(a.date).getDay()])} ${parseYmd(a.date).getDate()}/${parseYmd(a.date).getMonth() + 1} · ${esc(fmtTime(a.time))}</span>
        <span class="n">${esc(a.patientName)}${multiDoc() ? `<small>د. ${esc(docName(apptDoc(a)))}</small>` : ""}</span><span class="chip">${esc(a.type || "")}</span></button></li>`).join("")}</ul>` : empty("لا توجد مواعيد")}
    </section>`;
  bindDocFilter(renderHome);
  $(".new").onclick = () => bookModal({});
  $(".call-next")?.addEventListener("click", async () => { await callNext(); render(); });
  bindApptButtons([...appts, ...week]);
}

function apptRow(a) {
  const quick = a.status === "confirmed" && a.date === ymd();
  return `<li class="appt-li"><button class="appt st-${a.status}" data-a="${a.id}">
    <span class="t">${esc(fmtTime(a.time))}${a.queueNo ? ` <span class="q">#${a.queueNo}</span>` : ""}</span>
    <span class="n">${esc(a.patientName)}<small>${esc(a.type || "")}${multiDoc() && S.docFilter === "all" ? ` · د. ${esc(docName(apptDoc(a)))}` : ""}</small></span>
    ${quick ? `<span class="chip st ghost-chip"></span>` : `<span class="chip st">${esc(STATUS[a.status] || a.status)}</span>`}</button>${quick ? `<button class="arrive" data-arr="${a.id}" aria-label="تسجيل الحضور">حضر ✓</button>` : ""}</li>`;
}
function bindApptButtons(arr) {
  const map = Object.fromEntries(arr.map((a) => [a.id, a]));
  $$("[data-a]").forEach((b) => b.onclick = () => apptActions(map[b.dataset.a]));
  $$("[data-arr]").forEach((b) => b.onclick = async (e) => {
    e.stopPropagation();
    const a = map[b.dataset.arr]; if (!a) return;
    b.disabled = true;
    try {
      const q = a.queueNo || await nextQueueNo(a.date);
      await updateDoc(P.colDoc("appointments", a.id), { status: "arrived", queueNo: q, updatedAt: serverTimestamp() });
      await audit(`تغيير حالة موعد إلى ${STATUS.arrived}`, a.patientName);
      toast(`تم تسجيل الحضور · رقم الدور ${q}`);
      render();
    } catch (err) { b.disabled = false; toast(errMsg(err), true); }
  });
}

// ---------- إجراءات الموعد ----------
export async function apptActions(a) {
  const p = PC.byId[a.patientId] || {};
  const doc_ = isDoctor();
  const w = await new Promise((resolve) => {
    modal(`${a.patientName}`, `
      <p class="muted">${esc(fmtDate(a.date))} · ${esc(fmtTime(a.time))} · ${esc(a.type || "")}${multiDoc() ? ` · د. ${esc(docName(apptDoc(a)))}` : ""}</p>
      ${a.note ? `<p>${esc(a.note)}</p>` : ""}
      <p>الحالة: <span class="chip">${esc(STATUS[a.status])}</span></p>
      <div class="btn-grid">
        ${a.status === "confirmed" ? `<button class="btn" data-act="arrived">حضر ✓</button>` : ""}
        ${["confirmed", "arrived"].includes(a.status) ? `<button class="btn" data-act="in">دخل إلى الطبيب</button>` : ""}
        ${["arrived", "in", "confirmed"].includes(a.status) ? `<button class="btn" data-act="done">انتهى</button>` : ""}
        ${a.status === "confirmed" ? `<button class="btn" data-act="noshow">لم يحضر</button>` : ""}
        ${doc_ ? `<button class="btn primary" data-act="visit">تسجيل زيارة</button>` : ""}
        <button class="btn" data-act="card">${doc_ ? "الملف الطبي" : "بيانات المريض"}</button>
        <button class="btn" data-act="pay">تسجيل دفعة</button>
        <a class="btn" target="_blank" rel="noopener" href="${esc(waLink(a.phone || p.phone, reminderText(a)))}">تذكير عبر واتساب</a>
        <a class="btn" href="tel:${esc(a.phone || p.phone || "")}">اتصال</a>
        ${!["done", "cancelled"].includes(a.status) ? `<button class="btn" data-act="move">تأجيل</button><button class="btn danger" data-act="cancel">إلغاء الموعد</button>` : ""}
      </div>`, { ok: null, cancel: "إغلاق", onOpen: (wrap) => resolve(wrap) });
  });
  w.querySelectorAll("[data-act]").forEach((b) => b.onclick = async () => {
    const act = b.dataset.act;
    w.remove();
    try {
      if (["arrived", "in", "done", "noshow"].includes(act)) {
        const patch = { status: act, updatedAt: serverTimestamp() };
        if ((act === "arrived" || act === "in") && !a.queueNo) patch.queueNo = await nextQueueNo(a.date);
        await updateDoc(P.colDoc("appointments", a.id), patch);
        await audit(`تغيير حالة موعد إلى ${STATUS[act]}`, a.patientName);
        toast("تم");
        if (act === "in") await callNumber(patch.queueNo || a.queueNo, apptDoc(a));
      } else if (act === "visit") {
        const m = await import("./card.js");
        return m.visitModal(a.patientId, a);
      } else if (act === "card") {
        return go(`#/p/${a.patientId}/${doc_ ? "summary" : "info"}`);
      } else if (act === "pay") {
        return paymentModal(a.patientId, a.type);
      } else if (act === "move") {
        const nb = await bookModal({ pid: a.patientId, type: a.type, note: a.note, title: "تأجيل الموعد", doctorId: apptDoc(a) });
        if (nb) {
          await updateDoc(P.colDoc("appointments", a.id), { status: "cancelled", cancelReason: "تأجيل", updatedAt: serverTimestamp() });
          await markBusy(a.date, a.time, apptDoc(a), false);
          offerNotify(a.phone || p.phone, `مرحباً ${a.patientName}، تم تغيير موعدك في ${S.pub.name} إلى ${fmtDate(nb.date)} الساعة ${fmtTime(nb.time)}.`);
        }
      } else if (act === "cancel") {
        if (!(await confirmBox("إلغاء الموعد", `إلغاء موعد ${a.patientName}؟`, "إلغاء الموعد", true))) return;
        await updateDoc(P.colDoc("appointments", a.id), { status: "cancelled", updatedAt: serverTimestamp() });
        await markBusy(a.date, a.time, apptDoc(a), false);
        await audit("إلغاء موعد", a.patientName);
        const wl = await list(query(P.col("waitlist"), where("status", "==", "waiting")));
        offerNotify(a.phone || p.phone, `مرحباً ${a.patientName}، نعتذر، تم إلغاء موعدك في ${S.pub.name} بتاريخ ${fmtDate(a.date)}. يرجى التواصل معنا لتحديد موعد جديد.`,
          wl.length ? `<p class="alert">يوجد ${wl.length} في قائمة الانتظار الاحتياطية. <a href="#/waitlist">افتحها</a> لإعطاء الموعد لأحدهم.</p>` : "");
      }
    } catch (e) { toast(errMsg(e), true); }
    render();
  });
}
function reminderText(a) {
  return `مرحباً ${a.patientName}، تذكير بموعدك في ${S.pub.name} يوم ${fmtDate(a.date)} الساعة ${fmtTime(a.time)}.${S.pub.address ? " العنوان: " + S.pub.address : ""}`;
}
export function offerNotify(phone, text, extra = "") {
  info("إبلاغ المريض", `${extra}<p>${esc(text)}</p><a class="btn primary" target="_blank" rel="noopener" href="${esc(waLink(phone, text))}">إرسال على واتساب</a>`);
}
async function nextQueueNo(date) {
  const arr = await list(query(P.col("appointments"), where("date", "==", date)));
  return arr.reduce((m, x) => Math.max(m, x.queueNo || 0), 0) + 1;
}
async function callNumber(n, doctorId) {
  if (!n) return;
  try { await setDoc(P.colDoc("live", "queue"), { number: n, doctor: multiDoc() ? docName(doctorId) : "", at: serverTimestamp() }); } catch {}
}

// ---------- الحجز ----------
export function slotsFor(date) {
  const c = S.clinic || {};
  const h = c.hours?.[parseYmd(date).getDay()];
  if (!h || !h.on) return [];
  const step = Number(c.slotMinutes) || 20;
  const toMin = (t) => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
  const out = [];
  for (let m = toMin(h.from); m + step <= toMin(h.to); m += step)
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  return out;
}
const slotId = (date, time, doctorId) => `${date}_${time.replace(":", "")}_${doctorId}`;
export async function markBusy(date, time, doctorId, on) {
  try { await setDoc(P.colDoc("busy", date), { slots: (on ? arrayUnion : arrayRemove)(`${time}|${doctorId}`) }, { merge: true }); } catch (e) { console.warn(e); }
}

export async function bookAppointment({ pid, date, time, type, note = "", doctorId }) {
  const p = PC.byId[pid] || (await one(P.patient(pid)));
  const did = doctorId || defaultDoc();
  const ref = P.colDoc("appointments", slotId(date, time, did));
  await runTransaction(db, async (tx) => {
    const s = await tx.get(ref);
    if (s.exists() && s.data().status !== "cancelled") throw new Error(`الوقت ${fmtTime(time)} محجوز باسم ${s.data().patientName}`);
    tx.set(ref, {
      patientId: pid, patientName: p.name, phone: p.phone, date, time, type: type || "", note, doctorId: did,
      status: "confirmed", queueNo: null, createdAt: serverTimestamp(), createdBy: S.user.uid
    });
  });
  await markBusy(date, time, did, true);
  await audit("حجز موعد", `${p.name} ${date} ${time}`);
  return { id: ref.id, date, time, doctorId: did };
}

export async function bookModal({ pid = "", date = ymd(), time = "", type = "", note = "", title = "موعد جديد", requestId = null, doctorId = null } = {}) {
  const services = S.clinic?.services || [];
  if (!type && services.length) type = services[0].name;
  let did = doctorId || (S.docFilter && S.docFilter !== "all" ? S.docFilter : defaultDoc());
  const booked = async (d) => new Set((await list(query(P.col("appointments"), where("date", "==", d))))
    .filter((a) => a.status !== "cancelled" && apptDoc(a) === did).map((a) => a.time));
  const body = `<form class="stack">
    ${pid ? `<input type="hidden" name="pid" value="${esc(pid)}"><p><b>${esc(PC.byId[pid]?.name || "")}</b></p>` : `
      <label class="field"><span>المريض</span><input class="pt-search" placeholder="اكتب الاسم أو الرقم" autocomplete="off"><input type="hidden" name="pid" required></label>
      <div class="pt-results"></div><button type="button" class="link-btn small newp">+ مريض جديد</button>`}
    ${multiDoc() ? select("الطبيب", "doctorId", doctors().map((d) => [d.id, `د. ${d.name}`]), did) : ""}
    ${field("التاريخ", "date", { type: "date", value: date, required: true })}
    <div class="field"><span>الوقت</span><div class="slots"></div></div>
    ${field("أو أدخل وقتاً يدوياً", "manual", { type: "time", value: "" })}
    ${select("نوع الموعد", "type", [["", "—"], ...services.map((s) => [s.name, s.name])], type)}
    ${field("ملاحظة", "note", { value: note })}
    <input type="hidden" name="time" value="${esc(time)}">
  </form>`;
  return modal(title, body, {
    ok: "حجز",
    onOpen: (w) => {
      const form = w.querySelector("form");
      const drawSlots = async () => {
        const d = form.date.value;
        const taken = await booked(d);
        const sl = slotsFor(d);
        w.querySelector(".slots").innerHTML = sl.length
          ? sl.map((t) => `<button type="button" class="slot ${taken.has(t) ? "taken" : ""} ${t === form.time.value ? "on" : ""}" data-t="${t}" ${taken.has(t) ? "disabled" : ""}>${esc(fmtTime(t))}</button>`).join("")
          : `<span class="muted">العيادة مغلقة في هذا اليوم (يمكنك إدخال وقت يدوياً)</span>`;
        w.querySelectorAll(".slot").forEach((b) => b.onclick = () => {
          form.time.value = b.dataset.t; form.manual.value = "";
          w.querySelectorAll(".slot").forEach((x) => x.classList.toggle("on", x === b));
        });
      };
      form.date.onchange = drawSlots;
      form.doctorId?.addEventListener("change", () => { did = form.doctorId.value; form.time.value = ""; drawSlots(); });
      drawSlots();
      const s = w.querySelector(".pt-search");
      if (s) {
        s.oninput = debounce(() => {
          const q = s.value.trim();
          const res = q ? searchPatients(q).slice(0, 6) : [];
          w.querySelector(".pt-results").innerHTML = res.map((p) => `<button type="button" class="pt-pick" data-id="${p.id}">${esc(p.name)} <span class="muted" dir="ltr">${esc(p.phone)}</span></button>`).join("");
          w.querySelectorAll(".pt-pick").forEach((b) => b.onclick = () => {
            form.pid.value = b.dataset.id; s.value = PC.byId[b.dataset.id].name;
            w.querySelector(".pt-results").innerHTML = "";
          });
        }, 150);
        w.querySelector(".newp").onclick = async () => {
          const r = await newPatientModal({ silentNav: true });
          if (r) { form.pid.value = r.pid; s.value = r.name; }
        };
      }
    },
    onOk: async (f) => {
      const t = f.manual || f.time;
      if (!f.pid) { toast("اختر المريض", true); return false; }
      if (!t) { toast("اختر الوقت", true); return false; }
      const r = await bookAppointment({ pid: f.pid, date: f.date, time: t, type: f.type, note: f.note, doctorId: f.doctorId || did });
      if (requestId) await updateDoc(P.colDoc("requests", requestId), { status: "done", apptId: r.id });
      toast("تم الحجز");
      const p = PC.byId[f.pid];
      if (p) offerNotify(p.phone, `مرحباً ${p.name}، تم تثبيت موعدك في ${S.pub.name} يوم ${fmtDate(f.date)} الساعة ${fmtTime(t)}${multiDoc() ? ` مع د. ${docName(r.doctorId)}` : ""}.`);
      setTimeout(render, 100);
      return r;
    }
  });
}

export function searchPatients(q) {
  const n = normPhone(q);
  const t = q.toLowerCase();
  return PC.list.filter((p) => !p.archived && (p.name.toLowerCase().includes(t) || (n.length >= 3 && p.phone.includes(n))));
}

// ---------- المواعيد ----------
async function renderAppts() {
  const d = params().get("d") || ymd();
  if (multiDoc() && (!S.docFilter || S.docFilter === "all")) S.docFilter = defaultDoc();
  const did = multiDoc() ? S.docFilter : defaultDoc();
  const all = (await list(query(P.col("appointments"), where("date", "==", d)))).sort((a, b) => a.time.localeCompare(b.time));
  const appts = all.filter((a) => apptDoc(a) === did);
  const byTime = {};
  appts.filter((a) => a.status !== "cancelled").forEach((a) => byTime[a.time] = a);
  const slots = slotsFor(d);
  const extra = appts.filter((a) => a.status !== "cancelled" && !slots.includes(a.time));
  const cancelled = appts.filter((a) => a.status === "cancelled" && !byTime[a.time]);
  const docOpts = multiDoc() ? `<div class="seg-scroll">${doctors().map((x) => `<button class="pill ${did === x.id ? "on" : ""}" data-doc="${x.id}">د. ${esc(x.name)}</button>`).join("")}</div>` : "";
  main().innerHTML = `
    <div class="row-between">
      <a class="icon-btn" href="#/appts?d=${addDays(d, -1)}" aria-label="اليوم السابق">→</a>
      <label class="date-pick"><b>${esc(fmtDate(d))}</b><input type="date" value="${d}" aria-label="اختيار التاريخ"></label>
      <a class="icon-btn" href="#/appts?d=${addDays(d, 1)}" aria-label="اليوم التالي">←</a>
    </div>
    ${docOpts}
    <div class="row gap"><a class="btn small" href="#/appts?d=${ymd()}">اليوم</a><button class="btn primary small new">+ موعد</button></div>
    <section class="card">
      ${slots.length ? `<ul class="slot-list">${slots.map((t) => byTime[t]
        ? `<li>${apptRow(byTime[t])}</li>`
        : `<li><button class="appt free" data-free="${t}"><span class="t">${esc(fmtTime(t))}</span><span class="n muted">متاح · اضغط للحجز</span></button></li>`).join("")}</ul>`
        : empty("العيادة مغلقة في هذا اليوم وفق أوقات الدوام")}
      ${extra.length ? `<h4>مواعيد خارج الجدول</h4><ul class="appt-list">${extra.map(apptRow).join("")}</ul>` : ""}
      ${cancelled.length ? `<details><summary class="muted">ملغاة (${cancelled.length})</summary><ul class="appt-list">${cancelled.map(apptRow).join("")}</ul></details>` : ""}
    </section>`;
  bindDocFilter(renderAppts);
  $(".date-pick input").onchange = (e) => go(`#/appts?d=${e.target.value}`);
  $(".new").onclick = () => bookModal({ date: d, doctorId: did });
  $$("[data-free]").forEach((b) => b.onclick = () => bookModal({ date: d, time: b.dataset.free, doctorId: did }));
  bindApptButtons(appts);
}

// ---------- المرضى ----------
let ptFilter = "", showArchived = false;
function renderPatients() {
  if (routeName() !== "patients") return;
  const q = ptFilter.trim();
  let arr = q ? PC.list.filter((p) => p.name.includes(q) || p.phone.includes(normPhone(q) || q)) : PC.list;
  arr = arr.filter((p) => !!p.archived === showArchived);
  const existing = $("#pt-q");
  const html = `<ul class="pt-list">${arr.slice(0, 300).map((p) => `<li><a href="#/p/${p.id}/${isDoctor() ? "summary" : "info"}">
      <span class="avatar">${esc(p.name.trim()[0] || "؟")}</span>
      <span class="n">${esc(p.name)}<small dir="ltr">${esc(p.phone)}</small></span>
      ${ageText(p) ? `<span class="muted small">${esc(ageText(p))}</span>` : ""}</a></li>`).join("")}</ul>
      ${arr.length ? "" : empty(q ? "لا توجد نتائج" : "لا يوجد مرضى بعد")}`;
  if (existing) { $("#pt-results").innerHTML = html; return; }
  main().innerHTML = `
    <div class="row-between"><h2 class="page-title">المرضى <span class="muted small">(${PC.list.filter((p) => !p.archived).length})</span></h2>
      <button class="btn primary new">+ مريض جديد</button></div>
    <input id="pt-q" class="search" type="search" placeholder="البحث بالاسم أو رقم الجوال" value="${esc(ptFilter)}" aria-label="بحث">
    <label class="check small"><input type="checkbox" class="arch" ${showArchived ? "checked" : ""}><span>عرض المؤرشفين</span></label>
    <div id="pt-results">${html}</div>`;
  $("#pt-q").oninput = debounce((e) => { ptFilter = e.target.value; renderPatients(); }, 120);
  $(".arch").onchange = (e) => { showArchived = e.target.checked; renderPatients(); };
  $(".new").onclick = () => newPatientModal();
}

export function ageText(p) {
  if (p.dob) {
    const m = Math.floor(daysBetween(p.dob, ymd()) / 30.44);
    if (m < 24) return `${m} شهر`;
    return `${Math.floor(m / 12)} سنة`;
  }
  return p.age ? `${p.age} سنة` : "";
}

export async function newPatientModal({ silentNav = false, name = "", phone = "" } = {}) {
  const kids = hasMod("peds");
  const r = await modal(kids ? "طفل جديد" : "مريض جديد", `<form class="stack">
    ${field(kids ? "اسم الطفل الكامل" : "الاسم الكامل", "name", { required: true, value: name })}
    ${field(kids ? "رقم جوال ولي الأمر" : "رقم الجوال", "phone", { required: true, value: phone, attrs: 'dir="ltr" inputmode="tel"', placeholder: "09xxxxxxxx" })}
    <div class="grid2">
      ${field("تاريخ الميلاد", "dob", { type: "date", required: kids })}
      ${select("الجنس", "sex", [["", "—"], ["f", "أنثى"], ["m", "ذكر"]], hasMod("preg") ? "f" : "")}
    </div>
    <div class="grid2">
      ${field("العمر (إن لم يُعرف تاريخ الميلاد)", "age", { type: "number", attrs: 'min="0" max="120"' })}
      ${select("فصيلة الدم", "bloodType", ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])}
    </div>
    ${field("العنوان", "address")}
    <p class="muted small">${kids ? "يُنشأ لولي الأمر حساب برقم جواله، ويمكنه متابعة أكثر من طفل من الحساب نفسه." : "يُنشأ للمريض حساب تلقائياً برقم جواله."}</p>
  </form>`, {
    ok: "تسجيل",
    onOk: async (f) => {
      const dup = PC.list.find((p) => p.phone === normPhone(f.phone) && p.name.trim() === f.name.trim());
      if (dup && !(await confirmBox("يوجد مريض بالاسم والرقم نفسيهما", "هل تريد تسجيله مرة أخرى؟", "تسجيل"))) return false;
      if (f.dob && !f.age) f.age = Math.floor(daysBetween(f.dob, ymd()) / 365.25);
      const res = await registerPatient(f);
      return { ...res, name: f.name };
    }
  });
  if (!r) return null;
  showCredentials(r.phone, r.tempPassword, r.name, r.shared);
  if (!silentNav) go(`#/p/${r.pid}/${isDoctor() ? "summary" : "info"}`);
  return r;
}

export function showCredentials(phone, temp, name, shared = false) {
  const url = `${location.origin}${location.pathname}#/c/${S.clinic?.slug || ""}`;
  if (shared) return info("تم التسجيل", `<p>لهذا الرقم حساب سابق. أُضيف الملف الجديد إلى الحساب نفسه، ويُختار الملف عند الدخول.</p>`);
  const text = `أهلاً ${name}، هذا حسابك في تطبيق ${S.pub.name}:\n\nحمّل التطبيق من هنا:\n${APP_URL}\n\nبعد فتحه اضغط «دخول» واكتب:\nرقم الجوال: ${phone}\nكلمة المرور المؤقتة: ${temp}\nسيُطلب منك تغييرها عند أول دخول.`;
  info("حساب المريض جاهز", `
    <div class="cred"><div>رقم الدخول: <b dir="ltr">${esc(phone)}</b></div><div>كلمة المرور المؤقتة: <b class="big" dir="ltr">${esc(temp)}</b></div></div>
    <p class="muted small">سلّمها للمريض، وسيُطلب منه تغييرها عند أول دخول. لن تظهر مرة أخرى.</p>
    <a class="btn primary block" target="_blank" rel="noopener" href="${esc(waLink(phone, text))}">إرسال على واتساب</a>`);
}

// ---------- الدفعات ----------
export async function paymentModal(pid, service = "", preset = {}) {
  const p = PC.byId[pid];
  const services = S.clinic?.services || [];
  const price = preset.total ?? services.find((s) => s.name === service)?.price ?? "";
  return modal(`دفعة · ${p?.name || ""}`, `<form class="stack">
    ${select("الخدمة", "service", [["", "—"], ...services.map((s) => [s.name, `${s.name}${s.price ? " · " + money(s.price, cur()) : ""}`]), ["أخرى", "أخرى"], ...(service && !services.some((s) => s.name === service) ? [[service, service]] : [])], service)}
    <div class="grid2">
      ${field("المبلغ المطلوب", "total", { type: "number", value: price, required: true, attrs: 'min="0" inputmode="numeric"' })}
      ${field("المدفوع", "paid", { type: "number", value: preset.paid ?? price, required: true, attrs: 'min="0" inputmode="numeric"' })}
    </div>
    ${field("التاريخ", "date", { type: "date", value: ymd(), required: true })}
    ${field("ملاحظة", "note", { value: preset.note || "" })}
  </form>`, {
    ok: "حفظ الدفعة",
    onOpen: (w) => {
      const f = w.querySelector("form");
      f.service.onchange = () => {
        const pr = services.find((s) => s.name === f.service.value)?.price;
        if (pr) { f.total.value = pr; f.paid.value = pr; }
      };
    },
    onOk: async (f) => {
      const ref = await addDoc(P.col("payments"), {
        patientId: pid, patientName: p?.name || "", service: f.service, total: f.total || 0, paid: f.paid || 0,
        date: f.date, note: f.note, planId: preset.planId || null, by: S.user.uid, byName: S.profile.name || "", createdAt: serverTimestamp()
      });
      await audit("تسجيل دفعة", `${p?.name} ${f.paid}`);
      toast("حُفظت الدفعة");
      if (await confirmBox("إيصال", "هل تريد طباعة إيصال؟", "طباعة")) printReceipt({ id: ref.id, ...f, patientName: p?.name });
      setTimeout(render, 100);
    }
  });
}
export function printReceipt(r) {
  printDoc(S.pub, "إيصال دفع", `
    <table class="kv"><tr><th>رقم الإيصال</th><td dir="ltr">${esc(String(r.id).slice(0, 8).toUpperCase())}</td></tr>
    <tr><th>المريض</th><td>${esc(r.patientName)}</td></tr>
    <tr><th>التاريخ</th><td>${esc(fmtDate(r.date, false))}</td></tr>
    <tr><th>الخدمة</th><td>${esc(r.service || "")}</td></tr>
    <tr><th>المبلغ المطلوب</th><td>${esc(money(r.total, cur()))}</td></tr>
    <tr><th>المدفوع</th><td>${esc(money(r.paid, cur()))}</td></tr>
    <tr><th>المتبقي</th><td>${esc(money((r.total || 0) - (r.paid || 0), cur()))}</td></tr></table>`, { signer: "المحاسب" });
}

async function renderMoney() {
  const pr = params();
  const doc_ = isDoctor();
  const from = pr.get("from") || ymd(), to = pr.get("to") || ymd();
  const pays = (await list(query(P.col("payments"), where("date", ">=", doc_ ? from : ymd()), where("date", "<=", doc_ ? to : ymd()))))
    .sort((a, b) => (b.date + tsMs(b.createdAt)).localeCompare(a.date + tsMs(a.createdAt)));
  const total = pays.reduce((s, p) => s + (p.total || 0), 0), paid = pays.reduce((s, p) => s + (p.paid || 0), 0);
  let debts = "";
  if (doc_) {
    const all = await list(P.col("payments"));
    const per = {};
    all.forEach((p) => { per[p.patientId] = per[p.patientId] || { name: p.patientName, d: 0 }; per[p.patientId].d += (p.total || 0) - (p.paid || 0); });
    const owing = Object.entries(per).filter(([, v]) => v.d > 0).sort((a, b) => b[1].d - a[1].d);
    debts = `<section class="card"><h3>الديون المستحقة</h3>${owing.length ? `<ul class="plain">${owing.map(([id, v]) => `<li class="row-between"><a href="#/p/${id}/money">${esc(v.name)}</a><b>${esc(money(v.d, cur()))}</b></li>`).join("")}</ul>` : empty("لا توجد ديون")}</section>`;
  }
  const monthStart = ymd().slice(0, 8) + "01";
  main().innerHTML = `
    <div class="row-between"><h2 class="page-title">المالية</h2></div>
    ${doc_ ? `<div class="row gap wrap">
      <a class="btn small" href="#/money">اليوم</a>
      <a class="btn small" href="#/money?from=${monthStart}&to=${ymd()}">هذا الشهر</a>
      <label class="field inline"><span>من</span><input type="date" class="f" value="${from}"></label>
      <label class="field inline"><span>إلى</span><input type="date" class="t" value="${to}"></label>
    </div>` : `<p class="muted">دفعات اليوم</p>`}
    <div class="stats">
      <div class="stat"><b>${esc(money(paid, cur()))}</b><span>المقبوض</span></div>
      <div class="stat"><b>${esc(money(total - paid, cur()))}</b><span>المتبقي</span></div>
      <div class="stat"><b>${pays.length}</b><span>عدد الدفعات</span></div>
    </div>
    <section class="card">
      ${pays.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>المريض</th><th>الخدمة</th><th>المدفوع</th><th>التاريخ</th><th></th></tr></thead><tbody>
      ${pays.map((p) => `<tr><td><a href="#/p/${p.patientId}/money">${esc(p.patientName)}</a></td><td>${esc(p.service || "")}</td><td>${esc(money(p.paid, cur()))}${p.total > p.paid ? ` <span class="chip warn">المتبقي ${esc(money(p.total - p.paid, cur()))}</span>` : ""}</td><td>${esc(p.date)}</td>
      <td><button class="icon-btn rc" data-id="${p.id}" aria-label="إيصال">🧾</button></td></tr>`).join("")}</tbody></table></div>` : empty("لا توجد دفعات")}
    </section>${debts}`;
  if (doc_) {
    const upd = () => go(`#/money?from=${$(".f").value}&to=${$(".t").value}`);
    $(".f").onchange = upd; $(".t").onchange = upd;
  }
  $$(".rc").forEach((b) => b.onclick = () => printReceipt(pays.find((p) => p.id === b.dataset.id)));
}

// ---------- المزيد ----------
function renderMore() {
  const a = isAdmin(), d = isDoctor();
  const req = (S._reqCount || 0) + (S._pubCount || 0);
  const groups = [
    ["العمل اليومي", [
      ["#/requests", "طلبات المواعيد", req],
      ["#/messages", "رسائل المرضى", S._msgCount],
      ["#/waitlist", "قائمة الانتظار الاحتياطية"],
      ["#/tv", "شاشة الانتظار (للتلفاز)"],
      ...(feat("inventory") ? [["#/inventory", "المخزون"]] : []),
    ]],
    ...(d ? [["الإدارة", [
      ["#/reports", "التقارير"],
      ...(a ? [["#/team", "الفريق: الأطباء والموظفون"], ["#/settings", "إعدادات العيادة"], ["#/subscription", "الاشتراك والفواتير"], ["#/audit", "سجل التعديلات"], ["#/backup", "النسخة الاحتياطية"]] : []),
    ]]] : []),
    ["الحساب", [["#/password", "تغيير كلمة المرور"]]],
  ];
  const bookLink = S.clinic?.bookingEnabled && feat("booking") ? `${location.origin}${location.pathname}#/b/${S.clinic.slug}` : "";
  main().innerHTML = `<h2 class="page-title">المزيد</h2>
    ${groups.map(([g, items]) => `<h4 class="menu-h">${g}</h4><ul class="menu">${items.map(([h, t, n]) => `<li><a href="${h}"><span>${esc(t)}</span>${n ? `<b class="badge">${n}</b>` : ""}<span class="chev">‹</span></a></li>`).join("")}</ul>`).join("")}
    ${bookLink ? `<h4 class="menu-h">صفحة الحجز</h4><div class="card stack"><code class="copy" dir="ltr">${esc(bookLink)}</code><div class="row gap"><button class="btn small cp">نسخ الرابط</button><a class="btn small" target="_blank" rel="noopener" href="${esc(waLink("", `احجز موعدك في ${S.pub.name}: ${bookLink}`))}">مشاركة</a></div></div>` : ""}
    <ul class="menu"><li><button class="theme"><span>المظهر</span><span class="muted">${{ auto: "تلقائي", light: "فاتح", dark: "داكن" }[localStorage.getItem("theme") || "auto"] || "تلقائي"}</span></button></li>
    <li><button class="out"><span>تسجيل الخروج</span></button></li></ul>
    <p class="muted small center">${esc(PLATFORM())}</p>
    <p class="copyright">${esc(COPYRIGHT)}</p>`;
  $(".out").onclick = logout;
  $(".cp")?.addEventListener("click", async () => { try { await navigator.clipboard.writeText(bookLink); toast("تم نسخ الرابط"); } catch { toast("انسخ الرابط يدوياً", true); } });
  $(".theme").onclick = async () => {
    const { applyTheme } = await import("./ui.js");
    const curT = localStorage.getItem("theme") || "auto";
    const next = { auto: "dark", dark: "light", light: "auto" }[curT];
    try { localStorage.setItem("theme", next); } catch {}
    applyTheme(next); renderMore();
  };
}

// ---------- طلبات المواعيد ----------
async function renderRequests() {
  const reqs = (await list(query(P.col("requests"), where("status", "==", "new")))).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const pubs = (await list(query(P.col("publicRequests"), where("status", "==", "new")))).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  main().innerHTML = `<h2 class="page-title">طلبات المواعيد</h2>
    ${pubs.length || feat("booking") ? `<section class="card"><h3>من صفحة الحجز العامة</h3>${pubs.length ? `<ul class="plain">${pubs.map((r) => `<li class="req">
      <div><b>${esc(r.name)}</b> <span class="muted" dir="ltr">${esc(r.phone)}</span> ${PC.list.some((p) => p.phone === r.phone) ? `<span class="chip ok">مريض سابق</span>` : `<span class="chip">جديد</span>`}</div>
      <div>${esc(fmtDate(r.date))} · ${esc(fmtTime(r.time))}${r.service ? " · " + esc(r.service) : ""}${multiDoc() ? ` · د. ${esc(docName(r.doctorId))}` : ""}</div>
      ${r.note ? `<div class="muted">${esc(r.note)}</div>` : ""}
      <div class="row gap"><button class="btn primary small pok" data-id="${r.id}">تأكيد الموعد</button><button class="btn small pno" data-id="${r.id}">اعتذار</button><a class="btn small" href="tel:${esc(r.phone)}">اتصال</a></div>
    </li>`).join("")}</ul>` : empty("لا توجد طلبات جديدة")}</section>` : ""}
    <section class="card"><h3>من تطبيق المرضى</h3>${reqs.length ? `<ul class="plain">${reqs.map((r) => `<li class="req">
      <div><b>${esc(r.patientName)}</b> <span class="muted" dir="ltr">${esc(r.phone || "")}</span></div>
      <div>يطلب موعداً: ${esc(fmtDate(r.date))} · ${esc(r.period || "")} ${r.type ? "· " + esc(r.type) : ""}</div>
      ${r.note ? `<div class="muted">${esc(r.note)}</div>` : ""}
      <div class="row gap"><button class="btn primary small ok" data-id="${r.id}">تثبيت موعد</button><button class="btn small no" data-id="${r.id}">اعتذار</button></div>
    </li>`).join("")}</ul>` : empty("لا توجد طلبات جديدة")}</section>`;
  $$(".req .ok").forEach((b) => b.onclick = () => {
    const r = reqs.find((x) => x.id === b.dataset.id);
    bookModal({ pid: r.patientId, date: r.date, type: r.type, note: r.note, requestId: r.id, title: "تثبيت الطلب" });
  });
  $$(".req .no").forEach((b) => b.onclick = async () => {
    const r = reqs.find((x) => x.id === b.dataset.id);
    await updateDoc(P.colDoc("requests", r.id), { status: "rejected" });
    offerNotify(r.phone, `مرحباً ${r.patientName}، نعتذر، لا يوجد موعد متاح في التاريخ الذي طلبته (${fmtDate(r.date)}). يرجى التواصل معنا لإيجاد وقت آخر.`);
    render();
  });
  $$(".pok").forEach((b) => b.onclick = () => confirmPublic(pubs.find((x) => x.id === b.dataset.id)));
  $$(".pno").forEach((b) => b.onclick = async () => {
    const r = pubs.find((x) => x.id === b.dataset.id);
    await updateDoc(P.colDoc("publicRequests", r.id), { status: "rejected" });
    offerNotify(r.phone, `مرحباً ${r.name}، نعتذر، الموعد الذي طلبته في ${S.pub.name} (${fmtDate(r.date)} الساعة ${fmtTime(r.time)}) غير متاح. يرجى التواصل معنا لإيجاد وقت آخر.`);
    render();
  });
}

async function confirmPublic(r) {
  const matches = PC.list.filter((p) => p.phone === r.phone);
  const choice = await modal(`تأكيد موعد ${r.name}`, `<form class="stack">
    <p>${esc(fmtDate(r.date))} · ${esc(fmtTime(r.time))}${multiDoc() ? ` · د. ${esc(docName(r.doctorId))}` : ""}</p>
    <h4>ملف المريض</h4>
    ${matches.map((p, i) => `<label class="check"><input type="radio" name="who" value="${p.id}" ${i === 0 ? "checked" : ""}><span>${esc(p.name)} (ملف موجود)</span></label>`).join("")}
    <label class="check"><input type="radio" name="who" value="new" ${matches.length ? "" : "checked"}><span>ملف جديد باسم «${esc(r.name)}»</span></label>
  </form>`, {
    ok: "تأكيد",
    onOk: (f, w) => w.querySelector("input[name=who]:checked")?.value || "new"
  });
  if (!choice) return;
  try {
    let pid = choice;
    if (choice === "new") {
      const res = await registerPatient({ name: r.name, phone: r.phone });
      pid = res.pid;
      PC.byId[pid] = { id: pid, name: r.name, phone: normPhone(r.phone) };
      if (res.tempPassword) showCredentials(res.phone, res.tempPassword, r.name);
    }
    const ap = await bookAppointment({ pid, date: r.date, time: r.time, type: r.service, note: r.note, doctorId: r.doctorId && doctors().some((d) => d.id === r.doctorId) ? r.doctorId : defaultDoc() });
    await updateDoc(P.colDoc("publicRequests", r.id), { status: "done", apptId: ap.id, patientId: pid });
    toast("تم تأكيد الموعد");
    if (choice !== "new") offerNotify(r.phone, `مرحباً ${r.name}، تم تأكيد موعدك في ${S.pub.name} يوم ${fmtDate(r.date)} الساعة ${fmtTime(r.time)}.`);
  } catch (e) { toast(errMsg(e), true); }
  render();
}

// ---------- قائمة الانتظار الاحتياطية ----------
async function renderWaitlist() {
  const wl = (await list(query(P.col("waitlist"), where("status", "==", "waiting")))).sort((a, b) => tsMs(a.createdAt) - tsMs(b.createdAt));
  main().innerHTML = `<div class="row-between"><h2 class="page-title">قائمة الانتظار الاحتياطية</h2><button class="btn primary add">+ إضافة</button></div>
    <p class="muted">مرضى يرغبون في أقرب موعد. عند إلغاء أي موعد، اتصل بالأول في القائمة.</p>
    <section class="card">${wl.length ? `<ol class="plain num">${wl.map((w) => `<li class="req">
      <div><b>${esc(w.patientName)}</b> <span class="muted" dir="ltr">${esc(w.phone)}</span></div>
      ${w.note ? `<div class="muted">${esc(w.note)}</div>` : ""}
      <div class="row gap"><a class="btn small" href="tel:${esc(w.phone)}">اتصال</a>
      <button class="btn primary small bk" data-id="${w.id}">حجز موعد</button><button class="btn small rm" data-id="${w.id}">إزالة</button></div></li>`).join("")}</ol>` : empty("القائمة فارغة")}</section>`;
  $(".add").onclick = async () => {
    await modal("إضافة لقائمة الانتظار", `<form class="stack">
      <label class="field"><span>المريض</span><input class="pt-search" autocomplete="off" placeholder="اكتب الاسم أو الرقم"><input type="hidden" name="pid" required></label>
      <div class="pt-results"></div>${field("ملاحظة (الأيام أو الأوقات المناسبة)", "note")}</form>`, {
      onOpen: (w) => {
        const s = w.querySelector(".pt-search"), f = w.querySelector("form");
        s.oninput = debounce(() => {
          const res = s.value.trim() ? searchPatients(s.value.trim()).slice(0, 6) : [];
          w.querySelector(".pt-results").innerHTML = res.map((p) => `<button type="button" class="pt-pick" data-id="${p.id}">${esc(p.name)}</button>`).join("");
          w.querySelectorAll(".pt-pick").forEach((b) => b.onclick = () => { f.pid.value = b.dataset.id; s.value = PC.byId[b.dataset.id].name; w.querySelector(".pt-results").innerHTML = ""; });
        }, 150);
      },
      onOk: async (f) => {
        if (!f.pid) { toast("اختر المريض", true); return false; }
        const p = PC.byId[f.pid];
        await addDoc(P.col("waitlist"), { patientId: p.id, patientName: p.name, phone: p.phone, note: f.note, status: "waiting", createdAt: serverTimestamp() });
      }
    });
    render();
  };
  $$(".rm").forEach((b) => b.onclick = async () => { await updateDoc(P.colDoc("waitlist", b.dataset.id), { status: "done" }); render(); });
  $$(".bk").forEach((b) => b.onclick = async () => {
    const w = wl.find((x) => x.id === b.dataset.id);
    const r = await bookModal({ pid: w.patientId });
    if (r) { await updateDoc(P.colDoc("waitlist", w.id), { status: "done" }); render(); }
  });
}

// ---------- الرسائل ----------
async function renderMessages() {
  const unread = PC.list.filter((p) => p.lastMsgFrom === "patient");
  const recent = PC.list.filter((p) => p.lastMsgAt && p.lastMsgFrom !== "patient")
    .sort((a, b) => tsMs(b.lastMsgAt) - tsMs(a.lastMsgAt)).slice(0, 30);
  const row = (p, bold) => `<li><a href="#/p/${p.id}/msgs"><span class="avatar">${esc(p.name[0])}</span><span class="n">${bold ? `<b>${esc(p.name)}</b>` : esc(p.name)}<small>${esc(tsDate(p.lastMsgAt))}</small></span>${bold ? `<b class="badge">جديد</b>` : ""}</a></li>`;
  main().innerHTML = `<h2 class="page-title">رسائل المرضى</h2>
    <section class="card"><h3>بانتظار رد</h3>${unread.length ? `<ul class="pt-list">${unread.map((p) => row(p, true)).join("")}</ul>` : empty("لا توجد رسائل جديدة")}</section>
    ${recent.length ? `<section class="card"><h3>محادثات سابقة</h3><ul class="pt-list">${recent.map((p) => row(p, false)).join("")}</ul></section>` : ""}`;
}

// ---------- شاشة الانتظار ----------
// ---------- شاشة الانتظار (وضع التلفاز) ----------
function openTvMode() {
  const ov = document.createElement("div");
  ov.className = "tvx";
  ov.innerHTML = `
    <div class="tvx-top">
      <div class="tvx-brand">${logoHtml(S.pub, 84)}<div><b>${esc(S.pub.name || "")}</b><span>${esc(S.pub.title || "")}</span></div></div>
      <div class="tvx-clock"><b class="tvx-time">--:--</b><span class="tvx-date"></span></div>
    </div>
    <div class="tvx-main">
      <div class="tvx-label">الدور الحالي</div>
      <div class="tvx-num">—</div>
      <div class="tvx-doc"></div>
    </div>
    <div class="tvx-side"><div class="tvx-label sm">في الانتظار</div><div class="tvx-wait"></div></div>
    <div class="tvx-foot">نتمنى لكم دوام الصحة والعافية</div>
    <div class="tvx-ctl"><button class="btn primary tvx-next">استدعاء الدور التالي</button><button class="btn tvx-exit">خروج</button></div>`;
  document.body.appendChild(ov);
  document.body.classList.add("tv-on");
  const unsubs = [];
  let lastNum = null, ctlTimer = null, wake = null;
  const showCtl = () => { ov.classList.add("ctl"); clearTimeout(ctlTimer); ctlTimer = setTimeout(() => ov.classList.remove("ctl"), 4000); };
  ov.addEventListener("click", (e) => { if (!e.target.closest(".tvx-ctl")) showCtl(); });
  showCtl();
  const tick = () => {
    const d = new Date();
    ov.querySelector(".tvx-time").textContent = d.toLocaleTimeString("ar-SY-u-nu-latn", { hour: "numeric", minute: "2-digit" });
    ov.querySelector(".tvx-date").textContent = d.toLocaleDateString("ar-SY-u-nu-latn", { weekday: "long", day: "numeric", month: "long" });
  };
  tick(); const clock = setInterval(tick, 15000);
  // صوت الاستدعاء: نغمة تنبيه قوية
  let ac = null;
  const audio = () => {
    try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch {}
    return ac;
  };
  audio();
  const tone = (ctx, f, t, len, vol) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + len);
    o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + len + 0.05);
  };
  const chime = () => {
    const ctx = audio(); if (!ctx) return;
    try { [[784, 0], [988, 0.45], [784, 0.9]].forEach(([f, t]) => tone(ctx, f, t, 1.1, 0.7)); } catch {}
  };
  ov.addEventListener("click", audio);
  unsubs.push(onSnapshot(P.colDoc("live", "queue"), (s) => {
    const n = s.data()?.number ?? "—", el = ov.querySelector(".tvx-num");
    el.textContent = n; el.classList.toggle("empty", n === "—");
    ov.querySelector(".tvx-label").textContent = n === "—" ? "أهلا وسهلا بكم" : "الدور الحالي";
    if (n === "—") el.textContent = "بانتظار الدور الأول";
    ov.querySelector(".tvx-doc").textContent = s.data()?.doctor ? `يرجى التوجه إلى د. ${s.data().doctor}` : (n !== "—" ? "يرجى التوجه إلى غرفة الطبيب" : "");
    if (lastNum !== null && n !== lastNum) { el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); chime(); }
    lastNum = n;
  }));
  unsubs.push(onSnapshot(query(P.col("appointments"), where("date", "==", ymd())), (s) => {
    const w = s.docs.map((d) => d.data()).filter((a) => a.status === "arrived" && a.queueNo).sort((a, b) => a.queueNo - b.queueNo);
    ov.querySelector(".tvx-wait").innerHTML = w.length ? w.slice(0, 8).map((a) => `<span>${a.queueNo}</span>`).join("") : `<i>لا يوجد</i>`;
  }));
  // ملء الشاشة الحقيقي + إبقاء الشاشة مضاءة
  try { (ov.requestFullscreen || ov.webkitRequestFullscreen)?.call(ov)?.catch?.(() => {}); } catch {}
  try { window.AndroidApp?.setFullscreen?.(true); } catch {}
  navigator.wakeLock?.request("screen").then((l) => { wake = l; }).catch(() => {});
  const close = () => {
    unsubs.forEach((u) => { try { u(); } catch {} });
    clearInterval(clock); clearTimeout(ctlTimer);
    try { if (document.fullscreenElement) document.exitFullscreen(); else if (document.webkitFullscreenElement) document.webkitExitFullscreen(); } catch {}
    try { window.AndroidApp?.setFullscreen?.(false); } catch {}
    try { wake?.release(); } catch {}
    document.removeEventListener("keydown", onKey); window.removeEventListener("hashchange", close);
    document.body.classList.remove("tv-on"); ov.remove();
  };
  // ريموت التلفاز: أي زر يظهر أزرار التحكم
  const onKey = (e) => {
    audio();
    if (e.key === "Escape" || e.key === "GoBack" || e.key === "BrowserBack") return close();
    if (!ov.classList.contains("ctl") || !document.activeElement?.closest?.(".tvx-ctl")) { e.preventDefault(); showCtl(); ov.querySelector(".tvx-next").focus(); return; }
    showCtl();
  };
  document.addEventListener("keydown", onKey);
  window.addEventListener("hashchange", close);
  ov.querySelector(".tvx-exit").onclick = close;
  ov.querySelector(".tvx-next").onclick = () => { showCtl(); callNext(); };
}

// استدعاء الدور التالي: يحدّث شاشة الانتظار على كل الأجهزة فوراً
async function callNext() {
  const today = ymd();
  const arr = byDoc((await list(query(P.col("appointments"), where("date", "==", today))))).filter((a) => a.status === "arrived" && a.queueNo).sort((a, b) => a.queueNo - b.queueNo);
  if (!arr.length) return info("لا يوجد أحد في الانتظار", `<p>يأخذ المريض رقم الدور عند وصوله إلى العيادة.</p><p>من «المواعيد» افتح موعد المريض واضغط <b>«حضر ✓»</b>، فيظهر رقمه هنا وعلى شاشة التلفاز، ثم اضغط «استدعاء الدور التالي».</p>`);
  const a = arr[0];
  await updateDoc(P.colDoc("appointments", a.id), { status: "in" });
  await callNumber(a.queueNo, apptDoc(a));
  toast(`تم استدعاء الرقم ${a.queueNo}`);
}

function renderTv() {
  main().innerHTML = `<div class="tv">
    <div class="tv-brand">${logoHtml(S.pub, 90)}<div><h1>${esc(S.pub.name)}</h1><p>${esc(S.pub.title || "")}</p></div></div>
    <p class="muted small tv-help">الدور يعمل لمواعيد اليوم: عند وصول المريض افتح موعده واضغط «حضر ✓» ليأخذ رقماً، ثم استدعه من هنا.</p>
    <div class="tv-label">الدور الحالي</div><div class="tv-num">—</div><div class="tv-doc muted"></div>
    <div class="row gap no-tv"><button class="btn primary next">استدعاء الدور التالي</button><button class="btn fs">تشغيل على التلفاز (ملء الشاشة)</button></div>
  </div>`;
  S.unsub.push(onSnapshot(P.colDoc("live", "queue"), (s) => {
    const el = $(".tv-num");
    if (!el) return;
    el.textContent = s.data()?.number ?? "—"; el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse");
    const d = $(".tv-doc"); if (d) d.textContent = s.data()?.doctor ? `إلى د. ${s.data().doctor}` : "";
  }));
  $(".next").onclick = callNext;
  $(".fs").onclick = openTvMode;
}

// ---------- التقارير ----------
async function renderReports() {
  const m = params().get("m") || ymd().slice(0, 7);
  const from = m + "-01", to = m + "-31";
  const appts = await list(query(P.col("appointments"), where("date", ">=", from), where("date", "<=", to)));
  const pays = await list(query(P.col("payments"), where("date", ">=", from), where("date", "<=", to)));
  const stats = await list(query(P.col("stats"), where("date", ">=", from), where("date", "<=", to)));
  const cnt = (s, arr = appts) => arr.filter((a) => a.status === s).length;
  const real = appts.filter((a) => a.status !== "cancelled");
  const noshowRate = real.length ? Math.round(cnt("noshow") / real.length * 100) : 0;
  const [y, mo] = m.split("-").map(Number);
  const mStart = new Date(y, mo - 1, 1).getTime(), mEnd = new Date(y, mo, 1).getTime();
  const newPts = PC.list.filter((p) => tsMs(p.createdAt) >= mStart && tsMs(p.createdAt) < mEnd).length;
  const diag = {};
  stats.forEach((s) => (s.diagnosis || "").split(/[،,]/).map((x) => x.trim()).filter(Boolean).forEach((d) => diag[d] = (diag[d] || 0) + 1));
  const topDiag = Object.entries(diag).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const rated = appts.filter((a) => a.rating);
  const avgRating = rated.length ? (rated.reduce((s, a) => s + a.rating, 0) / rated.length).toFixed(1) : "—";
  const byType = {};
  real.forEach((a) => byType[a.type || "دون نوع"] = (byType[a.type || "دون نوع"] || 0) + 1);
  const maxT = Math.max(1, ...Object.values(byType));
  const perDoc = multiDoc() ? doctors().map((d) => { const mine = real.filter((a) => apptDoc(a) === d.id); return [d.name, mine.length, cnt("done", mine)]; }) : [];
  // الدخل اليومي خلال الشهر
  const daily = {};
  pays.forEach((p) => daily[p.date] = (daily[p.date] || 0) + (p.paid || 0));
  const { lineChart } = await import("./ui.js");
  const chart = Object.keys(daily).length > 1 ? lineChart([{ name: "المقبوض", color: "var(--accent)", points: Object.entries(daily).map(([date, v]) => ({ date, v })) }], { label: "المقبوض يومياً", unit: cur() }) : "";
  main().innerHTML = `<div class="row-between"><h2 class="page-title">التقارير</h2><input type="month" class="mp" value="${m}" aria-label="الشهر"></div>
    <div class="stats">
      <div class="stat"><b>${cnt("done")}</b><span>زيارات منجزة</span></div>
      <div class="stat"><b>${newPts}</b><span>مرضى جدد</span></div>
      <div class="stat"><b>${noshowRate}%</b><span>نسبة الغياب</span></div>
      <div class="stat"><b>${esc(money(pays.reduce((s, p) => s + (p.paid || 0), 0), cur()))}</b><span>المقبوض</span></div>
      <div class="stat"><b>${esc(money(pays.reduce((s, p) => s + (p.total || 0) - (p.paid || 0), 0), cur()))}</b><span>ديون الشهر</span></div>
      <div class="stat"><b>${avgRating}</b><span>متوسط التقييم (${rated.length})</span></div>
    </div>
    ${chart ? `<section class="card">${chart}</section>` : ""}
    ${perDoc.length ? `<section class="card"><h3>حسب الطبيب</h3><table class="tbl"><thead><tr><th>الطبيب</th><th>المواعيد</th><th>المنجزة</th></tr></thead><tbody>${perDoc.map(([n, a, d]) => `<tr><td>د. ${esc(n)}</td><td>${a}</td><td>${d}</td></tr>`).join("")}</tbody></table></section>` : ""}
    <section class="card"><h3>المواعيد حسب النوع</h3>
      ${Object.keys(byType).length ? `<div class="bars">${Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<div class="bar-row"><span>${esc(t)}</span><div class="bar"><i style="width:${n / maxT * 100}%"></i></div><b>${n}</b></div>`).join("")}</div>` : empty("لا توجد بيانات")}
    </section>
    <section class="card"><h3>أكثر التشخيصات</h3>
      ${topDiag.length ? `<ol class="plain num">${topDiag.map(([d, n]) => `<li class="row-between"><span>${esc(d)}</span><b>${n}</b></li>`).join("")}</ol>` : empty("لا توجد تشخيصات مسجلة")}
    </section>
    <section class="card"><h3>تقييمات المرضى</h3>
      ${rated.filter((a) => a.ratingNote).slice(0, 20).map((a) => `<p>${"★".repeat(a.rating)}${"☆".repeat(5 - a.rating)} ${esc(a.ratingNote)}</p>`).join("") || empty("لا توجد تعليقات")}
    </section>`;
  $(".mp").onchange = (e) => go(`#/reports?m=${e.target.value}`);
}

// ---------- سجل التعديلات ----------
async function renderAudit() {
  const rows = await list(query(P.col("audit"), orderBy("at", "desc"), limit(300)));
  main().innerHTML = `<h2 class="page-title">سجل التعديلات</h2>
    <section class="card">${rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td dir="ltr">${esc(tsDate(r.at))}</td><td>${esc(r.byName)}</td><td>${esc(r.action)}${r.target ? ` · <span class="muted">${esc(r.target)}</span>` : ""}</td></tr>`).join("")}</tbody></table></div>` : empty("السجل فارغ")}</section>`;
}

// ---------- النسخة الاحتياطية ----------
function renderBackup() {
  main().innerHTML = `<h2 class="page-title">النسخة الاحتياطية</h2>
    <section class="card stack">
      <p>يُنزَّل ملف يحتوي جميع بيانات العيادة (المرضى، الملفات الطبية، المواعيد، المالية، المخزون). احفظه في مكان آمن، مثل Google Drive.</p>
      <p class="muted small">يُنصح بنسخة أسبوعية. يحتوي الملف بيانات طبية حساسة، فلا ترسله لأحد.</p>
      <button class="btn primary go">تنزيل نسخة احتياطية الآن</button>
      <div class="prog muted"></div>
    </section>`;
  $(".go").onclick = async () => {
    const prog = $(".prog"), btn = $(".go");
    btn.disabled = true;
    try {
      const out = { exportedAt: new Date().toISOString(), clinic: S.clinic, patients: [] };
      for (const k of ["appointments", "payments", "requests", "publicRequests", "waitlist", "pregAlerts", "stats", "inbox", "inventory"]) {
        prog.textContent = `جارٍ: ${k}…`;
        out[k] = await list(P.col(k)).catch(() => []);
      }
      const subs = ["medical", "visits", "prescriptions", "pregnancies", "fertility", "labs", "private", "procedures", "files", "messages", "dental", "plans", "growth", "vaccines", "vitals", "eye", "physio"];
      let i = 0;
      for (const p of PC.list) {
        i++; prog.textContent = `المرضى ${i}/${PC.list.length}`;
        const rec = { ...p };
        for (const s of subs) rec[s] = await list(P.sub(p.id, s)).catch(() => []);
        for (const s of ["files", "private"]) for (const f of rec[s]) if (!f.data && f.store) f.data = await fileData(P.sub(p.id, s), f).catch(() => null);
        out.patients.push(rec);
      }
      download(`${S.clinic?.slug || "clinic"}-backup-${ymd()}.json`, JSON.stringify(out, (k, v) => (v && typeof v === "object" && "seconds" in v && "nanoseconds" in v) ? new Date(v.seconds * 1000).toISOString() : v));
      await audit("تنزيل نسخة احتياطية");
      prog.textContent = "تم ✓";
    } catch (e) { toast(errMsg(e), true); prog.textContent = ""; }
    btn.disabled = false;
  };
}
