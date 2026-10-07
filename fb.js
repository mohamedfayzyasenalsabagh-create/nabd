// طبقة Firebase للمنصة: الاتصال، الحسابات، العيادات، والاشتراكات
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  onAuthStateChanged, updatePassword, sendPasswordResetEmail, setPersistence,
  inMemoryPersistence
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, getDocs,
  onSnapshot, serverTimestamp, arrayUnion, arrayRemove, runTransaction, writeBatch, limit, orderBy, Timestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig, USE_STORAGE } from "./config.js";

export const configured = !String(firebaseConfig.apiKey).startsWith("PASTE");

export const app = configured ? initializeApp(firebaseConfig) : null;
export const auth = configured ? getAuth(app) : null;
export const db = configured
  ? initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })
  : null;

export {
  doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, getDocs, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove, runTransaction, writeBatch, limit, orderBy, Timestamp,
  onAuthStateChanged, signOut, updatePassword, sendPasswordResetEmail
};

// العيادة الحالية (تتحدد بعد الدخول أو من رابط العيادة)
export let C = null;
export function setClinic(cid) { C = cid; }

// ---------- مسارات ----------
export const P = {
  platform: () => doc(db, "platform", "config"),
  bootstrap: () => doc(db, "platform", "bootstrap"),
  owner: (uid) => doc(db, "owners", uid),
  clinics: () => collection(db, "clinics"),
  clinic: (cid = C) => doc(db, "clinics", cid),
  pub: (cid = C) => doc(db, "publicClinics", cid),
  slug: (s) => doc(db, "slugs", s),
  subPays: () => collection(db, "subscriptionPayments"),
  subPay: (id) => doc(db, "subscriptionPayments", id),
  rxVerify: (code) => doc(db, "rxVerify", code),
  user: (uid) => doc(db, "users", uid),
  users: () => collection(db, "users"),
  phone: (ph) => doc(db, "clinics", C, "phones", ph),
  patients: () => collection(db, "clinics", C, "patients"),
  patient: (pid) => doc(db, "clinics", C, "patients", pid),
  sub: (pid, name) => collection(db, "clinics", C, "patients", pid, name),
  subDoc: (pid, name, id) => doc(db, "clinics", C, "patients", pid, name, id),
  col: (name, cid = C) => collection(db, "clinics", cid, name),
  colDoc: (name, id, cid = C) => doc(db, "clinics", cid, name, id),
};

// ---------- الباقات والاختصاصات ----------
export const SPECIALTIES = {
  obgyn: { name: "نسائية وتوليد", modules: ["preg", "gyn", "cosm"] },
  dental: { name: "طب الأسنان", modules: ["dental"] },
  peds: { name: "أطفال", modules: ["peds"] },
  derm: { name: "جلدية وتجميل", modules: ["cosm"] },
  internal: { name: "باطنية", modules: ["chronic"] },
  cardio: { name: "قلبية", modules: ["chronic"] },
  ortho: { name: "عظمية", modules: ["physio"] },
  physio: { name: "علاج فيزيائي", modules: ["physio"] },
  eye: { name: "عينية", modules: ["eye"] },
  ent: { name: "أنف وأذن وحنجرة", modules: [] },
  uro: { name: "بولية", modules: ["chronic"] },
  psych: { name: "نفسية", modules: [] },
  nutrition: { name: "تغذية", modules: ["chronic"] },
  general: { name: "طب عام", modules: ["chronic"] },
};
export const MODULES = {
  preg: "متابعة الحمل",
  gyn: "التاريخ النسائي والعقم",
  cosm: "الإجراءات والجلسات التجميلية",
  dental: "الأسنان وخطط العلاج",
  peds: "النمو واللقاحات",
  chronic: "المؤشرات الحيوية والأمراض المزمنة",
  physio: "باقات الجلسات والتمارين",
  eye: "فحص النظر والوصفات",
};
export const DEFAULT_PLANS = [
  { id: "basic", name: "أساسي", price: 15, currency: "$", maxDoctors: 1, maxStaff: 1,
    features: { booking: false, inventory: false, qr: false, multiDoctor: false, multiSpecialty: false },
    perks: ["طبيب واحد وسكرتيرة واحدة", "المواعيد والسجلات الطبية", "تطبيق المرضى", "وحدة الاختصاص"] },
  { id: "pro", name: "احترافي", price: 30, currency: "$", maxDoctors: 3, maxStaff: 3,
    features: { booking: true, inventory: true, qr: true, multiDoctor: true, multiSpecialty: false },
    perks: ["حتى 3 أطباء و3 موظفين", "صفحة حجز عامة", "المخزون", "وصفة برمز QR", "كل ميزات الأساسي"] },
  { id: "center", name: "مراكز طبية", price: 60, currency: "$", maxDoctors: 50, maxStaff: 50,
    features: { booking: true, inventory: true, qr: true, multiDoctor: true, multiSpecialty: true },
    perks: ["أطباء وموظفون بلا حدود عملياً", "عدة اختصاصات في مركز واحد", "كل ميزات الاحترافي", "دعم مخصص"] },
];
export const TRIAL_DAYS = 14;
export const CITIES = ["دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس", "إدلب", "درعا", "السويداء", "القنيطرة", "دير الزور", "الرقة", "الحسكة"];
export const ALL_FEATURES = { booking: true, inventory: true, qr: true, multiDoctor: true, multiSpecialty: true };
// التجربة المجانية: كل الميزات ما عدا تعدد الاختصاصات (خاص بباقة المراكز الطبية)
export const TRIAL_FEATURES = { ...ALL_FEATURES, multiSpecialty: false };

