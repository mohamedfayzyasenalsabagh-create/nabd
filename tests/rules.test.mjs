// اختبارات قواعد الحماية على محاكي Firestore
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where, writeBatch, Timestamp, arrayUnion } from "firebase/firestore";

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
  await assertSucceeds(setDoc(doc(as("sec_A"), "users/n4"), { role: "patient", clinicId: "A", active: true, patientIds: [] }));
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
