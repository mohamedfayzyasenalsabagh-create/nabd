// اختبارات قواعد الحماية على محاكي Firestore
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where, writeBatch, Timestamp, arrayUnion, increment, serverTimestamp } from "firebase/firestore";

let env;
const DAY = 864e5;
const future = (d) => Timestamp.fromMillis(Date.now() + d * DAY);

before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-nabd", firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const clinic = (id, extra = {}) => ({ name: id, slug: id, ownerUid: `adm_${id}`, status: "active", plan: "pro", expiresAt: future(30), features: { booking: true, inventory: true, qr: true, multiDoctor: true }, maxDoctors: 3, maxStaff: 3, ...extra });
    await setDoc(doc(db, "owners/own1"), { email: "o@x" });
    await setDoc(doc(db, "platform/bootstrap"), { done: true });
    await setDoc(doc(db, "platform/config"), { name: "نبض" });
    await setDoc(doc(db, "clinics/A"), clinic("A"));
    await setDoc(doc(db, "clinics/B"), clinic("B"));
    await setDoc(doc(db, "clinics/X"), clinic("X", { expiresAt: Timestamp.fromMillis(Date.now() - DAY) }));
    await setDoc(doc(db, "publicClinics/A"), { name: "A", bookingEnabled: true });
    await setDoc(doc(db, "publicClinics/B"), { name: "B", bookingEnabled: false });
    const u = (uid, data) => setDoc(doc(db, `users/${uid}`), { active: true, ...data });
    await u("adm_A", { role: "doctor", admin: true, clinicId: "A" });
    await u("doc_A", { role: "doctor", admin: false, clinicId: "A" });
    await u("sec_A", { role: "secretary", admin: false, clinicId: "A" });
    await u("pat_A", { role: "patient", clinicId: "A", patientIds: ["p1"] });
    await u("adm_B", { role: "doctor", admin: true, clinicId: "B" });
    await u("adm_X", { role: "doctor", admin: true, clinicId: "X" });
    await u("off_A", { role: "secretary", admin: false, clinicId: "A", active: false });
    const P0 = { appts: false, patients: false, pay: false, fin: false, expenses: false, reports: false, inventory: false, messages: false, settings: false, audit: false, med: "none" };
    await u("store_A", { role: "custom", roleTitle: "مدير المستودع", clinicId: "A", perms: { ...P0, inventory: true } });
    await u("mgr_A", { role: "custom", roleTitle: "المدير العام", clinicId: "A", perms: { ...P0, appts: true, patients: true, pay: true, fin: true, expenses: true, reports: true, inventory: true, messages: true, settings: true, audit: true } });
    await u("medv_A", { role: "custom", roleTitle: "مشرف طبي", clinicId: "A", perms: { ...P0, med: "read" } });
    await u("none_A", { role: "custom", roleTitle: "بلا صلاحيات", clinicId: "A", perms: P0 });
    await u("mgr_B", { role: "custom", roleTitle: "مدير B", clinicId: "B", perms: { ...P0, appts: true, patients: true, fin: true } });
    await setDoc(doc(db, "clinics/A/inventory/i1"), { name: "قفازات", qty: 10, min: 2 });
    await setDoc(doc(db, "clinics/A/payments/pay1"), { patientId: "p1", total: 100, paid: 50, date: "2026-10-01" });
    await setDoc(doc(db, "clinics/A/expenses/e1"), { amount: 5, date: "2026-10-01" });
    await setDoc(doc(db, "clinics/A/audit/x1"), { by: "adm_A", action: "t" });
    await setDoc(doc(db, "clinics/A/stats/s1"), { date: "2026-10-01" });
    await u("doc2_A", { role: "doctor", admin: false, clinicId: "A", doctorId: "d2" });
    await u("acc_A", { role: "accountant", admin: false, clinicId: "A" });
    await u("fin_A", { role: "custom", roleTitle: "المدير المالي", clinicId: "A", perms: { ...P0, fin: true, commissions: true } });
    await setDoc(doc(db, "clinics/A/comm/d1"), { rates: [{ from: "2026-01", treat: 40, surg: 50 }], fixed: {} });
    await setDoc(doc(db, "clinics/A/comm/d2"), { rates: [{ from: "2026-01", treat: 30, surg: 45 }], fixed: {} });
    await setDoc(doc(db, "clinics/A/commPay/cp1"), { doctorId: "d1", type: "payout", amount: 100, date: "2026-10-01", by: "adm_A" });
    await setDoc(doc(db, "clinics/A/commPay/cp2"), { doctorId: "d2", type: "advance", amount: 50, date: "2026-10-01", by: "adm_A" });
    for (const c of ["A", "X"]) {
      await setDoc(doc(db, `clinics/${c}/patients/p1`), { name: "p1", phone: "0900" });
      await setDoc(doc(db, `clinics/${c}/patients/p2`), { name: "p2", phone: "0911" });
      await setDoc(doc(db, `clinics/${c}/patients/p1/visits/v1`), { date: "2026-09-01" });
      await setDoc(doc(db, `clinics/${c}/patients/p2/visits/v1`), { date: "2026-09-01" });
      await setDoc(doc(db, `clinics/${c}/patients/p1/private/n1`), { text: "secret" });
    }
    await setDoc(doc(db, "clinics/A/appointments/a1"), { patientId: "p1", status: "confirmed" });
    await setDoc(doc(db, "clinics/A/patients/p1/procedures/pr1"), { name: "x", consentSignedAt: null });
    await setDoc(doc(db, "rxVerify/code123"), { clinicId: "A", items: [] });
  });
});
const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

test("عزل العيادات: طبيب عيادة لا يقرأ مرضى عيادة أخرى", async () => {
  await assertSucceeds(getDoc(doc(as("adm_A"), "clinics/A/patients/p1")));
  await assertFails(getDoc(doc(as("adm_B"), "clinics/A/patients/p1")));
  await assertFails(getDoc(doc(as("adm_B"), "clinics/A/patients/p1/visits/v1")));
  await assertFails(getDoc(doc(as("adm_B"), "clinics/A")));
});

test("السكرتارية لا ترى البيانات الطبية", async () => {
  await assertSucceeds(getDoc(doc(as("sec_A"), "clinics/A/patients/p1")));
  await assertFails(getDoc(doc(as("sec_A"), "clinics/A/patients/p1/visits/v1")));
  await assertFails(getDoc(doc(as("sec_A"), "clinics/A/patients/p1/private/n1")));
  await assertFails(setDoc(doc(as("sec_A"), "clinics/A/patients/p1/visits/v2"), { date: "x" }));
});

test("الطبيب يقرأ الملاحظات الخاصة، والمريض لا", async () => {
  await assertSucceeds(getDoc(doc(as("doc_A"), "clinics/A/patients/p1/private/n1")));
  await assertFails(getDoc(doc(as("pat_A"), "clinics/A/patients/p1/private/n1")));
});

test("المريض يرى ملفه فقط", async () => {
  await assertSucceeds(getDoc(doc(as("pat_A"), "clinics/A/patients/p1/visits/v1")));
  await assertFails(getDoc(doc(as("pat_A"), "clinics/A/patients/p2/visits/v1")));
  await assertFails(getDoc(doc(as("pat_A"), "clinics/A/patients/p2")));
  await assertSucceeds(getDoc(doc(as("pat_A"), "clinics/A/appointments/a1")));
});

