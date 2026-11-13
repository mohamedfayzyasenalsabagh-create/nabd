# موسيقى شرقية مولّدة لريل العدّاد (100bpm): إيقاع مقسوم (دُم/تَك دربكة + رق) ولحن نقر بمقام الحجاز على ري، بيس على الدُّم
# مع مؤثرات متزامنة: نقرات سقّاطة أثناء دوران العدّاد، رنّة صندوق عند توقفه، ضربة ختم، ودخول قوي عند «نبض يحسبها»
# الاستخدام: python3 mus5.py events.json out.wav   (events من window.EVENTS في odo.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(5)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=1.6,mix=.22):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,6000); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def dum():
    n=int(.5*SR); t=np.arange(n)/SR; f=85+60*np.exp(-t/.02); x=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.22)
    x+=lpf(rng.standard_normal(n),900)*np.exp(-t/.015)*.5; return np.tanh(x*1.6)
def tak():
    n=int(.18*SR); t=np.arange(n)/SR; x=hpf(lpf(rng.standard_normal(n),9000),1800)*np.exp(-t/.03)
    x+=np.sin(2*np.pi*620*t)*np.exp(-t/.02)*.6; return x*.8
def ka(): n=int(.1*SR); t=np.arange(n)/SR; return hpf(rng.standard_normal(n),2500)*np.exp(-t/.018)*.45
def riq():
    n=int(.2*SR); t=np.arange(n)/SR; x=sum(np.sin(2*np.pi*f*t+rng.uniform(0,6)) for f in (5200,6900,8100,9400))
    return hpf(x+rng.standard_normal(n)*.8,4000)*env(n,.001,.05)*.18
def pluck(m,d=.6):  # نقر شبيه بالقانون/العود (كاربلس-سترونغ)
    n=int(d*SR); f=mtof(m); p=int(SR/f); buf=rng.uniform(-1,1,p); out=np.zeros(n)
    for i in range(n): out[i]=buf[i%p]; buf[i%p]=.5*(buf[i%p]+buf[(i+1)%p])*.996
    return lpf(out,5000)*.5
def bassn(m,d): n=int(d*SR); t=np.arange(n)/SR; return np.tanh(np.sin(2*np.pi*mtof(m)*t)*2)*env(n,.005,d*.5)*.6
def ratchet(d):
    n=int(d*SR); x=np.zeros(n); t=0.0; k=0
    while t<d:
        i=int(t*SR); c=tak()[:int(.03*SR)]*.5; j=min(n,i+len(c)); x[i:j]+=c[:j-i]; k+=1
        t+=.035+.12*(t/d)**2  # تتباطأ مع توقف العدّاد
    return hpf(x,3000)
def cash():
    n=int(1.2*SR); t=np.arange(n)/SR; x=sum(np.sin(2*np.pi*f*t)*np.exp(-t/dd) for f,dd in ((2093,.5),(2637,.4),(3136,.35),(4186,.25)))
    x+=hpf(rng.standard_normal(n),5000)*np.exp(-t/.04)*.6; return x*.22
def thud():
    n=int(.8*SR); t=np.arange(n)/SR; x=np.sin(2*np.pi*np.cumsum(55+80*np.exp(-t/.03))/SR)*np.exp(-t/.25)
    x+=lpf(rng.standard_normal(n),2500)*np.exp(-t/.05)*.7; return np.tanh(x*1.8)*.9
def riser(d):
    n=int(d*SR); t=np.arange(n)/SR; x=rng.standard_normal(n); y=np.zeros(n)
    for i in range(0,n,2048): y[i:i+2048]=hpf(x[i:i+2048],400+5000*(i/n))
    return y*(t/d)**2*.5
# مقام الحجاز على ري: D Eb F# G A Bb C D
HJ=[62,63,66,67,69,70,72,74]
MEL=[0,1,2,1,0,None,2,3,4,3,2,1,2,None,0,None, 4,5,4,3,2,3,2,1,0,1,2,1,0,None,None,None]
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.3)*SR)
    D=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    turn,rep,lg=E["turn"],E["rep"],E["logo"]
    # المقسوم: دُم تَك - تَك دُم - تَك -  (ثُمانيات لكل مازورة 4 ضربات)
    pat=["D","T",None,"T","D",None,"T",None]
    e8=b/2; k=0; t=0.0
    while t<T-.1:
        p=pat[k%8]; full=t>=turn
        if t<turn and k%2==1: p=None if p=="T" else p  # مقدمة أخفّ
        if p=="D": add(D,dum(),t,1 if full else .7); add(M,bassn(38 if (k//8)%2==0 else 36,.4),t,.9 if full else .5)
        elif p=="T": add(D,tak(),t,.9)
        else: add(D,ka(),t+0.0,.6 if full else .3)
        if full: add(D,riq(),t,1); add(D,riq(),t+e8/2,.5)
        # لحن الحجاز بعد نقطة التحوّل
        if full and t<lg+2*b:
            m=MEL[k%len(MEL)]
            if m is not None: add(M,pluck(HJ[m]+12,.7),t,.75)
        t+=e8; k+=1
    # قبل التحوّل: نقرات خافتة لدرجات المقام كأسئلة
    for i,q in enumerate(E["qs"]): add(M,pluck(HJ[[0,2,4][i%3]]+12,1.0),q,.9); add(FX,thud()*.4,q,.6)
    add(FX,riser(turn),0,.35); add(FX,thud(),turn,1)
    for r in E["rows"]: add(FX,ratchet(E["rollDur"]),r,.7); add(FX,cash(),r+E["rollDur"],1)
    add(FX,thud(),E["stamp"],1.1); add(FX,riser(4*b),lg-4*b,.6); add(FX,cash()*1.2,lg+.2,1)
    for m in (62,66,69,74): add(M,pluck(m,2.5),lg,.6)
    x=D*.8+reverb(M,1.6,.25)*.85+FX
    fo=int(1.8*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.1); return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.01*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
