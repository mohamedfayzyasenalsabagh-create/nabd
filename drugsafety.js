// التثقيف الدوائي: سلامة الأدوية الشائعة في الحمل والإرضاع وأمراض الكبد والكلى
// المستويات: ok = آمن عادة، care = بحذر أو بتعديل الجرعة، no = يُتجنب
// مرجع عام مختصر (BNF وLactMed وتوصيات FDA/ACOG). القرار النهائي للطبيب حسب الحالة.
export const CONDS = [
  ["preg", "الحمل", "🤰"],
  ["lact", "الإرضاع", "🍼"],
  ["liver", "مرضى الكبد", "🟤"],
  ["kidney", "مرضى الكلى", "🫘"],
];
export const LEVEL = { ok: ["آمن عادة", "ok"], care: ["بحذر / تعديل الجرعة", "warn"], no: ["يُتجنب", "danger"] };

// k: كلمات تطابق اسم الدواء، cls: الزمرة (لكشف التحسس)، ثم الحالات الأربع: [المستوى، الملاحظة]
const E = (n, k, cls, preg, lact, liver, kidney) => ({ n, k, cls, preg, lact, liver, kidney });
export const SAFETY = [
  // المسكنات
  E("Paracetamol (باراسيتامول)", ["paracetamol", "acetaminophen", "panadol", "باراسيتامول"], "",
    ["ok", "المسكن وخافض الحرارة المفضل في الحمل"], ["ok", ""], ["care", "لا تتجاوز 2 غ يومياً"], ["ok", "تباعد الجرعات عند القصور الشديد"]),
  E("مضادات الالتهاب غير الستيروئيدية (Ibuprofen، Diclofenac، Naproxen، Mefenamic acid، Meloxicam، Ketoprofen)", ["ibuprofen", "diclofenac", "naproxen", "mefenamic", "meloxicam", "ketoprofen", "celecoxib", "piroxicam", "etoricoxib", "ketorolac", "brufen", "voltaren"], "nsaid",
    ["no", "تُتجنب خاصة بعد الأسبوع 20 (انغلاق القناة الشريانية وقلة السائل الأمنيوسي)"], ["ok", "الإيبوبروفين هو المفضل"], ["care", "تُتجنب في القصور الشديد"], ["no", "تُتجنب: تسيء لوظيفة الكلية"]),
  E("Aspirin (أسبرين)", ["aspirin", "acetylsalicylic", "أسبرين"], "nsaid",
    ["care", "الجرعة المسكنة تُتجنب. الجرعة المنخفضة 75 إلى 150 ملغ مستطبة للوقاية من الارتعاج (NICE NG133، ACOG)"], ["care", "الجرعة المنخفضة مقبولة، وتُتجنب الجرعات المسكنة المنتظمة (خطر متلازمة راي)"], ["care", "يُتجنب في القصور الشديد"], ["care", "يُتجنب في القصور الشديد"]),
  E("Tramadol / Codeine", ["tramadol", "codeine", "كودئين", "ترامادول"], "opioid",
    ["care", "لأقصر مدة. الاستخدام قرب الولادة يسبب أعراض سحب عند الوليد"], ["no", "الكودئين والترامادول ممنوعان أثناء الإرضاع"], ["care", "تخفيض الجرعة"], ["care", "تباعد الجرعات"]),

  // الصادات
  E("Amoxicillin/Clavulanate (Augmentin)", ["clavulan", "amoxiclav", "augmentin", "اوغمنتين"], "penicillin",
    ["ok", "يُفضل تجنبه عند خطر الولادة المبكرة مع تمزق الأغشية"], ["ok", ""], ["care", "خطر الركودة الصفراوية: مراقبة وظائف الكبد"], ["care", "تعديل الجرعة إذا التصفية أقل من 30"]),
  E("البنسلينات (Amoxicillin، Penicillin، Ampicillin، Flucloxacillin)", ["amoxicillin", "amoxil", "penicillin", "ampicillin", "flucloxacillin", "cloxacillin", "اموكسيسيلين"], "penicillin",
    ["ok", ""], ["ok", ""], ["care", "الفلوكلوكساسيلين: خطر يرقان ركودي، يُتجنب مع سوابق يرقان منه"], ["care", "تعديل الجرعة إذا التصفية أقل من 30"]),
  E("السيفالوسبورينات (Cefalexin، Cefuroxime، Cefixime، Ceftriaxone)", ["cefalexin", "cephalexin", "cefuroxime", "cefixime", "ceftriaxone", "cefaclor", "cefadroxil", "cefdinir", "cefpodoxime"], "cephalosporin",
    ["ok", ""], ["ok", ""], ["ok", ""], ["care", "تعديل الجرعة في القصور المتوسط والشديد"]),
  E("Azithromycin", ["azithromycin", "zithromax", "ازيثرومايسين"], "macrolide",
    ["ok", ""], ["ok", ""], ["care", "يُتجنب في القصور الشديد"], ["ok", ""]),
  E("Clarithromycin / Erythromycin", ["clarithromycin", "erythromycin", "klacid"], "macrolide",
    ["care", "يُفضل تجنب الكلاريثرومايسين في الثلث الأول"], ["care", ""], ["care", "مراقبة وظائف الكبد"], ["care", "نصف الجرعة إذا التصفية أقل من 30"]),
  E("Metronidazole", ["metronidazole", "flagyl", "ميترونيدازول"], "",
    ["care", "تُتجنب الجرعة الواحدة العالية 2 غ. النظام المقسم مقبول"], ["care", "مع جرعة 2 غ الواحدة: إيقاف الإرضاع 12 إلى 24 ساعة"], ["care", "تخفيض الجرعة في القصور الشديد"], ["ok", ""]),
  E("التتراسكلينات (Doxycycline، Minocycline، Tetracycline)", ["doxycycline", "minocycline", "tetracycline", "دوكسيسيكلين"], "tetracycline",
    ["no", "تلوّن أسنان الجنين وتؤثر على نمو العظم"], ["care", "الشوط القصير من الدوكسيسيكلين مقبول، ويُتجنب الاستخدام المتكرر أو الطويل"], ["care", ""], ["care", "الدوكسيسيكلين مقبول، والتتراسكلين يُتجنب"]),
  E("الكينولونات (Ciprofloxacin، Levofloxacin، Moxifloxacin)", ["ciprofloxacin", "levofloxacin", "moxifloxacin", "norfloxacin", "ofloxacin", "ciprobay", "سيبروفلوكساسين"], "quinolone",
    ["no", "تُتجنب: تأثير على الغضاريف"], ["no", "تُتجنب ما أمكن"], ["care", ""], ["care", "تعديل الجرعة"]),
  E("Nitrofurantoin", ["nitrofurantoin", "macrobid", "نتروفورانتوين"], "",
    ["care", "يُتجنب قرب موعد الولادة (فقر دم انحلالي عند الوليد)"], ["care", "يُتجنب إذا كان الرضيع دون شهر أو لديه عوز G6PD"], ["care", ""], ["no", "يُتجنب إذا كان eGFR أقل من 45"]),
  E("Trimethoprim / Co-trimoxazole (Septrin)", ["trimethoprim", "co-trimoxazole", "cotrimoxazole", "septrin", "bactrim", "sulfamethoxazole"], "sulfa",
    ["no", "يُتجنب في الثلث الأول (مضاد للفولات) وقرب الولادة"], ["care", "يُتجنب مع الخديج أو اليرقان أو عوز G6PD"], ["care", ""], ["care", "تعديل الجرعة وخطر ارتفاع البوتاسيوم"]),
  E("Fosfomycin", ["fosfomycin", "monurol"], "",
    ["ok", ""], ["ok", ""], ["ok", ""], ["care", "يُتجنب إذا كانت التصفية أقل من 10"]),
  E("Clindamycin", ["clindamycin", "dalacin", "كليندامايسين"], "",
    ["ok", ""], ["care", "مراقبة الرضيع لحدوث إسهال"], ["care", "تخفيض الجرعة في القصور الشديد"], ["ok", ""]),
  E("Gentamicin وأمينوغليكوزيدات أخرى (حقن)", ["gentamicin", "amikacin", "tobramycin inj"], "",
    ["no", "سمية سمعية للجنين"], ["ok", ""], ["ok", ""], ["no", "سمية كلوية: تُتجنب أو بمراقبة المستوى"]),

  // مضادات الفطور والفيروسات والطفيليات
  E("Fluconazole (فموي)", ["fluconazole", "diflucan", "فلوكونازول"], "azole",
    ["no", "يُستبدل بالعلاج الموضعي أثناء الحمل"], ["ok", ""], ["care", "مراقبة وظائف الكبد"], ["care", "نصف الجرعة إذا التصفية أقل من 50"]),
  E("Miconazole oral gel (Daktarin جل فموي)", ["miconazole 2% oral gel", "miconazole oral", "daktarin oral"], "azole",
    ["care", "يُمتص جزئياً: يفضل النيستاتين"], ["ok", ""], ["care", "يُتجنب في القصور الكبدي. يتداخل بشدة مع الوارفارين"], ["ok", ""]),
  E("مضادات الفطور الموضعية (Clotrimazole، Miconazole، Nystatin)", ["clotrimazole", "miconazole", "nystatin", "econazole", "daktarin", "canesten", "نيستاتين"], "",
    ["ok", "مفضلة في الحمل"], ["ok", ""], ["ok", ""], ["ok", ""]),
  E("Aciclovir / Valaciclovir", ["aciclovir", "acyclovir", "valaciclovir", "zovirax", "valtrex"], "",
    ["ok", ""], ["ok", ""], ["ok", ""], ["care", "تعديل الجرعة الفموية وشرب سوائل كافية"]),
  E("Mebendazole / Albendazole", ["mebendazole", "albendazole", "vermox", "zentel"], "",
    ["no", "يُتجنب في الثلث الأول"], ["care", ""], ["care", ""], ["ok", ""]),
  E("Permethrin", ["permethrin", "بيرمثرين"], "",
    ["ok", ""], ["ok", ""], ["ok", ""], ["ok", ""]),

  // الهضمية
  E("مثبطات مضخة البروتون (Omeprazole، Esomeprazole، Pantoprazole، Lansoprazole)", ["omeprazole", "esomeprazole", "pantoprazole", "lansoprazole", "rabeprazole", "اوميبرازول"], "",
    ["ok", ""], ["ok", ""], ["care", "لا تتجاوز 20 ملغ يومياً في القصور الشديد"], ["ok", ""]),
  E("Famotidine", ["famotidine", "ranitidine"], "",
    ["ok", ""], ["ok", ""], ["ok", ""], ["care", "نصف الجرعة في القصور"]),
  E("مضادات الحموضة (Aluminium / Magnesium hydroxide)", ["antacid", "gaviscon", "maalox", "magnesium hydroxide", "aluminium hydroxide"], "",
    ["ok", ""], ["ok", ""], ["care", "تُتجنب المحتوية على الصوديوم عند الحبن"], ["care", "تُتجنب أملاح المغنيزيوم والألمنيوم في القصور"]),
  E("Metoclopramide", ["metoclopramide", "primperan", "ميتوكلوبراميد"], "",
    ["ok", "مقبول، لأقصر مدة"], ["care", ""], ["care", "تخفيض الجرعة"], ["care", "تخفيض الجرعة"]),
  E("Domperidone", ["domperidone", "motilium", "دومبيريدون"], "",
    ["care", ""], ["care", ""], ["no", "يُتجنب في القصور المتوسط والشديد"], ["care", ""]),
  E("Ondansetron", ["ondansetron", "zofran"], "",
    ["care", "خطر بسيط لشق الشفة عند استخدامه في الثلث الأول"], ["ok", ""], ["care", "لا تتجاوز 8 ملغ يومياً"], ["ok", ""]),
  E("Loperamide", ["loperamide", "imodium"], "",
    ["care", ""], ["ok", ""], ["care", ""], ["ok", ""]),
  E("Hyoscine butylbromide (Buscopan)", ["hyoscine", "buscopan", "بوسكوبان"], "",
    ["care", ""], ["ok", ""], ["ok", ""], ["ok", ""]),

  // التحسس والتنفسية
  E("مضادات الهيستامين غير المركنة (Loratadine، Cetirizine، Desloratadine، Fexofenadine)", ["loratadine", "cetirizine", "desloratadine", "fexofenadine", "levocetirizine", "claritin", "zyrtec"], "",
    ["ok", "اللوراتادين والسيتريزين هما المفضلان"], ["ok", ""], ["care", ""], ["care", "نصف جرعة السيتريزين في القصور"]),
  E("Chlorpheniramine", ["chlorpheniramine", "chlorphenamine"], "",
    ["ok", ""], ["care", "قد يسبب نعاس الرضيع ويقلل الحليب"], ["care", ""], ["ok", ""]),
  E("Pseudoephedrine", ["pseudoephedrine", "sudafed"], "",
    ["no", "يُتجنب في الثلث الأول"], ["care", "يقلل إدرار الحليب"], ["care", ""], ["care", ""]),
  E("Salbutamol والبخاخات الستيروئيدية (Budesonide، Fluticasone)", ["salbutamol", "ventolin", "budesonide", "fluticasone", "beclometasone", "formoterol", "salmeterol"], "",
    ["ok", "ضبط الربو أهم للجنين من تجنب البخاخ"], ["ok", ""], ["ok", ""], ["ok", ""]),
  E("Montelukast", ["montelukast", "singulair"], "",
    ["ok", ""], ["ok", ""], ["care", ""], ["ok", ""]),
  E("Prednisolone / Dexamethasone (فموي)", ["prednisolone", "prednisone", "dexamethasone", "methylprednisolone", "betamethasone"], "",
    ["care", "مقبول عند الحاجة بأقل جرعة فعالة"], ["ok", ""], ["ok", ""], ["ok", ""]),

  // القلبية والضغط والدم
  E("مثبطات ACE وحاصرات مستقبلات الأنجيوتنسين (Enalapril، Lisinopril، Captopril، Losartan، Valsartan)", ["enalapril", "lisinopril", "captopril", "ramipril", "perindopril", "losartan", "valsartan", "irbesartan", "candesartan", "telmisartan", "olmesartan"], "acei",
    ["no", "ممنوعة: سمية كلوية للجنين خاصة في الثلثين الثاني والثالث"], ["care", "الإنالابريل والكابتوبريل مقبولان"], ["care", "الأدوية الطليعية (Enalapril، Ramipril، Perindopril) أقل فعالية، ويبدأ Losartan بجرعة أقل، ويُتجنب Telmisartan وOlmesartan في القصور الشديد"], ["care", "مراقبة الكرياتينين والبوتاسيوم"]),
  E("Methyldopa", ["methyldopa", "aldomet", "ميثيل دوبا"], "",
    ["ok", "من أدوية الضغط المفضلة في الحمل"], ["ok", ""], ["no", "يُتجنب في التهاب الكبد الفعال"], ["ok", ""]),
  E("Labetalol", ["labetalol"], "",
    ["ok", "من أدوية الضغط المفضلة في الحمل"], ["ok", ""], ["no", "يُتجنب: أذية كبدية شديدة موصوفة"], ["ok", ""]),
  E("Nifedipine / Amlodipine", ["nifedipine", "amlodipine", "adalat", "norvasc"], "",
    ["ok", "النيفيديبين المديد مفضل في الحمل"], ["ok", ""], ["care", "تخفيض الجرعة"], ["ok", ""]),
  E("حاصرات بيتا (Atenolol، Bisoprolol، Propranolol، Metoprolol)", ["atenolol", "bisoprolol", "propranolol", "metoprolol", "carvedilol", "nebivolol"], "",
    ["care", "الأتينولول يُتجنب (تأخر نمو الجنين)"], ["care", "مراقبة الرضيع (بطء القلب)"], ["care", "البروبرانولول بجرعة أقل"], ["care", "الأتينولول يحتاج تعديل الجرعة"]),
  E("Spironolactone", ["spironolactone", "aldactone"], "",
    ["no", ""], ["ok", ""], ["care", ""], ["no", "خطر ارتفاع البوتاسيوم"]),
  E("Furosemide / Hydrochlorothiazide", ["furosemide", "lasix", "hydrochlorothiazide", "indapamide"], "",
    ["care", "لا تُستخدم لعلاج الوذمة الحملية"], ["care", "قد تقلل الحليب"], ["care", "خطر اضطراب الشوارد والسبات الكبدي"], ["care", "التيازيدات غير فعالة في القصور الشديد"]),
  E("الستاتينات (Atorvastatin، Rosuvastatin، Simvastatin)", ["atorvastatin", "rosuvastatin", "simvastatin", "pravastatin", "lipitor", "crestor"], "",
    ["no", "تُوقف أثناء الحمل"], ["no", ""], ["care", "ممنوعة في المرض الكبدي الفعال أو ارتفاع الترانسأميناز غير المفسر، ومقبولة في المرض المزمن المستقر والكبد الدهني"], ["care", "الروزوفاستاتين بجرعة منخفضة"]),
  E("Warfarin", ["warfarin", "وارفارين"], "",
    ["no", "مشوه للجنين: يُستبدل بالهيبارين"], ["ok", ""], ["care", "زيادة خطر النزف"], ["care", "مراقبة INR بشكل أدق"]),
  E("Enoxaparin / Heparin", ["enoxaparin", "clexane", "heparin", "كليكسان"], "",
    ["ok", "مضاد التخثر المفضل في الحمل"], ["ok", ""], ["care", ""], ["care", "تخفيض جرعة الإينوكسابارين إذا التصفية أقل من 30"]),
  E("Tranexamic acid", ["tranexamic", "cyklokapron"], "",
    ["care", ""], ["ok", ""], ["ok", ""], ["care", "تخفيض الجرعة"]),

  // الغدد والسكري
  E("Metformin", ["metformin", "glucophage", "ميتفورمين"], "",
    ["ok", "مقبول في سكري الحمل (الخيار الأول حسب NICE، والأنسولين حسب ACOG)"], ["ok", ""], ["no", "خطر الحماض اللبني"], ["care", "يُوقف إذا eGFR أقل من 30، ونصف الجرعة بين 30 و45، والحد الأقصى 2 غ بين 45 و59"]),
  E("السلفونيل يوريا (Gliclazide، Glimepiride، Glibenclamide)", ["gliclazide", "glimepiride", "glibenclamide", "glyburide", "diamicron", "amaryl"], "",
    ["no", "يُستبدل بالأنسولين"], ["care", "مراقبة سكر الرضيع"], ["care", "خطر نقص السكر"], ["care", "خطر نقص السكر"]),
  E("Insulin", ["insulin", "انسولين"], "",
    ["ok", ""], ["ok", ""], ["care", "قد تقل الحاجة للأنسولين"], ["care", "قد تقل الحاجة للأنسولين"]),
  E("Levothyroxine", ["levothyroxine", "thyroxine", "euthyrox", "ثيروكسين"], "",
    ["ok", "غالباً تزيد الجرعة أثناء الحمل"], ["ok", ""], ["ok", ""], ["ok", ""]),
  E("Carbimazole / Methimazole", ["carbimazole", "methimazole", "thiamazole"], "",
    ["care", "في الثلث الأول يُفضل Propylthiouracil، ثم الكاربيمازول بعد الأسبوع 16 تقريباً (ATA 2017)"], ["ok", "بجرعة منخفضة"], ["care", ""], ["ok", ""]),

  // الجهاز العصبي والنفسي
  E("Valproate (Depakine)", ["valpro", "depakine", "depakote", "فالبروات"], "",
    ["no", "ممنوع: تشوهات أنبوب عصبي وتأخر نمو عصبي"], ["care", ""], ["no", ""], ["care", ""]),
  E("Carbamazepine", ["carbamazepine", "tegretol"], "",
    ["care", "خطر تشوه: لا يُوقف فجأة، يحتاج تقييم اختصاصي وحمض فوليك 5 ملغ (MHRA 2021)"], ["care", ""], ["care", ""], ["care", ""]),
  E("مضادات الاكتئاب SSRIs (Sertraline، Fluoxetine، Escitalopram، Paroxetine)", ["sertraline", "fluoxetine", "escitalopram", "citalopram", "paroxetine", "zoloft", "prozac"], "",
    ["care", "السيرترالين مفضل، والباروكسيتين يُتجنب"], ["ok", "السيرترالين مفضل"], ["care", "تخفيض الجرعة"], ["care", ""]),
  E("البنزوديازيبينات (Diazepam، Alprazolam، Lorazepam)", ["diazepam", "alprazolam", "lorazepam", "clonazepam", "bromazepam", "xanax", "valium"], "",
    ["care", "قرب الولادة: ارتخاء ونقص حرارة الوليد"], ["care", "نعاس الرضيع"], ["care", "قد تسبب السبات الكبدي"], ["care", ""]),
  E("Sumatriptan والتريبتانات", ["sumatriptan", "rizatriptan", "zolmitriptan", "imigran"], "",
    ["care", ""], ["ok", ""], ["care", "لا تتجاوز 50 ملغ للجرعة"], ["care", ""]),

  // الجلدية والهرمونات
  E("Isotretinoin (Roaccutane)", ["isotretinoin", "roaccutane", "روكتان"], "",
    ["no", "ممنوع مطلقاً: مشوه شديد. يلزم منع حمل فعال"], ["no", ""], ["no", ""], ["care", ""]),
  E("الريتينويدات الموضعية (Adapalene، Tretinoin)", ["adapalene", "tretinoin", "differin", "tazarotene"], "",
    ["no", "تُتجنب أثناء الحمل"], ["care", "لا تُدهن على الثدي"], ["ok", ""], ["ok", ""]),
  E("Methotrexate", ["methotrexate", "ميثوتريكسات"], "",
    ["no", "ممنوع مطلقاً"], ["no", ""], ["no", ""], ["no", ""]),
  E("موانع الحمل الفموية المركبة", ["ethinylestradiol", "ethinyl estradiol", "ethinyl", "yasmin", "yaz", "microgynon"], "",
    ["no", "لا تُستخدم أثناء الحمل"], ["care", "تقلل الحليب: تُفضل الحبوب البروجستيرونية"], ["no", "ممنوعة في المرض الكبدي الشديد"], ["ok", ""]),
  E("Allopurinol", ["allopurinol", "zyloric"], "",
    ["no", ""], ["care", ""], ["care", ""], ["care", "تخفيض الجرعة"]),
  E("Colchicine", ["colchicine"], "",
    ["care", ""], ["care", ""], ["care", ""], ["care", "تخفيض الجرعة أو تجنبه"]),

  // الأسنان والمكملات
  E("المخدر الموضعي السني (Lidocaine، Articaine مع الأدرينالين)", ["lidocaine", "lignocaine", "articaine", "septanest", "xylocaine", "ليدوكائين"], "",
    ["ok", "آمن بالجرعات السنية، ويُفضل تأجيل الإجراءات غير الإسعافية للثلث الثاني"], ["ok", ""], ["care", "تقليل الجرعة الكلية"], ["ok", ""]),
  E("Prilocaine مع Felypressin", ["prilocaine", "citanest", "felypressin"], "",
    ["care", "يُفضل الليدوكائين، فالفيليبريسين بجرعات عالية قد يحرض نظرياً تقلصات الرحم"], ["ok", ""], ["care", ""], ["ok", ""]),
  E("Chlorhexidine / Benzydamine غسول", ["chlorhexidine", "benzydamine", "corsodyl", "tantum"], "",
    ["ok", ""], ["ok", ""], ["ok", ""], ["ok", ""]),
  E("الحديد وحمض الفوليك والكالسيوم وفيتامين د", ["ferrous", "ferric", "iron sucrose", "folic", "calcium +", "calcium carbonate", "cholecalciferol", "vitamin d", "حديد", "فوليك"], "",
    ["ok", ""], ["ok", ""], ["ok", ""], ["care", "مراقبة الكالسيوم وفيتامين د في القصور"]),
];

