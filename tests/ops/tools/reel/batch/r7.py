await go("#/team"); await pg.evaluate("document.querySelector('.edp').scrollIntoView({block:'center'})"); await pg.wait_for_timeout(500); await shot("r7_a"); print("B edp",await box(".edp"),"w",await box(text="وائل"))
await pg.locator(".edp").first.click(); await pg.wait_for_timeout(1000); await shot("r7_b"); print("B perms",await box(text="الصلاحيات"),"med",await box(text="السجل الطبي"))
await pg.get_by_text("السجل الطبي").last.scroll_into_view_if_needed(); await pg.wait_for_timeout(500); await shot("r7_c"); print("B med2",await box(text="لا يطّلع عليه"),"save",await box(".modal-wrap .ok"))
