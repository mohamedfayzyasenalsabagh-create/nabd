# مشغّل اختبارات النسخة التجريبية محلياً: يشغّل خادماً على 8799 ويوجّه الخطوط، ثم ينفّذ السكربت المعطى (متغيرات: pg, B, OUT, ctx)
import asyncio, subprocess, sys, time, os, re
from playwright.async_api import async_playwright
OUT=os.path.abspath("dm"); errs=[]
REPO=os.environ.get("NABD","/home/claude/nabd")
async def main():
    srv=subprocess.Popen([sys.executable,"-m","http.server","8799","-d",REPO],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
    async with async_playwright() as p:
        exe="/opt/google/chrome/chrome" if os.path.exists("/opt/google/chrome/chrome") else None
        b=await p.chromium.launch(executable_path=exe,args=["--no-sandbox"]) if exe else await p.chromium.launch()
        ctx=await b.new_context(viewport={"width":390,"height":844},device_scale_factor=2,locale="ar")
        pg=await ctx.new_page()
        pg.on("pageerror",lambda e: errs.append(str(e)))
        pg.on("console",lambda m: errs.append("console:"+m.text) if m.type=="error" and "favicon" not in m.text else None)
        async def fonts(route):
            if "css2" in route.request.url: await route.fulfill(path=os.path.abspath("nfonts.css"),content_type="text/css")
            else: await route.abort()
        await pg.route(re.compile(r"https://fonts\..*"),fonts)
        await pg.route("**/fnt/*",lambda r: r.fulfill(path=os.path.join(os.path.abspath("fntfiles"),r.request.url.split("/")[-1]),content_type="font/woff2",headers={"Access-Control-Allow-Origin":"*"}))
        B="http://localhost:8799/"
        g=dict(pg=pg,B=B,OUT=OUT,ctx=ctx)
        code=open(sys.argv[1]).read()
        exec("async def __run():\n"+"\n".join("    "+l for l in code.splitlines()),g)
        await g["__run"]()
        await b.close()
    srv.terminate()
asyncio.run(main()); print(errs or "no errors")
