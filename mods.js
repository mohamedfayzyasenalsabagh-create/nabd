// وحدات الاختصاصات: الأسنان، الأطفال، المؤشرات الحيوية، النظر، العلاج الفيزيائي
import { P, list, one, setDoc, updateDoc, addDoc, query, where, serverTimestamp, audit, randId, DEFAULT_VACCINES } from "./fb.js";
import {
  $, $$, esc, ymd, addDays, parseYmd, fmtDate, money, toast, errMsg, modal, confirmBox, field, select, empty,
  printDoc, daysBetween, lineChart
} from "./ui.js";
import { S } from "./app.js";
import { hasMod, cur, paymentModal, ageText } from "./staff.js";

const byDate = (a, b) => (a.date || "").localeCompare(b.date || "");

// ======================================================================
// الأسنان
// ======================================================================
export const TOOTH = {
  sound: ["سليم", ""], caries: ["تسوس", "c-red"], filling: ["حشوة", "c-blue"], rct: ["معالجة لبية", "c-purple"],
  crown: ["تاج", "c-gold"], bridge: ["جسر", "c-orange"], implant: ["زرعة", "c-teal"], extracted: ["مقلوع", "c-gray x"],
  missing: ["مفقود", "c-gray dashed"], fracture: ["كسر", "c-red dashed"],
};
const ADULT = [[18, 17, 16, 15, 14, 13, 12, 11], [21, 22, 23, 24, 25, 26, 27, 28], [48, 47, 46, 45, 44, 43, 42, 41], [31, 32, 33, 34, 35, 36, 37, 38]];
const CHILD = [[55, 54, 53, 52, 51], [61, 62, 63, 64, 65], [85, 84, 83, 82, 81], [71, 72, 73, 74, 75]];
const PROCS = ["فحص وتشخيص", "تنظيف وتلميع", "حشوة تجميلية", "حشوة أملغم", "معالجة لبية", "إعادة معالجة لبية", "قلع بسيط", "قلع جراحي", "تاج خزفي", "تاج زيركون", "جسر", "زرعة", "تبييض", "تقويم", "قشور تجميلية", "جهاز متحرك"];

function chartHtml(teeth, dentition) {
  const rows = dentition === "child" ? CHILD : ADULT;
  const t = (n) => { const s = teeth[n]?.status || "sound"; return `<button type="button" class="tooth ${TOOTH[s]?.[1] || ""} ${teeth[n]?.note ? "noted" : ""}" data-t="${n}" aria-label="السن ${n}: ${TOOTH[s]?.[0] || ""}"><i></i><span>${n}</span></button>`; };
  return `<div class="dchart" dir="ltr">
    <div class="jaw"><div class="q">${rows[0].map(t).join("")}</div><div class="q">${rows[1].map(t).join("")}</div></div>
    <div class="jaw lower"><div class="q">${rows[2].map(t).join("")}</div><div class="q">${rows[3].map(t).join("")}</div></div>
  </div>
  <div class="legend dl">${Object.entries(TOOTH).filter(([k]) => k !== "sound").map(([, [n, c]]) => `<span><i class="sw ${c}"></i>${n}</span>`).join("")}</div>`;
}

async function planTotals(p, plan) {
  const pays = await list(query(P.col("payments"), where("patientId", "==", p.id)));
  const paid = pays.filter((x) => x.planId === plan.id).reduce((s, x) => s + (Number(x.paid) || 0), 0);
  const items = plan.items || [];
  const total = items.reduce((s, i) => s + (Number(i.cost) || 0), 0) - (Number(plan.discount) || 0);
  const done = items.filter((i) => i.status === "done").reduce((s, i) => s + (Number(i.cost) || 0), 0);
  return { paid, total, done, remaining: total - paid, doneCount: items.filter((i) => i.status === "done").length, count: items.length };
}