// ---------- أرقام وإيميلات الدخول ----------
export function normPhone(v) {
  let d = String(v || "").replace(/[^\d٠-٩]/g, "")
    .replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c));
  if (d.startsWith("00963")) d = "0" + d.slice(5);
  else if (d.startsWith("963")) d = "0" + d.slice(3);
  else if (d.length === 9 && d.startsWith("9")) d = "0" + d;
  return d;
}
export const loginEmail = (phone, kind, ver = 1, cid = C) =>
  `${kind}${phone}${ver > 1 ? "-" + ver : ""}@clinic-${cid}.app`;
export const MAX_VER = 5;

export function genPassword() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(10000000 + (a[0] % 90000000));
}
export function randId(n = 10) {
  const abc = "abcdefghijkmnpqrstuvwxyz23456789";
  const a = new Uint32Array(n);
  crypto.getRandomValues(a);
  return [...a].map((x) => abc[x % abc.length]).join("");
}
export const cleanSlug = (s) => String(s || "").toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 30);

// حساب ثانوي لإنشاء حسابات جديدة دون خروج المستخدم الحالي
let secondary = null;
async function secondaryAuth() {
  if (!secondary) {
    const sApp = initializeApp(firebaseConfig, "secondary");
    secondary = getAuth(sApp);
    await setPersistence(secondary, inMemoryPersistence);
  }
  return secondary;
}
async function createAuthAt(phone, kind, password, startVer = 1) {
  const sa = await secondaryAuth();
  for (let v = startVer; v <= MAX_VER; v++) {
    try {
      const cred = await createUserWithEmailAndPassword(sa, loginEmail(phone, kind, v), password);
      const uid = cred.user.uid;
      await signOut(sa);
      return { uid, ver: v };
    } catch (e) {
      if (e.code !== "auth/email-already-in-use") throw e;
    }
  }
  throw new Error("بلغ هذا الرقم الحد الأقصى لإعادة التعيين. يرجى التواصل مع الدعم.");
}


// ---------- فهرس الدخول الموحد ----------
// يربط (رقم الجوال + كلمة المرور) بالعيادة دون كشف أي منهما: المفتاح بصمة مشفّرة بطيئة
// فلا يستطيع أحد معرفة عيادة رقمٍ ما إلا إذا كان يعرف كلمة مروره أصلاً.
async function idxKey(phone, pw) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(String(pw)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode("nabd-login|" + phone), iterations: 60000, hash: "SHA-256" }, base, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function saveLoginIdx(phone, pw, cid, kind) {
  try { await setDoc(doc(db, "loginIdx", await idxKey(phone, pw)), { e: arrayUnion(`${cid}|${kind}`) }, { merge: true }); } catch (e) { console.warn("idx", e); }
}
export async function dropLoginIdx(phone, pw, cid, kind) {
  try { await updateDoc(doc(db, "loginIdx", await idxKey(phone, pw)), { e: arrayRemove(`${cid}|${kind}`) }); } catch {}
}
async function findLogins(phone, pw) {
  try { const d = await getDoc(doc(db, "loginIdx", await idxKey(phone, pw))); return d.exists() ? (d.data().e || []) : []; } catch { return []; }
}
async function tryPhone(phone, pw, cid, kind) {
  let lastErr = null;
  for (let v = 1; v <= MAX_VER; v++) {
    try { return (await signInWithEmailAndPassword(auth, loginEmail(phone, kind, v, cid), pw)).user; }
    catch (e) { lastErr = e; if (e.code === "auth/too-many-requests" || e.code === "auth/network-request-failed") throw e; }
  }
  throw lastErr || new Error("login failed");
}
export let lastLogin = null; // {phone, pw, cid, kind} لتحديث الفهرس بعد تغيير كلمة المرور

