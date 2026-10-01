// أدوات الواجهة المشتركة
export const COPYRIGHT = "© 2026 جميع الحقوق محفوظة · mohamedfayzyasenalsabagh@gmail.com";
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- التواريخ ----------
const pad = (n) => String(n).padStart(2, "0");
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
export const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const MONTHS = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
export function fmtDate(s, withDay = true) {
  if (!s) return "";
  const d = parseYmd(s);
  return `${withDay ? DAYS[d.getDay()] + " " : ""}${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export function fmtTime(t) {
  if (!t) return "";
  let [h, m] = t.split(":").map(Number);
  const pm = h >= 12;
  const hh = h % 12 || 12;
  return `${hh}:${pad(m)} ${pm ? "م" : "ص"}`;
}
export function tsDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return `${ymd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export const money = (n, cur = "ل.س") => `${Number(n || 0).toLocaleString("en-US")} ${cur}`;

// ---------- رسائل ----------
export function toast(msg, bad = false) {
  const t = document.createElement("div");
  t.className = "toast" + (bad ? " bad" : "");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 3200);
}

export function errMsg(e) {
  const c = e?.code || "";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found")) return "الرقم أو كلمة المرور غير صحيحة";
  if (c.includes("too-many-requests")) return "محاولات كثيرة، يرجى المحاولة بعد قليل";
  if (c.includes("network")) return "لا يوجد اتصال بالإنترنت";
  if (c.includes("permission-denied")) return window.__readOnly ? "اشتراك العيادة غير فعّال، النظام للقراءة فقط" : "ليست لديك صلاحية لهذا الإجراء";
  if (c.includes("weak-password")) return "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل";
  if (c.includes("email-already-in-use")) return "الحساب موجود مسبقاً";
  if (c.includes("invalid-email")) return "البريد الإلكتروني غير صحيح";
  return e?.message || "حدث خطأ، يرجى المحاولة مجدداً";
}

// ---------- نوافذ ----------
export function modal(title, bodyHtml, { ok = "حفظ", cancel = "إلغاء", onOk, onOpen, wide = false, danger = false } = {}) {
  return new Promise((resolve) => {
    const w = document.createElement("div");
    w.className = "modal-wrap";
    w.innerHTML = `<div class="modal${wide ? " wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn x" aria-label="إغلاق">✕</button></div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-foot">
        ${ok ? `<button class="btn ${danger ? "danger" : "primary"} ok">${esc(ok)}</button>` : ""}
        ${cancel ? `<button class="btn ghost cancel">${esc(cancel)}</button>` : ""}
      </div></div>`;
    document.body.appendChild(w);
    const close = (v) => { w.remove(); resolve(v); };
    w.querySelector(".x").onclick = () => close(null);
    w.querySelector(".cancel")?.addEventListener("click", () => close(null));
    w.addEventListener("click", (e) => { if (e.target === w) close(null); });
    const okBtn = w.querySelector(".ok");
    okBtn?.addEventListener("click", async () => {
      const form = w.querySelector("form");
      if (form && !form.reportValidity()) return;
      const data = form ? formData(form) : true;
      if (onOk) {
        okBtn.disabled = true;
        try {
          const r = await onOk(data, w);
          if (r === false) { okBtn.disabled = false; return; }
          close(r ?? data);
        } catch (e) { console.error(e); toast(errMsg(e), true); okBtn.disabled = false; }
      } else close(data);
    });
    attachVoice(w);
    const first = w.querySelector("input,select,textarea");
    if (first) setTimeout(() => first.focus(), 50);
    if (typeof onOpen === "function") onOpen(w);
  });
}
export const confirmBox = (title, text, ok = "تأكيد", danger = false) =>
  modal(title, `<p>${esc(text)}</p>`, { ok, danger });
export function info(title, html) { return modal(title, html, { ok: "حسناً", cancel: null }); }

export function formData(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === "checkbox") o[el.name] = el.checked;
    else if (el.type === "number") o[el.name] = el.value === "" ? null : Number(el.value);
    else o[el.name] = el.value.trim();
  }
  return o;
}

