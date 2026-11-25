# موسيقى «تراب» مولّدة لريل الساعة الذكية (140bpm بإحساس نصف سرعة): 808 منزلق، هاي هات برشقات ثلاثية، سنير/كلاب على الضربة 3، بيل ولحن قاتم
# مؤثرات متزامنة: «بيب» ساعة لكل جلسة تمتلئ، «بِنغ» لكل نقطة ألم (تعلو النغمة كلما نقص الألم)، «سوايب» لكل تمرين، وارتطام عند الشعار
# الاستخدام: python3 mus17.py events.json out.wav   (events من window.EVENTS في watch.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(131)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=1.8,mix=.2):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,6000); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def b808(m,d,glide=None):
    n=int(d*SR); t=np.arange(n)/SR; f=np.full(n,mtof(m))
    if glide is not None: f=mtof(m)+(mtof(glide)-mtof(m))*np.clip((t-d*.6)/(d*.3),0,1)
    x=np.sin(2*np.pi*np.cumsum(f)/SR); x[:200]+=np.sin(2*np.pi*np.cumsum(np.full(200,180.))/SR)*np.linspace(1,0,200)
    return np.tanh(x*2.4)*np.minimum(1,t/.004)*np.exp(-t/(d*.9))*.6
def kick(): n=int(.2*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*np.cumsum(60+140*np.exp(-t/.015))/SR)*np.exp(-t/.06)*.5
def clap():
    n=int(.3*SR); x=rng.standard_normal(n); e=np.zeros(n)
    for d in (0,.01,.02): e+=env(n,.0005,.008)*(np.arange(n)>=d*SR)
    e+=env(n,.001,.12)*.7; return hpf(lpf(x*e,9000),1100)*.65
def hat(g=1): n=int(.04*SR); return hpf(rng.standard_normal(n),9000)*env(n,.0004,.01)*.3*g
def bell(m,d=.8):
    n=int(d*SR); t=np.arange(n)/SR; f=mtof(m); return (np.sin(2*np.pi*f*t)+.5*np.sin(2*np.pi*f*3.01*t)*np.exp(-t/.15))*env(n,.002,.35)*.16
def pad(ms,d):
    n=int(d*SR); t=np.arange(n)/SR; x=sum(np.sin(2*np.pi*mtof(m)*(1+.002*s)*t) for m in ms for s in (-1,1))
    return lpf(x/len(ms),1200)*np.minimum(1,t/.5)*np.minimum(1,(d-t)/.4)*.06
def beep(): n=int(.12*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*2000*t)*(t<.07)*np.exp(-t/.05)*.3
def ping(m): n=int(.6*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*mtof(m)*t)*env(n,.002,.2)*.3
def swipe(): n=int(.3*SR); t=np.arange(n)/SR; x=hpf(lpf(rng.standard_normal(n),6000),1500)*np.sin(np.pi*t/t[-1])**2; return x*.35
def impact(): n=int(1.6*SR); t=np.arange(n)/SR; x=np.sin(2*np.pi*np.cumsum(40+80*np.exp(-t/.08))/SR)*np.exp(-t/.6)+lpf(rng.standard_normal(n),1500)*np.exp(-t/.15)*.4; return np.tanh(x*1.4)*.7
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.4)*SR)
    D=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    rg,lg=E["rings"],E["logo"]
    prog=[(37,[61,64,68]),(33,[57,61,64]),(35,[59,62,66]),(32,[56,59,64])]  # C#m A Bm G#
    bellm=[73,76,80,76,73,None,71,73]
    bar=4*b; nbar=int(T/bar)+1
    for B4 in range(nbar):
        t0=B4*bar; root,ch=prog[B4%4]
        if t0>=lg+bar: break
        add(M,pad([m+12 for m in ch],bar),t0,1)
        if t0<rg:
            for k in range(8): add(M,bell(bellm[k] if bellm[k] else 73),t0+k*b/2,.5 if bellm[k] else 0)
            continue
        add(D,kick(),t0,1); add(D,kick(),t0+1.75*b,.7); add(D,kick(),t0+2.5*b,.6)
        add(D,clap(),t0+2*b,1)
        add(M,b808(root-12,1.7*b),t0,1); add(M,b808(root-12,1.2*b,root-7),t0+2.5*b,.9)
        for k in range(16):
            t=t0+k*b/4
            if k in (6,14) and B4%2==1:
                for r in range(3): add(D,hat(.8),t+r*b/12,1)
            elif k%2==0 or k in (11,15): add(D,hat(1 if k%4==0 else .6),t,1)
        for k in range(8):
            m=bellm[k]
            if m: add(M,bell(m),t0+k*b/2,.8)
    for t in E["sessions"]: add(FX,beep(),t,1)
    for i,t in enumerate(E["dots"]): add(FX,ping(76+i*2),t,1)
    for t in E["exs"]: add(FX,swipe(),t,1)
    add(FX,impact(),lg,1); add(M,bell(85,1.5),lg+.2,1.5)
    x=D*.85+reverb(M,1.6,.2)*.95+FX
    fo=int(1.8*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.1); return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.011*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
