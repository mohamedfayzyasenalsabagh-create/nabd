// يفتح التطبيق بسرعة ودون إنترنت (البيانات تتزامن عند عودة الاتصال)
const CACHE = "nabd-v89";
const LIBS = "nabd-libs-v1"; // مكتبات Firebase والخطوط: عناوينها ثابتة بالإصدار فلا تتغير
const SHELL = ["./", "index.html", "app.html", "styles.css", "app.js", "fb.js", "ui.js", "staff.js", "admin.js", "card.js", "mods.js",
  "patient.js", "public.js", "owner.js", "legal.js", "config.js", "i18n.js", "en.js", "qrcode.js", "smart.js", "medref.js", "drugs.js",
  "drugsafety.js", "diseases.js", "faq.js", "importx.js", "live.js", "commission.js", "lib/xlsx.full.min.js", "manifest.json", "icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];
const FB = "https://www.gstatic.com/firebasejs/10.14.1/";
const SDK = ["firebase-app.js", "firebase-auth.js", "firebase-firestore.js", "firebase-storage.js"].map((f) => FB + f);
const FONT_CSS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap";

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })));
    const l = await caches.open(LIBS);
    await Promise.all([...SDK, FONT_CSS].map(async (u) => { if (!(await l.match(u))) { try { const r = await fetch(u, { mode: "cors" }); if (r.ok) await l.put(u, r); } catch {} } }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== LIBS).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// ملفات التطبيق: من الشبكة أولاً (مع مهلة قصيرة)، وإن لم تتوفر فمن النسخة المحفوظة
const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));
async function appFile(req) {
  const c = await caches.open(CACHE);
  try {
    const r = await Promise.race([fetch(req), timeout(navigator.onLine === false ? 1 : 4000)]);
    if (r.ok) c.put(req, r.clone());
    return r;
  } catch {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === "navigate") return (await c.match(new URL(req.url).pathname.endsWith("app.html") ? "app.html" : "index.html")) || Response.error();
    return Response.error();
  }
}
// المكتبات والخطوط: من النسخة المحفوظة أولاً
async function lib(req) {
  const l = await caches.open(LIBS);
  const hit = await l.match(req);
  if (hit) return hit;
  try { const r = await fetch(req); if (r.ok || r.type === "opaque") l.put(req, r.clone()); return r; }
  catch { return Response.error(); }
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  if (u.origin === location.origin) { if (/\.(pdf|apk)$/i.test(u.pathname)) return; e.respondWith(appFile(e.request)); return; }
  if (u.href.startsWith(FB) || u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") e.respondWith(lib(e.request));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const to = e.notification.data?.url || "./#/meds";
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((ws) => { for (const w of ws) { w.navigate?.(to); return w.focus(); } return self.clients.openWindow(to); }));
});
