await go("#/assistant"); await shot("r3_a"); print("B sx",await box(".btn",text="من الأعراض"))
await pg.get_by_text("من الأعراض إلى التشخيص").first.click(); await pg.wait_for_timeout(1200); await shot("r3_b")
print("B chips",[await box("button.sy",text=t) for t in ["حرارة","سعال","ألم بلع"]])
for t in ["حرارة","سعال","ألم بلع"]:
    await pg.locator("button.sy",has_text=t).first.click(); await pg.wait_for_timeout(300)
await pg.wait_for_timeout(800)
el=pg.get_by_text("التهاب البلعوم العقدي").first; await el.scroll_into_view_if_needed(); await pg.evaluate("window.scrollBy(0,-140)"); await pg.wait_for_timeout(500); await shot("r3_c"); print("B res",await box(text="التهاب البلعوم العقدي"))
