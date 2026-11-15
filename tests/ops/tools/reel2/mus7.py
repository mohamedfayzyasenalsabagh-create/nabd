# موسيقى «ليكويد درام أند بيس» مولّدة لريل الجدول (172bpm): بريك بيت سريع، ساب بيس، باد ناعم وبيانو كهربائي
# مؤثرات متزامنة: «تك» لكل وسم عمود، خدش أحمر للمكرر، «فووش» صاعد لكل صف يطير إلى بطاقة، وتأكيد عند الانتهاء
# الاستخدام: python3 mus7.py events.json out.wav   (events من window.EVENTS في sheet.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(31)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=2.6,mix=.3):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,6500); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def kick():
    n=int(.3*SR); t=np.arange(n)/SR; f=55+150*np.exp(-t/.02); return np.tanh(np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.14)*1.8)
def snare():
    n=int(.3*SR); t=np.arange(n)/SR; x=hpf(lpf(rng.standard_normal(n),9000),1200)*np.exp(-t/.09)+np.sin(2*np.pi*230*t)*np.exp(-t/.035)*.6
    return x*.8
def ghost(): n=int(.12*SR); t=np.arange(n)/SR; return hpf(rng.standard_normal(n),1500)*np.exp(-t/.025)*.25
def hat(): n=int(.04*SR); return hpf(rng.standard_normal(n),9500)*env(n,.0004,.01)*.3
def ride():
    n=int(.5*SR); t=np.arange(n)/SR; x=sum(np.sin(2*np.pi*f*t) for f in (3150,4230,5370,6800))+hpf(rng.standard_normal(n),6000)
    return x*env(n,.001,.2)*.05
def sub(m,d): n=int(d*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*mtof(m)*t)*np.minimum(1,t/.01)*np.minimum(1,(d-t)/.03)*.7
def epiano(ms,d):
    n=int(d*SR); t=np.arange(n)/SR; x=np.zeros(n)
    for m in ms: f=mtof(m); x+=np.sin(2*np.pi*f*t+1.2*np.sin(2*np.pi*f*t)*np.exp(-t/.2))*env(n,.005,d*.5)
    return lpf(x/len(ms),3000)*.35*(1+.1*np.sin(2*np.pi*5*t))
def pad(ms,d):
    n=int(d*SR); t=np.arange(n)/SR; x=sum(np.sin(2*np.pi*mtof(m)*k*(1+.003*s)*t)/k for m in ms for k in (1,2,3) for s in (-1,1))
    return lpf(x/len(ms),1800)*np.minimum(1,t/.6)*np.minimum(1,(d-t)/.5)*.06
def tick(): n=int(.15*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*2400*t)*np.exp(-t/.03)*.35
def scratch():
    n=int(.35*SR); t=np.arange(n)/SR; f=900-700*t/t[-1]; x=np.sign(np.sin(2*np.pi*np.cumsum(f)/SR))
    return lpf(x,3000)*np.sin(np.pi*t/t[-1])*.18
def zip_(d=.4):
    n=int(d*SR); t=np.arange(n)/SR; f=600+2200*(t/d)**1.5; x=np.sin(2*np.pi*np.cumsum(f)/SR)*.25
    return (x+hpf(rng.standard_normal(n),3000)*.15)*np.sin(np.pi*t/d)
def confirm():
    n=int(1.2*SR); t=np.arange(n)/SR; x=np.zeros(n)
    for k,m in enumerate((76,80,83,88)):
        i=int(k*.06*SR); tt=t[:n-i]; x[i:]+=np.sin(2*np.pi*mtof(m)*tt)*np.exp(-tt/.35)
    return x*.22
def riser(d):
    n=int(d*SR); t=np.arange(n)/SR; x=rng.standard_normal(n); y=np.zeros(n)
    for i in range(0,n,2048): y[i:i+2048]=hpf(x[i:i+2048],300+6000*(i/n))
    return y*(t/d)**2*.5
def build(E):
    U=E["unit"]; b=U/2; T=E["total"]; N=int((T+.4)*SR)
    D=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    sh,det,dup,fly,done,lg=E["sheet"],E["detect"],E["dup"],E["fly"],E["done"],E["logo"]
    prog=[([64,67,71,74],40),([62,65,69,72],38),([60,64,67,71],36),([59,62,66,69],35)]  # Em9 Dm9 Cmaj9 Bm7b5
    bar=4*b; nbar=int(T/bar)+1
    for B in range(nbar):
        t0=B*bar; ch,root=prog[B%4]
        add(M,pad([m+12 for m in ch],bar),t0,1)
        if t0>=det-1e-6: add(M,sub(root,bar*.48),t0,1); add(M,sub(root,bar*.24),t0+bar*.62,.9)
        for k in range(16):  # بريك بيت: كيك 0 و2.5، سنير 1 و3 (بالضربات)
            t=t0+k*b/4
            if t0<det:
                if k%4==2: add(D,hat(),t,.6)
                continue
            if t>=lg+2*bar: continue
            beat=k/4
            if beat in (0,2.5): add(D,kick(),t,1)
            if beat in (1,3): add(D,snare(),t,.9)
            if k in (7,11,14): add(D,ghost(),t,1)
            add(D,hat(),t,.9 if k%2==0 else .5)
            if k%4==0: add(D,ride(),t,1)
        if t0>=dup: add(M,epiano([m+12 for m in ch],bar*.9),t0+b*.5,1)
    for c in E["chips"]: add(FX,tick(),c,1)
    add(FX,scratch(),dup+.3,1)
    add(FX,riser(fly-dup),dup,.4)
    for f in E["flies"]: add(FX,zip_(),f,1)
    add(FX,confirm(),done,1.1)
    add(FX,riser(2*b*2),lg-4*b,.5); add(FX,confirm()*1.2,lg+.2,1)
    x=D*.8+reverb(M,2.2,.25)*.9+FX
    fo=int(1.8*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.1); return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.011*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
