await go("#/assistant"); await pg.get_by_text("تفسير التحاليل").first.click(); await pg.wait_for_timeout(1500); await shot("r8_a")
m=pg.locator("#main"); await m.locator("select").first.select_option(index=1); await m.locator("input").nth(0).fill("34")
for k,v in [("hb","9.8"),("ferritin","8"),("tsh","6.2"),("creat","0.8")]:
    await pg.evaluate("([k,v])=>{const i=[...document.querySelectorAll('#main input')].find(x=>x.name===k||x.dataset.k===k||x.id===k);i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}))}",[k,v])
await pg.wait_for_timeout(800); await shot("r8_b"); print("B hb",await box(text="منخفض ▼"))
await pg.get_by_text("eGFR:").first.scroll_into_view_if_needed(); await pg.evaluate("window.scrollBy(0,250)"); await pg.wait_for_timeout(500); await shot("r8_c"); print("B eg",await box(text="eGFR:"),"hbx",await box(text="فقر دم"))
print((await pg.locator("#main").inner_text())[-900:])
