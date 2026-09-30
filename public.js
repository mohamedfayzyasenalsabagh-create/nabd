// الصفحات العامة: الصفحة الرئيسية للمنصة، تسجيل عيادة، دخول المالك، صفحة الحجز، والتحقق من الوصفة
import {
  auth, P, one, list, doc, addDoc, getDoc, setClinic, signupClinic, bootstrapOwner, login, cleanSlug,
  SPECIALTIES, DEFAULT_PLANS, TRIAL_DAYS, serverTimestamp, normPhone, sendPasswordResetEmail
} from "./fb.js";
import { COPYRIGHT,
  $, $$, esc, ymd, addDays, parseYmd, fmtDate, fmtTime, toast, errMsg, modal, info, field, select,
  logoHtml, platformMark, applyTheme, DAYS
} from "./ui.js";
import { S, LS, PLATFORM, holdAuth, applyBrand, openClinic } from "./app.js";

const root = () => $("#app");
const plans = () => (S.platform?.plans?.length ? S.platform.plans : DEFAULT_PLANS);

function themeToggle() {
  const cur = LS.get("theme") || "auto";
  const next = { auto: "dark", dark: "light", light: "auto" }[cur];
  const label = { auto: "المظهر: تلقائي", dark: "المظهر: داكن", light: "المظهر: فاتح" }[cur];
  return `<button class="icon-btn theme-t" aria-label="${label}" title="${label}" data-next="${next}">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg></button>`;
}
function bindTheme(rerender) {
  $$(".theme-t").forEach((b) => b.onclick = () => { LS.set("theme", b.dataset.next); applyTheme(b.dataset.next); rerender?.(); });
}

