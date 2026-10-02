// أدوية شائعة وقوالب وصفات جاهزة لكل اختصاص (اقتراحات فقط، والطبيب يعدّل الجرعة حسب الحالة)
// [الاسم، الجرعة، الأوقات، الأيام]
const D = (drug, dose = "", times = "", days = "") => ({ drug, dose, times, days });

export const COMMON_DRUGS = [
  D("Paracetamol 500mg", "حبة", "08:00, 14:00, 20:00", 3),
  D("Paracetamol 1g", "حبة", "08:00, 20:00", 3),
  D("Ibuprofen 400mg", "حبة بعد الطعام", "08:00, 20:00", 5),
  D("Ibuprofen 600mg", "حبة بعد الطعام", "08:00, 20:00", 5),
  D("Diclofenac 50mg", "حبة بعد الطعام", "08:00, 20:00", 5),
  D("Naproxen 500mg", "حبة بعد الطعام", "08:00, 20:00", 5),
  D("Amoxicillin 500mg", "كبسولة", "08:00, 16:00, 24:00", 7),
  D("Amoxicillin/Clavulanate 1g (Augmentin)", "حبة بعد الطعام", "08:00, 20:00", 7),
  D("Azithromycin 500mg", "حبة", "08:00", 3),
  D("Clarithromycin 500mg", "حبة", "08:00, 20:00", 7),
  D("Cefuroxime 500mg", "حبة", "08:00, 20:00", 7),
  D("Cefixime 400mg", "حبة", "08:00", 7),
  D("Ciprofloxacin 500mg", "حبة", "08:00, 20:00", 7),
  D("Metronidazole 500mg", "حبة بعد الطعام", "08:00, 16:00, 24:00", 7),
  D("Clindamycin 300mg", "كبسولة", "08:00, 16:00, 24:00", 7),
  D("Doxycycline 100mg", "حبة", "08:00, 20:00", 7),
  D("Omeprazole 20mg", "كبسولة قبل الفطور", "07:30", 14),
  D("Esomeprazole 40mg", "حبة قبل الفطور", "07:30", 14),
  D("Pantoprazole 40mg", "حبة قبل الفطور", "07:30", 14),
  D("Domperidone 10mg", "حبة قبل الطعام", "07:30, 13:30, 19:30", 5),
  D("Metoclopramide 10mg", "حبة قبل الطعام", "07:30, 13:30, 19:30", 3),
  D("Hyoscine butylbromide 10mg (Buscopan)", "حبة", "08:00, 14:00, 20:00", 3),
  D("Loratadine 10mg", "حبة", "20:00", 7),
  D("Cetirizine 10mg", "حبة مساءً", "21:00", 7),
  D("Desloratadine 5mg", "حبة", "20:00", 7),
  D("Prednisolone 5mg", "حسب التعليمات", "08:00", 5),
  D("Vitamin D3 50000 IU", "كبسولة أسبوعياً", "", 56),
  D("Vitamin D3 1000 IU", "حبة", "08:00", 30),
  D("Folic acid 5mg", "حبة", "08:00", 30),
  D("Ferrous sulfate", "حبة بعد الطعام", "13:00", 30),
  D("Calcium + Vitamin D", "حبة", "13:00", 30),
  D("Omega 3", "كبسولة", "13:00", 30),
  D("Metformin 500mg", "حبة مع الطعام", "08:00, 20:00", 30),
  D("Metformin 850mg", "حبة مع الطعام", "08:00, 20:00", 30),
  D("Amlodipine 5mg", "حبة", "08:00", 30),
  D("Losartan 50mg", "حبة", "08:00", 30),
  D("Atorvastatin 20mg", "حبة مساءً", "21:00", 30),
  D("Aspirin 81mg", "حبة بعد الطعام", "13:00", 30),
  D("Salbutamol inhaler", "بختان عند اللزوم", "", ""),
  D("Chlorhexidine 0.12% mouthwash", "مضمضة 15 مل لمدة دقيقة", "08:00, 20:00", 7),
  D("Benzydamine mouthwash", "مضمضة", "08:00, 14:00, 20:00", 5),
  D("Fluconazole 150mg", "كبسولة واحدة", "08:00", 1),
  D("Clotrimazole cream", "دهن موضعي", "08:00, 20:00", 14),
  D("Fusidic acid cream", "دهن موضعي", "08:00, 20:00", 7),
  D("Mupirocin ointment", "دهن موضعي", "08:00, 14:00, 20:00", 7),
  D("Hydrocortisone 1% cream", "دهن خفيف", "08:00, 20:00", 7),
  D("Tobramycin eye drops", "نقطة في العين", "08:00, 12:00, 16:00, 20:00", 7),
  D("Artificial tears", "نقطة عند الحاجة", "", ""),
  D("ORS (محلول إماهة)", "ظرف في 200 مل ماء بعد كل إسهال", "", 3),
  D("Paracetamol syrup 120mg/5ml", "حسب وزن الطفل", "08:00, 14:00, 20:00", 3),
  D("Ibuprofen syrup 100mg/5ml", "حسب وزن الطفل", "08:00, 20:00", 3),
  D("Amoxicillin syrup 250mg/5ml", "حسب وزن الطفل", "08:00, 16:00, 24:00", 7),
  D("Zinc syrup", "5 مل", "08:00", 10),
  D("Progesterone 200mg", "حسب التعليمات", "21:00", 10),
  D("Dydrogesterone 10mg (Duphaston)", "حبة", "08:00, 20:00", 10),
  D("Mefenamic acid 500mg", "حبة بعد الطعام", "08:00, 14:00, 20:00", 3),
];

