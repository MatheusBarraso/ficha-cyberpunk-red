import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403
sys.argv=['x','ok']

T = "(s)=>[...document.querySelectorAll(s)].filter(e=>e.getClientRects().length).map(e=>e.innerText.replace(/\\s+/g,' ').trim())"
async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        ctx = await b.new_context(viewport={'width':1400,'height':900}); await ctx.route('**/*', handler)
        errs=[]
        async def pg(u):
            x = await ctx.new_page(); x.on('pageerror', lambda e: errs.append(u+' '+str(e)))
            await x.goto(f'https://ficha.test/index.html#u={u}&login=1'); await x.wait_for_timeout(1300); return x
        gm = await pg('gm')
        await gm.click('.sk-escolha.mestre'); await gm.wait_for_timeout(500)
        await gm.click('text=＋ Nova sessão'); await gm.fill('label:has-text("Nome da campanha") input', 'Noites de Cromo')
        await gm.click('#comu button:has-text("Criar sessão")'); await gm.wait_for_timeout(2500)
        code = await gm.evaluate("document.querySelector('.cm-codigo.grande span').textContent")
        p1 = await pg('p1')
        await p1.click('.sk-escolha.player'); await p1.wait_for_timeout(300)
        await p1.fill('.cm-in-codigo', code); await p1.click('#comu button:has-text("Buscar sessão")'); await p1.wait_for_timeout(1200)
        await p1.click('#comu button:has-text("Solicitar entrada")'); await p1.wait_for_timeout(1200)
        await gm.bring_to_front(); await gm.wait_for_timeout(600)
        await gm.click('#comu button:has-text("Aprovar")'); await gm.wait_for_timeout(900)
        await p1.bring_to_front(); await p1.wait_for_timeout(900)
        await p1.click('#comu button:has-text("Entrar na sala")'); await p1.wait_for_timeout(1500)
        await p1.fill('[data-f="NOME"]', 'Kira Navalha') if False else None
        await p1.click('#comu .cm-bar button:has-text("Ficha")'); await p1.wait_for_timeout(800)
        await p1.fill('[data-f="NOME"]', 'Kira Navalha'); await p1.wait_for_timeout(2500)
        print('p1 marca antes:', await p1.evaluate(T, '.cm-marca'))
        await gm.bring_to_front()
        await gm.locator("#comu button").filter(has_text="Abrir sala").first.click(); await gm.wait_for_timeout(1500)
        await gm.evaluate("__comuEstado.ferrVer='fichas'; __comuAbrir('ferramentas')"); await gm.wait_for_timeout(800)
        await gm.click('button:has-text("Criar fichas de demonstração")'); await gm.wait_for_timeout(1500)
        await gm.locator('.cm-fb-player').first.click(); await gm.wait_for_timeout(1500)
        print('gm marca:', await gm.evaluate(T, '.cm-marca'))
        await gm.screenshot(path='tests/saida/m_gm.png')
        await p1.bring_to_front(); await p1.wait_for_timeout(1200)
        print('p1 marca:', await p1.evaluate(T, '.cm-marca'))
        await p1.screenshot(path='tests/saida/m_p1.png')
        await p1.evaluate("__comuAbrir('mural')"); await p1.wait_for_timeout(500)
        print('p1 marca na comunidade:', await p1.evaluate(T, '.cm-marca'))
        await p1.screenshot(path='tests/saida/m_p1_comu.png')
        await p1.evaluate("document.querySelector('#comu .cm-bar button.cm-btn').click()"); await p1.wait_for_timeout(500)
        # mestre vai pra um NPC: aviso do player some
        await gm.bring_to_front()
        await gm.locator('#cm-remota .cm-ml-item:has-text("Kira Volt")').first.click() if await gm.locator('#cm-remota .cm-ml-item:has-text("Kira Volt")').count() else None
        await gm.evaluate("(()=>{const s=__comuEstado; })()")
        # abre um NPC pelas Ferramentas
        await gm.click('#cm-remota button:has-text("Fichas")'); await gm.wait_for_timeout(700)
        await gm.locator('.cm-fb-npc').first.click(); await gm.wait_for_timeout(1500)
        print('gm marca npc:', await gm.evaluate(T, '.cm-marca'))
        await gm.screenshot(path='tests/saida/m_gm_npc.png')
        await p1.bring_to_front(); await p1.wait_for_timeout(1200)
        print('p1 marca depois:', await p1.evaluate(T, '.cm-marca'))
        await gm.bring_to_front()
        await gm.click('#cm-remota button:has-text("Combate")'); await gm.wait_for_timeout(800)
        print('gm marca na comunidade:', await gm.evaluate(T, '.cm-marca'))
        # celular do player
        await gm.click('#comu .cm-fb-add >> nth=0') if False else None
        await gm.evaluate("__comuEstado.ferrVer='fichas'; __comuAbrir('ferramentas')"); await gm.wait_for_timeout(600)
        await gm.locator('.cm-fb-player').first.click(); await gm.wait_for_timeout(1200)
        await p1.set_viewport_size({'width':390,'height':844}); await p1.bring_to_front(); await p1.wait_for_timeout(2500)
        print('p1 cel:', await p1.evaluate(T, '.cm-marca'))
        await p1.screenshot(path='tests/saida/m_p1_cel.png')
        print('errors', errs)
        await b.close()
asyncio.run(main())
