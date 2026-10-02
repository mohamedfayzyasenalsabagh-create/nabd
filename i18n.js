// اللغة: العربية (افتراضي) أو الإنكليزية. الترجمة تتم على الواجهة المعروضة
const KEY = "lang";
const q = new URLSearchParams(location.search).get("lang");
if (q === "en" || q === "ar") { try { localStorage.setItem(KEY, q); } catch {} }
let saved = "ar";
try { saved = localStorage.getItem(KEY) || "ar"; } catch {}
export const LANG = saved === "en" ? "en" : "ar";
export const isEn = LANG === "en";
document.documentElement.lang = LANG;
document.documentElement.dir = isEn ? "ltr" : "rtl";

let EN = {};
if (isEn) EN = (await import("./en.js")).EN;

const AR = "؀-ۿ";
const LET = "ء-غف-يٱ-ۓ";
const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// أسماء الأيام والأشهر تُترجم حتى داخل الجمل
const ALWAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول"];
let RE = null;
function buildRe() {
  const keys = Object.keys(EN).filter((k) => k.length > 1 && (/\s/.test(k.trim()) || ALWAYS.includes(k))).sort((a, b) => b.length - a.length);
  RE = new RegExp(`(?<![${LET}])(?:${keys.map(escRe).join("|")})(?![${LET}])`, "g");
  const all = Object.keys(EN).filter((k) => k.length > 1).sort((a, b) => b.length - a.length);
  RE1 = new RegExp(`(?<![${LET}])(?:${all.map(escRe).join("|")})(?![${LET}])`, "g");
}
const POST = [[new RegExp(`(\\d)\\s?ص(?![${LET}])`, "g"), "$1 AM"], [new RegExp(`(\\d)\\s?م(?![${LET}])`, "g"), "$1 PM"], [/(^|[\s(])د\.\s?/g, "$1Dr. "],
  [/،/g, ","], [/؛/g, ";"], [/؟/g, "?"], [/«/g, "“"], [/»/g, "”"], [/ ← /g, " → "], [/٪/g, "%"]];
const PRE = [[/(^|[\s(])د\.\s?/g, "$1Dr. "], [/لمدة\s(\d+)\s(أيام|يوماً|يوم)/g, "for $1 days"], [/لمدة يوم واحد/g, "for 1 day"], [/(\d+)\s(أيام|يوماً)(?![\u0621-\u064A])/g, "$1 days"],
  [/أُرسل\s(\d+)\sمن\s(\d+)/g, "Sent $1 of $2"], [/(\d+)\sمرات يومياً/g, "$1 times daily"], [/(\d+)\sسنة/g, "$1 years"], [/(\d+)\sشهر/g, "$1 months"], [/(\d+)\sمرات/g, "$1 times"]];
const LETTER = new RegExp(`[${LET}]`);
const POSTRE = new RegExp(`(\\d)\\s?[صم](?![${LET}])|(^|[\\s(])د\\.`, "g");
let RE1 = null;
const CORE = new RegExp(`^([^${LET}]*)([\\s\\S]*?)([^${LET}]*)$`);
// ترجمة نص واحد (للنصوص التي لا تمر عبر الواجهة، مثل رسائل واتساب)
export function t(s) {
  if (!isEn || !s) return s;
  const str = String(s);
  const m = str.match(CORE);
  let out;
  if (m && EN[m[2]]) out = m[1] + EN[m[2]] + m[3];
  else {
    if (!RE) buildRe();
    out = str.replace(RE, (x) => EN[x] ?? x);
    for (const [a, b] of PRE) out = out.replace(a, b);
    // تمريرة ثانية بالكلمات المفردة تُقبل فقط إذا لم يبق أي حرف عربي
    if (LETTER.test(out)) {
      const o2 = out.replace(RE1, (x) => EN[x] ?? x);
      if (!LETTER.test(o2.replace(POSTRE, ""))) out = o2;
    }
  }
  for (const [a, b] of POST) out = out.replace(a, b);
  return out;
}
const DONE = new WeakSet();
const ARW = { "→": "←", "←": "→", "‹": "›", "›": "‹" };
const HAS_AR = new RegExp(`[${AR}]`);
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE"]);
const ATTRS = ["placeholder", "title", "aria-label", "label"];
function trNode(n) {
  if (n.nodeType === 3) {
    const v = n.nodeValue;
    if (v && HAS_AR.test(v)) { const o = t(v); if (o !== v) n.nodeValue = o; } else if (v && ARW[v.trim()] && !DONE.has(n)) { DONE.add(n); n.nodeValue = ARW[v.trim()]; }
    return;
  }
  if (n.nodeType !== 1 || SKIP.has(n.tagName) || n.closest?.("[translate=no],.notr,[contenteditable=true]")) return;
  for (const a of ATTRS) { const v = n.getAttribute?.(a); if (v && HAS_AR.test(v)) { const o = t(v); if (o !== v) n.setAttribute(a, o); } }
  if (n.tagName === "INPUT" && /^(button|submit)$/i.test(n.type) && HAS_AR.test(n.value)) { const o = t(n.value); if (o !== n.value) n.value = o; }
  const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let c;
  while ((c = w.nextNode())) {
    if (c.nodeType === 3) {
      const p = c.parentElement;
      if (!p || SKIP.has(p.tagName) || p.closest("[translate=no],.notr,[contenteditable=true]")) continue;
      const v = c.nodeValue;
      if (v && HAS_AR.test(v)) { const o = t(v); if (o !== v) c.nodeValue = o; } else if (v && ARW[v.trim()] && !DONE.has(c)) { DONE.add(c); c.nodeValue = ARW[v.trim()]; }
    } else {
      for (const a of ATTRS) { const v = c.getAttribute(a); if (v && HAS_AR.test(v)) { const o = t(v); if (o !== v) c.setAttribute(a, o); } }
      if (c.tagName === "INPUT" && /^(button|submit)$/i.test(c.type) && HAS_AR.test(c.value)) { const o = t(c.value); if (o !== c.value) c.value = o; }
    }
  }
}
if (isEn) {
  buildRe();
  const start = () => {
    trNode(document.body);
    new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === "characterData") trNode(m.target);
        else if (m.type === "attributes") trNode(m.target);
        else m.addedNodes.forEach(trNode);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    const tt = document.querySelector("title");
    const fixTitle = () => { if (HAS_AR.test(document.title)) { const o = t(document.title); if (o !== document.title) document.title = o; } };
    fixTitle(); if (tt) new MutationObserver(fixTitle).observe(tt, { childList: true, characterData: true, subtree: true });
  };
  if (document.body) start(); else addEventListener("DOMContentLoaded", start);
}
export function setLang(l) { try { localStorage.setItem(KEY, l); } catch {} location.reload(); }
// زر تبديل اللغة
export const langBtn = (cls = "btn small ghost") => `<button type="button" class="${cls} lang-t" onclick="window.__setLang('${isEn ? "ar" : "en"}')">🌐 ${isEn ? "العربية" : "الإنكليزية"}</button>`;
window.__setLang = setLang;
