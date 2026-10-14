// اختبار شامل للعمل دون إنترنت مع Firebase الحقيقي (على المحاكي المحلي):
// فتح التطبيق دون إنترنت، التعديل دون إنترنت، ثم المزامنة فور عودة الاتصال، وإشعار رسائل المريض.
// يعمل في GitHub Actions: firebase emulators:exec --only auth,firestore "node tests/e2e/offline.mjs"
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, ".results", "e2e");
fs.mkdirSync(OUT, { recursive: true });
const PROJECT = "nabd-platfor";
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT}`;
const OWNER = { Authorization: "Bearer owner", "Content-Type": "application/json" };
const results = [];
const log = (ok, name, info = "") => { results.push({ ok, name, info }); console.log(`${ok ? "✅" : "❌"} ${name}${info ? " — " + info : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- نسخة من الموقع متصلة بالمحاكي ----------
const SITE = fs.mkdtempSync(path.join(os.tmpdir(), "nabd-site-"));
for (const f of fs.readdirSync(ROOT)) {
  if (["node_modules", ".git", "android", "functions", "tests", ".results"].includes(f)) continue;
  fs.cpSync(path.join(ROOT, f), path.join(SITE, f), { recursive: true });
}
let fb = fs.readFileSync(path.join(SITE, "fb.js"), "utf8");
fb = fb.replace("inMemoryPersistence\n}", "inMemoryPersistence, connectAuthEmulator\n}")
  .replace("waitForPendingWrites, enableNetwork\n}", "waitForPendingWrites, enableNetwork, connectFirestoreEmulator\n}")
  .replace("persistentMultipleTabManager() }) })\n  : null;", "persistentMultipleTabManager() }) })\n  : null;\nif (db) { connectFirestoreEmulator(db, \"127.0.0.1\", 8080); connectAuthEmulator(auth, \"http://127.0.0.1:9099\", { disableWarnings: true }); }");
if (!fb.includes("connectFirestoreEmulator(db")) throw new Error("patch fb.js failed");
fs.writeFileSync(path.join(SITE, "fb.js"), fb);
const appjs = fs.readFileSync(path.join(SITE, "app.js"), "utf8").replace('location.protocol === "https:"', "true");
fs.writeFileSync(path.join(SITE, "app.js"), appjs);

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".pdf": "application/pdf" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("nf"); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" });
  fs.createReadStream(f).pipe(res);
}).listen(8799);
const B = "http://localhost:8799/";

