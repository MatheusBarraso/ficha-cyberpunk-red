import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403
sys.argv=['x','ok']

G = "[...document.querySelectorAll('.cm-fb-grupo')].map(g=>g.querySelector('.cm-faixa').textContent.trim()+': '+[...g.querySelectorAll('.cm-fb-txt b')].map(b=>b.textContent).join(', '))"
async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        ctx = await b.new_context(viewport={'width':1400,'height':900}); await ctx.route('**/*', handler)
        errs=[]
        gm = await ctx.new_page(); gm.on('pageerror', lambda e: errs.append(str(e)))
        await gm.goto('https://ficha.test/index.html#u=gm&login=1'); await gm.wait_for_timeout(1300)
        await gm.click('.cm-escolha.mestre'); await gm.wait_for_timeout(400)
        await gm.click('text=＋ Nova sessão'); await gm.fill('label:has-text("Nome da campanha") input', 'Estrela')
        await gm.click('#comu button:has-text("Criar sessão")'); await gm.wait_for_timeout(2500)
        await gm.locator("#comu button").filter(has_text="sala").first.click(); await gm.wait_for_timeout(1500)
        await gm.evaluate("__comuEstado.ferrVer='fichas'; __comuAbrir('ferramentas')"); await gm.wait_for_timeout(800)
        await gm.click('button:has-text("Criar fichas de demonstração")'); await gm.wait_for_timeout(1500)
        print('antes:', await gm.evaluate(G))
        await gm.locator('.cm-fb-monstro:has-text("Navalha") .cm-fb-estrela').click(); await gm.wait_for_timeout(800)
        await gm.locator('.cm-fb-npc:has-text("Tio Z") .cm-fb-estrela').click(); await gm.wait_for_timeout(800)
        await gm.locator('.cm-fb-demo:has-text("Vex") .cm-fb-estrela').click(); await gm.wait_for_timeout(800)
        await gm.locator('.cm-fb-npc:has-text("Okada") .cm-fb-matar').click(); await gm.wait_for_timeout(800)
        print('depois:', await gm.evaluate(G))
        await gm.screenshot(path='tests/saida/estrela.png', full_page=True)
        await gm.locator('.cm-fb-mortos .cm-fb-matar').click(); await gm.wait_for_timeout(800)
        print('reviveu:', await gm.evaluate(G))
        await gm.set_viewport_size({'width':390,'height':844}); await gm.wait_for_timeout(500)
        await gm.screenshot(path='tests/saida/estrela_cel.png')
        print('errors', errs)
        await b.close()
asyncio.run(main())
