# باني عام للقوالب ذات render(t) و TOTAL و EVENTS: python3 build2.py TEMPLATE.html WORKDIR OUT.mp4 MUSIC.py [preview t1,t2,..]
import sys, os, shutil, subprocess, asyncio, json
from playwright.async_api import async_playwright
H=os.path.dirname(os.path.abspath(__file__)); TPL=sys.argv[1]; W=os.path.abspath(sys.argv[2]); OUT=os.path.abspath(sys.argv[3]); MUS=sys.argv[4]
PRE=[float(x) for x in sys.argv[5].split(",")] if len(sys.argv)>5 else None
shutil.copy(os.path.join(H,TPL),W+"/t.html")
if not os.path.exists(W+"/fntfiles"): os.symlink(os.environ["FNT"],W+"/fntfiles")
FR=W+"/frames"; shutil.rmtree(FR,ignore_errors=True); os.makedirs(FR)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--allow-file-access-from-files"]); pg=await b.new_page(viewport={"width":1080,"height":1920})
        errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file://"+W+"/t.html"); await pg.wait_for_timeout(1500); await pg.evaluate("document.fonts.ready")
        T=await pg.evaluate("TOTAL"); E=await pg.evaluate("window.EVENTS||{}"); json.dump(E,open(W+"/events.json","w"))
        ts=PRE if PRE else [i/30 for i in range(int(T*30))]
        for i,t in enumerate(ts):
            await pg.evaluate(f"render({t})"); await pg.screenshot(path=f"{FR}/f{i:05d}.jpg",type="jpeg",quality=90)
        await b.close(); print("errs",errs,"T",round(T,2)); return T
T=asyncio.run(main())
if PRE: sys.exit()
wav=W+"/music.wav"; subprocess.run([sys.executable,os.path.join(H,MUS),W+"/events.json",wav],check=True)
subprocess.run(["ffmpeg","-y","-loglevel","error","-framerate","30","-i",FR+"/f%05d.jpg","-i",wav,"-c:v","libx264","-pix_fmt","yuv420p","-crf","20","-preset","medium","-c:a","aac","-b:a","192k","-af","volume=-4dB","-shortest","-movflags","+faststart",OUT],check=True)
print("done",OUT,round(T,1))
