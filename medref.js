// المرجع الطبي للطبيب: الوصفات الجاهزة حسب المرض، والتثقيف الدوائي
import { $, $$, esc, freqText, daysText } from "./ui.js";
import { S } from "./app.js";
import { mySpec } from "./staff.js";
import { isEn } from "./i18n.js";

const main = () => $("#main");
const SPECS = [["", "كل الاختصاصات"], ["dental", "الأسنان"], ["general", "الباطنية والعامة"], ["peds", "الأطفال"], ["obgyn", "النسائية والتوليد"], ["derm", "الجلدية"], ["ent", "الأنف والأذن والحنجرة"], ["eye", "العين"], ["uro", "البولية"], ["ortho", "العظمية"]];

export async function renderLibrary() {
  const { DISEASES, searchDiseases } = await import("./diseases.js");
  const mine = [mySpec(), ...(S.clinic?.modules || []), S.clinic?.specialty || ""].filter(Boolean);
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

// ---------- المساعد الذكي ----------
export async function renderAssistant() {
  const [sm, { DISEASES }] = await Promise.all([import("./smart.js"), import("./diseases.js")]);
  const tab = new URLSearchParams(location.hash.split("?")[1] || "").get("t") || "dx";
  const TABS = [["dx", "🩺 من الأعراض إلى التشخيص"], ["ddi", "💊 التداخلات الدوائية"], ["lab", "🧪 تفسير التحاليل"]];
  main().innerHTML = `<h2 class="page-title">🤖 المساعد الطبي الذكي</h2>
    <p class="muted">أدوات طبية مساعدة تعمل داخل التطبيق: اقتراح التشخيص من الأعراض، وفحص التداخلات بين الأدوية، وتفسير نتائج التحاليل.</p>
    <div class="ds-tabs as-tabs">${TABS.map(([k, t]) => `<button data-t="${k}" class="${k === tab ? "on" : ""}">${t}</button>`).join("")}</div>
    <div class="as-out"></div>
    <div class="disclaimer">⚖️ <b>إخلاء مسؤولية:</b> القرار الطبي النهائي يقع على مسؤولية الطبيب الشخصية، وما نقدمه من مقترحات هو مجرد مساعدة مستندة إلى الدليل العلمي والتوصيات العالمية.</div>`;
  $$(".as-tabs button").forEach((b) => b.onclick = () => { location.hash = `#/assistant?t=${b.dataset.t}`; });
  const out = $(".as-out");
  if (tab === "dx") {
    const sel = new Set(); let all = false;
    const COMMON = ["fever", "cough", "sorethroat", "runny", "earpain", "headache", "abdpain", "diarrhea", "vomit", "dysuria", "rash", "itch", "toothache", "gumswelling", "mouthulcer", "redeye", "jointpain", "backpain", "dyspnea", "fatigue"];
    out.innerHTML = `<section class="card stack"><p class="muted small">اختر أعراض المريض، فتظهر الأمراض المحتملة من مكتبة الأمراض الشائعة مع الوصفة الجاهزة لكل منها.</p>
      <input class="sq" placeholder="🔎 ابحث عن عرض: حرارة، سعال، ألم أذن…" autocomplete="off"><div class="sy-sel"></div><div class="sy-list chips-wrap"></div></section><div class="dx-out"></div>`;
    const draw = () => {
      $(".sy-sel").innerHTML = sel.size ? `<b>الأعراض المختارة:</b> ${[...sel].map((k) => `<button class="chip on sy notr" data-k="${k}">${esc(sm.symName(k, isEn))} ✕</button>`).join(" ")}` : "";
      const q = $(".sq").value.trim();
      const pool = sm.searchSymptoms(q).filter((s) => !sel.has(s[0]) && (q || all || COMMON.includes(s[0])));
      $(".sy-list").innerHTML = pool.map((s) => `<button class="chip sy notr" data-k="${s[0]}">${esc(isEn ? s[2] : s[1])}</button>`).join(" ") + (!q && !all ? ` <button class="chip more-sy">كل الأعراض…</button>` : "");
      $(".more-sy")?.addEventListener("click", () => { all = true; draw(); });
      $$(".sy").forEach((b) => b.onclick = () => { const k = b.dataset.k; sel.has(k) ? sel.delete(k) : sel.add(k); draw(); });
      const r = sm.suggestDx([...sel], DISEASES);
      $(".dx-out").innerHTML = (r.red.length ? `<section class="card alert danger">${r.red.map((t) => `<p>🚨 ${esc(t)}</p>`).join("")}</section>` : "")
        + (sel.size ? (r.list.length ? r.list.map(({ d, hit, total }) => `<section class="card dz-card"><div class="row-between"><h3>${esc(d.n)}</h3><span class="chip"><span class="notr">${hit.length}/${total}</span> <span>أعراض</span></span></div>
          <div class="muted small" dir="ltr">${esc(d.en)}${d.icd ? ` · ICD-10: ${esc(d.icd)}` : ""}</div>
          <ol dir="ltr">${d.items.map((it) => `<li><b>${esc(it.drug)}</b><div dir="rtl">${[esc(it.dose), it.times ? freqText(it.times) : "", it.days ? `لمدة ${daysText(it.days)}` : ""].filter(Boolean).join(" · ")}</div></li>`).join("")}</ol>
          ${d.tip ? `<p class="small">${esc(d.tip)}</p>` : ""}</section>`).join("") : `<p class="empty">لا يوجد اقتراح من المكتبة لهذه الأعراض</p>`) : "");
    };
    $(".sq").oninput = draw; draw();
  } else if (tab === "ddi") {
    out.innerHTML = `<section class="card stack"><p class="muted small">اكتب أسماء الأدوية (العلمية أو التجارية)، كل دواء في سطر، فتظهر التداخلات الخطيرة والمتوسطة الشائعة بينها.</p>
      <textarea class="dq2" rows="5" dir="ltr" placeholder="Warfarin&#10;Brufen&#10;Clarithromycin"></textarea></section><div class="ddi-out"></div>`;
    const draw = () => {
      const ds = $(".dq2").value.split(/\n|،|,/).map((x) => x.trim()).filter(Boolean);
      const r = sm.checkInteractions(ds);
      $(".ddi-out").innerHTML = ds.length < 2 ? "" : r.length ? r.map((x) => `<section class="card ddi ${x.level}"><div class="row-between"><b dir="ltr">${esc(x.a)} + ${esc(x.b)}</b><span class="chip ${x.level === "danger" ? "danger" : "warn"}">${x.label}</span></div><p>${esc(x.text)}</p></section>`).join("")
        : `<section class="card"><p>✓ لا توجد تداخلات معروفة شائعة بين هذه الأدوية في المرجع المختصر. هذا لا ينفي كل التداخلات.</p></section>`;
    };
    $(".dq2").oninput = draw;
  } else {
    out.innerHTML = `<section class="card stack"><p class="muted small">اكتب نتيجة التحليل فيظهر إن كانت طبيعية أو منخفضة أو مرتفعة مع التفسير (قيم البالغين). وأدخل الكرياتينين مع العمر والجنس لحساب eGFR.</p>
      <div class="grid2">${`<label class="field"><span>الجنس</span><select class="lsx"><option value="">—</option><option value="f">أنثى</option><option value="m">ذكر</option></select></label>`}<label class="field"><span>العمر</span><input class="lage" type="number" min="18" max="110" dir="ltr"></label></div>
      <div class="lab-rows">${sm.LABS.map((l) => `<label class="lab-row"><span>${esc(l.n)}</span><input data-k="${l.k}" inputmode="decimal" dir="ltr" placeholder="${esc(l.u)}"><em class="lr" data-r="${l.k}"></em></label>`).join("")}</div></section><div class="lab-out"></div>`;
    const draw = () => {
      const sx = $(".lsx").value, age = $(".lage").value, res = [];
      $$(".lab-row input").forEach((i) => {
        const r = i.value.trim() ? sm.interpretLab(sm.LABS.find((l) => l.k === i.dataset.k), i.value, sx) : null;
        const em = $(`[data-r="${i.dataset.k}"]`);
        em.className = "lr " + (r ? r.st : ""); em.textContent = r ? (r.st === "ok" ? "طبيعي" : r.st === "low" ? "منخفض ▼" : "مرتفع ▲") : "";
        if (r && r.st !== "ok") res.push(r);
      });
      const cr = $('[data-k="creat"]').value, e = cr ? sm.egfr(cr, age, sx) : null;
      $(".lab-out").innerHTML = (e ? `<section class="card"><b>eGFR: ${e.g} mL/min/1.73m²</b> · ${esc(e.stage)}${e.g < 60 ? `<p class="small">عدّل جرعات الأدوية التي تطرحها الكلية (راجع التثقيف الدوائي).</p>` : ""}</section>` : "")
        + res.map((r) => `<section class="card ddi ${r.st === "low" ? "warn" : "danger"}"><b>${esc(r.lab.n)}: <span dir="ltr">${r.v} ${esc(r.lab.u)}</span></b> <span class="muted small">(الطبيعي <span dir="ltr">${r.range[0]}-${r.range[1] >= 999 ? "" : r.range[1]}</span>)</span><p>${esc(r.note)}</p></section>`).join("");
    };
    $$(".lab-rows input, .lsx, .lage").forEach((i) => i.oninput = draw);
  }
}
