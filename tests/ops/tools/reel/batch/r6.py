await go("#/closing"); await shot("r6_a"); print("B in",await box(text="المقبوض"),"cash",await box(text="نقداً في الصندوق"),"print",await box(".btn",text="طباعة"))
await pg.evaluate("window.scrollBy(0,430)"); await pg.wait_for_timeout(500); await shot("r6_b"); print("B by",await box(text="حسب طريقة الدفع"))
await pg.evaluate("window.scrollBy(0,500)"); await pg.wait_for_timeout(500); await shot("r6_c"); print((await pg.locator("#main").inner_text())[300:900])
