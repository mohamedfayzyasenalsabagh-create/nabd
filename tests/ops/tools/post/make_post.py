# صانع منشور نبض 1080x1350 من ملف إعداد JSON. الاستخدام: python3 make_post.py cfg.json out.jpg
# cfg: {"bg":["#fff8ee","#fdeee4"],"glow":"#ffd8cf","ink":"#08403d","accent":"#ff6b5b","eyebrow":"...","eyebrow_bg":"#ffe1db","eyebrow_fg":"#c2412f",
#       "title":"سطر أول<br><em>سطر ثانٍ</em>","shot":"/path/screen.png","phone_side":"left|right","calls":[["🔔","عنوان","وصف"],...],"dark":false}
# الخطوط من مجلد الأدوات (fntfiles) الذي يجهّزه setup.sh. الشريط السفلي ثابت: «مع نبض عيادتكم صارت أسهل · nabd.sy».
import json, sys, os, asyncio, base64
from playwright.async_api import async_playwright
cfg = json.load(open(sys.argv[1])); out = sys.argv[2]
F = os.path.abspath(cfg.get("fonts", "fntfiles"))
def b64(p): return "data:image/png;base64," + base64.b64encode(open(p, "rb").read()).decode()
bg1, bg2 = cfg.get("bg", ["#eef9fb", "#dff2f0"]); ink = cfg.get("ink", "#08403d"); acc = cfg.get("accent", "#0d9488")
dark = cfg.get("dark", False); side = cfg.get("phone_side", "left")
fg = "#fff" if dark else ink
phone_left = 70 if side == "left" else 560
calls_right = side == "left"
calls = "".join(f'''<div class="call" style="top:{560 + i * 200}px;{'right:70px' if calls_right else 'right:600px'}"><span class="i" style="background:{cfg.get('call_bg', '#e3f6f3')}">{c[0]}</span><div>{c[1]}<small>{c[2]}</small></div></div>''' for i, c in enumerate(cfg.get("calls", [])[:3]))
shot = f'<div class="ph" style="left:{phone_left}px;top:470px;transform:rotate({-4 if side == "left" else 4}deg)"><div class="in"><img src="{b64(cfg["shot"])}"></div></div>' if cfg.get("shot") else ""
html = f'''<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
@font-face{{font-family:Plex;src:url(file://{F}/ibm-plex-sans-arabic-arabic-500-normal.woff2);font-weight:500}}
@font-face{{font-family:Plex;src:url(file://{F}/ibm-plex-sans-arabic-arabic-700-normal.woff2);font-weight:700}}
@font-face{{font-family:Plex;src:url(file://{F}/ibm-plex-sans-arabic-latin-700-normal.woff2);font-weight:700;unicode-range:U+0000-00FF}}
@font-face{{font-family:Plex;src:url(file://{F}/ibm-plex-sans-arabic-latin-500-normal.woff2);font-weight:500;unicode-range:U+0000-00FF}}
@font-face{{font-family:Kufi;src:url(file://{F}/reem-kufi-arabic-600-normal.woff2);font-weight:600}}
*{{margin:0;padding:0;box-sizing:border-box}} body{{width:1080px;height:1350px;overflow:hidden;font-family:Plex,sans-serif}}
.p{{width:1080px;height:1350px;position:relative;overflow:hidden;isolation:isolate;background:{"radial-gradient(100% 80% at 70% 20%,#0f5f58 0%,#061e1c 60%,#031413 100%)" if dark else f"linear-gradient(180deg,{bg1},{bg2})"}}}
.glow{{position:absolute;border-radius:50%;filter:blur(90px);z-index:-1;width:650px;height:650px;top:-220px;left:-220px;opacity:.6;background:{cfg.get("glow", "#9ee6dc")}}}
.logo{{position:absolute;top:52px;right:70px;display:flex;align-items:center;gap:14px;font-family:Kufi;font-weight:600;font-size:46px;color:{fg}}}
.mk{{width:66px;height:66px;border-radius:20px;background:linear-gradient(135deg,#14b8a6,#0d6b66);display:grid;place-items:center;box-shadow:0 10px 22px rgba(13,107,102,.3)}}
.ey{{position:absolute;top:58px;left:70px;font-weight:700;font-size:27px;padding:9px 22px;border-radius:99px;background:{cfg.get("eyebrow_bg", "#d7f2ef")};color:{cfg.get("eyebrow_fg", "#0d6b66")}}}
h1{{position:absolute;top:170px;right:70px;left:70px;font-size:{cfg.get("title_size", 76)}px;line-height:1.2;font-weight:700;color:{fg}}} h1 em{{font-style:normal;color:{acc}}}
.sub{{position:absolute;top:400px;right:70px;left:70px;font-size:34px;line-height:1.5;color:{"rgba(255,255,255,.82)" if dark else "#3d5856"}}}
.ph{{position:absolute;width:430px;border-radius:52px;background:#0b0f10;padding:12px;box-shadow:0 40px 70px rgba(0,0,0,.35),inset 0 0 0 2px #3a4042}}
.ph .in{{border-radius:42px;overflow:hidden;background:#fff}} .ph img{{width:100%;display:block}}
.call{{position:absolute;background:#fff;color:#08403d;border-radius:26px;padding:18px 24px;font-size:28px;font-weight:700;box-shadow:0 20px 40px rgba(0,0,0,.18);display:flex;gap:14px;align-items:center;max-width:470px;line-height:1.35}}
.call .i{{flex:none;width:56px;height:56px;border-radius:18px;display:grid;place-items:center;font-size:30px}} .call small{{display:block;font-weight:500;font-size:22px;color:#5d6b6a}}
.foot{{position:absolute;z-index:5;left:0;right:0;bottom:0;height:96px;display:flex;align-items:center;justify-content:space-between;padding:0 70px;font-weight:700;font-size:32px;background:{"rgba(255,255,255,.06)" if dark else ink};color:{"#ffd166" if dark else "#fff"}}}
.foot .u{{direction:ltr}} {cfg.get("css", "")}
</style></head><body><div class="p"><i class="glow"></i>
<div class="logo"><span class="mk"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h4l2.5-6 4 12 3-9 2 3h4.5"/></svg></span>نبض</div>
{f'<span class="ey">{cfg["eyebrow"]}</span>' if cfg.get("eyebrow") else ""}
<h1>{cfg["title"]}</h1>{f'<p class="sub">{cfg["sub"]}</p>' if cfg.get("sub") else ""}
{cfg.get("extra", "")}{shot}{calls}
<div class="foot"><span>مع نبض عيادتكم صارت أسهل</span><span class="u">nabd.sy</span></div></div></body></html>'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1080, "height": 1350})
        await pg.set_content(html); await pg.wait_for_timeout(900)
        await pg.screenshot(path=out, type="jpeg", quality=93); await b.close()
asyncio.run(main()); print("saved", out)
