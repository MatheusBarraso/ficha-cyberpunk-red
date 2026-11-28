import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403
sys.argv=['x','ok']

C = "(()=>{const e=document.querySelector('input[data-pdf=\"NVL 60\"]');const r=e.getBoundingClientRect();return [Math.round(r.x+r.width/2),Math.round(r.y+r.height/2), document.querySelector('.sheet.active').style.zoom, document.querySelector('.stage').scrollLeft, scrollY]})()"
async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        ctx = await b.new_context(viewport={'width':1600,'height':900}); await ctx.route('**/*', handler)
        m = await ctx.new_page(); errs=[]; m.on('pageerror', lambda e: errs.append(str(e)))
        await m.goto('https://ficha.test/index.html#u=p1&login=1'); await m.wait_for_timeout(1500)
        await m.click('.cm-escolha.player'); await m.wait_for_timeout(300)
        await m.click('#comu .cm-bar button:has-text(\"Ficha\")'); await m.wait_for_timeout(3000)
        x, y, *_ = await m.evaluate(C); print('antes', await m.evaluate(C))
        await m.mouse.move(x, y)
        await m.keyboard.down('Control')
        for _ in range(6): await m.mouse.wheel(0, -100); await m.wait_for_timeout(120)
        await m.keyboard.up('Control'); await m.wait_for_timeout(300)
        print("rodinha", await m.evaluate(C), await m.evaluate("[document.documentElement.scrollWidth, innerWidth, (()=>{const r=document.querySelector(\".scaler[data-sheet=\\\"0\\\"]\").getBoundingClientRect();return [r.left,r.right]})(), getComputedStyle(document.querySelector(\".stage\")).overflowX, getComputedStyle(document.body).overflowX]"))
        await m.screenshot(path='tests/saida/zm_mouse.png')
        await m.keyboard.press('Control+Equal'); await m.wait_for_timeout(300)
        print('ctrl+', await m.evaluate(C))
        await m.keyboard.press('Control+Minus'); await m.wait_for_timeout(300)
        print('ctrl-', await m.evaluate(C))
        await m.keyboard.press('Control+0'); await m.wait_for_timeout(300)
        print('ctrl0', await m.evaluate(C), await m.evaluate('zoomMode'), errs)
        await b.close()
asyncio.run(main())
