// صفحات المسؤول: الإعدادات، الفريق، الاشتراك، والمخزون
import { CITIES,
  P, C, list, one, setDoc, updateDoc, addDoc, query, where, serverTimestamp, arrayUnion,
  createStaff, resetStaffPassword, normPhone, randId, publicCopy, clinicState, tsMs,
  SPECIALTIES, MODULES, DEFAULT_PLANS, DEFAULT_VACCINES, audit
} from "./fb.js";
import { APP_URL,
  $, $$, esc, ymd, addDays, fmtDate, tsDate, money, toast, errMsg, modal, confirmBox, info,
  field, select, logoHtml, waLink, empty, compressImage, pickFile, DAYS, qrSvg
} from "./ui.js";
import { S, PLATFORM } from "./app.js";
import { PAY_METHODS } from "./owner.js";
import { multiSpec, specMods, render, doctors, feat, hasMod, cur, isAdmin } from "./staff.js";

const main = () => $("#main");
const plans = () => (S.platform?.plans?.length ? S.platform.plans : DEFAULT_PLANS);
const baseUrl = () => location.origin + location.pathname;

async function saveClinic(patch) {
  await updateDoc(P.clinic(), patch);
  const merged = { ...S.clinic, ...patch };
  await setDoc(P.pub(), publicCopy(merged));
  S.clinic = merged;
}