export async function dental(p, el, refresh) {
  const chart = (await one(P.subDoc(p.id, "dental", "chart"))) || { teeth: {}, dentition: p.dob && daysBetween(p.dob, ymd()) < 365 * 12 ? "child" : "adult" };
  const plans = (await list(P.sub(p.id, "plans"))).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const plan = plans.find((x) => x.status === "active");
  const tot = plan ? await planTotals(p, plan) : null;
  el.innerHTML = `
    <section class="card">
      <div class="row-between"><h3>مخطط الأسنان</h3>
        <div class="seg-scroll">${[["adult", "دائمة"], ["child", "لبنية"]].map(([k, t]) => `<button class="pill ${chart.dentition === k ? "on" : ""}" data-dent="${k}">${t}</button>`).join("")}</div></div>
      ${chartHtml(chart.teeth || {}, chart.dentition)}
      <p class="muted small">اضغط على أي سن لتسجيل حالته أو إضافة إجراء لخطة العلاج.</p>
    </section>
    <section class="card">
      <div class="row-between"><h3>خطة العلاج</h3><button class="btn small ${plan ? "" : "primary"} newplan">${plan ? "خطة جديدة" : "+ خطة علاج"}</button></div>
      ${plan ? `
        <div class="stats">
          <div class="stat"><b>${esc(money(tot.total, cur()))}</b><span>كلفة الخطة</span></div>
          <div class="stat"><b>${esc(money(tot.paid, cur()))}</b><span>المدفوع</span></div>
          <div class="stat ${tot.remaining > 0 ? "warn" : ""}"><b>${esc(money(tot.remaining, cur()))}</b><span>المتبقي</span></div>
          <div class="stat"><b>${tot.doneCount}/${tot.count}</b><span>إجراءات منجزة</span></div>
        </div>
        <div class="progress"><i style="width:${tot.count ? tot.doneCount / tot.count * 100 : 0}%"></i></div>
        ${planTable(plan)}
        <div class="row gap wrap">
          <button class="btn small additem">+ إجراء</button>
          <button class="btn small primary payplan">دفعة على الخطة</button>
          <button class="btn small prplan">طباعة الخطة</button>
          <button class="btn small closeplan">إنهاء الخطة</button>
        </div>` : empty("لا توجد خطة علاج حالية")}
      ${plans.filter((x) => x.status !== "active").length ? `<details><summary class="muted">خطط سابقة (${plans.filter((x) => x.status !== "active").length})</summary>${plans.filter((x) => x.status !== "active").map((x) => `<div class="visit-mini"><b>${esc(x.name || "خطة")}</b> · ${esc(x.date)}<div class="muted small">${(x.items || []).length} إجراء</div></div>`).join("")}</details>` : ""}
    </section>`;
  const chartRef = P.subDoc(p.id, "dental", "chart");
  $$("[data-dent]", el).forEach((b) => b.onclick = async () => { await setDoc(chartRef, { ...chart, dentition: b.dataset.dent, updatedAt: serverTimestamp() }); refresh(); });
  $$(".tooth", el).forEach((b) => b.onclick = () => toothModal(p, chart, plan, b.dataset.t, refresh));
  $(".newplan", el).onclick = async () => {
    if (plan && !(await confirmBox("خطة جديدة", "ستُنقل الخطة الحالية إلى الخطط السابقة.", "متابعة"))) return;
    const r = await modal("خطة علاج جديدة", `<form class="stack">${field("اسم الخطة", "name", { value: "خطة العلاج", required: true })}${field("خصم (اختياري)", "discount", { type: "number", attrs: 'min="0"' })}${field("ملاحظات", "note", { type: "textarea" })}</form>`, { ok: "إنشاء" });
    if (!r) return;
    if (plan) await updateDoc(P.subDoc(p.id, "plans", plan.id), { status: "closed" });
    await addDoc(P.sub(p.id, "plans"), { name: r.name, discount: r.discount || 0, note: r.note, date: ymd(), status: "active", items: [], createdAt: serverTimestamp() });
    await audit("خطة علاج أسنان جديدة", p.name);
    refresh();
  };
  if (!plan) return;
  const planRef = P.subDoc(p.id, "plans", plan.id);
  $$(".pi-done", el).forEach((c) => c.onchange = async () => {
    const items = plan.items.map((i) => (i.id === c.dataset.id ? { ...i, status: c.checked ? "done" : "planned", doneDate: c.checked ? ymd() : null } : i));
    await updateDoc(planRef, { items });
    const it = plan.items.find((i) => i.id === c.dataset.id);
    if (c.checked && it.tooth) {
      const auto = { "حشوة": "filling", "معالجة": "rct", "قلع": "extracted", "تاج": "crown", "جسر": "bridge", "زرعة": "implant" };
      const k = Object.keys(auto).find((w) => it.proc.includes(w));
      if (k) await setDoc(chartRef, { ...chart, teeth: { ...chart.teeth, [it.tooth]: { ...(chart.teeth?.[it.tooth] || {}), status: auto[k] } } });
    }
    refresh();
  });
  $$(".pi-del", el).forEach((b) => b.onclick = async () => { await updateDoc(planRef, { items: plan.items.filter((i) => i.id !== b.dataset.id) }); refresh(); });
  $(".additem", el).onclick = () => itemModal(p, plan, "", refresh);
  $(".payplan", el).onclick = () => paymentModal(p.id, `خطة علاج: ${plan.name || ""}`, { total: Math.max(0, tot.remaining), paid: "", planId: plan.id, note: "قسط على خطة العلاج" });
  $(".prplan", el).onclick = () => printPlan(p, plan, tot, chart);
  $(".closeplan", el).onclick = async () => {
    if (!(await confirmBox("إنهاء الخطة", tot.remaining > 0 ? `ما زال على المريض ${money(tot.remaining, cur())}. هل تريد إنهاء الخطة؟` : "نقل الخطة إلى الخطط السابقة؟", "إنهاء"))) return;
    await updateDoc(planRef, { status: "done" }); refresh();
  };
}
function planTable(plan) {
  const items = plan.items || [];
  if (!items.length) return empty("أضف إجراءات إلى الخطة من المخطط أو من زر «+ إجراء»");
  const phases = [...new Set(items.map((i) => i.phase || 1))].sort((a, b) => a - b);
  return phases.map((ph) => `<h4>المرحلة ${ph}</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>السن</th><th>الإجراء</th><th>الكلفة</th><th></th></tr></thead><tbody>
    ${items.filter((i) => (i.phase || 1) === ph).map((i) => `<tr class="${i.status === "done" ? "done-row" : ""}"><td><input type="checkbox" class="pi-done" data-id="${i.id}" ${i.status === "done" ? "checked" : ""} aria-label="منجز"></td>
      <td>${esc(i.tooth || "—")}</td><td>${esc(i.proc)}${i.doneDate ? `<br><small class="muted">${esc(i.doneDate)}</small>` : ""}</td><td>${esc(money(i.cost, cur()))}</td>
      <td>${i.status !== "done" ? `<button class="icon-btn pi-del" data-id="${i.id}" aria-label="حذف">✕</button>` : ""}</td></tr>`).join("")}
    </tbody></table></div>`).join("");
}
async function toothModal(p, chart, plan, n, refresh) {
  const cur0 = chart.teeth?.[n] || {};
  await modal(`السن ${n}`, `<form class="stack">
    ${select("الحالة", "status", Object.entries(TOOTH).map(([k, [t]]) => [k, t]), cur0.status || "sound")}
    ${field("ملاحظة", "note", { value: cur0.note || "" })}
    ${plan ? `<hr><h4>إضافة إجراء لخطة العلاج</h4>
      <datalist id="procs">${PROCS.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>
      ${field("الإجراء", "proc", { attrs: 'list="procs"' })}
      <div class="grid2">${field("الكلفة", "cost", { type: "number", attrs: 'min="0"' })}${field("المرحلة", "phase", { type: "number", value: 1, attrs: 'min="1" max="9"' })}</div>` : `<p class="muted small">أنشئ خطة علاج لتتمكن من إضافة إجراءات.</p>`}
  </form>`, {
    onOk: async (f) => {
      await setDoc(P.subDoc(p.id, "dental", "chart"), { ...chart, teeth: { ...(chart.teeth || {}), [n]: { status: f.status, note: f.note } }, updatedAt: serverTimestamp() });
      if (plan && f.proc) await updateDoc(P.subDoc(p.id, "plans", plan.id), { items: [...(plan.items || []), { id: randId(6), tooth: n, proc: f.proc, cost: f.cost || 0, phase: f.phase || 1, status: "planned" }] });
      setTimeout(refresh, 50);
    }
  });
}
async function itemModal(p, plan, tooth, refresh) {
  await modal("إجراء جديد", `<form class="stack">
    <datalist id="procs">${PROCS.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>
    ${field("الإجراء", "proc", { required: true, attrs: 'list="procs"' })}
    <div class="grid2">${field("السن (اختياري)", "tooth", { value: tooth, attrs: 'inputmode="numeric"' })}${field("الكلفة", "cost", { type: "number", attrs: 'min="0"' })}</div>
    ${field("المرحلة", "phase", { type: "number", value: 1, attrs: 'min="1" max="9"' })}
  </form>`, {
    onOk: async (f) => { await updateDoc(P.subDoc(p.id, "plans", plan.id), { items: [...(plan.items || []), { id: randId(6), ...f, phase: f.phase || 1, cost: f.cost || 0, status: "planned" }] }); setTimeout(refresh, 50); }
  });
}
function printPlan(p, plan, tot, chart) {
  const bad = Object.entries(chart.teeth || {}).filter(([, v]) => v.status && v.status !== "sound");
  printDoc(S.pub, "خطة علاج الأسنان", `<p><b>المريض:</b> ${esc(p.name)} · <b>التاريخ:</b> ${esc(fmtDate(plan.date, false))}</p>
    ${bad.length ? `<p><b>حالة الأسنان:</b> ${bad.map(([n, v]) => `${esc(n)}: ${esc(TOOTH[v.status]?.[0] || "")}`).join(" · ")}</p>` : ""}
    <table class="tbl"><thead><tr><th>المرحلة</th><th>السن</th><th>الإجراء</th><th>الكلفة</th><th>الحالة</th></tr></thead><tbody>
    ${(plan.items || []).map((i) => `<tr><td>${esc(i.phase || 1)}</td><td>${esc(i.tooth || "—")}</td><td>${esc(i.proc)}</td><td>${esc(money(i.cost, cur()))}</td><td>${i.status === "done" ? "منجز" : "مخطط"}</td></tr>`).join("")}
    </tbody></table>
    <table class="kv"><tr><th>الكلفة الإجمالية</th><td>${esc(money(tot.total, cur()))}${plan.discount ? ` (بعد خصم ${esc(money(plan.discount, cur()))})` : ""}</td></tr>
    <tr><th>المدفوع</th><td>${esc(money(tot.paid, cur()))}</td></tr><tr><th>المتبقي</th><td>${esc(money(tot.remaining, cur()))}</td></tr></table>
    ${plan.note ? `<p>${esc(plan.note)}</p>` : ""}`);
}

// ======================================================================
// الأطفال: النمو واللقاحات
// ======================================================================
export const vacSchedule = () => (S.clinic?.vaccineSchedule?.length ? S.clinic.vaccineSchedule : DEFAULT_VACCINES);
export function vacStatus(p, rec) {
  const today = ymd();
  return vacSchedule().map((v) => {
    const due = p.dob ? addDays(p.dob, Math.round(v.months * 30.44)) : null;
    const g = rec?.given?.[v.id];
    const st = g ? "given" : !due ? "unknown" : due < today ? "overdue" : due <= addDays(today, 14) ? "due" : "upcoming";
    return { ...v, due, given: g, st };
  });
}
export function nextVac(list_) { return list_.find((v) => v.st === "overdue" || v.st === "due" || v.st === "upcoming") || null; }
const VST = { given: ["أُعطي", "ok"], overdue: ["متأخر", "danger"], due: ["مستحق قريباً", "warn"], upcoming: ["قادم", ""], unknown: ["—", ""] };

export async function peds(p, el, refresh) {
  const [growth, rec] = await Promise.all([list(P.sub(p.id, "growth")), one(P.subDoc(p.id, "vaccines", "record"))]);
  growth.sort(byDate);
  const vs = vacStatus(p, rec);
  const last = growth.at(-1);
  const bmi = last?.weight && last?.height ? (last.weight / Math.pow(last.height / 100, 2)).toFixed(1) : null;
  const ageAt = (d) => (p.dob ? `${Math.floor(daysBetween(p.dob, d) / 30.44)} شهر` : "");
  el.innerHTML = `
    ${!p.dob ? `<div class="alert">أضف تاريخ ميلاد الطفل من «الحساب ← تعديل البيانات» لحساب مواعيد اللقاحات والعمر.</div>` : ""}
    <section class="card">
      <div class="row-between"><h3>النمو</h3><button class="btn small primary addg">+ قياس</button></div>
      ${last ? `<div class="stats">
        <div class="stat"><b>${esc(last.weight ?? "—")}</b><span>الوزن (كغ)</span></div>
        <div class="stat"><b>${esc(last.height ?? "—")}</b><span>الطول (سم)</span></div>
        <div class="stat"><b>${esc(last.head ?? "—")}</b><span>محيط الرأس (سم)</span></div>
        ${bmi ? `<div class="stat"><b>${bmi}</b><span>مؤشر كتلة الجسم</span></div>` : ""}
      </div>` : ""}
      ${lineChart([{ name: "الوزن", color: "var(--accent)", points: growth.filter((g) => g.weight).map((g) => ({ date: g.date, v: Number(g.weight) })) }], { label: "الوزن (كغ)" })}
      ${lineChart([{ name: "الطول", color: "var(--c2)", points: growth.filter((g) => g.height).map((g) => ({ date: g.date, v: Number(g.height) })) }], { label: "الطول (سم)" })}
      ${growth.length ? `<details><summary class="muted">كل القياسات (${growth.length})</summary><div class="tbl-wrap"><table class="tbl"><thead><tr><th>التاريخ</th><th>العمر</th><th>الوزن</th><th>الطول</th><th>الرأس</th><th>ملاحظة</th></tr></thead><tbody>
        ${growth.slice().reverse().map((g) => `<tr><td>${esc(g.date)}</td><td>${esc(ageAt(g.date))}</td><td>${esc(g.weight ?? "")}</td><td>${esc(g.height ?? "")}</td><td>${esc(g.head ?? "")}</td><td>${esc(g.note || "")}</td></tr>`).join("")}</tbody></table></div></details>` : empty("لا توجد قياسات")}
      <p class="muted small">المنحنيات تعرض قياسات الطفل عبر الزمن، ولا تتضمن منحنيات النسب المئوية المرجعية.</p>
    </section>
    <section class="card">
      <div class="row-between"><h3>اللقاحات</h3><button class="btn small prvac">طباعة بطاقة اللقاح</button></div>
      <ul class="plain vac-list">${vs.map((v) => `<li class="vac ${v.st}">
        <div class="row-between"><div><b>${esc(v.name)}</b><div class="muted small">${v.months ? `عمر ${esc(v.months)} شهر` : "عند الولادة"}${v.due ? ` · ${esc(fmtDate(v.due, false))}` : ""}</div>
          ${v.given ? `<div class="small">أُعطي ${esc(v.given.date)}${v.given.lot ? ` · تشغيلة ${esc(v.given.lot)}` : ""}</div>` : ""}</div>
        <div class="row gap"><span class="chip ${VST[v.st][1]}">${VST[v.st][0]}</span>${v.given ? `<button class="icon-btn vundo" data-id="${v.id}" aria-label="تراجع">↺</button>` : `<button class="btn small vgive" data-id="${v.id}">تسجيل</button>`}</div></div></li>`).join("")}</ul>
    </section>`;
  $(".addg", el).onclick = async () => {
    await modal("قياس نمو", `<form class="stack">${field("التاريخ", "date", { type: "date", value: ymd(), required: true })}
      <div class="grid2">${field("الوزن (كغ)", "weight", { type: "number", attrs: 'step="0.01" min="0"' })}${field("الطول (سم)", "height", { type: "number", attrs: 'step="0.1" min="0"' })}</div>
      ${field("محيط الرأس (سم)", "head", { type: "number", attrs: 'step="0.1" min="0"' })}${field("ملاحظة", "note")}</form>`, {
      onOk: async (f) => { await addDoc(P.sub(p.id, "growth"), { ...f, createdAt: serverTimestamp() }); setTimeout(refresh, 50); }
    });
  };
  const recRef = P.subDoc(p.id, "vaccines", "record");
  const syncNext = async (given) => {
    const nv = nextVac(vacStatus(p, { given }));
    try { await updateDoc(P.patient(p.id), { nextVaccine: nv ? { name: nv.name, date: nv.due } : null }); } catch {}
  };
  $$(".vgive", el).forEach((b) => b.onclick = async () => {
    const v = vs.find((x) => x.id === b.dataset.id);
    const r = await modal(v.name, `<form class="stack">${field("تاريخ الإعطاء", "date", { type: "date", value: ymd(), required: true })}${field("رقم التشغيلة (اختياري)", "lot", { attrs: 'dir="ltr"' })}${field("ملاحظة", "note")}</form>`, { ok: "تسجيل" });
    if (!r) return;
    const given = { ...(rec?.given || {}), [v.id]: r };
    await setDoc(recRef, { given, updatedAt: serverTimestamp() });
    await syncNext(given);
    await audit("تسجيل لقاح", `${p.name}: ${v.name}`);
    refresh();
  });
  $$(".vundo", el).forEach((b) => b.onclick = async () => {
    if (!(await confirmBox("تراجع", "إلغاء تسجيل هذا اللقاح؟", "تراجع", true))) return;
    const given = { ...(rec?.given || {}) }; delete given[b.dataset.id];
    await setDoc(recRef, { given, updatedAt: serverTimestamp() });
    await syncNext(given); refresh();
  });
  $(".prvac", el).onclick = () => printDoc(S.pub, "بطاقة اللقاحات", `<p><b>الطفل:</b> ${esc(p.name)} · <b>تاريخ الميلاد:</b> ${esc(p.dob ? fmtDate(p.dob, false) : "—")}</p>
    <table class="tbl"><thead><tr><th>اللقاح</th><th>الموعد</th><th>تاريخ الإعطاء</th><th>التشغيلة</th></tr></thead><tbody>
    ${vs.map((v) => `<tr><td>${esc(v.name)}</td><td>${esc(v.due || "")}</td><td>${esc(v.given?.date || "")}</td><td dir="ltr">${esc(v.given?.lot || "")}</td></tr>`).join("")}</tbody></table>`);
  if (p.dob) syncNext(rec?.given || {});
}

// ======================================================================
// المؤشرات الحيوية والأمراض المزمنة
// ======================================================================
export function bpFlag(sys, dia) {
  if (!sys || !dia) return null;
  if (sys >= 180 || dia >= 120) return ["مرتفع جداً", "danger"];
  if (sys >= 140 || dia >= 90) return ["مرتفع", "danger"];
  if (sys >= 130 || dia >= 80) return ["فوق المعدل", "warn"];
  if (sys < 90 || dia < 60) return ["منخفض", "warn"];
  return ["ضمن المعدل", "ok"];
}
export function sugarFlag(v, type) {
  if (!v) return null;
  if (v < 70) return ["منخفض", "danger"];
  if (type === "fasting") return v >= 126 ? ["مرتفع", "danger"] : v >= 100 ? ["فوق المعدل", "warn"] : ["ضمن المعدل", "ok"];
  return v >= 200 ? ["مرتفع", "danger"] : v >= 140 ? ["فوق المعدل", "warn"] : ["ضمن المعدل", "ok"];
}
const SUGAR = { fasting: "صائم", random: "عشوائي", post: "بعد الأكل بساعتين" };
export function vitalsView(vit, { patient = false } = {}) {
  vit.sort(byDate);
  const lastBp = [...vit].reverse().find((v) => v.sys && v.dia);
  const lastSugar = [...vit].reverse().find((v) => v.sugar);
  const lastW = [...vit].reverse().find((v) => v.weight);
  const lastA1c = [...vit].reverse().find((v) => v.hba1c);
  const f1 = lastBp ? bpFlag(lastBp.sys, lastBp.dia) : null, f2 = lastSugar ? sugarFlag(lastSugar.sugar, lastSugar.sugarType) : null;
  return `
    <div class="stats">
      <div class="stat"><b dir="ltr">${lastBp ? `${lastBp.sys}/${lastBp.dia}` : "—"}</b><span>آخر ضغط ${f1 ? `<span class="chip ${f1[1]}">${f1[0]}</span>` : ""}</span></div>
      <div class="stat"><b>${lastSugar ? esc(lastSugar.sugar) : "—"}</b><span>آخر سكر ${lastSugar ? `(${SUGAR[lastSugar.sugarType] || ""})` : ""} ${f2 ? `<span class="chip ${f2[1]}">${f2[0]}</span>` : ""}</span></div>
      <div class="stat"><b>${lastW ? esc(lastW.weight) : "—"}</b><span>الوزن (كغ)</span></div>
      ${lastA1c ? `<div class="stat"><b>${esc(lastA1c.hba1c)}%</b><span>السكر التراكمي</span></div>` : ""}
    </div>
    ${lineChart([
      { name: "الانقباضي", color: "var(--accent)", points: vit.filter((v) => v.sys).map((v) => ({ date: v.date, v: Number(v.sys) })) },
      { name: "الانبساطي", color: "var(--c2)", points: vit.filter((v) => v.dia).map((v) => ({ date: v.date, v: Number(v.dia) })) }], { label: "ضغط الدم (ملم زئبق)" })}
    ${lineChart([{ name: "السكر", color: "var(--c3)", points: vit.filter((v) => v.sugar).map((v) => ({ date: v.date, v: Number(v.sugar) })) }], { label: "سكر الدم (ملغ/دل)" })}
    ${lineChart([{ name: "الوزن", color: "var(--c2)", points: vit.filter((v) => v.weight).map((v) => ({ date: v.date, v: Number(v.weight) })) }], { label: "الوزن (كغ)" })}
    ${vit.length ? `<details ${patient ? "" : "open"}><summary class="muted">كل القراءات (${vit.length})</summary><div class="tbl-wrap"><table class="tbl"><thead><tr><th>التاريخ</th><th>الضغط</th><th>النبض</th><th>السكر</th><th>الوزن</th><th>المصدر</th></tr></thead><tbody>
      ${vit.slice().reverse().slice(0, 60).map((v) => { const b = bpFlag(v.sys, v.dia), s = sugarFlag(v.sugar, v.sugarType); return `<tr><td>${esc(v.date)}${v.time ? ` <small class="muted">${esc(v.time)}</small>` : ""}</td>
        <td dir="ltr" class="${b && b[1] !== "ok" ? b[1] + "-t" : ""}">${v.sys ? `${esc(v.sys)}/${esc(v.dia)}` : ""}</td><td>${esc(v.pulse ?? "")}</td>
        <td class="${s && s[1] !== "ok" ? s[1] + "-t" : ""}">${esc(v.sugar ?? "")}${v.sugar ? ` <small class="muted">${esc(SUGAR[v.sugarType] || "")}</small>` : ""}</td><td>${esc(v.weight ?? "")}</td>
        <td>${v.source === "home" ? `<span class="chip">منزلي</span>` : `<span class="chip ok">العيادة</span>`}</td></tr>`; }).join("")}</tbody></table></div></details>` : empty("لا توجد قراءات")}
    <p class="muted small">التصنيفات إرشادية فقط ولا تُغني عن تقييم الطبيب.</p>`;
}
export function vitalsForm() {
  return `<form class="stack">
    <div class="grid2">${field("التاريخ", "date", { type: "date", value: ymd(), required: true })}${field("الوقت", "time", { type: "time", value: new Date().toTimeString().slice(0, 5) })}</div>
    <div class="grid2">${field("الضغط الانقباضي", "sys", { type: "number", attrs: 'min="50" max="260" inputmode="numeric"' })}${field("الضغط الانبساطي", "dia", { type: "number", attrs: 'min="30" max="160" inputmode="numeric"' })}</div>
    <div class="grid2">${field("النبض", "pulse", { type: "number", attrs: 'min="30" max="220"' })}${field("الوزن (كغ)", "weight", { type: "number", attrs: 'step="0.1" min="0"' })}</div>
    <div class="grid2">${field("سكر الدم (ملغ/دل)", "sugar", { type: "number", attrs: 'min="20" max="700"' })}${select("نوع قياس السكر", "sugarType", Object.entries(SUGAR), "fasting")}</div>
    ${field("السكر التراكمي HbA1c (%)", "hba1c", { type: "number", attrs: 'step="0.1" min="3" max="20"' })}
    ${field("ملاحظة", "note")}
  </form>`;
}
export async function chronic(p, el, refresh) {
  const [vit, med] = await Promise.all([list(P.sub(p.id, "vitals")), one(P.subDoc(p.id, "medical", "profile"))]);
  el.innerHTML = `<section class="card">
    <div class="row-between"><h3>المؤشرات الحيوية</h3><button class="btn small primary addv">+ قراءة</button></div>
    ${med?.chronic ? `<p><span class="muted">الأمراض المزمنة:</span> <b>${esc(med.chronic)}</b></p>` : ""}
    ${vitalsView(vit)}
    <p class="muted small">يستطيع المريض إضافة قراءاته المنزلية من تطبيقه، وتظهر هنا بعلامة «منزلي».</p>
  </section>`;
  $(".addv", el).onclick = async () => {
    await modal("قراءة جديدة", vitalsForm(), { onOk: async (f) => { await addDoc(P.sub(p.id, "vitals"), { ...f, source: "clinic", createdAt: serverTimestamp() }); setTimeout(refresh, 50); } });
  };
}

// ======================================================================
// النظر
// ======================================================================
const EYEF = [["sph", "Sph"], ["cyl", "Cyl"], ["axis", "Axis"], ["add", "Add"]];
export function glassesTable(e) {
  return `<table class="tbl rx-eye" dir="ltr"><thead><tr><th></th>${EYEF.map(([, t]) => `<th>${t}</th>`).join("")}<th>VA</th></tr></thead><tbody>
    <tr><th>OD (اليمنى)</th>${EYEF.map(([k]) => `<td>${esc(e[k + "R"] ?? "")}</td>`).join("")}<td>${esc(e.bcvaR || e.vaR || "")}</td></tr>
    <tr><th>OS (اليسرى)</th>${EYEF.map(([k]) => `<td>${esc(e[k + "L"] ?? "")}</td>`).join("")}<td>${esc(e.bcvaL || e.vaL || "")}</td></tr></tbody></table>
    ${e.pd ? `<p dir="ltr">PD: ${esc(e.pd)} mm</p>` : ""}`;
}
export async function eye(p, el, refresh) {
  const ex = (await list(P.sub(p.id, "eye"))).sort(byDate);
  const last = ex.at(-1);
  el.innerHTML = `<section class="card">
    <div class="row-between"><h3>فحص النظر</h3><button class="btn small primary adde">+ فحص</button></div>
    ${last ? `<h4>آخر فحص · ${esc(fmtDate(last.date, false))}</h4>${glassesTable(last)}
      <div class="grid2"><p>حدة البصر دون تصحيح: <b dir="ltr">R ${esc(last.vaR || "—")} · L ${esc(last.vaL || "—")}</b></p>
      <p>ضغط العين: <b dir="ltr">R ${esc(last.iopR || "—")} · L ${esc(last.iopL || "—")} mmHg</b></p></div>
      ${last.notes ? `<p>${esc(last.notes)}</p>` : ""}
      <button class="btn small prg">طباعة وصفة النظارة</button>` : empty("لا توجد فحوص")}
    ${ex.length > 1 ? `<details><summary class="muted">الفحوص السابقة (${ex.length - 1})</summary>${ex.slice(0, -1).reverse().map((e) => `<div class="visit-mini"><b>${esc(e.date)}</b>${glassesTable(e)}</div>`).join("")}</details>` : ""}
  </section>`;
  $(".adde", el).onclick = async () => {
    const eyeRow = (side, t) => `<fieldset class="eye-row"><legend>${t}</legend><div class="grid4" dir="ltr">
      ${field("Sph", "sph" + side, { attrs: 'inputmode="decimal"', value: last?.["sph" + side] || "" })}${field("Cyl", "cyl" + side, { attrs: 'inputmode="decimal"', value: last?.["cyl" + side] || "" })}
      ${field("Axis", "axis" + side, { attrs: 'inputmode="numeric"', value: last?.["axis" + side] || "" })}${field("Add", "add" + side, { attrs: 'inputmode="decimal"', value: last?.["add" + side] || "" })}</div>
      <div class="grid4" dir="ltr">${field("VA", "va" + side, { placeholder: "6/6" })}${field("BCVA", "bcva" + side, { placeholder: "6/6" })}${field("IOP", "iop" + side, { attrs: 'inputmode="numeric"' })}</div></fieldset>`;
    await modal("فحص نظر", `<form class="stack">${field("التاريخ", "date", { type: "date", value: ymd(), required: true })}
      ${eyeRow("R", "العين اليمنى (OD)")}${eyeRow("L", "العين اليسرى (OS)")}
      <div class="grid2">${field("PD (مم)", "pd", { attrs: 'inputmode="decimal" dir="ltr"', value: last?.pd || "" })}${select("نوع الوصفة", "type", [["glasses", "نظارة"], ["contact", "عدسات لاصقة"], ["none", "دون وصفة"]], "glasses")}</div>
      ${field("ملاحظات", "notes", { type: "textarea" })}</form>`, {
      wide: true,
      onOk: async (f) => { await addDoc(P.sub(p.id, "eye"), { ...f, createdAt: serverTimestamp() }); await audit("فحص نظر", p.name); setTimeout(refresh, 50); }
    });
  };
  $(".prg", el)?.addEventListener("click", () => printDoc(S.pub, last.type === "contact" ? "وصفة عدسات لاصقة" : "وصفة نظارة طبية",
    `<p><b>المريض:</b> ${esc(p.name)} ${ageText(p) ? `· ${esc(ageText(p))}` : ""} · <b>التاريخ:</b> ${esc(fmtDate(last.date, false))}</p>${glassesTable(last)}${last.notes ? `<p>${esc(last.notes)}</p>` : ""}`));
}

// ======================================================================
// العلاج الفيزيائي: باقات الجلسات والتمارين
// ======================================================================
export async function physio(p, el, refresh) {
  const all = await list(P.sub(p.id, "physio"));
  const pk = all.filter((x) => x.kind === "package").sort(byDate);
  const exDoc = all.find((x) => x.id === "exercises");
  const active = pk.filter((x) => x.status !== "done");
  const pains = pk.flatMap((x) => (x.sessions || []).filter((s) => s.pain !== "" && s.pain != null).map((s) => ({ date: s.date, v: Number(s.pain) })));
  el.innerHTML = `
    <section class="card">
      <div class="row-between"><h3>باقات الجلسات</h3><button class="btn small primary addp">+ باقة</button></div>
      ${active.length ? active.map((x) => { const n = (x.sessions || []).length; return `<div class="pkg">
        <div class="row-between"><div><b>${esc(x.name)}</b><div class="muted small">بدأت ${esc(x.date)}${x.price ? ` · ${esc(money(x.price, cur()))}` : ""}</div></div><b>${n}/${esc(x.total)}</b></div>
        <div class="progress"><i style="width:${Math.min(100, n / (x.total || 1) * 100)}%"></i></div>
        <div class="row gap wrap"><button class="btn small primary ses" data-id="${x.id}" ${n >= x.total ? "disabled" : ""}>+ تسجيل جلسة</button><button class="btn small pay" data-id="${x.id}">دفعة</button><button class="btn small fin" data-id="${x.id}">إنهاء الباقة</button></div>
        ${(x.sessions || []).length ? `<details><summary class="muted">الجلسات</summary><ol class="plain num small">${x.sessions.map((s) => `<li>${esc(s.date)}${s.pain !== "" && s.pain != null ? ` · الألم ${esc(s.pain)}/10` : ""}${s.note ? ` · ${esc(s.note)}` : ""}</li>`).join("")}</ol></details>` : ""}
      </div>`; }).join("") : empty("لا توجد باقة حالية")}
      ${pk.length - active.length ? `<p class="muted small">باقات منتهية: ${pk.length - active.length}</p>` : ""}
    </section>
    ${pains.length > 1 ? `<section class="card">${lineChart([{ name: "الألم", color: "var(--c3)", points: pains }], { label: "شدة الألم (0 إلى 10)" })}</section>` : ""}
    <section class="card">
      <div class="row-between"><h3>التمارين المنزلية</h3><button class="btn small addx">+ تمرين</button></div>
      <p class="muted small">تظهر هذه التمارين للمريض في تطبيقه.</p>
      ${(exDoc?.items || []).length ? `<ul class="plain">${exDoc.items.map((e, i) => `<li class="row-between"><div><b>${esc(e.name)}</b><div class="muted small">${[e.sets && `${e.sets} مجموعات`, e.reps && `${e.reps} تكرار`, e.freq].filter(Boolean).map(esc).join(" · ")}</div>${e.note ? `<div class="small">${esc(e.note)}</div>` : ""}</div><button class="icon-btn xdel" data-i="${i}" aria-label="حذف">✕</button></li>`).join("")}</ul>` : empty("لم تُضف تمارين")}
    </section>`;
  $(".addp", el).onclick = async () => {
    await modal("باقة جلسات", `<form class="stack">${field("اسم الباقة", "name", { required: true, placeholder: "تأهيل الركبة" })}
      <div class="grid2">${field("عدد الجلسات", "total", { type: "number", value: 10, required: true, attrs: 'min="1"' })}${field("السعر الإجمالي", "price", { type: "number", attrs: 'min="0"' })}</div>
      ${field("الهدف / التشخيص", "goal", { type: "textarea" })}</form>`, {
      onOk: async (f) => { await addDoc(P.sub(p.id, "physio"), { ...f, kind: "package", date: ymd(), status: "active", sessions: [], createdAt: serverTimestamp() }); setTimeout(refresh, 50); }
    });
  };
  $$(".ses", el).forEach((b) => b.onclick = async () => {
    const x = pk.find((y) => y.id === b.dataset.id);
    await modal("تسجيل جلسة", `<form class="stack">${field("التاريخ", "date", { type: "date", value: ymd(), required: true })}
      ${field("شدة الألم (0 إلى 10)", "pain", { type: "number", attrs: 'min="0" max="10"' })}${field("ما تم في الجلسة", "note", { type: "textarea" })}</form>`, {
      onOk: async (f) => { await updateDoc(P.subDoc(p.id, "physio", x.id), { sessions: [...(x.sessions || []), f] }); setTimeout(refresh, 50); }
    });
  });
  $$(".pay", el).forEach((b) => b.onclick = () => { const x = pk.find((y) => y.id === b.dataset.id); paymentModal(p.id, `باقة: ${x.name}`, { total: x.price || "", planId: x.id }); });
  $$(".fin", el).forEach((b) => b.onclick = async () => { await updateDoc(P.subDoc(p.id, "physio", b.dataset.id), { status: "done" }); refresh(); });
  const exRef = P.subDoc(p.id, "physio", "exercises");
  $(".addx", el).onclick = async () => {
    await modal("تمرين منزلي", `<form class="stack">${field("التمرين", "name", { required: true })}
      <div class="grid2">${field("المجموعات", "sets", { type: "number", attrs: 'min="1"' })}${field("التكرار", "reps", { type: "number", attrs: 'min="1"' })}</div>
      ${field("كم مرة", "freq", { placeholder: "مرتين يومياً" })}${field("طريقة الأداء", "note", { type: "textarea" })}</form>`, {
      onOk: async (f) => { await setDoc(exRef, { kind: "exercises", items: [...(exDoc?.items || []), f], updatedAt: serverTimestamp() }); setTimeout(refresh, 50); }
    });
  };
  $$(".xdel", el).forEach((b) => b.onclick = async () => { const items = exDoc.items.filter((_, i) => i !== Number(b.dataset.i)); await setDoc(exRef, { kind: "exercises", items }); refresh(); });
}

// ======================================================================
// مقتطفات للملخص
// ======================================================================
export async function summaryBits(p) {
  const out = [];
  if (hasMod("dental")) {
    const plan = (await list(P.sub(p.id, "plans"))).find((x) => x.status === "active");
    if (plan) { const t = await planTotals(p, plan); out.push(`<section class="card"><div class="row-between"><h3>خطة علاج الأسنان</h3><a class="btn small" href="#/p/${p.id}/dental">فتح</a></div><p>${t.doneCount}/${t.count} إجراء منجز · المتبقي <b>${esc(money(t.remaining, cur()))}</b></p><div class="progress"><i style="width:${t.count ? t.doneCount / t.count * 100 : 0}%"></i></div></section>`); }
  }
  if (hasMod("peds")) {
    const [g, rec] = await Promise.all([list(P.sub(p.id, "growth")), one(P.subDoc(p.id, "vaccines", "record"))]);
    const last = g.sort(byDate).at(-1);
    const nv = nextVac(vacStatus(p, rec));
    out.push(`<section class="card"><div class="row-between"><h3>النمو واللقاحات</h3><a class="btn small" href="#/p/${p.id}/peds">فتح</a></div>
      ${last ? `<p>آخر قياس (${esc(last.date)}): ${last.weight ? `${esc(last.weight)} كغ` : ""} ${last.height ? `· ${esc(last.height)} سم` : ""}</p>` : ""}
      ${nv ? `<p>اللقاح القادم: <b>${esc(nv.name)}</b> ${nv.due ? `· ${esc(fmtDate(nv.due, false))}` : ""} <span class="chip ${VST[nv.st][1]}">${VST[nv.st][0]}</span></p>` : `<p class="muted">اكتملت اللقاحات المجدولة</p>`}</section>`);
  }
  if (hasMod("chronic")) {
    const v = (await list(P.sub(p.id, "vitals"))).sort(byDate);
    const bp = [...v].reverse().find((x) => x.sys), su = [...v].reverse().find((x) => x.sugar);
    if (bp || su) {
      const f1 = bp && bpFlag(bp.sys, bp.dia), f2 = su && sugarFlag(su.sugar, su.sugarType);
      out.push(`<section class="card"><div class="row-between"><h3>المؤشرات الحيوية</h3><a class="btn small" href="#/p/${p.id}/chronic">فتح</a></div>
        ${bp ? `<p>الضغط: <b dir="ltr">${esc(bp.sys)}/${esc(bp.dia)}</b> <span class="chip ${f1[1]}">${f1[0]}</span> <small class="muted">${esc(bp.date)}</small></p>` : ""}
        ${su ? `<p>السكر: <b>${esc(su.sugar)}</b> <span class="chip ${f2[1]}">${f2[0]}</span> <small class="muted">${esc(su.date)}</small></p>` : ""}</section>`);
    }
  }
  if (hasMod("eye")) {
    const e = (await list(P.sub(p.id, "eye"))).sort(byDate).at(-1);
    if (e) out.push(`<section class="card"><div class="row-between"><h3>آخر فحص نظر · ${esc(e.date)}</h3><a class="btn small" href="#/p/${p.id}/eye">فتح</a></div>${glassesTable(e)}</section>`);
  }
  if (hasMod("physio")) {
    const pk = (await list(P.sub(p.id, "physio"))).filter((x) => x.kind === "package" && x.status !== "done");
    pk.forEach((x) => out.push(`<section class="card"><div class="row-between"><h3>${esc(x.name)}</h3><a class="btn small" href="#/p/${p.id}/physio">فتح</a></div><p>${(x.sessions || []).length}/${esc(x.total)} جلسة</p><div class="progress"><i style="width:${Math.min(100, (x.sessions || []).length / (x.total || 1) * 100)}%"></i></div></section>`));
  }
  return out.join("");
}
