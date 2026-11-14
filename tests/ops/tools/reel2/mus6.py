# موسيقى «سينث ويف» مولّدة لريل الشاشة المنقسمة (105bpm): كيك وسنير مبوّب بصدى، أربيجيو سو، باد واسع، بيس ثُماني
# مؤثرات متزامنة: «بيب» نظيف لكل إشعار نبض، خدش ورقي لكل ملصق، انهيار نغمي (تايب-ستوب) عند لحظة النفاد، ثم صعود واسع للانتصار
# الاستخدام: python3 mus6.py events.json out.wav   (events من window.EVENTS في split.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(21)
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def mtof(m): return 440*2**((m-69)/12)
def lpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def hpf(x,c): X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1-1/(1+(f/c)**4); return np.fft.irfft(X,len(x))
def reverb(x,dec=2.4,mix=.3):
    n=int(dec*SR); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR*5/dec); ir=lpf(ir,6000); ir/=np.sqrt((ir**2).sum())
    y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)]; return x*(1-mix)+y*mix*3
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def saw(f,n,det=0): t=np.arange(n)/SR; return sum(np.sin(2*np.pi*f*(1+det)*k*t)/k for k in range(1,14))*.55
def kick():
    n=int(.45*SR); t=np.arange(n)/SR; f=45+110*np.exp(-t/.03); return np.tanh(np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.28)*1.8)
def snare():  # سنير مبوّب بطابع الثمانينات
    n=int(.4*SR); t=np.arange(n)/SR; x=hpf(lpf(rng.standard_normal(n),8000),900)*.9+np.sin(2*np.pi*200*t)*np.exp(-t/.04)*.5
    gate=(t<.22).astype(float)*np.exp(-t/.5); return reverb(x*gate,1.0,.4)*.75
def hat(): n=int(.05*SR); return hpf(rng.standard_normal(n),9000)*env(n,.0005,.015)*.35
def arp(m,d): n=int(d*SR); return lpf(saw(mtof(m),n)+saw(mtof(m),n,.006),2600)*env(n,.002,.09)*.22
def pad(ms,d):
    n=int(d*SR); x=sum(saw(mtof(m),n,-.004)+saw(mtof(m),n,.004) for m in ms)/len(ms); t=np.arange(n)/SR
    return lpf(x,1400)*np.minimum(1,t/.4)*np.minimum(1,(d-t)/.3)*.22
def bass(m,d): n=int(d*SR); return lpf(saw(mtof(m),n),700)*env(n,.003,d*.6)*.6
def beep(): n=int(.4*SR); t=np.arange(n)/SR; x=np.sin(2*np.pi*1760*t)*(t<.08)+np.sin(2*np.pi*2349*t)*(t>=.1)*(t<.2); return x*env(n,.002,.3)*.28
def scribble():
    n=int(.45*SR); t=np.arange(n)/SR; x=lpf(hpf(rng.standard_normal(n),1500),5000)*(.5+.5*np.sign(np.sin(2*np.pi*14*t)))
    return x*np.sin(np.pi*t/t[-1])*.35
def tapestop(x):  # إبطاء حتى التوقف
    n=len(x); r=np.linspace(1,0.05,n); idx=np.cumsum(r); idx=idx[idx<n-1].astype(int); return x[idx]*np.linspace(1,0,len(idx))
def riser(d):
    n=int(d*SR); t=np.arange(n)/SR; x=rng.standard_normal(n); y=np.zeros(n)
    for i in range(0,n,2048): y[i:i+2048]=hpf(x[i:i+2048],300+7000*(i/n))
    return y*(t/d)**2*.5
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.4)*SR)
    D=np.zeros(N); M=np.zeros(N); FX=np.zeros(N)
    tit,bad,win,lg=E["title"],E["bad"],E["win"],E["logo"]
    prog=[([57,60,64],45),([53,57,60],41),([48,52,55],36),([55,59,62],43)]  # Am F C G
    nb=int(T/b)+1
    for k in range(nb):
        t=k*b; bar=k//4; ch,root=prog[bar%4]
        quiet=t<tit or (bad<=t<win)
        if bad<=t<win: continue  # الصمت يُملأ بالتايب-ستوب
        if not quiet or t<tit:
            if t>=tit: add(D,kick(),t,1);
            if t>=tit and k%2==1: add(D,snare(),t,.9)
            for h in (0,.5): add(D,hat(),t+h*b,.8 if t>=tit else .4)
            for h in (0,.5): add(M,bass(root,.45*b),t+h*b,.9 if t>=tit else .4)
            for s in range(4):  # أربيجيو سادس عشر
                add(M,arp(ch[s%3]+12+(12 if s==3 else 0),.25*b),t+s*b/4,1 if t>=tit else .6)
        if k%4==0: add(M,pad([m+12 for m in ch],4*b),t,1)
    # تايب-ستوب للمقطع السابق عند النفاد
    i0=int((bad-2*b)*SR); i1=int(bad*SR); seg=(D+M)[i0:i1].copy(); ts=tapestop(seg)
    D[i1:]*=1; add(FX,ts,bad,1.0)
    add(FX,lpf(rng.standard_normal(int(2*b*SR)),300)*np.exp(-np.arange(int(2*b*SR))/SR/.5)*.6,bad,1)
    for e in E["events"]: add(FX,beep(),e+.5,1); add(FX,scribble(),e+.45,.8)
    add(FX,riser(win-bad-.1),bad+.1,.6)
    for m in (69,72,76,81): add(M,pad([m],4*b)*1.4,win,1)
    add(FX,riser(3*b),lg-3*b,.5)
    x=D*.85+reverb(M,2.0,.22)*.85+FX
    fo=int(1.8*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    x=np.tanh(x*1.1); return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.012*SR))*.96],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