// ---------- الإعدادات ----------
export async function renderSettings() {
  const c = S.clinic || {};
  const hours = c.hours || {};
  const services = (c.services || []).map((s) => ({ ...s }));
  const vaccines = (c.vaccineSchedule || DEFAULT_VACCINES).map((v) => ({ ...v }));
  const mods = new Set(c.modules || []);
  const bookLink = `${baseUrl()}#/b/${c.slug}`;
  main().innerHTML = `<h2 class="page-title">إعدادات العيادة</h2>
  <form id="set" class="stack">
    <section class="card stack"><h3>الهوية</h3>
      <div class="logo-edit"><div class="lg">${logoHtml(c, 88)}</div>
        <div class="stack"><button type="button" class="btn small up">تغيير الشعار</button>${c.logo ? `<button type="button" class="btn small ghost rst">العودة إلى الشعار الافتراضي</button>` : ""}</div></div>
      ${field("اسم العيادة", "name", { value: c.name, required: true })}
      ${field("اسم الطبيب المسؤول", "doctorName", { value: c.doctorName, required: true })}
      ${field("اللقب", "title", { value: c.title })}
      ${field("العنوان", "address", { value: c.address })}
      ${field("هاتف العيادة", "phone", { value: c.phone, attrs: 'dir="ltr"' })}
      ${field("رابط الموقع على الخريطة (اختياري)", "mapUrl", { value: c.mapUrl || "", attrs: 'dir="ltr"', placeholder: "https://maps.google.com/..." })}
      <div class="grid2">${field("لون الواجهة", "accent", { type: "color", value: c.accent || "#5B3FD0" })}${field("العملة", "currency", { value: c.currency || "ل.س" })}</div>
    </section>
    <section class="card stack"><h3>الاختصاص والوحدات</h3>
      ${select("الاختصاص الرئيسي", "specialty", Object.entries(SPECIALTIES).map(([k, v]) => [k, v.name]), c.specialty)}
      ${multiSpec() ? `<p class="muted small">باقة المراكز الطبية: فعّل وحدات كل الاختصاصات التي يعمل بها مركزك.</p>
      <div class="mod-grid">${Object.entries(MODULES).map(([k, t]) => `<label class="check"><input type="checkbox" name="mod_${k}" ${mods.has(k) ? "checked" : ""}><span>${esc(t)}</span></label>`).join("")}</div>`
      : `<p class="muted small">الوحدات المفعّلة لاختصاصك:</p><div class="chips spec-mods"></div>
      <p class="muted small">تفعيل أكثر من اختصاص في العيادة نفسها متاح في باقة المراكز الطبية. <a href="#/subscription">الترقية</a></p>`}
    </section>
    <section class="card stack"><h3>أوقات الدوام</h3>
      <p class="muted small">يُقبل الحجز ضمن هذه الأوقات فقط.</p>
      ${[6, 0, 1, 2, 3, 4, 5].map((d) => { const h = hours[d] || { on: false, from: "10:00", to: "17:00" }; return `<div class="hours-row">
        <label class="check"><input type="checkbox" name="on${d}" ${h.on ? "checked" : ""}><span>${DAYS[d]}</span></label>
        <input type="time" name="from${d}" value="${esc(h.from)}" aria-label="من"><span>—</span><input type="time" name="to${d}" value="${esc(h.to)}" aria-label="إلى"></div>`; }).join("")}
      ${select("مدة الموعد الافتراضية", "slotMinutes", [[10, "10 دقائق"], [15, "15 دقيقة"], [20, "20 دقيقة"], [30, "30 دقيقة"], [45, "45 دقيقة"], [60, "ساعة"]], c.slotMinutes || 20)}
    </section>
    <section class="card stack"><h3>الخدمات والأسعار</h3>
      <div class="svc-list"></div><button type="button" class="btn small add-svc">+ خدمة</button>
    </section>
    <section class="card stack"><h3>صفحة الحجز العامة</h3>
      ${feat("booking") ? `
        <label class="check"><input type="checkbox" name="bookingEnabled" ${c.bookingEnabled ? "checked" : ""}><span>تفعيل الحجز من الرابط العام</span></label>
        <label class="check"><input type="checkbox" name="showPrices" ${c.showPrices ? "checked" : ""}><span>إظهار أسعار الخدمات في صفحة الحجز</span></label>
        <div class="book-share"><div class="qr-box">${qrSvg(bookLink, 132)}</div><div class="stack"><code class="copy" dir="ltr">${esc(bookLink)}</code><p class="muted small">اطبع الرمز وضعه في العيادة أو شاركه على وسائل التواصل.</p></div></div>`
        : `<p class="muted">صفحة الحجز العامة متاحة في الباقة الاحترافية. <a href="#/subscription">الترقية</a></p>`}
    </section>
    <section class="card stack"><h3>دليل الأطباء</h3>
      <p class="muted small">يبحث المرضى في دليل ${esc(PLATFORM())} حسب الاختصاص والمدينة، ويصلون إلى صفحة عيادتك ليحجزوا أو يتصلوا.</p>
      <label class="check"><input type="checkbox" name="listed" ${c.listed ? "checked" : ""}><span>إظهار عيادتي في دليل الأطباء</span></label>
      ${select("المدينة", "city", [["", "اختر المدينة"], ...CITIES.map((x) => [x, x])], c.city || "")}
    </section>
    ${hasMod("peds") || mods.has("peds") ? `<section class="card stack"><h3>جدول اللقاحات</h3>
      <p class="muted small">جدول مبدئي قابل للتعديل. راجعه وطابقه مع الجدول الوطني المعتمد قبل الاستخدام.</p>
      <div class="vac-list"></div><button type="button" class="btn small add-vac">+ لقاح</button></section>` : ""}
    <section class="card stack"><h3>نصوص جاهزة</h3>
      ${field("نص الموافقة على الإجراءات", "consentText", { type: "textarea", value: c.consentText || "أقرّ بأنني اطّلعت على طبيعة الإجراء وفوائده ومخاطره المحتملة، وأُجيب عن جميع أسئلتي، وأوافق على إجرائه بإرادتي.", attrs: "data-novoice" })}
      ${field("ملاحظة أسفل الوصفة", "rxFooter", { value: c.rxFooter || "" })}
    </section>
    <button class="btn primary block" type="submit">حفظ الإعدادات</button>
  </form>`;
  const drawSvcs = () => {
    $(".svc-list").innerHTML = services.map((s, i) => `<div class="svc-row">
      <input value="${esc(s.name)}" data-i="${i}" data-k="name" aria-label="اسم الخدمة" placeholder="الخدمة">
      <input type="number" value="${esc(s.price)}" data-i="${i}" data-k="price" aria-label="السعر" placeholder="السعر" min="0">
      <input type="number" value="${esc(s.duration)}" data-i="${i}" data-k="duration" aria-label="المدة بالدقائق" placeholder="دقيقة" min="5">
      <select data-i="${i}" data-k="kind" aria-label="النوع"><option value="general" ${s.kind !== "cosmetic" ? "selected" : ""}>عام</option><option value="cosmetic" ${s.kind === "cosmetic" ? "selected" : ""}>إجراء / جلسة</option></select>
      <button type="button" class="icon-btn del" data-i="${i}" aria-label="حذف">✕</button></div>`).join("");
    $$(".svc-row [data-k]").forEach((el) => el.onchange = () => {
      services[el.dataset.i][el.dataset.k] = ["price", "duration"].includes(el.dataset.k) ? Number(el.value) : el.value;
    });
    $$(".svc-row .del").forEach((b) => b.onclick = () => { services.splice(b.dataset.i, 1); drawSvcs(); });
  };
  drawSvcs();
  $(".add-svc").onclick = () => { services.push({ id: randId(6), name: "", price: 0, duration: c.slotMinutes || 20, kind: "general" }); drawSvcs(); };
  const drawVac = () => {
    const el = $(".vac-list"); if (!el) return;
    el.innerHTML = vaccines.map((v, i) => `<div class="vac-row">
      <input value="${esc(v.name)}" data-i="${i}" data-k="name" aria-label="اسم اللقاح">
      <label class="field inline"><span>العمر بالأشهر</span><input type="number" min="0" value="${esc(v.months)}" data-i="${i}" data-k="months" aria-label="العمر بالأشهر"></label>
      <button type="button" class="icon-btn del" data-i="${i}" aria-label="حذف">✕</button></div>`).join("");
    $$(".vac-row [data-k]").forEach((x) => x.onchange = () => { vaccines[x.dataset.i][x.dataset.k] = x.dataset.k === "months" ? Number(x.value) : x.value; });
    $$(".vac-row .del").forEach((b) => b.onclick = () => { vaccines.splice(b.dataset.i, 1); drawVac(); });
  };
  drawVac();
  $(".add-vac")?.addEventListener("click", () => { vaccines.push({ id: "v" + randId(5), name: "", months: 0 }); drawVac(); });
  $$("code.copy").forEach((x) => x.onclick = async () => { try { await navigator.clipboard.writeText(x.textContent); toast("تم النسخ"); } catch {} });
  let newLogo;
  $(".up").onclick = async () => {
    const f = await pickFile("image/*"); if (!f) return;
    try { newLogo = await compressImage(f, 400, 0.85); $(".lg").innerHTML = `<img class="logo-img" src="${newLogo}" width="88" height="88" alt="">`; }
    catch (e) { toast(errMsg(e), true); }
  };
  $(".rst")?.addEventListener("click", () => { newLogo = null; $(".lg").innerHTML = logoHtml({ specialty: c.specialty }, 88); });
  const drawSpecMods = () => { const box = $(".spec-mods"); if (box) { const ms = specMods($("#set").specialty.value); box.innerHTML = ms.length ? ms.map((k) => `<span class="chip">${esc(MODULES[k])}</span>`).join("") : `<span class="muted small">لا توجد وحدة خاصة لهذا الاختصاص، وتتوفر كل الميزات العامة.</span>`; } };
  drawSpecMods(); $("#set").specialty.addEventListener("change", drawSpecMods);
  $("#set").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const h = {};
    for (let d = 0; d < 7; d++) h[d] = { on: f[`on${d}`].checked, from: f[`from${d}`].value || "10:00", to: f[`to${d}`].value || "17:00" };
    const doctorsArr = (c.doctors || []).map((d) => (d.id === S.profile.doctorId ? { ...d, name: f.doctorName.value.trim(), title: f.title.value.trim() } : d));
    const patch = {
      name: f.name.value.trim(), doctorName: f.doctorName.value.trim(), title: f.title.value.trim(),
      address: f.address.value.trim(), phone: f.phone.value.trim(), accent: f.accent.value, mapUrl: f.mapUrl.value.trim(),
      logo: newLogo === undefined ? (c.logo || null) : newLogo,
      specialty: f.specialty.value, modules: multiSpec() ? Object.keys(MODULES).filter((k) => f[`mod_${k}`].checked) : specMods(f.specialty.value),
      currency: f.currency.value.trim() || "ل.س", hours: h, slotMinutes: Number(f.slotMinutes.value),
      services: services.filter((s) => s.name.trim()), consentText: f.consentText.value, rxFooter: f.rxFooter.value,
      doctors: doctorsArr, listed: f.listed.checked, city: f.city.value,
      ...(feat("booking") ? { bookingEnabled: f.bookingEnabled.checked, showPrices: f.showPrices.checked } : {}),
      ...($(".vac-list") ? { vaccineSchedule: vaccines.filter((v) => v.name.trim()).sort((a, b) => a.months - b.months) } : {}),
    };
    try {
      await saveClinic(patch);
      await audit("تعديل إعدادات العيادة");
      toast("حُفظت الإعدادات");
      setTimeout(() => {
        const b = $(".tb-brand");
        if (b) b.innerHTML = `${logoHtml(S.pub, 36)}<span>${esc(S.pub.name || "")}</span>`;
        render();
      }, 300);
    } catch (err) { toast(errMsg(err), true); }
  };
}

