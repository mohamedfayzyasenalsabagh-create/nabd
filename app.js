// نقطة البداية: الصفحات العامة، الدخول، والتوجيه لكل دور
import {
  configured, auth, P, one, login, onAuthStateChanged, signOut, setClinic, C,
  updatePassword, sendPasswordResetEmail, updateDoc, setActor, onSnapshot, audit, pickBrand, DEFAULT_PLANS
} from "./fb.js";
import { COPYRIGHT, $, esc, toast, errMsg, field, logoHtml, info, applyTheme, platformMark } from "./ui.js";

export const S = { user: null, profile: null, pub: null, clinic: null, platform: null, unsub: [], owner: false };
const root = () => $("#app");
const LS = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};
export { LS };
export const PLATFORM = () => S.platform?.name || "نبض";

export function applyBrand(pub) {
  S.pub = pub || {};
  const accent = S.pub.accent || "#0E7C7B";
  document.documentElement.style.setProperty("--accent", accent);
  document.title = S.pub.name || PLATFORM();
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = accent;
}

const hashParts = () => location.hash.replace(/^#\/?/, "").split(/[/?]/);
const PUBLIC_ROUTES = ["b", "v", "privacy", "terms", "doctors"];

async function boot() {
  applyTheme(LS.get("theme") || "auto");
  if (!configured) {
    root().innerHTML = `<div class="center-page"><div class="card narrow">
      <h2>تحتاج المنصة إلى إعدادات Firebase</h2>
      <p>افتح ملف <b>config.js</b> والصق إعدادات مشروع Firebase وفق دليل التشغيل.</p></div></div>`;
    return;
  }
  try { S.platform = (await one(P.platform())) || { name: "نبض", plans: DEFAULT_PLANS }; }
  catch { S.platform = { name: "نبض", plans: DEFAULT_PLANS }; }
  window.addEventListener("hashchange", () => { if (!S.user || PUBLIC_ROUTES.includes(hashParts()[0])) publicRoute(); });
  onAuthStateChanged(auth, onUser);
}

let busy = false;
export function holdAuth(v) { busy = v; }

async function onUser(user) {
  if (busy) return;
  S.unsub.forEach((u) => { try { u(); } catch {} });
  S.unsub = [];
  S.user = user;
  S.owner = false;
  if (PUBLIC_ROUTES.includes(hashParts()[0])) return publicRoute();
  if (!user) return publicRoute();

  // المالك
  const own = await one(P.owner(user.uid)).catch(() => null);
  if (own) {
    S.owner = true;
    S.profile = { role: "owner", name: own.name, email: own.email };
    setActor({ uid: user.uid, name: own.name || own.email });
    const m = await import("./owner.js");
    return m.start();
  }

  let prof = null;
  try { prof = await one(P.user(user.uid)); } catch (e) { console.error(e); }
  if (!prof) { await signOut(auth); return showLogin("لم يُعثر على الحساب"); }
  if (!prof.active) {
    await signOut(auth);
    return showLogin("هذا الحساب موقوف. إذا حصلت على كلمة مرور جديدة فاستخدمها.");
  }
  S.profile = prof;
  setClinic(prof.clinicId);
  LS.set("clinic", prof.clinicId);
  try { applyBrand(await one(P.pub())); } catch {}
  setActor({ uid: user.uid, name: prof.name || prof.phone });
  if (prof.mustChangePassword) return showChangePassword(true);
  route();
}

// الصفحات دون تسجيل دخول
async function publicRoute() {
  const [r, arg] = hashParts();
  const pub = await import("./public.js");
  if (r === "b") return pub.bookingPage(arg);
  if (r === "v") return pub.verifyPage(arg);
  if (r === "doctors") return pub.directoryPage();
  if (r === "privacy" || r === "terms") return (await import("./legal.js")).legalPage(r);
  if (S.user) return onUser(S.user);
  if (r === "owner") return pub.ownerLogin();
  if (r === "signup") return pub.signupPage();
  if (r === "c" && arg) return openClinic(arg);
  if (r === "home") return pub.landing();
  const last = LS.get("clinic");
  if (last) {
    const p = await one(P.pub(last)).catch(() => null);
    if (p) { setClinic(last); applyBrand(p); return showLogin(); }
  }
  return pub.landing();
}

export async function openClinic(slugOrId) {
  const s = await one(P.slug(String(slugOrId).toLowerCase())).catch(() => null);
  const cid = s?.cid || slugOrId;
  const p = await one(P.pub(cid)).catch(() => null);
  if (!p) {
    const pub = await import("./public.js");
    pub.landing();
    toast("لم يُعثر على العيادة، تأكد من الرابط", true);
    return;
  }
  setClinic(cid);
  LS.set("clinic", cid);
  applyBrand(p);
  history.replaceState(null, "", location.pathname);
  showLogin();
}

export async function route() {
  const prof = S.profile;
  S.unsub.forEach((u) => { try { u(); } catch {} });
  S.unsub = [];
  if (prof.role === "patient") {
    const m = await import("./patient.js");
    if (!prof.consentAt) return m.showConsent();
    return m.start();
  }
  let first = true;
  await new Promise((resolve) => {
    S.unsub.push(onSnapshot(P.clinic(), (s) => {
      S.clinic = s.data() || {};
      applyBrand({ ...S.pub, ...pickBrand(S.clinic) });
      if (first) { first = false; resolve(); }
      else window.dispatchEvent(new Event("clinic-updated"));
    }, () => { if (first) { first = false; resolve(); } }));
  });
  startIdleTimer();
  const m = await import("./staff.js");
  m.start();
}

// ---------- شاشة الدخول ----------
export function showLogin(msg = "") {
  let kind = "p";
  const render = () => {
    root().innerHTML = `<div class="center-page login-page">
      <div class="brand-block">
        ${logoHtml(S.pub, 96)}
        <h1>${esc(S.pub.doctorName ? "د. " + S.pub.doctorName : S.pub.name || PLATFORM())}</h1>
        <p>${esc(S.pub.title || "")}</p>
      </div>
      <div class="card narrow">
        <div class="seg" role="tablist">
          <button role="tab" class="${kind === "p" ? "on" : ""}" data-k="p" aria-selected="${kind === "p"}">دخول المريض</button>
          <button role="tab" class="${kind === "s" ? "on" : ""}" data-k="s" aria-selected="${kind === "s"}">فريق العيادة</button>
        </div>
        <form id="lf" class="stack">
          ${field(kind === "p" ? "رقم الجوال" : "رقم الجوال أو البريد الإلكتروني", "id", { required: true, attrs: `inputmode="${kind === "p" ? "tel" : "text"}" autocomplete="username" dir="ltr"`, placeholder: "09xxxxxxxx" })}
          ${field("كلمة المرور", "pw", { type: "password", required: true, attrs: 'autocomplete="current-password" dir="ltr"' })}
          ${msg ? `<div class="alert">${esc(msg)}</div>` : ""}
          <button class="btn primary block" type="submit">دخول</button>
          <button class="link-btn forgot" type="button">نسيت كلمة المرور؟</button>
        </form>
      </div>
      ${S.pub.bookingEnabled && S.pub.slug ? `<a class="btn ghost" href="#/b/${esc(S.pub.slug)}">احجز موعداً دون حساب</a>` : ""}
      <p class="muted small">${esc(S.pub.address || "")} ${S.pub.phone ? `· <span dir="ltr">${esc(S.pub.phone)}</span>` : ""}</p>
      <button class="link-btn small other">ليست عيادتك؟ اختر عيادة أخرى</button>
      <div class="powered">${platformMark(18)} <span>بإدارة منصة ${esc(PLATFORM())}</span></div>
      <p class="muted small legal-links"><a href="#/privacy">سياسة الخصوصية</a> · <a href="#/terms">شروط الاستخدام</a></p>
      <p class="copyright">${esc(COPYRIGHT)}</p>
    </div>`;
    root().querySelectorAll(".seg button").forEach((b) => b.onclick = () => { kind = b.dataset.k; msg = ""; render(); });
    $("#lf").onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("[type=submit]");
      btn.disabled = true; btn.textContent = "يرجى الانتظار…";
      try { await login(e.target.id.value, e.target.pw.value, kind); }
      catch (err) { msg = errMsg(err); render(); }
    };
    $(".other").onclick = () => { LS.set("clinic", null); setClinic(null); location.hash = "#/home"; };
    $(".forgot").onclick = async () => {
      const v = $("#lf").id.value.trim();
      if (kind === "s" && v.includes("@")) {
        try { await sendPasswordResetEmail(auth, v); toast("أُرسل رابط تغيير كلمة المرور إلى بريدك الإلكتروني"); }
        catch (e) { toast(errMsg(e), true); }
        return;
      }
      info("نسيت كلمة المرور", kind === "p"
        ? `<p>تواصل مع العيادة للحصول على كلمة مرور جديدة.</p>${S.pub.phone ? `<p>هاتف العيادة: <b dir="ltr">${esc(S.pub.phone)}</b></p><p><a class="btn primary" href="tel:${esc(S.pub.phone)}">اتصال بالعيادة</a></p>` : ""}`
        : `<p>الموظفون والأطباء: يمنحك مسؤول العيادة كلمة مرور جديدة من قسم الفريق.</p><p>مسؤول العيادة: اكتب بريدك الإلكتروني في خانة الدخول ثم اضغط «نسيت كلمة المرور» ليصلك رابط التغيير.</p>`);
    };
  };
  render();
}