// ---------- تحويل بيانات العيادة التجريبية إلى صيغة Firestore ----------
function val(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(val) } };
  if (typeof v === "object" && "__t" in v) return { timestampValue: new Date(v.__t).toISOString() };
  return { mapValue: { fields: fields(v) } };
}
function fields(o) { const r = {}; for (const k in o) if (o[k] !== undefined) r[k] = val(o[k]); return r; }
async function rest(method, url, body) {
  const r = await fetch(url, { method, headers: OWNER, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${url} → ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : {};
}
const getDocREST = (p) => rest("GET", `${FS}/${p}`).catch(() => null);
const sv = (d, k) => d?.fields?.[k]?.stringValue;

const browser = await chromium.launch();
try {
  // 1) توليد بيانات واقعية من العيادة التجريبية ورفعها للمحاكي
  {
    const ctx = await browser.newContext({ serviceWorkers: "block" });
    const pg = await ctx.newPage();
    pg.on("pageerror", (e) => console.log("demo pageerror:", String(e)));
    await pg.goto(B + "demo/?as=doctor"); await pg.waitForSelector(".stats", { timeout: 30000 });
    const { docs, users } = await pg.evaluate(() => ({ docs: JSON.parse(localStorage.getItem("demo-fs") || "[]"), users: JSON.parse(localStorage.getItem("demo-users") || "{}") }));
    await ctx.close();
    const writes = docs.map(([p, d]) => ({ update: { name: `projects/${PROJECT}/databases/(default)/documents/${p}`, fields: fields(d) } }));
    for (let i = 0; i < writes.length; i += 400) await rest("POST", `${FS}:commit`, { writes: writes.slice(i, i + 400) });
    for (const u of Object.values(users)) await rest("POST", `${AUTH}/accounts`, { localId: u.uid, email: u.email, password: u.pw });
    globalThis.U = users;
    log(docs.length > 50, "تجهيز قاعدة بيانات الاختبار", `${docs.length} مستند و${Object.keys(users).length} حسابات`);
  }
  const patientUser = Object.values(U).find((u) => u.uid === "u-pt");

  // 2) الطبيب: دخول، ثم فتح التطبيق دون إنترنت
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar" });
  const pg = await ctx.newPage();
  const errs = []; pg.on("pageerror", (e) => errs.push(String(e)));
  await pg.goto(B + "#/login");
  await pg.waitForSelector("#lf", { timeout: 30000 });
  await pg.fill('#lf [name="id"]', "demo@nabd.app"); await pg.fill('#lf [name="pw"]', "demo1234");
  await pg.click('#lf [type="submit"]');
  await pg.waitForSelector(".stats", { timeout: 30000 });
  log(true, "دخول الطبيب (Firebase حقيقي على المحاكي)");
  const swOk = await pg.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise((r) => setTimeout(() => r(false), 20000))]));
  await pg.reload(); await pg.waitForSelector(".stats", { timeout: 30000 });
  // نزور الصفحات الأساسية مرة مع الإنترنت (كما يفعل المستخدم عادة) فتُحفظ بياناتها على الجهاز
  for (const h of ["#/appts?v=week", "#/patients", "#/p/p01/summary"]) { await pg.evaluate((x) => (location.hash = x), h); await sleep(2500); }
  await pg.evaluate(() => (location.hash = "#/")); await sleep(1500);
  log(swOk && (await pg.evaluate(() => !!navigator.serviceWorker.controller)), "تثبيت نسخة التطبيق على الجهاز (Service Worker)");

  await ctx.setOffline(true);
  await sleep(500);
  const t0 = Date.now();
  await pg.reload();
  const openedOffline = await pg.waitForSelector(".stats", { timeout: 30000 }).then(() => true, () => false);
  log(openedOffline, "فتح التطبيق دون إنترنت", `${Date.now() - t0} ms`);
  await pg.screenshot({ path: path.join(OUT, "1-offline-home.png") });
  const bar = await pg.locator("#netbar").innerText().catch(() => "");
  log(bar.includes("لا يوجد إنترنت"), "شريط «لا يوجد إنترنت» ظاهر", bar.slice(0, 40));

  // التنقل دون إنترنت
  for (const h of ["#/appts?v=week", "#/patients", "#/p/p01/summary", "#/money", "#/assistant"]) {
    await pg.evaluate((x) => (location.hash = x), h); await sleep(1800);
    const bad = await pg.locator("#main .alert").allInnerTexts();
    const loading = await pg.locator("#main .loading").count();
    log(!loading && !bad.some((x) => x.includes("غير محفوظة") || x.includes("offline")), `صفحة ${h} دون إنترنت`, bad.join(" | ").slice(0, 80));
  }

  // 3) تعديلات دون إنترنت
  await pg.evaluate(() => { localStorage.setItem("apptMode", "grid"); location.hash = "#/appts?v=week&d=" + new Date().toISOString().slice(0, 10); });
  await pg.waitForSelector(".agrid", { timeout: 15000 });
  await sleep(800);
  const chip = pg.locator(".g-chip").first();
  const moveName = await chip.locator("b").innerText();
  const target = pg.locator(".g-free:not(.off)").last();
  const tDay = await target.getAttribute("data-day"), tTime = await target.getAttribute("data-t"), tDoc = await target.getAttribute("data-doc");
  const bb = await chip.boundingBox();
  await pg.mouse.move(bb.x + 10, bb.y + 10); await pg.mouse.down(); await sleep(800); await pg.mouse.up();
  await sleep(300);
  await target.scrollIntoViewIfNeeded(); await target.click();
  await pg.locator(".modal button", { hasText: "نقل" }).last().click();
  const t1 = Date.now();
  const moved = await pg.waitForSelector(".toast:has-text('تم نقل الموعد')", { timeout: 8000 }).then(() => true, () => false);
  log(moved, "نقل موعد دون إنترنت (دون تعليق)", `${moveName} → ${tDay} ${tTime} خلال ${Date.now() - t1} ms`);
  await pg.screenshot({ path: path.join(OUT, "2-offline-move.png") });
  await pg.keyboard.press("Escape").catch(() => {});

  const t2 = Date.now();
  const sent = await pg.evaluate(async () => { const s = await import("/staff.js"); await s.sendToApp("p01", "رسالة أُرسلت دون إنترنت", "note"); return true; }).catch((e) => String(e));
  log(sent === true && Date.now() - t2 < 5000, "إرسال رسالة للمريض دون إنترنت", `${Date.now() - t2} ms`);
  const t3 = Date.now();
  const paid = await pg.evaluate(async () => {
    const f = await import("/fb.js");
    await f.addDoc(f.P.col("payments"), { patientId: "p01", patientName: "e2e", amount: 12345, date: new Date().toISOString().slice(0, 10), method: "cash", note: "e2e offline", createdAt: f.serverTimestamp() });
    return true;
  }).catch((e) => String(e));
  log(paid === true && Date.now() - t3 < 5000, "تسجيل دفعة دون إنترنت", `${Date.now() - t3} ms`);
  await pg.evaluate(() => (location.hash = "#/patients")); await sleep(1500);
  await pg.locator("button:has-text('مريض جديد'), .new").first().click(); await sleep(500);
  const nm = pg.locator(".modal").last();
  await nm.locator('[name="name"]').fill("مريض سُجّل دون إنترنت");
  if (await nm.locator('[name="noAccount"]').count()) await nm.locator('[name="noAccount"]').check();
  const t5 = Date.now();
  await nm.locator(".ok").click();
  const regOk = await pg.waitForFunction(() => document.body.innerText.includes("مريض سُجّل دون إنترنت"), null, { timeout: 8000 }).then(() => true, () => false);
  log(regOk, "تسجيل مريض جديد دون إنترنت", `${Date.now() - t5} ms`);
  await pg.evaluate(() => document.querySelectorAll(".modal-wrap").forEach((w) => w.remove()));
  const before = await getDocREST(`clinics/demo/appointments/${tDay}_${tTime.replace(":", "")}_${tDoc}`);
  log(!before, "لم تصل التعديلات للخادم بعد (طبيعي دون إنترنت)");

  // 4) عودة الإنترنت → مزامنة فورية
  const t4 = Date.now();
  await ctx.setOffline(false);
  const synced = await pg.waitForSelector("#netbar.ok", { timeout: 30000 }).then(() => true, () => false);
  log(synced, "مزامنة فورية عند عودة الإنترنت", `${Date.now() - t4} ms`);
  await sleep(1500);
  const appts = await rest("POST", `${FS}/clinics/demo:runQuery`, { structuredQuery: { from: [{ collectionId: "appointments" }], where: { fieldFilter: { field: { fieldPath: "date" }, op: "EQUAL", value: { stringValue: tDay } } } } });
  const onServer = appts.some((x) => x.document && sv(x.document, "time") === tTime && sv(x.document, "patientName") === moveName && sv(x.document, "status") === "confirmed");
  const oldCancelled = appts.length && (await rest("POST", `${FS}/clinics/demo:runQuery`, { structuredQuery: { from: [{ collectionId: "appointments" }], where: { fieldFilter: { field: { fieldPath: "cancelReason" }, op: "EQUAL", value: { stringValue: "نقل" } } } } })).some((x) => x.document);
  log(onServer && oldCancelled, "الموعد المنقول وصل للخادم والقديم أُلغي");
  const msgs = await rest("GET", `${FS}/clinics/demo/patients/p01/messages?pageSize=300`);
  log((msgs.documents || []).some((d) => sv(d, "text") === "رسالة أُرسلت دون إنترنت"), "الرسالة وصلت للخادم بعد المزامنة");
  const pts = await rest("POST", `${FS}/clinics/demo:runQuery`, { structuredQuery: { from: [{ collectionId: "patients" }], where: { fieldFilter: { field: { fieldPath: "name" }, op: "EQUAL", value: { stringValue: "مريض سُجّل دون إنترنت" } } } } });
  log(pts.some((x) => x.document), "المريض الجديد وصل للخادم بعد المزامنة");
  const pays = await rest("GET", `${FS}/clinics/demo/payments?pageSize=1000`);
  log((pays.documents || []).some((d) => sv(d, "note") === "e2e offline"), "الدفعة وصلت للخادم بعد المزامنة");
  await pg.screenshot({ path: path.join(OUT, "3-synced.png") });
  log(!errs.length, "لا أخطاء في الصفحة (الطبيب)", errs.slice(0, 3).join(" | ").slice(0, 200));

  // 5) المريض: شارة وإشعار عند وصول رسالة، وفتح التطبيق دون إنترنت
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar" });
  const pp = await pctx.newPage();
  const perrs = []; pp.on("pageerror", (e) => perrs.push(String(e)));
  await pp.goto(B + "#/login"); await pp.waitForSelector("#lf", { timeout: 30000 });
  await pp.fill('#lf [name="id"]', patientUser.email); await pp.fill('#lf [name="pw"]', patientUser.pw);
  await pp.click('#lf [type="submit"]');
  await pp.waitForSelector(".bottomnav, .ag", { timeout: 30000 });
  if (await pp.locator(".ag").count()) { await pp.check(".ag"); await pp.click(".go"); await pp.waitForSelector(".bottomnav", { timeout: 30000 }); }
  log(true, "دخول المريض");
  await sleep(2000);
  const now = new Date().toISOString();
  await rest("POST", `${FS}/clinics/demo/patients/p01/messages`, { fields: fields({ from: "clinic", text: "تذكير: موعدك غداً", kind: "reminder", at: { __t: Date.now() } }) });
  const badge = await pp.waitForSelector('.bottomnav a[data-r="msgs"] .nb:not([hidden])', { timeout: 15000 }).then((e) => e.innerText(), () => "");
  const toast = await pp.locator(".toast").allInnerTexts();
  log(badge === "1", "شارة رسالة جديدة عند المريض", `badge=${badge} toast=${toast.join(" ")}`);
  await pp.screenshot({ path: path.join(OUT, "4-patient-badge.png") });
  await pp.click('.bottomnav a[data-r="msgs"]'); await sleep(1500);
  log(await pp.locator(".bubble", { hasText: "تذكير: موعدك غداً" }).count() > 0 && !(await pp.locator('.bottomnav .nb:not([hidden])').count()), "الرسالة ظاهرة في «رسائل» والشارة اختفت");
  await pp.evaluate(() => navigator.serviceWorker.ready);
  await pctx.setOffline(true);
  await pp.reload();
  log(await pp.waitForSelector(".bottomnav", { timeout: 30000 }).then(() => true, () => false), "فتح تطبيق المريض دون إنترنت");
  await pp.screenshot({ path: path.join(OUT, "5-patient-offline.png") });
  await pctx.setOffline(false);
  log(!perrs.length, "لا أخطاء في الصفحة (المريض)", perrs.slice(0, 3).join(" | ").slice(0, 200));
} catch (e) {
  log(false, "توقف الاختبار بخطأ", String(e?.stack || e).slice(0, 600));
  for (const c of browser.contexts()) for (const p of c.pages()) await p.screenshot({ path: path.join(OUT, `fail-${Date.now()}.png`) }).catch(() => {});
} finally {
  await browser.close(); server.close();
  const pass = results.filter((r) => r.ok).length;
  const txt = results.map((r) => `${r.ok ? "PASS" : "FAIL"} | ${r.name}${r.info ? " | " + r.info : ""}`).join("\n") + `\n\nTOTAL ${pass}/${results.length}\n`;
  fs.writeFileSync(path.join(OUT, "result.txt"), txt);
  console.log(`\n${pass}/${results.length} نجح`);
  process.exit(pass === results.length ? 0 : 1);
}