// ---------- الفريق ----------
export async function renderTeam() {
  const users = await list(query(P.users(), where("clinicId", "==", C)));
  const staff = users.filter((u) => u.active && u.role === "secretary");
  const docUsers = users.filter((u) => u.active && u.role === "doctor");
  const docs = (S.clinic?.doctors || []);
  const act = docs.filter((d) => d.active !== false);
  const maxD = S.clinic?.maxDoctors || 1, maxS = S.clinic?.maxStaff || 1;
  const canDoc = feat("multiDoctor") && act.length < maxD, canStaff = staff.length < maxS;
  main().innerHTML = `<h2 class="page-title">الفريق</h2>
    <section class="card">
      <div class="row-between"><h3>الأطباء <span class="muted small">(${act.length} من ${maxD})</span></h3>${canDoc ? `<button class="btn primary small addd">+ طبيب</button>` : ""}</div>
      <ul class="plain">${act.map((d) => {
        const u = docUsers.find((x) => x.doctorId === d.id);
        const me = d.id === S.profile.doctorId;
        return `<li class="req"><div><b>د. ${esc(d.name)}</b> ${me ? `<span class="chip">أنت · المسؤول</span>` : ""} <span class="muted small">${esc(d.title || "")}</span></div>
          ${u && !me ? `<div class="muted small" dir="ltr">${esc(u.phone)}</div><div class="row gap"><button class="btn small rp" data-uid="${u.id}">كلمة مرور جديدة</button><button class="btn small danger offd" data-id="${d.id}" data-uid="${u.id}">إيقاف</button></div>` : ""}</li>`;
      }).join("")}</ul>
      ${!feat("multiDoctor") ? `<p class="muted small">إضافة أطباء متاحة في الباقة الاحترافية. <a href="#/subscription">الترقية</a></p>` : !canDoc ? `<p class="muted small">وصلت إلى الحد الأقصى لباقتك.</p>` : ""}
    </section>
    <section class="card">
      <div class="row-between"><h3>السكرتارية <span class="muted small">(${staff.length} من ${maxS})</span></h3>${canStaff ? `<button class="btn primary small adds">+ حساب سكرتارية</button>` : ""}</div>
      ${staff.length ? `<ul class="plain">${staff.map((s) => `<li class="req">
        <div><b>${esc(s.name)}</b> <span class="muted" dir="ltr">${esc(s.phone)}</span></div>
        <div class="row gap"><button class="btn small rp" data-uid="${s.id}">كلمة مرور جديدة</button><button class="btn small danger offs" data-uid="${s.id}">إيقاف الحساب</button></div></li>`).join("")}</ul>` : empty("لا يوجد موظفون")}
    </section>
    <p class="muted small">يسري الإيقاف فوراً، ولا يمكن للحساب الدخول بعده. السكرتارية لا تطّلع على أي بيانات طبية.</p>`;
  $(".addd")?.addEventListener("click", async () => {
    const r = await modal("إضافة طبيب", `<form class="stack">${field("الاسم", "name", { required: true })}${field("اللقب / الاختصاص", "title")}${field("رقم الجوال (للدخول)", "phone", { required: true, attrs: 'dir="ltr" inputmode="tel"' })}</form>`, {
      ok: "إضافة",
      onOk: async (f) => {
        const doctorId = "d" + randId(6);
        const res = await createStaff(f.name, f.phone, "doctor", f.title, doctorId);
        await saveClinic({ doctors: [...docs, { id: doctorId, uid: res.uid, name: f.name.trim(), title: f.title.trim(), active: true }] });
        return { ...res, name: f.name };
      }
    });
    if (r) staffCred(r.phone, r.temp, r.name);
    render();
  });
  $(".adds")?.addEventListener("click", async () => {
    const r = await modal("حساب سكرتارية جديد", `<form class="stack">${field("الاسم", "name", { required: true })}${field("رقم الجوال", "phone", { required: true, attrs: 'dir="ltr" inputmode="tel"' })}</form>`, {
      ok: "إنشاء", onOk: async (f) => ({ ...(await createStaff(f.name, f.phone, "secretary")), name: f.name })
    });
    if (r) staffCred(r.phone, r.temp, r.name);
    render();
  });
  $$(".rp").forEach((b) => b.onclick = async () => {
    const u = users.find((x) => x.id === b.dataset.uid);
    if (!(await confirmBox("كلمة مرور جديدة", `ستتوقف كلمة المرور الحالية لـ ${u.name}.`, "متابعة"))) return;
    try {
      const r = await resetStaffPassword(u.id);
      if (u.doctorId) await saveClinic({ doctors: docs.map((d) => (d.id === u.doctorId ? { ...d, uid: r.uid } : d)) });
      staffCred(u.phone, r.temp, u.name);
    } catch (e) { toast(errMsg(e), true); }
    render();
  });
  $$(".offs").forEach((b) => b.onclick = async () => {
    const u = users.find((x) => x.id === b.dataset.uid);
    if (!(await confirmBox("إيقاف الحساب", `إيقاف حساب ${u.name}؟`, "إيقاف", true))) return;
    await updateDoc(P.user(u.id), { active: false });
    await audit("إيقاف حساب موظف", u.name);
    render();
  });
  $$(".offd").forEach((b) => b.onclick = async () => {
    const d = docs.find((x) => x.id === b.dataset.id);
    if (!(await confirmBox("إيقاف الطبيب", `إيقاف حساب د. ${d.name}؟ تبقى مواعيده وملفاته محفوظة.`, "إيقاف", true))) return;
    await updateDoc(P.user(b.dataset.uid), { active: false });
    await saveClinic({ doctors: docs.map((x) => (x.id === d.id ? { ...x, active: false } : x)) });
    await audit("إيقاف طبيب", d.name);
    render();
  });
}
function staffCred(phone, temp, name) {
  const url = `${baseUrl()}#/c/${S.clinic?.slug || ""}`;
  const text = `أهلاً ${name}، أهلاً بك في تطبيق ${PLATFORM()} 👋\nهذا حسابك لدى ${S.pub.name}:\n\nحمّل التطبيق من هنا:\n${APP_URL}\n\nبعد فتحه اضغط «دخول» واكتب:\nرقم الجوال: ${phone}\nكلمة المرور المؤقتة: ${temp}\n\nعلى الآيفون أو الحاسوب استخدم هذا الرابط:\n${url}`;
  info("الحساب جاهز", `<div class="cred"><div>الرقم: <b dir="ltr">${esc(phone)}</b></div><div>كلمة المرور المؤقتة: <b class="big" dir="ltr">${esc(temp)}</b></div></div>
    <a class="btn primary block" target="_blank" rel="noopener" href="${esc(waLink(phone, text))}">إرسال على واتساب</a>`);
}

