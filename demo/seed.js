// بيانات العيادة التجريبية: تُبنى على جهاز الزائر فقط، وتتجدد كل يوم لتبقى المواعيد على تاريخ اليوم
export const DEMO = {
  cid: "demo",
  pw: "demo1234",
  doctor: { uid: "u-doc", email: "demo@nabd.app" },
  secretary: { uid: "u-sec", phone: "0955000222" },
  patient: { uid: "u-pt", phone: "0944555666", pid: "p01" },
};
const VERSION = "6";

// أرقام عشوائية ثابتة حتى تبقى البيانات نفسها في كل مرة
let seed = 20261002;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return ymd(d); };
const ts = (dateStr, hm = "10:00") => ({ __t: new Date(`${dateStr}T${hm}:00`).getTime() });
const dow = (s) => new Date(s + "T12:00:00").getDay();

export async function ensureSeed() {
  const today = ymd(new Date());
  let ok = false;
  try { ok = localStorage.getItem("demo-seed") === today + "|" + VERSION && localStorage.getItem("demo-fs"); } catch {}
  if (ok) return;
  seed = 20261002;
  const { cid, pw } = DEMO;
  const F = new Map();
  const put = (path, data) => F.set(path, data);
  const C = (sub, id, data) => put(`clinics/${cid}/${sub}/${id}`, data);
  const PS = (pid, sub, id, data) => put(`clinics/${cid}/patients/${pid}/${sub}/${id}`, data);

  // ---------- المنصة والعيادة ----------
  put("platform/config", { name: "نبض", trialDays: 14, payment: { whatsapp: "0986411114", syriatel: "0986411114" } });
  put("platform/bootstrap", { done: true });
  const services = [
    { id: "kashf", name: "معاينة", price: 50000, duration: 20, kind: "general" },
    { id: "review", name: "مراجعة", price: 25000, duration: 15, kind: "general" },
    { id: "fill", name: "حشوة", price: 150000, duration: 30, kind: "general" },
    { id: "rct", name: "معالجة لبية", price: 300000, duration: 45, kind: "general" },
    { id: "clean", name: "تنظيف", price: 100000, duration: 30, kind: "general" },
    { id: "ext", name: "قلع", price: 80000, duration: 30, kind: "general" },
    { id: "white", name: "تبييض", price: 400000, duration: 45, kind: "cosmetic" },
  ];
  const hours = {};
  for (let d = 0; d < 7; d++) hours[d] = { on: d !== 5, from: "10:00", to: "17:00" };
  const doctorId = "d1";
  const clinic = {
    name: "عيادة الابتسامة لطب الأسنان", doctorName: "سامر الحلبي", title: "اختصاصي تجميل وتقويم الأسنان",
    address: "دمشق، المزة، شارع الجلاء", phone: "0112345678", email: "demo@nabd.app", accent: "#0E7C7B", logo: null,
    specialty: "dental", modules: ["dental"], slug: "demo", currency: "ل.س", slotMinutes: 20, hours, services,
    doctors: [{ id: doctorId, uid: DEMO.doctor.uid, name: "سامر الحلبي", title: "اختصاصي تجميل وتقويم الأسنان", active: true }],
    city: "دمشق", listed: false, bookingEnabled: true, showPrices: true,
    rxFooter: "يجب مراسلة العيادة من خلال التطبيق عند ظهور أي أعراض جانبية.",
    drugs: ["Ibuprofen 400mg", "Chlorhexidine 0.12% mouthwash", "Amoxicillin 500mg"],
    rxTemplates: [{ name: "وصفتي بعد التنظيف", items: [{ drug: "Chlorhexidine 0.12% mouthwash", dose: "مضمضة 15 مل", times: "08:00, 20:00", days: 7, note: "" }] }],
    status: "active", plan: "pro", expiresAt: { __t: Date.now() + 365 * 864e5 },
    features: { booking: true, inventory: true, qr: true, multiDoctor: true, multiSpecialty: false },
    maxDoctors: 3, maxStaff: 3, ownerUid: DEMO.doctor.uid, ownerEmail: DEMO.doctor.email, ownerPhone: "0933000111",
    createdAt: ts(addDays(today, -120)),
  };
  put(`clinics/${cid}`, clinic);
  const { name, doctorName, title, address, phone, email, accent, logo, specialty, slug } = clinic;
  put(`publicClinics/${cid}`, {
    name, doctorName, title, address, phone, email, accent, logo, specialty, slug, hours, slotMinutes: 20,
    services: services.map(({ name, duration, price }) => ({ name, duration, price })),
    doctors: [{ id: doctorId, name: "سامر الحلبي", title }], bookingEnabled: true, mapUrl: "", listed: false, city: "دمشق",
  });
  put("slugs/demo", { cid });

  // ---------- الحسابات ----------
  const users = {};
  const account = (uid, email, data) => { users[email] = { uid, email, pw }; put(`users/${uid}`, { active: true, mustChangePassword: false, ver: 1, clinicId: cid, createdAt: ts(addDays(today, -100)), ...data }); };
  account(DEMO.doctor.uid, DEMO.doctor.email, { role: "doctor", admin: true, doctorId, name: "سامر الحلبي", phone: "0933000111", email: DEMO.doctor.email });
  account(DEMO.secretary.uid, `s${DEMO.secretary.phone}@clinic-${cid}.app`, { role: "secretary", admin: false, doctorId: null, name: "رنا", title: "", phone: DEMO.secretary.phone });
  account("u-nur", `s0955000333@clinic-${cid}.app`, { role: "nurse", admin: false, doctorId: null, name: "هيا", title: "", phone: "0955000333" });
  account("u-acc", `s0955000444@clinic-${cid}.app`, { role: "accountant", admin: false, doctorId: null, name: "ماهر", title: "", phone: "0955000444" });
  account(DEMO.patient.uid, `p${DEMO.patient.phone}@clinic-${cid}.app`, { role: "patient", phone: DEMO.patient.phone, patientIds: [DEMO.patient.pid], hideSensitive: false, consentAt: ts(addDays(today, -60)) });
  C("phones", DEMO.secretary.phone, { staffUid: DEMO.secretary.uid, staffVer: 1 });
  C("phones", DEMO.patient.phone, { patientUid: DEMO.patient.uid, patientVer: 1 });

  // ---------- المرضى ----------
  const NAMES = ["أحمد سليمان", "ليلى حسن", "محمد الخطيب", "رهف العلي", "خالد منصور", "سارة الأحمد", "عمر الشامي", "نور الهدى قاسم",
    "يوسف درويش", "هبة الزعبي", "مازن حداد", "ريم عيسى", "طارق النجار", "دانة الحسين", "باسل يونس", "لمى عثمان", "فادي سلوم",
    "جود الرفاعي", "سامي مراد", "آية الحمصي", "كريم البيطار", "رنيم شاهين", "حسان القدسي", "تالا موسى", "وسيم عبود", "ميار الصباغ"];
  const pts = NAMES.map((n, i) => ({
    id: `p${pad(i + 1)}`, name: n, phone: i === 0 ? DEMO.patient.phone : `09${pick(["33", "44", "55", "88", "99"])}${String(100000 + Math.floor(rnd() * 899999))}`,
    age: 18 + Math.floor(rnd() * 50), sex: i % 2 ? "f" : "m",
    created: addDays(today, -(i >= 1 && i <= 3 ? i - 1 : i < 8 ? 3 + Math.floor(rnd() * 20) : 25 + Math.floor(rnd() * 90))),
  }));
  pts[0].age = 36; pts[0].sex = "m";
  pts.forEach((p) => {
    C("patients", p.id, { name: p.name, phone: p.phone, age: p.age, dob: null, sex: p.sex, address: "دمشق", bloodType: "", uid: p.id === DEMO.patient.pid ? DEMO.patient.uid : null, archived: false, createdAt: ts(p.created), createdBy: DEMO.doctor.uid });
    if (p.id !== DEMO.patient.pid) C("phones", p.phone, {});
  });

  // ---------- المواعيد والدفعات ----------
  const DIAG = ["تسوس سني", "التهاب لثة", "التهاب لب سني", "تصبغات", "كسر سن", "سن عقل منطمر", "حساسية أسنان", "تراكم جير"];
  const SVC_DIAG = { "حشوة": "تسوس سني", "معالجة لبية": "التهاب لب سني", "تنظيف": "تراكم جير", "قلع": "سن عقل منطمر", "تبييض": "تصبغات", "معاينة": null, "مراجعة": null };
  const busy = {};
  let nAppt = 0, nPay = 0;
  const addAppt = (date, time, p, svc, status, extra = {}) => {
    const id = `${date}_${time.replace(":", "")}_${doctorId}`;
    C("appointments", id, { patientId: p.id, patientName: p.name, phone: p.phone, date, time, type: svc.name, note: "", doctorId, status, queueNo: extra.queueNo ?? null, createdAt: ts(addDays(date, -3)), createdBy: DEMO.secretary.uid, ...(extra.rating ? { rating: extra.rating, ratingNote: extra.ratingNote || "" } : {}) });
    if (status !== "cancelled") (busy[date] = busy[date] || []).push(`${time}|${doctorId}`);
    nAppt++;
    return id;
  };
  const addPay = (date, p, svc, partial = false) => {
    const total = svc.price, paid = partial ? Math.round(total / 2 / 5000) * 5000 : total;
    const r = rnd(), method = r < .62 ? "cash" : r < .85 ? "shamcash" : r < .95 ? "syriatel" : "bank";
    C("payments", `pay${++nPay}`, { patientId: p.id, patientName: p.name, service: svc.name, total, paid, date, method, note: "", planId: null, by: r < .8 ? DEMO.secretary.uid : DEMO.doctor.uid, byName: r < .8 ? "رنا" : "سامر الحلبي", createdAt: ts(date, `${10 + Math.floor(rnd() * 7)}:${pad(Math.floor(rnd() * 60))}`) });
  };
  const addVisit = (date, p, svc, apptId) => {
    const diag = SVC_DIAG[svc.name] ?? pick(DIAG);
    const vid = `v${nAppt}`;
    PS(p.id, "visits", vid, { date, complaint: pick(["ألم عند المضغ", "حساسية من البارد", "مراجعة دورية", "نزف لثة", "رغبة بتجميل الابتسامة"]), exam: "", diagnosis: diag || "", treatment: svc.name, publicNote: "", appointmentId: apptId, createdAt: ts(date, "12:00") });
    C("stats", vid, { date, diagnosis: diag || "", patientId: p.id });
  };
  const TIMES = ["10:00", "10:20", "10:40", "11:00", "11:40", "12:20", "13:00", "13:40", "14:20", "15:00", "15:40", "16:20"];
  const svcPick = () => { const r = rnd(); return r < .3 ? services[0] : r < .5 ? services[1] : r < .68 ? services[2] : r < .78 ? services[4] : r < .87 ? services[3] : r < .95 ? services[5] : services[6]; };

  // الأيام السابقة (60 يوماً)
  for (let back = 60; back >= 1; back--) {
    const date = addDays(today, -back);
    if (dow(date) === 5) continue;
    const n = 4 + Math.floor(rnd() * 4);
    const times = [...TIMES].sort(() => rnd() - .5).slice(0, n).sort();
    times.forEach((t) => {
      const p = pick(pts.slice(1)), svc = svcPick(), r = rnd();
      const status = r < .8 ? "done" : r < .9 ? "noshow" : "cancelled";
      const rate = status === "done" && rnd() < .3 ? (rnd() < .75 ? 5 : 4) : 0;
      const id = addAppt(date, t, p, svc, status, rate ? { rating: rate, ratingNote: rate === 5 ? pick(["دكتور ممتاز وتعامل راقٍ", "شكراً على الاهتمام", "", "العيادة نظيفة والمواعيد دقيقة"]) : "" } : {});
      if (status === "done") { addPay(date, p, svc, rnd() < .15); if (back <= 20) addVisit(date, p, svc, id); else C("stats", `s${nAppt}`, { date, diagnosis: SVC_DIAG[svc.name] ?? pick(DIAG), patientId: p.id }); }
    });
  }

  // اليوم: مواعيد بحالات مختلفة ودور انتظار
  const todayPlan = [
    ["10:00", 3, 2, "done"], ["10:40", 4, 4, "done"], ["11:20", 5, 0, "done"], ["12:00", 6, 3, "in"],
    ["12:40", 7, 1, "arrived"], ["13:20", 8, 2, "arrived"], ["14:00", 9, 0, "confirmed"], ["15:00", 10, 4, "confirmed"], ["16:00", 11, 1, "confirmed"],
  ];
  let q = 0, inNo = null;
  todayPlan.forEach(([t, pi, si, st]) => {
    const p = pts[pi], svc = services[si];
    const queueNo = st === "confirmed" ? null : ++q;
    if (st === "in") inNo = queueNo;
    const id = addAppt(today, t, p, svc, st, { queueNo });
    if (st === "done") { addPay(today, p, svc, pi === 4); addVisit(today, p, svc, id); }
  });
  C("live", "queue", { number: inNo, doctor: "", at: ts(today, "12:05") });

  // الأيام القادمة
  for (let d = 1; d <= 10; d++) {
    const date = addDays(today, d);
    if (dow(date) === 5) continue;
    const n = 2 + Math.floor(rnd() * 3);
    [...TIMES].sort(() => rnd() - .5).slice(0, n).sort().forEach((t) => addAppt(date, t, pick(pts.slice(1)), svcPick(), "confirmed"));
  }
  // تذكير الغد: أول موعدين أُرسل لهما تذكير
  const tmPrefix = `clinics/${cid}/appointments/${addDays(today, 1)}_`;
  [...F.keys()].filter((k) => k.startsWith(tmPrefix)).sort().slice(0, 2).forEach((k) => F.set(k, { ...F.get(k), remindedAt: ts(today, "09:00") }));
  Object.entries(busy).forEach(([date, slots]) => C("busy", date, { slots }));

  // ---------- ملف المريض التجريبي (أحمد سليمان) ----------
  const P1 = pts[0], pid = P1.id;
  const p1Next = addDays(today, dow(addDays(today, 2)) === 5 ? 3 : 2);
  addAppt(p1Next, "11:20", P1, services[2], "confirmed");
  const v1 = addDays(today, -30), v2 = addDays(today, -16), v3 = addDays(today, -7);
  const a1 = addAppt(v1, "16:20", P1, services[0], "done");
  const a2 = addAppt(v2, "16:20", P1, services[3], "done", { rating: 5, ratingNote: "لم أشعر بأي ألم، شكراً دكتور" });
  const a3 = addAppt(v3, "16:20", P1, services[4], "done");
  PS(pid, "visits", "pv1", { date: v1, complaint: "ألم شديد في الضرس السفلي الأيسر", exam: "تسوس عميق في السن 36 مع ألم عند القرع", diagnosis: "التهاب لب سني، تسوس سني", treatment: "خطة علاج: معالجة لبية للسن 36 ثم تاج", publicNote: "تجنب المضغ على الجهة اليسرى حتى انتهاء المعالجة", appointmentId: a1, createdAt: ts(v1, "16:40") });
  PS(pid, "visits", "pv2", { date: v2, complaint: "متابعة المعالجة اللبية", exam: "", diagnosis: "التهاب لب سني", treatment: "إنهاء المعالجة اللبية للسن 36", publicNote: "", appointmentId: a2, createdAt: ts(v2, "17:00") });
  PS(pid, "visits", "pv3", { date: v3, complaint: "تنظيف دوري", exam: "تراكم جير خفيف", diagnosis: "تراكم جير", treatment: "تنظيف وتلميع", publicNote: "استخدم الخيط الطبي يومياً", appointmentId: a3, createdAt: ts(v3, "16:45") });
  ["pv1", "pv2", "pv3"].forEach((v, i) => C("stats", v, { date: [v1, v2, v3][i], diagnosis: ["التهاب لب سني", "التهاب لب سني", "تراكم جير"][i], patientId: pid }));
  PS(pid, "private", "n1", { type: "note", visitId: "pv1", date: v1, text: "المريض قلق من الألم، يفضّل التخدير الكافي.", createdAt: ts(v1, "16:41") });
  PS(pid, "medical", "profile", { allergies: "البنسلين", chronic: "لا يوجد", meds: "", notes: "", updatedAt: ts(v1) });
  // وصفة حالية بمواعيد جرعات (تظهر في تطبيق المريض مع التذكير)
  PS(pid, "prescriptions", "rx1", { date: v3, items: [
    { drug: "Ibuprofen 400mg", dose: "حبة بعد الطعام", times: "09:00, 21:00", days: 14, note: "عند الألم فقط", endDate: addDays(today, 7) },
    { drug: "Chlorhexidine 0.12%", dose: "مضمضة 15 مل", times: "08:00, 20:00", days: 14, note: "دقيقة كاملة", endDate: addDays(today, 7) },
  ], note: "", verify: "demo7rx2026verify", doctorName: "سامر الحلبي", createdAt: ts(v3, "16:50") });
  put("rxVerify/demo7rx2026verify", { clinicId: cid, clinicName: clinic.name, accent, doctorName: "سامر الحلبي", date: v3, patient: "أحمد س.", items: [{ drug: "Ibuprofen 400mg", dose: "حبة بعد الطعام", days: 14 }, { drug: "Chlorhexidine 0.12%", dose: "مضمضة 15 مل", days: 14 }], createdAt: ts(v3, "16:50") });
  // مخطط الأسنان مع سجل كل سن
  const H = (date, status, note, surfaces = []) => ({ date, status, surfaces, note });
  PS(pid, "dental", "chart", { id: "chart", dentition: "adult", updatedAt: ts(v3), teeth: {
    "36": { status: "rct", note: "بانتظار التاج", surfaces: ["O", "M"], history: [H(v1, "caries", "تسوس عميق", ["O", "M"]), H(v2, "rct", "معالجة لبية كاملة", ["O", "M"])] },
    "16": { status: "filling", note: "", surfaces: ["O"], history: [H(addDays(today, -200), "filling", "حشوة كومبوزيت", ["O"])] },
    "26": { status: "caries", note: "تسوس سطحي", surfaces: ["D"], history: [H(v3, "caries", "يحتاج حشوة", ["D"])] },
    "11": { status: "crown", note: "تاج زيركون", surfaces: [], history: [H(addDays(today, -400), "crown", "تاج زيركون")] },
    "48": { status: "extracted", note: "", surfaces: [], history: [H(addDays(today, -300), "extracted", "قلع جراحي لسن العقل")] },
    "45": { status: "filling", note: "", surfaces: ["O", "B"], history: [H(addDays(today, -150), "filling", "حشوة", ["O", "B"])] },
  } });
  PS(pid, "plans", "plan1", { name: "خطة علاج الجهة اليسرى", discount: 0, note: "", date: v1, status: "active", createdAt: ts(v1, "16:45"), items: [
    { id: "i1", tooth: "36", proc: "معالجة لبية", cost: 300000, phase: 1, status: "done", doneDate: v2 },
    { id: "i2", tooth: "36", proc: "تاج زيركون", cost: 450000, phase: 2, status: "planned" },
    { id: "i3", tooth: "26", proc: "حشوة كومبوزيت", cost: 150000, phase: 2, status: "planned" },
  ] });
  C("payments", "pp1", { patientId: pid, patientName: P1.name, service: "معاينة", total: 50000, paid: 50000, date: v1, note: "", planId: null, by: DEMO.secretary.uid, byName: "رنا", createdAt: ts(v1, "16:50") });
  C("payments", "pp2", { patientId: pid, patientName: P1.name, service: "خطة علاج: خطة علاج الجهة اليسرى", total: 900000, paid: 300000, date: v2, note: "دفعة أولى", planId: "plan1", by: DEMO.secretary.uid, byName: "رنا", createdAt: ts(v2, "17:10") });
  C("payments", "pp3", { patientId: pid, patientName: P1.name, service: "تنظيف", total: 100000, paid: 100000, date: v3, note: "", planId: null, by: DEMO.secretary.uid, byName: "رنا", createdAt: ts(v3, "16:55") });
  PS(pid, "messages", "m1", { from: "patient", text: "مرحباً دكتور، هل يمكنني تناول المسكن قبل النوم؟", at: ts(addDays(today, -1), "20:15"), byName: P1.name });
  PS(pid, "messages", "m2", { from: "clinic", text: "أهلاً أحمد، نعم يمكنك ذلك بعد الطعام. نراك في موعدك القادم.", at: ts(addDays(today, -1), "20:40"), byName: "سامر الحلبي" });
  put(`clinics/${cid}/patients/${pid}`, { ...F.get(`clinics/${cid}/patients/${pid}`), lastMsgAt: ts(addDays(today, -1), "20:40"), lastMsgFrom: "clinic" });

  // ---------- طلبات ورسائل بانتظار الرد ----------
  const p5 = pts[13];
  C("requests", "r1", { patientId: p5.id, patientName: p5.name, phone: p5.phone, date: addDays(today, 3), time: "11:00", service: "تنظيف", note: "أفضّل الصباح", status: "new", createdAt: ts(today, "08:30") });
  C("publicRequests", "pr1", { name: "مروة الخياط", phone: "0991234567", date: addDays(today, 1), time: "13:00", doctorId, service: "معاينة", note: "ألم في السن الأمامي", status: "new", createdAt: ts(today, "09:10") });
  const p6 = pts[15];
  PS(p6.id, "messages", "m1", { from: "patient", text: "هل يمكن تقديم موعدي إلى يوم الأحد؟", at: ts(today, "09:45"), byName: p6.name });
  put(`clinics/${cid}/patients/${p6.id}`, { ...F.get(`clinics/${cid}/patients/${p6.id}`), lastMsgAt: ts(today, "09:45"), lastMsgFrom: "patient" });

  // ---------- المخزون ----------
  const inv = [["بنج موضعي (Lidocaine)", 40, 20, "علبة"], ["حشوات كومبوزيت", 6, 10, "سيرنغ"], ["قفازات طبية", 12, 5, "علبة"], ["إبر تخدير", 150, 50, "إبرة"], ["مواد تبييض", 3, 2, "عبوة"]];
  const USES = [[{ service: "حشوة", n: 1 }, { service: "معالجة لبية", n: 2 }, { service: "قلع", n: 1 }], [{ service: "حشوة", n: 1 }], [{ service: "معاينة", n: 1 }, { service: "تنظيف", n: 1 }], [], [{ service: "تبييض", n: 1 }]];
  inv.forEach(([n, qty, min, unit], i) => C("inventory", `inv${i}`, { name: n, qty, unit, min, expiry: i === 0 ? addDays(today, 25) : "", cost: null, note: "", uses: USES[i] || [], moves: [], archived: false, createdAt: ts(addDays(today, -40)) }));

  // ---------- المصاريف (للشهرين الحالي والسابق) ----------
  const monthStart = (off) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + off); return ymd(d); };
  let ne = 0;
  [-1, 0].forEach((off) => {
    const m1 = monthStart(off);
    [["إيجار", 1500000, 1, "إيجار العيادة"], ["رواتب", 1200000, 1, "راتب السكرتيرة"], ["مواد ومستلزمات طبية", 650000 + off * -80000, 5, "طلبية مواد حشو وتخدير"],
     ["كهرباء وماء وإنترنت", 180000, 10, "فاتورة الشهر"], ["صيانة وأجهزة", 250000, 18, "صيانة كرسي الأسنان"], ["تسويق وإعلان", 100000, 20, "إعلان ممول"]]
      .forEach(([cat, amount, day, note]) => {
        const date = addDays(m1, day - 1);
        if (date > today) return;
        C("expenses", `ex${++ne}`, { category: cat, amount, date, note, void: false, by: DEMO.doctor.uid, byName: "سامر الحلبي", createdAt: ts(date, "12:00") });
      });
  });

  // ---------- سجل التعديلات ----------
  [["تسجيل دخول", ""], ["تسجيل دفعة", "ليلى حسن"], ["تسجيل زيارة", "محمد الخطيب"]].forEach(([a, t], i) => C("audit", `au${i}`, { at: ts(today, `0${8 + i}:30`), by: DEMO.secretary.uid, byName: "رنا", action: a, target: t }));

  try {
    localStorage.setItem("demo-fs", JSON.stringify([...F]));
    localStorage.setItem("demo-users", JSON.stringify(users));
    localStorage.setItem("demo-seed", today + "|" + VERSION);
    localStorage.setItem("clinic", cid);
  } catch {}
}