// ---------- حقول ----------
export function field(label, name, { type = "text", value = "", required = false, placeholder = "", attrs = "", hint = "" } = {}) {
  const id = "f_" + name + "_" + Math.random().toString(36).slice(2, 7);
  if (type === "textarea")
    return `<label class="field" for="${id}"><span>${esc(label)}</span><textarea id="${id}" name="${name}" ${required ? "required" : ""} placeholder="${esc(placeholder)}" ${attrs}>${esc(value)}</textarea>${hint ? `<small>${esc(hint)}</small>` : ""}</label>`;
  if (type === "checkbox")
    return `<label class="check" for="${id}"><input id="${id}" type="checkbox" name="${name}" ${value ? "checked" : ""} ${attrs}><span>${esc(label)}</span></label>`;
  return `<label class="field" for="${id}"><span>${esc(label)}</span><input id="${id}" type="${type}" name="${name}" value="${esc(value)}" ${required ? "required" : ""} placeholder="${esc(placeholder)}" ${attrs}>${hint ? `<small>${esc(hint)}</small>` : ""}</label>`;
}
export function select(label, name, options, value = "", { required = false } = {}) {
  const id = "s_" + name + "_" + Math.random().toString(36).slice(2, 7);
  const opts = options.map((o) => {
    const [v, t] = Array.isArray(o) ? o : [o, o];
    return `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(t)}</option>`;
  }).join("");
  return `<label class="field" for="${id}"><span>${esc(label)}</span><select id="${id}" name="${name}" ${required ? "required" : ""}>${opts}</select></label>`;
}

