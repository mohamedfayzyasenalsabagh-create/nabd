# تبديل الاختصاص وقت التشغيل: جلدية
SW=[("عيادة الابتسامة لطب الأسنان","عيادة النضارة للجلدية والتجميل"),("اختصاصي تجميل وتقويم الأسنان","اختصاصي الأمراض الجلدية والتجميل"),
('specialty: "dental", modules: ["dental"]','specialty: "derm", modules: ["cosm"]'),
('"معالجة لبية"','"تقشير كيميائي"'),('"حشوة"','"جلسة ليزر"'),('"تنظيف"','"تنظيف بشرة"'),('"قلع"','"إزالة شامة"'),('"تبييض"','"حقن فيلر"'),
("ألم في السن الأمامي","حبوب في الوجه"),("كسر سن","حب الشباب"),("تراكم جير","كلف"),("تنظيف دوري","تنظيف بشرة دوري"),
('const VERSION = "8-"','const VERSION = "9d-"')]
src=open("/home/claude/nabd/demo/seed.js",encoding="utf-8").read()
for a,b in SW:
    assert a in src,a; src=src.replace(a,b)
async def seed(route): await route.fulfill(body=src,content_type="application/javascript")
await pg.route("**/demo/seed.js",seed)
