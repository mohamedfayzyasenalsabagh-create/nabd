# موسيقى أصلية مولّدة بـ numpy لريلات نبض. الاستخدام: python3 mus.py STYLE SECONDS out.wav
# STYLE: 0 pop-house · 1 lo-fi · 2 شرقي (حجاز) · 3 corporate · 4 synthwave · 5 marimba
import sys, wave, numpy as np
SR=44100
def env(n,a=.005,r=.3):
    t=np.arange(n)/SR; e=np.minimum(1,t/a)*np.exp(-t/r); return e
def tone(f,d,kind="sine",a=.005,r=.3):
    n=int(d*SR); t=np.arange(n)/SR
    if kind=="sine": w=np.sin(2*np.pi*f*t)
    elif kind=="saw": w=2*((f*t)%1)-1
    elif kind=="square": w=np.sign(np.sin(2*np.pi*f*t))*.6
    elif kind=="marimba": w=np.sin(2*np.pi*f*t)+.35*np.sin(2*np.pi*f*4*t)*np.exp(-t/.04)
    elif kind=="pluck": w=np.sin(2*np.pi*f*t)+.5*np.sin(2*np.pi*2*f*t)+.25*np.sin(2*np.pi*3*f*t)
    elif kind=="pad": w=sum(np.sin(2*np.pi*f*k*t+k)/k for k in (1,2,3))*.6+np.sin(2*np.pi*f*1.004*t)*.4
    return w*env(n,a,r)
def kick(): n=int(.35*SR); t=np.arange(n)/SR; f=50+90*np.exp(-t/.04); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.16)
def snare(): n=int(.25*SR); t=np.arange(n)/SR; return (np.random.randn(n)*.6+np.sin(2*np.pi*190*t)*.4)*np.exp(-t/.07)
def hat(o=False): n=int((.18 if o else .05)*SR); x=np.random.randn(n); x=np.diff(x,prepend=0); return x*np.exp(-np.arange(n)/SR/(.06 if o else .015))*.35
def mtof(m): return 440*2**((m-69)/12)
def add(buf,x,t,g=1.0):
    i=int(t*SR); j=min(len(buf),i+len(x))
    if i<len(buf): buf[i:j]+=x[:j-i]*g
STY=[dict(bpm=122,prog=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]],lead="pluck",bass="saw",pad="pad",drums="house"),
     dict(bpm=80,prog=[[50,53,57,60],[55,59,62,65],[48,52,55,59],[57,60,64,67]],lead="sine",bass="sine",pad="pad",drums="lofi"),
     dict(bpm=100,prog=[[50,54,57],[51,55,58],[50,54,57],[48,51,55]],lead="pluck",bass="sine",pad="pad",drums="maqsum",scale=[50,51,54,55,57,58,60,62]),
     dict(bpm=110,prog=[[48,52,55],[55,59,62],[57,60,64],[53,57,60]],lead="pluck",bass="sine",pad="pad",drums="corp"),
     dict(bpm=105,prog=[[57,60,64],[53,57,60],[55,59,62],[52,55,59]],lead="saw",bass="saw",pad="pad",drums="synth"),
     dict(bpm=112,prog=[[48,52,55],[57,60,64],[53,57,60],[55,59,62]],lead="marimba",bass="sine",pad="pad",drums="light")]
def song(style,dur,seed=7):
    np.random.seed(seed+style); S=STY[style]; bpm=S["bpm"]; b=60/bpm; n=int((dur+1)*SR)
    L=np.zeros(n); D=np.zeros(n); B=np.zeros(n); Pd=np.zeros(n)
    beats=int(dur/b)+2
    for k in range(beats):
        t=k*b; bar=k//4; ch=S["prog"][bar%len(S["prog"])]
        dr=S["drums"]
        if dr in("house","synth","corp"):
            add(D,kick(),t,.9)
            if k%2==1: add(D,snare(),t,.45)
            add(D,hat(dr=="house"),t+b/2,.6)
        elif dr=="lofi":
            if k%4 in(0,2): add(D,kick(),t+(.02 if k%4==2 else 0),.8)
            if k%4 in(1,3): add(D,snare(),t+.03,.35)
            add(D,hat(),t,.3); add(D,hat(),t+b*.58,.25)
        elif dr=="maqsum":
            pat={0:"D",.5:"T",1.5:"T",2:"D",3:"T"}
            pos=k%4
            for o,v in pat.items():
                if int(o)==pos: add(D,kick() if v=="D" else hat(True)*1.5,t+(o-int(o))*b,.7 if v=="D" else .5)
        elif dr=="light":
            if k%2==0: add(D,kick(),t,.55)
            add(D,hat(),t+b/2,.35)
        if k%4==0:
            for m in ch: add(Pd,tone(mtof(m),b*4,S["pad"],a=.4,r=2.5),t,.10)
            add(B,tone(mtof(ch[0]-24),b*1.8,S["bass"],r=.5),t,.32)
            add(B,tone(mtof(ch[0]-24),b*1.8,S["bass"],r=.5),t+2*b,.28)
        # لحن: نغمات من الوتر أو المقام
        sc=S.get("scale")
        for h in range(2):
            if np.random.rand()<.75:
                m=(np.random.choice(sc)+12 if sc else np.random.choice(ch)+12+12*(np.random.rand()<.3))
                add(L,tone(mtof(m),b*.6,S["lead"],r=.18 if S["lead"]!="saw" else .12),t+h*b/2,.16 if S["lead"]!="saw" else .07)
    x=L+D*.8+B+Pd
    # تلاشي في البداية والنهاية
    fi=int(.3*SR); fo=int(1.2*SR); x[:fi]*=np.linspace(0,1,fi); x=x[:int(dur*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.2); x=x/np.max(np.abs(x))*0.80
    return x
if __name__=="__main__":
    st=int(sys.argv[1]); d=float(sys.argv[2]); out=sys.argv[3]
    x=song(st,d); st2=np.stack([x,np.roll(x,int(.012*SR))*.96],1)
    w=wave.open(out,"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st2*32767).astype(np.int16).tobytes()); w.close(); print("ok",out)
