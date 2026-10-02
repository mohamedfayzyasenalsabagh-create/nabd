// الملف الطبي الكامل للمريض
import { addFileDoc, fileData,
  P, C, list, one, doc, setDoc, updateDoc, addDoc, query, where, serverTimestamp, onSnapshot, arrayUnion, arrayRemove,
  audit, resetPatientPassword, randId
} from "./fb.js";
import { makeThumb, tileImg, isImg, showFile, CASH_METHODS,
  $, $$, esc, ymd, addDays, parseYmd, fmtDate, fmtTime, tsDate, money, toast, errMsg, modal, confirmBox, info,
  field, select, waLink, empty, compressImage, pickFile, printDoc, daysBetween, qrSvg
} from "./ui.js";
import { S } from "./app.js";
import { PC, isDoctor, isNurse, go, bookModal, bookAppointment, slotsFor, paymentModal, printReceipt, showCredentials, STATUS, hasMod, feat, ageText, docName } from "./staff.js";
const mods = () => import("./mods.js");
const women = () => hasMod("preg") || hasMod("gyn");

const cur = () => S.clinic?.currency || "ل.س";
const main = () => $("#main");

// ---------- حسابات الحمل ----------
export function pregCalc(g, today = ymd()) {
  const edd = g.eddUs || g.eddLmp;
  if (!edd) return null;
  const ga = 280 - daysBetween(today, edd);
  const w = Math.floor(ga / 7), d = ga % 7;
  const tri = w < 14 ? "الثلث الأول" : w < 28 ? "الثلث الثاني" : "الثلث الثالث";
  return { edd, ga, w, d, tri, left: daysBetween(today, edd) };
}
export const gaText = (c) => c ? `${c.w} أسبوع${c.d ? " و" + c.d + " يوم" : ""}` : "";

export function activeMeds(rxs, today = ymd()) {
  const out = [];
  rxs.forEach((r) => (r.items || []).forEach((it) => {
    if (!it.endDate || it.endDate >= today) out.push({ ...it, rxDate: r.date });
  }));
  return out;
}