const norm = (s) => String(s || "").toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه");
import { BRANDS } from "./drugs.js";
// أدوية التحذير فيها للشكل الجهازي فقط (لا تنطبق على الكريم والقطرة والمرهم والجل)
const SYSTEMIC = ["gentamicin", "doxycycline", "ciprofloxacin", "metronidazole", "clindamycin"];
const TOPICAL = /(cream|drops|ointment|\bgel\b|lotion|\beye\b|\bear\b|topical|vaginal|كريم|قطر|مرهم|جل|غسول|مهبلي)/i;
SAFETY.forEach((e) => { e.sys = SYSTEMIC.includes(e.k[0]); });
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const brandOf = (raw) => BRANDS.find(([b]) => new RegExp(`(^|[^a-z])${esc(b.toLowerCase())}([^a-z]|$)`).test(raw));
// كل البنود المطابقة للدواء (الأدوية المركبة قد تطابق أكثر من بند)
export function findAllSafety(drug) {
  const raw = String(drug || "").toLowerCase();
  if (!raw.trim()) return [];
  const br = brandOf(raw);
  const d = norm(br ? `${drug} ${br[1]}` : drug);
  const topical = TOPICAL.test(d);
  return SAFETY.filter((e) => !(e.sys && topical) && e.k.some((k) => d.includes(norm(k))));
}
export function findSafety(drug) { return findAllSafety(drug)[0] || null; }
// كلمات التحسس الشائعة لكل زمرة
const ALLERGY_WORDS = {
  penicillin: ["بنسلين", "penicillin", "اموكس", "amoxi", "اوغمنتين", "augmentin"],
  cephalosporin: ["سيفالو", "cephalo", "سيفا"],
  nsaid: ["بروفين", "ibuprofen", "اسبرين", "aspirin", "مضادات الالتهاب", "nsaid", "ديكلوفيناك", "diclofenac"],
  sulfa: ["سلفا", "sulfa", "سبترين", "septrin"],
  macrolide: ["ماكروليد", "macrolide", "ازيثرو", "azithro", "كلاريثرو", "clarithro", "اريثرو", "erythro"],
  quinolone: ["كينولون", "quinolone", "سيبروفلوكساسين", "ciprofloxacin"],
  tetracycline: ["تتراسكلين", "تتراسيكلين", "tetracycline", "دوكسي"],
  azole: ["فلوكونازول", "fluconazole"],
  opioid: ["كودئين", "codeine", "ترامادول", "tramadol", "مورفين"],
  acei: [],
};
// يعيد التنبيهات لدواء معين حسب حالات المريض
const RANK = { ok: 0, care: 1, no: 2 };
const PEN = ["بنسلين", "penicillin", "اموكس", "amoxi", "اوغمنتين", "augmentin"];
export function drugWarnings(drug, flags = {}, allergies = "") {
  const out = [];
  const all = findAllSafety(drug);
  const al = norm(allergies);
  if (al.trim()) {
    const words = all.flatMap((e) => [...e.k, ...(ALLERGY_WORDS[e.cls] || [])]);
    if (words.some((w) => w && al.includes(norm(w)))) out.push({ level: "no", text: `المريض لديه حساسية مسجلة: ${allergies}` });
    else if (all.some((e) => e.cls === "cephalosporin") && PEN.some((w) => al.includes(norm(w)))) out.push({ level: "care", text: "تحسس من البنسلين: احتمال تحسس متصالب مع السيفالوسبورينات، ويُتجنب عند سوابق التأق" });
  }
  for (const [c, label] of CONDS) {
    if (!flags[c]) continue;
    const bad = all.filter((e) => e[c][0] !== "ok").sort((a, b) => RANK[b[c][0]] - RANK[a[c][0]]);
    if (!bad.length) continue;
    const lv = bad[0][c][0], notes = [...new Set(bad.map((e) => e[c][1]).filter(Boolean))].join(" · ");
    out.push({ level: lv, text: `${label} (${LEVEL[lv][0]})${notes ? `: ${notes}` : ""}` });
  }
  return out;
}
