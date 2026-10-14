// ميزات الدور الحي لفريق العيادة: تسجيل الحضور بـ QR، أرقام الانتظار للمرضى، الاعتذار من التطبيق، وملخص آخر اليوم للطبيب
import { P, query, where, onSnapshot, updateDoc, setDoc, getDoc, list, serverTimestamp, audit } from "./fb.js";
import { $, toast, ymd, addDays, money, qrSvg, printDoc } from "./ui.js";
import { S } from "./app.js";
import { apptDoc, qLab, nextQueueNo, markBusy, multiDoc, readOnly, isDoctor, cur } from "./staff.js";

// ---------- مراقبة مواعيد اليوم والقادمة ----------
let lastWait = "", busy = false, again = false;
export function watchToday() {
  const today = ymd();
  let timer = null;
  S.unsub.push(onSnapshot(query(P.col("appointments"), where("date", ">=", today)), (s) => {
    const arr = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    clearTimeout(timer); timer = setTimeout(() => process(arr, today), 700);
  }, () => {}));
}
async function process(arr, today) {
  if (readOnly()) return;
  if (busy) { again = arr; return; }
  busy = true;
  try {
    // 1) من سجّل حضوره بمسح QR: نعطيه رقم دور
    for (const a of arr.filter((x) => x.date === today && x.status === "arrived" && x.checkin && !x.queueNo)) {
      await new Promise((r) => setTimeout(r, Math.random() * 1500));
      const fresh = await getDoc(P.colDoc("appointments", a.id)).then((d) => d.data()).catch(() => null);
      if (!fresh || fresh.queueNo || fresh.status !== "arrived") continue;
      const q = await nextQueueNo(today, apptDoc(a));
      await updateDoc(P.colDoc("appointments", a.id), { queueNo: q, updatedAt: serverTimestamp() });
      a.queueNo = q;
      toast(`📲 ${a.patientName} سجّل حضوره بمسح الرمز · رقم الدور ${qLab(q, apptDoc(a))}`);
    }
    // 2) موعد ألغاه المريض من التطبيق: نحرر الوقت ليُحجز لغيره
    for (const a of arr.filter((x) => x.status === "cancelled" && x.cancelledBy === "patient" && !x.busyFreed)) {
      await markBusy(a.date, a.time, apptDoc(a), false);
      await updateDoc(P.colDoc("appointments", a.id), { busyFreed: true }).catch(() => {});
    }
    // 3) أرقام المنتظرين (أرقام فقط، دون أسماء) ليعرف كل مريض كم شخصاً قبله
    const wait = {};
    arr.filter((x) => x.date === today && x.status === "arrived" && x.queueNo).forEach((x) => { (wait[apptDoc(x)] ||= []).push(x.queueNo); });
    Object.values(wait).forEach((v) => v.sort((a, b) => a - b));
    const key = JSON.stringify(wait);
    if (key !== lastWait) { lastWait = key; await setDoc(P.colDoc("live", "queue"), { wait, waitDay: today }, { merge: true }).catch(() => {}); }
  } catch (e) { console.warn(e); }
  busy = false;
  if (again) { const a = again; again = false; process(a, today); }
}

