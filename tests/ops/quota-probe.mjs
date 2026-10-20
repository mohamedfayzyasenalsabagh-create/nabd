// فحص كل ساعة: هل وصل Firestore إلى حد الخطة المجانية فتوقف التطبيق؟ (قراءة وكتابة مستند واحد للفحص فقط)
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
initializeApp({ credential: cert(JSON.parse(process.env.SA)) });
const db = getFirestore();
try {
  await db.doc("platform/config").get();
  await db.doc("ops/probe").set({ at: FieldValue.serverTimestamp() });
  console.log("OK: Firestore يعمل (القراءة والكتابة)");
} catch (e) {
  const quota = /RESOURCE_EXHAUSTED|quota/i.test(String(e.code) + e.message);
  console.error((quota ? "QUOTA: تجاوز حد الخطة المجانية، التطبيق متوقف حتى منتصف الليل بتوقيت المحيط الهادئ. " : "ERROR: ") + e.message);
  process.exit(1);
}
