import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403
sys.argv=['x','ok']

async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        for f in (2.5, 3):
            ctx = await b.new_context(viewport={'width':round(1920/f),'height':round(950/f)}, device_scale_factor=f); await ctx.route('**/*', handler)
            await ctx.add_init_script(f"Object.defineProperty(window,'outerWidth',{{get:()=>Math.round(innerWidth*{f}*1.008)}})")
            m = await ctx.new_page(); errs=[]; m.on('pageerror', lambda e: errs.append(str(e)))
            await m.goto('https://ficha.test/index.html#u=p1&login=1'); await m.wait_for_timeout(1500)
            await m.click('.cm-escolha.player'); await m.wait_for_timeout(300)
            await m.click('#comu .cm-bar button:has-text(\"Ficha\")'); await m.wait_for_timeout(2500)
            print(f, await m.evaluate("[document.body.className, __zoomNavegador(), document.querySelector('.sheet.active').style.zoom, document.querySelector('.zmc').hidden]"), errs)
            await m.screenshot(path=f'tests/saida/z{int(f*100)}.png')
            await ctx.close()
        await b.close()
asyncio.run(main())