// ---------- تغيير كلمة المرور ----------
export function showChangePassword(forced = false) {
  root().innerHTML = `<div class="center-page"><form id="cp" class="card narrow stack">
    <h2>${forced ? "مرحباً بك! اختر كلمة مرور جديدة" : "تغيير كلمة المرور"}</h2>
    <p class="muted">${forced ? "يجب تغيير كلمة المرور المؤقتة قبل المتابعة." : ""}</p>
    ${field("كلمة المرور الجديدة", "p1", { type: "password", required: true, attrs: 'minlength="6" dir="ltr" autocomplete="new-password"' })}
    ${field("تأكيدها", "p2", { type: "password", required: true, attrs: 'minlength="6" dir="ltr" autocomplete="new-password"' })}
    <button class="btn primary block" type="submit">حفظ</button>
    ${forced ? `<button class="link-btn out" type="button">خروج</button>` : `<button class="link-btn back" type="button">رجوع</button>`}
  </form></div>`;
  $("#cp").onsubmit = async (e) => {
    e.preventDefault();
    const { p1, p2 } = e.target;
    if (p1.value !== p2.value) return toast("كلمتا المرور غير متطابقتين", true);
    try {
      await updatePassword(auth.currentUser, p1.value);
      if (S.profile.role !== "owner") await updateDoc(P.user(auth.currentUser.uid), { mustChangePassword: false });
      S.profile.mustChangePassword = false;
      toast("تم تغيير كلمة المرور");
      if (S.owner) return onUser(auth.currentUser);
      route();
    } catch (err) {
      if (err.code === "auth/requires-recent-login") toast("لأسباب أمنية، سجّل الخروج ثم الدخول مجدداً، ثم غيّر كلمة المرور", true);
      else toast(errMsg(err), true);
    }
  };
  $(".out")?.addEventListener("click", logout);
  $(".back")?.addEventListener("click", () => (S.owner ? onUser(auth.currentUser) : route()));
}

export async function logout() {
  if (S.profile && !S.owner) { try { await audit("تسجيل خروج"); } catch {} }
  window.onhashchange = null;
  try { window.AndroidApp?.setReminders?.("[]"); } catch {}
  await signOut(auth);
  history.replaceState(null, "", location.pathname);
}

// خروج تلقائي لحسابات الفريق بعد 30 دقيقة دون استخدام
let idleT, idleOn = false;
function startIdleTimer() {
  const reset = () => {
    clearTimeout(idleT);
    idleT = setTimeout(() => { if (S.profile && S.profile.role !== "patient") { toast("تم تسجيل الخروج تلقائياً"); logout(); } }, 30 * 60 * 1000);
  };
  if (!idleOn) {
    ["click", "keydown", "touchstart", "scroll"].forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    idleOn = true;
  }
  reset();
}

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
boot();
