#!/bin/bash
# تجهيز أدوات نبض بعد أي إعادة ضبط للبيئة: ينسخ الأدوات إلى scratchpad ويثبّت خطوط IBM Plex Sans Arabic وReem Kufi محلياً
set -e
REPO=/home/claude/nabd
W=${SCRATCH:-$(ls -td /tmp/claude-0/*/*/scratchpad 2>/dev/null | head -1)}
[ -z "$W" ] && W=/home/claude/work
mkdir -p "$W"; cd "$W"
cp -r $REPO/tests/ops/tools/*.py . 2>/dev/null || true
cp -r $REPO/tests/ops/tools/reel $REPO/tests/ops/tools/post . 2>/dev/null || true
if [ ! -f nfonts.css ]; then
  mkdir -p fnt_npm fntfiles && (cd fnt_npm && npm init -y >/dev/null && npm i --no-audit --no-fund @fontsource/ibm-plex-sans-arabic @fontsource/reem-kufi >/dev/null 2>&1)
  cp fnt_npm/node_modules/@fontsource/ibm-plex-sans-arabic/files/*.woff2 fnt_npm/node_modules/@fontsource/reem-kufi/files/*.woff2 fntfiles/
  python3 - <<'PY'
import os
out=[]
for f in sorted(os.listdir("fntfiles")):
    if not f.endswith(".woff2") or "-normal" not in f: continue
    fam="IBM Plex Sans Arabic" if f.startswith("ibm") else "Reem Kufi"
    w=f.split("-")[-2]
    rng="U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF,U+200C-200E" if "-arabic-" in f else "U+0000-00FF,U+2000-206F,U+20AC"
    if "-arabic-" not in f and "-latin-" not in f: continue
    out.append(f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:normal;src:url(/fnt/{f}) format('woff2');unicode-range:{rng}}}")
open("nfonts.css","w").write("\n".join(out))
PY
fi
pip list 2>/dev/null | grep -qi "^playwright " || pip install --break-system-packages -q playwright
python3 -c "import qrcode,openpyxl" 2>/dev/null || pip install --break-system-packages -q qrcode pillow openpyxl
echo "TOOLS=$W"
