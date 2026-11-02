await shot("r10_a"); print("B next",await box(text="موعدك القادم"),"meds",await box(text="أدوية اليوم"))
await go("#/meds"); await shot("r10_b"); print("B times",await box(".btn",text="اختر أوقاتي"),"rem",await box(text="تفعيل تذكير الأدوية"))
await pg.locator(".btn",has_text="اختر أوقاتي").first.click(); await pg.wait_for_timeout(1000); await shot("r10_c"); print((await pg.locator(".modal-wrap").last.inner_text())[:300] if await pg.locator(".modal-wrap").count() else "nomodal")