const T = (name, items) => ({ name, items, builtin: true });
const pick = (name, over = {}) => ({ ...COMMON_DRUGS.find((d) => d.drug === name), note: "", ...over });

export const BUILTIN_TEMPLATES = {
  dental: [
    T("بعد القلع", [pick("Amoxicillin/Clavulanate 1g (Augmentin)", { days: 5 }), pick("Ibuprofen 400mg", { days: 3 }), pick("Chlorhexidine 0.12% mouthwash", { note: "تبدأ بعد 24 ساعة من القلع" })]),
    T("التهاب لب / ألم سني", [pick("Ibuprofen 600mg", { days: 3 }), pick("Paracetamol 500mg", { note: "عند اللزوم" })]),
    T("خراج سني", [pick("Amoxicillin 500mg"), pick("Metronidazole 500mg"), pick("Ibuprofen 400mg")]),
    T("التهاب لثة", [pick("Chlorhexidine 0.12% mouthwash", { days: 10 }), pick("Benzydamine mouthwash")]),
  ],
  peds: [
    T("حرارة وزكام", [pick("Paracetamol syrup 120mg/5ml"), pick("Ibuprofen syrup 100mg/5ml", { note: "إذا استمرت الحرارة" })]),
    T("التهاب لوزات", [pick("Amoxicillin syrup 250mg/5ml", { days: 10 }), pick("Paracetamol syrup 120mg/5ml")]),
    T("إسهال", [pick("ORS (محلول إماهة)"), pick("Zinc syrup")]),
  ],
  obgyn: [
    T("متابعة حمل (فيتامينات)", [pick("Folic acid 5mg", { days: 90 }), pick("Ferrous sulfate", { days: 90 }), pick("Calcium + Vitamin D", { days: 90 })]),
    T("التهاب مهبلي فطري", [pick("Fluconazole 150mg"), pick("Clotrimazole cream", { days: 7 })]),
    T("آلام الدورة", [pick("Mefenamic acid 500mg"), pick("Hyoscine butylbromide 10mg (Buscopan)")]),
  ],
  derm: [
    T("التهاب جلد جرثومي", [pick("Fusidic acid cream"), pick("Cefuroxime 500mg")]),
    T("فطور جلدية", [pick("Clotrimazole cream", { days: 21 })]),
    T("حساسية جلدية", [pick("Cetirizine 10mg"), pick("Hydrocortisone 1% cream", { days: 5 })]),
  ],
  eye: [
    T("التهاب ملتحمة جرثومي", [pick("Tobramycin eye drops"), pick("Artificial tears")]),
  ],
  general: [
    T("نزلة برد", [pick("Paracetamol 500mg"), pick("Loratadine 10mg", { days: 5 })]),
    T("التهاب بلعوم جرثومي", [pick("Amoxicillin 500mg", { days: 10 }), pick("Ibuprofen 400mg")]),
    T("حرقة معدة", [pick("Omeprazole 20mg"), pick("Domperidone 10mg")]),
    T("التهاب مجاري بولية", [pick("Ciprofloxacin 500mg", { days: 5 })]),
    T("مغص معوي", [pick("Hyoscine butylbromide 10mg (Buscopan)"), pick("Omeprazole 20mg", { days: 7 })]),
  ],
};
BUILTIN_TEMPLATES.internal = BUILTIN_TEMPLATES.general;
BUILTIN_TEMPLATES.ent = BUILTIN_TEMPLATES.general;

