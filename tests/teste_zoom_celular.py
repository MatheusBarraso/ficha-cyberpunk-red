import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403
sys.argv=['x','ok']

async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        for nome, vp in [('pe', {'width':412,'height':915}), ('deitado', {'width':915,'height':412})]:
            ctx = await b.new_context(viewport=vp, device_scale_factor=2.625, is_mobile=True, has_touch=True, user_agent='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'); await ctx.route('**/*', handler)
            m = await ctx.new_page(); errs=[]; m.on('pageerror', lambda e: errs.append(str(e)))
            await m.goto('https://ficha.test/index.html#u=p1&login=1'); await m.wait_for_timeout(1500)
            await m.tap('.cm-escolha.player'); await m.wait_for_timeout(300)
            await m.evaluate("[...document.querySelectorAll('#comu .cm-bar .cm-btn')].find(b=>/Ficha/i.test(b.textContent)).click()"); await m.wait_for_timeout(3500)
            print(nome, 'controle:', await m.evaluate("[...document.querySelectorAll('.zmc > *')].filter(e=>!e.hidden).map(e=>e.textContent)"))
            await m.screenshot(path=f'tests/saida/z_{nome}_0.png')
            if nome == 'pe':
                r = await m.evaluate("(()=>{const q=document.querySelector('[data-f=\"NOME\"]').getBoundingClientRect();return [q.x+q.width/2,q.y+q.height/2]})()")
                await m.tap('.stage', position={'x': r[0]-8, 'y': r[1]-8 - (await m.evaluate("document.querySelector('.stage').getBoundingClientRect().top"))})
                await m.wait_for_timeout(800)
                print('depois do toque:', await m.evaluate("[zoomMode, zoomVal, document.activeElement.tagName]"))
            else:
                await m.click('.zmc-pri'); await m.wait_for_timeout(800)
            await m.screenshot(path=f'tests/saida/z_{nome}_1.png')
            nm = m.locator('[data-f="NOME"]')
            await nm.tap(); await m.keyboard.type('Kira Navalha'); await m.wait_for_timeout(400)
            print('nome:', await nm.input_value(), 'ativo', await m.evaluate("document.activeElement.dataset.f"))
            await m.evaluate("document.activeElement.blur()")
            await m.click('.zmc button:has-text("+")'); await m.wait_for_timeout(500)
            print('mais:', await m.evaluate("zoomVal"), await m.evaluate("(()=>{const s=document.querySelector('.stage');s.scrollLeft=500;return [s.scrollWidth,s.clientWidth,s.scrollLeft]})()"))
            await m.screenshot(path=f'tests/saida/z_{nome}_2.png')
            await m.click('.zmc button:has-text("Página inteira")'); await m.wait_for_timeout(500)
            print('inteira:', await m.evaluate("[zoomMode, document.body.classList.contains('zm-toca')]"), errs)
            await ctx.close()
        await b.close()
asyncio.run(main())