// ---------- الهيكل ----------
export async function renderCard() {
  const [, pid, tabRaw] = location.hash.replace(/^#\/?/, "").split(/[/?]/);
  const p = PC.byId[pid] || (await one(P.patient(pid)));
  if (!p) { main().innerHTML = empty("لم يُعثر على المريض"); return; }
  const doctor = isDoctor();
  const modTabs = [
    ["dental", "الأسنان", hasMod("dental")], ["peds", "النمو واللقاحات", hasMod("peds")],
    ["chronic", "المؤشرات الحيوية", hasMod("chronic")], ["eye", "النظر", hasMod("eye")],
    ["physio", "الجلسات والتمارين", hasMod("physio")],
    ["preg", "الحمل", hasMod("preg")], ["gyn", "التاريخ النسائي والعقم", hasMod("gyn")],
    ["cosm", S.clinic?.specialty === "obgyn" ? "التجميل" : "الإجراءات والجلسات", hasMod("cosm")],
  ].filter((x) => x[2]).map(([k, t]) => [k, t]);
  const nurse = isNurse();
  const tabs = nurse
    ? [["summary", "الملخص"], ...modTabs.filter(([k]) => ["chronic", "peds", "dental", "preg", "eye"].includes(k)), ["visits", "الزيارات"], ["rx", "الوصفات"], ["files", "التحاليل والملفات"], ["appts", "المواعيد"], ["info", "البيانات"], ["msgs", "الرسائل"]]
    : doctor
    ? [["summary", "الملخص"], ...modTabs, ["visits", "الزيارات"], ["rx", "الوصفات"], ["files", "التحاليل والملفات"], ["private", "ملاحظات خاصة"], ["appts", "المواعيد"], ["money", "المالية"], ["msgs", "الرسائل"], ["account", "الحساب"]]
    : [["info", "البيانات"], ["appts", "المواعيد"], ["money", "المالية"], ["msgs", "الرسائل"], ["account", "الحساب"]];
  const tab = tabs.some(([k]) => k === tabRaw) ? tabRaw : tabs[0][0];
  main().innerHTML = `
    <div class="pt-head">
      <a href="#/patients" class="icon-btn" aria-label="رجوع">→</a>
      <span class="avatar lg">${esc(p.name.trim()[0] || "؟")}</span>
      <div class="grow"><h2>${esc(p.name)} ${p.archived ? `<span class="chip">مؤرشف</span>` : ""}</h2>
        <div class="muted small"><span dir="ltr">${esc(p.phone)}</span>${ageText(p) ? ` · ${esc(ageText(p))}` : ""}${p.bloodType ? ` · فصيلة ${esc(p.bloodType)}` : ""}</div></div>
    </div>
    <div class="row gap wrap quick">
      <button class="btn small primary q-book">+ موعد</button>
      ${doctor ? `<button class="btn small q-visit">تسجيل زيارة</button><button class="btn small q-rx">وصفة</button><button class="btn small q-doc">📄 ورقة طبية</button><button class="btn small q-lab">🧪 طلب تحاليل وأشعة</button><button class="btn small q-file">🖨 ملف المريض</button>` : ""}
      <button class="btn small q-pay">دفعة</button>
      <a class="btn small" href="tel:${esc(p.phone)}">اتصال</a>
      <a class="btn small" target="_blank" rel="noopener" href="${esc(waLink(p.phone, `مرحباً ${p.name}، `))}">واتساب</a>
    </div>
    <nav class="tabs" aria-label="أقسام البطاقة">${tabs.map(([k, t]) => `<a href="#/p/${pid}/${k}" class="${k === tab ? "on" : ""}">${esc(t)}</a>`).join("")}</nav>
    <div id="tab" class="tab-body"><div class="loading">جارٍ التحميل…</div></div>`;
  $(".tabs .on")?.scrollIntoView({ inline: "center", block: "nearest" });
  $(".q-book").onclick = () => bookModal({ pid });
  $(".q-pay").onclick = () => paymentModal(pid);
  $(".q-visit")?.addEventListener("click", () => visitModal(pid));
  $(".q-rx")?.addEventListener("click", () => rxModal(pid));
  $(".q-doc")?.addEventListener("click", () => medDocModal(pid));
  $(".q-lab")?.addEventListener("click", () => labOrderModal(pid));
  $(".q-file")?.addEventListener("click", () => printPatientFile(pid));
  const T = { summary, info: infoTab, visits, rx, preg, gyn, cosm, files, private: privateTab, appts, money: moneyTab, msgs, account };
  try {
    if (!T[tab]) { const M = await mods(); await M[tab](p, tabEl(), refresh); if (nurse) nurseReadOnly(tab); return; }
    await T[tab](p);
    if (nurse) nurseReadOnly(tab);
  } catch (e) { console.error(e); $("#tab").innerHTML = `<p class="alert">${esc(errMsg(e))}</p>`; }
}
const tabEl = () => $("#tab");
export const refresh = () => renderCard();

// ---------- الملخص (الطبيبة) ----------
async function summary(p) {
  const [med, rxs, pregs, vis, apps] = await Promise.all([
    one(P.subDoc(p.id, "medical", "profile")),
    list(P.sub(p.id, "prescriptions")),
    list(P.sub(p.id, "pregnancies")),
    list(P.sub(p.id, "visits")),
    list(query(P.col("appointments"), where("patientId", "==", p.id))),
  ]);
  const m = med || {};
  const meds = activeMeds(rxs);
  const g = pregs.find((x) => x.status === "active");
  const gc = g ? pregCalc(g) : null;
  const last = vis.sort((a, b) => b.date.localeCompare(a.date))[0];
  const next = apps.filter((a) => a.date >= ymd() && !["cancelled", "done", "noshow"].includes(a.status)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  tabEl().innerHTML = `
    ${m.allergies ? `<div class="alert danger">⚠️ حساسية: ${esc(m.allergies)}</div>` : ""}
    ${g ? `<section class="card preg-card ${g.highRisk ? "risk" : ""}"><div class="row-between"><h3>🤰 حامل · ${esc(gaText(gc))}</h3>${g.highRisk ? `<span class="chip danger">عالي الخطورة</span>` : ""}</div>
      <p>الولادة المتوقعة: <b>${esc(fmtDate(gc.edd, false))}</b> · ${esc(gc.tri)}</p><a href="#/p/${p.id}/preg" class="btn small">متابعة الحمل</a></section>` : ""}
    <div class="grid2">
      <section class="card"><h3>الموعد القادم</h3>${next ? `<p><b>${esc(fmtDate(next.date))}</b><br>${esc(fmtTime(next.time))} · ${esc(next.type || "")}</p>` : empty("لا يوجد موعد")}</section>
      <section class="card"><h3>آخر زيارة</h3>${last ? `<p><b>${esc(fmtDate(last.date, false))}</b><br>${esc(last.diagnosis || last.complaint || "")}</p>` : empty("لا توجد زيارات")}</section>
    </div>
    <section class="card"><div class="row-between"><h3>الأدوية الحالية</h3><button class="btn small q-rx2">+ وصفة</button></div>
      ${meds.length ? `<ul class="plain">${meds.map((x) => `<li><b>${esc(x.drug)}</b> ${esc(x.dose || "")} ${x.times ? `· ${esc(x.times)}` : ""} ${x.endDate ? `<span class="muted small">حتى ${esc(x.endDate)}</span>` : `<span class="muted small">مستمر</span>`}</li>`).join("")}</ul>` : empty("لا توجد أدوية حالية")}</section>
    <section class="card"><div class="row-between"><h3>التاريخ المرضي</h3><button class="btn small ed">تعديل</button></div>
      <table class="kv">
        <tr><th>أمراض مزمنة</th><td>${esc(m.chronic || "—")}</td></tr>
        <tr><th>حساسية</th><td>${esc(m.allergies || "—")}</td></tr>
        <tr><th>عمليات سابقة</th><td>${esc(m.surgeries || "—")}</td></tr>
        <tr><th>أدوية دائمة</th><td>${esc(m.permanentMeds || "—")}</td></tr>
        ${women() ? `<tr><th>حمل / ولادة / إجهاض / قيصرية</th><td>${esc(m.gravida ?? "—")} / ${esc(m.para ?? "—")} / ${esc(m.abortions ?? "—")} / ${esc(m.cesareans ?? "—")}</td></tr>
        <tr><th>وسيلة منع الحمل</th><td>${esc(m.contraception || "—")}</td></tr>` : ""}
      </table></section>
    <div id="modsum"></div>
    <section class="card"><h3>مستندات</h3><div class="row gap wrap">
      <button class="btn small pr-file">طباعة الملف كامل</button>
      <button class="btn small pr-leave">إجازة مرضية</button>
      <button class="btn small pr-ref">إحالة</button>
      ${g ? `<button class="btn small pr-preg">تقرير حمل</button>` : ""}
      <button class="btn small pr-free">تقرير طبي</button>
    </div></section>`;
  $(".q-rx2").onclick = () => rxModal(p.id);
  $(".ed").onclick = () => medicalModal(p, m);
  $(".pr-file").onclick = () => printFile(p);
  $(".pr-leave").onclick = () => certModal(p, "leave");
  $(".pr-ref").onclick = () => certModal(p, "referral");
  $(".pr-free").onclick = () => certModal(p, "report");
  $(".pr-preg")?.addEventListener("click", () => printPregReport(p, g));
  const M = await mods();
  const bits = await M.summaryBits(p).catch((e) => { console.warn(e); return ""; });
  if ($("#modsum")) $("#modsum").innerHTML = bits;
}

async function medicalModal(p, m) {
  await modal(women() ? "التاريخ المرضي والنسائي" : "التاريخ المرضي", `<form class="stack">
    ${field("أمراض مزمنة", "chronic", { value: m.chronic })}
    ${field("حساسية", "allergies", { value: m.allergies, hint: "تظهر كتنبيه أحمر أعلى البطاقة" })}
    ${field("عمليات سابقة", "surgeries", { value: m.surgeries })}
    ${field("أدوية دائمة", "permanentMeds", { value: m.permanentMeds })}
    ${women() ? `<div class="grid4">
      ${field("عدد الحمول", "gravida", { type: "number", value: m.gravida ?? "", attrs: 'min="0"' })}
      ${field("الولادات", "para", { type: "number", value: m.para ?? "", attrs: 'min="0"' })}
      ${field("الإجهاضات", "abortions", { type: "number", value: m.abortions ?? "", attrs: 'min="0"' })}
      ${field("القيصريات", "cesareans", { type: "number", value: m.cesareans ?? "", attrs: 'min="0"' })}
    </div>
    ${field("وسيلة منع الحمل الحالية", "contraception", { value: m.contraception })}
    <div class="grid2">
      ${field("آخر مسحة عنق رحم", "lastPap", { type: "date", value: m.lastPap || "" })}
      ${select("تكرار المسحة", "papMonths", [["", "—"], [12, "كل سنة"], [24, "كل سنتين"], [36, "كل 3 سنوات"], [60, "كل 5 سنوات"]], m.papMonths || "")}
    </div>` : ""}
  </form>`, {
    onOk: async (f) => {
      await setDoc(P.subDoc(p.id, "medical", "profile"), { ...f, ...("papMonths" in f ? { papMonths: f.papMonths ? Number(f.papMonths) : null } : {}), updatedAt: serverTimestamp() }, { merge: true });
      await audit("تعديل التاريخ المرضي", p.name);
      toast("تم الحفظ"); setTimeout(refresh, 50);
    }
  });
}

// ---------- البيانات الأساسية (السكرتارية) ----------
async function infoTab(p) {
  const apps = await list(query(P.col("appointments"), where("patientId", "==", p.id)));
  const next = apps.filter((a) => a.date >= ymd() && !["cancelled", "done", "noshow"].includes(a.status)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  tabEl().innerHTML = `<section class="card"><div class="row-between"><h3>البيانات الأساسية</h3><button class="btn small ed">تعديل</button></div>
    <table class="kv"><tr><th>الاسم</th><td>${esc(p.name)}</td></tr><tr><th>الجوال</th><td dir="ltr">${esc(p.phone)}</td></tr>
    <tr><th>العمر</th><td>${esc(p.age ?? "—")}</td></tr><tr><th>فصيلة الدم</th><td>${esc(p.bloodType || "—")}</td></tr><tr><th>العنوان</th><td>${esc(p.address || "—")}</td></tr></table></section>
    <section class="card"><h3>الموعد القادم</h3>${next ? `<p><b>${esc(fmtDate(next.date))}</b> · ${esc(fmtTime(next.time))} · ${esc(next.type || "")}</p>` : empty("لا يوجد موعد")}</section>
    <p class="muted small">التفاصيل الطبية تظهر للأطباء فقط.</p>`;
  $(".ed").onclick = () => editBasic(p);
}
async function editBasic(p) {
  await modal("تعديل البيانات", `<form class="stack">
    ${field("الاسم", "name", { value: p.name, required: true })}
    <div class="grid2">${field("العمر", "age", { type: "number", value: p.age ?? "" })}${select("فصيلة الدم", "bloodType", ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], p.bloodType)}</div>
    ${field("العنوان", "address", { value: p.address })}
    <p class="muted small">رقم الجوال هو رقم الدخول، ولا يمكن تغييره من هنا.</p></form>`, {
    onOk: async (f) => {
      await updateDoc(P.patient(p.id), { name: f.name, age: f.age, bloodType: f.bloodType, address: f.address });
      await audit("تعديل بيانات مريض", f.name);
      toast("تم الحفظ"); setTimeout(refresh, 50);
    }
  });
}

// ---------- الزيارات ----------
async function visits(p) {
  const vs = (await list(P.sub(p.id, "visits"))).sort((a, b) => b.date.localeCompare(a.date));
  tabEl().innerHTML = `<div class="row-between"><h3>الزيارات (${vs.length})</h3><button class="btn primary small add">+ زيارة</button></div>
    ${vs.length ? vs.map((v) => `<section class="card visit">
      <div class="row-between"><b>${esc(fmtDate(v.date))}</b><button class="icon-btn pr" data-id="${v.id}" aria-label="طباعة">🖨</button></div>
      ${v.complaint ? `<p><span class="muted">الشكوى:</span> ${esc(v.complaint)}</p>` : ""}
      ${v.exam ? `<p><span class="muted">الفحص:</span> ${esc(v.exam)}</p>` : ""}
      ${v.diagnosis ? `<p><span class="muted">التشخيص:</span> <b>${esc(v.diagnosis)}</b></p>` : ""}
      ${v.treatment ? `<p><span class="muted">العلاج:</span> ${esc(v.treatment)}</p>` : ""}
      ${v.publicNote ? `<p class="note-pub"><span class="muted">ملاحظة للمريض:</span> ${esc(v.publicNote)}</p>` : ""}
    </section>`).join("") : empty("لا توجد زيارات")}`;
  $(".add").onclick = () => visitModal(p.id);
  $$(".pr").forEach((b) => b.onclick = () => {
    const v = vs.find((x) => x.id === b.dataset.id);
    printDoc(S.pub, "تقرير زيارة", `<table class="kv"><tr><th>المريض</th><td>${esc(p.name)}</td></tr><tr><th>التاريخ</th><td>${esc(fmtDate(v.date, false))}</td></tr>
      <tr><th>الشكوى</th><td>${esc(v.complaint || "")}</td></tr><tr><th>الفحص</th><td>${esc(v.exam || "")}</td></tr><tr><th>التشخيص</th><td>${esc(v.diagnosis || "")}</td></tr><tr><th>العلاج</th><td>${esc(v.treatment || "")}</td></tr></table>`);
  });
}

export async function visitModal(pid, appt = null) {
  const p = PC.byId[pid];
  await modal(`زيارة · ${p?.name || ""}`, `<form class="stack">
    ${field("التاريخ", "date", { type: "date", value: appt?.date || ymd(), required: true })}
    ${field("الشكوى", "complaint", { type: "textarea" })}
    ${field("الفحص", "exam", { type: "textarea" })}
    ${field("التشخيص", "diagnosis", { hint: "افصل بين التشخيصات بفاصلة" })}
    ${field("العلاج / الخطة", "treatment", { type: "textarea" })}
    ${field("ملاحظة تظهر للمريض", "publicNote", { type: "textarea" })}
    ${field("ملاحظة خاصة (للأطباء فقط)", "privateNote", { type: "textarea" })}
    ${appt ? field("تحويل الموعد إلى «منتهٍ»", "markDone", { type: "checkbox", value: true }) : ""}
  </form>`, {
    ok: "حفظ الزيارة", wide: true,
    onOk: async (f) => {
      const ref = doc(P.sub(pid, "visits"));
      await setDoc(ref, {
        date: f.date, complaint: f.complaint, exam: f.exam, diagnosis: f.diagnosis, treatment: f.treatment,
        publicNote: f.publicNote, appointmentId: appt?.id || null, createdAt: serverTimestamp()
      });
      if (f.privateNote) await addDoc(P.sub(pid, "private"), { type: "note", visitId: ref.id, date: f.date, text: f.privateNote, createdAt: serverTimestamp() });
      await setDoc(P.colDoc("stats", ref.id), { date: f.date, diagnosis: f.diagnosis || "", patientId: pid });
      if (appt && f.markDone) { await updateDoc(P.colDoc("appointments", appt.id), { status: "done" }); (await import("./staff.js")).consumeForAppt(appt); }
      await audit("تسجيل زيارة", p?.name);
      toast("حُفظت الزيارة");
      if (await confirmBox("وصفة", "هل تريد كتابة وصفة لهذه الزيارة؟", "كتابة وصفة")) await rxModal(pid);
      if (location.hash.startsWith(`#/p/${pid}`)) refresh(); else go(`#/p/${pid}/visits`);
    }
  });
}

// ---------- الوصفات ----------
async function rx(p) {
  const rxs = (await list(P.sub(p.id, "prescriptions"))).sort((a, b) => b.date.localeCompare(a.date));
  tabEl().innerHTML = `<div class="row-between"><h3>الوصفات</h3><button class="btn primary small add">+ وصفة</button></div>
    ${rxs.length ? rxs.map((r) => `<section class="card"><div class="row-between"><b>${esc(fmtDate(r.date, false))}</b><button class="icon-btn pr" data-id="${r.id}" aria-label="طباعة">🖨</button></div>
      <ol class="rx-items">${(r.items || []).map((it) => `<li><b>${esc(it.drug)}</b> ${esc(it.dose || "")}${it.times ? ` · ${esc(it.times)}` : ""}${it.days ? ` · ${esc(it.days)} يوم` : ""}${it.note ? `<br><small>${esc(it.note)}</small>` : ""}</li>`).join("")}</ol>
      ${r.note ? `<p class="muted">${esc(r.note)}</p>` : ""}</section>`).join("") : empty("لا توجد وصفات")}`;
  $(".add").onclick = () => rxModal(p.id);
  $$(".pr").forEach((b) => b.onclick = () => printRx(p, rxs.find((x) => x.id === b.dataset.id)));
}

export async function rxModal(pid) {
  const p = PC.byId[pid];
  const { COMMON_DRUGS, builtinTemplatesFor, QUICK_TIMES } = await import("./drugs.js");
  const known = Object.fromEntries(COMMON_DRUGS.map((d) => [d.drug.toLowerCase(), d]));
  const drugs = [...new Set([...(S.clinic?.drugs || []), ...COMMON_DRUGS.map((d) => d.drug)])];
  const own = S.clinic?.rxTemplates || [];
  const builtin = builtinTemplatesFor(S.clinic?.modules || [], S.clinic?.specialty || "");
  const templates = [...own, ...builtin.filter((b) => !own.some((o) => o.name === b.name))];
  let items = [{ drug: "", dose: "", times: "", days: "", note: "" }];
  const rowHtml = (it, i) => `<div class="rx-row" data-i="${i}">
    <input list="druglist" placeholder="اسم الدواء (اكتب أول حرفين)" value="${esc(it.drug)}" data-k="drug" aria-label="الدواء" dir="auto">
    <input placeholder="الجرعة (حبة، 5مل…)" value="${esc(it.dose)}" data-k="dose" aria-label="الجرعة">
    <div class="rx-times"><input placeholder="الأوقات: 8:00, 20:00" value="${esc(it.times)}" data-k="times" aria-label="الأوقات" dir="ltr">
      <div class="qt">${QUICK_TIMES.map(([t, v]) => `<button type="button" class="qt-b" data-v="${v}">${t}</button>`).join("")}</div></div>
    <input type="number" placeholder="أيام" value="${esc(it.days)}" data-k="days" aria-label="المدة بالأيام" min="1">
    <input placeholder="ملاحظة (قبل الأكل…)" value="${esc(it.note)}" data-k="note" aria-label="ملاحظة">
    <button type="button" class="icon-btn rm" aria-label="حذف">✕</button></div>`;
  await modal(`وصفة · ${p?.name || ""}`, `<form class="stack">
    ${templates.length ? `<div class="row gap tpl-row"><label class="field grow"><span>وصفة جاهزة</span><select class="tpl"><option value="">— اختر لتعبئة الأدوية —</option>
      ${own.length ? `<optgroup label="وصفاتي المحفوظة">${own.map((t, i) => `<option value="${i}">${esc(t.name)}</option>`).join("")}</optgroup>` : ""}
      <optgroup label="وصفات مقترحة">${templates.slice(own.length).map((t, i) => `<option value="${own.length + i}">${esc(t.name)}</option>`).join("")}</optgroup></select></label>
      <button type="button" class="btn small ghost del-tpl hidden">حذف من محفوظاتي</button></div>` : ""}
    <datalist id="druglist">${drugs.map((d) => `<option value="${esc(d)}">`).join("")}</datalist>
    <div class="rx-rows"></div>
    <button type="button" class="btn small add-row">+ دواء</button>
    ${field("ملاحظة عامة", "note")}
    ${field("احفظها كوصفة جاهزة باسم (اختياري)", "tplName", { placeholder: "مثلاً: بعد القلع" })}
    <p class="muted small">تتحول الأوقات إلى تذكير لدى المريض في التطبيق، وتحدد المدة بقاء الدواء في قائمة أدويته.</p>
  </form>`, {
    ok: "حفظ", wide: true,
    onOpen: (w) => {
      const draw = () => {
        w.querySelector(".rx-rows").innerHTML = items.map(rowHtml).join("");
        w.querySelectorAll(".rx-row input").forEach((el) => el.oninput = () => {
          const row = el.closest(".rx-row"), it = items[row.dataset.i];
          it[el.dataset.k] = el.value;
          // عند اختيار دواء معروف: تعبئة الجرعة والأوقات والمدة المقترحة إن كانت فارغة
          const k = el.dataset.k === "drug" && known[el.value.trim().toLowerCase()];
          if (k) ["dose", "times", "days"].forEach((f) => { if (!it[f] && k[f] !== "") { it[f] = String(k[f]); const inp = row.querySelector(`[data-k="${f}"]`); if (inp) inp.value = it[f]; } });
        });
        w.querySelectorAll(".qt-b").forEach((b) => b.onclick = () => {
          const row = b.closest(".rx-row"), inp = row.querySelector('[data-k="times"]');
          inp.value = b.dataset.v; items[row.dataset.i].times = b.dataset.v;
        });
        w.querySelectorAll(".rx-row .rm").forEach((b) => b.onclick = () => { items.splice(b.closest(".rx-row").dataset.i, 1); if (!items.length) items.push({ drug: "", dose: "", times: "", days: "", note: "" }); draw(); });
      };
      draw();
      w.querySelector(".add-row").onclick = () => { items.push({ drug: "", dose: "", times: "", days: "", note: "" }); draw(); };
      const del = w.querySelector(".del-tpl");
      w.querySelector(".tpl")?.addEventListener("change", (e) => {
        const v = e.target.value;
        del?.classList.toggle("hidden", v === "" || Number(v) >= own.length);
        if (v !== "") { items = templates[v].items.map((x) => ({ drug: "", dose: "", times: "", days: "", note: "", ...x, days: x.days ?? "" })); draw(); }
      });
      del?.addEventListener("click", async () => {
        const t = own[w.querySelector(".tpl").value]; if (!t) return;
        try { await updateDoc(P.clinic(), { rxTemplates: arrayRemove(t) }); toast("حُذفت الوصفة من محفوظاتك"); own.splice(own.indexOf(t), 1); del.classList.add("hidden"); w.querySelector(`.tpl option[value="${templates.indexOf(t)}"]`)?.remove(); }
        catch (err) { toast(errMsg(err), true); }
      });
    },
    onOk: async (f) => {
      const date = ymd();
      const clean = items.filter((x) => x.drug.trim()).map((x) => ({
        drug: x.drug.trim(), dose: x.dose.trim(), times: x.times.trim(), days: x.days ? Number(x.days) : null, note: x.note.trim(),
        endDate: x.days ? addDays(date, Number(x.days) - 1) : null
      }));
      if (!clean.length) { toast("اكتب دواءً واحداً على الأقل", true); return false; }
      let verify = null;
      if (feat("qr")) {
        verify = randId(16);
        try {
          await setDoc(P.rxVerify(verify), {
            clinicId: C, clinicName: S.clinic?.name || "", accent: S.clinic?.accent || "", doctorName: S.profile.name || S.clinic?.doctorName || "",
            date, patient: maskName(p?.name || ""), items: clean.map(({ drug, dose, days }) => ({ drug, dose, days })), createdAt: serverTimestamp()
          });
        } catch (e) { console.warn(e); verify = null; }
      }
      const ref = await addDoc(P.sub(pid, "prescriptions"), { date, items: clean, note: f.note, verify, doctorName: S.profile.name || "", createdAt: serverTimestamp() });
      const patch = { drugs: arrayUnion(...clean.map((x) => x.drug)) };
      if (f.tplName) patch.rxTemplates = arrayUnion({ name: f.tplName, items: clean.map(({ endDate, ...r }) => r) });
      try { await updateDoc(P.clinic(), patch); } catch {}
      await audit("كتابة وصفة", p?.name);
      toast("حُفظت الوصفة وستظهر لدى المريض");
      if (await confirmBox("طباعة", "هل تريد طباعة الوصفة؟", "طباعة")) printRx(p, { id: ref.id, date, items: clean, note: f.note, verify, doctorName: S.profile.name });
      if (location.hash.startsWith(`#/p/${pid}`)) refresh();
    }
  });
}
// ---------- أوراق طبية جاهزة: إجازة مرضية، تقرير طبي، تحويل ----------
const NUM_AR = ["", "يوم واحد", "يومين", "ثلاثة أيام", "أربعة أيام", "خمسة أيام", "ستة أيام", "سبعة أيام", "ثمانية أيام", "تسعة أيام", "عشرة أيام"];
const daysText = (n) => NUM_AR[n] || `${n} يوماً`;
export async function medDocModal(pid) {
  const p = PC.byId[pid];
  const vs = (await list(P.sub(pid, "visits"))).sort((a, b) => b.date.localeCompare(a.date));
  const last = vs[0] || {};
  const doctorName = S.profile.name || S.clinic?.doctorName || "";
  const r = await modal(`ورقة طبية · ${p?.name || ""}`, `<form class="stack">
    <div class="seg doc-kind" role="tablist">
      <button type="button" class="on" data-k="leave">إجازة مرضية</button><button type="button" data-k="report">تقرير طبي</button><button type="button" data-k="ref">تحويل</button>
    </div>
    <input type="hidden" name="kind" value="leave">
    ${field("التشخيص", "diagnosis", { value: last.diagnosis || "" })}
    <div class="k k-leave grid2">${field("من تاريخ", "from", { type: "date", value: ymd() })}${field("عدد الأيام", "days", { type: "number", value: 2, attrs: 'min="1" max="60"' })}</div>
    <div class="k k-leave">${field("الجهة (اختياري)", "toLeave", { placeholder: "مثلاً: إلى من يهمه الأمر / اسم المدرسة أو الشركة" })}</div>
    <div class="k k-report hidden">${field("موجه إلى", "toReport", { value: "إلى من يهمه الأمر" })}${field("نص التقرير", "body", { type: "textarea", value: [last.complaint && `راجع العيادة بشكوى: ${last.complaint}.`, last.exam && `بالفحص: ${last.exam}.`, last.treatment && `العلاج: ${last.treatment}.`].filter(Boolean).join("\n") })}</div>
    <div class="k k-ref hidden">${field("إلى الطبيب / الاختصاص", "toRef", { placeholder: "مثلاً: الزميل اختصاصي الجراحة الفكية" })}${field("سبب التحويل", "reason", { type: "textarea" })}${field("ملخص الحالة والعلاج", "summary", { type: "textarea", value: last.treatment ? `العلاج المطبق: ${last.treatment}` : "" })}</div>
  </form>`, {
    ok: "طباعة",
    onOpen: (w) => {
      w.querySelectorAll(".doc-kind button").forEach((b) => b.onclick = () => {
        w.querySelectorAll(".doc-kind button").forEach((x) => x.classList.toggle("on", x === b));
        w.querySelector("[name=kind]").value = b.dataset.k;
        w.querySelectorAll(".k").forEach((el) => el.classList.toggle("hidden", !el.classList.contains("k-" + b.dataset.k)));
      });
    }
  });
  if (!r) return;
  const who = `${["f", "female"].includes(p.sex) ? "السيدة" : "السيد"} <b>${esc(p.name)}</b>${ageText(p) ? ` (${esc(ageText(p))})` : ""}`;
  const diag = r.diagnosis ? `<p><b>التشخيص:</b> ${esc(r.diagnosis)}</p>` : "";
  const signer = `د. ${doctorName}`;
  const F = ["f", "female"].includes(p.sex), g = (m, fm) => (F ? fm : m);
  if (r.kind === "leave") {
    const n = Math.max(1, Number(r.days) || 1), to = addDays(r.from, n - 1);
    printDoc(S.pub, "إجازة مرضية", `${r.toLeave ? `<p>${esc(r.toLeave)}</p>` : `<p>إلى من يهمه الأمر</p>`}
      <p class="lead">نشهد بأن ${who} قد ${g("راجع", "راجعت")} العيادة بتاريخ ${esc(fmtDate(r.from, false))}، وبعد الفحص تبيّن ${g("أنه", "أنها")} بحاجة إلى راحة طبية لمدة <b>${esc(daysText(n))}</b>، اعتباراً من ${esc(fmtDate(r.from, false))} ولغاية ${esc(fmtDate(to, false))} ضمناً.</p>
      ${diag}<p>أُعطيت هذه الشهادة بناءً على ${g("طلبه", "طلبها")}.</p>`, { signer });
  } else if (r.kind === "report") {
    printDoc(S.pub, "تقرير طبي", `<p>${esc(r.toReport || "إلى من يهمه الأمر")}</p>
      <p class="lead">نفيد بأن ${who} ${g("يراجع", "تراجع")} عيادتنا.</p>${diag}
      ${r.body ? `<div class="pre lead">${esc(r.body)}</div>` : ""}<p>أُعطي هذا التقرير بناءً على ${g("طلبه", "طلبها")}.</p>`, { signer });
  } else {
    printDoc(S.pub, "رسالة تحويل", `<p>${r.toRef ? `حضرة ${esc(r.toRef)} المحترم،` : "حضرة الزميل المحترم،"}</p>
      <p class="lead">تحية طيبة، أحوّل إليكم ${who} لإجراء التقييم والمتابعة اللازمة.</p>${diag}
      ${r.reason ? `<p><b>سبب التحويل:</b></p><div class="pre">${esc(r.reason)}</div>` : ""}
      ${r.summary ? `<p><b>ملخص الحالة:</b></p><div class="pre">${esc(r.summary)}</div>` : ""}
      <p>مع الشكر والتقدير.</p>`, { signer });
  }
  await audit({ leave: "طباعة إجازة مرضية", report: "طباعة تقرير طبي", ref: "طباعة رسالة تحويل" }[r.kind], p.name);
}

// ---------- طلب تحاليل وأشعة ----------
export async function labOrderModal(pid) {
  const p = PC.byId[pid];
  const { LAB_GROUPS, IMAGING_GROUPS } = await import("./drugs.js");
  const dental = (S.clinic?.modules || []).includes("dental");
  const groups = [...(dental ? [IMAGING_GROUPS[0]] : []), ...LAB_GROUPS, ...(dental ? [IMAGING_GROUPS[1]] : IMAGING_GROUPS)];
  const r = await modal(`طلب تحاليل وأشعة · ${p?.name || ""}`, `<form class="stack lab-form">
    ${groups.map(([g, items], gi) => `<details ${gi < 2 ? "open" : ""}><summary><b>${esc(g)}</b></summary><div class="lab-grid">
      ${items.map((t) => `<label class="check"><input type="checkbox" name="t" value="${esc(t)}"><span dir="auto">${esc(t)}</span></label>`).join("")}</div></details>`).join("")}
    ${field("تحاليل أو صور أخرى", "other", { placeholder: "اكتبها مفصولة بفاصلة" })}
    ${field("ملاحظة سريرية للمخبر / مركز الأشعة", "note", { placeholder: "مثلاً: صائم 12 ساعة، أو المنطقة المطلوبة" })}
  </form>`, {
    ok: "طباعة الطلب", wide: true,
    onOk: (f, w) => {
      const picked = [...document.querySelectorAll(".lab-form input[name=t]:checked")].map((x) => x.value);
      const other = String(f.other || "").split(/[,،]/).map((x) => x.trim()).filter(Boolean);
      if (!picked.length && !other.length) { toast("اختر تحليلاً أو صورة واحدة على الأقل", true); return false; }
      return { picked: [...picked, ...other], note: f.note };
    }
  });
  if (!r || !r.picked) return;
  printDoc(S.pub, "طلب تحاليل وأشعة", `<p><b>المريض:</b> ${esc(p.name)}${ageText(p) ? ` · ${esc(ageText(p))}` : ""} · <b>التاريخ:</b> ${esc(fmtDate(ymd(), false))}</p>
    <p>يرجى إجراء ما يلي:</p>
    <ol class="lab-print">${r.picked.map((t) => `<li dir="auto">☐ ${esc(t)}</li>`).join("")}</ol>
    ${r.note ? `<p><b>ملاحظة:</b> ${esc(r.note)}</p>` : ""}
    <p class="muted small">يرجى إرسال النتائج إلى العيادة، أو رفعها من تطبيق المريض.</p>`, { signer: `د. ${S.profile.name || S.clinic?.doctorName || ""}` });
  await audit("طباعة طلب تحاليل", p.name);
}

// ---------- ملف المريض كاملاً للطباعة أو PDF ----------
export async function printPatientFile(pid) {
  const p = PC.byId[pid];
  toast("جارٍ تجهيز الملف…");
  const [med, vis, rxs, labs, chart] = await Promise.all([
    one(P.subDoc(pid, "medical", "profile")), list(P.sub(pid, "visits")), list(P.sub(pid, "prescriptions")),
    list(P.sub(pid, "labs")).catch(() => []), (S.clinic?.modules || []).includes("dental") ? one(P.subDoc(pid, "dental", "chart")).catch(() => null) : null,
  ]);
  const m = med || {};
  const meds = activeMeds(rxs);
  const vs = vis.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
  const ls = labs.sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 20);
  const { TOOTH } = await import("./mods.js");
  const teeth = Object.entries(chart?.teeth || {}).filter(([, t]) => t.status && t.status !== "sound").sort((a, b) => a[0].localeCompare(b[0]));
  const sec = (t, body) => `<div class="mr-sec"><h4>${t}</h4>${body}</div>`;
  printDoc(S.pub, "الملف الطبي للمريض", `
    <table class="kv"><tr><th>الاسم</th><td><b>${esc(p.name)}</b></td></tr>
      ${ageText(p) ? `<tr><th>العمر</th><td>${esc(ageText(p))}</td></tr>` : ""}
      <tr><th>الجوال</th><td dir="ltr">${esc(p.phone || "")}</td></tr>
      ${p.bloodType ? `<tr><th>الزمرة الدموية</th><td>${esc(p.bloodType)}</td></tr>` : ""}</table>
    ${m.allergies ? `<div class="pf-alert">⚠️ حساسية: ${esc(m.allergies)}</div>` : ""}
    ${sec("التاريخ المرضي", `<table class="kv">
      <tr><th>أمراض مزمنة</th><td>${esc(m.chronic || "لا يوجد")}</td></tr>
      <tr><th>عمليات سابقة</th><td>${esc(m.surgeries || "لا يوجد")}</td></tr>
      <tr><th>أدوية دائمة</th><td>${esc(m.permanentMeds || "لا يوجد")}</td></tr></table>`)}
    ${sec("الأدوية الحالية", meds.length ? `<ul>${meds.map((x) => `<li dir="auto"><b>${esc(x.drug)}</b> ${esc(x.dose || "")}${x.times ? ` · ${esc(x.times)}` : ""}</li>`).join("")}</ul>` : `<p class="muted">لا توجد</p>`)}
    ${sec(`الزيارات${vis.length > 15 ? " (آخر 15)" : ""}`, vs.length ? `<table class="tbl"><thead><tr><th>التاريخ</th><th>الشكوى</th><th>التشخيص</th><th>العلاج</th></tr></thead><tbody>${vs.map((v) => `<tr><td>${esc(v.date)}</td><td>${esc(v.complaint || "")}</td><td>${esc(v.diagnosis || "")}</td><td>${esc(v.treatment || "")}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">لا توجد زيارات</p>`)}
    ${ls.length ? sec("التحاليل", `<table class="tbl"><thead><tr><th>التاريخ</th><th>التحليل</th><th>النتيجة</th></tr></thead><tbody>${ls.map((l) => `<tr><td>${esc(l.date || "")}</td><td dir="auto">${esc(l.test || "")}</td><td dir="auto">${esc(l.value || "")} ${esc(l.unit || "")}</td></tr>`).join("")}</tbody></table>`) : ""}
    ${teeth.length ? sec("حالة الأسنان", `<table class="tbl"><tbody>${teeth.map(([n, t]) => `<tr><td>السن ${esc(n)}</td><td>${esc(TOOTH[t.status]?.[0] || t.status)}</td><td>${esc(t.note || "")}</td></tr>`).join("")}</tbody></table>`) : ""}
    <p class="muted small">ملف صادر عن العيادة بتاريخ ${esc(fmtDate(ymd(), false))}. لا يشمل الملاحظات الخاصة بالطبيب.</p>`, { signer: `د. ${S.profile.name || S.clinic?.doctorName || ""}` });
  await audit("طباعة الملف الطبي", p.name);
}

// الممرض: عرض فقط للملف الطبي، مع إمكانية تسجيل المؤشرات الحيوية
function nurseReadOnly(tab) {
  if (["chronic", "appts", "info", "msgs"].includes(tab)) return;
  const el = tabEl(); if (!el) return;
  el.querySelectorAll("button, .btn").forEach((b) => {
    if (b.closest(".tile, .file-tile, .arch, details > summary") || b.matches(".tile, .file-tile, .t-chip, .pf, [data-file], [data-view]")) return;
    b.remove();
  });
  el.querySelectorAll(".arch .t.tap, .t-chip").forEach((x) => { x.onclick = null; x.style.pointerEvents = "none"; });
  if (!el.querySelector(".ro-note")) el.insertAdjacentHTML("afterbegin", `<p class="muted small ro-note">👁 عرض فقط: التعديل على الملف الطبي للطبيب.</p>`);
}

export function maskName(n) {
  const parts = String(n).trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts.slice(1).map((x) => x[0] + ".").join(" ")}` : parts[0] || "";
}
export function printRx(p, r) {
  const qr = r.verify ? qrSvg(`${location.origin}${location.pathname}#/v/${r.verify}`, 96) : "";
  printDoc(S.pub, "وصفة طبية", `<p><b>المريض:</b> ${esc(p.name)} ${ageText(p) ? `· ${esc(ageText(p))}` : ""} · <b>التاريخ:</b> ${esc(fmtDate(r.date, false))}</p>
    <div class="rx-sign">℞</div>
    <ol class="rx-print">${(r.items || []).map((it) => `<li><b>${esc(it.drug)}</b><div>${esc(it.dose || "")}${it.times ? ` · الأوقات: ${esc(it.times)}` : ""}${it.days ? ` · لمدة ${esc(it.days)} يوم` : ""}</div>${it.note ? `<div class="muted">${esc(it.note)}</div>` : ""}</li>`).join("")}</ol>
    ${r.note ? `<p>${esc(r.note)}</p>` : ""}${S.clinic?.rxFooter ? `<p class="muted">${esc(S.clinic.rxFooter)}</p>` : ""}`, { qr, signer: r.doctorName ? `د. ${r.doctorName}` : "الطبيب" });
}

// ---------- الحمل ----------
async function preg(p) {
  const pregs = (await list(P.sub(p.id, "pregnancies"))).sort((a, b) => (b.lmp || "").localeCompare(a.lmp || ""));
  const g = pregs.find((x) => x.status === "active");
  const past = pregs.filter((x) => x.status !== "active");
  if (!g) {
    tabEl().innerHTML = `<section class="card stack"><h3>لا يوجد حمل نشط</h3><button class="btn primary new">+ بدء متابعة حمل</button></section>
      ${past.length ? `<section class="card"><h3>حمول سابقة</h3>${past.map((x) => `<p>${esc(fmtDate(x.lmp, false))} → ${x.delivery ? `ولادة ${esc(x.delivery.type || "")} ${esc(fmtDate(x.delivery.date, false))}` : esc(x.endNote || "انتهى")}</p>`).join("")}</section>` : ""}`;
    $(".new").onclick = () => newPregModal(p);
    return;
  }
  const c = pregCalc(g);
  const ms = (g.measurements || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  tabEl().innerHTML = `
    <section class="card preg-card ${g.highRisk ? "risk" : ""}">
      <div class="row-between"><h3>🤰 ${esc(gaText(c))} · ${esc(c.tri)}</h3>
        <label class="check"><input type="checkbox" class="hr" ${g.highRisk ? "checked" : ""}><span>عالي الخطورة</span></label></div>
      <div class="preg-bar"><i style="width:${Math.min(100, Math.max(0, c.ga / 280 * 100))}%"></i></div>
      <table class="kv">
        <tr><th>أول يوم من آخر دورة</th><td>${esc(fmtDate(g.lmp, false))}</td></tr>
        <tr><th>الولادة المتوقعة (حسب الدورة)</th><td>${esc(fmtDate(g.eddLmp, false))}</td></tr>
        ${g.eddUs ? `<tr><th>الولادة المتوقعة (مصححة بالإيكو)</th><td><b>${esc(fmtDate(g.eddUs, false))}</b></td></tr>` : ""}
        <tr><th>باقي</th><td>${c.left >= 0 ? `${c.left} يوم` : `تجاوزت الموعد بـ ${-c.left} يوم`}</td></tr>
        ${g.riskNote ? `<tr><th>سبب الخطورة</th><td>${esc(g.riskNote)}</td></tr>` : ""}
      </table>
      <div class="row gap wrap">
        <button class="btn small us">تصحيح بالإيكو</button>
        <button class="btn small sched">جدول زيارات الحمل</button>
        <button class="btn small rep">تقرير حمل</button>
        <button class="btn small end">تسجيل الولادة / إنهاء</button>
      </div>
    </section>
    <section class="card"><div class="row-between"><h3>القياسات</h3><button class="btn primary small add">+ قياس</button></div>
      ${ms.length > 1 ? weightChart(ms) : ""}
      ${ms.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>التاريخ</th><th>العمر</th><th>الوزن</th><th>الضغط</th><th>نبض الجنين</th><th>ارتفاع الرحم</th><th>وزن الجنين</th><th>ملاحظات</th></tr></thead><tbody>
      ${ms.slice().reverse().map((m) => { const cc = pregCalc({ eddUs: g.eddUs, eddLmp: g.eddLmp }, m.date); return `<tr><td>${esc(m.date)}</td><td>${esc(gaText(cc))}</td><td>${esc(m.weight ?? "")}</td><td dir="ltr">${esc(m.bp || "")}</td><td>${esc(m.fhr ?? "")}</td><td>${esc(m.fundal ?? "")}</td><td>${esc(m.efw ?? "")}</td><td>${esc(m.note || "")}</td></tr>`; }).join("")}
      </tbody></table></div>` : empty("لا توجد قياسات")}
    </section>`;
  const gRef = P.subDoc(p.id, "pregnancies", g.id);
  $(".hr").onchange = async (e) => {
    let note = g.riskNote || "";
    if (e.target.checked) {
      const r = await modal("حمل عالي الخطورة", `<form>${field("السبب", "riskNote", { value: note })}</form>`);
      if (!r) { e.target.checked = false; return; }
      note = r.riskNote;
    }
    await updateDoc(gRef, { highRisk: e.target.checked, riskNote: note });
    await syncAlert(p, { ...g, highRisk: e.target.checked });
    refresh();
  };
  $(".add").onclick = async () => {
    await modal("قياس جديد", `<form class="stack">
      ${field("التاريخ", "date", { type: "date", value: ymd(), required: true })}
      <div class="grid2">${field("الوزن (كغ)", "weight", { type: "number", attrs: 'step="0.1" min="0"' })}${field("الضغط", "bp", { placeholder: "120/80", attrs: 'dir="ltr"' })}</div>
      <div class="grid2">${field("نبض الجنين", "fhr", { type: "number", attrs: 'min="0"' })}${field("ارتفاع قاع الرحم (سم)", "fundal", { type: "number", attrs: 'step="0.5" min="0"' })}</div>
      ${field("وزن الجنين التقديري (غ)", "efw", { type: "number", attrs: 'min="0"' })}
      ${field("ملاحظات الإيكو / الزيارة", "note", { type: "textarea" })}</form>`, {
      onOk: async (f) => {
        await updateDoc(gRef, { measurements: [...(g.measurements || []), f] });
        await audit("قياس حمل", p.name);
        setTimeout(refresh, 50);
      }
    });
  };
  $(".us").onclick = async () => {
    await modal("تصحيح موعد الولادة بالإيكو", `<form class="stack">
      ${field("تاريخ الإيكو", "usDate", { type: "date", value: ymd(), required: true })}
      <div class="grid2">${field("عمر الحمل بالإيكو (أسابيع)", "w", { type: "number", required: true, attrs: 'min="4" max="42"' })}${field("وأيام", "d", { type: "number", value: 0, attrs: 'min="0" max="6"' })}</div></form>`, {
      onOk: async (f) => {
        const ga = f.w * 7 + (f.d || 0);
        const eddUs = addDays(f.usDate, 280 - ga);
        await updateDoc(gRef, { eddUs });
        await syncAlert(p, { ...g, eddUs });
        toast(`الموعد المصحح: ${fmtDate(eddUs, false)}`);
        setTimeout(refresh, 50);
      }
    });
  };
  $(".sched").onclick = () => pregSchedule(p, g);
  $(".rep").onclick = () => printPregReport(p, g);
  $(".end").onclick = async () => {
    await modal("تسجيل الولادة أو إنهاء الحمل", `<form class="stack">
      ${select("النتيجة", "outcome", [["delivered", "ولادة"], ["ended", "إجهاض / انتهى"]])}
      ${field("التاريخ", "date", { type: "date", value: ymd(), required: true })}
      ${select("نوع الولادة", "type", [["طبيعية", "طبيعية"], ["قيصرية", "قيصرية"], ["", "—"]])}
      <div class="grid2">${select("جنس المولود", "sex", [["", "—"], ["ذكر", "ذكر"], ["أنثى", "أنثى"], ["توأم", "توأم"]])}${field("وزن المولود (غ)", "weight", { type: "number" })}</div>
      ${field("ملاحظات (النفاس، المضاعفات…)", "notes", { type: "textarea" })}</form>`, {
      onOk: async (f) => {
        const patch = f.outcome === "delivered"
          ? { status: "delivered", delivery: { date: f.date, type: f.type, sex: f.sex, weight: f.weight, notes: f.notes } }
          : { status: "ended", endDate: f.date, endNote: f.notes || "انتهى" };
        await updateDoc(gRef, patch);
        await setDoc(P.colDoc("pregAlerts", p.id), { active: false }, { merge: true });
        if (f.outcome === "delivered") {
          const med = (await one(P.subDoc(p.id, "medical", "profile"))) || {};
          await setDoc(P.subDoc(p.id, "medical", "profile"), {
            para: (Number(med.para) || 0) + 1, cesareans: (Number(med.cesareans) || 0) + (f.type === "قيصرية" ? 1 : 0)
          }, { merge: true });
        }
        await audit("إنهاء متابعة حمل", p.name);
        setTimeout(refresh, 50);
      }
    });
  };
}

async function newPregModal(p) {
  await modal("بدء متابعة حمل", `<form class="stack">
    ${field("أول يوم من آخر دورة", "lmp", { type: "date", required: true })}
    <p class="muted small">يحسب النظام عمر الحمل وموعد الولادة تلقائياً، ويمكن تصحيحه لاحقاً وفق أول إيكو.</p></form>`, {
    ok: "بدء",
    onOk: async (f) => {
      const g = { clinicId: C, patientId: p.id, lmp: f.lmp, eddLmp: addDays(f.lmp, 280), eddUs: null, status: "active", highRisk: false, riskNote: "", measurements: [], createdAt: serverTimestamp() };
      await addDoc(P.sub(p.id, "pregnancies"), g);
      const med = (await one(P.subDoc(p.id, "medical", "profile"))) || {};
      await setDoc(P.subDoc(p.id, "medical", "profile"), { gravida: (Number(med.gravida) || 0) + 1 }, { merge: true });
      await syncAlert(p, g);
      await audit("بدء متابعة حمل", p.name);
      toast(`الولادة المتوقعة: ${fmtDate(g.eddLmp, false)}`);
      setTimeout(refresh, 50);
    }
  });
}
async function syncAlert(p, g) {
  await setDoc(P.colDoc("pregAlerts", p.id), {
    patientId: p.id, patientName: p.name, edd: g.eddUs || g.eddLmp, highRisk: !!g.highRisk, active: g.status === "active"
  });
}

function weightChart(ms) {
  const pts = ms.filter((m) => m.weight);
  if (pts.length < 2) return "";
  const W = 320, H = 120, pad = 24;
  const ws = pts.map((m) => m.weight), min = Math.min(...ws) - 1, max = Math.max(...ws) + 1;
  const t0 = parseYmd(pts[0].date), t1 = parseYmd(pts.at(-1).date), span = Math.max(1, t1 - t0);
  const X = (d) => pad + (parseYmd(d) - t0) / span * (W - 2 * pad);
  const Y = (w) => H - pad - (w - min) / (max - min) * (H - 2 * pad);
  const path = pts.map((m, i) => `${i ? "L" : "M"}${X(m.date).toFixed(1)} ${Y(m.weight).toFixed(1)}`).join(" ");
  return `<figure class="chart"><figcaption class="muted small">تطور الوزن (كغ)</figcaption>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="تطور الوزن من ${ws[0]} إلى ${ws.at(-1)} كغ" dir="ltr">
      <line x1="${pad}" x2="${W - pad}" y1="${H - pad}" y2="${H - pad}" stroke="var(--line)"/>
      <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2"/>
      ${pts.map((m) => `<circle cx="${X(m.date).toFixed(1)}" cy="${Y(m.weight).toFixed(1)}" r="3.5" fill="var(--accent)"/>`).join("")}
      <text x="${pad}" y="${Y(ws[0]) - 8}" font-size="11" fill="var(--muted)">${ws[0]}</text>
      <text x="${W - pad}" y="${Y(ws.at(-1)) - 8}" font-size="11" text-anchor="end" fill="var(--ink)">${ws.at(-1)}</text>
    </svg></figure>`;
}

// جدول زيارات الحمل: كل 4 أسابيع لحد 28، كل أسبوعين لحد 36، وبعدها كل أسبوع
async function pregSchedule(p, g) {
  const edd = g.eddUs || g.eddLmp;
  const out = [];
  let d = ymd();
  const gaAt = (x) => 280 - daysBetween(x, edd);
  while (d <= edd && out.length < 30) {
    const w = Math.floor(gaAt(d) / 7);
    const step = w < 28 ? 28 : w < 36 ? 14 : 7;
    d = addDays(d, step);
    if (d <= edd) {
      let dd = d, tries = 0;
      while (!slotsFor(dd).length && tries < 6) { dd = addDays(dd, 1); tries++; }
      out.push({ date: dd, w: Math.floor(gaAt(dd) / 7) });
    }
  }
  if (!out.length) return toast("موعد الولادة قريب، يرجى الحجز يدوياً");
  await modal("جدول زيارات الحمل", `<form class="stack">
    <p class="muted small">اختر الزيارات التي تريد حجزها. تُحجز كل زيارة في أول وقت متاح من اليوم.</p>
    ${out.map((x, i) => `<label class="check"><input type="checkbox" name="v${i}" checked><span>${esc(fmtDate(x.date))} · أسبوع ${x.w}</span></label>`).join("")}
  </form>`, {
    ok: "حجز المختار", wide: true,
    onOk: async (f) => {
      let n = 0, fail = 0;
      for (let i = 0; i < out.length; i++) {
        if (!f["v" + i]) continue;
        const date = out[i].date;
        const taken = new Set((await list(query(P.col("appointments"), where("date", "==", date)))).filter((a) => a.status !== "cancelled").map((a) => a.time));
        const t = slotsFor(date).find((s) => !taken.has(s));
        if (!t) { fail++; continue; }
        try { await bookAppointment({ pid: p.id, date, time: t, type: "متابعة حمل" }); n++; } catch { fail++; }
      }
      toast(`حُجزت ${n} زيارة${fail ? ` · ${fail} لم يتوفر لها وقت` : ""}`);
    }
  });
}

function printPregReport(p, g) {
  const c = pregCalc(g);
  const ms = (g.measurements || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  printDoc(S.pub, "تقرير متابعة حمل", `<table class="kv"><tr><th>المريض</th><td>${esc(p.name)} ${p.age ? `· ${esc(p.age)} سنة` : ""}</td></tr>
    <tr><th>أول يوم من آخر دورة</th><td>${esc(g.lmp)}</td></tr><tr><th>عمر الحمل اليوم</th><td>${esc(gaText(c))}</td></tr>
    <tr><th>الولادة المتوقعة</th><td>${esc(fmtDate(c.edd, false))}</td></tr>${g.highRisk ? `<tr><th>ملاحظة</th><td>حمل عالي الخطورة: ${esc(g.riskNote || "")}</td></tr>` : ""}</table>
    ${ms.length ? `<h4>القياسات</h4><table class="tbl"><thead><tr><th>التاريخ</th><th>الوزن</th><th>الضغط</th><th>نبض الجنين</th><th>ملاحظات</th></tr></thead><tbody>${ms.map((m) => `<tr><td>${esc(m.date)}</td><td>${esc(m.weight ?? "")}</td><td dir="ltr">${esc(m.bp || "")}</td><td>${esc(m.fhr ?? "")}</td><td>${esc(m.note || "")}</td></tr>`).join("")}</tbody></table>` : ""}`);
}

// ---------- التاريخ النسائي والعقم ----------
async function gyn(p) {
  const [med, fert] = await Promise.all([one(P.subDoc(p.id, "medical", "profile")), one(P.subDoc(p.id, "fertility", "main"))]);
  const m = med || {}, fr = fert || { periods: [], injections: [], protocol: "" };
  const periods = (fr.periods || []).slice().sort();
  const gaps = periods.slice(1).map((d, i) => daysBetween(periods[i], d)).filter((x) => x > 15 && x < 60);
  const avg = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 28;
  const lastP = periods.at(-1);
  const nextP = lastP ? addDays(lastP, avg) : null;
  const ov = nextP ? addDays(nextP, -14) : null;
  const papDue = m.lastPap && m.papMonths ? (() => { const d = parseYmd(m.lastPap); d.setMonth(d.getMonth() + m.papMonths); return ymd(d); })() : null;
  tabEl().innerHTML = `
    <section class="card"><div class="row-between"><h3>التاريخ النسائي</h3><button class="btn small ed">تعديل</button></div>
      <table class="kv">
        <tr><th>عدد الحمول</th><td>${esc(m.gravida ?? "—")}</td></tr><tr><th>الولادات</th><td>${esc(m.para ?? "—")} (قيصرية: ${esc(m.cesareans ?? "—")})</td></tr>
        <tr><th>الإجهاضات</th><td>${esc(m.abortions ?? "—")}</td></tr><tr><th>وسيلة منع الحمل</th><td>${esc(m.contraception || "—")}</td></tr>
        <tr><th>آخر مسحة عنق رحم</th><td>${esc(m.lastPap ? fmtDate(m.lastPap, false) : "—")}${papDue ? ` · المسحة القادمة: <b class="${papDue <= ymd() ? "danger-t" : ""}">${esc(fmtDate(papDue, false))}</b>` : ""}</td></tr>
      </table></section>
    <section class="card"><div class="row-between"><h3>تتبع الدورة</h3><button class="btn small addp">+ بداية دورة</button></div>
      ${periods.length ? `<p>متوسط طول الدورة: <b>${avg} يوم</b>${gaps.length ? "" : " (افتراضي)"}</p>
        <p>الدورة القادمة المتوقعة: <b>${esc(fmtDate(nextP, false))}</b></p>
        <p>الإباضة المتوقعة: <b>${esc(fmtDate(addDays(ov, -1), false))} – ${esc(fmtDate(addDays(ov, 1), false))}</b></p>
        <details><summary class="muted">السجل (${periods.length})</summary><p>${periods.slice().reverse().map((d) => esc(d)).join(" · ")}</p></details>` : empty("لا توجد تواريخ مسجلة")}
    </section>
    <section class="card stack"><h3>بروتوكول التنشيط</h3>
      <textarea class="proto" rows="3" aria-label="البروتوكول" placeholder="الأدوية، الجرعات، مواعيد المراقبة…">${esc(fr.protocol || "")}</textarea>
      <button class="btn small savep">حفظ البروتوكول</button>
      <div class="row-between"><h4>مواعيد الإبر</h4><button class="btn small addi">+ إبرة</button></div>
      ${(fr.injections || []).length ? `<ul class="plain">${fr.injections.map((x, i) => `<li class="row-between"><label class="check"><input type="checkbox" data-i="${i}" class="inj" ${x.done ? "checked" : ""}><span>${esc(x.date)} ${esc(x.time || "")} · <b>${esc(x.drug)}</b> ${esc(x.dose || "")}</span></label></li>`).join("")}</ul>` : empty("لا توجد إبر مجدولة")}
    </section>`;
  const fRef = P.subDoc(p.id, "fertility", "main");
  const saveF = async (patch) => { await setDoc(fRef, { ...fr, ...patch, updatedAt: serverTimestamp() }); refresh(); };
  $(".ed").onclick = () => medicalModal(p, m);
  $(".addp").onclick = async () => {
    const r = await modal("بداية دورة", `<form>${field("التاريخ", "date", { type: "date", value: ymd(), required: true })}</form>`);
    if (r) saveF({ periods: [...new Set([...(fr.periods || []), r.date])] });
  };
  $(".savep").onclick = () => saveF({ protocol: $(".proto").value });
  $(".addi").onclick = async () => {
    const r = await modal("إبرة", `<form class="stack">${field("التاريخ", "date", { type: "date", value: ymd(), required: true })}${field("الوقت", "time", { type: "time" })}${field("الدواء", "drug", { required: true })}${field("الجرعة", "dose")}</form>`);
    if (r) saveF({ injections: [...(fr.injections || []), { ...r, done: false }].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)) });
  };
  $$(".inj").forEach((c) => c.onchange = () => { const inj = fr.injections.slice(); inj[c.dataset.i] = { ...inj[c.dataset.i], done: c.checked }; saveF({ injections: inj }); });
}

// ---------- التجميل النسائي ----------
async function cosm(p) {
  const procs = (await list(P.sub(p.id, "procedures"))).sort((a, b) => b.date.localeCompare(a.date));
  tabEl().innerHTML = `<div class="row-between"><h3>الإجراءات التجميلية</h3><button class="btn primary small add">+ إجراء</button></div>
    ${procs.length ? procs.map((x) => `<section class="card">
      <div class="row-between"><h4>${esc(x.name)}</h4><span class="muted small">${esc(fmtDate(x.date, false))}</span></div>
      ${x.price ? `<p>السعر: ${esc(money(x.price, cur()))}</p>` : ""}
      <p>الجلسات: <b>${x.sessionsDone || 0} / ${x.sessionsTotal || 1}</b> <button class="btn small ses" data-id="${x.id}" ${(x.sessionsDone || 0) >= (x.sessionsTotal || 1) ? "disabled" : ""}>+ تسجيل جلسة منفذة</button></p>
      ${x.details ? `<p><span class="muted">التفاصيل:</span> ${esc(x.details)}</p>` : ""}
      ${x.aftercare ? `<p><span class="muted">تعليمات ما بعد الإجراء (تظهر للمريض):</span> ${esc(x.aftercare)}</p>` : ""}
      <p>الموافقة: ${x.consentSignedAt ? `<span class="chip ok">موقّعة ${esc(x.consentName || "")} · ${esc(tsDate(x.consentSignedAt))}</span>` : `<span class="chip warn">بانتظار توقيع المريض من التطبيق</span> <button class="btn small sign" data-id="${x.id}">توقيع حضوري</button>`}</p>
      <div class="row gap wrap"><button class="btn small ph" data-id="${x.id}">صور ما قبل الإجراء وما بعده</button><button class="btn small fu" data-id="${x.id}">موعد متابعة</button></div>
    </section>`).join("") : empty("لا توجد إجراءات")}`;
  $(".add").onclick = async () => {
    const svcs = (S.clinic?.services || []).filter((s) => s.kind === "cosmetic");
    await modal("إجراء تجميلي", `<form class="stack">
      ${svcs.length ? select("من الخدمات", "svc", [["", "—"], ...svcs.map((s) => [s.name, s.name])]) : ""}
      ${field("اسم الإجراء", "name", { required: true })}
      ${field("التاريخ", "date", { type: "date", value: ymd(), required: true })}
      <div class="grid2">${field("عدد الجلسات", "sessionsTotal", { type: "number", value: 1, attrs: 'min="1"' })}${field("السعر", "price", { type: "number", attrs: 'min="0"' })}</div>
      ${field("التفاصيل", "details", { type: "textarea" })}
      ${field("تعليمات ما بعد الإجراء", "aftercare", { type: "textarea", hint: "تُرسل تلقائياً إلى تطبيق المريض" })}
      ${field("نص الموافقة", "consentText", { type: "textarea", value: S.clinic?.consentText || "" })}</form>`, {
      wide: true,
      onOpen: (w) => {
        const f = w.querySelector("form");
        f.svc?.addEventListener("change", () => { const s = svcs.find((x) => x.name === f.svc.value); if (s) { f.name.value = s.name; if (s.price) f.price.value = s.price; } });
      },
      onOk: async (f) => {
        const { svc, ...rest } = f;
        await addDoc(P.sub(p.id, "procedures"), { ...rest, sessionsDone: 0, consentSignedAt: null, consentName: null, createdAt: serverTimestamp() });
        await audit("إضافة إجراء تجميلي", p.name);
        setTimeout(refresh, 50);
      }
    });
  };
  $$(".ses").forEach((b) => b.onclick = async () => {
    const x = procs.find((y) => y.id === b.dataset.id);
    await updateDoc(P.subDoc(p.id, "procedures", x.id), { sessionsDone: (x.sessionsDone || 0) + 1 });
    refresh();
  });
  $$(".sign").forEach((b) => b.onclick = async () => {
    const x = procs.find((y) => y.id === b.dataset.id);
    if (!(await confirmBox("توقيع حضوري", `اطّلع المريض ووافق حضورياً على: ${x.consentText || ""}`, "تأكيد"))) return;
    await updateDoc(P.subDoc(p.id, "procedures", x.id), { consentSignedAt: serverTimestamp(), consentName: "حضورياً" });
    await audit("توقيع موافقة حضوري", p.name);
    refresh();
  });
  $$(".fu").forEach((b) => b.onclick = () => bookModal({ pid: p.id, type: "متابعة تجميلية", note: procs.find((y) => y.id === b.dataset.id).name }));
  $$(".ph").forEach((b) => b.onclick = () => photosModal(p, procs.find((y) => y.id === b.dataset.id)));
}

async function photosModal(p, x) {
  const load = async () => (await list(query(P.sub(p.id, "private"), where("procedureId", "==", x.id))));
  const draw = async (w) => {
    const ph = await load();
    const grp = (st) => ph.filter((y) => y.stage === st && !y.broken).map((y) => `<img src="${y.thumb || y.data}" data-id="${y.id}" alt="صورة ${st === "before" ? "قبل" : "بعد"} ${esc(y.date)}" class="thumb">`).join("") || `<span class="muted small">لا توجد صور</span>`;
    w.querySelector(".ph-body").innerHTML = `<h4>قبل الإجراء</h4><div class="thumbs">${grp("before")}</div><h4>بعد الإجراء</h4><div class="thumbs">${grp("after")}</div>`;
    w.querySelectorAll(".thumb").forEach((im) => im.onclick = () => { const y = ph.find((z) => z.id === im.dataset.id); showFile(`${x.name} · ${y.stage === "before" ? "قبل" : "بعد"} · ${y.date}`, "", () => fileData(P.sub(p.id, "private"), y), true); });
  };
  await modal(`صور ${x.name}`, `<p class="muted small">الصور سرية ولا تظهر إلا للأطباء.</p><div class="row gap"><button class="btn small up" data-s="before">+ صورة قبل الإجراء</button><button class="btn small up" data-s="after">+ صورة بعد الإجراء</button></div><div class="ph-body"></div>`, {
    ok: null, cancel: "إغلاق", wide: true,
    onOpen: (w) => {
      draw(w);
      w.querySelectorAll(".up").forEach((b) => b.onclick = async () => {
        const f = await pickFile("image/*"); if (!f) return;
        try {
          const data = await compressImage(f, 1200, 0.7);
          await addFileDoc(P.sub(p.id, "private"), { type: "photo", procedureId: x.id, stage: b.dataset.s, date: ymd(), mime: "image/jpeg", thumb: await makeThumb(data) }, data);
          toast("حُفظت الصورة"); draw(w);
        } catch (e) { toast(errMsg(e), true); }
      });
    }
  });
}

// ---------- التحاليل والملفات ----------
async function files(p) {
  const [labs, fls] = await Promise.all([list(P.sub(p.id, "labs")), list(P.sub(p.id, "files"))]);
  const byTest = {};
  labs.forEach((l) => (byTest[l.test] = byTest[l.test] || []).push(l));
  Object.values(byTest).forEach((a) => a.sort((x, y) => y.date.localeCompare(x.date)));
  fls.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  for (let i = fls.length - 1; i >= 0; i--) if (fls[i].broken) fls.splice(i, 1);
  const unseen = await list(query(P.col("inbox"), where("patientId", "==", p.id), where("seen", "==", false)));
  for (const u of unseen) await updateDoc(P.colDoc("inbox", u.id), { seen: true });
  const KIND = { echo: "إيكو", lab: "تحليل", other: "ملف" };
  tabEl().innerHTML = `
    <section class="card"><div class="row-between"><h3>نتائج التحاليل</h3><button class="btn primary small addl">+ نتيجة</button></div>
      ${Object.keys(byTest).length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>التحليل</th><th>آخر قيمة</th><th>السابقة</th><th>التغير</th></tr></thead><tbody>
      ${Object.entries(byTest).map(([t, a]) => { const [n, o] = a; const dv = o && !isNaN(n.value) && !isNaN(o.value) ? (Number(n.value) - Number(o.value)).toFixed(1) : ""; return `<tr><td><b>${esc(t)}</b></td><td>${esc(n.value)} ${esc(n.unit || "")}<br><small class="muted">${esc(n.date)}</small></td><td>${o ? `${esc(o.value)}<br><small class="muted">${esc(o.date)}</small>` : "—"}</td><td dir="ltr">${dv ? (dv > 0 ? "▲ " : dv < 0 ? "▼ " : "") + esc(dv) : ""}</td></tr>`; }).join("")}
      </tbody></table></div>` : empty("لا توجد نتائج")}
    </section>
    <section class="card"><div class="row-between"><h3>الإيكو والملفات</h3><button class="btn primary small addf">+ رفع</button></div>
      ${fls.length ? `<div class="file-grid">${fls.map((f) => `<button class="file-tile" data-id="${f.id}">
        ${tileImg(f)}
        <span>${esc(KIND[f.kind] || "ملف")} · ${esc(f.date || "")}${f.uploadedBy === "patient" ? " · من المريض" : ""}</span></button>`).join("")}</div>` : empty("لا توجد ملفات")}
    </section>`;
  $(".addl").onclick = async () => {
    const tests = [...new Set([...Object.keys(byTest), "Hb", "TSH", "سكر الصيام", "Ferritin", "Vit D", "Beta hCG", "AMH", "FSH", "LH", "Prolactin", "Estradiol", "Progesterone"])];
    await modal("نتيجة تحليل", `<form class="stack">
      <datalist id="tests">${tests.map((t) => `<option value="${esc(t)}">`).join("")}</datalist>
      ${field("التحليل", "test", { required: true, attrs: 'list="tests"' })}
      <div class="grid2">${field("القيمة", "value", { required: true, attrs: 'dir="ltr"' })}${field("الوحدة", "unit", { attrs: 'dir="ltr"' })}</div>
      ${field("التاريخ", "date", { type: "date", value: ymd(), required: true })}${field("ملاحظة", "note")}</form>`, {
      onOk: async (f) => { await addDoc(P.sub(p.id, "labs"), { ...f, createdAt: serverTimestamp() }); await audit("إضافة تحليل", p.name); setTimeout(refresh, 50); }
    });
  };
  $(".addf").onclick = async () => {
    const r = await modal("رفع ملف", `<form class="stack">${select("النوع", "kind", [["echo", "إيكو"], ["lab", "تحليل"], ["other", "ملف آخر"]])}${field("التاريخ", "date", { type: "date", value: ymd(), required: true })}${field("ملاحظة", "note")}</form>`, { ok: "اختيار الملف" });
    if (!r) return;
    const f = await pickFile("image/*,application/pdf"); if (!f) return;
    try {
      const data = await compressImage(f);
      await addFileDoc(P.sub(p.id, "files"), { ...r, uploadedBy: "doctor", mime: data.slice(5, data.indexOf(";")), thumb: await makeThumb(data) }, data);
      await audit("رفع ملف", p.name);
      toast("تم رفع الملف"); refresh();
    } catch (e) { toast(errMsg(e), true); }
  };
  $$(".file-tile").forEach((b) => b.onclick = () => {
    const f = fls.find((x) => x.id === b.dataset.id);
    showFile(`${KIND[f.kind] || "ملف"} · ${f.date}`, f.note, () => fileData(P.sub(p.id, "files"), f), isImg(f), `file-${f.date}.pdf`);
  });
}

// ---------- ملاحظات خاصة ----------
async function privateTab(p) {
  const notes = (await list(query(P.sub(p.id, "private"), where("type", "==", "note")))).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  tabEl().innerHTML = `<div class="row-between"><h3>ملاحظات خاصة</h3><button class="btn primary small add">+ ملاحظة</button></div>
    <p class="muted small">🔒 لا تظهر للمريضة ولا للسكرتارية.</p>
    ${notes.length ? notes.map((n) => `<section class="card"><div class="muted small">${esc(fmtDate(n.date, false))}${n.visitId ? " · من زيارة" : ""}</div><p class="pre">${esc(n.text)}</p></section>`).join("") : empty("لا توجد ملاحظات")}`;
  $(".add").onclick = async () => {
    await modal("ملاحظة خاصة", `<form>${field("الملاحظة", "text", { type: "textarea", required: true })}</form>`, {
      onOk: async (f) => { await addDoc(P.sub(p.id, "private"), { type: "note", date: ymd(), text: f.text, createdAt: serverTimestamp() }); setTimeout(refresh, 50); }
    });
  };
}

// ---------- مواعيد المريضة ----------
async function appts(p) {
  const arr = (await list(query(P.col("appointments"), where("patientId", "==", p.id)))).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const reqs = await list(query(P.col("requests"), where("patientId", "==", p.id), where("status", "==", "new")));
  tabEl().innerHTML = `
    ${reqs.length ? `<div class="alert">لديه ${reqs.length} طلب موعد جديد. <a href="#/requests">افتح الطلبات</a></div>` : ""}
    <div class="row-between"><h3>المواعيد</h3><button class="btn primary small add">+ موعد</button></div>
    ${arr.length ? `<ul class="appt-list">${arr.map((a) => `<li><button class="appt st-${a.status}" data-a="${a.id}"><span class="t">${esc(a.date)}<br>${esc(fmtTime(a.time))}</span><span class="n">${esc(a.type || "موعد")}${a.rating ? `<small>${"★".repeat(a.rating)}</small>` : ""}</span><span class="chip">${esc(STATUS[a.status])}</span></button></li>`).join("")}</ul>` : empty("لا توجد مواعيد")}`;
  $(".add").onclick = () => bookModal({ pid: p.id });
  const { apptActions } = await import("./staff.js");
  $$("[data-a]").forEach((b) => b.onclick = () => apptActions(arr.find((a) => a.id === b.dataset.a)));
}

// ---------- مالية المريضة ----------
async function moneyTab(p) {
  const pays = (await list(query(P.col("payments"), where("patientId", "==", p.id)))).sort((a, b) => b.date.localeCompare(a.date));
  const t = pays.reduce((s, x) => s + (x.total || 0), 0), pd = pays.reduce((s, x) => s + (x.paid || 0), 0);
  tabEl().innerHTML = `<div class="stats"><div class="stat"><b>${esc(money(t, cur()))}</b><span>المطلوب</span></div><div class="stat"><b>${esc(money(pd, cur()))}</b><span>المدفوع</span></div><div class="stat ${t - pd > 0 ? "warn" : ""}"><b>${esc(money(t - pd, cur()))}</b><span>المتبقي</span></div></div>
    <div class="row-between"><h3>الدفعات</h3><div class="row gap">${t - pd > 0 ? `<button class="btn small settle">تسديد المتبقي</button>` : ""}<button class="btn primary small add">+ دفعة</button></div></div>
    ${pays.length ? `<table class="tbl"><thead><tr><th>التاريخ</th><th>الخدمة</th><th>المطلوب</th><th>المدفوع</th><th></th></tr></thead><tbody>${pays.map((x) => `<tr><td>${esc(x.date)}</td><td>${esc(x.service || "")}</td><td>${esc(money(x.total, cur()))}</td><td>${esc(money(x.paid, cur()))}</td><td><button class="icon-btn rc" data-id="${x.id}" aria-label="إيصال">🧾</button></td></tr>`).join("")}</tbody></table>` : empty("لا توجد دفعات")}`;
  $(".add").onclick = () => paymentModal(p.id);
  $(".settle")?.addEventListener("click", async () => {
    const r = await modal("تسديد", `<form class="stack">${field("المبلغ", "paid", { type: "number", value: t - pd, required: true, attrs: 'min="1"' })}${select("طريقة الدفع", "method", Object.entries(CASH_METHODS), "cash")}</form>`);
    if (!r) return;
    const rec = { patientId: p.id, patientName: p.name, service: "تسديد دين", total: 0, paid: r.paid, date: ymd(), method: r.method || "cash", note: "", by: S.user.uid, byName: S.profile.name || "", createdAt: serverTimestamp() };
    const ref = await addDoc(P.col("payments"), rec);
    await audit("تسديد دين", `${p.name} ${r.paid}`);
    refresh();
    if (await confirmBox("إيصال", "هل تريد طباعة إيصال؟", "طباعة")) printReceipt({ id: ref.id, ...rec });
  });
  $$(".rc").forEach((b) => b.onclick = () => printReceipt(pays.find((x) => x.id === b.dataset.id)));
}

// ---------- الرسائل ----------
async function msgs(p) {
  tabEl().innerHTML = `<section class="card chat"><div class="msgs" aria-live="polite"></div>
    <form class="send row gap"><input name="t" placeholder="اكتب رداً…" required aria-label="الرسالة" class="grow"><button class="btn primary">إرسال</button></form>
    ${p.lastMsgFrom === "patient" ? `<button class="link-btn seen">تعليم كمقروءة دون رد</button>` : ""}</section>`;
  const box = $(".msgs");
  const un = onSnapshot(P.sub(p.id, "messages"), (s) => {
    const arr = s.docs.map((d) => d.data()).sort((a, b) => (a.at?.seconds || 0) - (b.at?.seconds || 0));
    if (!document.body.contains(box)) return un();
    box.innerHTML = arr.length ? arr.map((m) => `<div class="bubble ${m.from === "clinic" ? "me" : ""}"><div>${esc(m.text)}</div><small>${esc(m.byName || "")} ${esc(tsDate(m.at))}</small></div>`).join("") : empty("لا توجد رسائل");
    box.scrollTop = box.scrollHeight;
  });
  S.unsub.push(un);
  $(".send").onsubmit = async (e) => {
    e.preventDefault();
    const t = e.target.t.value.trim(); if (!t) return;
    e.target.t.value = "";
    await addDoc(P.sub(p.id, "messages"), { from: "clinic", text: t, at: serverTimestamp(), byName: S.profile.name || "العيادة" });
    await updateDoc(P.patient(p.id), { lastMsgAt: serverTimestamp(), lastMsgFrom: "clinic" });
  };
  $(".seen")?.addEventListener("click", async () => { await updateDoc(P.patient(p.id), { lastMsgFrom: "read" }); refresh(); });
}

// ---------- الحساب ----------
async function account(p) {
  const siblings = PC.list.filter((x) => x.phone === p.phone && x.id !== p.id);
  tabEl().innerHTML = `<section class="card stack"><h3>حساب التطبيق</h3>
    <p>رقم الدخول: <b dir="ltr">${esc(p.phone)}</b></p>
    ${siblings.length ? `<p class="muted small">نفس الرقم مسجل لـ: ${siblings.map((s) => esc(s.name)).join("، ")}. كلمة المرور مشتركة بينهم.</p>` : ""}
    <button class="btn rp">كلمة مرور جديدة للمريض</button>
    <p class="muted small">عند نسيان كلمة المرور: تُمنح كلمة مرور مؤقتة جديدة وتتوقف القديمة.</p></section>
    <section class="card stack"><h3>البيانات</h3><button class="btn ed">تعديل البيانات الأساسية</button>
      ${isDoctor() ? `<button class="btn pf">طباعة / حفظ الملف كامل PDF</button>` : ""}</section>
    <section class="card stack"><h3>الأرشفة</h3>
      <p class="muted small">تُخفي الأرشفة المريض من القوائم دون حذف أي بيانات، ويمكن إرجاعها بضغطة واحدة.</p>
      <button class="btn ${p.archived ? "" : "danger"} ar">${p.archived ? "إرجاع من الأرشيف" : "أرشفة المريض"}</button></section>`;
  $(".rp").onclick = async () => {
    if (!(await confirmBox("كلمة مرور جديدة", "كلمة المرور الحالية ستتوقف. متابعة؟", "متابعة"))) return;
    try { const temp = await resetPatientPassword(p.phone); showCredentials(p.phone, temp, p.name); } catch (e) { toast(errMsg(e), true); }
  };
  $(".ed").onclick = () => editBasic(p);
  $(".pf")?.addEventListener("click", () => printFile(p));
  $(".ar").onclick = async () => {
    await updateDoc(P.patient(p.id), { archived: !p.archived });
    await audit(p.archived ? "إرجاع مريض من الأرشيف" : "أرشفة مريض", p.name);
    toast("تم"); setTimeout(refresh, 100);
  };
}

// ---------- المستندات المطبوعة ----------
async function certModal(p, kind) {
  const T = { leave: "إجازة مرضية", referral: "إحالة طبية", report: "تقرير طبي" };
  const r = await modal(T[kind], `<form class="stack">
    ${kind === "leave" ? `<div class="grid2">${field("من تاريخ", "from", { type: "date", value: ymd(), required: true })}${field("عدد الأيام", "days", { type: "number", value: 3, required: true, attrs: 'min="1"' })}</div>` : ""}
    ${kind === "referral" ? field("إلى (المشفى أو الطبيب)", "to", { required: true }) : ""}
    ${field(kind === "leave" ? "التشخيص (اختياري)" : "التشخيص", "diag")}
    ${field(kind === "referral" ? "سبب الإحالة" : "النص", "text", { type: "textarea", required: kind !== "leave" })}</form>`, { ok: "طباعة" });
  if (!r) return;
  const f_ = p.sex === "f" || (p.sex !== "m" && women());
  const who = `${f_ ? "السيدة" : "السيد"} <b>${esc(p.name)}</b>${ageText(p) ? ` ${f_ ? "البالغة" : "البالغ"} من العمر ${esc(ageText(p))}` : ""}`;
  let body = "";
  if (kind === "leave") body = `<p class="lead">تشهد العيادة بأن ${who} ${f_ ? "راجعت" : "راجع"} العيادة بتاريخ ${esc(fmtDate(r.from, false))}${r.diag ? `، وتم تشخيص: ${esc(r.diag)}` : ""}، ${f_ ? "وتحتاج" : "ويحتاج"} إلى راحة لمدة <b>${esc(r.days)}</b> أيام اعتباراً من ${esc(fmtDate(r.from, false))} ولغاية ${esc(fmtDate(addDays(r.from, r.days - 1), false))}.</p>${r.text ? `<p>${esc(r.text)}</p>` : ""}<p>أُعطيت هذه الشهادة بناءً على ${f_ ? "طلبها" : "طلبه"}.</p>`;
  if (kind === "referral") body = `<p>الزميل/ة الكريم/ة في <b>${esc(r.to)}</b> المحترم/ة،</p><p class="lead">نحيل إليكم ${who}${r.diag ? ` بتشخيص: <b>${esc(r.diag)}</b>` : ""}.</p><p class="pre">${esc(r.text)}</p><p>مع الشكر والتقدير.</p>`;
  if (kind === "report") body = `<p class="lead">${who}${r.diag ? `<br>التشخيص: <b>${esc(r.diag)}</b>` : ""}</p><p class="pre">${esc(r.text)}</p>`;
  await audit(`طباعة ${T[kind]}`, p.name);
  printDoc(S.pub, T[kind], body);
}

async function printFile(p) {
  const [med, vs, rxs, pregs, labs, procs] = await Promise.all([
    one(P.subDoc(p.id, "medical", "profile")), list(P.sub(p.id, "visits")), list(P.sub(p.id, "prescriptions")),
    list(P.sub(p.id, "pregnancies")), list(P.sub(p.id, "labs")), list(P.sub(p.id, "procedures"))
  ]);
  const m = med || {};
  vs.sort((a, b) => b.date.localeCompare(a.date)); rxs.sort((a, b) => b.date.localeCompare(a.date)); labs.sort((a, b) => b.date.localeCompare(a.date));
  await audit("طباعة ملف مريض", p.name);
  printDoc(S.pub, "الملف الطبي", `
    <table class="kv"><tr><th>الاسم</th><td>${esc(p.name)}</td></tr><tr><th>العمر</th><td>${esc(p.age ?? "")}</td></tr><tr><th>الجوال</th><td dir="ltr">${esc(p.phone)}</td></tr><tr><th>فصيلة الدم</th><td>${esc(p.bloodType || "")}</td></tr>
    <tr><th>أمراض مزمنة</th><td>${esc(m.chronic || "—")}</td></tr><tr><th>حساسية</th><td>${esc(m.allergies || "—")}</td></tr><tr><th>عمليات</th><td>${esc(m.surgeries || "—")}</td></tr>
    <tr><th>G / P / A / CS</th><td>${esc(m.gravida ?? "-")} / ${esc(m.para ?? "-")} / ${esc(m.abortions ?? "-")} / ${esc(m.cesareans ?? "-")}</td></tr></table>
    ${pregs.length ? `<h4>الحمول</h4>${pregs.map((g) => `<p>${esc(g.lmp)} → ${g.status === "active" ? `حامل حالياً · الولادة المتوقعة ${esc(g.eddUs || g.eddLmp)}` : g.delivery ? `ولادة ${esc(g.delivery.type || "")} ${esc(g.delivery.date)}` : esc(g.endNote || "")}</p>`).join("")}` : ""}
    ${vs.length ? `<h4>الزيارات</h4><table class="tbl"><thead><tr><th>التاريخ</th><th>التشخيص</th><th>العلاج</th></tr></thead><tbody>${vs.map((v) => `<tr><td>${esc(v.date)}</td><td>${esc(v.diagnosis || v.complaint || "")}</td><td>${esc(v.treatment || "")}</td></tr>`).join("")}</tbody></table>` : ""}
    ${rxs.length ? `<h4>الوصفات</h4>${rxs.map((r) => `<p><b>${esc(r.date)}:</b> ${(r.items || []).map((i) => esc(`${i.drug} ${i.dose || ""}`)).join("، ")}</p>`).join("")}` : ""}
    ${labs.length ? `<h4>التحاليل</h4><table class="tbl"><thead><tr><th>التاريخ</th><th>التحليل</th><th>القيمة</th></tr></thead><tbody>${labs.map((l) => `<tr><td>${esc(l.date)}</td><td>${esc(l.test)}</td><td dir="ltr">${esc(l.value)} ${esc(l.unit || "")}</td></tr>`).join("")}</tbody></table>` : ""}
    ${procs.length ? `<h4>الإجراءات التجميلية</h4>${procs.map((x) => `<p>${esc(x.date)}: ${esc(x.name)} (${x.sessionsDone || 0}/${x.sessionsTotal || 1})</p>`).join("")}` : ""}`);
}
