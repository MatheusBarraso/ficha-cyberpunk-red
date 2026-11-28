import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403
sys.argv=['x','ok']

async def run(p, nome, vp, mobile=False):
    ctx = await p.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile, user_agent=('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36' if mobile else None))
    await ctx.route('**/*', handler)
    errs=[]
    pg = await ctx.new_page()
    pg.on('pageerror', lambda e: errs.append('ERR '+str(e)[:200]))
    pg.on('console', lambda m: m.type in ('error','warning') and 'blocked by Playwright' not in m.text and errs.append(m.type+' '+m.text[:200]))
    await pg.goto('https://ficha.test/index.html#u=gm&login=1'); await pg.wait_for_timeout(1500)
    await pg.click('.sk-escolha.player'); await pg.wait_for_timeout(300)
    await pg.evaluate("document.querySelector('#comu .cm-bar button[title*=ficha], #comu .cm-bar .cm-btn')"); 
    await pg.evaluate("[...document.querySelectorAll('#comu .cm-bar .cm-btn')].find(b=>/Ficha/i.test(b.textContent)).click()"); await pg.wait_for_timeout(800)
    for i in range(6):
        await pg.evaluate(f"showPage({i})"); await pg.wait_for_timeout(900)
        await pg.screenshot(path=f'tests/saida/smk_{nome}_{i}.png')
    # digita num campo da ficha e confere se salvou
    await pg.evaluate("showPage(0)"); await pg.wait_for_timeout(400)
    await pg.evaluate("(()=>{const e=document.querySelector('[data-f=\"NOME\"]');e.value='Teste Smoke';e.dispatchEvent(new Event('input',{bubbles:true}))})()"); await pg.wait_for_timeout(1500)
    salvo = await pg.evaluate("JSON.stringify(Object.keys(localStorage).filter(k=>!k.startsWith('fake')).map(k=>[k,(localStorage.getItem(k)||'').includes('Teste Smoke')]))")
    await pg.reload(); await pg.wait_for_timeout(1500)
    await pg.click('.sk-escolha.player'); await pg.wait_for_timeout(300)
    await pg.evaluate("[...document.querySelectorAll('#comu .cm-bar .cm-btn')].find(b=>/Ficha/i.test(b.textContent)).click()"); await pg.wait_for_timeout(600)
    volta = await pg.evaluate("document.querySelector('[data-f=\"NOME\"]').value")
    print(nome, 'salvou:', salvo[:200], '| depois de recarregar:', volta)
    print(nome, 'erros:', errs[:12])
    await ctx.close()
async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        await run(b, 'pc', {'width':1366,'height':800})
        await run(b, 'cel', {'width':390,'height':844}, True)
        await run(b, 'deitado', {'width':844,'height':390}, True)
        await b.close()
asyncio.run(main())
