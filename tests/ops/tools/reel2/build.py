# بناء ريل بأسلوب الكتابة المتحركة: python3 build.py WORKDIR OUT.mp4 MUSIC_STYLE
import sys, os, shutil, subprocess, asyncio
from playwright.async_api import async_playwright
H=os.path.dirname(os.path.abspath(__file__)); W=os.path.abspath(sys.argv[1]); OUT=os.path.abspath(sys.argv[2]); MS=sys.argv[3] if len(sys.argv)>3 else "none"  # none = دون موسيقى (المستخدم يضيف صوتاً رائجاً)
shutil.copy(H+"/kinetic.html",W)
fnt=os.environ.get("FNT"); 
if not os.path.exists(W+"/fntfiles"): os.symlink(fnt,W+"/fntfiles")
FR=W+"/frames"; shutil.rmtree(FR,ignore_errors=True); os.makedirs(FR)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--allow-file-access-from-files"]); pg=await b.new_page(viewport={"width":1080,"height":1920})
        errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("file://"+W+"/kinetic.html"); await pg.wait_for_timeout(1500); await pg.evaluate("document.fonts.ready")
        T=await pg.evaluate("TOTAL"); n=int(T*30)
        for i in range(n):
            await pg.evaluate(f"render({i/30})"); await pg.screenshot(path=f"{FR}/f{i:05d}.jpg",type="jpeg",quality=90)
        await b.close(); print("errs",errs); return T
T=asyncio.run(main())
if MS=="none":
    subprocess.run(["ffmpeg","-y","-loglevel","error","-framerate","30","-i",FR+"/f%05d.jpg","-f","lavfi","-t",str(T),"-i","anullsrc=r=44100:cl=stereo","-c:v","libx264","-pix_fmt","yuv420p","-crf","20","-preset","medium","-c:a","aac","-shortest","-movflags","+faststart",OUT],check=True); print("done",OUT,round(T,1)); sys.exit()
wav=W+"/music.wav"; subprocess.run([sys.executable,H+"/../reel/mus.py",MS,str(T),wav],check=True)
subprocess.run(["ffmpeg","-y","-loglevel","error","-framerate","30","-i",FR+"/f%05d.jpg","-i",wav,"-c:v","libx264","-pix_fmt","yuv420p","-crf","20","-preset","medium","-c:a","aac","-b:a","160k","-af","volume=-4dB","-shortest","-movflags","+faststart",OUT],check=True)
print("done",OUT,round(T,1))
