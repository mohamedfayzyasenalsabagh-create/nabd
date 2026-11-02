await go("#/p/p01/rx"); await pg.locator(".add").first.click(); await pg.wait_for_timeout(1500); await shot("r9_a")
inp=pg.locator('.rx-row [data-k="drug"]').first; print("B drug",await box('.rx-row [data-k="drug"]'))
await inp.fill("Warfarin"); await inp.dispatch_event("input"); await pg.wait_for_timeout(800)
await pg.evaluate("document.querySelector('.rx-row').scrollIntoView({block:'start'})"); await pg.wait_for_timeout(300); await shot("r9_b"); print("B warn",await box(".rx-warns"),"drug2",await box('.rx-row [data-k="drug"]'))