// ---------- الاشتراك ----------
export async function renderSubscription() {
  const c = S.clinic || {};
  const st = clinicState(c);
  const pay = S.platform?.payment || {};
  const mine = (await list(query(P.subPays(), where("clinicId", "==", C))).catch(() => [])).sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt));
  const curPlan = plans().find((p) => p.id === c.plan);
  const M = PAY_METHODS;
  const expiry = new Date(tsMs(c.expiresAt));
  main().innerHTML = `<h2 class="page-title">الاشتراك</h2>
    <section class="card sub-status ${st.ok ? "" : "bad"}">
      <div class="row-between"><div><span class="muted small">الباقة الحالية</span><h3>${esc(c.plan === "trial" ? "تجربة مجانية" : c.plan === "gift" ? "هدية مدى الحياة" : curPlan?.name || c.plan)}</h3></div>
        <span class="chip ${st.ok ? "ok" : "danger"}">${st.ok ? "فعّال" : c.status === "suspended" ? "موقوف" : "منتهٍ"}</span></div>
      ${c.plan === "gift" ? `<p>اشتراك دائم دون رسوم.</p>` : `<p>${st.ok ? `ينتهي في ${esc(fmtDate(ymd(expiry), false))} (باقي ${st.days} يوم)` : `انتهى في ${esc(fmtDate(ymd(expiry), false))}. النظام للقراءة فقط حتى التجديد، ولا تُحذف أي بيانات.`}</p>`}
    </section>
    ${c.plan === "gift" ? "" : `<h3>اختر باقتك</h3>
    <div class="plans">${plans().map((p, i) => `<article class="plan ${p.id === c.plan ? "featured" : ""}">
      ${p.id === c.plan ? `<span class="badge-top">باقتك</span>` : ""}
      <h3>${esc(p.name)}</h3><div class="price"><b>${esc(p.price)}</b><span>${esc(p.currency || "$")} / شهرياً</span></div>
      <ul class="plain checks">${(p.perks || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <button class="btn ${p.id === c.plan || i === 1 ? "primary" : ""} block pick" data-id="${p.id}">${p.id === c.plan ? "تجديد" : "اختيار"}</button></article>`).join("")}</div>`}
    <section class="card stack"><h3>طرق الدفع</h3>
      ${pay.shamcash || pay.shamcashQr ? `<div class="sc-box"><h4>شام كاش</h4>${pay.shamcashQr ? `<img class="sc-qr" src="${esc(pay.shamcashQr)}" alt="رمز QR للدفع عبر شام كاش">` : ""}${pay.shamcash ? `<p>الحساب: <b dir="auto">${esc(pay.shamcash)}</b></p>` : ""}<p class="muted small">امسح الرمز من تطبيق شام كاش وادفع، ثم ارفع صورة الإيصال عند اختيار الباقة.</p></div>` : ""}
      ${pay.syriatel ? `<p>سيريتل كاش: <b dir="ltr">${esc(pay.syriatel)}</b></p>` : ""}
      ${pay.mtn ? `<p>MTN كاش: <b dir="ltr">${esc(pay.mtn)}</b></p>` : ""}
      ${pay.bank ? `<p class="pre">${esc(pay.bank)}</p>` : ""}
      ${pay.notes ? `<p class="muted">${esc(pay.notes)}</p>` : ""}
      ${!pay.syriatel && !pay.mtn && !pay.bank && !pay.shamcash && !pay.shamcashQr ? `<p class="muted">تواصل مع إدارة المنصة لمعرفة طرق الدفع.</p>` : ""}
      ${pay.whatsapp ? `<a class="btn" target="_blank" rel="noopener" href="${esc(waLink(pay.whatsapp, `مرحباً، أريد الاستفسار عن اشتراك ${c.name} (${c.slug}) في منصة ${PLATFORM()}.`))}">التواصل مع إدارة المنصة</a>` : ""}
    </section>
    <section class="card"><h3>سجل الدفعات</h3>${mine.length ? `<ul class="plain">${mine.map((p) => `<li class="req">
      <div class="row-between"><b>${esc(plans().find((x) => x.id === p.plan)?.name || p.plan)} · ${esc(p.months)} شهر</b>
      ${p.status === "pending" ? `<span class="chip warn">قيد المراجعة</span>` : p.status === "approved" ? `<span class="chip ok">مقبولة</span>` : `<span class="chip danger">مرفوضة</span>`}</div>
      <div class="muted small">${esc(p.amount)} · ${esc(M[p.method] || p.method)} · ${esc(tsDate(p.createdAt))}${p.reason ? ` · السبب: ${esc(p.reason)}` : ""}</div></li>`).join("")}</ul>` : empty("لا توجد دفعات بعد")}</section>`;
  $$(".pick").forEach((b) => b.onclick = () => payModal(plans().find((p) => p.id === b.dataset.id)));
}