// ---------- رمز QR على باب العيادة ----------
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
export const checkinUrl = (code) => `${location.origin}${location.pathname.replace(/[^/]*$/, "")}#/checkin/${S.profile.clinicId}.${code}`;
export async function renderCheckinQr() {
  const main = $("#main");
  let d = (await getDoc(P.colDoc("live", "checkin")).catch(() => null))?.data();
  if (!d?.code) { d = { code: newCode() }; await setDoc(P.colDoc("live", "checkin"), { code: d.code, at: serverTimestamp() }); }
  const url = checkinUrl(d.code);
  main.innerHTML = `<h2 class="page-title">تسجيل الحضور بمسح QR</h2>
    <section class="card stack center">
      <p>اطبع هذا الرمز وعلّقه على باب العيادة أو عند الاستقبال. عند وصول المريض يمسحه بكاميرا جواله فيُسجَّل حضوره ويأخذ رقم دور تلقائياً، ويرى في تطبيقه كم شخصاً قبله.</p>
      <div class="qr-box">${qrSvg(url, 240)}</div>
      <div class="row gap center"><button class="btn primary pr">🖨 طباعة الرمز</button><button class="btn rot">تغيير الرمز</button></div>
      <p class="muted small">يعمل للمرضى الذين لديهم موعد اليوم وحساب في التطبيق. رقم الدور يُعطى تلقائياً ما دام جهاز الاستقبال أو الطبيب مفتوحاً. «تغيير الرمز» يلغي الرمز القديم إذا انتشر صورة له.</p>
    </section>`;
  $(".pr").onclick = () => printDoc(S.pub, "تسجيل الحضور", `<div style="text-align:center">
      <h1 style="font-size:34px;margin:10px 0">أهلاً بك 👋</h1><p style="font-size:22px">امسح الرمز بكاميرا جوالك لتسجيل حضورك<br>وأخذ رقم الدور</p>
      <div style="margin:24px auto;width:320px">${qrSvg(url, 320)}</div>
      <p style="font-size:18px">ستعرف في التطبيق كم شخصاً قبلك، ويصلك تنبيه عند اقتراب دورك.</p></div>`);
  $(".rot").onclick = async () => { await setDoc(P.colDoc("live", "checkin"), { code: newCode(), at: serverTimestamp() }); await audit("تغيير رمز تسجيل الحضور"); toast("تم تغيير الرمز، اطبع الرمز الجديد"); renderCheckinQr(); };
}

// ---------- ملخص آخر اليوم للطبيب ----------
export async function daySummary(day = ymd()) {
  const mine = (a) => !multiDoc() || !S.profile.doctorId || apptDoc(a) === S.profile.doctorId;
  const [ap, tm, pays] = await Promise.all([
    list(query(P.col("appointments"), where("date", "==", day))),
    list(query(P.col("appointments"), where("date", "==", addDays(day, 1)))),
    list(query(P.col("payments"), where("date", "==", day))).catch(() => []),
  ]);
  const a = ap.filter(mine);
  return {
    seen: a.filter((x) => x.status === "done").length,
    noshow: a.filter((x) => x.status === "noshow" || (x.status === "confirmed" && x.time < new Date().toTimeString().slice(0, 5))).length,
    income: pays.filter((p) => !multiDoc() || !S.profile.doctorId || !p.doctorId || p.doctorId === S.profile.doctorId).reduce((s, p) => s + (Number(p.paid) || 0), 0),
    tomorrow: tm.filter(mine).filter((x) => x.status !== "cancelled").length,
  };
}
export const summaryText = (x) => `المرضى المعايَنون اليوم: ${x.seen} · الدخل: ${money(x.income, cur())}${x.noshow ? ` · الغياب: ${x.noshow}` : ""} · مواعيد الغد: ${x.tomorrow}`;
const SUM_ON = () => { try { return localStorage.getItem("daySum") !== "off"; } catch { return true; } };
export function setSummaryOn(on) { try { localStorage.setItem("daySum", on ? "on" : "off"); } catch {} scheduleSummary(); }
export const summaryOn = SUM_ON;
let sumTimer = null;
// إشعار الساعة 9 مساءً بملخص اليوم؛ يُحدَّث كل مرة يُغلق فيها التطبيق أو يُفتح
export async function scheduleSummary() {
  if (!isDoctor()) return;
  const at = new Date(); at.setHours(21, 0, 0, 0);
  const native = typeof window.AndroidApp?.setReminders === "function";
  clearTimeout(sumTimer);
  if (!SUM_ON() || Date.now() > +at) { if (native && !SUM_ON()) window.AndroidApp.setReminders("[]"); return; }
  let x; try { x = await daySummary(); } catch { return; }
  const title = "🌙 ملخص اليوم", body = summaryText(x);
  if (native) { window.AndroidApp.setReminders(JSON.stringify([{ id: "daysum-" + ymd(), at: +at, title, body }])); return; }
  if ("Notification" in window && Notification.permission === "granted") sumTimer = setTimeout(async () => {
    const y = await daySummary().catch(() => x);
    const reg = await navigator.serviceWorker?.getRegistration();
    const o = { body: summaryText(y), icon: "icon-192.png", tag: "daysum", data: { url: "./#/" } };
    if (reg) reg.showNotification(title, o); else new Notification(title, o);
  }, +at - Date.now());
}
export function startSummary() {
  scheduleSummary();
  document.addEventListener("visibilitychange", () => { if (document.hidden) scheduleSummary(); });
}