// ---------- الصفحة الرئيسية ----------
export function landing() {
  applyBrand({ accent: "#0E7C7B" });
  document.title = `${PLATFORM()} · نظام إدارة العيادات`;
  const pay = S.platform?.payment || {};
  const specs = Object.values(SPECIALTIES).map((s) => s.name);
  const features = [
    ["المواعيد والانتظار", "جدول يومي حسب أوقات الدوام، أرقام دور، شاشة انتظار، وتذكير المرضى عبر واتساب بضغطة."],
    ["الملف الطبي الكامل", "زيارات ووصفات وتحاليل وصور، مع ملخص سريع وتنبيه للحساسية في أعلى البطاقة."],
    ["وحدة لكل اختصاص", "مخطط أسنان تفاعلي، منحنيات نمو ولقاحات، متابعة حمل، مؤشرات حيوية، فحص نظر، وجلسات."],
    ["تطبيق للمرضى", "يرى المريض مواعيده وأدويته مع تذكير، ويطلب موعداً، ويرفع تحاليله، ويراسل العيادة."],
    ["صفحة حجز عامة", "رابط خاص بعيادتك يحجز منه المرضى الجدد دون حساب، وتؤكده السكرتارية بضغطة."],
    ["وصفة برمز QR", "وصفة مطبوعة بترويسة العيادة، يتحقق منها الصيدلاني بمسح الرمز."],
    ["المالية والمخزون", "دفعات وأقساط وديون، تقارير شهرية، ومخزون بتنبيه عند النفاد."],
    ["فريق وصلاحيات", "أطباء وسكرتارية بصلاحيات دقيقة، والسكرتارية لا ترى أي تفاصيل طبية."],
  ];
  const render = () => {
    root().innerHTML = `
    <div class="lp">
      <header class="lp-top">
        <a class="lp-brand" href="#/home">${platformMark(34)}<b>${esc(PLATFORM())}</b></a>
        <nav class="lp-nav">
          <a href="#features" class="hide-sm">الميزات</a><a href="#pricing" class="hide-sm">الأسعار</a>
          ${themeToggle()}
          <button class="btn small ghost enter">دخول</button>
        </nav>
      </header>

      <section class="lp-hero">
        <div class="lp-hero-text">
          <span class="eyebrow">لكل الاختصاصات الطبية</span>
          <h1>عيادتك كاملة<br>في مكان واحد</h1>
          <p class="lead">المواعيد والملفات الطبية والوصفات والمالية، مع تطبيق لمرضاك يتابعون منه مواعيدهم وأدويتهم. يعمل على الحاسوب والجوال، وكل شيء متزامن لحظياً.</p>
          <div class="row gap wrap">
            <a class="btn primary lg" href="#/signup">ابدأ تجربة مجانية ${TRIAL_DAYS} يوماً</a>
            <a class="btn lg" href="#features">تعرّف على الميزات</a>
          </div>
          <p class="muted small">دون بطاقة دفع. تُفعَّل العيادة فوراً.</p>
        </div>
        <div class="lp-phone" aria-hidden="true">
          <div class="ph-bar"><span></span></div>
          <div class="ph-head"><div class="ph-av"></div><div><b>مواعيد اليوم</b><small>٧ مرضى · ٢ في الانتظار</small></div></div>
          ${[["09:30", "سارة", "معاينة", "done"], ["10:00", "أحمد", "حشوة ضرس 36", "in"], ["10:20", "ليلى", "متابعة حمل · أسبوع 24", "wait"], ["10:40", "كريم", "لقاح الشهر الرابع", ""], ["11:00", "هالة", "جلسة ليزر 3/6", ""]].map(([t, n, s, st]) => `
            <div class="ph-row ${st}"><span class="t">${t}</span><span class="n">${n}<small>${s}</small></span><i></i></div>`).join("")}
          <div class="ph-stat"><div><b>١٢٠٬٠٠٠</b><small>دخل اليوم</small></div><div><b>٣</b><small>مرضى جدد</small></div></div>
        </div>
      </section>

      <section class="lp-specs">
        ${specs.map((s) => `<span class="chip lg">${esc(s)}</span>`).join("")}
      </section>

      <section id="features" class="lp-sec">
        <h2>كل ما تحتاجه عيادتك</h2>
        <div class="lp-grid">
          ${features.map(([t, d], i) => `<article class="lp-feat"><span class="num">${String(i + 1).padStart(2, "0")}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join("")}
        </div>
      </section>

      <section class="lp-sec lp-secure">
        <div>
          <h2>بيانات مرضاك محمية</h2>
          <ul class="plain dots">
            <li>كل عيادة معزولة تماماً عن غيرها.</li>
            <li>الملف الطبي لا يراه إلا الأطباء والمريض نفسه.</li>
            <li>لا حذف نهائي لأي سجل، وكل تعديل مسجّل باسم من أجراه.</li>
            <li>نسخة احتياطية كاملة بضغطة واحدة.</li>
          </ul>
        </div>
      </section>

      <section id="pricing" class="lp-sec">
        <h2>باقات تناسب كل عيادة</h2>
        <p class="muted center">تبدأ كل عيادة بتجربة مجانية كاملة لمدة ${TRIAL_DAYS} يوماً.</p>
        <div class="plans">
          ${plans().map((p, i) => `<article class="plan ${i === 1 ? "featured" : ""}">
            ${i === 1 ? `<span class="badge-top">الأكثر طلباً</span>` : ""}
            <h3>${esc(p.name)}</h3>
            <div class="price"><b>${esc(p.price)}</b><span>${esc(p.currency || "$")} / شهرياً</span></div>
            <ul class="plain checks">${(p.perks || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
            <a class="btn ${i === 1 ? "primary" : ""} block" href="#/signup">ابدأ التجربة</a>
          </article>`).join("")}
        </div>
      </section>

      <footer class="lp-foot">
        <div class="lp-brand">${platformMark(26)}<b>${esc(PLATFORM())}</b></div>
        ${pay.whatsapp ? `<p>للتواصل والاستفسار: <b dir="ltr">${esc(pay.whatsapp)}</b></p>` : ""}
        <p class="copyright">${esc(COPYRIGHT)}</p>
      </footer>
    </div>`;
    bindTheme(render);
    $(".enter").onclick = enterModal;
    $$('.lp a[href^="#features"], .lp a[href^="#pricing"]').forEach((a) => a.onclick = (e) => {
      e.preventDefault(); document.querySelector(a.getAttribute("href"))?.scrollIntoView({ behavior: "smooth" });
    });
  };
  render();
}

function enterModal() {
  modal("الدخول", `
    <div class="stack">
      <form class="stack f-slug">
        <h4>لدي رابط عيادة</h4>
        <p class="muted small">للمرضى والموظفين: اكتب رمز العيادة كما وصلك (مثل: dr-sara).</p>
        <div class="row gap"><input name="slug" class="grow" dir="ltr" placeholder="dr-sara" aria-label="رمز العيادة" required><button class="btn primary">متابعة</button></div>
      </form>
      <hr>
      <form class="stack f-mail">
        <h4>مسؤول عيادة</h4>
        ${field("البريد الإلكتروني", "email", { type: "email", required: true, attrs: 'dir="ltr" autocomplete="username"' })}
        ${field("كلمة المرور", "pw", { type: "password", required: true, attrs: 'dir="ltr" autocomplete="current-password"' })}
        <button class="btn primary">دخول</button>
        <button type="button" class="link-btn small forgot">نسيت كلمة المرور؟</button>
      </form>
    </div>`, {
    ok: null, cancel: "إغلاق",
    onOpen: (w) => {
      w.querySelector(".f-slug").onsubmit = (e) => { e.preventDefault(); const v = cleanSlug(e.target.slug.value); w.remove(); openClinic(v); };
      w.querySelector(".f-mail").onsubmit = async (e) => {
        e.preventDefault();
        const b = e.target.querySelector("button"); b.disabled = true;
        try { await login(e.target.email.value, e.target.pw.value, "s"); w.remove(); }
        catch (err) { toast(errMsg(err), true); b.disabled = false; }
      };
      w.querySelector(".forgot").onclick = async () => {
        const v = w.querySelector(".f-mail").email.value.trim();
        if (!v) return toast("اكتب بريدك الإلكتروني أولاً", true);
        try { await sendPasswordResetEmail(auth, v); toast("أُرسل رابط تغيير كلمة المرور إلى بريدك"); } catch (e) { toast(errMsg(e), true); }
      };
    }
  });
}

// ---------- تسجيل عيادة جديدة ----------
export function signupPage() {
  applyBrand({ accent: "#0E7C7B" });
  document.title = `افتح عيادتك · ${PLATFORM()}`;
  root().innerHTML = `<div class="center-page">
    <a class="lp-brand" href="#/home">${platformMark(40)}<b>${esc(PLATFORM())}</b></a>
    <form id="su" class="card narrow stack">
      <h2>افتح عيادتك الآن</h2>
      <p class="muted">تجربة مجانية كاملة لمدة ${TRIAL_DAYS} يوماً، دون أي التزام.</p>
      <h3>العيادة</h3>
      ${field("اسم العيادة", "clinicName", { required: true, placeholder: "عيادة د. سارة للأسنان" })}
      ${select("الاختصاص", "specialty", Object.entries(SPECIALTIES).map(([k, v]) => [k, v.name]), "dental")}
      ${field("رمز العيادة (رابطها)", "slug", { required: true, attrs: 'dir="ltr" pattern="[a-zA-Z0-9\\-]{3,30}" autocapitalize="off"', placeholder: "dr-sara", hint: "حروف لاتينية وأرقام فقط. يستخدمه المرضى للدخول ولصفحة الحجز." })}
      ${field("هاتف العيادة", "clinicPhone", { attrs: 'dir="ltr" inputmode="tel"' })}
      ${field("العنوان", "address")}
      <h3>الطبيب المسؤول</h3>
      ${field("الاسم", "doctorName", { required: true })}
      ${field("اللقب / الاختصاص الدقيق", "title", { required: true, placeholder: "أخصائية تقويم الأسنان" })}
      ${field("رقم الجوال", "phone", { required: true, attrs: 'dir="ltr" inputmode="tel"' })}
      ${field("البريد الإلكتروني (للدخول)", "email", { type: "email", required: true, attrs: 'dir="ltr" autocomplete="username"' })}
      ${field("كلمة المرور", "password", { type: "password", required: true, attrs: 'minlength="6" dir="ltr" autocomplete="new-password"' })}
      ${field("تأكيد كلمة المرور", "password2", { type: "password", required: true, attrs: 'minlength="6" dir="ltr" autocomplete="new-password"' })}
      <label class="check"><input type="checkbox" name="terms" required><span>أوافق على شروط الاستخدام وسياسة الخصوصية، وأتحمل مسؤولية بيانات مرضاي.</span></label>
      <button class="btn primary block" type="submit">إنشاء العيادة</button>
      <p class="muted small center">لديك عيادة؟ <a href="#/home">الدخول</a></p>
    </form></div>`;
  const f = $("#su");
  f.slug.oninput = () => { const c = cleanSlug(f.slug.value); if (c !== f.slug.value.toLowerCase()) f.slug.value = c; };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    if (d.password !== d.password2) return toast("كلمتا المرور غير متطابقتين", true);
    const btn = f.querySelector("[type=submit]");
    btn.disabled = true; btn.textContent = "جارٍ إنشاء العيادة…";
    holdAuth(true);
    try {
      await signupClinic(d);
      holdAuth(false);
      toast("تم إنشاء العيادة. أهلاً بك!");
      history.replaceState(null, "", location.pathname);
      location.reload();
    } catch (err) {
      holdAuth(false);
      console.error(err);
      toast(errMsg(err), true);
      btn.disabled = false; btn.textContent = "إنشاء العيادة";
      if (auth.currentUser && !(await one(P.user(auth.currentUser.uid)).catch(() => null))) {
        try { await auth.currentUser.delete(); } catch {}
      }
    }
  };
}

// ---------- دخول المالك ----------
export async function ownerLogin() {
  applyBrand({ accent: "#0E7C7B" });
  const boot = await one(P.bootstrap()).catch(() => null);
  if (!boot) {
    root().innerHTML = `<div class="center-page">
      <div class="lp-brand">${platformMark(44)}<b>${esc(PLATFORM())}</b></div>
      <form id="ob" class="card narrow stack">
        <h2>إعداد حساب مالك المنصة</h2>
        <p class="muted">يتم مرة واحدة فقط. هذا الحساب يدير العيادات والاشتراكات، ولا يطّلع على بيانات المرضى.</p>
        ${field("الاسم", "name", { required: true })}
        ${field("البريد الإلكتروني", "email", { type: "email", required: true, attrs: 'dir="ltr"' })}
        ${field("كلمة المرور", "pw", { type: "password", required: true, attrs: 'minlength="8" dir="ltr" autocomplete="new-password"' })}
        <button class="btn primary block">إنشاء حساب المالك</button>
      </form></div>`;
    $("#ob").onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target; const b = f.querySelector("button"); b.disabled = true;
      holdAuth(true);
      try { await bootstrapOwner(f.email.value, f.pw.value, f.name.value.trim()); holdAuth(false); location.reload(); }
      catch (err) { holdAuth(false); toast(errMsg(err), true); b.disabled = false; }
    };
    return;
  }
  root().innerHTML = `<div class="center-page">
    <div class="lp-brand">${platformMark(44)}<b>${esc(PLATFORM())}</b></div>
    <form id="ol" class="card narrow stack">
      <h2>لوحة المالك</h2>
      ${field("البريد الإلكتروني", "email", { type: "email", required: true, attrs: 'dir="ltr" autocomplete="username"' })}
      ${field("كلمة المرور", "pw", { type: "password", required: true, attrs: 'dir="ltr" autocomplete="current-password"' })}
      <button class="btn primary block">دخول</button>
    </form></div>`;
  $("#ol").onsubmit = async (e) => {
    e.preventDefault();
    try { await login(e.target.email.value, e.target.pw.value, "s"); } catch (err) { toast(errMsg(err), true); }
  };
}

// ---------- صفحة الحجز العامة ----------
export async function bookingPage(slug) {
  root().innerHTML = `<div class="center-page"><div class="loading">جارٍ التحميل…</div></div>`;
  const s = await one(P.slug(String(slug || "").toLowerCase())).catch(() => null);
  const cid = s?.cid;
  const pub = cid ? await one(P.pub(cid)).catch(() => null) : null;
  if (!pub) { root().innerHTML = `<div class="center-page"><div class="card narrow"><h2>لم يُعثر على العيادة</h2><p>تأكد من الرابط.</p><a class="btn" href="#/home">الصفحة الرئيسية</a></div></div>`; return; }
  applyBrand(pub);
  const docs = pub.doctors?.length ? pub.doctors : [{ id: "main", name: pub.doctorName }];
  let state = { doctorId: docs[0].id, date: null, time: null, service: pub.services?.[0]?.name || "" };
  const open = [];
  for (let i = 0; i < 30 && open.length < 14; i++) {
    const d = addDays(ymd(), i);
    const h = pub.hours?.[parseYmd(d).getDay()];
    if (h?.on) open.push(d);
  }
  state.date = open[0] || null;
  const slotsFor = (date) => {
    const h = pub.hours?.[parseYmd(date).getDay()];
    if (!h?.on) return [];
    const step = Number(pub.slotMinutes) || 20;
    const toMin = (t) => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
    const now = new Date(), today = ymd();
    const out = [];
    for (let m = toMin(h.from); m + step <= toMin(h.to); m += step) {
      const t = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      if (date === today && m <= now.getHours() * 60 + now.getMinutes() + 30) continue;
      out.push(t);
    }
    return out;
  };
  const draw = async () => {
    let taken = new Set();
    if (state.date) {
      const b = await one(P.colDoc("busy", state.date, cid)).catch(() => null);
      taken = new Set((b?.slots || []).filter((x) => x.endsWith("|" + state.doctorId) || !x.includes("|")).map((x) => x.split("|")[0]));
    }
    const sl = state.date ? slotsFor(state.date).filter((t) => !taken.has(t)) : [];
    root().innerHTML = `<div class="book">
      <header class="book-head">
        ${logoHtml(pub, 72)}
        <div><h1>${esc(pub.name)}</h1><p>${esc(pub.doctorName ? "د. " + pub.doctorName : "")} ${pub.title ? "· " + esc(pub.title) : ""}</p>
        <p class="muted small">${esc(pub.address || "")}</p>
        <div class="row gap wrap">${pub.phone ? `<span class="chip" dir="ltr">${esc(pub.phone)}</span>` : ""}${pub.mapUrl ? `<a class="chip" href="${esc(pub.mapUrl)}" target="_blank" rel="noopener">الموقع على الخريطة</a>` : ""}</div></div>
      </header>
      ${!pub.bookingEnabled ? `<div class="card"><p>الحجز الإلكتروني غير مفعّل لهذه العيادة حالياً. يرجى الاتصال بالعيادة.</p></div>` : `
      <form id="bk" class="card stack">
        <h2>احجز موعدك</h2>
        ${docs.length > 1 ? select("الطبيب", "doctorId", docs.map((d) => [d.id, `د. ${d.name}${d.title ? " · " + d.title : ""}`]), state.doctorId) : ""}
        ${pub.services?.length ? select("نوع الزيارة", "service", pub.services.map((s) => [s.name, s.name + (s.price ? ` · ${s.price}` : "")]), state.service) : ""}
        <div class="field"><span>اليوم</span><div class="days">${open.map((d) => `<button type="button" class="day ${d === state.date ? "on" : ""}" data-d="${d}"><small>${DAYS[parseYmd(d).getDay()]}</small><b>${parseYmd(d).getDate()}</b></button>`).join("")}</div></div>
        <div class="field"><span>الوقت المتاح</span><div class="slots">${sl.length ? sl.map((t) => `<button type="button" class="slot ${t === state.time ? "on" : ""}" data-t="${t}">${esc(fmtTime(t))}</button>`).join("") : `<span class="muted">لا توجد أوقات متاحة في هذا اليوم</span>`}</div></div>
        ${field("الاسم الكامل", "name", { required: true, attrs: 'maxlength="70" autocomplete="name"' })}
        ${field("رقم الجوال", "phone", { required: true, attrs: 'dir="ltr" inputmode="tel" maxlength="16" autocomplete="tel"' })}
        ${field("ملاحظة (اختياري)", "note", { type: "textarea", attrs: 'maxlength="280" data-novoice' })}
        <button class="btn primary block" type="submit">إرسال طلب الحجز</button>
        <p class="muted small">ستتواصل معك العيادة لتأكيد الموعد.</p>
      </form>`}
      <div class="powered">${platformMark(18)} <span>الحجز عبر منصة ${esc(PLATFORM())}</span></div>
    </div>`;
    const f = $("#bk");
    if (!f) return;
    f.doctorId?.addEventListener("change", () => { state.doctorId = f.doctorId.value; state.time = null; draw(); });
    f.service?.addEventListener("change", () => { state.service = f.service.value; });
    $$(".day").forEach((b) => b.onclick = () => { state.date = b.dataset.d; state.time = null; draw(); });
    $$(".slot").forEach((b) => b.onclick = () => { state.time = b.dataset.t; $$(".slot").forEach((x) => x.classList.toggle("on", x === b)); });
    f.onsubmit = async (e) => {
      e.preventDefault();
      if (!state.time) return toast("اختر الوقت", true);
      const phone = normPhone(f.phone.value);
      if (phone.length < 9) return toast("رقم الجوال غير صحيح", true);
      const btn = f.querySelector("[type=submit]"); btn.disabled = true;
      try {
        await addDoc(P.col("publicRequests", cid), {
          name: f.name.value.trim().slice(0, 70), phone, date: state.date, time: state.time, doctorId: state.doctorId,
          service: f.service?.value || "", note: f.note.value.trim().slice(0, 280), status: "new", createdAt: serverTimestamp()
        });
        root().innerHTML = `<div class="center-page"><div class="card narrow stack center">
          ${logoHtml(pub, 72)}<h2>تم إرسال طلبك</h2>
          <p>${esc(fmtDate(state.date))} · الساعة ${esc(fmtTime(state.time))}</p>
          <p class="muted">ستتواصل معك ${esc(pub.name)} لتأكيد الموعد.</p>
          <a class="btn" href="#/b/${esc(slug)}">حجز موعد آخر</a></div></div>`;
      } catch (err) {
        btn.disabled = false;
        toast(err?.code?.includes("permission") ? "الحجز غير متاح حالياً، يرجى الاتصال بالعيادة" : errMsg(err), true);
      }
    };
  };
  draw();
}

// ---------- التحقق من الوصفة ----------
export async function verifyPage(code) {
  root().innerHTML = `<div class="center-page"><div class="loading">جارٍ التحقق…</div></div>`;
  const r = code ? await one(P.rxVerify(code)).catch(() => null) : null;
  applyBrand({ accent: r?.accent || "#0E7C7B" });
  root().innerHTML = `<div class="center-page"><div class="card narrow stack">
    ${r ? `<div class="verify ok"><span>✓</span><h2>وصفة صحيحة</h2></div>
      <table class="kv">
        <tr><th>العيادة</th><td>${esc(r.clinicName)}</td></tr>
        <tr><th>الطبيب</th><td>${esc(r.doctorName)}</td></tr>
        <tr><th>التاريخ</th><td>${esc(fmtDate(r.date, false))}</td></tr>
        <tr><th>المريض</th><td>${esc(r.patient)}</td></tr>
      </table>
      <h4>الأدوية</h4>
      <ol class="rx-items">${(r.items || []).map((i) => `<li><b>${esc(i.drug)}</b> ${esc(i.dose || "")}${i.days ? ` · ${esc(i.days)} يوم` : ""}</li>`).join("")}</ol>`
    : `<div class="verify bad"><span>!</span><h2>رمز غير صالح</h2></div><p>لم يُعثر على وصفة بهذا الرمز. تواصل مع العيادة المصدرة.</p>`}
    <div class="powered">${platformMark(18)} <span>تحقق عبر منصة ${esc(PLATFORM())}</span></div>
  </div></div>`;
}
