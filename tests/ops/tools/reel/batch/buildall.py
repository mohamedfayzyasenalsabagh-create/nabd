import os, json, shutil, subprocess, sys
S=os.path.dirname(os.path.abspath(__file__))+"/.."
exec(open(S+"/R/reels.py").read())
CH_DIR="/home/claude/nabd/tests/ops/tools/reel/chars"
only=[int(x) for x in sys.argv[1:]] or None
for r in R:
    if only and r["n"] not in only: continue
    W=f"{S}/r10/m{r['n']}"; os.makedirs(W,exist_ok=True)
    src,w,h=CH[r["ch"]]; shutil.copy(f"{CH_DIR}/{src}",W)
    imgs=set(s[0] for s in r["steps"])
    for i in imgs: shutil.copy(f"{S}/shots/{i}.png",W)
    cap,extra,bubs=r["hook"]
    hook=dict(dur=4.2,cap=cap,extra=extra,extraTop=520 if not extra.count("<b>")>1 else 470,cx=800 if r["ch"]=="hijab" else 790,cs=.95,
              bubbles=[dict(at=.4,t=bubs[0],x=60,y=1100,w=460,tl="85%"),dict(at=2.3,t=bubs[1],x=60,y=1100,w=460,tl="85%")])
    if r.get("papers"): hook["papers"]=True
    steps=[]
    for k,(img,c,ring,tap,bub) in enumerate(r["steps"]):
        st=dict(dur=3.0 if not tap else 3.1,img=img+".png",cap=c,ring=ring,bub=bub,bubY=1000 if k%2==0 else 960)
        if tap: st["tap"]=tap
        steps.append(st)
    qc,qx,qb=r["q"]
    q=dict(dur=3.6,cap=qc,extra=qx,extraTop=560 if qx.count("<b>")<=1 else 600,cx=hook["cx"],cs=.95,bub=dict(t=qb,x=60,y=1170,w=420,tl="85%"))
    if qx.count("<b>")>1: q["bub"]["y"]=1230
    cfg=dict(b1=r["bg"][0],b2=r["bg"][1],sprite=dict(src=src,w=w,h=h),prop=dict(kind=r["prop"],hook=dict(x=70,y=1540,s=.9),q=dict(x=70,y=1540,s=.9)),hook=hook,steps=steps,q=q,cta=dict(dur=4))
    open(f"{W}/cfg.js","w").write("window.CFG="+json.dumps(cfg,ensure_ascii=False)+";")
    out=f"{S}/r10/m{r['n']}.mp4"
    p=subprocess.run([sys.executable,"/home/claude/nabd/tests/ops/tools/reel/build.py",W,out,str(r["mus"])],env={**os.environ,"FNT":S+"/fntfiles"},capture_output=True,text=True)
    print(r["n"],p.stdout.strip().splitlines()[-1] if p.stdout.strip() else p.stderr[-300:],flush=True)