// دخول موحد: بريد إلكتروني أو رقم جوال، دون رمز عيادة ودون اختيار نوع الحساب
// pick(choices) تُستدعى إذا كان الرقم نفسه مسجلاً في أكثر من عيادة أو بأكثر من صفة
export async function smartLogin(idText, password, pick) {
  const id = String(idText || "").trim();
  if (id.includes("@")) return (await signInWithEmailAndPassword(auth, id, password)).user;
  const phone = normPhone(id);
  if (phone.length < 9) throw new Error("رقم الجوال غير صحيح");
  let cands = await findLogins(phone, password);
  if (cands.length > 1 && pick) {
    const chosen = await pick(cands.map((e) => { const [cid, kind] = e.split("|"); return { cid, kind }; }));
    if (!chosen) throw new Error("أُلغي الدخول");
    cands = [`${chosen.cid}|${chosen.kind}`];
  }
  if (!cands.length && C) cands = [`${C}|p`, `${C}|s`];
  let lastErr = null;
  for (const e of cands) {
    const [cid, kind] = e.split("|");
    try {
      const u = await tryPhone(phone, password, cid, kind);
      lastLogin = { phone, pw: password, cid, kind };
      saveLoginIdx(phone, password, cid, kind);
      return u;
    } catch (err) { lastErr = err; if (err.code === "auth/too-many-requests" || err.code === "auth/network-request-failed") break; }
  }
  if (!cands.length || (lastErr && ["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password", "auth/invalid-login-credentials"].includes(lastErr.code)))
    throw new Error("رقم الجوال أو كلمة المرور غير صحيحة");
  throw lastErr || new Error("رقم الجوال أو كلمة المرور غير صحيحة");
}

// ---------- الدخول ----------
export async function login(idText, password, kind) {
  const id = String(idText || "").trim();
  if (id.includes("@")) return (await signInWithEmailAndPassword(auth, id, password)).user;
  if (!C) throw new Error("اختاري العيادة أولاً");
  const phone = normPhone(id);
  if (phone.length < 9) throw new Error("رقم الجوال غير صحيح");
  let lastErr = null;
  for (let v = 1; v <= MAX_VER; v++) {
    try {
      return (await signInWithEmailAndPassword(auth, loginEmail(phone, kind, v), password)).user;
    } catch (e) {
      lastErr = e;
      if (e.code === "auth/too-many-requests" || e.code === "auth/network-request-failed") break;
    }
  }
  throw lastErr || new Error("login failed");
}

// ---------- سجل التعديلات ----------
let currentActor = { uid: null, name: "" };
export function setActor(a) { currentActor = a; }
export async function audit(action, target = "") {
  try {
    await addDoc(P.col("audit"), { at: serverTimestamp(), by: currentActor.uid, byName: currentActor.name, action, target });
  } catch (e) { console.warn("audit", e); }
}

