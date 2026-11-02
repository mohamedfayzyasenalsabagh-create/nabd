await go("#/library"); await shot("r4_a"); print("B q",await box("#main input"))
q=pg.locator("#main input").first; await q.fill("التهاب أذن"); await q.dispatch_event("input"); await pg.wait_for_timeout(1200)
await pg.evaluate("document.querySelector('#main input').scrollIntoView({block:'start'})"); await pg.evaluate("window.scrollBy(0,-80)"); await pg.wait_for_timeout(400); await shot("r4_b"); print("B q2",await box("#main input"))
print((await pg.locator("#main").inner_text())[700:1400])
