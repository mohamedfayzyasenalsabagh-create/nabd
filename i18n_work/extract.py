import re, json, glob, os
AR = re.compile(r'[؀-ۿ]')
files = [f for f in glob.glob('*.js') + glob.glob('demo/seed.js') if f not in ('qrcode.js','sw.js','i18n.js','en.js')]
segs = {}
def add(t, src):
    t = t.strip()
    if not AR.search(t): return
    # split by HTML tags and by interpolations already removed
    for part in re.split(r'<[^>]*>|\$\{[^{}]*\}|\n', t):
        part = part.strip(' \t:·،,.-–—«»"\'؟?!|/*•✓✕＋+→←‹›')
        part = part.strip()
        if AR.search(part):
            segs.setdefault(part, set()).add(src)
def strip_interps(s):
    # remove nested ${...}
    out, i, depth = [], 0, 0
    while i < len(s):
        if s.startswith('${', i):
            depth = 1; i += 2; buf = []
            while i < len(s) and depth:
                c = s[i]
                if c == '{': depth += 1
                elif c == '}': depth -= 1
                if depth: buf.append(c)
                i += 1
            inner = ''.join(buf)
            scan(inner, 'interp')  # strings inside interpolations
            out.append('\x00')
        else:
            out.append(s[i]); i += 1
    return ''.join(out)
def scan(code, src):
    i = 0; n = len(code)
    while i < n:
        c = code[i]
        if code.startswith('//', i):
            j = code.find('\n', i); i = n if j < 0 else j; continue
        if code.startswith('/*', i):
            j = code.find('*/', i); i = n if j < 0 else j + 2; continue
        if c in '"\'`':
            q = c; j = i + 1; depth = 0
            while j < n:
                if code[j] == '\\': j += 2; continue
                if q == '`' and code.startswith('${', j):
                    d = 1; j += 2
                    while j < n and d:
                        if code[j] == '{': d += 1
                        elif code[j] == '}': d -= 1
                        elif code[j] in '"\'`':
                            # skip nested string
                            qq = code[j]; j += 1
                            while j < n and code[j] != qq:
                                if code[j] == '\\': j += 1
                                if qq == '`' and code.startswith('${', j):
                                    dd = 1; j += 2
                                    while j < n and dd:
                                        if code[j] == '{': dd += 1
                                        elif code[j] == '}': dd -= 1
                                        j += 1
                                    continue
                                j += 1
                        j += 1
                    continue
                if code[j] == q: break
                j += 1
            lit = code[i+1:j]
            if q == '`':
                for piece in strip_interps(lit).split('\x00'):
                    add(piece, src)
            else:
                add(lit, src)
            i = j + 1; continue
        i += 1
for f in files:
    scan(open(f, encoding='utf-8').read(), f)
out = sorted(segs, key=lambda s: (-len(s), s))
json.dump(out, open('i18n_work/segments.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(out))
from collections import Counter
print(Counter(len(s.split()) for s in out).most_common(8))