// ---------- إعدادات افتراضية ----------
export function defaultHours() {
  const h = {};
  for (let d = 0; d < 7; d++) h[d] = { on: d !== 5, from: "10:00", to: "17:00" };
  return h;
}
export function defaultServices(spec) {
  const base = [
    { id: "kashf", name: "معاينة", price: 0, duration: 20, kind: "general" },
    { id: "review", name: "مراجعة", price: 0, duration: 15, kind: "general" },
  ];
  const extra = {
    obgyn: [{ id: "echo", name: "إيكو", price: 0, duration: 20, kind: "general" }, { id: "preg", name: "متابعة حمل", price: 0, duration: 20, kind: "general" }, { id: "cosm", name: "استشارة تجميلية", price: 0, duration: 30, kind: "cosmetic" }],
    dental: [{ id: "fill", name: "حشوة", price: 0, duration: 30, kind: "general" }, { id: "rct", name: "معالجة لبية", price: 0, duration: 45, kind: "general" }, { id: "clean", name: "تنظيف", price: 0, duration: 30, kind: "general" }, { id: "ext", name: "قلع", price: 0, duration: 30, kind: "general" }, { id: "crown", name: "تتويج", price: 0, duration: 45, kind: "general" }, { id: "implant", name: "زرع", price: 0, duration: 60, kind: "general" }],
    peds: [{ id: "vac", name: "لقاح", price: 0, duration: 10, kind: "general" }, { id: "growth", name: "متابعة نمو", price: 0, duration: 15, kind: "general" }],
    derm: [{ id: "session", name: "جلسة", price: 0, duration: 30, kind: "cosmetic" }, { id: "consult", name: "استشارة تجميلية", price: 0, duration: 20, kind: "cosmetic" }],
    eye: [{ id: "exam", name: "فحص نظر", price: 0, duration: 20, kind: "general" }],
    physio: [{ id: "session", name: "جلسة علاج", price: 0, duration: 45, kind: "general" }],
    ortho: [{ id: "session", name: "جلسة علاج", price: 0, duration: 45, kind: "general" }],
  };
  return [...base, ...(extra[spec] || [])];
}
export const DEFAULT_VACCINES = [
  { id: "v0", name: "BCG + التهاب الكبد B + شلل فموي (جرعة الولادة)", months: 0 },
  { id: "v2", name: "الخماسي + شلل الأطفال + المكورات الرئوية + الروتا (1)", months: 2 },
  { id: "v4", name: "الخماسي + شلل الأطفال + المكورات الرئوية + الروتا (2)", months: 4 },
  { id: "v6", name: "الخماسي + شلل الأطفال + المكورات الرئوية (3)", months: 6 },
  { id: "v9", name: "الحصبة", months: 9 },
  { id: "v12", name: "الحصبة والنكاف والحصبة الألمانية (MMR 1)", months: 12 },
  { id: "v18", name: "الجرعات الداعمة + MMR 2", months: 18 },
  { id: "v72", name: "جرعة المدرسة الداعمة", months: 72 },
];

export function pickBrand(c = {}) {
  const { name, doctorName, title, address, phone, accent, logo, specialty, slug } = c;
  const email = c.email ?? c.ownerEmail ?? "";
  return { name, doctorName, title, address, phone, email, accent, logo, specialty, slug };
}
export function publicCopy(c) {
  return {
    ...pickBrand(c),
    hours: c.hours || defaultHours(),
    slotMinutes: c.slotMinutes || 20,
    services: (c.services || []).map(({ name, duration, price }) => ({ name, duration, price: c.showPrices ? price : null })),
    doctors: (c.doctors || []).filter((d) => d.active !== false).map(({ id, name, title, spec }) => ({ id, name, title: title || "", spec: spec || "" })),
    // اختصاصات أطباء المركز (للبحث في دليل الأطباء)
    specialties: [...new Set([c.specialty, ...(c.doctors || []).filter((d) => d.active !== false).map((d) => d.spec)].filter(Boolean))],
    bookingEnabled: !!c.bookingEnabled,
    mapUrl: c.mapUrl || "",
    // دليل الأطباء
    listed: !!c.listed,
    city: c.city || "",
  };
}

