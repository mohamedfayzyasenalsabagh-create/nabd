await go("#/"); await shot("r1_a"); print("B a_call",await box(".btn",text="استدعاء الدور"))
await go("#/tv"); await shot("r1_b"); print("B b_num",await box(text="الدور الحالي"), "b_btn",await box(".btn",text="استدعاء الدور التالي"), "b_tv",await box(".btn",text="تشغيل على التلفاز"))
await pg.locator(".btn",has_text="استدعاء الدور التالي").first.click(); await pg.wait_for_timeout(1500); await shot("r1_c")
