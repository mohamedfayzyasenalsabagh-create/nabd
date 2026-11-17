# موسيقى «ديمبو/ريغيتون» مولّدة لريل عدسة الكاميرا (96bpm): كيك رباعي مع سنير ديمبو (3+3+2)، بيس 808 منزلق، كورد بلاك نغمي
# مؤثرات متزامنة: صوت تركيز الكاميرا ثم «بيب» قراءة الرمز، تأكيد حضور، «بوب» لشارة الاستقبال، وختام
# الاستخدام: python3 mus9.py events.json out.wav   (events من window.EVENTS في scan.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(51)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=1.6,mix=.2):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,6000); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def kick(): n=int(.35*SR); t=np.arange(n)/SR; f=48+120*np.exp(-t/.025); return np.tanh(np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.18)*1.9)
def snare():
    n=int(.22*SR); t=np.arange(n)/SR; x=hpf(lpf(rng.standard_normal(n),8000),1500)*np.exp(-t/.06)+np.sin(2*np.pi*260*t)*np.exp(-t/.03)*.7
    return x*.7
def hat(): n=int(.05*SR); return hpf(rng.standard_normal(n),9000)*env(n,.0004,.014)*.3
def b808(m,d,slide=0):
    n=int(d*SR); t=np.arange(n)/SR; f=mtof(m)*(1+slide*np.exp(-t/.06)); x=np.sin(2*np.pi*np.cumsum(f)/SR)
    return np.tanh(x*2.2)*env(n,.004,d*.7)*.55
def pluck(m,d=.3):
    n=int(d*SR); t=np.arange(n)/SR; f=mtof(m)
    x=sum(np.sin(2*np.pi*f*k*t)*np.exp(-t*(6+k*6))/k for k in range(1,7)); return x*np.minimum(1,t/.002)*.22
def focus():
    n=int(.5*SR); t=np.arange(n)/SR; x=np.zeros(n)
    for d in (0,.09,.17,.24,.3): i=int(d*SR); c=hpf(rng.standard_normal(int(.012*SR)),4000)*.5; x[i:i+len(c)]+=c
    return x*.6
def beep(): n=int(.35*SR); t=np.arange(n)/SR; return (np.sin(2*np.pi*1568*t)*(t<.09)+np.sin(2*np.pi*2093*t)*((t>.1)&(t<.25)))*env(n,.002,.4)*.32
def shutter(): n=int(.15*SR); t=np.arange(n)/SR; return lpf(rng.standard_normal(n),5000)*(np.exp(-t/.01)+.6*np.exp(-np.maximum(0,t-.06)/.012)*(t>.06))*.6
def success():
    n=int(1.3*SR); t=np.arange(n)/SR; x=np.zeros(n)
    for k,m in enumerate((72,76,79,84)):
        i=int(k*.07*SR); tt=t[:n-i]; x[i:]+=np.sin(2*np.pi*mtof(m)*tt)*np.exp(-tt/.4)
    return x*.2
def pop(): n=int(.15*SR); t=np.arange(n)/SR; f=500+900*np.exp(-t/.02); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.04)*.4
def riser(d):
    n=int(d*SR); t=np.arange(n)/SR; x=rng.standard_normal(n); y=np.zeros(n)
    for i in range(0,n,2048): y[i:i+2048]=hpf(x[i:i+2048],300+6000*(i/n))
    return y*(t/d)**2*.5
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.4)*SR)
    D=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    cam,lock,pat,rec,chip,end,lg=(E[k] for k in ("cam","lock","pat","rec","chip","end","logo"))
    prog=[(57,[69,72,76]),(53,[69,72,77]),(48,[67,72,76]),(55,[67,71,74])]  # Am F C G
    s16=b/4; nbar=int(T/(4*b))+1
    for B in range(nbar):
        t0=B*4*b; root,ch=prog[B%4]
        if t0>=lg+4*b: break
        intro=t0<cam
        for s in range(16):
            t=t0+s*s16
            if not intro:
                if s%4==0: add(D,kick(),t,1)
                if s in (3,6,11,14): add(D,snare(),t,.85)  # نمط الديمبو
                if s%2==0: add(D,hat(),t,.8)
            else:
                if s in (3,6,11,14): add(D,snare(),t,.35)
            # كورد بلاك بإيقاع 3+3+2
            if s in (0,3,6,8,11,14): add(M,sum(pluck(m+(12 if not intro else 0)) for m in ch),t,.9 if not intro else .5)
        if not intro: add(M,b808(root-24,1.4*b,.5),t0,1); add(M,b808(root-24,.9*b),t0+1.5*b,.8); add(M,b808(root-12,.9*b,.3),t0+2.75*b,.7)
    add(FX,focus(),cam+.2,1); add(FX,riser(lock-cam),cam,.35)
    add(FX,beep(),lock,1); add(FX,shutter(),lock+.02,1)
    add(FX,success(),pat+.3,1); add(FX,pop(),chip,1); add(FX,success()*.8,chip+.05,.6)
    add(FX,riser(3*b),lg-3*b,.5); add(FX,success()*1.2,lg+.2,1)
    x=D*.85+reverb(M,1.5,.2)*.9+FX
    fo=int(1.8*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.1); return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.011*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
