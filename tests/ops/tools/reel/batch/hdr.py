# header: SPEC env selects specialty swap; defines helpers
import os, json
SPEC=os.environ.get("SPEC","dental"); ROLE=os.environ.get("ROLE","doctor")
COMMON=[("تنظيف دوري","مراجعة دورية")]
SPECS={
"peds":("عيادة البراعم لطب الأطفال","اختصاصي طب الأطفال",'specialty: "peds", modules: ["peds"]',["لقاح","معاينة طفل","قياس نمو","رذاذ","فحص سمع"],["حرارة وسعال","التهاب أذن","إسهال"]),
"internal":("عيادة الشفاء للأمراض الداخلية","اختصاصي الأمراض الداخلية",'specialty: "general", modules: ["chronic"]',["تخطيط قلب","استشارة","قياس سكر","تحاليل","إيكو بطن"],["صداع متكرر","ارتفاع ضغط","سكري"]),
"gyn":("عيادة الأمل للنسائية والتوليد","اختصاصية النسائية والتوليد",'specialty: "obgyn", modules: ["preg","gyn","cosm"]',["إيكو حمل","متابعة حمل","مسحة","تنظير","فحص دوري"],["ألم حوض","تأخر دورة","التهاب"]),
"derm":("عيادة النضارة للجلدية والتجميل","اختصاصي الأمراض الجلدية والتجميل",'specialty: "derm", modules: ["cosm"]',["جلسة ليزر","تقشير كيميائي","تنظيف بشرة","إزالة شامة","حقن فيلر"],["حبوب في الوجه","حب الشباب","كلف"]),
"ent":("عيادة السمع لأمراض الأنف والأذن والحنجرة","اختصاصية أمراض الأنف والأذن والحنجرة",'specialty: "ent", modules: []',["غسيل أذن","تنظير أنف","فحص سمع","كي أنف","تخطيط سمع"],["ألم في الأذن","التهاب جيوب","شمع أذن"]),
"cardio":("عيادة النبض للأمراض القلبية","اختصاصية الأمراض القلبية",'specialty: "general", modules: ["chronic"]',["تخطيط قلب","إيكو قلب","قياس ضغط","هولتر","اختبار جهد"],["خفقان","ارتفاع ضغط","ألم صدري"]),
"eye":("عيادة الرؤية لطب العيون","اختصاصي طب العيون",'specialty: "eye", modules: ["eye"]',["فحص نظر","قياس ضغط العين","قاع عين","وصفة نظارة","ليزر"],["ضعف نظر","احمرار عين","جفاف عين"]),
"ortho":("عيادة الحركة للجراحة العظمية","اختصاصي الجراحة العظمية",'specialty: "ortho", modules: ["physio"]',["جلسة علاج فيزيائي","جبيرة","حقن مفصل","فك جبيرة","تصوير شعاعي"],["ألم في الركبة","التواء كاحل","ألم ظهر"]),
"general":("عيادة الرعاية للطب العام","اختصاصي الطب العام",'specialty: "general", modules: ["chronic"]',["استشارة","تخطيط قلب","قياس سكر","تضميد جرح","إبرة وريدية"],["حرارة وسعال","ارتفاع ضغط","سكري"]),
}
src=open("/home/claude/nabd/demo/seed.js",encoding="utf-8").read()
if SPEC!="dental":
    n,t,sp,svc,dg=SPECS[SPEC]
    SW=[("عيادة الابتسامة لطب الأسنان",n),("اختصاصي تجميل وتقويم الأسنان",t),('specialty: "dental", modules: ["dental"]',sp),
        ('"حشوة"',f'"{svc[0]}"'),('"معالجة لبية"',f'"{svc[1]}"'),('"تنظيف"',f'"{svc[2]}"'),('"قلع"',f'"{svc[3]}"'),('"تبييض"',f'"{svc[4]}"'),
        ("ألم في السن الأمامي",dg[0]),("كسر سن",dg[1]),("تراكم جير",dg[2]),("تنظيف دوري","مراجعة دورية"),
        ("التهاب لب سني",dg[1]),("تسوس سني",dg[2]),("التهاب لثة",dg[0]),("سن عقل منطمر",dg[1]),("تصبغات",dg[2]),("حساسية أسنان",dg[0]),
        ("ألم شديد في الضرس السفلي الأيسر",dg[0]),("تسوس عميق في السن 36 مع ألم عند القرع","فحص سريري"),("خطة علاج: معالجة لبية للسن 36 ثم تاج","علاج دوائي ومراجعة"),("تجنب المضغ على الجهة اليسرى حتى انتهاء المعالجة","الالتزام بالدواء"),("تنظيف وتلميع","متابعة"),("استخدم الخيط الطبي يومياً","مراجعة بعد أسبوعين"),
        ('"حشوات كومبوزيت", 6, 10, "سيرنغ"','"شاش معقم", 6, 10, "علبة"'),('"مواد تبييض", 3, 2, "عبوة"','"محاليل", 3, 2, "كيس"'),('"بنج موضعي (Lidocaine)"','"قفازات معقمة"'),
        ("وصفتي بعد التنظيف","وصفتي المعتادة"),("Chlorhexidine 0.12% mouthwash","Omeprazole 20mg"),("Chlorhexidine 0.12%","Omeprazole 20mg"),("مضمضة 15 مل","كبسولة قبل الفطور"),("دقيقة كاملة","قبل الطعام بنصف ساعة"),("بعد القلع","بعد الالتهاب"),
        ('const VERSION = "9-"',f'const VERSION = "x{SPEC}-"')]
    for a,b in SW:
        if a in src: src=src.replace(a,b)
async def seed(route): await route.fulfill(body=src,content_type="application/javascript")
await pg.route("**/demo/seed.js",seed)
css=".demo-bar,.demo-banner{display:none!important}"
os.makedirs("shots",exist_ok=True)
await pg.goto(B+f"demo/?as={ROLE}",wait_until="domcontentloaded"); await pg.wait_for_selector(".stats, .q-row, .pt-home, main",timeout=30000); await pg.wait_for_timeout(2500)
async def go(h,w=2500):
    await pg.evaluate(f"location.hash={h!r}"); await pg.wait_for_timeout(w); await pg.add_style_tag(content=css)
async def shot(name): await pg.add_style_tag(content=css); await pg.screenshot(path=f"shots/{name}.png")
async def box(sel=None,text=None,i=0):
    l=pg.locator(sel) if sel else pg.get_by_text(text,exact=False)
    if text and sel: l=pg.locator(sel,has_text=text)
    try:
        b=await l.nth(i).bounding_box(); return [round(b["x"]),round(b["y"]),round(b["width"]),round(b["height"])] if b else None
    except Exception as e: return None
