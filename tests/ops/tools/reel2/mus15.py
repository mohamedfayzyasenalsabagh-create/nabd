# موسيقى «ماريمبا وبيانو ألعاب» مولّدة لريل الطباشير الملونة (120bpm): ماريمبا بأربيجيو مرح، بيانو ألعاب للّحن، طبول خفيفة بأصابع وتصفيق صغير
# مؤثرات متزامنة: «بوب» لكل محطة (نغمة صاعدة للمكتمل، نغمتان للمستحق، نغمة متنافرة للمتأخر)، جرس للتنبيه، ورق للبطاقة، صفّارة صاعدة للنمو
# الاستخدام: python3 mus15.py events.json out.wav   (events من window.EVENTS في crayon.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(111)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=1.3,mix=.18):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,6000); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def marimba(m,d=.5):
    n=int(d*SR); t=np.arange(n)/SR; f=mtof(m); x=np.sin(2*np.pi*f*t)*np.exp(-t/.25)+.35*np.sin(2*np.pi*f*4*t)*np.exp(-t/.03)+.15*np.sin(2*np.pi*f*10*t)*np.exp(-t/.008)
    return x*np.minimum(1,t/.001)*.28
def toy(m,d=.6):
    n=int(d*SR); t=np.arange(n)/SR; f=mtof(m); x=np.sin(2*np.pi*f*t)+.5*np.sin(2*np.pi*f*2.97*t)*np.exp(-t/.06)+.2*np.sin(2*np.pi*f*5.1*t)*np.exp(-t/.02)
    return x*env(n,.001,.22)*.2
def bass(m,d): n=int(d*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*mtof(m)*t)*env(n,.005,d*.5)*.5
def kick(): n=int(.22*SR); t=np.arange(n)/SR; f=60+80*np.exp(-t/.02); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.1)*.6
def snap(): n=int(.12*SR); t=np.arange(n)/SR; return hpf(rng.standard_normal(n),2000)*np.exp(-t/.02)*.4
def shaker(): n=int(.07*SR); return hpf(rng.standard_normal(n),6000)*env(n,.01,.02)*.15
def pop(ms):
    x=np.zeros(int(.6*SR))
    for k,m in enumerate(ms): s=toy(m,.5); i=int(k*.07*SR); x[i:i+len(s)]+=s[:len(x)-i]
    return x*1.6
def bell(): n=int(1.4*SR); t=np.arange(n)/SR; return sum(np.sin(2*np.pi*f*t)*np.exp(-t/d) for f,d in ((1568,.6),(2349,.4),(3136,.25)))*.12
def paper(d=.3): n=int(d*SR); return hpf(lpf(rng.standard_normal(n),7000),1500)*np.sin(np.pi*np.arange(n)/n)*.3
def slide(d=1.2): n=int(d*SR); t=np.arange(n)/SR; f=400*2**(2*t/d); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.sin(np.pi*t/d)*.15
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.4)*SR)
    D=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    road,lg=E["road"],E["logo"]
    prog=[(48,[60,64,67]),(53,[60,65,69]),(55,[59,62,67]),(48,[60,64,67])]  # C F G C
    mel=[72,74,76,79,76,74,72,None, 74,76,77,81,79,77,76,None]
    nb=int(T/b)+1
    for k in range(nb):
        t=k*b
        if t>=lg+4*b: break
        bar=k//4; root,ch=prog[bar%4]
        for s in range(4): add(M,marimba([ch[0],ch[1],ch[2],ch[1]+12][s]+12,.4),t+s*b/4,.9 if t>=road else .6)
        if k%2==0: add(M,bass(root-12,b*.9),t,1)
        if t>=road:
            add(D,kick(),t,1 if k%2==0 else .5)
            if k%2==1: add(D,snap(),t,1)
            add(D,shaker(),t+b/2,1)
            m=mel[(2*k)%16]
            if m and t>=E["alert"]: add(M,toy(m),t,1);
            m2=mel[(2*k+1)%16]
            if m2 and t>=E["alert"]: add(M,toy(m2),t+b/2,.8)
    for t,s in zip(E["stops"],E["states"]):
        if s=="done": add(FX,pop([79,84]),t,1)
        elif s=="soon": add(FX,pop([79,83,86]),t,1)
        elif s=="late": add(FX,pop([78,77]),t,1)
        else: add(FX,pop([72]),t,.6)
    add(FX,bell(),E["alert"],1); add(FX,paper(),E["vcard"],1); add(FX,slide(),E["grow"]+.2,1)
    add(FX,pop([72,76,79,84]),lg+.2,1)
    x=D*.85+reverb(M,1.2,.16)*.95+FX
    fo=int(1.8*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.1); return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.011*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
