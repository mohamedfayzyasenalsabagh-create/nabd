// نسب الأطباء: حصة كل طبيب من عمله، السلف، وتسليم الحصة الشهرية
// - النسبة حسب نوع الخدمة (معالجة وتلبيس / جراحة وزرع)، أو مبلغ ثابت لخدمة معيّنة
// - الأساس: من المقبوض فعلاً (افتراضي) أو من قيمة العمل، حسب إعدادات العيادة
// - كلفة المخبر أو المواد تُخصم قبل النسبة (بنسبة ما قُبض من العمل)
// - التسديدات اللاحقة تُوزَّع على أقدم الأعمال غير المسددة للمريض نفسه
import { S } from "./app.js";
import { db, P, list, one, doc, setDoc, addDoc, updateDoc, query, where, collection, serverTimestamp, audit, tsMs } from "./fb.js";
import { $, $$, esc, ymd, money, toast, errMsg, modal, field, select, empty, fmtDate, printDoc, confirmBox } from "./ui.js";
import { isAdmin, isAcct, isDoctor, cp, doctors, docName, cur, render } from "./staff.js";

export const CAT = { treat: "معالجة وتلبيس", surg: "جراحة وزرع" };
export const commOn = () => !!S.clinic?.commission?.enabled;
// من يرى حصص كل الأطباء ويسجّل السلف والتسليم
export const canComm = () => isAdmin() || isAcct() || cp("commissions");
// من يحدد النسب
export const canRates = () => isAdmin() || cp("commissions");
const basis = () => (S.clinic?.commission?.basis === "value" ? "value" : "paid");
export const svcCat = (name) => ((S.clinic?.services || []).find((s) => s.name === name)?.cat === "surg" ? "surg" : "treat");
const ym = (d) => String(d || "").slice(0, 7);
const dm = (d) => { const x = String(d || ""); return x.length >= 10 ? `${Number(x.slice(8, 10))}/${Number(x.slice(5, 7))}` : x; };
const r2 = (n) => Math.round(n * 100) / 100;
const prevYm = (m) => { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

// النسبة السارية في شهر العمل: آخر نسبة تبدأ في هذا الشهر أو قبله
export function rateAt(cm, m) {
  const rs = (cm?.rates || []).filter((r) => r.from <= m).sort((a, b) => a.from.localeCompare(b.from));
  return rs[rs.length - 1] || null;
}

// يحسب حصص الأطباء من كل الدفعات: { [doctorId]: { [YYYY-MM]: { share, received, lab, works, lines[] } } }
export function computeShares(pays, comms, how = basis()) {
  const out = {};
  const add = (did, m, line) => {
    const b = ((out[did] ||= {})[m] ||= { share: 0, received: 0, lab: 0, works: 0, lines: [] });
    b.share = r2(b.share + line.share); b.received = r2(b.received + line.amount); b.lab = r2(b.lab + line.lab); b.lines.push(line);
    if (line.isWork) b.works++;
  };
  const shareOf = (ch, amount) => {
    const did = ch.rec.doctorId, cm = comms[did] || {}, total = ch.total;
    const lab = total ? ch.lab * (amount / total) : 0;
    const fixed = cm.fixed?.[ch.rec.service];
    if (fixed != null && fixed !== "" && !isNaN(Number(fixed))) return { share: r2(Number(fixed) * (total ? amount / total : 0)), lab: r2(lab), pct: null, fixed: Number(fixed), noRate: false };
    const rt = rateAt(cm, ym(ch.rec.date));
    const pct = rt ? Number(rt[ch.cat]) || 0 : 0;
    return { share: r2(Math.max(0, amount - lab) * pct / 100), lab: r2(lab), pct, fixed: null, noRate: !rt };
  };
  const byP = {};
  pays.filter((p) => !p.void).forEach((p) => (byP[p.patientId || "_"] ||= []).push(p));
  for (const arr of Object.values(byP)) {
    arr.sort((a, b) => (a.date || "").localeCompare(b.date || "") || (tsMs(a.createdAt) || 0) - (tsMs(b.createdAt) || 0));
    const queue = [];
    for (const rec of arr) {
      const total = Math.max(0, Number(rec.total) || 0);
      let left = Math.max(0, Number(rec.paid) || 0);
      const alloc = (ch, a) => {
        if (a <= 0) return;
        ch.remaining = r2(ch.remaining - a); left = r2(left - a);
        if (how !== "paid" || !ch.rec.doctorId) return;
        const s = shareOf(ch, a);
        add(ch.rec.doctorId, ym(rec.date), { date: rec.date, patient: ch.rec.patientName || "", service: ch.rec.service || "", cat: ch.cat, amount: r2(a), ...s, isWork: ch.rec === rec, settle: ch.rec !== rec, workDate: ch.rec.date });
      };
      if (total > 0) {
        const ch = { rec, total, remaining: total, lab: Math.min(Math.max(0, Number(rec.labCost) || 0), total), cat: rec.cat || svcCat(rec.service) };
        queue.push(ch);
        if (how === "value" && rec.doctorId) {
          const s = shareOf(ch, total);
          add(rec.doctorId, ym(rec.date), { date: rec.date, patient: rec.patientName || "", service: rec.service || "", cat: ch.cat, amount: total, ...s, isWork: true, settle: false, workDate: rec.date });
        }
        alloc(ch, Math.min(left, ch.remaining));
      }
      for (const ch of queue) { if (left <= 0) break; if (ch.remaining > 0) alloc(ch, Math.min(left, ch.remaining)); }
    }
  }
  return out;
}

// كشف طبيب لشهر: الرصيد السابق + حصة الشهر − السلف والتسليم
export function statement(did, m, shares, payouts) {
  const mine = shares[did] || {};
  const cur0 = mine[m] || { share: 0, received: 0, lab: 0, works: 0, lines: [] };
  const before = Object.entries(mine).filter(([k]) => k < m).reduce((s, [, v]) => s + v.share, 0);
  const pd = payouts.filter((x) => x.doctorId === did && !x.void);
  const paidBefore = pd.filter((x) => ym(x.date) < m).reduce((s, x) => s + Number(x.amount || 0), 0);
  const inM = pd.filter((x) => ym(x.date) === m);
  const adv = inM.filter((x) => x.type === "advance").reduce((s, x) => s + Number(x.amount || 0), 0);
  const out = inM.filter((x) => x.type === "payout").reduce((s, x) => s + Number(x.amount || 0), 0);
  const prev = r2(before - paidBefore);
  return { ...cur0, prev, adv: r2(adv), out: r2(out), due: r2(prev + cur0.share - adv - out), moves: inM.sort((a, b) => (a.date || "").localeCompare(b.date || "")) };
}

async function loadAll(onlyDid = null) {
  const pays = await list(P.col("payments"));
  const dids = onlyDid ? [onlyDid] : doctors().map((d) => d.id);
  const comms = {};
  await Promise.all(dids.map(async (id) => { comms[id] = (await one(P.colDoc("comm", id))) || {}; }));
  const payouts = onlyDid ? await list(query(P.col("commPay"), where("doctorId", "==", onlyDid))) : await list(P.col("commPay"));
  return { pays, comms, payouts, shares: computeShares(pays, comms) };
}

const monthBar = (m, route) => `<div class="row-between"><h2 class="page-title">${route === "myshare" ? "حصتي" : "حصص الأطباء"}</h2>
  <input type="month" class="mp" value="${m}" aria-label="الشهر"></div>`;

function stmtTable(st) {
  return `<div class="stats">
    <div class="stat"><b>${esc(money(st.prev, cur()))}</b><span>الرصيد السابق</span></div>
    <div class="stat"><b>${esc(money(st.share, cur()))}</b><span>حصة الشهر</span><small class="muted">${st.works} عمل</small></div>
    <div class="stat"><b>${esc(money(st.adv, cur()))}</b><span>السلف</span></div>
    <div class="stat"><b>${esc(money(st.out, cur()))}</b><span>المسلَّم</span></div>
    <div class="stat ${st.due < 0 ? "warn" : ""}"><b>${esc(money(st.due, cur()))}</b><span>${st.due < 0 ? "سُلّم أكثر من الحصة" : "الباقي له"}</span></div>
  </div>`;
}
function linesTable(st) {
  if (!st.lines.length) return empty("لا أعمال مقبوضة في هذا الشهر");
  const noRate = st.lines.some((l) => l.noRate);
  return `${noRate ? `<p class="alert">⚠️ بعض الأعمال دون نسبة محددة لهذا الطبيب، فحُسبت حصتها صفراً. حدّد النسب من «تعديل النسب».</p>` : ""}
  <div class="tbl-wrap"><table class="tbl comm-tbl"><thead><tr><th>العمل</th><th>${basis() === "value" ? "القيمة" : "المقبوض"}</th><th>النسبة</th><th>الحصة</th></tr></thead><tbody>
  ${st.lines.sort((a, b) => (a.date || "").localeCompare(b.date || "")).map((l) => `<tr><td><b>${esc(l.patient)}</b><br><small class="muted">${esc(l.service || "—")} · <span>${esc(CAT[l.cat] || "")}</span><br>${esc(dm(l.date))}${l.settle ? ` · <span>تسديد لعمل سابق</span> ${esc(dm(l.workDate))}` : ""}</small></td>
    <td>${esc(money(l.amount, cur()))}${l.lab ? `<br><small class="muted">مخبر/مواد −${esc(money(l.lab, cur()))}</small>` : ""}</td>
    <td>${l.fixed != null ? `ثابت` : l.noRate ? `<span class="danger-t">غير محددة</span>` : `${l.pct}%`}</td><td><b>${esc(money(l.share, cur()))}</b></td></tr>`).join("")}
  </tbody></table></div>`;
}
function movesList(st, editable) {
  if (!st.moves.length) return "";
  return `<h4>السلف والتسليم</h4><ul class="plain">${st.moves.map((x) => `<li class="row-between"><span>${esc(x.date)} · ${x.type === "advance" ? "سلفة مالية" : "تسليم حصة"}${x.note ? ` · ${esc(x.note)}` : ""}${x.void ? ` <span class="chip">ملغاة</span>` : ""}</span>
    <span><b>${esc(money(x.amount, cur()))}</b>${editable && !x.void ? ` <button class="link-btn small vd" data-id="${x.id}">إلغاء</button>` : ""}</span></li>`).join("")}</ul>`;
}
function printStmt(d, m, st) {
  printDoc(S.pub, `كشف حصة د. ${d.name} · ${m}`, `${stmtTable(st)}${linesTable(st)}${movesList(st, false)}
    <p class="muted small"><span>أساس الحساب:</span> <b>${basis() === "value" ? "قيمة العمل" : "المبلغ المقبوض فعلاً"}</b>. <span>كلفة المخبر أو المواد تُخصم قبل النسبة.</span></p>`, { signer: `د. ${d.name}` });
}

// ---------- صفحة حصص الأطباء (للمسؤول والمحاسب ومن لديه الصلاحية) ----------
export async function renderComm() {
  const m = new URLSearchParams(location.hash.split("?")[1] || "").get("m") || ymd().slice(0, 7);
  const { comms, payouts, shares } = await loadAll();
  const docs = doctors();
  $("#main").innerHTML = `${monthBar(m, "comm")}
    <p class="muted small"><span>أساس الحساب:</span> <b>${basis() === "value" ? "قيمة العمل" : "المبلغ المقبوض فعلاً"}</b><br><span>كلفة المخبر أو المواد تُخصم قبل النسبة.</span>${isAdmin() ? `<br><span>يُغيَّر الأساس من «إعدادات العيادة».</span>` : ""}</p>
    ${docs.map((d) => {
      const st = statement(d.id, m, shares, payouts), rt = rateAt(comms[d.id], m), fx = Object.keys(comms[d.id]?.fixed || {}).length;
      return `<section class="card" data-did="${d.id}"><div class="row-between"><h3>د. ${esc(d.name)}</h3>
        <span class="muted small">${rt ? `<span>معالجة وتلبيس</span> ${rt.treat || 0}% · <span>جراحة وزرع</span> ${rt.surg || 0}%` : `<span class="danger-t">لم تُحدد النسب</span>`}${fx ? ` · ${fx} <span>خدمة بمبلغ ثابت</span>` : ""}</span></div>
        ${stmtTable(st)}
        <div class="row gap wrap">
          <button class="btn small dt">التفاصيل</button>
          <button class="btn small adv">+ سلفة</button>
          <button class="btn small primary po">تسليم الحصة</button>
          ${canRates() ? `<button class="btn small rt">تعديل النسب</button>` : ""}
          <button class="btn small pr">🖨 كشف</button>
        </div></section>`;
    }).join("") || empty("لا يوجد أطباء")}`;
  $(".mp").onchange = (e) => { location.hash = `#/comm?m=${e.target.value}`; };
  $$("[data-did]").forEach((card) => {
    const d = docs.find((x) => x.id === card.dataset.did), st = statement(d.id, m, shares, payouts);
    card.querySelector(".dt").onclick = async () => {
      await modal(`د. ${d.name} · ${m}`, `${linesTable(st)}${movesList(st, canRates())}`, { ok: null, cancel: "إغلاق", wide: true,
        onOpen: (w) => w.querySelectorAll(".vd").forEach((b) => b.onclick = async () => {
          if (!(await confirmBox("إلغاء", "إلغاء هذه الحركة؟ تبقى في السجل مع علامة «ملغاة».", "إلغاء الحركة", true))) return;
          await updateDoc(P.colDoc("commPay", b.dataset.id), { void: true, voidBy: S.profile.name || "" });
          await audit("إلغاء حركة حصة طبيب", d.name); w.remove(); renderComm();
        }) });
    };
    card.querySelector(".adv").onclick = () => moveModal(d, "advance", 0);
    card.querySelector(".po").onclick = () => moveModal(d, "payout", Math.max(0, st.due));
    card.querySelector(".rt")?.addEventListener("click", () => ratesModal(d, comms[d.id] || {}, m));
    card.querySelector(".pr").onclick = () => printStmt(d, m, st);
  });
}

async function moveModal(d, type, amount) {
  const r = await modal(`${type === "advance" ? "سلفة مالية" : "تسليم حصة"} · د. ${d.name}`, `<form class="stack">
    ${field("المبلغ", "amount", { type: "number", required: true, value: amount || "", attrs: 'min="1" inputmode="numeric"' })}
    ${field("التاريخ", "date", { type: "date", value: ymd(), required: true })}
    ${field("ملاحظة", "note")}</form>`, { ok: "حفظ" });
  if (!r) return;
  if (!(Number(r.amount) > 0)) return toast("أدخل مبلغاً صحيحاً", true);
  try {
    await addDoc(P.col("commPay"), { doctorId: d.id, type, amount: Number(r.amount), date: r.date, note: r.note || "", by: S.user.uid, byName: S.profile.name || "", createdAt: serverTimestamp() });
    await audit(type === "advance" ? "سلفة لطبيب" : "تسليم حصة طبيب", `${d.name} ${r.amount}`);
    toast("تم الحفظ"); render();
  } catch (e) { toast(errMsg(e), true); }
}

async function ratesModal(d, cm, m) {
  const rt = rateAt(cm, m) || { treat: "", surg: "" };
  const services = S.clinic?.services || [];
  const r = await modal(`نسب الطبيب · د. ${d.name}`, `<form class="stack">
    <div class="grid2">${field("المعالجة والتلبيس (%)", "treat", { type: "number", value: rt.treat ?? "", required: true, attrs: 'min="0" max="100" step="0.5"' })}
    ${field("الجراحة والزرع (%)", "surg", { type: "number", value: rt.surg ?? "", required: true, attrs: 'min="0" max="100" step="0.5"' })}</div>
    ${field("تسري من شهر", "from", { type: "month", value: m, required: true })}
    <p class="muted small">الأعمال قبل هذا الشهر تبقى بنسبها السابقة.</p>
    ${services.length ? `<details><summary><b>مبلغ ثابت لخدمات معيّنة (حسب العقد)</b></summary><div class="stack">
      ${services.map((s, i) => `<label class="field inline"><span>${esc(s.name)} <small class="muted">${esc(CAT[s.cat === "surg" ? "surg" : "treat"])}</small></span>
        <input type="number" name="fx_${i}" min="0" value="${esc(cm.fixed?.[s.name] ?? "")}" placeholder="بالنسبة"></label>`).join("")}
      <p class="muted small">اتركه فارغاً لتُحسب الخدمة بالنسبة.</p></div></details>` : ""}
  </form>`, { ok: "حفظ" });
  if (!r) return;
  const treat = Number(r.treat), surg = Number(r.surg);
  if (!(treat >= 0 && treat <= 100 && surg >= 0 && surg <= 100)) return toast("النسبة بين 0 و100", true);
  const fixed = {};
  services.forEach((s, i) => { const v = r[`fx_${i}`]; if (v !== null && v !== "" && Number(v) >= 0) fixed[s.name] = Number(v); });
  const rates = [...(cm.rates || []).filter((x) => x.from !== r.from), { from: r.from, treat, surg }].sort((a, b) => a.from.localeCompare(b.from));
  try {
    await setDoc(P.colDoc("comm", d.id), { rates, fixed, updatedAt: serverTimestamp(), by: S.profile.name || "" });
    await audit("تعديل نسب طبيب", `${d.name}: ${treat}% / ${surg}% من ${r.from}`);
    toast("حُفظت النسب"); render();
  } catch (e) { toast(errMsg(e), true); }
}

// ---------- صفحة «حصتي» للطبيب: كشفه وحده ----------
export async function renderMyShare() {
  const did = S.profile.doctorId;
  const d = doctors().find((x) => x.id === did);
  if (!d) { $("#main").innerHTML = empty("هذا الحساب غير مرتبط بطبيب"); return; }
  const m = new URLSearchParams(location.hash.split("?")[1] || "").get("m") || ymd().slice(0, 7);
  const { comms, payouts, shares } = await loadAll(did);
  const st = statement(did, m, shares, payouts), rt = rateAt(comms[did], m);
  $("#main").innerHTML = `${monthBar(m, "myshare")}
    <section class="card"><div class="row-between"><h3>د. ${esc(d.name)}</h3><span class="muted small">${rt ? `<span>معالجة وتلبيس</span> ${rt.treat || 0}% · <span>جراحة وزرع</span> ${rt.surg || 0}%` : "لم تُحدد النسب بعد"}</span></div>
      ${stmtTable(st)}<div class="row gap"><button class="btn small pr">🖨 طباعة الكشف</button></div></section>
    <section class="card">${linesTable(st)}${movesList(st, false)}</section>`;
  $(".mp").onchange = (e) => { location.hash = `#/myshare?m=${e.target.value}`; };
  $(".pr").onclick = () => printStmt(d, m, st);
}

// مجموع ما سُلّم للأطباء في شهر (للتقارير وصافي الربح)
export async function paidOutIn(m) {
  try { return (await list(P.col("commPay"))).filter((x) => !x.void && ym(x.date) === m).reduce((s, x) => s + Number(x.amount || 0), 0); }
  catch { return null; }
}