// ---------- الصور ----------
export function pickFile(accept = "image/*") {
  return new Promise((resolve) => {
    const i = document.createElement("input");
    i.type = "file"; i.accept = accept;
    i.onchange = () => resolve(i.files[0] || null);
    i.click();
  });
}
export function fileToDataUrl(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
// بتصغّر الصورة لحتى تنحفظ بقاعدة البيانات (أقل من ~900KB)
export async function compressImage(file, maxSide = 1400, quality = 0.72) {
  if (file.type === "application/pdf") {
    const d = await fileToDataUrl(file);
    if (d.length > 950000) throw new Error("ملف PDF كبير جداً، يرجى تصويره كصورة بدلاً منه");
    return d;
  }
  const url = await fileToDataUrl(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  let q = quality, side = maxSide, out;
  for (let tries = 0; tries < 6; tries++) {
    const s = Math.min(1, side / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    out = c.toDataURL("image/jpeg", q);
    if (out.length < 900000) return out;
    q -= 0.1; side = Math.round(side * 0.8);
  }
  throw new Error("الصورة كبيرة جداً");
}

// صورة مصغّرة للعرض في القوائم (بضع عشرات من الكيلوبايت)
export async function makeThumb(dataUrl, side = 320, q = 0.6) {
  if (!dataUrl?.startsWith("data:image")) return null;
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
  const s = Math.min(1, side / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", q);
}
// يعرض ملفاً كاملاً بعد تحميله عند الطلب
export function isImg(f) { return f.mime ? f.mime.startsWith("image") : (f.thumb || f.data?.startsWith("data:image") || false); }
export function tileImg(f) { const src = f.thumb || (f.data?.startsWith("data:image") ? f.data : ""); return src ? `<img src="${src}" alt="" loading="lazy">` : `<span class="pdf">PDF</span>`; }

export function showFile(title, note, loader, image, fname = "file.pdf") {
  return modal(title, `${note ? `<p>${esc(note)}</p>` : ""}<div class="file-full"><p class="muted center">جارٍ التحميل…</p></div>`, {
    ok: "حسناً", cancel: null, wide: true,
    onOpen: async (w) => {
      const box = w.querySelector(".file-full");
      try {
        const src = await loader();
        if (!src) { box.innerHTML = `<p class="alert">تعذّر تحميل الملف</p>`; return; }
        box.innerHTML = image ? `<img src="${esc(src)}" alt="" class="full">` : `<a class="btn primary" href="${esc(src)}" download="${esc(fname)}" target="_blank" rel="noopener">تنزيل PDF</a>`;
      } catch (e) { box.innerHTML = `<p class="alert">تعذّر تحميل الملف. تحقق من الاتصال.</p>`; }
    }
  });
}

// ---------- الشعار الافتراضي ----------
export function logoSvg(size = 48, body = "var(--accent)", baby = "#E9D8F4", ring = "#EFE6F7") {
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
  ${ring ? `<circle cx="60" cy="60" r="56" fill="${ring}"/>` : ""}
  <circle cx="55" cy="26" r="10.5" fill="${body}"/>
  <path d="M47 40 C38 43 33 52 33 64 C33 80 31 92 29 101 Q57 110 85 101 C82 91 80 82 80 72 C80 58 72 45 60 40 C56 39 51 39 47 40 Z" fill="${body}"/>
  <ellipse cx="61" cy="62" rx="18" ry="10" transform="rotate(-20 61 62)" fill="${baby}"/>
  <circle cx="76.5" cy="53" r="7" fill="${baby}"/>
  <path d="M41 57 C44 73 62 78 79 67" fill="none" stroke="${body}" stroke-width="5.5" stroke-linecap="round"/>
</svg>`;
}
export function logoHtml(pub, size = 48) {
  if (pub?.logo) return `<img class="logo-img" src="${esc(pub.logo)}" alt="" width="${size}" height="${size}">`;
  if (!pub || pub.specialty === "obgyn") return logoSvg(size);
  return specialtyMark(pub.specialty, size);
}
// شعار افتراضي حسب الاختصاص (قابل للاستبدال بشعار العيادة من الإعدادات)
export function specialtyMark(spec, size = 48) {
  const shapes = {
    dental: `<path d="M42 38c-7 0-11 4-11 12 0 9 3 18 5 30 1 6 3 9 6 9 4 0 5-6 6-13 1-6 3-9 6-9h4c3 0 5 3 6 9 1 7 2 13 6 13 3 0 5-3 6-9 2-12 5-21 5-30 0-8-4-12-11-12-6 0-9 3-14 3s-8-3-14-3z" fill="var(--accent)"/>`,
    eye: `<path d="M20 60c10-16 24-24 40-24s30 8 40 24c-10 16-24 24-40 24S30 76 20 60z" fill="none" stroke="var(--accent)" stroke-width="7" stroke-linejoin="round"/><circle cx="60" cy="60" r="13" fill="var(--accent)"/>`,
    peds: `<circle cx="60" cy="36" r="12" fill="var(--accent)"/><path d="M36 58c8-6 16-8 24-8s16 2 24 8M60 50v26M48 96l12-20 12 20" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
  };
  const inner = shapes[spec] || `<path d="M60 90S28 71 28 49c0-11 8-19 18-19 7 0 11 4 14 9 3-5 7-9 14-9 10 0 18 8 18 19 0 22-32 41-32 41z" fill="var(--accent)"/><path d="M34 60h14l5-10 7 19 6-13 3 4h17" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="var(--accent-soft)"/>${inner}</svg>`;
}

// ---------- واتساب ----------
export function waLink(phone, text) {
  let p = String(phone || "").replace(/\D/g, "");
  if (p.startsWith("0")) p = "963" + p.slice(1);
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

// ---------- طباعة ----------
export function printDoc(pub, title, bodyHtml, { qr = "", signer = "", footer = "" } = {}) {
  const w = document.createElement("div");
  w.className = "print-sheet";
  w.innerHTML = `
    <div class="print-tools no-print">
      <button class="btn primary p-go">طباعة / حفظ PDF</button>
      <button class="btn ghost p-close">إغلاق</button>
    </div>
    <div class="paper">
      <header class="letterhead">
        <div class="lh-logo">${logoHtml(pub, 72)}</div>
        <div class="lh-text">
          <div class="lh-name">${esc(pub?.doctorName ? "د. " + pub.doctorName : pub?.name || "")}</div>
          <div class="lh-title">${esc(pub?.title || "")}</div>
        </div>
        <div class="lh-contact">
          <div>${esc(pub?.address || "")}</div>
          <div dir="ltr">${esc(pub?.phone || "")}</div>
        </div>
      </header>
      <h2 class="doc-title">${esc(title)}</h2>
      <div class="doc-body">${bodyHtml}</div>
      <footer class="doc-sign">
        <div>التاريخ: ${esc(fmtDate(ymd(), false))}${footer ? `<div class="muted small">${esc(footer)}</div>` : ""}</div>
        ${qr ? `<div class="doc-qr">${qr}<div class="muted small">امسح الرمز للتحقق</div></div>` : ""}
        <div>توقيع ${esc(signer || "الطبيب")}: ....................</div>
      </footer>
    </div>`;
  document.body.appendChild(w);
  document.body.classList.add("printing");
  w.querySelector(".p-go").onclick = () => window.print();
  w.querySelector(".p-close").onclick = () => { w.remove(); document.body.classList.remove("printing"); };
}

// ---------- مساعدات عامة ----------
export function debounce(fn, ms = 250) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export function download(name, text, type = "application/json") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export const empty = (t) => `<div class="empty">${esc(t)}</div>`;

// ---------- المظهر (فاتح / داكن / تلقائي) ----------
export function applyTheme(mode) {
  const r = document.documentElement;
  if (mode === "light" || mode === "dark") r.dataset.theme = mode;
  else delete r.dataset.theme;
}

// ---------- شعار المنصة ----------
export function platformMark(size = 40) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <rect width="48" height="48" rx="13" fill="var(--brand, #0E7C7B)"/>
    <path d="M7 26h8l4-9 6 17 5-12 3 4h8" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ---------- الإملاء الصوتي ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const voiceSupported = !!SR;
// داخل تطبيق أندرويد يُستخدم محرك الإملاء في الجوال نفسه
const NATIVE_SR = typeof window.AndroidApp?.startDictation === "function";
const dictCbs = {};
window.__dictResult = (id, text, err) => { const cb = dictCbs[id]; delete dictCbs[id]; if (cb) cb(text, err); };
export function attachVoice(root) {
  if (!SR && !NATIVE_SR) return;
  root.querySelectorAll("textarea:not([data-novoice])").forEach((ta) => {
    if (ta.dataset.voiced) return;
    ta.dataset.voiced = "1";
    const b = document.createElement("button");
    b.type = "button"; b.className = "mic"; b.setAttribute("aria-label", "إملاء صوتي");
    b.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`;
    ta.parentElement.style.position = "relative";
    ta.parentElement.appendChild(b);
    let rec = null;
    b.onclick = () => {
      if (NATIVE_SR) {
        if (b.classList.contains("on")) { window.AndroidApp.stopDictation(); return; }
        const id = Math.random().toString(36).slice(2);
        b.classList.add("on");
        dictCbs[id] = (text, err) => {
          b.classList.remove("on");
          if (err) return toast(err, true);
          if (text) { ta.value = (ta.value ? ta.value.trimEnd() + " " : "") + text.trim(); ta.dispatchEvent(new Event("input")); }
        };
        window.AndroidApp.startDictation(id);
        return;
      }
      if (rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = "ar-SY"; rec.interimResults = false; rec.continuous = true;
      rec.onresult = (e) => {
        const t = [...e.results].slice(e.resultIndex).map((r) => r[0].transcript).join(" ");
        ta.value = (ta.value ? ta.value.trimEnd() + " " : "") + t.trim();
        ta.dispatchEvent(new Event("input"));
      };
      rec.onend = () => { rec = null; b.classList.remove("on"); };
      rec.onerror = () => { rec = null; b.classList.remove("on"); toast("تعذّر تشغيل الإملاء الصوتي", true); };
      b.classList.add("on");
      try { rec.start(); } catch { rec = null; b.classList.remove("on"); }
    };
  });
}

// ---------- رمز QR ----------
export function qrSvg(text, size = 120) {
  if (!window.qrcode) return "";
  const q = window.qrcode(0, "M");
  q.addData(text); q.make();
  const n = q.getModuleCount(), c = size / (n + 8);
  let d = "";
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) d += `M${(k + 4) * c} ${(r + 4) * c}h${c}v${c}h-${c}z`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="رمز التحقق"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

// ---------- رسم بياني بسيط لسلسلة قيم عبر الزمن ----------
// series: [{name, color, points:[{date:'YYYY-MM-DD', v:Number}]}], bands: [{from,to,color}] اختيارية
export function lineChart(series, { unit = "", height = 170, label = "" } = {}) {
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) return "";
  const W = 340, H = height, L = 34, R = 12, T = 14, B = 26;
  const ts = all.map((p) => parseYmd(p.date).getTime());
  const t0 = Math.min(...ts), t1 = Math.max(...ts), span = Math.max(1, t1 - t0);
  const sameDay = t1 === t0;
  let lo = Math.min(...all.map((p) => p.v)), hi = Math.max(...all.map((p) => p.v));
  const padv = (hi - lo) * 0.15 || 1; lo -= padv; hi += padv;
  const X = (d, i = 0, n = 1) => sameDay ? L + (n > 1 ? i / (n - 1) : .5) * (W - L - R) : L + (parseYmd(d).getTime() - t0) / span * (W - L - R);
  const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [lo + padv, (lo + hi) / 2, hi - padv].map((v) => Math.round(v * 10) / 10);
  const paths = series.map((s) => {
    const pts = s.points.slice().sort((a, b) => a.date.localeCompare(b.date));
    if (!pts.length) return "";
    const n = pts.length;
    const d = pts.map((p, i) => `${i ? "L" : "M"}${X(p.date, i, n).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(" ");
    const last = pts.at(-1);
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round"/>
      ${pts.map((p, i) => `<circle cx="${X(p.date, i, n).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3" fill="${s.color}"/>`).join("")}
      <circle cx="${X(last.date, n - 1, n).toFixed(1)}" cy="${Y(last.v).toFixed(1)}" r="5" fill="${s.color}" stroke="var(--card)" stroke-width="2"/>`;
  }).join("");
  const first = all.reduce((a, b) => (a.date < b.date ? a : b)), lastP = all.reduce((a, b) => (a.date > b.date ? a : b));
  const legend = series.length > 1 ? `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join("")}</div>` : "";
  return `<figure class="chart">${label ? `<figcaption class="muted small">${esc(label)}</figcaption>` : ""}${legend}
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" dir="ltr">
      ${ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="${L - 6}" y="${(Y(v) + 4).toFixed(1)}" font-size="10" text-anchor="end" fill="var(--muted)">${v}</text>`).join("")}
      ${paths}
      <text x="${L}" y="${H - 6}" font-size="10" fill="var(--muted)">${esc(first.date.slice(5))}</text>
      <text x="${W - R}" y="${H - 6}" font-size="10" text-anchor="end" fill="var(--muted)">${esc(lastP.date.slice(5))}</text>
    </svg>${unit ? `<div class="muted small unit">${esc(unit)}</div>` : ""}</figure>`;
}