async function payModal(p) {
  const pay = S.platform?.payment || {};
  const hasSham = !!(pay.shamcash || pay.shamcashQr);
  const methods = [["shamcash", "شام كاش"], ["syriatel", "سيريتل كاش"], ["mtn", "MTN كاش"], ["bank", "تحويل بنكي"], ["cash", "نقداً"], ["other", "أخرى"]]
    .filter(([k]) => (k === "shamcash" ? hasSham : !["syriatel", "mtn", "bank"].includes(k) || pay[k]));
  let receipt = null;
  const r = await modal(`اشتراك ${p.name}`, `<form class="stack">
    ${select("المدة", "months", [[1, "شهر"], [3, "3 أشهر"], [6, "6 أشهر"], [12, "سنة"]], 1)}
    <p class="total">المبلغ: <b class="amt">${esc(p.price)} ${esc(p.currency || "$")}</b></p>
    ${select("طريقة الدفع", "method", methods, methods[0]?.[0])}
    <div class="pay-hint muted small"></div>
    <div class="sc-pay"></div>
    <div class="field"><span>صورة الإيصال <b class="req-mark"></b></span>
      <div class="receipt-pick"><button type="button" class="btn small up-rc">رفع صورة الإيصال</button><div class="rc-prev"></div></div></div>
    ${field("رقم العملية (اختياري مع شام كاش)", "txn", { attrs: 'dir="ltr"' })}
    ${field("ملاحظة (اختياري)", "note")}
    <p class="muted small">بعد مراجعة الدفعة يُفعَّل اشتراكك وتصلك رسالة.</p>
  </form>`, {
    ok: "إرسال",
    onOpen: (w) => {
      const f = w.querySelector("form");
      const upd = () => {
        w.querySelector(".amt").textContent = `${(Number(p.price) * Number(f.months.value)).toLocaleString("en-US")} ${p.currency || "$"}`;
        const m = f.method.value;
        w.querySelector(".pay-hint").textContent = m !== "shamcash" && pay[m] ? `حوّل إلى: ${pay[m]}` : "";
        w.querySelector(".sc-pay").innerHTML = m === "shamcash" ? `<div class="sc-box">${pay.shamcashQr ? `<img class="sc-qr" src="${esc(pay.shamcashQr)}" alt="رمز QR للدفع عبر شام كاش">` : ""}${pay.shamcash ? `<p>الحساب: <b dir="auto">${esc(pay.shamcash)}</b></p>` : ""}<p class="muted small">امسح الرمز من تطبيق شام كاش، ادفع المبلغ، ثم ارفع صورة الإيصال.</p></div>` : "";
        w.querySelector(".req-mark").textContent = m === "shamcash" ? "(مطلوبة)" : "(اختيارية)";
      };
      f.months.onchange = upd; f.method.onchange = upd; upd();
      w.querySelector(".up-rc").onclick = async () => {
        const file = await pickFile("image/*"); if (!file) return;
        try {
          receipt = await compressImage(file, 1200, 0.7);
          w.querySelector(".rc-prev").innerHTML = `<img src="${receipt}" alt="صورة الإيصال">`;
          w.querySelector(".up-rc").textContent = "تغيير الصورة";
        } catch (e) { toast(errMsg(e), true); }
      };
    },
    onOk: async (f) => {
      if (f.method === "shamcash" && !receipt) { toast("ارفع صورة إيصال شام كاش", true); return false; }
      if (f.method !== "shamcash" && !receipt && !f.txn) { toast("اكتب رقم العملية أو ارفع صورة الإيصال", true); return false; }
      await addDoc(P.subPays(), {
        clinicId: C, clinicName: S.clinic.name, slug: S.clinic.slug, plan: p.id, months: Number(f.months),
        amount: `${Number(p.price) * Number(f.months)} ${p.currency || "$"}`, method: f.method, txn: f.txn, note: f.note, receipt,
        status: "pending", by: S.user.uid, createdAt: serverTimestamp()
      });
    }
  });
  if (r) { toast("أُرسلت الدفعة للمراجعة"); render(); }
}

