# لقطة شاشة من النسخة التجريبية للمنشورات والريلات: عدّل المتغيرات ROLE/HASH/NAME ثم شغّل عبر dm_t.py
import os
ROLE=os.environ.get("ROLE","doctor"); HASH=os.environ.get("HASH","#/"); NAME=os.environ.get("NAME","shot")
css=".demo-bar,.demo-banner{display:none!important}"
await pg.goto(B+f"demo/?as={ROLE}&s={NAME}"); await pg.wait_for_timeout(4000); await pg.add_style_tag(content=css)
if HASH!="#/": await pg.evaluate(f"location.hash={HASH!r}"); await pg.wait_for_timeout(2500); await pg.add_style_tag(content=css)
os.makedirs("shots",exist_ok=True); await pg.screenshot(path=f"shots/{NAME}.png"); print("shot", NAME)
