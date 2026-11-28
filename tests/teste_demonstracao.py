import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403
sys.argv=['x','ok']

V = lambda k: f"(document.querySelector('[data-f=\"{k}\"]')||{{}}).value"
async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        ctx = await b.new_context(viewport={'width':1400,'height':900}); await ctx.route('**/*', handler)
        errs=[]
        gm = await ctx.new_page(); gm.on('pageerror', lambda e: errs.append(str(e)))
        await gm.goto('https://ficha.test/index.html#u=gm&login=1'); await gm.wait_for_timeout(1300)
        await gm.click('.sk-escolha.mestre'); await gm.wait_for_timeout(400)
        await gm.click('text=＋ Nova sessão'); await gm.fill('label:has-text("Nome da campanha") input', 'Demo')
        await gm.click('#comu button:has-text("Criar sessão")'); await gm.wait_for_timeout(2500)
        await gm.locator("#comu button").filter(has_text="sala").first.click(); await gm.wait_for_timeout(1500)
        await gm.evaluate("__comuEstado.ferrVer='fichas'; __comuAbrir('ferramentas')"); await gm.wait_for_timeout(800)
        await gm.click('button:has-text("Criar fichas de demonstração")'); await gm.wait_for_timeout(1500)
        print('blocos:', await gm.evaluate("[...document.querySelectorAll('.cm-fb:not(.cm-fb-novo)')].map(b=>b.innerText.split(String.fromCharCode(10)).filter(Boolean).join(' '))"))
        await gm.screenshot(path='tests/saida/demo_fichas.png', full_page=True)
        await gm.locator('.cm-fb-monstro .cm-fb-olho:not(.cm-fb-estrela):not(.cm-fb-matar)').first.click(); await gm.wait_for_timeout(1200)
        print('ocultas:', await gm.evaluate("[...document.querySelectorAll('.cm-fb-w.cm-fb-oculta')].map(e=>e.innerText.split(String.fromCharCode(10)).filter(Boolean).slice(0,3).join(' '))"))
        await gm.screenshot(path='tests/saida/demo_oculta.png', full_page=True)
        await gm.click('.cm-fb-demo'); await gm.wait_for_timeout(1200)
        print('Vex:', [await gm.evaluate(V(k)) for k in ['NOME','PAPEL','REF','PONTOS DE VIDA','PONTOS DE VIDA 1','NVL 46 ARMAS A','ARMA 1','DANO 2']])
        await gm.screenshot(path='tests/saida/demo_vex.png')
        await gm.evaluate("showPage(2)"); await gm.wait_for_timeout(500)
        await gm.screenshot(path='tests/saida/demo_vex_cyber.png')
        await gm.click('#cm-remota button:has-text("Combate")'); await gm.wait_for_timeout(700)
        print('combate vazio:', await gm.evaluate("document.querySelector('#comu .cm-principal').innerText.split(String.fromCharCode(10)).filter(Boolean).slice(0,14)"))
        await gm.screenshot(path='tests/saida/demo_combate_vazio.png', full_page=True)
        await gm.click('.cm-fb-add:has-text("inimigo")'); await gm.wait_for_timeout(400)
        print('picker inimigo:', await gm.evaluate("[...document.querySelectorAll('.cm-add-item')].map(e=>e.innerText.replace(/\\s+/g,' '))"))
        await gm.check('.cm-modal .cm-check input'); await gm.wait_for_timeout(200)
        print('com ocultas:', await gm.evaluate("document.querySelectorAll('.cm-add-item').length"))
        await gm.fill('.cm-add-nivel input >> nth=0', '4'); await gm.wait_for_timeout(200)
        print('nivel >= 4:', await gm.evaluate("[...document.querySelectorAll('.cm-add-item b')].map(e=>e.textContent)"))
        await gm.fill('.cm-add-nivel input >> nth=0', ''); await gm.wait_for_timeout(200)
        await gm.screenshot(path='tests/saida/demo_picker.png')
        for cb in (await gm.locator('.cm-add-item input').all())[:3]: await cb.check()
        await gm.click('.cm-modal button:has-text("Adicionar ao combate")'); await gm.wait_for_timeout(1200)
        print('combate:', await gm.evaluate("[...document.querySelectorAll('.cm-fb-grupo')].map(g=>g.querySelector('.cm-faixa').textContent+': '+[...g.querySelectorAll('.cm-fb-txt b')].map(b=>b.textContent).join(', '))"))
        await gm.screenshot(path='tests/saida/demo_combate.png', full_page=True)
        await gm.evaluate("__comuEstado.ferrVer='fichas'; __comuAbrir('ferramentas')"); await gm.wait_for_timeout(500)
        await gm.click('button:has-text("Apagar as fichas de demonstração")'); await gm.wait_for_timeout(300); await gm.click('.cfm .ok'); await gm.wait_for_timeout(1500)
        print('depois de apagar:', await gm.evaluate("document.querySelectorAll('.cm-fb:not(.cm-fb-novo)').length"), await gm.evaluate("!!document.querySelector('button.cm-btn') && [...document.querySelectorAll('button')].some(b=>/Criar fichas de demonstra/.test(b.textContent))"))
        await gm.click('button:has-text("Criar fichas de demonstração")'); await gm.wait_for_timeout(1500)
        print('recriou:', await gm.evaluate("document.querySelectorAll('.cm-fb:not(.cm-fb-novo)').length"), 'neg', await neg(gm))
        print('errors', errs)
        await b.close()
asyncio.run(main())
