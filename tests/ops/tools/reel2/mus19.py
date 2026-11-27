# موسيقى «تشيل ستيب» مولّدة لريل جهاز المراقبة (72bpm، إحساس نصف سرعة): كيك بنبضة قلب مزدوجة، سنير واسع بصدى، باد حالم، ووبل بيس ناعم، أجراس مراقبة
# مؤثرات متزامنة: «بيب» جهاز المراقبة مع كل نبضة، «سويش» إرسال القراءة من الجوال ثم «بلينغ» وصولها، وصعود قبل الشعار
# الاستخدام: python3 mus19.py events.json out.wav   (events من window.EVENTS في monitor.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(151)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=3.2,mix=.35):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,5000); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def heart():  # «لُب-دَب»
    out=np.zeros(int(.6*SR))
    for d,g in ((0,1),(.16,.7)):
        n=int(.3*SR); t=np.arange(n)/SR; x=np.sin(2*np.pi*np.cumsum(45+70*np.exp(-t/.02))/SR)*np.exp(-t/.1); i=int(d*SR); out[i:i+n]+=np.tanh(x*1.6)*g
    return out*.6
def snare():
    n=int(.5*SR); t=np.arange(n)/SR; x=hpf(lpf(rng.standard_normal(n),7000),900)*np.exp(-t/.12)+np.sin(2*np.pi*180*t)*np.exp(-t/.05)*.6
    return x*.6
def hat(): n=int(.05*SR); return hpf(rng.standard_normal(n),9000)*env(n,.0004,.012)*.22
def pad(ms,d):
    n=int(d*SR); t=np.arange(n)/SR; x=sum(sum(np.sin(2*np.pi*mtof(m)*k*(1+.003*s)*t)/k for k in (1,2,3)) for m in ms for s in (-1,1))
    return lpf(x/len(ms),1500)*np.minimum(1,t/.8)*np.minimum(1,(d-t)/.6)*.05
def wob(m,d,rate):
    n=int(d*SR); t=np.arange(n)/SR; f=mtof(m); x=sum(np.sin(2*np.pi*f*k*t)/k for k in range(1,8))
    y=np.zeros(n); lfo=.5-.5*np.cos(2*np.pi*rate*t)
    for i in range(0,n,512): y[i:i+512]=lpf(x[i:i+512],float(150+900*lfo[i]))
    return np.tanh(y*1.6)*np.minimum(1,t/.02)*np.minimum(1,(d-t)/.05)*.45
def beep(): n=int(.15*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*1046*t)*(t<.09)*np.exp(-t/.08)*.16
def swoosh(): n=int(.35*SR); t=np.arange(n)/SR; x=hpf(lpf(rng.standard_normal(n),7000),1200)*np.sin(np.pi*t/t[-1])**2; return x*.35
def bling(): n=int(1.0*SR); t=np.arange(n)/SR; return sum(np.sin(2*np.pi*f*t)*np.exp(-t/dd) for f,dd in ((1568,.4),(2093,.3)))*.14
def riser(d):
    n=int(d*SR); t=np.arange(n)/SR; x=rng.standard_normal(n); y=np.zeros(n)
    for i in range(0,n,2048): y[i:i+2048]=hpf(x[i:i+2048],300+6000*(i/n))
    return y*(t/d)**2*.4
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.4)*SR)
    D=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    mon,til,lg=E["monitor"],E["tiles"],E["logo"]
    prog=[(45,[57,60,64,67]),(41,[57,60,65,69]),(48,[55,60,64,67]),(43,[55,59,62,67])]  # Am7 Fmaj7 C G
    bar=4*b; nbar=int(T/bar)+1
    for B4 in range(nbar):
        t0=B4*bar; root,ch=prog[B4%4]
        if t0>=lg+bar: break
        add(M,pad([m+12 for m in ch],bar),t0,1)
        if t0>=mon:
            add(D,snare(),t0+2*b,1)
            for k in range(8): add(D,hat(),t0+k*b/2,1 if k%2==0 else .5)
            if t0>=E["reads"][1]: add(M,wob(root-12,1.9*b,2/b if B4%2 else 1/b),t0,1); add(M,wob(root-12,1.9*b,1/b),t0+2*b,.9)
    for t in E["beats"]: add(D,heart(),t,1); add(FX,beep(),t+.12,1)
    for t in E["reads"]: add(FX,swoosh(),t+.12,1); add(FX,bling(),t+.48,1)
    add(FX,bling()*1.3,til+.3,1); add(FX,riser(2*b),lg-2*b,1); add(FX,bling()*1.4,lg+.2,1)
    x=D*.85+reverb(M,2.6,.3)*.95+reverb(FX,1.2,.2)
    fo=int(2*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.1); return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.013*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
