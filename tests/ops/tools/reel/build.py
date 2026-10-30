# بناء ريل نبض: python3 build.py WORKDIR OUT.mp4 [MUSIC_STYLE]
# WORKDIR يحوي cfg.js واللقطات (المسارات في cfg نسبية إليه). ينسخ المحرك والخطوط ويولّد QR والموسيقى.
import sys, os, shutil, subprocess, asyncio, glob
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); W=os.path.abspath(sys.argv[1]); OUT=os.path.abspath(sys.argv[2]); MS=int(sys.argv[3]) if len(sys.argv)>3 else 5
FPS=30
for f in ("scene.html","props.js"): shutil.copy(os.path.join(HERE,f),W)
fnt=os.environ.get("FNT") or os.path.join(os.path.dirname(W),"fntfiles")
if not os.path.exists(os.path.join(W,"fntfiles")): os.symlink(fnt,os.path.join(W,"fntfiles"))
if not os.path.exists(os.path.join(W,"qr.png")):
    import qrcode; qrcode.make("https://nabd.sy/app.html",border=1).save(os.path.join(W,"qr.png"))
FR=os.path.join(W,"frames"); shutil.rmtree(FR,ignore_errors=True); os.makedirs(FR)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--no-sandbox","--allow-file-access-from-files"])
        pg=await b.new_page(viewport={"width":1080,"height":1920})
        errs=[]; pg.on("pageerror",lambda e: errs.append(str(e)))
        await pg.goto("file://"+W+"/scene.html"); await pg.wait_for_timeout(1500)
        await pg.evaluate("document.fonts.ready")
        total=await pg.evaluate("TOTAL"); n=int(total*FPS)
        for i in range(n):
            await pg.evaluate(f"render({i/FPS})")
            if i==0: await pg.wait_for_timeout(500)
            await pg.screenshot(path=f"{FR}/f{i:05d}.jpg",type="jpeg",quality=88)
        await b.close()
        if errs: print("ERRORS",errs)
        return total
total=asyncio.run(main())
wav=os.path.join(W,"music.wav")
subprocess.run([sys.executable,os.path.join(HERE,"mus.py"),str(MS),str(total),wav],check=True)
subprocess.run(["ffmpeg","-y","-loglevel","error","-framerate",str(FPS),"-i",f"{FR}/f%05d.jpg","-i",wav,"-c:v","libx264","-pix_fmt","yuv420p","-crf","22","-preset","medium","-c:a","aac","-b:a","160k","-af","volume=-1.5dB","-shortest","-movflags","+faststart",OUT],check=True)
print("done",OUT,round(total,1),"s",round(os.path.getsize(OUT)/1e6,1),"MB")
