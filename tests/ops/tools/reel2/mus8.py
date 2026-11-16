# موسيقى «تجسّس/هايست» مولّدة لريل المخطط (92bpm): بيس بيتزيكاتو متنقّل، فرشاة سنير وريمشوت، فيبرافون بسلّم صغير
# مؤثرات متزامنة: تمرير بطاقة (بيب) عند دخول كل موظف، «كليك» قفل يُفتح لكل غرفة، وضربة ختام
# الاستخدام: python3 mus8.py events.json out.wav   (events من window.EVENTS في blueprint.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(41)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=2.0,mix=.25):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,5500); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def kick(): n=int(.35*SR); t=np.arange(n)/SR; f=50+90*np.exp(-t/.03); return np.tanh(np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.2)*1.5)*.9
def brush(): n=int(.3*SR); t=np.arange(n)/SR; return hpf(lpf(rng.standard_normal(n),7000),1500)*env(n,.02,.09)*.45
def rim(): n=int(.1*SR); t=np.arange(n)/SR; return (np.sin(2*np.pi*1700*t)+hpf(rng.standard_normal(n),3000)*.4)*np.exp(-t/.012)*.5
def shaker(): n=int(.08*SR); return hpf(rng.standard_normal(n),6000)*env(n,.01,.025)*.25
def pizz(m,d=.5):
    n=int(d*SR); f=mtof(m); p=int(SR/f); buf=rng.uniform(-1,1,p)*np.hanning(p); out=np.zeros(n)
    for i in range(n): out[i]=buf[i%p]; buf[i%p]=.5*(buf[i%p]+buf[(i+1)%p])*.993
    return lpf(out,1200)*.9
def vib(m,d):
    n=int(d*SR); t=np.arange(n)/SR; f=mtof(m); x=np.sin(2*np.pi*f*t)+.25*np.sin(2*np.pi*f*4*t)*np.exp(-t/.05)
    return x*env(n,.002,.6)*(1+.25*np.sin(2*np.pi*6*t))*.2
def swipe():
    n=int(.35*SR); t=np.arange(n)/SR; x=hpf(lpf(rng.standard_normal(n),4000),800)*np.sin(np.pi*t/t[-1])*.4
    b=np.sin(2*np.pi*1950*t)*((t>.2)&(t<.3))*.3; return x+b
def unlock():
    n=int(.25*SR); t=np.arange(n)/SR; c1=(np.sin(2*np.pi*2600*t)+hpf(rng.standard_normal(n),2000))*np.exp(-t/.006)
    c2=np.zeros(n); i=int(.06*SR); tt=t[:n-i]; c2[i:]=(np.sin(2*np.pi*900*tt)+lpf(rng.standard_normal(n-i),3000))*np.exp(-tt/.02)
    return (c1*.4+c2*.6)*.6
def hit():
    n=int(2*SR); t=np.arange(n)/SR; x=np.sin(2*np.pi*np.cumsum(40+50*np.exp(-t/.1))/SR)*np.exp(-t/.7)+lpf(rng.standard_normal(n),1500)*np.exp(-t/.2)*.4
    return np.tanh(x*1.3)*.8
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.4)*SR)
    D=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    roles,out,lg=E["roles"][0],E["out"],E["logo"]
    # خط بيس متنقّل في لا الصغير مع لمسة كروماتية (تجسّسي)
    line=[45,48,52,51,50,48,47,44, 45,48,52,55,53,52,51,50]
    vchords=[[69,72,76],[68,71,74],[67,70,74],[68,71,76]]
    nb=int(T/b)+1
    for k in range(nb):
        t=k*b
        if t>=lg+3*b: break
        intro=t<roles
        for h in (0,.5):
            m=line[(2*k+int(h*2))%len(line)]
            add(M,pizz(m-12 if not intro else m),t+h*b+(.04 if h else 0),.9 if not intro else .55)
        if not intro:
            if k%4 in (0,) or k%8==6: add(D,kick(),t,1)
            if k%2==1: add(D,brush(),t,1); add(D,rim(),t+.75*b,.5)
            for s in (0,.33,.66): add(D,shaker(),t+s*b,1)
        else:
            add(D,shaker(),t,.6)
        if k%4==0 and not intro: add(M,sum(vib(m,4*b) for m in vchords[(k//4)%4]),t+.5*b,1)
    for t in E["roles"]: add(FX,swipe(),t+.05,1)
    for t in E["unlocks"]: add(FX,unlock(),t,.8)
    add(FX,hit(),out,.8); add(M,sum(vib(m,3) for m in (69,72,76,81)),lg+.1,1.2); add(FX,hit(),lg,.7)
    x=D*.85+reverb(M,1.8,.22)*.9+FX
    fo=int(1.8*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.1); return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.011*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
