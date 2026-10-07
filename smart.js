// المساعد الذكي للطبيب: يعمل داخل التطبيق دون إنترنت خارجي ودون ذكاء اصطناعي مدفوع
// 1) التداخلات الدوائية الشائعة والخطيرة  2) من الأعراض إلى التشخيص  3) تفسير التحاليل  4) الملخص الذكي للمريض
// مرجع عام مختصر (BNF Appendix 1، Stockley، UpToDate/Lexicomp، KDIGO، ADA، WHO). اقتراحات فقط، والقرار للطبيب.
import { BRANDS } from "./drugs.js";

const low = (s) => String(s || "").toLowerCase();
// يضيف الاسم العلمي إلى النص إن كُتب الاسم التجاري (Brufen → Ibuprofen)
export function expandDrugs(text) {
  let t = low(text);
  for (const [b, g] of BRANDS) {
    const re = new RegExp(`(^|[^a-z])${b.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`);
    if (re.test(t)) t += " " + low(g);
  }
  return t;
}

// ---------- 1) التداخلات الدوائية ----------
// مجموعات الأدوية بكلمات البحث (الاسم العلمي بالإنكليزية، وبعض الأسماء العربية الشائعة)
const G = {
  warfarin: ["warfarin", "acenocoumarol", "وارفارين", "سينتروم"],
  nsaid: ["ibuprofen", "diclofenac", "naproxen", "ketoprofen", "meloxicam", "piroxicam", "indomethacin", "celecoxib", "etoricoxib", "mefenamic", "ketorolac", "aspirin", "acetylsalicylic", "إيبوبروفين", "ديكلوفيناك", "أسبرين"],
  azoleSys: ["fluconazole", "itraconazole", "ketoconazole", "voriconazole", "posaconazole", "miconazole oral", "miconazole 2% oral", "miconazole gel"],
  macrolide: ["clarithromycin", "erythromycin"],
  quinolone: ["ciprofloxacin", "levofloxacin", "moxifloxacin", "ofloxacin", "norfloxacin"],
  metronidazole: ["metronidazole", "tinidazole"],
  cotrim: ["co-trimoxazole", "cotrimoxazole", "trimethoprim", "sulfamethoxazole", "septrin", "bactrim"],
  simva: ["simvastatin", "lovastatin"],
  atorva: ["atorvastatin"],
  statin: ["simvastatin", "lovastatin", "atorvastatin", "rosuvastatin", "pravastatin", "fluvastatin"],
  gemfibrozil: ["gemfibrozil"],
  acei: ["captopril", "enalapril", "lisinopril", "ramipril", "perindopril", "fosinopril", "quinapril", "losartan", "valsartan", "irbesartan", "candesartan", "telmisartan", "olmesartan"],
  ksparing: ["spironolactone", "eplerenone", "amiloride", "triamterene"],
  potassium: ["potassium chloride", "potassium citrate", "slow-k", "بوتاسيوم"],
  ssri: ["fluoxetine", "sertraline", "paroxetine", "citalopram", "escitalopram", "fluvoxamine", "venlafaxine", "duloxetine"],
  tramadol: ["tramadol"],
  opioid: ["tramadol", "codeine", "morphine", "oxycodone", "fentanyl", "pethidine", "dihydrocodeine"],
  benzo: ["diazepam", "alprazolam", "lorazepam", "clonazepam", "bromazepam", "midazolam", "zolpidem"],
  nsaidNA: ["ibuprofen", "diclofenac", "naproxen", "ketoprofen", "meloxicam", "piroxicam", "indomethacin", "celecoxib", "etoricoxib", "mefenamic", "ketorolac", "إيبوبروفين", "ديكلوفيناك"],
  aspirin: ["aspirin", "acetylsalicylic", "أسبرين"],
  cipro: ["ciprofloxacin", "norfloxacin", "fluvoxamine"],
  doac: ["rivaroxaban", "apixaban", "dabigatran", "edoxaban"],
  alphaB: ["doxazosin", "terazosin", "tamsulosin", "alfuzosin"],
  arb: ["losartan", "valsartan", "irbesartan", "candesartan", "telmisartan", "olmesartan"],
  acei0: ["captopril", "enalapril", "lisinopril", "ramipril", "perindopril", "fosinopril", "quinapril"],
  methotrexate: ["methotrexate"],
  clopidogrel: ["clopidogrel"],
  ppiCyp: ["omeprazole", "esomeprazole"],
  pde5: ["sildenafil", "tadalafil", "vardenafil"],
  nitrate: ["nitroglycerin", "glyceryl trinitrate", "isosorbide", "nicorandil"],
  digoxin: ["digoxin"],
  amiodarone: ["amiodarone"],
  lithium: ["lithium"],
  thiazide: ["hydrochlorothiazide", "chlorthalidone", "indapamide", "bendroflumethiazide"],
  bb: ["propranolol", "atenolol", "bisoprolol", "metoprolol", "carvedilol", "nebivolol"],
  ndhpccb: ["verapamil", "diltiazem"],
  carbamazepine: ["carbamazepine"],
  inducer: ["rifampicin", "rifampin", "carbamazepine", "phenytoin", "phenobarbital", "oxcarbazepine", "primidone", "modafinil", "st john"],
  coc: ["ethinylestradiol", "ethinyl estradiol", "levonorgestrel", "desogestrel", "drospirenone", "norethisterone", "contraceptive", "مانع حمل", "حبوب منع"],
  colchicine: ["colchicine"],
  tizanidine: ["tizanidine"],
  theophylline: ["theophylline", "aminophylline"],
  sulfonylurea: ["gliclazide", "glibenclamide", "glimepiride", "glipizide"],
  domperidone: ["domperidone"],
  qtAzole: ["fluconazole", "ketoconazole", "itraconazole"],
  tetracycline: ["doxycycline", "tetracycline", "minocycline"],
  isotretinoin: ["isotretinoin"],
  vitA: ["vitamin a", "retinol"],
  chelator: ["ferrous", "iron", "calcium carbonate", "calcium citrate", "antacid", "magnesium hydroxide", "magnesium oxide", "aluminium hydroxide", "aluminum hydroxide", "zinc", "حديد", "كالسيوم"],
  levothyroxine: ["levothyroxine", "thyroxine", "euthyrox", "ثيروكسين"],
  allopurinol: ["allopurinol"],
  azathioprine: ["azathioprine", "mercaptopurine"],
  steroid: ["prednisolone", "prednisone", "methylprednisolone", "dexamethasone", "hydrocortisone tab"],
  tamoxifen: ["tamoxifen"],
  strongCyp2d6: ["fluoxetine", "paroxetine"],
  paracetamolHigh: ["paracetamol", "acetaminophen"],
};
const SEV = { major: ["خطير", "danger"], moderate: ["متوسط", "warn"] };
// [مجموعة أ، مجموعة ب، الشدة، الشرح]
const INTERACTIONS = [
  ["warfarin", "nsaidNA", "major", "خطر نزف شديد (هضمي خصوصاً). يُفضل الباراسيتامول للألم."],
  ["warfarin", "aspirin", "major", "خطر نزف مرتفع. يُجمع فقط عند استطباب قلبي واضح مع واقٍ معدي."],
  ["warfarin", "amiodarone", "major", "يرفع INR بشدة. تخفيض جرعة الوارفارين 30-50% ومراقبة INR أسبوعياً."],
  ["warfarin", "inducer", "major", "يخفض INR بشدة. مراقبة INR وتعديل الجرعة عند البدء والإيقاف."],
  ["warfarin", "clopidogrel", "major", "خطر نزف مرتفع. أقصر مدة ممكنة مع واقٍ معدي."],
  ["doac", "nsaid", "major", "خطر نزف شديد. يُفضل الباراسيتامول."],
  ["doac", "inducer", "major", "يضعف مضاد التخثر. يُتجنب الجمع."],
  ["atorva", "azoleSys", "moderate", "خطر اعتلال عضلي. لا تتجاوز الأتورفاستاتين 20 ملغ مع الإيتراكونازول."],
  ["quinolone", "steroid", "moderate", "خطر التهاب وتمزق الأوتار خاصة فوق 60 سنة."],
  ["pde5", "alphaB", "moderate", "هبوط ضغط انتصابي. يبدأ بأقل جرعة مع استقرار حاصر ألفا."],
  ["acei0", "arb", "major", "حصار مزدوج: فرط بوتاسيوم وأذية كلوية. يُتجنب الجمع."],
  ["warfarin", "azoleSys", "major", "يرفع INR بشدة (حتى جل الميكونازول الفموي). مراقبة INR أو تجنب."],
  ["warfarin", "macrolide", "major", "يرفع INR وخطر النزف. مراقبة INR."],
  ["warfarin", "quinolone", "moderate", "يرفع INR. مراقبة INR خلال العلاج."],
  ["warfarin", "metronidazole", "major", "يرفع INR بشدة. يُفضل التجنب أو تخفيض الجرعة ومراقبة INR."],
  ["warfarin", "cotrim", "major", "يرفع INR بشدة. يُفضل صاد بديل."],
  ["warfarin", "paracetamolHigh", "moderate", "الجرعات المنتظمة العالية من الباراسيتامول قد ترفع INR. مراقبة INR عند الاستخدام المستمر."],
  ["methotrexate", "cotrim", "major", "تثبيط نقي العظم الخطير. يُتجنب الجمع."],
  ["methotrexate", "nsaidNA", "moderate", "يزيد سمية الميثوتريكسات (خاصة الجرعات العالية والقصور الكلوي)."],
  ["simva", "macrolide", "major", "انحلال العضلات المخطط. يوقف السيمفاستاتين خلال الصاد أو يُختار أزيثرومايسين."],
  ["simva", "azoleSys", "major", "انحلال العضلات المخطط. يُتجنب الجمع."],
  ["atorva", "macrolide", "moderate", "خطر اعتلال عضلي. تخفيض جرعة الأتورفاستاتين أو إيقافه مؤقتاً."],
  ["statin", "gemfibrozil", "major", "خطر اعتلال عضلي وانحلال العضلات. يُفضل الفينوفايبرات."],
  ["simva", "amiodarone", "major", "اعتلال عضلي. لا تتجاوز السيمفاستاتين 20 ملغ يومياً."],
  ["acei", "ksparing", "moderate", "خطر ارتفاع البوتاسيوم. مراقبة البوتاسيوم والكرياتينين."],
  ["acei", "potassium", "moderate", "خطر ارتفاع البوتاسيوم. مراقبة البوتاسيوم."],
  ["ksparing", "potassium", "major", "ارتفاع بوتاسيوم خطير. يُتجنب الجمع."],
  ["acei", "nsaidNA", "moderate", "يضعف خفض الضغط ويضر بالكلية، والخطر أعلى مع المدرات وكبار السن والجفاف."],
  ["cotrim", "acei", "moderate", "التريميثوبريم يرفع البوتاسيوم. مراقبة عند كبار السن والقصور الكلوي."],
  ["cotrim", "ksparing", "moderate", "التريميثوبريم يرفع البوتاسيوم. مراقبة البوتاسيوم."],
  ["ssri", "tramadol", "major", "متلازمة السيروتونين وخطر الاختلاج."],
  ["ssri", "nsaid", "moderate", "خطر نزف هضمي. يُضاف واقٍ معدي (PPI) أو يُختار الباراسيتامول."],
  ["opioid", "benzo", "major", "تثبيط تنفسي وتركين شديد. يُتجنب الجمع أو بأقل جرعة وأقصر مدة."],
  ["clopidogrel", "ppiCyp", "moderate", "الأوميبرازول والإيزوميبرازول يضعفان فعالية الكلوبيدوغريل. يُفضل البانتوبرازول."],
  ["pde5", "nitrate", "major", "هبوط ضغط شديد. مضاد استطباب."],
  ["digoxin", "macrolide", "major", "يرفع مستوى الديجوكسين (سمية). مراقبة أو تجنب."],
  ["digoxin", "amiodarone", "major", "يرفع مستوى الديجوكسين. تخفيض جرعة الديجوكسين إلى النصف ومراقبة."],
  ["digoxin", "ndhpccb", "major", "يرفع مستوى الديجوكسين وخطر بطء القلب."],
  ["lithium", "nsaidNA", "major", "يرفع مستوى الليثيوم (سمية). مراقبة المستوى أو تجنب."],
  ["lithium", "acei", "major", "يرفع مستوى الليثيوم. مراقبة المستوى."],
  ["lithium", "thiazide", "major", "يرفع مستوى الليثيوم. مراقبة المستوى."],
  ["bb", "ndhpccb", "major", "بطء قلب وإحصار قلبي وهبوط ضغط (خاصة الفيراباميل). يُتجنب الجمع."],
  ["carbamazepine", "macrolide", "major", "يرفع مستوى الكاربامازيبين (سمية). يُفضل أزيثرومايسين."],
  ["inducer", "coc", "major", "يضعف مانع الحمل الفموي. وسيلة إضافية أو بديلة."],
  ["colchicine", "macrolide", "major", "سمية الكولشيسين قد تكون مميتة. مضاد استطباب مع الكلاريثرومايسين."],
  ["colchicine", "azoleSys", "major", "يرفع مستوى الكولشيسين. يُتجنب أو تُخفض الجرعة كثيراً."],
  ["tizanidine", "cipro", "major", "السيبروفلوكساسين والفلوفوكسامين يرفعان التيزانيدين بشدة (هبوط ضغط وتركين). مضاد استطباب."],
  ["theophylline", "cipro", "major", "يرفع مستوى الثيوفيلين (اختلاج واضطراب نظم)."],
  ["theophylline", "macrolide", "major", "يرفع مستوى الثيوفيلين. مراقبة أو تجنب."],
  ["sulfonylurea", "azoleSys", "moderate", "خطر هبوط سكر. مراقبة السكر."],
  ["sulfonylurea", "macrolide", "moderate", "خطر هبوط سكر. مراقبة السكر."],
  ["sulfonylurea", "cotrim", "moderate", "خطر هبوط سكر. مراقبة السكر."],
  ["domperidone", "macrolide", "major", "إطالة QT واضطراب نظم. مضاد استطباب."],
  ["domperidone", "qtAzole", "major", "إطالة QT واضطراب نظم. مضاد استطباب."],
  ["quinolone", "chelator", "moderate", "تنقص امتصاص الكينولون. يؤخذ الصاد قبل ساعتين أو بعد 6 ساعات من الحديد أو الكالسيوم أو مضادات الحموضة."],
  ["tetracycline", "chelator", "moderate", "تنقص امتصاص الدوكسيسيكلين. يُفصل بينهما ساعتان إلى ثلاث."],
  ["levothyroxine", "chelator", "moderate", "تنقص امتصاص الثيروكسين. يُفصل بينهما 4 ساعات."],
  ["tetracycline", "isotretinoin", "major", "ارتفاع الضغط داخل القحف. مضاد استطباب."],
  ["isotretinoin", "vitA", "major", "تسمم بفيتامين A. يُتجنب الجمع."],
  ["allopurinol", "azathioprine", "major", "سمية نقي العظم الشديدة. تخفيض الأزاثيوبرين إلى الربع أو تجنب."],
  ["steroid", "nsaid", "moderate", "خطر قرحة ونزف هضمي. يُضاف واقٍ معدي."],
  ["tamoxifen", "strongCyp2d6", "moderate", "الفلوكستين والباروكستين يضعفان فعالية التاموكسيفين. يُفضل مضاد اكتئاب آخر."],
];
// الأشكال الموضعية (كريم، جل، قطرة...) لا تسبب تداخلات جهازية غالباً، عدا جل الميكونازول الفموي
const TOPICAL = /cream|gel|oint|drop|shampoo|lotion|eye|ear|vaginal|ovule|كريم|مرهم|قطرة|جل|شامبو|غسول|مهبلي/;
const has = (t, g) => {
  if (TOPICAL.test(t) && !(g === "azoleSys" && /miconazole/.test(t) && /oral|فموي/.test(t))) return false;
  return G[g].some((w) => t.includes(w));
};

