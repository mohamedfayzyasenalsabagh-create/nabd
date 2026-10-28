// الحذف النهائي لحسابات العيادات: بعد انتهاء مهلة الـ30 يوماً من طلب الحذف، أو فوراً إذا طلب صاحب المنصة «حذف الآن»
// يحذف: العيادة بكل بياناتها (المرضى والمواعيد والحسابات...)، حسابات فريقها ومرضاها (المستندات وحسابات الدخول)،
// صفحتها العامة ورابطها، ورموز التحقق من وصفاتها، وفهارس الدخول. تبقى دفعات الاشتراك (سجل مالي لصاحب المنصة).
// يكتب في .results/purge.txt أعداداً فقط دون أي بيانات.
import fs from "node:fs";
export const GRACE_DAYS = 30;
const ms = (t) => (t?.toMillis ? t.toMillis() : t?._seconds ? t._seconds * 1000 : +new Date(t));
export function due(clinic, now = Date.now()) {
  const d = clinic?.deletion;
  if (!d || !d.at) return false;
  if (d.now === true) return true;
  return now - ms(d.at) >= GRACE_DAYS * 864e5;
}
export async function purgeClinic(db, cid, { deleteAuthUsers = async () => {} } = {}) {
  const ref = db.doc(`clinics/${cid}`);
  const users = await db.collection("users").where("clinicId", "==", cid).get();
  const uids = users.docs.map((d) => d.id);
  const rx = await db.collection("rxVerify").where("clinicId", "==", cid).get();
  const slugs = await db.collection("slugs").where("cid", "==", cid).get();
  let idx = 0;
  for (const d of (await db.collection("loginIdx").get()).docs) {
    const e = d.data().e || [], keep = e.filter((x) => !String(x).startsWith(`${cid}|`));
    if (keep.length !== e.length) { idx++; if (keep.length) await d.ref.update({ e: keep }); else await d.ref.delete(); }
  }
  const w = db.bulkWriter();
  [...users.docs, ...rx.docs, ...slugs.docs].forEach((d) => w.delete(d.ref));
  w.delete(db.doc(`publicClinics/${cid}`));
  w.delete(db.doc(`activity/${cid}`));
  await w.close();
  await db.recursiveDelete(ref);
  if (uids.length) await deleteAuthUsers(uids);
  return { users: uids.length, rx: rx.size, slugs: slugs.size, loginIdx: idx };
}
// التشغيل من GitHub Actions بمفتاح حساب الخدمة
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const admin = (await import("firebase-admin")).default;
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.SA)) });
  const db = admin.firestore(), auth = admin.auth();
  const all = await db.collection("clinics").where("deletion", "!=", null).get();
  const out = [];
  for (const d of all.docs) {
    const c = d.data();
    if (!due(c)) { out.push(`WAIT | عيادة قيد الحذف، المتبقي ${Math.ceil((ms(c.deletion.at) + GRACE_DAYS * 864e5 - Date.now()) / 864e5)} يوماً`); continue; }
    const r = await purgeClinic(db, d.id, { deleteAuthUsers: async (u) => { for (let i = 0; i < u.length; i += 1000) await auth.deleteUsers(u.slice(i, i + 1000)); } });
    out.push(`DONE | حُذفت عيادة نهائياً: ${r.users} حساباً، ${r.rx} رمز وصفة`);
  }
  fs.mkdirSync(".results", { recursive: true });
  fs.writeFileSync(".results/purge.txt", `حذف الحسابات ${new Date().toISOString()}\n${out.join("\n") || "لا توجد عيادات قيد الحذف"}\n`);
  console.log(out.join("\n") || "none");
}