test("المريض يضيف قراءة منزلية ويوقّع الموافقة فقط", async () => {
  await assertSucceeds(setDoc(doc(as("pat_A"), "clinics/A/patients/p1/vitals/h1"), { sys: 120, source: "home" }));
  await assertFails(setDoc(doc(as("pat_A"), "clinics/A/patients/p1/vitals/h2"), { sys: 120, source: "clinic" }));
  await assertFails(setDoc(doc(as("pat_A"), "clinics/A/patients/p1/visits/v9"), { date: "x" }));
  await assertSucceeds(updateDoc(doc(as("pat_A"), "clinics/A/patients/p1/procedures/pr1"), { consentSignedAt: new Date(), consentName: "p1" }));
});

test("الحساب الموقوف لا يصل لشيء", async () => {
  await assertFails(getDoc(doc(as("off_A"), "clinics/A/patients/p1")));
});

test("العيادة المنتهية: قراءة فقط", async () => {
  await assertSucceeds(getDoc(doc(as("adm_X"), "clinics/X/patients/p1/visits/v1")));
  await assertFails(setDoc(doc(as("adm_X"), "clinics/X/patients/p1/visits/v2"), { date: "x" }));
  await assertFails(setDoc(doc(as("adm_X"), "clinics/X/appointments/n"), { patientId: "p1" }));
});

test("المسؤول لا يغيّر اشتراكه، والمالك يستطيع", async () => {
  await assertFails(updateDoc(doc(as("adm_A"), "clinics/A"), { expiresAt: future(999) }));
  await assertFails(updateDoc(doc(as("adm_A"), "clinics/A"), { status: "active", plan: "center" }));
  await assertFails(updateDoc(doc(as("adm_A"), "clinics/A"), { features: { booking: true } }));
  await assertSucceeds(updateDoc(doc(as("adm_A"), "clinics/A"), { name: "اسم جديد" }));
  await assertFails(updateDoc(doc(as("doc_A"), "clinics/A"), { name: "x" }));
  await assertSucceeds(updateDoc(doc(as("own1"), "clinics/A"), { expiresAt: future(365) }));
});

test("المالك لا يطّلع على بيانات المرضى", async () => {
  await assertSucceeds(getDoc(doc(as("own1"), "clinics/A")));
  await assertFails(getDoc(doc(as("own1"), "clinics/A/patients/p1")));
  await assertFails(getDoc(doc(as("own1"), "clinics/A/patients/p1/visits/v1")));
});

test("الصلاحيات: لا تصعيد", async () => {
  await assertSucceeds(setDoc(doc(as("adm_A"), "users/n1"), { role: "secretary", admin: false, clinicId: "A", active: true }));
  await assertFails(setDoc(doc(as("adm_A"), "users/n2"), { role: "doctor", admin: true, clinicId: "A", active: true }));
  await assertFails(setDoc(doc(as("sec_A"), "users/n3"), { role: "doctor", admin: false, clinicId: "A", active: true }));
  await assertFails(setDoc(doc(as("sec_A"), "users/n4"), { role: "patient", clinicId: "A", active: true, patientIds: [] }));
  await assertFails(setDoc(doc(as("adm_A"), "users/n5"), { role: "secretary", admin: false, clinicId: "B", active: true }));
  await assertFails(updateDoc(doc(as("pat_A"), "users/pat_A"), { patientIds: ["p1", "p2"] }));
  await assertFails(updateDoc(doc(as("sec_A"), "users/sec_A"), { role: "doctor" }));
  await assertSucceeds(updateDoc(doc(as("pat_A"), "users/pat_A"), { hideSensitive: true }));
});

test("تسجيل عيادة جديدة: تجربة فقط", async () => {
  const db = as("new1");
  const ok = writeBatch(db);
  ok.set(doc(db, "users/new1"), { role: "doctor", admin: true, clinicId: "N", active: true });
  ok.set(doc(db, "clinics/N"), { ownerUid: "new1", slug: "dr-n", status: "trial", plan: "trial", expiresAt: future(14), features: {}, maxDoctors: 3, maxStaff: 3 });
  ok.set(doc(db, "publicClinics/N"), { name: "N" });
  ok.set(doc(db, "slugs/dr-n"), { cid: "N" });
  await assertSucceeds(ok.commit());

  const db2 = as("new2");
  const bad = writeBatch(db2);
  bad.set(doc(db2, "users/new2"), { role: "doctor", admin: true, clinicId: "M", active: true });
  bad.set(doc(db2, "clinics/M"), { ownerUid: "new2", slug: "dr-m", status: "active", plan: "center", expiresAt: future(400), features: {}, maxDoctors: 50, maxStaff: 50 });
  await assertFails(bad.commit());

  const db3 = as("new3");
  const long = writeBatch(db3);
  long.set(doc(db3, "users/new3"), { role: "doctor", admin: true, clinicId: "L", active: true });
  long.set(doc(db3, "clinics/L"), { ownerUid: "new3", slug: "l", status: "trial", plan: "trial", expiresAt: future(60), features: {}, maxDoctors: 3, maxStaff: 3 });
  await assertFails(long.commit());

  // لا يمكن الانضمام لعيادة موجودة كمسؤول
  await assertFails(setDoc(doc(as("new4"), "users/new4"), { role: "doctor", admin: true, clinicId: "A", active: true }));
  // لا يمكن حجز رمز عيادة لعيادة غير جديدة
  await assertFails(setDoc(doc(as("new5"), "slugs/steal"), { cid: "A" }));
});

test("إعداد المالك مرة واحدة فقط", async () => {
  const db = as("evil");
  const b = writeBatch(db);
  b.set(doc(db, "owners/evil"), { email: "e" });
  b.set(doc(db, "platform/bootstrap"), { done: true });
  await assertFails(b.commit());
  await assertFails(setDoc(doc(db, "owners/evil"), { email: "e" }));
});

test("صفحة الحجز العامة", async () => {
  const req = { name: "ليلى", phone: "0999", date: "2026-10-01", time: "10:00", doctorId: "d1", service: "", note: "", status: "new", createdAt: new Date() };
  await assertSucceeds(setDoc(doc(anon(), "clinics/A/publicRequests/r1"), req));
  await assertFails(setDoc(doc(anon(), "clinics/A/publicRequests/r2"), { ...req, status: "done" }));
  await assertFails(setDoc(doc(anon(), "clinics/A/publicRequests/r3"), { ...req, extra: "x" }));
  await assertFails(setDoc(doc(anon(), "clinics/B/publicRequests/r4"), req));
  await assertFails(getDoc(doc(anon(), "clinics/A/publicRequests/r1")));
  await assertSucceeds(getDoc(doc(anon(), "clinics/A/busy/2026-10-01")));
  await assertFails(setDoc(doc(anon(), "clinics/A/busy/2026-10-01"), { slots: [] }));
  await assertFails(getDoc(doc(anon(), "clinics/A/appointments/a1")));
});