// يفحص قائمة أدوية (نصوص) ويعيد التداخلات بينها
export function checkInteractions(drugs) {
  const items = drugs.filter(Boolean).map((d) => ({ d: String(d), t: expandDrugs(d) }));
  const out = [], seen = new Set();
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const A = items[i], B = items[j];
    if (A.t === B.t) continue;
    for (const [a, b, sev, text] of INTERACTIONS) {
      if ((has(A.t, a) && has(B.t, b)) || (has(A.t, b) && has(B.t, a))) {
        const k = [A.d, B.d].sort().join("|") + text;
        if (!seen.has(k)) { seen.add(k); out.push({ a: A.d, b: B.d, sev, level: SEV[sev][1], label: SEV[sev][0], text }); }
      }
    }
    // ازدواجية مضادات الالتهاب غير الستيروئيدية (عدا الأسبرين الوقائي)
    const nA = has(A.t, "nsaid") && !/aspirin|acetylsalicylic|أسبرين/.test(A.t), nB = has(B.t, "nsaid") && !/aspirin|acetylsalicylic|أسبرين/.test(B.t);
    if (nA && nB) { const k = [A.d, B.d].sort().join("|") + "dup"; if (!seen.has(k)) { seen.add(k); out.push({ a: A.d, b: B.d, sev: "moderate", level: "warn", label: SEV.moderate[0], text: "دواءان من مضادات الالتهاب غير الستيروئيدية معاً: لا فائدة إضافية ويزداد خطر النزف والأذى الكلوي." }); } }
  }
  return out.sort((x, y) => (x.sev === "major" ? 0 : 1) - (y.sev === "major" ? 0 : 1));
}
// تداخلات دواء واحد مع بقية الأدوية
export function interactionsFor(drug, others) {
  if (!drug) return [];
  return checkInteractions([drug, ...others.filter((o) => o && o !== drug)]).filter((x) => x.a === drug || x.b === drug);
}

