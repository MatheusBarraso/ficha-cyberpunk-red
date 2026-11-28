"""NPCs mostram o próprio retrato/iniciais — e não a foto de quem está logado.

Regressão: a Comunidade tinha duas funções `avatar` no mesmo escopo e a da conta substituía a dos NPCs.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403


async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
        await ctx.route('**/*', handler)
        errs = []
        gm = await ctx.new_page()
        gm.on('pageerror', lambda e: errs.append(str(e)))
        await gm.goto('https://ficha.test/index.html#u=gm&login=1'); await gm.wait_for_timeout(1500)
        await gm.click('.cm-escolha.mestre'); await gm.wait_for_timeout(1200)
        await gm.click('text=＋ Nova sessão'); await gm.fill('label:has-text("Nome da campanha") input', 'Teste de retratos')
        await gm.check('label:has-text("cidade de exemplo") input')
        await gm.click('#comu button:has-text("Criar sessão")'); await gm.wait_for_timeout(2500)
        await gm.locator('#comu button').filter(has_text='sala').first.click(); await gm.wait_for_timeout(1500)
        await gm.evaluate("__comuAbrir('npcs')"); await gm.wait_for_timeout(500)
        npcs = await gm.evaluate("""[...document.querySelectorAll('#comu .cm-ficha')].map(f => {
            const r = f.querySelector('.cm-retrato');
            const nome = (f.querySelector('.cm-nome') || f).textContent.trim();
            return { nome, retrato: !!r, ini: r ? r.textContent.trim() : null, contaNoLugar: !!f.querySelector('.cm-av-g') };
        })""")
        print('npcs:', npcs)
        if not npcs:
            print('FALHOU: nenhum NPC na cidade de exemplo')
        for n in npcs:
            if not n['retrato'] or n['contaNoLugar']:
                print(f"FALHOU: NPC {n['nome']!r} sem retrato próprio (mostrando o avatar da conta)")
        await gm.screenshot(path='tests/saida/avatar_npc.png')
        print('errors', errs)
        await b.close()

asyncio.run(main())