test("التحقق من الوصفة", async () => {
  await assertSucceeds(getDoc(doc(anon(), "rxVerify/code123")));
  await assertFails(getDocs(collection(anon(), "rxVerify")));
  await assertSucceeds(setDoc(doc(as("doc_A"), "rxVerify/newcode"), { clinicId: "A", items: [] }));
  await assertFails(setDoc(doc(as("sec_A"), "rxVerify/c2"), { clinicId: "A", items: [] }));
  await assertFails(setDoc(doc(as("doc_A"), "rxVerify/c3"), { clinicId: "B", items: [] }));
});

test("دفعات الاشتراك", async () => {
  await assertSucceeds(setDoc(doc(as("adm_A"), "subscriptionPayments/s1"), { clinicId: "A", status: "pending" }));
  await assertFails(setDoc(doc(as("adm_A"), "subscriptionPayments/s2"), { clinicId: "A", status: "approved" }));
  await assertFails(setDoc(doc(as("sec_A"), "subscriptionPayments/s3"), { clinicId: "A", status: "pending" }));
  await assertFails(updateDoc(doc(as("adm_A"), "subscriptionPayments/s1"), { status: "approved" }));
  await assertSucceeds(updateDoc(doc(as("own1"), "subscriptionPayments/s1"), { status: "approved" }));
  await assertSucceeds(getDocs(query(collection(as("adm_A"), "subscriptionPayments"), where("clinicId", "==", "A"))));
  await assertFails(getDocs(query(collection(as("adm_B"), "subscriptionPayments"), where("clinicId", "==", "A"))));
});

test("لا حذف لأي سجل", async () => {
  const { deleteDoc } = await import("firebase/firestore");
  await assertFails(deleteDoc(doc(as("adm_A"), "clinics/A/patients/p1")));
  await assertFails(deleteDoc(doc(as("own1"), "clinics/A")));
});

test("الملفات الكاملة (blob): نفس صلاحيات الملف", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "clinics/A/patients/p1/files/f1"), { kind: "lab", uploadedBy: "doctor" });
    await setDoc(doc(db, "clinics/A/patients/p1/files/f1/blob/main"), { data: "data:image/jpeg;base64,AAA" });
    await setDoc(doc(db, "clinics/A/patients/p1/private/ph1"), { type: "photo" });
    await setDoc(doc(db, "clinics/A/patients/p1/private/ph1/blob/main"), { data: "data:image/jpeg;base64,BBB" });
    await setDoc(doc(db, "clinics/A/patients/p1/files/f2"), { kind: "lab", uploadedBy: "patient" });
    await setDoc(doc(db, "clinics/A/patients/p1/files/f3"), { kind: "lab", uploadedBy: "doctor" });
    await setDoc(doc(db, "clinics/A/patients/p1/files/f4"), { kind: "lab", uploadedBy: "doctor" });
  });
  // القراءة
  await assertSucceeds(getDoc(doc(as("doc_A"), "clinics/A/patients/p1/files/f1/blob/main")));
  await assertSucceeds(getDoc(doc(as("pat_A"), "clinics/A/patients/p1/files/f1/blob/main")));
  await assertFails(getDoc(doc(as("sec_A"), "clinics/A/patients/p1/files/f1/blob/main")));
  await assertFails(getDoc(doc(as("adm_B"), "clinics/A/patients/p1/files/f1/blob/main")));
  await assertSucceeds(getDoc(doc(as("doc_A"), "clinics/A/patients/p1/private/ph1/blob/main")));
  await assertFails(getDoc(doc(as("pat_A"), "clinics/A/patients/p1/private/ph1/blob/main")));
  // الكتابة
  await assertSucceeds(setDoc(doc(as("pat_A"), "clinics/A/patients/p1/files/f2/blob/main"), { data: "data:image/jpeg;base64,CCC" }));
  await assertFails(setDoc(doc(as("pat_A"), "clinics/A/patients/p1/files/f3/blob/main"), { data: "x" }));
  await assertFails(setDoc(doc(as("pat_A"), "clinics/A/patients/p1/private/ph1/blob/other"), { data: "x" }));
  await assertFails(setDoc(doc(as("sec_A"), "clinics/A/patients/p1/files/f3/blob/main"), { data: "x" }));
  await assertSucceeds(setDoc(doc(as("doc_A"), "clinics/A/patients/p1/files/f3/blob/main"), { data: "data:x" }));
  await assertFails(setDoc(doc(as("doc_A"), "clinics/A/patients/p1/files/f3/blob/main"), { data: "data:y" }));
  await assertFails(setDoc(doc(as("doc_A"), "clinics/A/patients/p1/files/f4/blob/main"), { data: "z".repeat(1000001) }));
  // المريض يحدّث رابط ملفه فقط
  await assertSucceeds(updateDoc(doc(as("pat_A"), "clinics/A/patients/p1/files/f2"), { url: "https://x" }));
  await assertFails(updateDoc(doc(as("pat_A"), "clinics/A/patients/p1/files/f2"), { kind: "echo" }));
});

test("دليل الأطباء: العيادات الظاهرة فقط", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "publicClinics/A"), { name: "A", bookingEnabled: true, listed: true, city: "دمشق" });
  });
  const pubs = collection(anon(), "publicClinics");
  await assertSucceeds(getDocs(query(pubs, where("listed", "==", true))));
  await assertFails(getDocs(pubs));
  await assertFails(getDocs(query(pubs, where("city", "==", "دمشق"))));
  // المسؤول يظهر عيادته أو يخفيها، وغيره لا
  await assertSucceeds(updateDoc(doc(as("adm_A"), "publicClinics/A"), { listed: false }));
  await assertFails(updateDoc(doc(as("adm_B"), "publicClinics/A"), { listed: true }));
});

test("فهرس الدخول الموحد: قراءة مستند بعينه فقط، والكتابة لمستخدم مسجّل بصيغة محددة", async () => {
  await assertSucceeds(setDoc(doc(as("sec_A"), "loginIdx/h1"), { e: arrayUnion("A|p") }, { merge: true }));
  await assertSucceeds(getDoc(doc(anon(), "loginIdx/h1")));
  await assertFails(getDocs(collection(anon(), "loginIdx")));
  await assertFails(setDoc(doc(anon(), "loginIdx/h2"), { e: ["A|p"] }));
  await assertFails(setDoc(doc(as("sec_A"), "loginIdx/h3"), { e: ["A|p"], extra: 1 }));
});

test("المصاريف للأطباء فقط، والطبيب غير المسؤول يحفظ وصفاته الجاهزة فقط", async () => {
  await assertSucceeds(setDoc(doc(as("doc_A"), "clinics/A/expenses/e1"), { category: "إيجار", amount: 100, date: "2026-10-01" }));
  await assertSucceeds(getDoc(doc(as("adm_A"), "clinics/A/expenses/e1")));
  await assertFails(getDoc(doc(as("sec_A"), "clinics/A/expenses/e1")));
  await assertFails(setDoc(doc(as("sec_A"), "clinics/A/expenses/e2"), { amount: 1 }));
  await assertFails(getDoc(doc(as("pat_A"), "clinics/A/expenses/e1")));
  await assertSucceeds(updateDoc(doc(as("doc_A"), "clinics/A"), { rxTemplates: arrayUnion({ name: "t", items: [] }) }));
  await assertFails(updateDoc(doc(as("doc_A"), "clinics/A"), { name: "x" }));
  await assertFails(updateDoc(doc(as("sec_A"), "clinics/A"), { rxTemplates: [] }));
});