export function builtinTemplatesFor(mods = [], spec = "") {
  const MAP = { preg: "obgyn", gyn: "obgyn", cosm: "derm", chronic: "general" };
  const keys = [...new Set([spec, ...mods.map((m) => MAP[m] || m), "general"])];
  const out = [], seen = new Set();
  keys.forEach((k) => (BUILTIN_TEMPLATES[k] || []).forEach((t) => { if (!seen.has(t.name)) { seen.add(t.name); out.push(t); } }));
  return out;
}

// أوقات سريعة للجرعات
export const QUICK_TIMES = [
  ["مرة يومياً", "08:00"],
  ["مرتين", "08:00, 20:00"],
  ["3 مرات", "08:00, 16:00, 24:00"],
  ["4 مرات", "08:00, 12:00, 16:00, 20:00"],
  ["مساءً", "21:00"],
  ["عند اللزوم", ""],
];

// ---------- قوائم التحاليل والأشعة الشائعة لطلب مطبوع ----------
export const LAB_GROUPS = [
  ["تحاليل الدم العامة", ["CBC (تعداد دم كامل)", "ESR (سرعة التثفل)", "CRP", "Blood group & Rh (زمرة دموية)", "PT / INR", "PTT", "Ferritin", "Serum iron", "Vitamin D (25-OH)", "Vitamin B12"]],
  ["السكر والدهون", ["FBS (سكر صيامي)", "RBS (سكر عشوائي)", "HbA1c (السكر التراكمي)", "Total cholesterol", "Triglycerides", "HDL", "LDL"]],
  ["الكلية والكبد", ["Urea", "Creatinine", "Uric acid", "ALT (GPT)", "AST (GOT)", "Total bilirubin", "Alkaline phosphatase", "Albumin"]],
  ["الهرمونات", ["TSH", "Free T4", "Free T3", "Prolactin", "FSH", "LH", "Estradiol (E2)", "Progesterone", "Testosterone", "β-hCG (هرمون الحمل)", "AMH"]],
  ["البول والبراز", ["Urine analysis (تحليل بول)", "Urine culture (زرع بول)", "Stool analysis (تحليل براز)", "H. pylori Ag (stool)"]],
  ["المصليات والفيروسات", ["HBsAg", "HCV Ab", "HIV Ab", "TORCH", "Widal", "Brucella", "ASO"]],
];
export const IMAGING_GROUPS = [
  ["أشعة الأسنان", ["صورة بانوراما (OPG)", "صورة ذروية (Periapical)", "صورة مجنحة (Bitewing)", "CBCT ثلاثي الأبعاد", "صورة سيفالومترية (Ceph)"]],
  ["الأشعة العامة", ["صورة صدر (Chest X-ray)", "صورة جيوب (Sinuses)", "إيكو بطن وحوض", "إيكو غدة درقية", "إيكو ثدي", "إيكو حمل", "إيكو قلب", "طبقي محوري (CT)", "رنين مغناطيسي (MRI)", "تخطيط قلب (ECG)"]],
];

