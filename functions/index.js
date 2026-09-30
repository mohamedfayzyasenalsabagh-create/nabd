// خدمات المنصة على الخادم (تتطلب خطة Firebase Blaze)
// 1) تذكير تلقائي بمواعيد الغد عبر واتساب (WhatsApp Cloud API) عند ضبط المفاتيح
// 2) نسخة احتياطية يومية كاملة لقاعدة البيانات في Cloud Storage
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret, defineString } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { v1 } from "@google-cloud/firestore";
import { dateInTz, clinicActive, intlPhone, reminderText, dueReminders } from "./logic.js";

initializeApp();
const db = getFirestore();
const WA_TOKEN = defineSecret("WHATSAPP_TOKEN");
const WA_PHONE_ID = defineString("WHATSAPP_PHONE_ID", { default: "" });
const BACKUP_BUCKET = defineString("BACKUP_BUCKET", { default: "" });

async function sendWhatsApp(to, text) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${WA_PHONE_ID.value()}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WA_TOKEN.value()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: intlPhone(to), type: "text", text: { body: text } }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`);
}

export const dailyReminders = onSchedule({ schedule: "0 18 * * *", timeZone: "Asia/Damascus", secrets: [WA_TOKEN] }, async () => {
  if (!WA_PHONE_ID.value()) { console.log("WhatsApp غير مضبوط، تم التخطي"); return; }
  const tomorrow = dateInTz(new Date(), "Asia/Damascus", 1);
  const clinics = await db.collection("clinics").get();
  let sent = 0, failed = 0;
  for (const c of clinics.docs) {
    const cl = c.data();
    if (!clinicActive(cl) || cl.autoWhatsApp === false) continue;
    const snap = await c.ref.collection("appointments").where("date", "==", tomorrow).get();
    for (const d of dueReminders(snap.docs.map((x) => ({ id: x.id, ...x.data() })))) {
      try {
        await sendWhatsApp(d.phone, reminderText(d, cl));
        await c.ref.collection("appointments").doc(d.id).update({ reminded: true, remindedAt: FieldValue.serverTimestamp() });
        sent++;
      } catch (e) { failed++; console.error(c.id, d.id, e.message); }
    }
  }
  console.log(`أُرسل ${sent} تذكيراً، وفشل ${failed}`);
});

export const nightlyBackup = onSchedule({ schedule: "0 3 * * *", timeZone: "Asia/Damascus" }, async () => {
  const bucket = BACKUP_BUCKET.value();
  if (!bucket) { console.log("لم يُحدَّد مكان النسخ الاحتياطي، تم التخطي"); return; }
  const client = new v1.FirestoreAdminClient();
  const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const [op] = await client.exportDocuments({
    name: client.databasePath(project, "(default)"),
    outputUriPrefix: `gs://${bucket}/${dateInTz()}`,
    collectionIds: [],
  });
  console.log("بدأت النسخة الاحتياطية:", op.name);
});
