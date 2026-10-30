# طلبات المواعيد في النسخة التجريبية: تأكيد طلب صفحة الحجز، وتثبيت طلب تطبيق المرضى (يدوياً إن كان اليوم مغلقاً)
await pg.goto(B+"demo/?as=doctor"); await pg.wait_for_selector(".stats",timeout=30000)
await pg.evaluate("localStorage.removeItem('demo-fs')"); await pg.goto(B+"demo/?as=doctor&r=2"); await pg.wait_for_selector(".stats",timeout=30000)
async def step(label):
    await pg.evaluate("location.hash='#/requests'"); await pg.wait_for_timeout(2000)
    b=pg.locator(f"button:has-text('{label}')")
    if await b.count()==0: print(label,"NOT FOUND"); return
    await b.first.click(); await pg.wait_for_timeout(1500)
    if label=="تثبيت موعد":
        sl=pg.locator(".modal button:has-text('11:00 ص')")
        if await sl.count(): await sl.first.click()
        else:
            tm=pg.locator(".modal input[type=time]")
            print(" (closed day -> manual time)", await tm.count())
            if await tm.count(): await tm.first.fill("11:00")
        await pg.wait_for_timeout(300)
    ok=pg.locator(".modal .ok").last
    if await ok.count(): await ok.click(force=True); await pg.wait_for_timeout(3000)
    m=await pg.evaluate("[...document.querySelectorAll('.modal')].map(x=>x.innerText.slice(0,120).replace(/\\n/g,' | '))")
    t=await pg.evaluate("[...document.querySelectorAll('.toast')].map(t=>t.innerText)")
    print(label,"-> modals:",m,"toasts:",t)
    await pg.evaluate("document.querySelectorAll('.modal-wrap').forEach(w=>w.remove())")
await step("تأكيد الموعد")
await step("تثبيت موعد")
await pg.evaluate("location.hash='#/requests'"); await pg.wait_for_timeout(2000)
print("requests now:", (await pg.evaluate("document.querySelector('main')?.innerText||''"))[:200].replace("\n"," | "))
await pg.evaluate("localStorage.removeItem('demo-fs')")
