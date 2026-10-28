// اختبار الحذف النهائي لحساب عيادة على محاكي Firestore (مشروع منفصل كي لا يتداخل مع اختبار القواعد)
import { test, before } from "node:test";
import assert from "node:assert";
import admin from "firebase-admin";
import { due, purgeClinic, GRACE_DAYS } from "./ops/purge.mjs";

let db;
before(() => {
  process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
  const app = admin.initializeApp({ projectId: "demo-purge" }, "purge");
  db = app.firestore();
});
const DAY = 864e5, TS = admin.firestore.Timestamp;

test("مهلة الحذف: لا حذف قبل 30 يوماً، وحذف بعدها أو عند «حذف الآن»", () => {
  assert.equal(due({}), false);
  assert.equal(due({ deletion: { at: TS.fromMillis(Date.now() - 5 * DAY) } }), false);
  assert.equal(due({ deletion: { at: TS.fromMillis(Date.now() - (GRACE_DAYS + 0.1) * DAY) } }), true);
  assert.equal(due({ deletion: { at: TS.now(), now: true } }), true);
});

test("الحذف النهائي يمسح كل بيانات العيادة وحساباتها ولا يمس عيادة أخرى", async () => {
  const set = (p, d) => db.doc(p).set(d);
  for (const c of ["Z", "K"]) {
    await set(`clinics/${c}`, { name: c, slug: `dr-${c.toLowerCase()}`, ownerUid: `adm_${c}` });
    await set(`clinics/${c}/patients/p1`, { name: "p" });
    await set(`clinics/${c}/patients/p1/visits/v1`, { d: 1 });
    await set(`clinics/${c}/patients/p1/prescriptions/r1`, { d: 1 });
    await set(`clinics/${c}/appointments/a1`, { d: 1 });
    await set(`clinics/${c}/payments/x1`, { d: 1 });
    await set(`clinics/${c}/phones/0900`, { d: 1 });
    await set(`users/adm_${c}`, { clinicId: c, role: "doctor" });
    await set(`users/pat_${c}`, { clinicId: c, role: "patient" });
    await set(`publicClinics/${c}`, { name: c });
    await set(`slugs/dr-${c.toLowerCase()}`, { cid: c });
    await set(`activity/${c}`, { patients: 1 });
    await set(`rxVerify/code${c}`, { clinicId: c });
  }
  await set("loginIdx/h1", { e: ["Z|staff", "K|staff"] });
  await set("loginIdx/h2", { e: ["Z|patient"] });
  await set("subscriptionPayments/s1", { clinicId: "Z", amount: 10 });
  let deleted = [];
  const r = await purgeClinic(db, "Z", { deleteAuthUsers: async (u) => { deleted = u; } });
  const gone = async (p) => !(await db.doc(p).get()).exists;
  for (const p of ["clinics/Z", "clinics/Z/patients/p1", "clinics/Z/patients/p1/visits/v1", "clinics/Z/patients/p1/prescriptions/r1",
    "clinics/Z/appointments/a1", "clinics/Z/payments/x1", "clinics/Z/phones/0900", "users/adm_Z", "users/pat_Z",
    "publicClinics/Z", "slugs/dr-z", "activity/Z", "rxVerify/codeZ", "loginIdx/h2"]) assert.ok(await gone(p), `بقي ${p}`);
  for (const p of ["clinics/K", "clinics/K/patients/p1/visits/v1", "users/adm_K", "publicClinics/K", "slugs/dr-k", "rxVerify/codeK", "subscriptionPayments/s1"])
    assert.ok(!(await gone(p)), `حُذف خطأً ${p}`);
  assert.deepEqual((await db.doc("loginIdx/h1").get()).data().e, ["K|staff"]);
  assert.deepEqual(deleted.sort(), ["adm_Z", "pat_Z"]);
  assert.equal(r.users, 2);
});
