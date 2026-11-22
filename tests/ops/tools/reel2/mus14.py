# موسيقى «فانك» مولّدة لريل مروحة الألوان (108bpm): بيس سلاب، كلافينيت مكتوم، ستابات نحاس، طبول فانك بغوست نوت وهاي هات مفتوح
# مؤثرات متزامنة: «فرررت» انفتاح المروحة، نقرة اختيار لكل ثيم مع ستاب نحاسي، «بلوب» ظهور الشعار، وطابعة للوصفة
# الاستخدام: python3 mus14.py events.json out.wav   (events من window.EVENTS في swatch.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(101)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=1.2,mix=.15):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,6000); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def saw(f,n): t=np.arange(n)/SR; return sum(np.sin(2*np.pi*f*k*t)/k for k in range(1,12))
def kick(): n=int(.3*SR); t=np.arange(n)/SR; f=55+110*np.exp(-t/.025); return np.tanh(np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.16)*1.7)
def snare(g=1):
    n=int(.25*SR); t=np.arange(n)/SR; x=hpf(lpf(rng.standard_normal(n),9000),1000)*np.exp(-t/.08)+np.sin(2*np.pi*210*t)*np.exp(-t/.04)*.7
    return x*.75*g
def hat(o=False): n=int((.22 if o else .05)*SR); return hpf(rng.standard_normal(n),8500)*env(n,.0005,.07 if o else .012)*.3
def slap(m,d,pop=False):
    n=int(d*SR); t=np.arange(n)/SR; f=mtof(m); x=saw(f,n)*.5+np.sin(2*np.pi*f*t)
    x=lpf(x,1800 if pop else 900)*env(n,.002,d*.45); x[:int(.004*SR)]+=hpf(rng.standard_normal(int(.004*SR)),2000)*(.8 if pop else .4)
    return np.tanh(x*1.5)*.5
def clav(ms,d):
    n=int(d*SR); x=sum(np.sign(np.sin(2*np.pi*mtof(m)*np.arange(n)/SR))*.5+saw(mtof(m),n)*.3 for m in ms)/len(ms)
    return hpf(lpf(x,3500),400)*env(n,.001,.05)*.25
def horn(ms,d):
    n=int(d*SR); t=np.arange(n)/SR; x=sum(saw(mtof(m),n)+saw(mtof(m)*1.004,n) for m in ms)/len(ms)
    cut=600+3000*np.minimum(1,t/.05)*np.exp(-t/.25); y=np.zeros(n)
    for i in range(0,n,1024): y[i:i+1024]=lpf(x[i:i+1024],float(cut[i]))
    return y*np.minimum(1,t/.01)*np.exp(-t/(d*.6))*.22
def flutter(d=.6):
    n=int(d*SR); x=np.zeros(n); k=0; tt=0.0
    while tt<d: i=int(tt*SR); c=hpf(rng.standard_normal(int(.012*SR)),1500)*np.exp(-np.arange(int(.012*SR))/SR/.004); x[i:i+len(c)]+=c[:n-i]; tt+=.035+.03*tt; k+=1
    return x*.5
def click(): n=int(.05*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*2400*t)*np.exp(-t/.008)*.5
def blop(): n=int(.25*SR); t=np.arange(n)/SR; f=300+700*np.exp(-t/.04); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.08)*.5
def printer(d=1.2):
    n=int(d*SR); t=np.arange(n)/SR; x=np.sign(np.sin(2*np.pi*55*t))*.3*hpf(rng.standard_normal(n),800)*.5+np.sin(2*np.pi*110*t)*.1
    return lpf(x,3000)*np.minimum(1,t/.05)*np.minimum(1,(d-t)/.1)*.4
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.4)*SR)
    D=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    fan,ph,rx,lg=E["fan"],E["phone"],E["rx"],E["logo"]
    # E9 ↔ A7 فانك كلاسيكي، ثم D9
    prog=[(40,[56,59,62,66]),(40,[56,59,62,66]),(45,[55,61,64,67]),(38,[54,57,60,64])]
    bassl=[(0,0,True),(.75,0,False),(1.5,12,True),(2,10,False),(2.5,7,False),(3,0,True),(3.5,3,False),(3.75,5,False)]
    nbar=int(T/(4*b))+1
    for B4 in range(nbar):
        t0=B4*4*b; root,ch=prog[B4%4]
        if t0>=lg+4*b: break
        full=t0>=ph-1e-6
        for (o,iv,pop) in bassl: add(M,slap(root-12+iv,b*.45,pop),t0+o*b,1 if full else .5)
        if full:
            for k in range(16):
                t=t0+k*b/4
                if k in (0,7,10): add(D,kick(),t,1)
                if k in (4,12): add(D,snare(),t,1)
                if k in (2,9,14): add(D,snare(.25),t,1)
                add(D,hat(k in (6,14)),t,.9 if k%2==0 else .5)
                if k in (1,3,6,9,11,14): add(M,clav([m+12 for m in ch],b/4*.8),t,1)
        else:
            for k in range(0,16,2): add(D,hat(),t0+k*b/4,.5)
    add(FX,flutter(),fan,1)
    for t in E["themes"]: add(FX,click(),t,1); add(M,horn([62,66,69,73],b*.7),t+.02,1)
    add(FX,blop(),E["themes"][min(3,len(E["themes"])-1)]+.05,1)
    add(FX,printer(),rx+.1,1); add(M,horn([61,64,68,71],b*1.5),lg,1.3)
    x=D*.85+reverb(M,1.1,.15)*.95+FX
    fo=int(1.8*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.1); return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.011*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
