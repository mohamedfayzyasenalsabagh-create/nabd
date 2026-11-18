# موسيقى «تشيب تيون» 8-بت مولّدة لريل الأركيد (140bpm): موجات مربعة ومثلثية وضجيج كألعاب الفيديو القديمة
# مؤثرات متزامنة: «جاهز؟» نغمي، صوت انكسار عند الإلغاء، إنذار عند التنبيه، صعود عند الانزلاق، «باور-أب» عند ملء الفراغ، ولحن فوز
# الاستخدام: python3 mus10.py events.json out.wav   (events من window.EVENTS في arcade.html)
import sys, json, wave, numpy as np
SR=44100; rng=np.random.default_rng(61)
def mtof(m): return 440*2**((m-69)/12)
def sq(f,n,duty=.5): t=np.arange(n)/SR; return np.where((t*f)%1<duty,1.,-1.)
def tri(f,n): t=np.arange(n)/SR; return 2*np.abs(2*((t*f)%1)-1)-1
def env(n,a,r): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/r)
def add(b,x,t,g=1):
    i=int(t*SR)
    if i>=len(b) or i+len(x)<=0: return
    j=min(len(b),i+len(x)); b[max(0,i):j]+=x[max(0,-i):j-i]*g
def lead(m,d,duty=.25): n=int(d*SR); return sq(mtof(m),n,duty)*env(n,.002,d*.8)*.13
def bass(m,d): n=int(d*SR); return tri(mtof(m),n)*np.minimum(1,(d-np.arange(n)/SR)/.01)*.35
def nz(d,dec): n=int(d*SR); s=np.repeat(rng.uniform(-1,1,n//8+1),8)[:n]; return s*env(n,.001,dec)
def kick(): n=int(.12*SR); t=np.arange(n)/SR; f=180*np.exp(-t/.03)+50; return sq(1,n)*0+np.sign(np.sin(2*np.pi*np.cumsum(f)/SR))*np.exp(-t/.05)*.4
def arp_chord(ms,d,step=1/50):
    n=int(d*SR); x=np.zeros(n); k=0; i=0; s=int(step*SR)
    while i<n: f=mtof(ms[k%len(ms)]); seg=sq(f,min(s,n-i),.5); x[i:i+len(seg)]=seg; i+=s; k+=1
    return x*env(n,.003,d*.7)*.08
def sweep(f0,f1,d,duty=.5):
    n=int(d*SR); t=np.arange(n)/SR; f=f0*(f1/f0)**(t/d); ph=np.cumsum(f)/SR; return np.where(ph%1<duty,1.,-1.)*.15
def crash(): a=nz(.6,.18)*.5; a[:int(.4*SR)]+=sweep(800,80,.4)*1.2; return a
def alarm():
    n=int(1.2*SR); x=np.zeros(n)
    for k in range(4): seg=sq(mtof(81 if k%2==0 else 76),int(.15*SR),.5)*.15; i=int(k*.18*SR); x[i:i+len(seg)]+=seg
    return x
def powerup():
    x=np.concatenate([sq(mtof(m),int(.05*SR),.25) for m in (60,64,67,72,76,79,84,88,91,96)])*.16; return x
def win():
    seq=[(72,.12),(76,.12),(79,.12),(84,.36),(79,.12),(84,.6)]; return np.concatenate([lead(m,d,.5)*1.3 for m,d in seq])
def build(E):
    bpm=E["bpm"]; b=60/bpm; T=E["total"]; N=int((T+.4)*SR)
    x=np.zeros(N)
    play,cancel,alert,move,fit,end,lg=(E[k] for k in ("play","cancel","alert","move","fit","end","logo"))
    # «جاهز؟» في المقدمة: ثلاث نغمات تصاعدية ثم نغمة طويلة
    for k,m in enumerate((67,67,67,79)): add(x,lead(m,.18 if k<3 else .5,.5),k*b*1.2,1.1)
    prog=[(57,[69,72,76]),(53,[65,69,72]),(48,[67,72,76]),(55,[67,71,74])]
    mel=[76,None,79,76,74,None,72,74, 76,79,81,79,76,None,74,None]
    nb=int(T/b)+1
    for k in range(nb):
        t=k*b
        if t<play or t>=lg+4*b: continue
        dark=cancel<=t<fit  # بعد الإلغاء: لحن قلق بالدرجات الصغيرة
        bar=k//4; root,ch=prog[bar%4]
        if dark: root,ch=(45,[69,72,75]) if bar%2==0 else (44,[68,71,74])
        add(x,bass(root-12,b*.45),t,1); add(x,bass(root,b*.4),t+b/2,.8)
        if k%2==0: add(x,kick(),t,1)
        else: add(x,nz(.1,.04),t,.5)
        add(x,nz(.03,.01),t+b/2,.25)
        if k%4==0: add(x,arp_chord(ch,4*b),t,1)
        if not dark and t>=fit:
            for h in range(2):
                m=mel[(2*k+h)%16]
                if m: add(x,lead(m+12,b/2*.9),t+h*b/2,1)
        elif not dark:
            m=mel[k%16]
            if m: add(x,lead(m,b*.9),t,1)
    add(x,crash(),cancel,1.2); add(x,alarm(),alert,1)
    add(x,sweep(200,1200,fit-move,.25),move,1); add(x,powerup(),fit,1.2)
    add(x,win(),end,1); add(x,powerup(),lg,.9)
    fo=int(1.8*SR); x=x[:int(T*SR)]; x[-fo:]*=np.linspace(1,0,fo)
    # مرشح خفيف لتنعيم الحواف القاسية
    k=np.ones(3)/3; x=np.convolve(x,k,"same")
    return x/np.max(np.abs(x))*.6
if __name__=="__main__":
    E=json.load(open(sys.argv[1])); x=build(E)
    st=np.stack([x,np.roll(x,int(.008*SR))*.95],1)
    w=wave.open(sys.argv[2],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print("ok")
