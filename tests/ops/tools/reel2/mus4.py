# موسيقى «نيو ديسكو» مولّدة لريل بطاقات السؤال والجواب (118bpm): كيك رباعي، هاي هات مفتوح بين الضربات، بيس أوكتاف، ستابات فانك
# مع مؤثرات متزامنة: «سويش» عند انقلاب البطاقة و«بلينغ» عند ظهور الجواب وصعود قبل الشعار
# الاستخدام: python3 mus4.py events.json out.wav   (events من window.EVENTS في flip.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(11)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=1.4,mix=.2):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,7000); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def saw(f,n): t=np.arange(n)/SR; return sum(np.sin(2*np.pi*f*k*t)/k for k in range(1,12))*.6
def sq(f,n): t=np.arange(n)/SR; return sum(np.sin(2*np.pi*f*k*t)/k for k in range(1,12,2))*.8
def kick():
    n=int(.4*SR); t=np.arange(n)/SR; f=50+140*np.exp(-t/.025); x=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.2)
    x[:150]+=rng.standard_normal(150)*.4; return np.tanh(x*1.7)
def clap():
    n=int(.3*SR); x=rng.standard_normal(n); e=np.zeros(n)
    for d in (0,.009,.018,.027): e+=env(n,.0005,.01)*(np.arange(n)>=d*SR)
    e+=env(n,.001,.11)*.7; return hpf(lpf(x*e,9000),1000)*.7
def ohat(): n=int(.25*SR); return hpf(rng.standard_normal(n),7500)*env(n,.002,.08)*.45
def chat(): n=int(.05*SR); return hpf(rng.standard_normal(n),9000)*env(n,.0005,.012)*.4
def bass(m,d): n=int(d*SR); return lpf(saw(mtof(m),n),1100)*env(n,.003,d*.5)*.7
def stab(ms,d):
    n=int(d*SR); x=sum(saw(mtof(m),n)+saw(mtof(m)*1.007,n) for m in ms)/len(ms)
    return lpf(x,3000)*env(n,.003,.12)*.32
def swish():
    n=int(.45*SR); t=np.arange(n)/SR; x=rng.standard_normal(n); e=np.sin(np.pi*t/t[-1])**3
    y=np.zeros(n); blk=1024
    for i in range(0,n,blk): y[i:i+blk]=lpf(x[i:i+blk],1500+8000*np.sin(np.pi*i/n))
    return hpf(y,400)*e*.9
def pling(m):
    n=int(.9*SR); t=np.arange(n)/SR; x=np.zeros(n)
    for k,mm in enumerate((m,m+4,m+7,m+12)):
        i=int(k*.045*SR); tt=t[:n-i]; x[i:]+=np.sin(2*np.pi*mtof(mm)*tt)*np.exp(-tt/.25)*np.minimum(1,tt/.002)
    return x*.3
def riser(d):
    n=int(d*SR); t=np.arange(n)/SR; x=rng.standard_normal(n); y=np.zeros(n); blk=2048
    for i in range(0,n,blk): y[i:i+blk]=hpf(x[i:i+blk],300+6000*(i/n))
    return y*(t/d)**2*.6
def boom():
    n=int(1.8*SR); t=np.arange(n)/SR; s=np.sin(2*np.pi*np.cumsum(40+60*np.exp(-t/.1))/SR)*np.exp(-t/.6)
    return np.tanh(s*1.5)*.9
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.3)*SR)
    D=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    intro,lg=E["intro"],E["logo"]
    prog=[([57,60,64,67],45),([55,59,62,65],43),([53,57,60,64],41),([52,55,59,62],40)]  # Am7 G7 Fmaj7 Em7
    nb=int(T/b)+1
    for k in range(nb):
        t=k*b; bar=k//4; ch,root=prog[bar%4]
        if t<intro:  # مقدمة: كيك خفيف + ستاب مكتوم
            add(D,kick(),t,.5); add(D,chat(),t+b/2,.6)
            if k%2==0: add(M,lpf(stab(ch,b),900),t+b/2,.8)
            continue
        if t>=lg+6*b: break
        add(D,kick(),t,1)
        if k%2==1: add(D,clap(),t,.85)
        add(D,ohat(),t+b/2,1)
        for s in (.25,.75): add(D,chat(),t+s*b,.7)
        # بيس أوكتاف ثُمني
        for h in range(2):
            add(M,bass(root+(12 if h else 0),.45*b),t+h*b/2,.9)
        # ستابات فانك مُزاحة
        if k%2==0: add(M,stab(ch,.5*b),t+.5*b,1)
        else: add(M,stab(ch,.25*b),t+.75*b,.8)
    # ضغط جانبي
    sc=np.ones(N)
    for k in range(nb):
        t=k*b
        if t<intro: continue
        i=int(t*SR); n=int(.25*SR); seg=1-.6*np.exp(-np.arange(n)/SR/.07); j=min(N,i+n); sc[i:j]=np.minimum(sc[i:j],seg[:j-i])
    M=reverb(M*sc,1.2,.18)
    add(FX,riser(intro),0,.5); add(FX,boom(),intro,.8)
    notes=[76,79,81,74,83]
    for i,t in enumerate(E["cards"]): add(FX,swish()*.5,t-.2,.6)
    for i,t in enumerate(E["flips"]): add(FX,swish(),t-.1,.9); add(FX,pling(notes[i%5]),t+.35,.9)
    add(FX,riser(4*b),lg-4*b,.7); add(FX,boom(),lg,1); add(FX,pling(81)*1.3,lg+.3,1)
    x=D*.85+M*.8+FX
    fo=int(1.8*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.15); return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.009*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