// ---------- المخزون ----------
export async function renderInventory() {
  const items = (await list(P.col("inventory"))).filter((i) => !i.archived).sort((a, b) => a.name.localeCompare(b.name, "ar"));
  const today = ymd();
  const low = (i) => Number(i.qty) <= Number(i.min || 0);
  const exp = (i) => i.expiry && i.expiry <= addDays(today, 60);
  main().innerHTML = `<div class="row-between"><h2 class="page-title">المخزون</h2><button class="btn primary add">+ صنف</button></div>
    <div class="stats"><div class="stat"><b>${items.length}</b><span>الأصناف</span></div>
      <div class="stat warn"><b>${items.filter(low).length}</b><span>عند الحد الأدنى</span></div>
      <div class="stat"><b>${items.filter(exp).length}</b><span>ينتهي خلال شهرين</span></div></div>
    <section class="card">${items.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>الصنف</th><th>الكمية</th><th>الحد الأدنى</th><th>الصلاحية</th><th></th></tr></thead><tbody>
      ${items.map((i) => `<tr class="${low(i) ? "row-warn" : ""}"><td><b>${esc(i.name)}</b>${i.note ? `<br><small class="muted">${esc(i.note)}</small>` : ""}</td>
        <td><b>${esc(i.qty)}</b> ${esc(i.unit || "")}</td><td>${esc(i.min ?? "")}</td>
        <td>${i.expiry ? `<span class="${exp(i) ? "danger-t" : ""}">${esc(i.expiry)}</span>` : "—"}</td>
        <td><button class="btn small mv" data-id="${i.id}">حركة</button></td></tr>`).join("")}</tbody></table></div>` : empty("لم تُضف أصناف بعد")}</section>`;
  $(".add").onclick = () => itemModal();
  $$(".mv").forEach((b) => b.onclick = () => moveModal(items.find((i) => i.id === b.dataset.id)));
}
async function itemModal(i = {}) {
  await modal(i.id ? "تعديل صنف" : "صنف جديد", `<form class="stack">
    ${field("الاسم", "name", { value: i.name, required: true })}
    <div class="grid2">${field("الكمية الحالية", "qty", { type: "number", value: i.qty ?? 0, required: true, attrs: 'step="any"' })}${field("الوحدة", "unit", { value: i.unit || "", placeholder: "علبة، أمبولة، قطعة" })}</div>
    <div class="grid2">${field("الحد الأدنى للتنبيه", "min", { type: "number", value: i.min ?? 0, attrs: 'step="any"' })}${field("تاريخ الصلاحية", "expiry", { type: "date", value: i.expiry || "" })}</div>
    ${field("سعر الشراء للوحدة", "cost", { type: "number", value: i.cost ?? "", attrs: 'step="any"' })}
    ${field("ملاحظة", "note", { value: i.note || "" })}
  </form>`, {
    onOk: async (f) => {
      if (i.id) await updateDoc(P.colDoc("inventory", i.id), { ...f, updatedAt: serverTimestamp() });
      else await addDoc(P.col("inventory"), { ...f, moves: [], archived: false, createdAt: serverTimestamp() });
      await audit(i.id ? "تعديل صنف في المخزون" : "إضافة صنف للمخزون", f.name);
      setTimeout(render, 50);
    }
  });
}
async function moveModal(i) {
  await modal(i.name, `<form class="stack">
    <p>الكمية الحالية: <b>${esc(i.qty)} ${esc(i.unit || "")}</b></p>
    ${select("نوع الحركة", "type", [["out", "صرف / استخدام"], ["in", "إضافة / شراء"], ["adj", "تصحيح الجرد (الكمية الفعلية)"]], "out")}
    ${field("الكمية", "n", { type: "number", required: true, attrs: 'step="any" min="0"' })}
    ${field("السبب", "reason")}
    ${(i.moves || []).length ? `<details><summary class="muted">آخر الحركات</summary><ul class="plain small">${i.moves.slice(-15).reverse().map((m) => `<li>${esc(m.date)} · ${m.type === "in" ? "+" : m.type === "out" ? "−" : "="}${esc(m.n)} ${esc(m.reason || "")} <span class="muted">${esc(m.by || "")}</span></li>`).join("")}</ul></details>` : ""}
    <div class="row gap"><button type="button" class="btn small ed">تعديل بيانات الصنف</button><button type="button" class="btn small danger ar">أرشفة</button></div>
  </form>`, {
    ok: "حفظ الحركة",
    onOpen: (w) => {
      w.querySelector(".ed").onclick = () => { w.remove(); itemModal(i); };
      w.querySelector(".ar").onclick = async () => { w.remove(); await updateDoc(P.colDoc("inventory", i.id), { archived: true }); render(); };
    },
    onOk: async (f) => {
      const n = Number(f.n) || 0;
      const qty = f.type === "in" ? Number(i.qty) + n : f.type === "out" ? Number(i.qty) - n : n;
      await updateDoc(P.colDoc("inventory", i.id), {
        qty, moves: [...(i.moves || []).slice(-49), { date: ymd(), type: f.type, n, reason: f.reason, by: S.profile.name || "" }], updatedAt: serverTimestamp()
      });
      setTimeout(render, 50);
    }
  });
}
