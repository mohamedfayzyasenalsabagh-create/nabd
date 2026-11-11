# موسيقى «لو-فاي» مولّدة لريل شاشة الإشعارات: توتر (دقات ساعة + طنين صاعد + رنّات إشعار) ← مسح ← إيقاع لو-فاي هادئ برودس ← خاتمة
# الاستخدام: python3 mus3.py events.json out.wav   (events من window.EVENTS في notif.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(7)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=2.0,mix=.3):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,5000); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
# أصوات
def kick():
    n=int(.5*SR); t=np.arange(n)/SR; f=48+90*np.exp(-t/.03); return np.tanh(np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.25)*1.8)
def snare():
    n=int(.35*SR); t=np.arange(n)/SR; body=np.sin(2*np.pi*190*t)*np.exp(-t/.05); nz=hpf(lpf(rng.standard_normal(n),6000),1200)*np.exp(-t/.12)
    return (body*.5+nz*.8)*.8
def hat(): n=int(.07*SR); return hpf(rng.standard_normal(n),8000)*env(n,.0005,.02)*.5
def tick(): n=int(.03*SR); t=np.arange(n)/SR; return (np.sin(2*np.pi*3200*t)+hpf(rng.standard_normal(n),5000)*.5)*np.exp(-t/.006)
def ding(m):  # رنّة إشعار جرسية
    n=int(.7*SR); t=np.arange(n)/SR; f=mtof(m)
    x=np.sin(2*np.pi*f*t)+.5*np.sin(2*np.pi*f*2.76*t)*np.exp(-t/.08)+.3*np.sin(2*np.pi*f*2*t)
    return x*env(n,.002,.18)*.5
def chime(m):  # رنّة نبض الناعمة (نغمتان)
    n=int(1.4*SR); t=np.arange(n)/SR; x=np.zeros(n)
    for k,(mm,d) in enumerate(((m,0),(m+7,.09))):
        i=int(d*SR); tt=t[:n-i]; x[i:]+=(np.sin(2*np.pi*mtof(mm)*tt)+.25*np.sin(2*np.pi*mtof(mm)*3*tt)*np.exp(-tt/.1))*env(n-i,.003,.45)
    return x*.35
def rhodes(ms,d):
    n=int(d*SR); t=np.arange(n)/SR; x=np.zeros(n)
    for m in ms:
        f=mtof(m); x+=np.sin(2*np.pi*f*t+.8*np.sin(2*np.pi*f*t)*np.exp(-t/.25))*env(n,.01,d*.55)
    trem=1+.12*np.sin(2*np.pi*4.5*t); return lpf(x*trem/len(ms),2400)*.45
def bass(m,d): n=int(d*SR); t=np.arange(n)/SR; return np.tanh(np.sin(2*np.pi*mtof(m)*t)*1.5)*env(n,.01,d*.6)*.7
def drone(d):
    n=int(d*SR); t=np.arange(n)/SR; f=55*2**(t/d*1.0)
    x=sum(np.sin(2*np.pi*np.cumsum(f*k*(1+.004*k))/SR)/k for k in range(1,7))
    return lpf(x,1500)*(t/d)**1.5*.5
def whoosh(d=.7):
    n=int(d*SR); t=np.arange(n)/SR; x=rng.standard_normal(n); e=np.sin(np.pi*t/d)**2
    y=np.zeros(n); blk=1024
    for i in range(0,n,blk): y[i:i+blk]=lpf(x[i:i+blk],800+7000*(i/n))
    return hpf(y,250)*e*.8
def crackle(n):
    x=np.zeros(n); idx=rng.integers(0,n,int(n/SR*25)); x[idx]=rng.uniform(-1,1,len(idx)); return hpf(x,2000)*.25+lpf(rng.standard_normal(n),900)*.012
def build(E):
    T=E["total"]; N=int((T+.3)*SR); x=np.zeros(N)
    fr,sw,calm,lg=E["freeze"],E["swipe"],E["calm"],E["logo"]
    # 1) التوتر: دقات ساعة متسارعة + طنين صاعد + رنّات الإشعارات
    t=0.0; step=.42
    while t<fr: add(x,tick(),t,.35); t+=step; step=max(.14,step*.95)
    add(x,drone(fr),0,.55)
    notes=[76,79,81,76,83,79,84,81,86,83,88]
    for i,d in enumerate(E["dings"]): add(x,ding(notes[i%len(notes)]),d,.65)
    # 2) السكون ثم المسح
    add(x,whoosh(),sw-.35,1.0)
    # 3) لو-فاي 84bpm بإيقاع متأرجح
    bpm=84; b=60/bpm; prog=[[62,65,69,72],[67,71,74,77],[64,67,71,74],[69,72,76,79]]  # Dm9-ish, G, Em, Am
    roots=[50,55,52,57]; k=0; t=calm
    while t<T-.2:
        bar=k//4; ch=prog[bar%4]; beat=k%4
        if beat in (0,) or (beat==2 and bar%2==1): add(x,kick(),t,.8)
        if beat==2 and bar%2==0: add(x,kick(),t+b*.75,.5)
        if beat in (1,3): add(x,snare(),t,.55)
        for h in (0,.58): add(x,hat(),t+h*b,.6 if h==0 else .35)
        if beat==0: add(x,rhodes(ch,4*b),t,1); add(x,bass(roots[bar%4]-12,1.6*b),t,.9); add(x,bass(roots[bar%4]-12,.8*b),t+2.5*b,.7)
        t+=b; k+=1
    for c in E["chimes"]: add(x,chime(81),c,.9)
    add(x,chime(86)*1.2,lg,1); add(x,rhodes([62,69,72,76,81],4.5),lg,.8)
    x=reverb(x,2.2,.25)+crackle(N)
    fo=int(1.6*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.2); return x/np.max(np.abs(x))*.89
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.011*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
