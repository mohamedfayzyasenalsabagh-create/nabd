// فحص يومي للموقع الحقيقي كما يراه الزائر: الصفحات، زر التنزيل، ملف التطبيق، الدليل، النسخة التجريبية
// يكتب النتيجة في .results/live.txt (دون أي بيانات مرضى؛ أرقام الزوار والتنزيلات فقط)
import fs from "node:fs";
import { chromium } from "playwright";

const SITES = ["https://nabd.sy/", "https://nabdsy.web.app/", "https://mohamedfayzyasenalsabagh-create.github.io/nabd/"];
const APK = "https://mohamedfayzyasenalsabagh-create.github.io/nabd/nabd.apk";
const R = [];
const ok = (c, name, info = "") => { R.push(`${c ? "PASS" : "FAIL"} | ${name}${info ? " | " + info : ""}`); console.log(R.at(-1)); };
const get = async (u) => { try { const r = await fetch(u, { redirect: "follow" }); return { s: r.status, b: Buffer.from(await r.arrayBuffer()), t: r.headers.get("content-type") || "" }; } catch (e) { return { s: 0, b: Buffer.alloc(0), t: String(e) }; } };

// 1) الملفات المهمة على الموقعين
const repoSw = fs.readFileSync("sw.js", "utf8").match(/nabd-v\d+/)?.[0];
for (const s of SITES) {
  const sw = await get(s + "sw.js");
  ok(sw.s === 200 && sw.b.toString().includes(repoSw), `آخر نسخة منشورة على ${s}`, `${sw.b.toString().match(/nabd-v\d+/)?.[0]} (المتوقع ${repoSw})`);
  for (const f of ["guide.pdf", "guide_en.pdf"]) {
    const r = await get(s + f);
    ok(r.s === 200 && r.b.subarray(0, 4).toString() === "%PDF" && r.b.length > 1e6, `الدليل ${f} على ${s}`, `${r.s} ${(r.b.length / 1e6).toFixed(1)}MB`);
  }
  const app = await get(s + "app.html");
  ok(app.s === 200 && app.b.toString().includes('href="nabd.apk"'), `صفحة التنزيل app.html على ${s} تشير إلى ملف التطبيق`);
  const ap = await get(s + "nabd.apk");
  ok(ap.s === 200 && ap.b.subarray(0, 2).toString() === "PK" && ap.b.length > 10000, `ملف التطبيق ينزل من ${s}nabd.apk`, `${ap.s} ${ap.b.length} bytes`);
}
// 2) ملف التطبيق نفسه
const apk = await get(APK);
ok(apk.s === 200 && apk.b.subarray(0, 2).toString() === "PK" && apk.b.length > 10000, "ملف التطبيق nabd.apk ينزل وسليم", `${apk.s} ${apk.b.length} bytes`);

// 3) المتصفح الحقيقي: الصفحة الرئيسية وزر التنزيل والنسخة التجريبية والتنزيل الفعلي
const b = await chromium.launch();
for (const s of SITES) {
  const ctx = await b.newContext({ userAgent: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36", acceptDownloads: true });
  await ctx.route(/firestore\.googleapis\.com\/v1\/.*:commit/, (r) => r.abort()); // لا نحسب تنزيل الفحص ضمن تنزيلات الناس
  const pg = await ctx.newPage(); const errs = [];
  pg.on("pageerror", (e) => errs.push(e.message));
  try {
    await pg.goto(s, { timeout: 45000 }); await pg.waitForSelector(".lp-hero", { timeout: 30000 });
    const btns = await pg.$$eval(".lp-hero a", (e) => e.map((x) => x.textContent.trim()));
    ok(btns.some((t) => t.includes("تنزيل تطبيق أندرويد")) && btns.some((t) => t.includes("تجربة")), `الصفحة الرئيسية تعمل وفيها زر التنزيل (${s})`);
    const dl = pg.waitForEvent("download", { timeout: 30000 });
    await pg.click(".lp-hero a[href$='app.html']");
    const d = await dl; ok(d.suggestedFilename().endsWith(".apk"), `الضغط على زر التنزيل يبدأ تنزيل التطبيق (${s})`, d.suggestedFilename());
  } catch (e) { ok(false, `الصفحة الرئيسية وزر التنزيل (${s})`, e.message.slice(0, 150)); }
  ok(!errs.length, `لا أخطاء في الصفحة (${s})`, errs.slice(0, 2).join(" ; "));
  await ctx.close();
}
try {
  const pg = await b.newPage();
  await pg.goto(SITES[0] + "demo/?as=doctor", { timeout: 45000 });
  await pg.waitForSelector(".stats", { timeout: 40000 });
  ok(true, "النسخة التجريبية تفتح على الموقع الحقيقي");
} catch (e) { ok(false, "النسخة التجريبية تفتح على الموقع الحقيقي", e.message.slice(0, 150)); }
await b.close();

// 4) أرقام: زوار وتنزيلات آخر 7 أيام (للتنبيه إذا كان هناك زوار ولا تنزيلات)
if (process.env.SA) {
  try {
    const { initializeApp, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    initializeApp({ credential: cert(JSON.parse(process.env.SA)) });
    const db = getFirestore(), since = [new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10), "2026-10-20"].sort()[1]; // العدّاد بدأ في 20 تشرين الأول
    const sum = async (c, f) => (await db.collection(c).get()).docs.filter((d) => d.id >= since).reduce((s, d) => s + (d.data()[f] || 0), 0);
    const v = await sum("visits", "uniq"), n = await sum("downloads", "n");
    R.push(`INFO | منذ ${since}: زوار الموقع ${v} · تنزيلات التطبيق ${n}`);
    if (v >= 15 && n === 0) R.push("WARN | زوار دون أي تنزيل خلال أسبوع: تحقق من زر التنزيل من جوال في سوريا");
  } catch (e) { R.push("INFO | تعذّر قراءة الأرقام: " + e.message); }
}
fs.mkdirSync(".results", { recursive: true });
const fails = R.filter((x) => x.startsWith("FAIL")).length;
fs.writeFileSync(".results/live.txt", R.join("\n") + `\n\nTOTAL ${R.filter((x) => x.startsWith("PASS")).length}/${R.filter((x) => /^(PASS|FAIL)/.test(x)).length}\n`);
process.exit(fails ? 1 : 0);