// ---------- تسجيل عيادة جديدة (تجربة مجانية) ----------
export async function signupClinic(f) {
  const slug = cleanSlug(f.slug);
  if (slug.length < 3) throw new Error("رابط العيادة يجب أن يتكون من 3 أحرف لاتينية على الأقل");
  const taken = await getDoc(P.slug(slug));
  if (taken.exists()) throw new Error("رابط العيادة مستخدم، اختاري رابطاً آخر");
  const cred = await createUserWithEmailAndPassword(auth, f.email.trim(), f.password);
  const uid = cred.user.uid;
  const cid = randId(10);
  const doctorId = "d" + randId(6);
  const spec = SPECIALTIES[f.specialty] ? f.specialty : "general";
  const expires = Timestamp.fromMillis(Date.now() + TRIAL_DAYS * 864e5);
  const clinic = {
    name: f.clinicName.trim(), doctorName: f.doctorName.trim(), title: f.title.trim(),
    address: f.address || "", phone: normPhone(f.clinicPhone) || "", accent: f.accent || "#0E7C7B", logo: null,
    specialty: spec, modules: SPECIALTIES[spec].modules, slug,
    currency: "ل.س", slotMinutes: 20, hours: defaultHours(), services: defaultServices(spec),
    doctors: [{ id: doctorId, uid, name: f.doctorName.trim(), title: f.title.trim(), active: true }],
    rxFooter: "يجب مراسلة العيادة من خلال التطبيق عند ظهور أي أعراض جانبية.", city: CITIES.includes(f.city) ? f.city : "", listed: !!f.listed, bookingEnabled: !!f.listed, showPrices: false,
    status: "trial", plan: "trial", expiresAt: expires, features: TRIAL_FEATURES, maxDoctors: 3, maxStaff: 3,
    ownerUid: uid, ownerEmail: f.email.trim(), ownerPhone: normPhone(f.phone), createdAt: serverTimestamp()
  };
  const b = writeBatch(db);
  b.set(P.user(uid), {
    role: "doctor", admin: true, doctorId, clinicId: cid, name: f.doctorName.trim(), phone: normPhone(f.phone),
    email: f.email.trim(), active: true, mustChangePassword: false, ver: 1, createdAt: serverTimestamp()
  });
  b.set(P.clinic(cid), clinic);
  b.set(P.pub(cid), publicCopy(clinic));
  b.set(P.slug(slug), { cid });
  await b.commit();
  setClinic(cid);
  return { uid, cid, slug };
}

// ---------- المالك ----------
export async function bootstrapOwner(email, password, name) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const uid = cred.user.uid;
  const b = writeBatch(db);
  b.set(P.owner(uid), { email: email.trim(), name, createdAt: serverTimestamp() });
  b.set(P.platform(), {
    name: "نبض", plans: DEFAULT_PLANS, trialDays: TRIAL_DAYS,
    payment: { syriatel: "", mtn: "", bank: "", whatsapp: "", notes: "بعد الدفع أدخلي رقم العملية ليتم تفعيل اشتراكك خلال ساعات." },
    updatedAt: serverTimestamp()
  });
  b.set(P.bootstrap(), { done: true, at: serverTimestamp() });
  await b.commit();
  return uid;
}

// ---------- المرضى ----------
export async function registerPatient(data) {
  const phone = data.phone ? normPhone(data.phone) : "";
  if (phone && phone.length < 9) throw new Error("رقم الجوال غير صحيح");
  if (!phone && !data.noAccount) throw new Error("رقم الجوال غير صحيح");
  const pRef = doc(P.patients());
  const pid = pRef.id;
  // بدون حساب: يُحفظ الملف فقط، ويمكن إنشاء الحساب لاحقاً من بطاقة المريض
  if (data.noAccount) {
    await setDoc(pRef, {
      name: data.name.trim(), phone, age: data.age ? Number(data.age) : null, dob: data.dob || null,
      sex: data.sex || "", address: data.address || "", bloodType: data.bloodType || "", guardian: !!data.guardian, doctorIds: data.doctorIds || [], uid: null, noAccount: true,
      archived: false, createdAt: serverTimestamp(), createdBy: currentActor.uid
    });
    await audit("تسجيل مريض جديد (دون حساب)", data.name);
    return { pid, tempPassword: null, shared: false, phone, noAccount: true };
  }
  const phRef = P.phone(phone);
  const ph = await getDoc(phRef);
  let tempPassword = null, uid, shared = false;
  const b = writeBatch(db);
  if (ph.exists() && ph.data().patientUid) {
    uid = ph.data().patientUid;
    b.update(P.user(uid), { patientIds: arrayUnion(pid), lastPid: pid });
    shared = true;
  } else {
    tempPassword = genPassword();
    const r = await createAuthAt(phone, "p", tempPassword, (ph.exists() && ph.data().patientVer ? ph.data().patientVer + 1 : 1));
    saveLoginIdx(phone, tempPassword, C, "p");
    uid = r.uid;
    b.set(P.user(uid), {
      role: "patient", clinicId: C, phone, patientIds: [pid], active: true,
      mustChangePassword: true, ver: r.ver, hideSensitive: false, createdAt: serverTimestamp()
    });
    b.set(phRef, { patientUid: uid, patientVer: r.ver }, { merge: true });
  }
  // الحساب والملف يُكتبان معاً لتتحقق القواعد من تطابق رقم الجوال
  b.set(pRef, {
    name: data.name.trim(), phone, age: data.age ? Number(data.age) : null, dob: data.dob || null,
    sex: data.sex || "", address: data.address || "", bloodType: data.bloodType || "", guardian: !!data.guardian, doctorIds: data.doctorIds || [], uid,
    archived: false, createdAt: serverTimestamp(), createdBy: currentActor.uid
  });
  await b.commit();
  await audit("تسجيل مريض جديد", data.name);
  return { pid, tempPassword, shared, phone };
}