test("الدعوات: مسؤول العيادة لا يعدّل بيانات المكافأة، والمالك يعدّلها", async () => {
  await assertFails(updateDoc(doc(as("adm_A"), "clinics/A"), { referrals: 5 }));
  await assertFails(updateDoc(doc(as("adm_A"), "clinics/A"), { referredBy: "B" }));
  await assertSucceeds(updateDoc(doc(as("adm_A"), "clinics/A"), { name: "A2" }));
  await assertSucceeds(updateDoc(doc(as("own1"), "clinics/A"), { referrals: 1, referralRewarded: true }));
});

test("الممرض يقرأ الملف الطبي دون الملاحظات الخاصة ويسجل المؤشرات، والمحاسب للمالية فقط", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/nur_A"), { active: true, role: "nurse", admin: false, clinicId: "A" });
    await setDoc(doc(db, "users/acc_A"), { active: true, role: "accountant", admin: false, clinicId: "A" });
    await setDoc(doc(db, "clinics/A/expenses/e1"), { amount: 1 });
  });
  await assertSucceeds(getDoc(doc(as("nur_A"), "clinics/A/patients/p1/visits/v1")));
  await assertFails(getDoc(doc(as("nur_A"), "clinics/A/patients/p1/private/n1")));
  await assertSucceeds(setDoc(doc(as("nur_A"), "clinics/A/patients/p1/vitals/x"), { sys: 120 }));
  await assertFails(setDoc(doc(as("nur_A"), "clinics/A/patients/p1/visits/x"), { date: "2026-10-01" }));
  await assertFails(getDoc(doc(as("nur_A"), "clinics/A/expenses/e1")));
  await assertSucceeds(getDoc(doc(as("acc_A"), "clinics/A/expenses/e1")));
  await assertSucceeds(getDoc(doc(as("acc_A"), "clinics/A/appointments/a1")));
  await assertFails(getDoc(doc(as("acc_A"), "clinics/A/patients/p1/visits/v1")));
  await assertSucceeds(setDoc(doc(as("adm_A"), "users/new_n"), { role: "nurse", admin: false, clinicId: "A", active: true }));
});

test("الموظف لا يربط حساب مريض بملفات مرضى آخرين", async () => {
  const sec = as("sec_A");
  // ربط حساب برقم مختلف عن رقم الملف: مرفوض
  await assertFails(setDoc(doc(sec, "users/evil"), { role: "patient", clinicId: "A", phone: "0999", patientIds: ["p1"], active: true }));
  // ربط حساب بعدة ملفات دفعة واحدة: مرفوض
  await assertFails(setDoc(doc(sec, "users/evil2"), { role: "patient", clinicId: "A", phone: "0900", patientIds: ["p1", "p2"], active: true }));
  // ملف جديد وحسابه معاً بنفس الرقم: مسموح
  const b = writeBatch(sec);
  b.set(doc(sec, "clinics/A/patients/p9"), { name: "p9", phone: "0933", uid: "u9" });
  b.set(doc(sec, "users/u9"), { role: "patient", clinicId: "A", phone: "0933", patientIds: ["p9"], active: true });
  await assertSucceeds(b.commit());
  // إضافة ملف برقم آخر إلى حساب موجود: مرفوضة
  await env.withSecurityRulesDisabled(async (ctx) => { await updateDoc(doc(ctx.firestore(), "users/pat_A"), { phone: "0900" }); });
  await assertFails(updateDoc(doc(sec, "users/pat_A"), { patientIds: ["p1", "p2"], lastPid: "p2" }));
  // تحويل ملف مريض إلى حساب آخر برقم مختلف: مرفوض
  await assertFails(updateDoc(doc(sec, "clinics/A/patients/p2"), { uid: "pat_A" }));
});

test("تعدد الاختصاصات لباقة المراكز فقط", async () => {
  await assertFails(updateDoc(doc(as("adm_A"), "clinics/A"), { modules: ["dental", "peds", "eye"] }));
  await assertSucceeds(updateDoc(doc(as("adm_A"), "clinics/A"), { modules: ["preg", "gyn", "cosm"] }));
  await assertSucceeds(updateDoc(doc(as("adm_A"), "clinics/A"), { modules: ["dental"] }));
});

test("مسارات حساب المريض الفعلية: إخوة على نفس الرقم، إعادة كلمة المرور، تغيير الرقم", async () => {
  const sec = as("sec_A");
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/pat_A"), { active: true, role: "patient", clinicId: "A", phone: "0900", patientIds: ["p1"] });
    await setDoc(doc(db, "clinics/A/phones/0900"), { patientUid: "pat_A", patientVer: 1 });
    await setDoc(doc(db, "clinics/A/patients/p1"), { name: "p1", phone: "0900", uid: "pat_A" });
  });
  // أخ جديد على نفس الرقم (ملف جديد + إضافته للحساب نفسه في دفعة واحدة)
  let b = writeBatch(sec);
  b.update(doc(sec, "users/pat_A"), { patientIds: arrayUnion("p5"), lastPid: "p5" });
  b.set(doc(sec, "clinics/A/patients/p5"), { name: "p5", phone: "0900", uid: "pat_A" });
  await assertSucceeds(b.commit());
  // إعادة كلمة المرور: حساب جديد يرث الملفين
  await assertSucceeds(setDoc(doc(sec, "users/pat_A2"), { role: "patient", clinicId: "A", phone: "0900", patientIds: ["p1", "p5"], active: true }));
  await assertSucceeds(updateDoc(doc(sec, "users/pat_A"), { active: false }));
  await assertSucceeds(setDoc(doc(sec, "clinics/A/phones/0900"), { patientUid: "pat_A2", patientVer: 2 }, { merge: true }));
  await assertSucceeds(updateDoc(doc(sec, "clinics/A/patients/p1"), { uid: "pat_A2" }));
  // تغيير رقم الملف p5 إلى رقم جديد بحساب جديد
  b = writeBatch(sec);
  b.set(doc(sec, "users/pat_new"), { role: "patient", clinicId: "A", phone: "0955", patientIds: ["p5"], active: true });
  b.set(doc(sec, "clinics/A/phones/0955"), { patientUid: "pat_new", patientVer: 1 }, { merge: true });
  b.update(doc(sec, "clinics/A/patients/p5"), { phone: "0955", uid: "pat_new" });
  await assertSucceeds(b.commit());
  // إزالة p5 من الحساب القديم
  await assertSucceeds(updateDoc(doc(sec, "users/pat_A2"), { patientIds: ["p1"] }));
  // تعديل بيانات عادية للملف دون تغيير الرقم
  await assertSucceeds(updateDoc(doc(sec, "clinics/A/patients/p1"), { address: "دمشق" }));
});

