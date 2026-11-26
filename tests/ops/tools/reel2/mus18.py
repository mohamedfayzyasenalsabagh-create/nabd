# موسيقى «آسيد هاوس» مولّدة لريل لوحة فحص النظر (124bpm): كيك رباعي، هاي هات مفتوح، كلاب، وخط بيس 303 حمضي بمرشح رنّان يتفتّح مع وضوح اللوحة
# مؤثرات متزامنة: «كلِك» عدسة لكل تبديل، «تينغ» زجاجي عند النتائج، نقرات لأسطر الجدول، و«شيمر» عند رسم النظارة
# الاستخدام: python3 mus18.py events.json out.wav   (events من window.EVENTS في optic.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(141)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=1.4,mix=.15):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,6000); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def svf(x,cut,res):  # مرشح حالة-متغيرة منخفض التمرير برنين (طابع 303)
    y=np.zeros(len(x)); lp=bp=0.0
    for i in range(len(x)):
        f=2*np.sin(np.pi*min(cut[i],8000)/SR); hp=x[i]-lp-res*bp; bp+=f*hp; lp+=f*bp; y[i]=lp
    return y
def acid(m,d,cut0,acc=False,slide_from=None):
    n=int(d*SR); t=np.arange(n)/SR; f=np.full(n,mtof(m))
    if slide_from is not None: f=mtof(slide_from)+(mtof(m)-mtof(slide_from))*np.minimum(1,t/.05)
    x=2*((np.cumsum(f)/SR)%1)-1
    cut=cut0*(1+(3 if acc else 1.6)*np.exp(-t/.06)); y=svf(x,cut,.25)
    return np.tanh(y*2)*np.minimum(1,t/.003)*np.exp(-t/(d*1.5))*(.35 if acc else .28)
def kick(): n=int(.3*SR); t=np.arange(n)/SR; return np.tanh(np.sin(2*np.pi*np.cumsum(48+130*np.exp(-t/.02))/SR)*np.exp(-t/.17)*1.8)
def ohat(): n=int(.2*SR); return hpf(rng.standard_normal(n),8000)*env(n,.002,.06)*.3
def chat(): n=int(.04*SR); return hpf(rng.standard_normal(n),9500)*env(n,.0004,.01)*.25
def clap():
    n=int(.25*SR); x=rng.standard_normal(n); e=np.zeros(n)
    for d in (0,.01,.02): e+=env(n,.0005,.008)*(np.arange(n)>=d*SR)
    e+=env(n,.001,.1)*.6; return hpf(lpf(x*e,8000),1000)*.6
def lclick(): n=int(.12*SR); t=np.arange(n)/SR; return (hpf(rng.standard_normal(n),3000)*np.exp(-t/.004)+np.sin(2*np.pi*1200*t)*np.exp(-t/.02)*.5)*.7
def ting(m=88): n=int(1.3*SR); t=np.arange(n)/SR; f=mtof(m); return (np.sin(2*np.pi*f*t)+.4*np.sin(2*np.pi*f*2.4*t))*np.exp(-t/.5)*.15
def tick(): n=int(.04*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*2500*t)*np.exp(-t/.006)*.35
def shimmer(d=1.2):
    n=int(d*SR); t=np.arange(n)/SR; x=sum(np.sin(2*np.pi*mtof(m)*t)*np.exp(-t/.8) for m in (84,88,91,96))*np.minimum(1,t/.3)
    return x*.07
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.4)*SR)
    D=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    clicks,res,rx,lg=E["clicks"],E["res"],E["rx"],E["logo"]
    seq=[(33,1,0),(33,0,0),(45,0,1),(33,1,0),(36,0,0),(33,0,0),(43,1,1),(45,0,0),(33,0,0),(40,1,0),(33,0,0),(45,0,1),(36,1,0),(33,0,0),(38,0,0),(40,1,1)]
    s16=b/4; nb=int(T/s16)+1
    for k in range(nb):
        t=k*s16
        if t>=lg+2*b: break
        beat=k%4
        start=clicks[0]
        if t>=start:
            if beat==0: add(D,kick(),t,1)
            if beat==2: add(D,ohat(),t,1)
            if beat==1 or beat==3: add(D,chat(),t,.7)
            if k%8==4: add(D,clap(),t,.9)
        else:
            if beat==0 and k%8==0: add(D,kick(),t,.4)
        # المرشح يتفتّح مع كل نقرة عدسة (وضوح أكثر = صوت أوضح)
        nclk=sum(1 for c in clicks if t>=c); cut=250+nclk*350+(700 if t>=res else 0)
        m,acc,sl=seq[k%16]; prev=seq[(k-1)%16][0]
        add(M,acid(m,s16*.95,cut,bool(acc),prev if sl else None),t,1 if t>=start else .5)
    for c in clicks: add(FX,lclick(),c,1)
    add(FX,ting(),res+.3,1); add(FX,ting(91),res+.7,1)
    for r in E["rows"]: add(FX,tick(),r,1)
    add(FX,shimmer(),E["glasses"],1); add(FX,ting(84)*1.3,lg,1)
    x=D*.85+reverb(M,1.0,.12)*.95+FX
    fo=int(1.8*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.1); return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.011*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
