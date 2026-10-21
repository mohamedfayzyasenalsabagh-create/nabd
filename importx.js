// استيراد المرضى من ملف إكسل أو CSV: اختيار الأعمدة، معاينة، تخطي المكرر، ثم الحفظ دفعة واحدة
import { db, P, doc, writeBatch, serverTimestamp, audit, normPhone } from "./fb.js";
import { $, esc, toast, errMsg, modal, pickFile, ymd } from "./ui.js";
import { S } from "./app.js";
import { PC, isDoctor } from "./staff.js";

// مكتبة قراءة الإكسل (SheetJS) محفوظة مع التطبيق فتعمل دون إنترنت، وتُحمَّل عند الحاجة فقط
let xlsxP = null;
function loadXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return (xlsxP ||= new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = new URL("./lib/xlsx.full.min.js", import.meta.url).href;
    s.onload = () => res(window.XLSX); s.onerror = () => { xlsxP = null; rej(new Error("تعذّر تحميل قارئ ملفات الإكسل")); };
    document.head.appendChild(s);
  }));
}

const FIELDS = [
  { k: "name", t: "الاسم", req: true, kw: ["الاسم", "اسم", "name", "المريض", "مريض"] },
  { k: "name2", t: "تكملة الاسم (الكنية)", kw: ["الكنية", "الكنيه", "اللقب", "العائلة", "last", "surname", "family"] },
  { k: "phone", t: "رقم الجوال", kw: ["جوال", "موبايل", "هاتف", "تلفون", "الرقم", "رقم", "phone", "mobile", "tel"] },
  { k: "age", t: "العمر", kw: ["العمر", "عمر", "age"] },
  { k: "dob", t: "تاريخ الميلاد", kw: ["الميلاد", "مواليد", "التولد", "تولد", "birth", "dob"] },
  { k: "sex", t: "الجنس", kw: ["الجنس", "جنس", "sex", "gender"] },
  { k: "address", t: "العنوان", kw: ["العنوان", "عنوان", "السكن", "المنطقة", "address", "city"] },
  { k: "bloodType", t: "زمرة الدم", kw: ["الزمرة", "زمرة", "blood"] },
  { k: "chronic", t: "أمراض مزمنة", med: true, kw: ["مزمن", "أمراض", "امراض", "chronic", "history"] },
  { k: "allergies", t: "حساسية", med: true, kw: ["حساسية", "تحسس", "allerg"] },
];
const norm = (v) => String(v ?? "").trim().toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
// أرقام عربية/هندية إلى إنكليزية
const digits = (v) => String(v ?? "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));

function guessHeader(rows) {
  let best = 0, score = -1;
  rows.slice(0, 10).forEach((r, i) => {
    const cells = r.map(norm).filter(Boolean);
    const sc = cells.filter((c) => FIELDS.some((f) => f.kw.some((w) => c.includes(norm(w))))).length * 3 + cells.filter((c) => isNaN(Number(c))).length;
    if (cells.length >= 1 && sc > score) { score = sc; best = i; }
  });
  return best;
}
function guessMap(head) {
  const used = new Set(), m = {};
  for (const f of FIELDS) {
    const i = head.findIndex((h, j) => !used.has(j) && f.kw.some((w) => norm(h).includes(norm(w))));
    if (i >= 0) { m[f.k] = i; used.add(i); }
  }
  if (m.name === undefined && head.length) m.name = 0;
  return m;
}
function parseSex(v) {
  const s = norm(v);
  if (!s) return "";
  if (/^(ذ|ذكر|م|m|male|man|boy|رجل|صبي)/.test(s) && !/^(مؤنث|مرا)/.test(s)) return "m";
  if (/^(ا|انثي|انثى|ث|f|female|woman|girl|امراه|بنت|مؤنث)/.test(s)) return "f";
  return "";
}
function parseDob(v) {
  if (!v && v !== 0) return null;
  if (v instanceof Date && !isNaN(v)) return ymd(new Date(v.getTime() + 12 * 3600e3)); // تفادي انزياح اليوم بسبب التوقيت
  const s = digits(v).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/^(19|20)\d{2}$/);
  if (m) return `${s}-01-01`;
  return null;
}
const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function buildRows(rows, hi, map, med) {
  const get = (r, k) => (map[k] === undefined || map[k] === "" ? "" : r[map[k]]);
  const out = [];
  for (const r of rows.slice(hi + 1)) {
    const name = [get(r, "name"), get(r, "name2")].map((x) => String(x ?? "").trim()).filter(Boolean).join(" ").replace(/\s+/g, " ");
    if (!name || name === "-" || /^\d+([.,]\d+)?$/.test(digits(name))) continue;
    let phone = normPhone(digits(get(r, "phone")));
    if (phone && phone.length < 9) phone = "";
    const ageRaw = Number(digits(get(r, "age")).replace(/[^\d.]/g, ""));
    const bt = String(get(r, "bloodType") || "").toUpperCase().replace(/\s/g, "").replace("0", "O");
    out.push({
      name, phone, age: ageRaw > 0 && ageRaw < 120 ? Math.round(ageRaw) : null, dob: parseDob(get(r, "dob")),
      sex: parseSex(get(r, "sex")), address: String(get(r, "address") ?? "").trim(), bloodType: BLOOD.includes(bt) ? bt : "",
      chronic: med ? String(get(r, "chronic") ?? "").trim() : "", allergies: med ? String(get(r, "allergies") ?? "").trim() : "",
    });
  }
  return out;
}