export async function resetPatientPassword(phone) {
  const ph = await getDoc(P.phone(phone));
  if (!ph.exists() || !ph.data().patientUid) throw new Error("لا يوجد حساب لهذا الرقم");
  const oldUid = ph.data().patientUid;
  const old = await getDoc(P.user(oldUid));
  const temp = genPassword();
  const r = await createAuthAt(phone, "p", temp, (ph.data().patientVer || 1) + 1);
  saveLoginIdx(phone, temp, C, "p");
  const od = old.data();
  await setDoc(P.user(r.uid), {
    role: "patient", clinicId: C, phone, patientIds: od.patientIds || [], active: true,
    mustChangePassword: true, ver: r.ver, hideSensitive: !!od.hideSensitive,
    consentAt: od.consentAt || null, createdAt: serverTimestamp()
  });
  await updateDoc(P.user(oldUid), { active: false });
  await setDoc(P.phone(phone), { patientUid: r.uid, patientVer: r.ver }, { merge: true });
  for (const pid of od.patientIds || []) await updateDoc(P.patient(pid), { uid: r.uid });
  await audit("إعادة تعيين كلمة مرور مريض", phone);
  return temp;
}

// تغيير رقم جوال المريض (عند إدخاله خطأً): ينتقل حسابه إلى الرقم الجديد
export async function changePatientPhone(pid, oldPhone, newPhoneRaw, create = false) {
  const phone = normPhone(newPhoneRaw);
  if (phone.length < 9) throw new Error("رقم الجوال غير صحيح");
  if (phone === oldPhone && !create) throw new Error("الرقم الجديد مطابق للرقم الحالي");
  const pRef = P.patient(pid);
  const pat = (await getDoc(pRef)).data() || {};
  const oldUid = pat.uid;
  const newRef = P.phone(phone);
  const nph = await getDoc(newRef);
  let uid, temp = null, shared = false;
  const b = writeBatch(db);
  if (nph.exists() && nph.data().patientUid) {
    uid = nph.data().patientUid;
    const u = await getDoc(P.user(uid));
    if (u.exists() && u.data().active !== false) { b.update(P.user(uid), { patientIds: arrayUnion(pid), lastPid: pid }); shared = true; }
    else uid = null;
  }
  if (!uid) {
    temp = genPassword();
    const r = await createAuthAt(phone, "p", temp, (nph.exists() && nph.data().patientVer ? nph.data().patientVer + 1 : 1));
    saveLoginIdx(phone, temp, C, "p");
    uid = r.uid;
    b.set(P.user(uid), { role: "patient", clinicId: C, phone, patientIds: [pid], active: true, mustChangePassword: true, ver: r.ver, hideSensitive: false, createdAt: serverTimestamp() });
    b.set(newRef, { patientUid: uid, patientVer: r.ver }, { merge: true });
  }
  b.update(pRef, { phone, uid, noAccount: false });
  await b.commit();
  if (oldUid) {
    const ou = await getDoc(P.user(oldUid));
    const rest = ((ou.exists() && ou.data().patientIds) || []).filter((x) => x !== pid);
    if (rest.length) await updateDoc(P.user(oldUid), { patientIds: rest });
    else { await updateDoc(P.user(oldUid), { patientIds: [], active: false }); await setDoc(P.phone(oldPhone), { patientUid: null }, { merge: true }); }
  }
  await audit(create ? "إنشاء حساب لمريض" : "تغيير رقم جوال مريض", create ? phone : `${oldPhone} → ${phone}`);
  return { phone, temp, shared };
}

