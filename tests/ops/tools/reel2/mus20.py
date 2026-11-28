# موسيقى «ريغي» مولّدة لريل علبة الأدوية (80bpm): إيقاع «ون دروب» (كيك وريمشوت على الضربة 3)، سكانك غيتار/أورغن على النصف الثاني من كل ضربة، بيس دافئ
# مؤثرات متزامنة: حبوب تسقط (طقطقة بلاستيك)، فتح غطاء «كليك» ونغمة إشعار لكل جرعة، نقرات اختيار الأوقات، عدّ تنازلي ونغمة إنجاز
# الاستخدام: python3 mus20.py events.json out.wav   (events من window.EVENTS في pillbox.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(161)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=1.8,mix=.22):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,5000); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def kick(): n=int(.35*SR); t=np.arange(n)/SR; return np.tanh(np.sin(2*np.pi*np.cumsum(50+70*np.exp(-t/.03))/SR)*np.exp(-t/.2)*1.5)*.8
def rim(): n=int(.1*SR); t=np.arange(n)/SR; return (np.sin(2*np.pi*1700*t)*.6+hpf(rng.standard_normal(n),2500)*.5)*np.exp(-t/.015)*.5
def hat(): n=int(.06*SR); return hpf(rng.standard_normal(n),8000)*env(n,.001,.015)*.25
def skank(ms,d=.18):
    n=int(d*SR); t=np.arange(n)/SR; x=sum(np.sign(np.sin(2*np.pi*mtof(m)*t))*.4+np.sin(2*np.pi*mtof(m)*t) for m in ms)/len(ms)
    return hpf(lpf(x,3000),300)*np.exp(-t/.05)*.35
def organ(ms,d=.2):
    n=int(d*SR); t=np.arange(n)/SR; x=sum(np.sin(2*np.pi*mtof(m)*t)+.5*np.sin(2*np.pi*mtof(m)*2*t)+.3*np.sin(2*np.pi*mtof(m)*3*t) for m in ms)/len(ms)
    return x*np.minimum(1,t/.005)*np.minimum(1,(d-t)/.02)*.12
def bass(m,d): n=int(d*SR); t=np.arange(n)/SR; return lpf(np.sin(2*np.pi*mtof(m)*t)+.3*np.sin(2*np.pi*mtof(m)*2*t),400)*env(n,.01,d*.7)*.75
def rattle():
    n=int(.5*SR); x=np.zeros(n)
    for k in range(9): i=int(rng.uniform(0,.4)*SR); c=hpf(rng.standard_normal(int(.01*SR)),2000)*np.exp(-np.arange(int(.01*SR))/SR/.002); x[i:i+len(c)]+=c*rng.uniform(.4,1)
    return x*.5
def click(): n=int(.08*SR); t=np.arange(n)/SR; return (hpf(rng.standard_normal(n),1500)*np.exp(-t/.006)+np.sin(2*np.pi*800*t)*np.exp(-t/.02)*.5)*.6
def notif():
    n=int(.9*SR); t=np.arange(n)/SR; x=np.zeros(n)
    for k,m in enumerate((81,88)): i=int(k*.12*SR); tt=t[:n-i]; x[i:]+=np.sin(2*np.pi*mtof(m)*tt)*np.exp(-tt/.3)
    return x*.2
def tick(): n=int(.05*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*2000*t)*np.exp(-t/.008)*.35
def done():
    n=int(1.4*SR); t=np.arange(n)/SR; x=np.zeros(n)
    for k,m in enumerate((72,76,79,84)): i=int(k*.08*SR); tt=t[:n-i]; x[i:]+=np.sin(2*np.pi*mtof(m)*tt)*np.exp(-tt/.5)
    return x*.18
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.4)*SR)
    D=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    rx,lg=E["rx"],E["logo"]
    prog=[(43,[67,71,74]),(48,[67,72,76]),(50,[66,69,74]),(48,[67,72,76])]  # G C D C
    nb=int(T/b)+1
    for k in range(nb):
        t=k*b
        if t>=lg+4*b: break
        bar=k//4; root,ch=prog[bar%4]; beat=k%4
        add(M,skank(ch),t+b/2,1 if t>=rx else .6); add(M,organ([m-12 for m in ch]),t+b/2+.02,1)
        add(D,hat(),t,.8); add(D,hat(),t+b/2,.5)
        if t>=rx:
            if beat==2: add(D,kick(),t,1); add(D,rim(),t,1)
            if beat==0: add(M,bass(root-12,b*.9),t,1)
            if beat==1: add(M,bass(root-12+7,b*.5),t+b/2,.8)
            if beat==3: add(M,bass(root-12+12,b*.5),t,.7); add(M,bass(root-12+10,b*.5),t+b/2,.7)
    add(FX,rattle(),E["fill"]+.3,1)
    for t in E["doses"]: add(FX,click(),t,1); add(FX,notif(),t+.05,1)
    for i in range(3): add(FX,tick(),E["chips"]+.4+i*.35,1)
    for i in range(4): add(FX,tick(),E["left"]+i*.45*b,.8)
    add(FX,done(),E["done"],1); add(FX,done()*1.2,lg+.2,1)
    x=D*.85+reverb(M,1.6,.2)*.95+FX
    fo=int(1.8*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.1); return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.011*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
