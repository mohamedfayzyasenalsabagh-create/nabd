# يزور كل صفحات القائمة لكل دور (عربي، وإنكليزي للطبيب والمريض) ويبلّغ عن أي تنبيه خطأ أو تحميل عالق أو خطأ جافاسكربت
css=".demo-bar,.demo-banner{display:none!important}"
async def links():
    return await pg.evaluate("""[...new Set([...document.querySelectorAll('a[href^="#/"]')].map(a=>a.getAttribute('href')).filter(h=>!/logout|#\\/login|#\\/owner|#\\/signup|#\\/home|#\\/doctors/.test(h)))]""")
for role,lang in [("doctor","ar"),("secretary","ar"),("nurse","ar"),("accountant","ar"),("manager","ar"),("patient","ar"),("doctor","en"),("patient","en")]:
    await pg.goto(B+f"demo/?as={role}"); await pg.wait_for_timeout(2500)
    await pg.evaluate(f"localStorage.setItem('lang','{lang}')"); await pg.goto(B+f"demo/?as={role}&l={lang}"); await pg.wait_for_timeout(4000)
    seen=set(); queue=await links(); probs=[]
    if await pg.evaluate("location.hash")=="": queue=["#/"]+queue
    # صفحات قائمة «المزيد»
    await pg.evaluate("location.hash='#/more'"); await pg.wait_for_timeout(1500); queue+=await links()
    for h in queue:
        if h in seen or len(seen)>60: continue
        seen.add(h)
        await pg.evaluate(f"location.hash={h!r}"); await pg.wait_for_timeout(1300)
        bad=await pg.evaluate("[...document.querySelectorAll('#main .alert.bad,#main .alert.danger.err,#main .err')].map(e=>e.innerText.slice(0,60))")
        ld=await pg.evaluate("document.querySelectorAll('#main .loading').length")
        if ld: await pg.wait_for_timeout(2500); ld=await pg.evaluate("document.querySelectorAll('#main .loading').length")
        if bad or ld: probs.append(f"{h}: {bad or 'loading'}")
    print(role,lang,"pages",len(seen),"problems",len(probs), probs[:3])
await pg.evaluate("localStorage.removeItem('lang')")
