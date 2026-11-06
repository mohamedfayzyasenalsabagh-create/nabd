# موسيقى ومؤثرات احترافية مولّدة لريلات الكتابة المتحركة (afro/deep house 122bpm) مع ضربات متزامنة مع الأحداث
# الاستخدام: python3 mus2.py events.json out.wav  — events: {"bpm":122,"total":s,"stamps":[t..],"pops":[t..],"riser":[t0,t1],"drop":t,"whoosh":[t..],"end":t}
import sys, json, wave, numpy as np
SR=44100
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def osc(f,n,kind="sin",ph=0):
    t=np.arange(n)/SR
    if kind=="sin": return np.sin(2*np.pi*f*t+ph)
    if kind=="saw": return sum(np.sin(2*np.pi*f*k*t)/k for k in range(1,9))*.6
    if kind=="tri": return 2/np.pi*np.arcsin(np.sin(2*np.pi*f*t))
def mtof(m): return 440*2**((m-69)/12)
def lp(x,a):  # one-pole lowpass, a in 0..1 (smaller = darker)
    y=np.zeros_like(x); s=0.0
    for i in range(len(x)): s+=a*(x[i]-s); y[i]=s
    return y
def lpf(x,cut):  # fast FFT lowpass
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/cut)**4); return np.fft.irfft(X,len(x))
def hpf(x,cut):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/cut)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=1.6,mix=.25):
    n=int(dec*SR); ir=np.random.randn(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,6000); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]
    return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def kick():
    n=int(.45*SR); t=np.arange(n)/SR; f=45+110*np.exp(-t/.035); x=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.22)
    x[:int(.004*SR)]+=np.random.randn(int(.004*SR))*.5; return np.tanh(x*1.6)
def clap():
    n=int(.3*SR); x=np.random.randn(n); e=np.zeros(n)
    for d in (0,.011,.022): e+=env(n,.0005,.012)*(np.arange(n)>=d*SR)
    e+=env(n,.001,.09)*.6; return hpf(x*e,900)*.7
def hat(o=False): n=int((.22 if o else .06)*SR); return hpf(np.random.randn(n),7000)*env(n,.0005,.07 if o else .018)
def shaker(): n=int(.08*SR); return hpf(np.random.randn(n),5000)*env(n,.01,.025)*.6
def stamp():
    n=int(.6*SR); t=np.arange(n)/SR; low=np.sin(2*np.pi*np.cumsum(70+60*np.exp(-t/.05))/SR)*np.exp(-t/.25)
    noise=lpf(np.random.randn(n),2500)*env(n,.001,.06); return np.tanh((low*1.2+noise*.8)*1.5)
def pop(m=84):
    n=int(.18*SR); t=np.arange(n)/SR; f=mtof(m)*(1+.6*np.exp(-t/.01)); return np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,.001,.05)*.6
def riser(d):
    n=int(d*SR); t=np.arange(n)/SR; x=np.random.randn(n); c=np.linspace(400,9000,n)
    y=np.zeros(n); blk=2048
    for i in range(0,n,blk): y[i:i+blk]=lpf(x[i:i+blk],c[i])  # sweep
    tone=osc(1,n)*0; f=200*2**(t/d*2); tone=np.sin(2*np.pi*np.cumsum(f)/SR)*.3
    return (y*.5+tone)*(t/d)**2
def impact():
    n=int(2.2*SR); t=np.arange(n)/SR; sub=np.sin(2*np.pi*np.cumsum(55*np.exp(-t/.8)+30)/SR)*np.exp(-t/.7)
    boom=lpf(np.random.randn(n),1200)*np.exp(-t/.35); return reverb(np.tanh((sub*1.3+boom*.7)*1.4),2.5,.35)
def whoosh():
    n=int(.55*SR); t=np.arange(n)/SR; x=np.random.randn(n); e=np.sin(np.pi*t/t[-1])**2
    return hpf(lpf(x,4500),300)*e*.5
def pluck(m,d):
    n=int(d*SR); x=osc(mtof(m),n,"saw")*env(n,.002,.16); return lpf(x,2600)*.5
def chord(ms,d):
    n=int(d*SR); x=sum(osc(mtof(m),n,"saw")+osc(mtof(m)*1.006,n,"saw") for m in ms)/len(ms)
    return lpf(x,1400)*env(n,.03,d*.6)*.35
def sub(m,d): n=int(d*SR); return osc(mtof(m),n,"sin")*env(n,.005,d*.7)
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.5)*SR)
    D=np.zeros(N); BS=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    drop=E["drop"]; end=E["end"]
    prog=[[57,60,64,67],[53,57,60,64],[55,59,62,65],[52,55,59,62]]  # Am7 Fmaj7 G7 Em7
    beats=int(T/b)+1
    for k in range(beats):
        t=k*b; pre=t<drop
        bar=(k//4); ch=prog[bar%4]
        if pre:
            if k%2==0: add(D,kick(),t,.45)
            add(D,hat(),t+b/2,.35)
            if k%4==0: add(M,lpf(chord(ch,4*b),700),t,.7)
        else:
            add(D,kick(),t,1.0)
            if k%2==1: add(D,clap(),t,.8)
            add(D,hat(True),t+b/2,.45)
            for s in (0.25,.75): add(D,shaker(),t+s*b,.7)
            if k%4==0: add(M,chord(ch,4*b),t,1)
            # بيس مقطّع (afro)
            for off,dur in ((0,.4),(.75,.2),(1.5,.4)):
                if k%2==0: add(BS,sub(ch[0]-24,dur*b),t+off*b,.9)
            # لحن بلَك مع ديلاي
            pat=[0,2,1,3,2,0,3,1]
            for h in (0,.5):
                if np.random.rand()<.7: add(M,pluck(ch[pat[(k*2+int(h*2))%8]]+12,.5*b),t+h*b,.55)
    # ضغط جانبي على الموسيقى والبيس
    sc=np.ones(N)
    for k in range(beats):
        t=k*b
        if t>=drop or k%2==0:
            i=int(t*SR); n=int(.3*SR); seg=1-.75*np.exp(-np.arange(n)/SR/.09); j=min(N,i+n); sc[i:j]=np.minimum(sc[i:j],seg[:j-i])
    M=reverb(M,1.8,.3); dl=int(b*.75*SR); M[dl:]+=M[:-dl]*.25
    mix=D*.9+BS*sc*.8+M*sc*.8
    # مؤثرات متزامنة
    for t in E.get("pops",[]): add(FX,pop(84+int(np.random.rand()*5)),t,.5)
    for t in E.get("stamps",[]): add(FX,stamp(),t,.9)
    r0,r1=E["riser"]; add(FX,riser(r1-r0),r0,.8)
    add(FX,impact(),drop,1.1)
    for t in E.get("whoosh",[]): add(FX,whoosh(),t-.25,.9)
    add(FX,impact()*.6,end,.7)
    x=mix+FX
    # سكون قبل الضربة مباشرة
    gap=int(.12*SR); i=int(drop*SR)-gap; x[i:i+gap]*=np.linspace(1,0.05,gap)
    fo=int(1.5*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.1); x=x/np.max(np.abs(x))*.89
    return x
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    l=x; r=np.roll(x,int(.008*SR))*.97; st=np.stack([l,r],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
