# موسيقى «بوسا نوفا» مولّدة لريل لوحة المطار (120bpm): غيتار نايلون بإيقاع البوسا المزاح، كلافي ريمشوت، بيس على الأساس والخامسة، شيكر ناعم
# مؤثرات متزامنة: طقطقة الخانات القلّابة عند كل تغيير (رشقة نقرات قصيرة)، و«دينغ دونغ» إعلان مطار عند دخول اللوحة والختام
# الاستخدام: python3 mus12.py events.json out.wav   (events من window.EVENTS في flap.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(81)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=1.8,mix=.2):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,5000); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def nylon(m,d):
    n=int(d*SR); f=mtof(m); p=max(2,int(SR/f)); buf=lpf(np.tile(rng.uniform(-1,1,p),4),2500)[:p]; out=np.zeros(n)
    for i in range(n): out[i]=buf[i%p]; buf[i%p]=.5*(buf[i%p]+buf[(i+1)%p])*.996
    return lpf(out,3500)
def chord(ms,d): x=sum(nylon(m,d) for m in ms)/len(ms); return x*.6
def bass(m,d): n=int(d*SR); t=np.arange(n)/SR; return lpf(np.sin(2*np.pi*mtof(m)*t)+.25*np.sin(2*np.pi*mtof(m)*2*t),500)*env(n,.008,d*.6)*.55
def rim(): n=int(.08*SR); t=np.arange(n)/SR; return (np.sin(2*np.pi*1800*t)*.6+hpf(rng.standard_normal(n),2500)*.4)*np.exp(-t/.012)*.4
def kick(): n=int(.25*SR); t=np.arange(n)/SR; f=55+60*np.exp(-t/.03); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.15)*.55
def shaker(): n=int(.09*SR); return hpf(rng.standard_normal(n),6000)*env(n,.015,.025)*.16
def clack():  # رشقة نقرات الخانة القلّابة
    n=int(.42*SR); x=np.zeros(n)
    for k in range(7):
        i=int((k*.06+rng.uniform(0,.01))*SR); c=hpf(rng.standard_normal(int(.008*SR)),2500)*np.exp(-np.arange(int(.008*SR))/SR/.002)
        c=c+np.sin(2*np.pi*3100*np.arange(len(c))/SR)*.3*np.exp(-np.arange(len(c))/SR/.002); x[i:i+len(c)]+=c*(1-k*.08)
    return x*.35
def chime():  # «دينغ دونغ» إعلان مطار
    n=int(1.8*SR); x=np.zeros(n)
    for k,m in enumerate((76,72)):
        i=int(k*.45*SR); tt=np.arange(n-i)/SR; f=mtof(m); x[i:]+=(np.sin(2*np.pi*f*tt)+.3*np.sin(2*np.pi*f*2*tt))*np.exp(-tt/.9)*np.minimum(1,tt/.005)
    return x*.22
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.4)*SR)
    D=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    # Dm9 G13 Cmaj9 A7b9 (تسلسل بوسا كلاسيكي)
    prog=[(50,[53,57,60,64]),(43,[53,59,64,65]),(48,[52,55,59,62]),(45,[55,58,61,64])]
    # نمط البوسا على ثُمانيات مازورتين (16 ثُمن): مواضع الكورد
    pat=[0,3,6,10,13]; clave=[0,3,6,10,12]
    e=b/2; nbar=int(T/(4*b))+1; board,lg=E["board"],E["logo"]
    for B2 in range(0,nbar,2):
        t0=B2*4*b
        for half in range(2):
            root,ch=prog[(B2+half)%4]; tb=t0+half*4*b
            if tb>=lg+4*b: break
            add(M,bass(root-12,1.4*b),tb,1); add(M,bass(root-5,1.4*b),tb+2*b,.9)
            add(D,kick(),tb,.7); add(D,kick(),tb+1.5*b,.4); add(D,kick(),tb+2*b,.6); add(D,kick(),tb+3.5*b,.4)
        for s in range(16):
            t=t0+s*e
            if t>=lg+4*b: break
            root,ch=prog[(B2+(s//8))%4]
            if s in pat: add(M,chord([m+12 for m in ch],.9*e*2),t,1 if t>=board else .6)
            if t>=board and s in clave: add(D,rim(),t,1)
            add(D,shaker(),t,.8 if s%2 else .5)
    add(FX,chime(),board-.3,1)
    for f in E["flips"]: add(FX,clack(),f,.5)
    add(FX,chime(),lg,1)
    x=D*.85+reverb(M,1.6,.2)*.95+FX
    fo=int(1.8*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.1); return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.012*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
