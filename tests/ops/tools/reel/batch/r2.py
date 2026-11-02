await go("#/p/p01/summary"); await shot("r2_a"); print("B smart",await box(text="الملخص الذكي"),"allergy",await box(text="حساسية: البنسلين",i=1),"next",await box(text="الموعد القادم"))
await pg.evaluate("window.scrollBy(0,420)"); await pg.wait_for_timeout(600); await shot("r2_b"); print((await pg.locator("#main").inner_text())[300:900])
await go("#/patients"); await shot("r2_c"); print("B row",await box("a",text="أحمد سليمان"))
