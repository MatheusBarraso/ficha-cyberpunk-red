import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403
sys.argv=['x','ok']

async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        ctx = await b.new_context(viewport={'width':1400,'height':900}); await ctx.route('**/*', handler)
        errs=[]
        gm = await ctx.new_page(); gm.on('pageerror', lambda e: errs.append(str(e)))
        await gm.goto('https://ficha.test/index.html#u=gm&login=1'); await gm.wait_for_timeout(1300)
        await gm.click('.sk-escolha.mestre'); await gm.wait_for_timeout(400)
        await gm.click('text=＋ Nova sessão'); await gm.fill('label:has-text("Nome da campanha") input', 'Caveira')
        await gm.click('#comu button:has-text("Criar sessão")'); await gm.wait_for_timeout(2500)
        await gm.locator("#comu button").filter(has_text="sala").first.click(); await gm.wait_for_timeout(1500)
        await gm.evaluate("__comuEstado.ferrVer='fichas'; __comuAbrir('ferramentas')"); await gm.wait_for_timeout(800)
        await gm.click('button:has-text("Criar fichas de demonstração")'); await gm.wait_for_timeout(1500)
        await gm.click('.cm-fb-monstro:has-text("Navalha")'); await gm.wait_for_timeout(1200)
        await gm.fill('[data-f="PONTOS DE VIDA"]', '0'); await gm.wait_for_timeout(1500)
        print('painel:', await gm.evaluate("[document.querySelector('.cm-ml-tit').innerText, document.querySelectorAll('#cm-remota .cm-ml-cav').length]"))
        await gm.screenshot(path='tests/saida/cav_painel.png')
        await gm.click('#cm-remota button:has-text("Fichas")'); await gm.wait_for_timeout(800)
        print('mortas:', await gm.evaluate("[...document.querySelectorAll('.cm-fb-w.cm-fb-morta')].map(e=>e.innerText.split(String.fromCharCode(10)).filter(Boolean).join(' '))"))
        await gm.screenshot(path='tests/saida/cav_fichas.png', full_page=True)
        await gm.click('.cm-ferr-troca:has-text("Combate")'); await gm.wait_for_timeout(500)
        await gm.click('.cm-fb-add:has-text("inimigo")'); await gm.wait_for_timeout(400)
        print('picker:', await gm.evaluate("[...document.querySelectorAll('.cm-add-item b')].map(e=>e.textContent)"))
        for cb in await gm.locator('.cm-add-item:has-text("MON") input').all(): await cb.check()
        await gm.click('.cm-modal button:has-text("Adicionar ao combate")'); await gm.wait_for_timeout(1200)
        await gm.screenshot(path='tests/saida/cav_combate.png', full_page=True)
        print('errors', errs)
        await b.close()
asyncio.run(main())
