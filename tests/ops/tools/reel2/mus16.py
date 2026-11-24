# موسيقى «سوينغ جاز» مولّدة لريل الإيصال المطبوع (140bpm): بيس متمشّي، رايد بإيقاع متأرجح، فرشاة سنير، كورد بيانو جازي متقطّع
# مؤثرات متزامنة: «زززت» طابعة حرارية لكل سطر، رنّة صندوق عند الإجمالي، نقرات اختيار التقسيط، خربشة قلم التوقيع، وضربة الختم
# الاستخدام: python3 mus16.py events.json out.wav   (events من window.EVENTS في receipt.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(121)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=1.6,mix=.2):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,5000); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def upright(m,d):
    n=int(d*SR); t=np.arange(n)/SR; f=mtof(m); x=np.sin(2*np.pi*f*t)+.4*np.sin(2*np.pi*f*2*t)*np.exp(-t/.1)+.15*np.sin(2*np.pi*f*3*t)*np.exp(-t/.05)
    x[:int(.01*SR)]+=lpf(rng.standard_normal(int(.01*SR)),1200)*.5; return lpf(x,1200)*env(n,.004,d*.7)*.55
def ride(acc=1):
    n=int(.7*SR); t=np.arange(n)/SR; x=sum(np.sin(2*np.pi*f*t+rng.uniform(0,6)) for f in (3200,4370,5510,6890,8120))+hpf(rng.standard_normal(n),6000)*.8
    return x*env(n,.001,.28)*.035*acc
def brush(): n=int(.25*SR); return hpf(lpf(rng.standard_normal(n),6000),1500)*env(n,.02,.08)*.25
def kick(): n=int(.25*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*np.cumsum(50+50*np.exp(-t/.03))/SR)*np.exp(-t/.12)*.35
def piano(ms,d):
    n=int(d*SR); t=np.arange(n)/SR; x=np.zeros(n)
    for m in ms: f=mtof(m); x+=(np.sin(2*np.pi*f*t)+.5*np.sin(2*np.pi*2*f*t)*np.exp(-t/.3)+.25*np.sin(2*np.pi*3*f*t)*np.exp(-t/.15))*np.exp(-t/.8)
    return lpf(x/len(ms),4000)*np.minimum(1,t/.002)*.25
def printer(d=.35):
    n=int(d*SR); t=np.arange(n)/SR; x=np.sign(np.sin(2*np.pi*190*t))*.5+hpf(rng.standard_normal(n),2500)*.5
    return lpf(x,4500)*np.minimum(1,t/.01)*np.minimum(1,(d-t)/.02)*.18
def register():
    n=int(1.2*SR); t=np.arange(n)/SR; x=sum(np.sin(2*np.pi*f*t)*np.exp(-t/dd) for f,dd in ((2093,.5),(2637,.4),(3520,.3)))*.2
    x[:int(.05*SR)]+=hpf(rng.standard_normal(int(.05*SR)),2000)*.4; return x
def tick(): n=int(.04*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*1800*t)*np.exp(-t/.006)*.4
def scribble(d):
    n=int(d*SR); t=np.arange(n)/SR; x=hpf(lpf(rng.standard_normal(n),5000),1200)*(.5+.5*np.abs(np.sin(2*np.pi*7*t)))
    return x*np.minimum(1,t/.05)*np.minimum(1,(d-t)/.05)*.3
def thud(): n=int(.6*SR); t=np.arange(n)/SR; x=np.sin(2*np.pi*np.cumsum(70+60*np.exp(-t/.02))/SR)*np.exp(-t/.12)+lpf(rng.standard_normal(n),2000)*np.exp(-t/.03)*.6; return np.tanh(x*1.5)*.7
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.4)*SR)
    D=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    pr,lg=E["print"],E["logo"]
    # ii-V-I في فا: Gm7 C7 Fmaj7 D7
    prog=[(43,[58,62,65,69]),(48,[58,62,64,69]),(41,[57,60,64,67]),(50,[57,60,62,66])]
    walk={43:[43,46,50,49],48:[48,52,55,54],41:[41,45,48,50],50:[50,54,57,44]}
    sw=2/3  # تأرجح
    nb=int(T/b)+1
    for k in range(nb):
        t=k*b
        if t>=lg+4*b: break
        bar=k//4; root,ch=prog[bar%4]; beat=k%4
        add(M,upright(walk[root][beat]-12,b*.95),t,1 if t>=pr else .6)
        add(D,ride(1 if beat%2==0 else .8),t,1);
        if beat in (1,3): add(D,ride(.6),t+sw*b,1); add(D,brush(),t,1)
        if beat==0: add(D,kick(),t,1)
        if t>=pr and beat in (1,3) and bar%2==0: add(M,piano([m+12 for m in ch],b*.6),t+sw*b,1)
        if t>=pr and beat==0 and bar%2==1: add(M,piano([m+12 for m in ch],b*1.2),t,1)
    lines=E["lines"]
    for i,t in enumerate(lines): add(FX,printer(),t-.05,1)
    # الإجمالي: السطر الذي قبل الفاصل الأخير قبل التبويبات (تقديري: السطر رقم 4+عدد البنود)
    add(FX,register(),lines[min(len(lines)-1,len(lines)-9)],1)
    for k in range(3): add(FX,tick(),E["tab"]+k*.35*b*2,1)
    add(FX,scribble(1.6*b),E["sign"],1); add(FX,thud(),E["stamp"],1.2)
    add(M,piano([65,69,72,76,81],2.5),lg,1.2)
    x=D*.9+reverb(M,1.4,.18)*.95+FX
    fo=int(1.8*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.1); return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.012*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
