// المرجع الطبي للطبيب: الوصفات الجاهزة حسب المرض، والتثقيف الدوائي
import { $, $$, esc, freqText, daysText } from "./ui.js";
import { S } from "./app.js";

const main = () => $("#main");
const SPECS = [["", "كل الاختصاصات"], ["dental", "الأسنان"], ["general", "الباطنية والعامة"], ["peds", "الأطفال"], ["obgyn", "النسائية والتوليد"], ["derm", "الجلدية"], ["ent", "الأنف والأذن والحنجرة"], ["eye", "العين"], ["uro", "البولية"], ["ortho", "العظمية"]];

export async function renderLibrary() {
  const { DISEASES, searchDiseases } = await import("./diseases.js");
  const mine = [...(S.clinic?.modules || []), S.clinic?.specialty || ""].filter(Boolean);
  main().innerHTML = `<h2 class="page-title">نماذج وصفات دوائية جاهزة حسب التشخيص وفق أحدث البروتوكولات والتوصيات العالمية</h2>
    <p class="muted">طبيب متخرج حديثاً؟ لا تقلق، يتضمن التطبيق وصفات جاهزة لأكثر الأمراض شيوعاً وفق آخر تحديثات التوصيات العالمية للبروتوكولات العلاجية والدوائية. ابحث باسم المرض أو برمز التصنيف الدولي للأمراض ICD-10، وعند كتابة الوصفة للمريض اكتب اسم المرض في خانة البحث فتُعبأ الوصفة تلقائياً.</p>
    <div class="card stack"><input class="lq" placeholder="🔎 ابحث بالمرض: فطور فموية، التهاب أذن، جرب…" autocomplete="off">
      <div class="ds-tabs">${SPECS.map(([k, t]) => `<button data-s="${k}">${t}</button>`).join("")}</div></div>
    <div class="lib-out"></div>
    <div class="disclaimer">⚖️ <b>إخلاء مسؤولية:</b> الوصفة النهائية تقع على مسؤولية الطبيب الشخصية، وما نقدمه من مقترحات هو مجرد مساعدة مستندة إلى الدليل العلمي والتوصيات العالمية.</div>`;
  let spec = mine.find((k) => SPECS.some(([s]) => s === k)) || "";
  const draw = () => {
    $$(".ds-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.s === spec));
    const q = $(".lq").value.trim();
    let arr = q ? searchDiseases(q, mine) : DISEASES;
    if (spec) arr = arr.filter((d) => d.s.includes(spec));
    $(".lib-out").innerHTML = arr.length ? arr.map((d) => `<section class="card dz-card"><h3>${esc(d.n)}</h3><div class="muted small" dir="ltr">${esc(d.en)}${d.icd ? ` · ICD-10: ${esc(d.icd)}` : ""}</div>
      <ol dir="ltr">${d.items.map((it) => `<li><b>${esc(it.drug)}</b><div dir="rtl">${[esc(it.dose), it.times ? freqText(it.times) : "", it.days ? `لمدة ${daysText(it.days)}` : ""].filter(Boolean).join(" · ")}${it.note ? `<div class="muted small">${esc(it.note)}</div>` : ""}</div></li>`).join("")}</ol>
      ${d.tip ? `<p class="small">${esc(d.tip)}</p>` : ""}</section>`).join("") : `<p class="empty">لا توجد نتيجة</p>`;
  };
  $(".lq").oninput = draw;
  $$(".ds-tabs button").forEach((b) => b.onclick = () => { spec = b.dataset.s; draw(); });
  draw();
}

export async function renderDrugEd() {
  const { SAFETY, CONDS, LEVEL, findSafety } = await import("./drugsafety.js");
  const { BRANDS } = await import("./drugs.js");
  main().innerHTML = `<h2 class="page-title">التثقيف الدوائي</h2>
    <p class="muted">مرجع سريع يراجعه الطبيب قبل كتابة الوصفة: الأدوية المسموحة والممنوعة في الحمل والإرضاع ولمرضى الكبد والكلى. وإذا سُجّل في السجل الطبي للمريض أنه حامل أو مرضع أو لديه مرض كبدي أو كلوي، يظهر تنبيه أحمر تلقائياً عند كتابة دواء غير مناسب.</p>
    <div class="card stack"><input class="dq" placeholder="🔎 ابحث باسم الدواء العلمي أو التجاري" autocomplete="off" dir="auto">
      <div class="ds-tabs">${CONDS.map(([k, t, ic]) => `<button data-c="${k}">${ic} ${t}</button>`).join("")}</div>
      <div class="ds-tabs lv">${[["", "الكل"], ["no", "يُتجنب"], ["care", "بحذر"], ["ok", "آمن عادة"]].map(([k, t]) => `<button data-l="${k}">${t}</button>`).join("")}</div></div>
    <section class="card ds-out"></section>
    <p class="muted small">مرجع عام مختصر (BNF وLactMed وتوصيات FDA وACOG).</p><div class="disclaimer">⚖️ <b>إخلاء مسؤولية:</b> الوصفة النهائية تقع على مسؤولية الطبيب الشخصية، وما نقدمه من مقترحات هو مجرد مساعدة مستندة إلى الدليل العلمي والتوصيات العالمية.</div>`;
  let cond = "preg", lv = "";
  const draw = () => {
    $$(".ds-tabs button[data-c]").forEach((b) => b.classList.toggle("on", b.dataset.c === cond));
    $$(".ds-tabs button[data-l]").forEach((b) => b.classList.toggle("on", b.dataset.l === lv));
    const q = $(".dq").value.trim().toLowerCase();
    const rank = { no: 0, care: 1, ok: 2 };
    const viaBrand = q.length > 1 ? new Set(BRANDS.filter(([b]) => b.toLowerCase().includes(q)).map(([b, g]) => findSafety(`${b} ${g}`)).filter(Boolean)) : new Set();
    const arr = SAFETY.filter((e) => (!q || e.n.toLowerCase().includes(q) || e.k.some((k) => k.includes(q)) || viaBrand.has(e)) && (!lv || e[cond][0] === lv))
      .sort((a, b) => rank[a[cond][0]] - rank[b[cond][0]]);
    $(".ds-out").innerHTML = arr.length ? arr.map((e) => { const [l, note] = e[cond]; return `<div class="ds-row"><span class="nm" dir="auto">${esc(e.n)}</span><span class="chip ${LEVEL[l][1]}">${LEVEL[l][0]}</span>${note ? `<span class="nt">${esc(note)}</span>` : ""}</div>`; }).join("") : `<p class="empty">لا توجد نتيجة</p>`;
  };
  $(".dq").oninput = draw;
  $$(".ds-tabs button[data-c]").forEach((b) => b.onclick = () => { cond = b.dataset.c; draw(); });
  $$(".ds-tabs button[data-l]").forEach((b) => b.onclick = () => { lv = b.dataset.l; draw(); });
  draw();
}
