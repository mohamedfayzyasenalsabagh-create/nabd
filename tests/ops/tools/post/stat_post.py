# منشور أرقام داكن فخم 1080x1350: python3 compare_post.py config.json out.jpg (الخطوط من fntfiles بجانب السكربت أو FNT)
import sys, json, os, base64, asyncio
from playwright.async_api import async_playwright
C=json.load(open(sys.argv[1])); OUT=sys.argv[2]
F=os.environ.get("FNT") or os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","fntfiles")
def fnt(n): return "data:font/woff2;base64,"+base64.b64encode(open(os.path.join(F,n),"rb").read()).decode()
rows="".join(f'<div class="st"><div class="n">{n}</div><div class="t">{t}</div></div>' for n,t in C["stats"])
html=f'''<html dir="rtl"><style>
@font-face{{font-family:P;src:url({fnt("ibm-plex-sans-arabic-arabic-700-normal.woff2")});font-weight:700}}
@font-face{{font-family:P;src:url({fnt("ibm-plex-sans-arabic-arabic-500-normal.woff2")});font-weight:500}}
@font-face{{font-family:P;src:url({fnt("ibm-plex-sans-arabic-latin-700-normal.woff2")});font-weight:700;unicode-range:U+0000-00FF}}
@font-face{{font-family:P;src:url({fnt("ibm-plex-sans-arabic-latin-500-normal.woff2")});font-weight:500;unicode-range:U+0000-00FF}}
@font-face{{font-family:K;src:url({fnt("reem-kufi-arabic-600-normal.woff2")})}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1080px;height:1350px;font-family:P;color:#fff;background:radial-gradient(900px 700px at 70% 20%,#0f3a37,#061615 70%);padding:80px 70px;position:relative;overflow:hidden}}
h1{{font-size:{C.get("title_size",78)}px;line-height:1.2;font-weight:700}} h1 em{{font-style:normal;color:#5eead4}}
.hd{{display:flex;gap:24px;margin:60px 0 18px}} .hd div{{flex:1;font-size:36px;font-weight:700;text-align:center;padding:14px;border-radius:20px}}
.hd .o{{background:rgba(255,77,79,.14);color:#ff8a8c}} .hd .n{{background:rgba(94,234,212,.14);color:#5eead4}}
.row{{display:flex;gap:24px;margin-bottom:18px}} .row>div{{flex:1;font-size:33px;font-weight:500;line-height:1.35;padding:24px 26px;border-radius:24px;display:flex;gap:16px;align-items:flex-start}}
.old{{background:rgba(255,255,255,.05);color:#b9c7c6;border:1px solid rgba(255,255,255,.08)}} .new{{background:rgba(20,184,166,.16);border:1px solid rgba(94,234,212,.35)}}
i{{font-style:normal;font-weight:700;flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:26px}} .old i{{background:rgba(255,77,79,.2);color:#ff6b6d}} .new i{{background:#14b8a6;color:#fff}}
.ft{{position:absolute;left:70px;right:70px;bottom:60px;display:flex;align-items:center;justify-content:space-between;font-size:34px;font-weight:700}}
.mk{{display:flex;align-items:center;gap:16px}} .mk b{{width:70px;height:70px;border-radius:20px;background:linear-gradient(135deg,#14b8a6,#0d6b66);display:grid;place-items:center}}
.ft span.u{{color:#9fe3da;direction:ltr}} .tag{{color:#ffd166;font-size:30px}}
.grid{{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:60px}} .st{{background:rgba(20,184,166,.12);border:1px solid rgba(94,234,212,.3);border-radius:30px;padding:28px 30px;min-height:220px}}
.st .n{{font-size:110px;font-weight:700;color:#5eead4;line-height:1;direction:ltr;text-align:right}} .st .t{{font-size:34px;font-weight:500;margin-top:18px;line-height:1.35;color:#e6f7f5}}
</style><body><h1>{C["title"]}</h1>
<div class="grid">{rows}</div>
<div class="ft"><div class="mk"><b><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h4l2.5-6 4 12 3-9 2 3h4.5"/></svg></b><div>مع نبض عيادتكم صارت أسهل<div class="tag">🎁 مجاناً 14 يوماً</div></div></div><span class="u">nabd.sy</span></div>
</body></html>'''
async def m():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":1080,"height":1350})
        await pg.set_content(html); await pg.wait_for_timeout(700); await pg.screenshot(path=OUT,type="jpeg",quality=92); await b.close()
asyncio.run(m()); print("ok",OUT)
