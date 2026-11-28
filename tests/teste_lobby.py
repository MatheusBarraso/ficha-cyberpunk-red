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
        gm = await ctx.new_page(); gm.on('pageerror', lambda e: errs.append(str(e)))
        await gm.goto('https://ficha.test/index.html#u=gm&login=1'); await gm.wait_for_timeout(1300)
        await gm.click('.cm-escolha.mestre'); await gm.wait_for_timeout(500)
        for nome in ('Noites de Cromo', 'Porto Sombrio'):
            await gm.click('text=＋ Nova sessão'); await gm.fill('label:has-text("Nome da campanha") input', nome)
            await gm.click('#comu button:has-text("Criar sessão")'); await gm.wait_for_timeout(2000)
            await gm.click('#comu button:has-text("Suas sessões")'); await gm.wait_for_timeout(500)
        await gm.locator("#comu button").filter(has_text="Abrir sala").first.click(); await gm.wait_for_timeout(1500)
        print('na sala:', await gm.evaluate("__comuEstado.sess.nome"))
        # cor azul pelo menu da conta
        await gm.click('#comu .cm-conta'); await gm.wait_for_timeout(300)
        await gm.click('.cm-conta-painel .cm-cor[title="Azul"]'); await gm.wait_for_timeout(400)
        print('cor:', await gm.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--red')"), await gm.evaluate(T, '.cm-conta-painel .cm-cor.on'), await gm.evaluate("document.querySelector('#menu .csw.sel').title"))
        await gm.screenshot(path='tests/saida/l_cores.png')
        await gm.click('.cm-conta-painel button:has-text("Todas as sessões")'); await gm.wait_for_timeout(700)
        print('lista sem sair:', await gm.evaluate("[!!__comuEstado.sess, __comuEstado.verLobby]"), await gm.evaluate(T, '.cm-volta'), 'tabs escondidas', await gm.evaluate("document.querySelector('.cm-tabs').hidden"))
        await gm.screenshot(path='tests/saida/l_lista.png')
        await gm.click('.cm-volta button:has-text("Voltar pra sala")'); await gm.wait_for_timeout(700)
        print('voltou:', await gm.evaluate("[__comuEstado.sess.nome, __comuEstado.verLobby, __comuEstado.sec]"))
        # menu ☰ → Sessões
        await gm.click('#comu .cm-app'); await gm.wait_for_timeout(400)
        await gm.click('#menu .cm-go:has-text("Sessões")'); await gm.wait_for_timeout(600)
        print('pelo menu:', await gm.evaluate("[!!__comuEstado.sess, __comuEstado.verLobby]"))
        # abrir a mesma sala pelo cartão: só volta
        await gm.locator("#comu .cm-sessao:has-text('Porto Sombrio') button:has-text('Abrir sala')").click(); await gm.wait_for_timeout(700)
        print('mesma sala:', await gm.evaluate("[__comuEstado.sess.nome, __comuEstado.verLobby]"))
        # trocar pra outra
        await gm.click('#comu .cm-conta'); await gm.wait_for_timeout(300)
        await gm.locator('.cm-conta-painel .cm-conta-item').first.click(); await gm.wait_for_timeout(1200)
        print('outra:', await gm.evaluate("[__comuEstado.sess.nome, __comuEstado.verLobby]"))
        await gm.click('#comu .cm-conta'); await gm.wait_for_timeout(300)
        await gm.click('.cm-conta-painel button:has-text("Sair da sala")'); await gm.wait_for_timeout(700)
        print('saiu:', await gm.evaluate("[__comuEstado.sess, __comuEstado.verLobby]"))
        await gm.locator("#comu button").filter(has_text="Abrir sala").first.click(); await gm.wait_for_timeout(1200)
        await gm.evaluate("__comuEstado.ferrVer='combate'; __comuAbrir('ferramentas')"); await gm.wait_for_timeout(700)
        await gm.screenshot(path='tests/saida/l_azul.png')
        await gm.evaluate("__cprEscuro(true)"); await gm.wait_for_timeout(400)
        await gm.screenshot(path='tests/saida/l_azul_escuro.png')
        print('errors', errs)
        await b.close()
asyncio.run(main())
