import json
d=json.load(open('i18n_work/en_all.json',encoding='utf-8'))
extra=json.load(open('i18n_work/extra.json',encoding='utf-8')) if __import__('os').path.exists('i18n_work/extra.json') else {}
d.update(extra)
# drop keys that start with '>' artifacts duplicates
open('en.js','w',encoding='utf-8').write('// الترجمة الإنكليزية (تُولَّد من i18n_work)\nexport const EN = '+json.dumps(d,ensure_ascii=False,indent=0)+';\n')
print(len(d))