test("الدور الحي: المريض يؤكد حضوره ويسجله بالرمز الصحيح فقط", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "clinics/A/live/checkin"), { code: "good123" });
    await setDoc(doc(db, "clinics/A/live/queue"), { number: "3", wait: { d1: [4, 5] } });
    await setDoc(doc(db, "clinics/A/appointments/q1"), { patientId: "p1", status: "confirmed", date: "2026-10-14" });
    await setDoc(doc(db, "clinics/A/appointments/q2"), { patientId: "p2", status: "confirmed", date: "2026-10-14" });
  });
  const p = as("pat_A");
  await assertSucceeds(getDoc(doc(p, "clinics/A/live/queue")));
  await assertFails(getDoc(doc(p, "clinics/A/live/checkin")));
  await assertSucceeds(updateDoc(doc(p, "clinics/A/appointments/q1"), { patientConfirm: "yes", patientConfirmAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(p, "clinics/A/appointments/q1"), { status: "arrived", checkin: "wrong", arrivedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(p, "clinics/A/appointments/q1"), { status: "arrived", checkin: "good123", arrivedAt: serverTimestamp(), queueNo: 1 }));
  await assertSucceeds(updateDoc(doc(p, "clinics/A/appointments/q1"), { status: "arrived", checkin: "good123", arrivedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(p, "clinics/A/appointments/q2"), { status: "arrived", checkin: "good123", arrivedAt: serverTimestamp() }));
  await assertFails(getDoc(doc(as("pat_B"), "clinics/A/live/queue")));
});

test("سجل الأعطال: يُكتب بحقول محددة فقط، ويقرؤه صاحب المنصة وحده", async () => {
  const e = { msg: "x is not a function", stack: "at f (app.js:1)", route: "#/appts", role: "doctor", cid: "A", v: "", ua: "test", at: serverTimestamp(), n: 1 };
  await assertSucceeds(setDoc(doc(as("doc_A"), "errors/e1"), e));
  await assertSucceeds(setDoc(doc(anon(), "errors/e2"), { ...e, role: "guest", cid: null }));
  await assertFails(setDoc(doc(anon(), "errors/e3"), { ...e, patient: "name" }));
  await assertFails(setDoc(doc(anon(), "errors/e4"), { ...e, msg: "x".repeat(400) }));
  await assertFails(getDoc(doc(as("doc_A"), "errors/e1")));
  await assertSucceeds(getDoc(doc(as("own1"), "errors/e1")));
});

test("نشاط العيادة: يكتبه فريقها أرقاماً فقط، ويقرؤه صاحب المنصة", async () => {
  const ok = { lastAt: serverTimestamp(), patients: 12, apptsMonth: 30, day: "2026-10-14" };
  await assertSucceeds(setDoc(doc(as("sec_A"), "activity/A"), ok));
  await assertFails(setDoc(doc(as("sec_A"), "activity/X"), ok));
  await assertFails(setDoc(doc(as("pat_A"), "activity/A"), ok));
  await assertFails(setDoc(doc(as("sec_A"), "activity/A"), { ...ok, names: ["x"] }));
  await assertFails(getDoc(doc(as("adm_A"), "activity/A")));
  await assertSucceeds(getDoc(doc(as("own1"), "activity/A")));
});

test("عدّاد الزوار: زيادة بمقدار 1 فقط، والقراءة لصاحب المنصة", async () => {
  const a = anon();
  await assertSucceeds(setDoc(doc(a, "visits/2026-10-10"), { views: increment(1), uniq: increment(1) }, { merge: true }));
  await assertSucceeds(setDoc(doc(a, "visits/2026-10-10"), { views: increment(1), uniq: increment(0) }, { merge: true }));
  await assertFails(setDoc(doc(a, "visits/2026-10-10"), { views: 500, uniq: 500 }, { merge: true }));
  await assertFails(setDoc(doc(a, "visits/hack"), { views: 1, uniq: 1 }));
  await assertFails(getDoc(doc(a, "visits/2026-10-10")));
});

test("عدّاد تنزيلات التطبيق: زيادة بمقدار 1 فقط، والقراءة لصاحب المنصة", async () => {
  const a = anon();
  await assertSucceeds(setDoc(doc(a, "downloads/2026-10-20"), { n: increment(1) }, { merge: true }));
  await assertSucceeds(setDoc(doc(a, "downloads/2026-10-20"), { n: increment(1) }, { merge: true }));
  await assertFails(setDoc(doc(a, "downloads/2026-10-20"), { n: 999 }, { merge: true }));
  await assertFails(setDoc(doc(a, "downloads/x"), { n: 1 }));
  await assertFails(getDoc(doc(a, "downloads/2026-10-20")));
  await assertSucceeds(getDoc(doc(as("own1"), "downloads/2026-10-20")));
});

test("عدّاد الاستهلاك: زيادة من المستخدمين المسجلين فقط، والقراءة لصاحب المنصة", async () => {
  await assertSucceeds(setDoc(doc(as("sec_A"), "usage/2026-10-20"), { r: increment(120), w: increment(5) }, { merge: true }));
  await assertSucceeds(setDoc(doc(as("doc_A"), "usage/2026-10-20"), { r: increment(30), w: increment(1) }, { merge: true }));
  await assertFails(setDoc(doc(anon(), "usage/2026-10-20"), { r: increment(1), w: increment(1) }, { merge: true }));
  await assertFails(setDoc(doc(as("sec_A"), "usage/2026-10-20"), { r: 0, w: 0 }, { merge: true }));
  await assertFails(setDoc(doc(as("sec_A"), "usage/2026-10-20"), { r: increment(1), w: increment(1), x: 1 }, { merge: true }));
  await assertFails(getDoc(doc(as("adm_A"), "usage/2026-10-20")));
  await assertSucceeds(getDoc(doc(as("own1"), "usage/2026-10-20")));
});

test("المريض يحدّث آخر رسالة مع وقت التعديل فقط", async () => {
  await assertSucceeds(updateDoc(doc(as("pat_A"), "clinics/A/patients/p1"), { lastMsgAt: serverTimestamp(), lastMsgFrom: "patient", updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(as("pat_A"), "clinics/A/patients/p1"), { name: "x", updatedAt: serverTimestamp() }));
});

// ---------- الأدوار المخصّصة ----------
const P0 = { appts: false, patients: false, pay: false, fin: false, expenses: false, reports: false, inventory: false, messages: false, settings: false, audit: false, med: "none" };
test("دور مخصّص: مدير المستودع يرى المخزون فقط", async () => {
  const d = as("store_A");
  await assertSucceeds(getDoc(doc(d, "clinics/A/inventory/i1")));
  await assertSucceeds(updateDoc(doc(d, "clinics/A/inventory/i1"), { qty: 9 }));
  await assertFails(getDoc(doc(d, "clinics/A/patients/p1")));
  await assertFails(getDoc(doc(d, "clinics/A/appointments/a1")));
  await assertFails(getDoc(doc(d, "clinics/A/payments/pay1")));
  await assertFails(getDoc(doc(d, "clinics/A/expenses/e1")));
  await assertFails(getDoc(doc(d, "clinics/A/patients/p1/visits/v1")));
  await assertFails(setDoc(doc(d, "clinics/A/patients/p9"), { name: "x", phone: "0999" }));
  await assertFails(getDoc(doc(d, "clinics/A/audit/x1")));
});
test("دور مخصّص: المدير العام يدير كل شيء إداري ومالي دون السجل الطبي", async () => {
  const d = as("mgr_A");
  await assertSucceeds(getDoc(doc(d, "clinics/A/patients/p1")));
  await assertSucceeds(setDoc(doc(d, "clinics/A/patients/p9"), { name: "x", phone: "0999" }));
  await assertSucceeds(updateDoc(doc(d, "clinics/A/patients/p1"), { address: "دمشق" }));
  await assertSucceeds(getDoc(doc(d, "clinics/A/appointments/a1")));
  await assertSucceeds(setDoc(doc(d, "clinics/A/appointments/a2"), { patientId: "p1", status: "confirmed" }));
  await assertSucceeds(updateDoc(doc(d, "clinics/A/payments/pay1"), { paid: 100 }));
  await assertSucceeds(setDoc(doc(d, "clinics/A/expenses/e2"), { amount: 1 }));
  await assertSucceeds(getDoc(doc(d, "clinics/A/stats/s1")));
  await assertSucceeds(getDoc(doc(d, "clinics/A/audit/x1")));
  await assertSucceeds(updateDoc(doc(d, "clinics/A"), { name: "اسم جديد" }));
  await assertFails(updateDoc(doc(d, "clinics/A"), { doctors: [] }));
  await assertFails(updateDoc(doc(d, "clinics/A"), { plan: "center" }));
  await assertFails(getDoc(doc(d, "clinics/A/patients/p1/visits/v1")));
  await assertFails(getDoc(doc(d, "clinics/A/patients/p1/private/n1")));
  await assertFails(setDoc(doc(d, "clinics/A/patients/p1/visits/v9"), { date: "x" }));
  // لا يدير الفريق ولا يعطي نفسه صلاحيات
  await assertFails(updateDoc(doc(d, "users/mgr_A"), { perms: { ...P0, med: "read" } }));
  await assertFails(setDoc(doc(d, "users/new1"), { role: "custom", admin: false, clinicId: "A", active: true, roleTitle: "x", perms: P0 }));
  await assertFails(getDoc(doc(d, "clinics/B/patients/p1")));
});
test("دور مخصّص: السجل الطبي للعرض فقط، والملاحظات الخاصة للطبيب", async () => {
  const d = as("medv_A");
  await assertSucceeds(getDoc(doc(d, "clinics/A/patients/p1/visits/v1")));
  await assertFails(setDoc(doc(d, "clinics/A/patients/p1/visits/v9"), { date: "x" }));
  await assertFails(updateDoc(doc(d, "clinics/A/patients/p1/visits/v1"), { date: "y" }));
  await assertFails(getDoc(doc(d, "clinics/A/patients/p1/private/n1")));
  await assertFails(updateDoc(doc(d, "clinics/A/patients/p1"), { name: "x" }));
  await assertFails(getDoc(doc(d, "clinics/A/payments/pay1")));
});
test("دور مخصّص دون صلاحيات لا يصل لشيء", async () => {
  const d = as("none_A");
  for (const p of ["clinics/A/patients/p1", "clinics/A/appointments/a1", "clinics/A/payments/pay1", "clinics/A/inventory/i1", "clinics/A/expenses/e1", "clinics/A/audit/x1", "clinics/A/patients/p1/visits/v1"])
    await assertFails(getDoc(doc(d, p)));
  await assertSucceeds(getDoc(doc(d, "clinics/A")));
});
test("المسؤول فقط ينشئ الدور المخصّص ويعدّل صلاحياته، بمفاتيح معروفة", async () => {
  const a = as("adm_A");
  await assertSucceeds(setDoc(doc(a, "users/c1"), { role: "custom", admin: false, clinicId: "A", active: true, roleTitle: "المدير العام", perms: { ...P0, fin: true } }));
  await assertFails(setDoc(doc(a, "users/c2"), { role: "custom", admin: false, clinicId: "A", active: true, roleTitle: "x", perms: { ...P0, med: "write" } }));
  await assertFails(setDoc(doc(a, "users/c3"), { role: "custom", admin: false, clinicId: "A", active: true, roleTitle: "x", perms: { ...P0, team: true } }));
  await assertFails(setDoc(doc(a, "users/c4"), { role: "custom", admin: true, clinicId: "A", active: true, roleTitle: "x", perms: P0 }));
  await assertSucceeds(updateDoc(doc(a, "users/store_A"), { perms: { ...P0, inventory: true, reports: true }, roleTitle: "أمين مستودع" }));
  await assertFails(updateDoc(doc(a, "users/store_A"), { admin: true }));
  await assertFails(updateDoc(doc(as("adm_B"), "users/store_A"), { perms: P0, roleTitle: "x" }));
  await assertFails(setDoc(doc(as("sec_A"), "users/c5"), { role: "custom", admin: false, clinicId: "A", active: true, roleTitle: "x", perms: P0 }));
  // الأدوار الثابتة لا تحمل صلاحيات مخصّصة
  await assertFails(setDoc(doc(a, "users/c6"), { role: "secretary", admin: false, clinicId: "A", active: true, perms: { ...P0, med: "read" } }));
});
test("الأدوار الحالية تعمل كما كانت تماماً", async () => {
  await assertSucceeds(getDoc(doc(as("sec_A"), "clinics/A/patients/p1")));
  await assertFails(getDoc(doc(as("sec_A"), "clinics/A/patients/p1/visits/v1")));
  await assertSucceeds(getDoc(doc(as("sec_A"), "clinics/A/inventory/i1")));
  await assertFails(getDoc(doc(as("sec_A"), "clinics/A/expenses/e1")));
  await assertSucceeds(getDoc(doc(as("doc_A"), "clinics/A/patients/p1/visits/v1")));
  await assertFails(getDoc(doc(as("doc_A"), "clinics/A/audit/x1")));
  await assertSucceeds(getDoc(doc(as("adm_A"), "clinics/A/audit/x1")));
});

test("حصص الأطباء: الطبيب يرى حصته فقط، والإدارة والمحاسب يرون الكل", async () => {
  const d2 = as("doc2_A");
  await assertSucceeds(getDoc(doc(d2, "clinics/A/comm/d2")));
  await assertFails(getDoc(doc(d2, "clinics/A/comm/d1")));
  await assertSucceeds(getDocs(query(collection(d2, "clinics/A/commPay"), where("doctorId", "==", "d2"))));
  await assertFails(getDocs(collection(d2, "clinics/A/commPay")));
  await assertFails(getDoc(doc(d2, "clinics/A/commPay/cp1")));
  await assertFails(setDoc(doc(d2, "clinics/A/comm/d2"), { rates: [{ from: "2026-01", treat: 90, surg: 90 }] }));
  await assertFails(setDoc(doc(d2, "clinics/A/commPay/x"), { doctorId: "d2", type: "payout", amount: 10, date: "2026-10-02", by: "doc2_A" }));
  for (const who of ["adm_A", "acc_A", "fin_A"]) {
    await assertSucceeds(getDoc(doc(as(who), "clinics/A/comm/d1")));
    await assertSucceeds(getDocs(collection(as(who), "clinics/A/commPay")));
    await assertSucceeds(setDoc(doc(as(who), `clinics/A/commPay/n_${who}`), { doctorId: "d1", type: "advance", amount: 20, date: "2026-10-02", by: who }));
  }
  // النسب يحددها المسؤول أو صاحب الصلاحية، لا المحاسب
  await assertSucceeds(setDoc(doc(as("adm_A"), "clinics/A/comm/d1"), { rates: [{ from: "2026-10", treat: 45, surg: 55 }], fixed: {} }));
  await assertSucceeds(setDoc(doc(as("fin_A"), "clinics/A/comm/d1"), { rates: [{ from: "2026-10", treat: 45, surg: 55 }], fixed: {} }));
  await assertFails(setDoc(doc(as("acc_A"), "clinics/A/comm/d1"), { rates: [{ from: "2026-10", treat: 99, surg: 99 }], fixed: {} }));
  // لا يرى السكرتير أو مدير المستودع شيئاً منها
  await assertFails(getDoc(doc(as("sec_A"), "clinics/A/comm/d1")));
  await assertFails(getDocs(collection(as("store_A"), "clinics/A/commPay")));
  // لا حذف ولا تعديل للمبلغ؛ الإلغاء بعلامة فقط
  await assertFails(updateDoc(doc(as("adm_A"), "clinics/A/commPay/cp1"), { amount: 1 }));
  await assertSucceeds(updateDoc(doc(as("adm_A"), "clinics/A/commPay/cp1"), { void: true, voidBy: "x" }));
  await assertFails(setDoc(doc(as("adm_A"), "clinics/A/commPay/neg"), { doctorId: "d1", type: "payout", amount: -5, date: "2026-10-02", by: "adm_A" }));
});

// ---------- تقوية أمنية (مراجعة 22 تشرين الأول) ----------
test("أمان: الدور المخصّص دون صلاحية المرضى لا يرى حسابات المرضى (الاسم والجوال)", async () => {
  await assertFails(getDoc(doc(as("store_A"), "users/pat_A")));
  await assertSucceeds(getDoc(doc(as("mgr_A"), "users/pat_A")));
  await assertSucceeds(getDoc(doc(as("store_A"), "users/adm_A")));
});
test("أمان: سجل التعديلات يقبل الحقول المعروفة فقط", async () => {
  await assertSucceeds(setDoc(doc(as("pat_A"), "clinics/A/audit/ok1"), { at: serverTimestamp(), by: "pat_A", byName: "x", action: "توقيع", target: "y" }));
  await assertFails(setDoc(doc(as("pat_A"), "clinics/A/audit/bad1"), { at: serverTimestamp(), by: "pat_A", byName: "x", action: "a", target: "y", html: "<img>" }));
  await assertFails(setDoc(doc(as("pat_A"), "clinics/A/audit/bad2"), { at: serverTimestamp(), by: "pat_A", byName: "x", action: "a".repeat(300), target: "" }));
  await assertFails(setDoc(doc(as("pat_A"), "clinics/A/audit/bad3"), { at: serverTimestamp(), by: "adm_A", byName: "x", action: "a", target: "" }));
});
test("أمان: التسجيل الجديد لا يفعّل باقة المراكز ولا رابطاً غير صالح", async () => {
  const d = as("new6"); const b = writeBatch(d);
  b.set(doc(d, "users/new6"), { role: "doctor", admin: true, clinicId: "Q", active: true });
  b.set(doc(d, "clinics/Q"), { ownerUid: "new6", slug: "dr-q", status: "trial", plan: "trial", expiresAt: future(14), features: { multiSpecialty: true }, maxDoctors: 3, maxStaff: 3 });
  await assertFails(b.commit());
  const d2 = as("new7"); const b2 = writeBatch(d2);
  b2.set(doc(d2, "users/new7"), { role: "doctor", admin: true, clinicId: "R", active: true });
  b2.set(doc(d2, "clinics/R"), { ownerUid: "new7", slug: "<x>", status: "trial", plan: "trial", expiresAt: future(14), features: {}, maxDoctors: 3, maxStaff: 3 });
  b2.set(doc(d2, "slugs/<x>"), { cid: "R" });
  await assertFails(b2.commit());
});

// ---------- مصفوفة هجمات شائعة (تُشغَّل مع كل تعديل) ----------
const SENSITIVE = ["clinics/A", "clinics/A/patients/p1", "clinics/A/patients/p1/visits/v1", "clinics/A/patients/p1/private/n1",
  "clinics/A/appointments/a1", "clinics/A/payments/pay1", "clinics/A/expenses/e1", "clinics/A/inventory/i1", "clinics/A/audit/x1",
  "clinics/A/stats/s1", "clinics/A/comm/d1", "clinics/A/commPay/cp1", "users/adm_A", "users/pat_A"];
test("هجوم: الغرباء (زائر، عيادة أخرى، حساب موقوف، صاحب المنصة) لا يقرؤون بيانات العيادة", async () => {
  for (const who of [null, "adm_B", "mgr_B", "off_A"]) {
    const d = who ? as(who) : anon();
    for (const p of SENSITIVE) await assertFails(getDoc(doc(d, p)));
  }
  for (const p of SENSITIVE.filter((x) => x.includes("/patients/") || x.includes("/appointments/") || x.includes("/payments/"))) await assertFails(getDoc(doc(as("own1"), p)));
});
test("هجوم: الغرباء لا يكتبون في العيادة", async () => {
  for (const who of [null, "adm_B", "mgr_B", "off_A"]) {
    const d = who ? as(who) : anon();
    await assertFails(setDoc(doc(d, "clinics/A/patients/evil"), { name: "x", phone: "0" }));
    await assertFails(updateDoc(doc(d, "clinics/A/patients/p1"), { name: "hacked" }));
    await assertFails(setDoc(doc(d, "clinics/A/patients/p1/visits/evil"), { date: "x" }));
    await assertFails(setDoc(doc(d, "clinics/A/payments/evil"), { total: 1 }));
    await assertFails(updateDoc(doc(d, "clinics/A"), { name: "hacked" }));
  }
});
test("هجوم: سرد المجموعات الحساسة ممنوع على الزائر", async () => {
  const d = anon();
  for (const c of ["users", "clinics", "loginIdx", "slugs", "owners", "errors", "visits", "subscriptionPayments", "rxVerify", "clinics/A/patients", "clinics/A/publicRequests"])
    await assertFails(getDocs(collection(d, c)));
});
test("هجوم: لا أحد يرفع صلاحياته أو ينقل حسابه لعيادة أخرى", async () => {
  const bad = [];
  const no = async (label, pr) => { try { await assertFails(pr); } catch { bad.push(label); } };
  for (const who of ["sec_A", "doc_A", "pat_A", "store_A", "acc_A"]) {
    const d = as(who);
    await no(`${who} admin`, updateDoc(doc(d, `users/${who}`), { admin: true }));
    await no(`${who} role`, updateDoc(doc(d, `users/${who}`), { role: who === "doc_A" ? "custom" : "doctor" }));
    await no(`${who} clinic`, updateDoc(doc(d, `users/${who}`), { clinicId: "B" }));
    await no(`${who} perms`, updateDoc(doc(d, `users/${who}`), { active: true, perms: { appts: true } }));
    await no(`${who} owner`, setDoc(doc(d, "owners/" + who), { email: "x" }));
  }
  await no("pat patientIds", updateDoc(doc(as("pat_A"), "users/pat_A"), { patientIds: ["p1", "p2"] }));
  assert.deepStrictEqual(bad, []);
});
test("هجوم: المريض لا يصل لمريض آخر ولا يعبث بالمواعيد", async () => {
  const d = as("pat_A");
  await assertFails(getDoc(doc(d, "clinics/A/patients/p2")));
  await assertFails(getDoc(doc(d, "clinics/A/patients/p2/visits/v1")));
  await assertFails(getDocs(collection(d, "clinics/A/patients")));
  await assertFails(updateDoc(doc(d, "clinics/A/appointments/a1"), { date: "2030-01-01" }));
  await assertFails(updateDoc(doc(d, "clinics/A/appointments/a1"), { status: "done" }));
  await assertFails(setDoc(doc(d, "clinics/A/payments/x"), { patientId: "p1", total: 0, paid: 999 }));
});
test("هجوم: لا حذف لأي سجل حتى من المسؤول", async () => {
  const { deleteDoc } = await import("firebase/firestore");
  for (const p of ["clinics/A/patients/p1", "clinics/A/patients/p1/visits/v1", "clinics/A/appointments/a1", "clinics/A/payments/pay1", "clinics/A/audit/x1", "users/sec_A", "clinics/A"])
    await assertFails(deleteDoc(doc(as("adm_A"), p)));
});
test("هجوم: طلب الحجز العام لا يقبل حقولاً إضافية ولا حالة مزورة", async () => {
  const d = anon();
  await assertFails(setDoc(doc(d, "clinics/A/publicRequests/r1"), { name: "x", phone: "0", date: "2026-11-01", time: "10:00", status: "done" }));
  await assertFails(setDoc(doc(d, "clinics/A/publicRequests/r2"), { name: "x", phone: "0", date: "2026-11-01", time: "10:00", status: "new", admin: true }));
  await assertFails(setDoc(doc(d, "clinics/B/publicRequests/r3"), { name: "x", phone: "0", date: "2026-11-01", time: "10:00", status: "new" }));
});
test("عدّاد ضغطات الصفحة الرئيسية: زيادة 1 لزر واحد فقط", async () => {
  const d = anon();
  await assertSucceeds(setDoc(doc(d, "clicks/2026-10-22"), { dl: 1 }));
  await assertSucceeds(setDoc(doc(d, "clicks/2026-10-22"), { dl: increment(1) }, { merge: true }));
  await assertSucceeds(setDoc(doc(d, "clicks/2026-10-22"), { wa: increment(1) }, { merge: true }));
  await assertFails(setDoc(doc(d, "clicks/2026-10-22"), { dl: increment(5) }, { merge: true }));
  await assertFails(setDoc(doc(d, "clicks/2026-10-22"), { dl: increment(1), wa: increment(1) }, { merge: true }));
  await assertFails(setDoc(doc(d, "clicks/2026-10-23"), { hack: 1 }));
  await assertFails(getDoc(doc(d, "clicks/2026-10-22")));
  await assertSucceeds(getDoc(doc(as("own1"), "clicks/2026-10-22")));
});
test("الثيمات: المستخدم يختار ثيمه، والمسؤول يختار ثيم العيادة", async () => {
  await assertSucceeds(updateDoc(doc(as("sec_A"), "users/sec_A"), { skin: "rose" }));
  await assertSucceeds(updateDoc(doc(as("sec_A"), "users/sec_A"), { skin: null }));
  await assertFails(updateDoc(doc(as("sec_A"), "users/sec_A"), { skin: "x".repeat(40) }));
  await assertFails(updateDoc(doc(as("sec_A"), "users/sec_A"), { skin: "rose", admin: true }));
  await assertSucceeds(updateDoc(doc(as("adm_A"), "clinics/A"), { skin: "blue" }));
  await assertFails(updateDoc(doc(as("sec_A"), "clinics/A"), { skin: "blue" }));
  await assertSucceeds(updateDoc(doc(as("pat_A"), "users/pat_A"), { skin: "gold" }));
});

// ---------- حذف حساب العيادة (مهلة 30 يوماً) ----------
const delReq = (uid, extra = {}) => ({ deletion: { at: serverTimestamp(), by: uid, ...extra } });
test("حذف العيادة: صاحب العيادة يطلب الحذف ويتراجع عنه", async () => {
  await assertSucceeds(updateDoc(doc(as("adm_A"), "clinics/A"), delReq("adm_A")));
  await assertSucceeds(updateDoc(doc(as("adm_A"), "clinics/A"), { deletion: null }));
});
test("حذف العيادة: لا يطلبه غير صاحبها (طبيب، سكرتيرة، دور مخصص بصلاحية الإعدادات، مريض، عيادة أخرى)", async () => {
  for (const u of ["doc_A", "sec_A", "mgr_A", "pat_A", "adm_B"]) await assertFails(updateDoc(doc(as(u), "clinics/A"), delReq(u)));
});
test("حذف العيادة: صاحب العيادة لا يطلب الحذف الفوري ولا ينتحل غيره ولا يغيّر حقولاً أخرى معه", async () => {
  await assertFails(updateDoc(doc(as("adm_A"), "clinics/A"), delReq("adm_A", { now: true })));
  await assertFails(updateDoc(doc(as("adm_A"), "clinics/A"), delReq("own1")));
  await assertFails(updateDoc(doc(as("adm_A"), "clinics/A"), { ...delReq("adm_A"), name: "x" }));
  await assertFails(updateDoc(doc(as("adm_A"), "clinics/A"), { deletion: { at: Timestamp.fromMillis(Date.now() - 40 * DAY), by: "adm_A" } }));
});
test("حذف العيادة: صاحب المنصة يطلب الحذف الفوري ويلغيه", async () => {
  await assertSucceeds(updateDoc(doc(as("own1"), "clinics/A"), delReq("own1", { now: true })));
  await assertSucceeds(updateDoc(doc(as("own1"), "clinics/A"), { deletion: null }));
});
test("حذف العيادة: صاحب العيادة يطلبه حتى بعد انتهاء الاشتراك", async () => {
  await assertSucceeds(updateDoc(doc(as("adm_X"), "clinics/X"), delReq("adm_X")));
});
test("حذف العيادة: خلال المهلة تُقفل الكتابة على بيانات العيادة ويبقى التراجع ممكناً", async () => {
  await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), "clinics/A"), { deletion: { at: Timestamp.now(), by: "adm_A" } }));
  await assertFails(setDoc(doc(as("adm_A"), "clinics/A/patients/p9"), { name: "x", phone: "0999" }));
  await assertFails(updateDoc(doc(as("adm_A"), "clinics/A"), { name: "جديد" }));
  await assertSucceeds(getDoc(doc(as("adm_A"), "clinics/A/patients/p1")));
  await assertSucceeds(updateDoc(doc(as("adm_A"), "clinics/A"), { deletion: null }));
  await assertSucceeds(setDoc(doc(as("adm_A"), "clinics/A/patients/p9"), { name: "x", phone: "0999" }));
});
test("حذف العيادة: لا يُنشأ حساب عيادة جديد وهو قيد الحذف", async () => {
  const mk = async (uid, cid, extra) => {
    const d = as(uid); const b = writeBatch(d);
    b.set(doc(d, `users/${uid}`), { role: "doctor", admin: true, clinicId: cid, active: true });
    b.set(doc(d, `clinics/${cid}`), { ownerUid: uid, slug: `dr-${cid.toLowerCase()}`, status: "trial", plan: "trial", expiresAt: future(14), features: {}, maxDoctors: 3, maxStaff: 3, ...extra });
    return b.commit();
  };
  await assertSucceeds(mk("newOk", "OK1", {}));
  await assertFails(mk("newDel", "DEL1", { deletion: { at: serverTimestamp(), by: "newDel" } }));
});
