# موسيقى «فولك صوتي» مولّدة لريل القصاصات الورقية (110bpm): ضربات غيتار/يوكوليلي منقورة، تصفيق وسناب، كيك خشبي، غلوكنشبيل
# مؤثرات متزامنة: صوت ورق ينزلق، غالق كاميرا، «تم» نغمي عند الرفع، طيّ ورق، صفير طيران الطائرة الورقية، ونقرة الدبوس
# الاستخدام: python3 mus11.py events.json out.wav   (events من window.EVENTS في paper.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(71)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=1.4,mix=.18):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,6000); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def ks(m,d,bright=.5):
    n=int(d*SR); f=mtof(m); p=max(2,int(SR/f)); buf=rng.uniform(-1,1,p); buf=lpf(np.tile(buf,4),2000+6000*bright)[:p]; out=np.zeros(n)
    for i in range(n): out[i]=buf[i%p]; buf[i%p]=.5*(buf[i%p]+buf[(i+1)%p])*.995
    return out
def strum(ms,d,down=True,g=1):
    n=int(d*SR); x=np.zeros(n); order=ms if down else ms[::-1]
    for k,m in enumerate(order): i=int(k*.012*SR); s=ks(m,d-k*.012); x[i:i+len(s)]+=s[:n-i]
    return lpf(x/len(ms),5000)*.5*g
def clap():
    n=int(.25*SR); x=rng.standard_normal(n); e=np.zeros(n)
    for d in (0,.008,.016): e+=env(n,.0005,.008)*(np.arange(n)>=d*SR)
    e+=env(n,.001,.07)*.6; return hpf(lpf(x*e,8000),900)*.55
def wkick(): n=int(.25*SR); t=np.arange(n)/SR; f=70+90*np.exp(-t/.02); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.12)*.8
def shaker(): n=int(.09*SR); return hpf(rng.standard_normal(n),5000)*env(n,.02,.02)*.2
def glock(m,d=.9):
    n=int(d*SR); t=np.arange(n)/SR; f=mtof(m); return (np.sin(2*np.pi*f*t)+.4*np.sin(2*np.pi*f*2.76*t)*np.exp(-t/.1))*env(n,.001,.35)*.2
def bass(m,d): n=int(d*SR); t=np.arange(n)/SR; return lpf(np.sin(2*np.pi*mtof(m)*t)+.3*np.sin(2*np.pi*mtof(m)*2*t),600)*env(n,.005,d*.5)*.5
def paper(d=.35):
    n=int(d*SR); x=rng.standard_normal(n); y=np.zeros(n)
    for i in range(0,n,512): y[i:i+512]=x[i:i+512]*rng.uniform(.2,1)
    return hpf(lpf(y,7000),1200)*np.sin(np.pi*np.arange(n)/n)*.35
def shutter(): n=int(.18*SR); t=np.arange(n)/SR; return hpf(rng.standard_normal(n),1500)*(np.exp(-t/.008)+.7*(t>.07)*np.exp(-np.maximum(0,t-.07)/.01))*.6
def done():
    n=int(1.0*SR); x=np.zeros(n)
    for k,m in enumerate((79,84)): g=glock(m,1.0-k*.12); x[int(k*.12*SR):int(k*.12*SR)+len(g)]+=g
    return x*1.6
def whistle(d):
    n=int(d*SR); t=np.arange(n)/SR; f=900+500*np.sin(np.pi*t/d)-300*t/d; x=np.sin(2*np.pi*np.cumsum(f)/SR)*np.sin(np.pi*t/d)**2
    return x*.12+paper(d)*.3
def pin(): n=int(.2*SR); t=np.arange(n)/SR; return (np.sin(2*np.pi*2200*t)*.5+lpf(rng.standard_normal(n),3000))*np.exp(-t/.02)*.6+wkick()[:n]*.4
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.4)*SR)
    D=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    prog=[(48,[60,64,67,72]),(55,[59,62,67,71]),(57,[60,64,69,72]),(53,[60,65,69,72])]  # C G Am F
    mel=[76,79,81,79,76,74,72,None]
    nb=int(T/b)+1; lab,lg=E["lab"],E["logo"]
    for k in range(nb):
        t=k*b
        if t>=lg+3*b: break
        bar=k//4; root,ch=prog[bar%4]; beat=k%4
        # نمط ضرب: أسفل، أسفل-أعلى، أعلى-أسفل-أعلى
        add(M,strum(ch,b*1.2,True,1 if beat in (0,2) else .7),t,1)
        if beat in (1,2,3): add(M,strum(ch,b*.6,False,.55),t+b/2,1)
        if beat==0: add(M,bass(root-12,b*1.5),t,1)
        if beat==2: add(M,bass(root-5,b*.9),t,.8)
        if t>=lab:
            add(D,wkick(),t,1 if beat in (0,2) else .0)
            if beat in (1,3): add(D,clap(),t,1)
            add(D,shaker(),t+b/2,1); add(D,shaker(),t,.6)
        if t>=E["up"] and beat%2==0:
            m=mel[(k//2)%len(mel)]
            if m: add(M,glock(m),t,1)
    add(FX,paper(),lab,1); add(FX,paper(.3),E["ph"],.6)
    add(FX,shutter(),E["snap"],1); add(FX,done(),E["up"],1)
    add(FX,paper(.5),E["fold"],1.2); add(FX,whistle(E["pin"]-E["fly"]),E["fly"],1)
    add(FX,pin(),E["pin"],1); add(FX,done(),E["end"],.7); add(FX,paper(),lg,1); add(FX,done(),lg+.6,1)
    x=D*.9+reverb(M,1.3,.15)*.95+FX
    fo=int(1.8*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.1); return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.012*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