// ---------- الموظفون والأطباء ----------
// role: "secretary" أو "doctor" (طبيب إضافي غير مسؤول)
export async function createStaff(name, phoneRaw, role = "secretary", title = "", doctorId = null) {
  const phone = normPhone(phoneRaw);
  if (phone.length < 9) throw new Error("رقم الجوال غير صحيح");
  const ph = await getDoc(P.phone(phone));
  if (ph.exists() && ph.data().staffUid) {
    const u = await getDoc(P.user(ph.data().staffUid));
    if (u.exists() && u.data().active) throw new Error("يوجد موظف مسجّل بهذا الرقم");
  }
  const temp = genPassword();
  const start = ph.exists() && ph.data().staffVer ? ph.data().staffVer + 1 : 1;
  const r = await createAuthAt(phone, "s", temp, start);
  saveLoginIdx(phone, temp, C, "s");
  await setDoc(P.user(r.uid), {
    role, admin: false, doctorId, clinicId: C, name: name.trim(), title, phone, active: true,
    mustChangePassword: true, ver: r.ver, createdAt: serverTimestamp()
  });
  await setDoc(P.phone(phone), { staffUid: r.uid, staffVer: r.ver }, { merge: true });
  await audit(role === "doctor" ? "إضافة طبيب" : "إنشاء حساب موظف", name);
  return { temp, uid: r.uid, phone };
}

export async function resetStaffPassword(uid) {
  const u = await getDoc(P.user(uid));
  const d = u.data();
  const ph = await getDoc(P.phone(d.phone));
  const temp = genPassword();
  const r = await createAuthAt(d.phone, "s", temp, ((ph.exists() && ph.data().staffVer) || d.ver || 1) + 1);
  saveLoginIdx(d.phone, temp, C, "s");
  await setDoc(P.user(r.uid), {
    role: d.role, admin: false, doctorId: d.doctorId || null, clinicId: C, name: d.name, title: d.title || "", phone: d.phone, active: true,
    mustChangePassword: true, ver: r.ver, createdAt: serverTimestamp(), replaces: uid
  });
  await updateDoc(P.user(uid), { active: false });
  await setDoc(P.phone(d.phone), { staffUid: r.uid, staffVer: r.ver }, { merge: true });
  await audit("إعادة تعيين كلمة مرور موظف", d.name);
  return { temp, uid: r.uid };
}

// ---------- الملفات والصور ----------
// المستند الأساسي يحمل صورة مصغّرة فقط، والملف الكامل منفصل ولا يُحمَّل إلا عند فتحه.
// مجاناً: الملف الكامل في مستند فرعي blob/main. مع Blaze: في Cloud Storage (USE_STORAGE = true).
let _st = null;
async function storageApi() {
  if (!_st) {
    const m = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js");
    _st = { m, s: m.getStorage(app) };
  }
  return _st;
}
export async function addFileDoc(colRef, meta, dataUrl) {
  const ref = await addDoc(colRef, { ...meta, store: USE_STORAGE ? "storage" : "fs", createdAt: serverTimestamp() });
  try {
    if (USE_STORAGE) {
      const { m, s } = await storageApi();
      const r = m.ref(s, ref.path);
      await m.uploadString(r, dataUrl, "data_url");
      await updateDoc(ref, { url: await m.getDownloadURL(r) });
    } else {
      await setDoc(doc(ref, "blob", "main"), { data: dataUrl, at: serverTimestamp() });
    }
  } catch (e) {
    await updateDoc(ref, { broken: true }).catch(() => {});
    throw e;
  }
  return ref;
}
// يعيد الملف الكامل (data URL أو رابط)، ويدعم الملفات القديمة المحفوظة داخل المستند
export async function fileData(colRef, f) {
  if (f.data) return f.data;
  if (f.url) return f.url;
  const b = await getDoc(doc(colRef, f.id, "blob", "main"));
  return b.exists() ? b.data().data : null;
}

// ---------- مساعدات قراءة ----------
export async function list(q) {
  const s = await getDocs(q);
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function one(ref) {
  const s = await getDoc(ref);
  return s.exists() ? { id: s.id, ...s.data() } : null;
}
export const tsMs = (t) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : t ? +new Date(t) : 0);
export function clinicState(c) {
  if (!c) return { ok: false, days: 0, status: "none" };
  const ms = tsMs(c.expiresAt) - Date.now();
  const days = Math.ceil(ms / 864e5);
  const ok = ["trial", "active"].includes(c.status) && ms > 0;
  return { ok, days, status: c.status, trial: c.status === "trial" };
}