export async function importPatients() {
  const file = await pickFile(".xlsx,.xls,.csv,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv");
  if (!file) return;
  let XLSX, wb;
  try {
    XLSX = await loadXlsx();
    const buf = await file.arrayBuffer();
    if (/\.(csv|txt)$/i.test(file.name)) {
      // ملفات CSV العربية: UTF-8 غالباً، وإلا ترميز ويندوز العربي
      let text = new TextDecoder("utf-8").decode(buf);
      if (text.includes("\uFFFD")) { try { text = new TextDecoder("windows-1256").decode(buf); } catch {} }
      wb = XLSX.read(text.replace(/^\uFEFF/, ""), { type: "string", cellDates: true, raw: false });
    } else wb = XLSX.read(buf, { type: "array", cellDates: true });
  } catch (e) { return toast(errMsg(e) || "تعذّر قراءة الملف", true); }
  const med = isDoctor(); // السجل الطبي يكتبه الطبيب فقط (القواعد ترفض غيره)
  let sheet = wb.SheetNames.find((n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, blankrows: false }).length) || wb.SheetNames[0];
  let rows = [], hi = 0, map = {};
  const load = () => {
    rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, blankrows: false, defval: "", raw: true });
    hi = guessHeader(rows); map = guessMap((rows[hi] || []).map(String));
  };
  load();
  const existing = new Set(PC.list.map((p) => norm(p.name) + "|" + (p.phone || "")));
  await modal("استيراد المرضى من إكسل", `<div class="stack imp">
      <p class="muted small">الملف: <b class="notr">${esc(file.name)}</b>. اختر لكل معلومة العمود المقابل في ملفك، وراجع المعاينة ثم اضغط «استيراد». يُسجَّل المرضى دون حساب في التطبيق، ويمكن إنشاء الحساب لاحقاً من بطاقة المريض.</p>
      ${wb.SheetNames.length > 1 ? `<label class="field"><span>الورقة</span><select class="imp-sheet">${wb.SheetNames.map((n) => `<option ${n === sheet ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>` : ""}
      <label class="field"><span>صف العناوين</span><select class="imp-head"></select></label>
      <div class="imp-map grid2"></div>
      <label class="check"><input type="checkbox" class="imp-skip" checked><span>تخطي المرضى الموجودين مسبقاً (نفس الاسم والجوال)</span></label>
      <div class="imp-sum"></div><div class="tbl-wrap imp-prev"></div></div>`, {
    ok: "استيراد", wide: true,
    onOpen: (w) => {
      const draw = () => {
        const head = (rows[hi] || []).map((h, i) => String(h ?? "").trim() || `عمود ${i + 1}`);
        w.querySelector(".imp-head").innerHTML = rows.slice(0, 10).map((r, i) => `<option value="${i}" ${i === hi ? "selected" : ""}>الصف ${i + 1}: ${esc(r.filter((x) => x !== "").slice(0, 4).join(" · ").slice(0, 60))}</option>`).join("");
        w.querySelector(".imp-map").innerHTML = FIELDS.filter((f) => !f.med || med).map((f) => `<label class="field"><span>${esc(f.t)}${f.req ? " *" : ""}</span>
          <select data-k="${f.k}"><option value="">— لا يوجد —</option>${head.map((h, i) => `<option value="${i}" ${map[f.k] === i ? "selected" : ""}>${esc(h)}</option>`).join("")}</select></label>`).join("");
        w.querySelectorAll(".imp-map select").forEach((s) => s.onchange = () => { map[s.dataset.k] = s.value === "" ? undefined : Number(s.value); preview(); });
        preview();
      };
      const preview = () => {
        const all = buildRows(rows, hi, map, med);
        const skip = w.querySelector(".imp-skip").checked;
        const seen = new Set();
        const fresh = all.filter((r) => { const key = norm(r.name) + "|" + r.phone; if (seen.has(key)) return false; seen.add(key); return !(skip && existing.has(key)); });
        w._rows = fresh;
        const dup = all.length - fresh.length;
        w.querySelector(".imp-sum").innerHTML = `<p><b>${fresh.length}</b> مريض جاهز للاستيراد${dup ? ` · <span class="muted">${dup} مكرر أو موجود مسبقاً سيُتخطّى</span>` : ""}${all.filter((r) => !r.phone).length ? ` · <span class="muted">${all.filter((r) => !r.phone).length} دون رقم جوال</span>` : ""}</p>`;
        w.querySelector(".imp-prev").innerHTML = fresh.length ? `<table class="tbl"><thead><tr><th>الاسم</th><th>الجوال</th><th>العمر/الميلاد</th><th>الجنس</th><th>العنوان</th></tr></thead><tbody>
          ${fresh.slice(0, 6).map((r) => `<tr><td>${esc(r.name)}</td><td dir="ltr">${esc(r.phone)}</td><td>${esc(r.dob || (r.age ?? ""))}</td><td>${r.sex === "m" ? "ذكر" : r.sex === "f" ? "أنثى" : ""}</td><td>${esc(r.address)}</td></tr>`).join("")}</tbody></table>
          ${fresh.length > 6 ? `<p class="muted small">… و${fresh.length - 6} غيرهم</p>` : ""}` : `<p class="empty">لا يوجد مرضى في هذا الاختيار. تأكد من عمود الاسم وصف العناوين.</p>`;
      };
      w.querySelector(".imp-sheet")?.addEventListener("change", (e) => { sheet = e.target.value; load(); draw(); });
      w.querySelector(".imp-head").onchange = (e) => { hi = Number(e.target.value); map = guessMap((rows[hi] || []).map(String)); draw(); };
      w.querySelector(".imp-skip").onchange = preview;
      draw();
    },
    onOk: async (_, w) => {
      const list = w?._rows || [];
      if (!list.length) { toast("لا يوجد مرضى للاستيراد", true); return false; }
      const btn = w.querySelector(".ok"); if (btn) btn.textContent = "جارٍ الاستيراد…";
      try {
        let done = 0;
        for (let i = 0; i < list.length; i += 200) {
          const b = writeBatch(db);
          for (const r of list.slice(i, i + 200)) {
            const ref = doc(P.patients());
            b.set(ref, {
              name: r.name, phone: r.phone, age: r.age, dob: r.dob, sex: r.sex, address: r.address, bloodType: r.bloodType,
              guardian: false, doctorIds: [], uid: null, noAccount: true, archived: false, imported: true,
              createdAt: serverTimestamp(), createdBy: S.user?.uid || null,
            });
            if (r.chronic || r.allergies) b.set(doc(P.sub(ref.id, "medical"), "profile"), { chronic: r.chronic, allergies: r.allergies, updatedAt: serverTimestamp() }, { merge: true });
          }
          await b.commit();
          done += Math.min(200, list.length - i);
          if (btn) btn.textContent = `جارٍ الاستيراد… ${done}/${list.length}`;
        }
        await audit("استيراد مرضى من إكسل", `${list.length} مريض`);
        toast(`تم استيراد ${list.length} مريض ✓`);
      } catch (e) { toast(errMsg(e), true); if (btn) btn.textContent = "استيراد"; return false; }
    },
  });
}