// ---------- 2) من الأعراض إلى التشخيص ----------
export const SYMPTOMS = [
  ["fever", "حرارة", "Fever", "حمى سخونة"], ["cough", "سعال", "Cough", "قحة كحة"], ["sorethroat", "ألم بلع", "Sore throat", "التهاب حلق وجع حلق"],
  ["runny", "سيلان أنف", "Runny nose", "رشح زكام"], ["sneeze", "عطاس", "Sneezing", ""], ["congestion", "انسداد أنف", "Nasal congestion", "احتقان"],
  ["facepain", "ألم وجه أو جبهة", "Facial pain", "ضغط الجيوب"], ["earpain", "ألم أذن", "Ear pain", "وجع أذن"], ["eardischarge", "سيلان أذن", "Ear discharge", ""],
  ["headache", "صداع", "Headache", "وجع راس"], ["photophobia", "رهاب الضوء", "Photophobia", ""], ["nausea", "غثيان", "Nausea", "لعيان"], ["vomit", "إقياء", "Vomiting", "استفراغ"],
  ["diarrhea", "إسهال", "Diarrhoea", ""], ["constip", "إمساك", "Constipation", ""], ["abdpain", "ألم بطن", "Abdominal pain", "مغص"], ["heartburn", "حرقة معدة", "Heartburn", "حموضة"],
  ["epigastric", "ألم شرسوفي", "Epigastric pain", "ألم معدة"], ["bloating", "انتفاخ", "Bloating", "نفخة غازات"], ["rectalbleed", "نزف شرجي", "Rectal bleeding", "دم مع البراز"], ["analitch", "حكة شرجية", "Anal itch", ""],
  ["dysuria", "حرقة بول", "Dysuria", "حرقان"], ["frequency", "تكرار بول", "Urinary frequency", ""], ["flankpain", "ألم خاصرة", "Flank pain", "ألم كلية"], ["hematuria", "دم في البول", "Haematuria", ""],
  ["weakstream", "ضعف جريان البول", "Weak stream", "تقطير"], ["nocturia", "تبول ليلي", "Nocturia", ""],
  ["vagdischarge", "مفرزات مهبلية", "Vaginal discharge", "إفرازات"], ["vagitch", "حكة مهبلية", "Vaginal itch", ""], ["fishy", "رائحة كريهة", "Malodour", "رائحة سمك"],
  ["dysmen", "ألم دورة", "Period pain", "عسر طمث"], ["heavyperiod", "نزف طمثي غزير", "Heavy periods", "غزارة"], ["breastpain", "ألم ثدي واحمرار", "Breast pain/redness", "تورم ثدي"], ["pregnant", "حمل", "Pregnancy", "حامل"],
  ["rash", "طفح جلدي", "Rash", "حبوب جلد"], ["itch", "حكة جلدية", "Itch", "حكاك"], ["nightitch", "حكة ليلية", "Itch worse at night", ""], ["wheals", "شرى (انتبارات)", "Wheals", "قريص"],
  ["scaly", "قشور جلدية", "Scaling", "قشرة"], ["ringlesion", "آفة حلقية", "Ring-shaped lesion", ""], ["crusts", "قشور عسلية", "Honey crusts", ""], ["pimples", "حب شباب", "Pimples", "رؤوس سوداء"],
  ["facered", "احمرار الوجه", "Facial redness", "تورد"], ["skinred", "احمرار وتورم جلد", "Red swollen skin", ""], ["wart", "ثآليل", "Warts", "تؤلول"], ["lice", "قمل", "Lice", "صيبان"],
  ["redeye", "احمرار عين", "Red eye", ""], ["eyedischarge", "مفرزات عين", "Eye discharge", "عماص"], ["eyeitch", "حكة عين", "Itchy eye", ""], ["dryeye", "جفاف عين", "Dry eye", "حرقة عين"], ["lidlump", "تورم جفن", "Eyelid lump", "شحاذ"],
  ["toothache", "ألم سن", "Toothache", "وجع ضرس"], ["gumbleed", "نزف لثة", "Bleeding gums", ""], ["gumswelling", "تورم لثة أو وجه", "Gum/face swelling", "خراج"], ["mouthulcer", "تقرحات فم", "Mouth ulcers", "قلاع"],
  ["whitepatch", "بقع بيضاء بالفم", "White oral patches", "فطور"], ["lipsores", "تقرحات شفة", "Lip sores", ""], ["coldsens", "حساسية سن للبارد", "Cold sensitivity", ""], ["badbreath", "رائحة فم", "Bad breath", ""],
  ["jointpain", "ألم مفصل", "Joint pain", ""], ["bigtoe", "ألم إبهام القدم الحاد", "Acute big toe pain", "نقرس"], ["kneepain", "ألم ركبة", "Knee pain", ""], ["backpain", "ألم أسفل الظهر", "Low back pain", "ديسك"],
  ["heelpain", "ألم كعب", "Heel pain", ""], ["anklesprain", "التواء كاحل", "Ankle injury", "فكش"], ["dizzy", "دوار عند تحريك الرأس", "Positional vertigo", "دوخة"],
  ["fatigue", "تعب", "Fatigue", "إرهاق"], ["pallor", "شحوب", "Pallor", "صفرة"], ["insomnia", "أرق", "Insomnia", "قلة نوم"], ["wheeze", "أزيز", "Wheeze", "تزييق"],
  ["dyspnea", "ضيق نفس", "Shortness of breath", ""], ["barky", "سعال نباحي", "Barking cough", ""], ["myalgia", "آلام عضلية", "Myalgia", "تكسير"], ["thirst", "عطش وكثرة تبول", "Thirst & polyuria", "سكري"],
  ["bonepain", "آلام عظمية", "Bone pain", ""], ["chestpain", "ألم صدري", "Chest pain", "ضيق صدر"], ["diaper", "احمرار منطقة الحفاض", "Nappy area rash", ""],
];
const SY = Object.fromEntries(SYMPTOMS.map((s) => [s[0], s]));
// الأعراض النموذجية لكل مرض في المكتبة (بالاسم الإنكليزي)
const DX = {
  "Oral thrush (infants)": ["whitepatch"], "Oral candidiasis": ["whitepatch", "badbreath"], "Angular cheilitis": ["lipsores"],
  "Dental abscess": ["toothache", "gumswelling", "fever"], "Pericoronitis": ["toothache", "gumswelling", "badbreath"], "Dry socket (alveolar osteitis)": ["toothache", "badbreath"],
  "Necrotising ulcerative gingivitis": ["gumbleed", "badbreath", "mouthulcer"], "Gingivitis": ["gumbleed", "badbreath"], "Recurrent aphthous ulcers": ["mouthulcer"],
  "Herpes labialis": ["lipsores"], "Primary herpetic gingivostomatitis": ["mouthulcer", "fever", "gumbleed"], "Irreversible pulpitis (pain)": ["toothache", "coldsens"],
  "Post-extraction pain": ["toothache"], "Denture stomatitis": ["whitepatch"], "Dentine hypersensitivity": ["coldsens"],
  "Streptococcal pharyngitis": ["sorethroat", "fever"], "Acute bacterial sinusitis": ["facepain", "congestion", "runny", "fever"], "Acute otitis media (adults)": ["earpain", "fever"],
  "Otitis externa": ["earpain", "eardischarge"], "Allergic rhinitis": ["sneeze", "runny", "congestion", "eyeitch"], "Uncomplicated cystitis": ["dysuria", "frequency"],
  "GERD": ["heartburn", "epigastric"], "Helicobacter pylori": ["epigastric", "bloating", "nausea"], "Renal colic": ["flankpain", "hematuria", "nausea", "vomit"],
  "Iron deficiency anaemia": ["fatigue", "pallor"], "Vitamin D deficiency": ["fatigue", "bonepain", "myalgia"], "Hypertension (initiation)": [], "Type 2 diabetes (initiation)": ["thirst", "fatigue"],
  "Migraine attack": ["headache", "photophobia", "nausea", "vomit"], "Acute low back pain": ["backpain"], "Fever (children)": ["fever"], "Acute otitis media (children)": ["earpain", "fever"],
  "Streptococcal pharyngitis (children)": ["sorethroat", "fever", "abdpain"], "Acute gastroenteritis (children)": ["diarrhea", "vomit", "fever", "abdpain"],
  "Community-acquired pneumonia (children, mild)": ["cough", "fever", "dyspnea"], "Nappy rash": ["diaper", "rash"], "Vulvovaginal candidiasis": ["vagitch", "vagdischarge"],
  "Bacterial vaginosis": ["vagdischarge", "fishy"], "Primary dysmenorrhoea": ["dysmen", "abdpain"], "Nausea and vomiting of pregnancy": ["pregnant", "nausea", "vomit"],
  "UTI in pregnancy": ["pregnant", "dysuria", "frequency"], "Scabies": ["itch", "nightitch", "rash"], "Head lice": ["lice", "itch"], "Tinea corporis": ["ringlesion", "itch", "scaly"],
  "Impetigo": ["crusts", "rash"], "Mild acne": ["pimples"], "Moderate acne": ["pimples"], "Acute urticaria": ["wheals", "itch"], "Atopic dermatitis": ["itch", "rash", "scaly"],
  "Bacterial conjunctivitis": ["redeye", "eyedischarge"], "Allergic conjunctivitis": ["redeye", "eyeitch", "sneeze"], "Common cold": ["runny", "sneeze", "sorethroat", "cough", "congestion"],
  "Influenza": ["fever", "myalgia", "cough", "headache", "fatigue"], "Asthma exacerbation": ["wheeze", "dyspnea", "cough"], "Cellulitis": ["skinred", "fever"],
  "Constipation": ["constip", "abdpain", "bloating"], "Irritable bowel syndrome": ["abdpain", "bloating", "diarrhea", "constip"], "Haemorrhoids": ["rectalbleed", "analitch", "constip"],
  "Acute gout": ["bigtoe", "jointpain"], "BPPV / vertigo": ["dizzy", "nausea"], "Insomnia (short term)": ["insomnia"], "Knee osteoarthritis": ["kneepain", "jointpain"],
  "Plantar fasciitis": ["heelpain"], "Ankle sprain": ["anklesprain"], "Benign prostatic hyperplasia": ["weakstream", "nocturia", "frequency"],
  "Acute pyelonephritis (outpatient)": ["fever", "flankpain", "dysuria", "vomit"], "Croup": ["barky", "fever", "dyspnea"], "Threadworms": ["analitch", "nightitch"],
  "Trichomoniasis": ["vagdischarge", "vagitch", "dysuria", "fishy"], "Lactational mastitis": ["breastpain", "fever"], "Heavy menstrual bleeding": ["heavyperiod", "fatigue", "pallor"],
  "Seborrhoeic dermatitis": ["scaly", "itch", "facered"], "Pityriasis versicolor": ["scaly", "rash"], "Common warts": ["wart"], "Rosacea": ["facered", "pimples"],
  "Blepharitis": ["eyeitch", "redeye", "dryeye"], "Stye (hordeolum)": ["lidlump", "redeye"], "Dry eye": ["dryeye", "redeye"],
};
// علامات إنذار تستدعي تقييماً عاجلاً
const RED = [
  [["chestpain"], "الألم الصدري: استبعد متلازمة الشريان التاجي الحادة (تخطيط قلب فوري) والصمة الرئوية، خاصة مع تعرق أو ضيق نفس أو انتشار للذراع أو الفك: إحالة إسعافية."],
  [["epigastric"], "ألم شرسوفي فوق 55 سنة أو مع عسر بلع أو نقص وزن أو إقياء مستمر أو قيء دموي أو براز أسود أو فقر دم: تنظير عاجل. واستبعد متلازمة الشريان التاجي الحادة بتخطيط القلب."],
  [["pregnant", "headache"], "صداع عند الحامل بعد الأسبوع 20: قِس الضغط وابحث عن البروتين في البول لاستبعاد ما قبل الارتعاج."],
  [["fever", "rash"], "حرارة مع طفح لا يبيض بالضغط: استبعاد إنتان المكورات السحائية وإحالة إسعافية."],
  [["redeye"], "احمرار عين مع ألم شديد أو نقص رؤية أو رهاب ضوء أو حدقة ثابتة: استبعاد الزرق الحاد والتهاب القرنية والعنبية وإحالة عينية عاجلة."],
  [["backpain"], "ألم الظهر مع خدر السرج أو احتباس بول أو ضعف ساقين أو حرارة أو سوابق سرطان أو فوق 50 سنة لأول مرة: تقييم عاجل."],
  [["thirst", "vomit"], "عطش وكثرة تبول مع إقياء أو ألم بطن أو تنفس سريع: استبعاد الحماض الكيتوني السكري وقياس السكر والكيتون فوراً."],
  [["flankpain"], "ألم خاصرة لأول مرة فوق 60 سنة: استبعاد أم الدم الأبهرية البطنية."],
  [["fever", "headache", "photophobia"], "حرارة مع صداع ورهاب ضوء: استبعاد التهاب السحايا (صلابة النقرة، طفح لا يبيض بالضغط) وإحالة إسعافية."],
  [["dyspnea"], "ضيق النفس: قِس الإشباع والنبض والتنفس. عند الإشباع أقل من 92% أو الزرقة أو عدم القدرة على الكلام: إحالة إسعافية."],
  [["gumswelling", "fever"], "تورم الوجه مع حرارة: انتبه لانتشار الإنتان (صعوبة البلع أو التنفس، تورم تحت الفك، إغلاق العين): إحالة إسعافية."],
  [["rectalbleed"], "النزف الشرجي فوق 40-50 سنة أو مع نقص وزن أو تغير عادات التغوط أو فقر دم: يستدعي استقصاء القولون."],
  [["flankpain", "fever"], "ألم الخاصرة مع حرارة: احتمال التهاب حويضة أو كلية مسدودة متنتنة. التصوير والإحالة عند الانسداد."],
  [["pregnant", "abdpain"], "ألم بطن عند الحامل: استبعاد الحمل خارج الرحم والإجهاض وانفكاك المشيمة."],
  [["headache"], "الصداع المفاجئ الشديد («أسوأ صداع»)، أو مع عجز عصبي أو بعد رض أو فوق 50 سنة لأول مرة: تقييم إسعافي."],
  [["skinred", "fever"], "الاحمرار سريع الانتشار مع ألم شديد لا يتناسب مع المظهر: استبعاد التهاب اللفافة الناخر."],
  [["barky", "dyspnea"], "سعال نباحي مع ضيق نفس أو صرير بالراحة: خانوق متوسط إلى شديد يحتاج تقييماً إسعافياً."],
];
export function suggestDx(keys, DISEASES) {
  const set = new Set(keys);
  if (!set.size) return { list: [], red: [] };
  const list = DISEASES.map((d) => {
    const sy = (DX[d.en] || []).filter((k) => SY[k]);
    if (!sy.length) return null;
    const hit = sy.filter((k) => set.has(k));
    if (!hit.length) return null;
    // النقاط: نسبة الأعراض المطابقة من أعراض المرض، مع وزن لعدد المطابقات
    return { d, hit, total: sy.length, score: hit.length / sy.length + hit.length * 0.35 };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  // إن وُجد تطابق بعرضين أو أكثر نُخفي الاحتمالات الضعيفة (عرض واحد)
  const strong = list.some((x) => x.hit.length >= 2) ? list.filter((x) => x.hit.length >= 2 || (x.total === 1 && set.size === 1)) : list;
  const top = strong.slice(0, 6);
  const red = RED.filter(([ks]) => ks.every((k) => set.has(k))).map(([, t]) => t);
  return { list: top, red };
}
export const symName = (k, en) => (SY[k] ? (en ? SY[k][2] : SY[k][1]) : k);
export function searchSymptoms(q) {
  const t = low(q).trim();
  if (!t) return SYMPTOMS;
  return SYMPTOMS.filter((s) => low(`${s[1]} ${s[2]} ${s[3]}`).includes(t));
}

// ---------- 3) تفسير التحاليل (البالغين) ----------
// [مفتاح، الاسم، الوحدة، [حد أدنى، حد أعلى] أو {m:[..], f:[..]}، كلمات البحث، تفسير المنخفض، تفسير المرتفع، عتبات خاصة]
const L = (k, n, u, r, alias, lo, hi, bands) => ({ k, n, u, r, alias, lo, hi, bands });
export const LABS = [
  L("hb", "الخضاب (Hb)", "g/dL", { m: [13, 17], f: [12, 15.5] }, "hb hgb hemoglobin haemoglobin خضاب هيموغلوبين", "فقر دم. قيّم MCV والفيريتين لتحديد النوع.", "كثرة حمر: تجفاف، تدخين، أمراض رئوية، أو كثرة الحمر الحقيقية."),
  L("hct", "الرسابة (Hct)", "%", { m: [41, 50], f: [36, 44] }, "hct hematocrit pcv رسابة هيماتوكريت", "يتماشى مع فقر الدم.", "تجفاف أو كثرة حمر."),
  L("mcv", "حجم الكرية (MCV)", "fL", [80, 100], "mcv", "صغر الكريات: عوز حديد (الأشيع) أو ثلاسيميا. قيّم الفيريتين.", "كبر الكريات: عوز B12 أو حمض الفوليك، كحول، قصور درق، أمراض كبد."),
  L("wbc", "الكريات البيض (WBC)", "×10³/µL", [4, 11], "wbc leukocytes بيض كريات بيض", "قلة بيض: إنتان فيروسي، أدوية، أمراض نقي العظم.", "كثرة بيض: إنتان جرثومي، كورتيزون، التهاب، ونادراً أمراض دم."),
  L("plt", "الصفيحات (PLT)", "×10³/µL", [150, 400], "plt platelets صفيحات", "قلة صفيحات: خطر نزف عند أقل من 50. ابحث عن السبب.", "كثرة صفيحات: ارتكاسية (التهاب، عوز حديد، نزف) غالباً."),
  L("ferritin", "الفيريتين", "ng/mL", { m: [30, 400], f: [30, 150] }, "ferritin فيريتين فرتين", "عوز حديد (أقل من 15 مؤكد، وأقل من 30 مرجح، وأقل من 100 مع وجود التهاب).", "التهاب أو أمراض كبد أو فرط حمل حديد. فيريتين مرتفع مع التهاب لا ينفي عوز الحديد."),
  L("iron", "حديد المصل", "µg/dL", [60, 170], "iron fe serum iron حديد", "يتماشى مع عوز الحديد أو التهاب مزمن.", "تحميل زائد للحديد أو بعد تناول الحديد."),
  L("fbs", "سكر الصيام", "mg/dL", [70, 99], "fbs fasting-glucose fpg سكر-الصيام صيام صايم", "هبوط سكر: يحتاج تقييماً.", "", [[100, 125, "ما قبل السكري (100-125)"], [126, 9999, "يتوافق مع السكري (126 فأكثر). يُؤكد بقياس ثانٍ أو HbA1c."]]),
  L("rbs", "السكر العشوائي", "mg/dL", [70, 139], "rbs random-glucose سكر-عشوائي عشوائي فاطر", "هبوط سكر.", "", [[140, 199, "مرتفع: يُستكمل بسكر الصيام أو HbA1c."], [200, 9999, "200 فأكثر مع أعراض: سكري."]]),
  L("a1c", "الخضاب السكري (HbA1c)", "%", [4, 5.6], "hba1c a1c hemoglobin-a1c سكر-تراكمي تراكمي خضاب-سكري", "", "", [[5.7, 6.4, "ما قبل السكري (5.7-6.4%)."], [6.5, 99, "يتوافق مع السكري (6.5% فأكثر). هدف العلاج غالباً أقل من 7%."]]),
  L("creat", "الكرياتينين", "mg/dL", { m: [0.7, 1.3], f: [0.6, 1.1] }, "creatinine creat cr كرياتينين", "كتلة عضلية قليلة غالباً.", "قصور كلوي محتمل. احسب eGFR وعدّل جرعات الأدوية."),
  L("urea", "البولة (Urea)", "mg/dL", [15, 45], "urea بولة يوريا", "حمية قليلة البروتين أو أمراض كبد.", "تجفاف، قصور كلوي، نزف هضمي علوي، أو كورتيزون."),
  L("bun", "آزوت البولة (BUN)", "mg/dL", [7, 20], "bun", "", "تجفاف أو قصور كلوي."),
  L("uric", "حمض البول", "mg/dL", { m: [3.4, 7], f: [2.4, 6] }, "uric acid حمض البول يوريك اسيد", "", "فرط حمض البول: خطر النقرس وحصيات. الهدف أقل من 6 عند مرضى النقرس."),
  L("alt", "ALT (GPT)", "U/L", [7, 40], "alt sgpt gpt", "", "أذية خلايا كبدية: كبد دهني، التهاب كبد فيروسي، أدوية، كحول. أكثر من 10 أضعاف: أذية حادة."),
  L("ast", "AST (GOT)", "U/L", [8, 40], "ast sgot got", "", "أذية كبدية أو عضلية. نسبة AST/ALT أعلى من 2 توحي بالكحول."),
  L("alp", "الفوسفاتاز القلوية (ALP)", "U/L", [44, 147], "alp alkaline phosphatase فوسفاتاز", "", "ركودة صفراوية أو أمراض عظم (طبيعي ارتفاعها عند الأطفال والحوامل)."),
  L("tbil", "البيليروبين الكلي", "mg/dL", [0.3, 1.2], "bilirubin tbil بيليروبين", "", "يرقان: انحلال دم، أمراض كبد، انسداد صفراوي، أو متلازمة جيلبرت."),
  L("alb", "الألبومين", "g/dL", [3.5, 5], "albumin ألبومين", "سوء تغذية، أمراض كبد مزمنة، متلازمة نفروزية، أو التهاب.", "تجفاف."),
  L("chol", "الكوليسترول الكلي", "mg/dL", [0, 199], "cholesterol total-cholesterol chol كوليسترول كولسترول", "", "", [[200, 239, "حدّي (200-239)."], [240, 9999, "مرتفع (240 فأكثر). قيّم الخطر القلبي الوعائي."]]),
  L("ldl", "LDL", "mg/dL", [0, 129], "ldl ldl-c ldl-cholesterol", "", "", [[130, 159, "حدّي مرتفع. الهدف حسب الخطر: أقل من 100، وأقل من 70 أو 55 للعالي الخطورة."], [160, 189, "مرتفع."], [190, 9999, "مرتفع جداً (190 فأكثر): ستاتين غالباً واستبعاد العائلي."]]),
  L("hdl", "HDL", "mg/dL", { m: [40, 999], f: [50, 999] }, "hdl hdl-c hdl-cholesterol", "منخفض: عامل خطر قلبي وعائي.", ""),
  L("tg", "الشحوم الثلاثية", "mg/dL", [0, 149], "tg triglycerides شحوم ثلاثية", "", "", [[150, 499, "مرتفعة. نمط الحياة وضبط السكر."], [500, 99999, "مرتفعة جداً (500 فأكثر): خطر التهاب البنكرياس."]]),
  L("tsh", "TSH", "mIU/L", [0.4, 4], "tsh", "فرط نشاط الدرق (أو علاج زائد بالثيروكسين). قيّم FT4.", "قصور الدرق. قيّم FT4. في الحمل تُعتمد مجالات خاصة بكل ثلث، ويُستهدف أقل من 2.5 عند الحامل المعالجة بالثيروكسين."),
  L("ft4", "FT4", "ng/dL", [0.8, 1.8], "ft4 free t4", "قصور درق (مع TSH مرتفع) أو قصور نخامي.", "فرط نشاط الدرق."),
  L("na", "الصوديوم", "mmol/L", [135, 145], "na sodium صوديوم", "نقص صوديوم: أدوية (مدرات، SSRIs)، إقياء، قصور قلب. أقل من 125: خطير.", "فرط صوديوم: تجفاف غالباً."),
  L("k", "البوتاسيوم", "mmol/L", [3.5, 5], "k potassium بوتاسيوم", "نقص بوتاسيوم: مدرات، إقياء، إسهال. أقل من 3: يحتاج تعويضاً.", "فرط بوتاسيوم: قصور كلوي، ACEi، سبيرونولاكتون. فوق 6: خطير (تخطيط قلب). استبعد انحلال العينة."),
  L("ca", "الكالسيوم", "mg/dL", [8.5, 10.5], "ca calcium كالسيوم", "صحح على الألبومين. عوز فيتامين د أو قصور جارات الدرق.", "فرط جارات الدرق أو أورام. يحتاج تقييماً."),
  L("crp", "CRP", "mg/L", [0, 5], "crp", "", "التهاب أو إنتان. فوق 100 يرجح الإنتان الجرثومي."),
  L("esr", "سرعة التثفل (ESR)", "mm/h", { m: [0, 15], f: [0, 20] }, "esr sed rate تثفل", "", "التهاب غير نوعي: إنتان، أمراض مناعية، فقر دم، حمل، تقدم السن."),
  L("vitd", "فيتامين د (25-OH)", "ng/mL", [30, 100], "vitd vit-d vitamin-d 25oh فيتامين-د", "", "مرتفع، لا حاجة لمكملات إضافية. السمية محتملة فوق 150 مع فرط كالسيوم.", [[0, 19.99, "عوز فيتامين د (أقل من 20)."], [20, 29.99, "قصور فيتامين د (20-29)."]]),
  L("b12", "فيتامين B12", "pg/mL", [200, 900], "b12 vitamin-b12 cobalamin", "عوز B12: فقر دم كبير الكريات واعتلال أعصاب. شائع مع الميتفورمين.", ""),
  L("psa", "PSA", "ng/mL", [0, 4], "psa", "", "مرتفع: ضخامة موثة أو التهاب أو سرطان. يحتاج تقييماً بولياً حسب العمر."),
  L("inr", "INR", "", [0.8, 1.2], "inr", "", "مرتفع: مضادات تخثر أو أمراض كبد. الهدف مع الوارفارين غالباً 2-3."),
];
// أطول كلمة مطابقة تفوز (حتى لا يُفهم "vitamin b12" على أنه فيتامين د)
const LBY = (q) => {
  const t = low(q).trim().replace(/\s+/g, " ");
  const exact = LABS.find((x) => x.k === t || low(x.n) === t || x.alias.split(" ").some((a) => a && (t === a.replace(/-/g, " ") || t.replace(/[\s()-]/g, "") === a.replace(/-/g, ""))));
  if (exact) return exact;
  let best = null, len = 0;
  for (const x of LABS) for (const a of x.alias.split(" ")) { const w = a.replace(/-/g, " "); if (w.length > 2 && t.includes(w) && w.length > len) { best = x; len = w.length; } }
  return best;
};
export const findLab = LBY;
// sex: "m" أو "f"
export function interpretLab(key, value, sex = "") {
  const L0 = typeof key === "string" ? LBY(key) : key;
  const v = Number(String(value).replace(",", "."));
  if (!L0 || isNaN(v)) return null;
  const r = Array.isArray(L0.r) ? L0.r : (L0.r[sex] || L0.r.m);
  const range = Array.isArray(L0.r) ? r : (sex ? r : [Math.min(L0.r.m[0], L0.r.f[0]), Math.max(L0.r.m[1], L0.r.f[1])]);
  const bs = L0.bands || [];
  const band = bs.find(([a], i) => v >= a && (i === bs.length - 1 || v < bs[i + 1][0]));
  let st = v < range[0] ? "low" : v > range[1] ? "high" : "ok";
  let note = st === "low" ? L0.lo : st === "high" ? L0.hi : "ضمن الطبيعي.";
  if (band) { st = L0.k === "vitd" ? "low" : "high"; note = band[2]; }
  return { lab: L0, v, st, note: note || (st === "ok" ? "ضمن الطبيعي." : ""), range };
}
// eGFR حسب معادلة CKD-EPI 2021 (دون العرق)
export function egfr(creat, age, sex) {
  const s = Number(creat), a = Number(age);
  if (!s || !a || a < 18 || !sex) return null;
  const f = sex === "f", k = f ? 0.7 : 0.9, al = f ? -0.241 : -0.302;
  const v = 142 * Math.pow(Math.min(s / k, 1), al) * Math.pow(Math.max(s / k, 1), -1.2) * Math.pow(0.9938, a) * (f ? 1.012 : 1);
  const g = Math.round(v);
  const stage = g >= 90 ? "G1 (طبيعي أو مرتفع)" : g >= 60 ? "G2 (نقص خفيف)" : g >= 45 ? "G3a (نقص خفيف إلى متوسط)" : g >= 30 ? "G3b (نقص متوسط إلى شديد)" : g >= 15 ? "G4 (نقص شديد)" : "G5 (فشل كلوي)";
  return { g, stage };
}
