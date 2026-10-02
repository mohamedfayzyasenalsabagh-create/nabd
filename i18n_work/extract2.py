import re, json, glob
files=[f for f in glob.glob('*.js')+['demo/seed.js','index.html','demo/index.html'] if f not in ('qrcode.js','sw.js','i18n.js','en.js')]
AR=re.compile('[ء-ي]')
segs=set()
for f in files:
    src=open(f,encoding='utf-8').read()
    src=re.sub(r'(?m)^\s*//.*$','',src)
    src=re.sub(r'(?m)(?<=[\s;,)])//\s[^\n]*$','',src)
    src=re.sub(r'/\*.*?\*/','',src,flags=re.S)
    src=re.sub(r'<!--.*?-->','',src,flags=re.S)
    for m in re.finditer(r'[^"\'`<>{}\n$|]+',src):
        t=m.group(0)
        if not AR.search(t): continue
        t=t.strip(' \t:·،,.-–—«»؟?!/*•✓✕＋+→←‹›=;')
        t=t.strip()
        if AR.search(t) and len(t)<600: segs.add(t)
d=json.load(open('i18n_work/en_all.json',encoding='utf-8')); d.update(json.load(open('i18n_work/extra.json',encoding='utf-8')))
miss=sorted(s for s in segs if s not in d)
json.dump(miss,open('i18n_work/miss.json','w',encoding='utf-8'),ensure_ascii=False,indent=0)
print(len(segs),len(miss))
import random; random.seed(2); print(random.sample(miss,min(30,len(miss))))
