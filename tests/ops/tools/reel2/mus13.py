# موسيقى «سينمائية/أوركسترالية» مولّدة لريل الخزنة (90bpm): أوستيناتو وتريات سريع، باد وتريات واسع، طبول تيمباني، ضربات «براام» نحاسية
# مؤثرات متزامنة: «ووش» لكل أيقونة تدخل الخزنة، صرير وانغلاق الباب، دوران المقبض بنقرات، ضربة قفل، سقوط الملف، نقر آلة كاتبة لسجل التعديلات
# الاستخدام: python3 mus13.py events.json out.wav   (events من window.EVENTS في vault.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(91)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=3.0,mix=.32):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,5000); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def saw(f,n,det): t=np.arange(n)/SR; v=1+.004*np.sin(2*np.pi*5.5*t); return sum(np.sin(2*np.pi*f*(1+det)*k*np.cumsum(v)/SR)/k for k in range(1,10))
def strings(ms,d,att=.25):
    n=int(d*SR); t=np.arange(n)/SR; x=sum(saw(mtof(m),n,dt) for m in ms for dt in (-.006,0,.006))/(3*len(ms))
    return lpf(x,2200)*np.minimum(1,t/att)*np.minimum(1,(d-t)/.25)*.35
def spic(m,d):  # سبيكاتو
    n=int(d*SR); x=(saw(mtof(m),n,0)+saw(mtof(m+12),n,.003)*.5); return lpf(x,2800)*env(n,.004,d*.35)*.22
def timp(m=38,g=1):
    n=int(1.6*SR); t=np.arange(n)/SR; f=mtof(m)*(1+.08*np.exp(-t/.05)); x=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.5)+lpf(rng.standard_normal(n),600)*np.exp(-t/.06)*.6
    return np.tanh(x*1.4)*.7*g
def braam(root=26,d=2.6):
    n=int(d*SR); t=np.arange(n)/SR; x=sum(saw(mtof(m),n,dt) for m in (root,root+12,root+19) for dt in (-.01,.01))
    x=lpf(x,900); return np.tanh(x*.5)*np.minimum(1,t/.03)*np.exp(-t/1.2)*.5
def whoosh(d=.6):
    n=int(d*SR); x=rng.standard_normal(n); y=np.zeros(n)
    for i in range(0,n,1024): y[i:i+1024]=lpf(x[i:i+1024],600+6000*np.sin(np.pi*i/n))
    return hpf(y,200)*np.sin(np.pi*np.arange(n)/n)**2*.5
def creak(d=.8):
    n=int(d*SR); t=np.arange(n)/SR; f=90+40*np.sin(2*np.pi*1.3*t); x=np.sign(np.sin(2*np.pi*np.cumsum(f)/SR))*(1+rng.standard_normal(n)*.3)
    return lpf(x,1500)*np.sin(np.pi*t/d)*.12
def clunk(): n=int(.7*SR); t=np.arange(n)/SR; x=np.sin(2*np.pi*np.cumsum(70+40*np.exp(-t/.02))/SR)*np.exp(-t/.15)+lpf(rng.standard_normal(n),2500)*np.exp(-t/.03)*.8; return np.tanh(x*1.5)*.8
def ratchet(d):
    n=int(d*SR); x=np.zeros(n)
    for k in range(int(d/.07)): i=int(k*.07*SR); c=hpf(rng.standard_normal(int(.01*SR)),2500)*np.exp(-np.arange(int(.01*SR))/SR/.002); x[i:i+len(c)]+=c
    return x*.5
def key(): n=int(.06*SR); return hpf(rng.standard_normal(n),1800)*np.exp(-np.arange(n)/SR/.008)*.35+lpf(rng.standard_normal(n),900)*np.exp(-np.arange(n)/SR/.01)*.2
def ding(): n=int(1.2*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*2600*t)*np.exp(-t/.4)*.15
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.4)*SR)
    D=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    va,close,lock,file,drop,aud,lg=(E[k] for k in ("vault","close","lock","file","drop","audit","logo"))
    prog=[(38,[50,53,57]),(34,[46,50,53]),(41,[48,53,57]),(36,[48,52,55])]  # Dm Bb F C
    nb=int(T/(4*b))+1
    for B4 in range(nb):
        t0=B4*4*b; root,ch=prog[B4%4]
        if t0>=lg+4*b: break
        add(M,strings([m+12 for m in ch],4*b,.4 if t0<va else .15),t0,1 if t0>=va else .6)
        if t0>=va:
            for s in range(16):  # أوستيناتو ستة عشر
                m=[root+24,root+24,root+31,root+24][s%4]; add(M,spic(m,b/4*.9),t0+s*b/4,1 if s%4==0 else .7)
            add(D,timp(root,.8),t0,1)
            if t0>=close: add(D,timp(root,.5),t0+2*b,1); add(D,timp(root,.4),t0+3.5*b,1)
    add(FX,braam(),va,1)
    for x in E["items"]: add(FX,whoosh(),x,1)
    add(FX,creak(),close,1); add(FX,clunk(),close+1.1*b,1)
    add(FX,ratchet(1.1*b),lock,1); add(FX,braam(26,3),lock+1.2*b,1.2); add(D,timp(38,1.2),lock+1.2*b,1)
    add(FX,whoosh(.5),file,.8); add(FX,clunk()*.6,drop+1*b,1)
    for r in E["rows"]:
        for k in range(14): add(FX,key(),r+k*1/28+rng.uniform(0,.01),.9)
        add(FX,ding(),r+.55,.6)
    add(FX,braam(29,3.2),lg,1.1); add(D,timp(41,1.2),lg,1)
    x=D*.8+reverb(M,2.6,.3)*.9+reverb(FX,1.5,.2)
    fo=int(2*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.1); return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.014*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
