await go("#/team"); await pg.locator(".edp").first.click(); await pg.wait_for_timeout(1000)
await pg.evaluate("(()=>{const el=[...document.querySelectorAll('.modal-wrap *')].find(e=>e.children.length===0&&e.textContent.trim()==='السجل الطبي');el.scrollIntoView({block:'center'})})()"); await pg.wait_for_timeout(600)
await shot("r7_c"); print("B med",await box(text="لا يطّلع عليه"), await box(".modal-wrap select"))