// الأسماء التجارية الشائعة ← الاسم العلمي (لبحث الدواء بالاسم التجاري)
export const BRANDS = [
  ["Panadol", "Paracetamol 500mg"], ["Adol", "Paracetamol 500mg"], ["Tylenol", "Paracetamol 500mg"], ["Cetal", "Paracetamol 500mg"],
  ["Brufen", "Ibuprofen 400mg"], ["Advil", "Ibuprofen 400mg"], ["Nurofen", "Ibuprofen 400mg"],
  ["Voltaren", "Diclofenac 50mg"], ["Cataflam", "Diclofenac 50mg"], ["Naprosyn", "Naproxen 500mg"], ["Ponstan", "Mefenamic acid 500mg"],
  ["Augmentin", "Amoxicillin/Clavulanate 1g (Augmentin)"], ["Amoxil", "Amoxicillin 500mg"], ["Zithromax", "Azithromycin 500mg"],
  ["Klacid", "Clarithromycin 500mg"], ["Zinnat", "Cefuroxime 500mg"], ["Suprax", "Cefixime 400mg"], ["Ciprobay", "Ciprofloxacin 500mg"],
  ["Cipro", "Ciprofloxacin 500mg"], ["Flagyl", "Metronidazole 500mg"], ["Dalacin", "Clindamycin 300mg"], ["Vibramycin", "Doxycycline 100mg"],
  ["Losec", "Omeprazole 20mg"], ["Nexium", "Esomeprazole 40mg"], ["Controloc", "Pantoprazole 40mg"], ["Pantozol", "Pantoprazole 40mg"],
  ["Motilium", "Domperidone 10mg"], ["Primperan", "Metoclopramide 10mg"], ["Buscopan", "Hyoscine butylbromide 10mg (Buscopan)"],
  ["Claritine", "Loratadine 10mg"], ["Clarityn", "Loratadine 10mg"], ["Zyrtec", "Cetirizine 10mg"], ["Aerius", "Desloratadine 5mg"],
  ["Glucophage", "Metformin 500mg"], ["Norvasc", "Amlodipine 5mg"], ["Cozaar", "Losartan 50mg"], ["Lipitor", "Atorvastatin 20mg"],
  ["Aspocid", "Aspirin 75mg"], ["Ventolin", "Salbutamol inhaler"], ["Corsodyl", "Chlorhexidine 0.2% mouthwash"],
  ["Tantum Verde", "Benzydamine mouthwash"], ["Diflucan", "Fluconazole 150mg"], ["Canesten", "Clotrimazole cream"],
  ["Fucidin", "Fusidic acid cream"], ["Bactroban", "Mupirocin ointment"], ["Tobrex", "Tobramycin eye drops"],
  ["Duphaston", "Dydrogesterone 10mg (Duphaston)"], ["Cyclogest", "Progesterone 200mg"], ["Utrogestan", "Progesterone 200mg"],
  ["Daktarin oral gel", "Miconazole 2% oral gel"], ["Mycostatin", "Nystatin oral suspension 100,000 IU/mL"],
  ["Zovirax", "Aciclovir 5% cream"], ["Tamiflu", "Oseltamivir 75mg"], ["Movicol", "Macrogol (Movicol) sachet"],
  ["Duspatalin", "Mebeverine 135mg"], ["Colospasmin", "Mebeverine 135mg"], ["Betaserc", "Betahistine 16mg"],
  ["Omnic", "Tamsulosin 0.4mg"], ["Euthyrox", "Levothyroxine"], ["Concor", "Bisoprolol"], ["Epiduo", "Adapalene 0.1% / Benzoyl peroxide 2.5% gel"],
  ["Differin", "Adapalene 0.1% gel"], ["Vermox", "Mebendazole 100mg"], ["Imigran", "Sumatriptan 50mg"], ["Cyklokapron", "Tranexamic acid 500mg"],
];
// يحوّل الاسم التجاري (أو «Brand (Generic)» من القائمة) إلى الاسم العلمي
export function brandToGeneric(v) {
  const t = String(v || "").trim().toLowerCase();
  if (!t) return null;
  const hit = BRANDS.find(([b, g]) => t === b.toLowerCase() || t === `${b} (${g})`.toLowerCase());
  return hit ? hit[1] : null;
}
