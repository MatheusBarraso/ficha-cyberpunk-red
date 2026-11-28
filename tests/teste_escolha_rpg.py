"""Tela de escolha de RPG: primeira visita (obrigatória, por cima da entrada da Comunidade), "Trocar de RPG"
pelo menu ☰, pelo menu da conta e pela entrada, troca de sistema recarregando e o nome do RPG na tela."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403

URL = 'https://ficha.test/index.html#solo=1'
falhas = []


def checar(cond, msg):
    print(('ok: ' if cond else 'FALHOU: ') + msg)
    if not cond:
        falhas.append(msg)


ABERTA = "(()=>{const t=document.getElementById('sk-rpg');return !!t&&!t.hidden})()"
NO_TOPO = "(()=>{const e=document.elementFromPoint(innerWidth/2,innerHeight/2);return !!e&&!!e.closest('#sk-rpg')})()"


async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        errs = []

        async def abrir(ctx, endereco=URL):
            pg = await ctx.new_page()
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(endereco); await pg.wait_for_timeout(1500)
            return pg

        # 1) primeira visita: a escolha cobre tudo e não fecha sem escolher
        ctx = await b.new_context(primeira_visita=True, viewport={'width': 1280, 'height': 800}); await ctx.route('**/*', handler)
        pg = await abrir(ctx)
        checar(await pg.evaluate(ABERTA), 'primeira visita abre a escolha de RPG')
        checar(await pg.evaluate(NO_TOPO), 'a escolha fica por cima da entrada da Comunidade')
        checar(await pg.locator('#sk-rpg .sk-rpg-x').count() == 0, 'na primeira visita não tem botão de fechar')
        checar(await pg.locator('#sk-rpg .sk-rpg-cartao').count() == await pg.evaluate("Object.keys(SK.SISTEMAS).length"), 'um cartão por sistema do registro')
        checar(await pg.locator('#sk-rpg .sk-rpg-cartao.atual').count() == 0, 'nenhum marcado como atual antes de escolher')
        await pg.screenshot(path=os.path.join(SAIDA, 'rpg_primeira.png'))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        checar(await pg.evaluate(ABERTA), 'Esc não fecha a escolha obrigatória')
        # Tab não sai da tela
        await pg.evaluate("document.querySelector('#sk-rpg .sk-rpg-cartao:last-of-type').focus()")
        await pg.keyboard.press('Tab')
        checar(await pg.evaluate("!!document.activeElement.closest('#sk-rpg')"), 'Tab continua dentro da tela')
        # escolher o Cyberpunk RED (já carregado por baixo) só fecha, sem recarregar
        await pg.evaluate("window.__semRecarga = 1")
        await pg.click('#sk-rpg .sk-rpg-cartao[data-rpg="cpr"]'); await pg.wait_for_timeout(300)
        checar(not await pg.evaluate(ABERTA), 'escolher o RPG carregado fecha a tela')
        checar(await pg.evaluate("window.__semRecarga === 1"), 'e não recarrega a página')
        checar(await pg.evaluate("localStorage.getItem('sk-sistema')") == 'cpr', 'a escolha fica anotada')
        checar(await pg.locator('#comu .sk-escolha.mestre').is_visible(), 'depois vem a entrada (Mestre / Player)')
        await pg.reload(); await pg.wait_for_timeout(1500)
        checar(not await pg.evaluate(ABERTA), 'na volta não pergunta de novo')

        # 2) o RPG aberto na tela
        checar(await pg.evaluate("document.title") == 'Sketcher · Cyberpunk RED', 'título da aba com o RPG')
        checar(await txt(pg, '#comu .sk-esc-logo') == 'SketcherCyberpunk RED', 'entrada mostra Sketcher e o RPG')

        # 3) "Trocar de RPG" pelo menu ☰: o atual marcado, Esc fecha e devolve o foco
        await pg.evaluate("document.querySelector('#comu .sk-escolha.player').click()"); await pg.wait_for_timeout(500)
        await pg.evaluate("openMenu(true)"); await pg.wait_for_timeout(300)
        checar(await txt(pg, '#btn-rpg-nome') == 'Cyberpunk RED', 'menu ☰ mostra o RPG aberto')
        await pg.focus('#btn-rpg'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
        checar(await pg.evaluate(ABERTA), 'menu ☰ → Trocar de RPG abre a escolha')
        checar(not await pg.evaluate("document.getElementById('menu').classList.contains('open')"), 'e fecha o menu ☰')
        checar(await pg.locator('#sk-rpg .sk-rpg-x').count() == 1, 'fora da primeira visita dá pra fechar')
        checar(await pg.evaluate("document.activeElement.matches('.sk-rpg-cartao.atual[data-rpg=cpr]')"), 'foco no RPG aberto')
        checar('Você está aqui' in (await txt(pg, '#sk-rpg .sk-rpg-cartao.atual') or ''), 'o atual diz "Você está aqui"')
        await pg.screenshot(path=os.path.join(SAIDA, 'rpg_trocar.png'))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        checar(not await pg.evaluate(ABERTA), 'Esc fecha')

        # 4) pelo menu da conta
        await pg.evaluate("window.__comuAbrir && window.__comuAbrir()"); await pg.wait_for_timeout(400)
        await pg.click('#comu .cm-conta'); await pg.wait_for_timeout(300)
        await pg.click('.cm-conta-painel button:has-text("Trocar de RPG")'); await pg.wait_for_timeout(300)
        checar(await pg.evaluate(ABERTA), 'menu da conta → Trocar de RPG abre a escolha')
        checar(await pg.evaluate("document.querySelector('.cm-conta-painel').hidden"), 'e fecha o menu da conta')
        await pg.click('#sk-rpg .sk-rpg-x'); await pg.wait_for_timeout(200)
        checar(not await pg.evaluate(ABERTA), 'o ✕ fecha')

        # 5) pela entrada da Comunidade, trocando pro Sistema livre (recarrega)
        await pg.reload(); await pg.wait_for_timeout(1500)
        await pg.click('#comu .cm-esc-topo button:has-text("Trocar de RPG")'); await pg.wait_for_timeout(300)
        checar(await pg.evaluate(ABERTA), 'entrada → Trocar de RPG abre a escolha')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        checar(await pg.evaluate("!!document.activeElement.closest('.cm-esc-topo')"), 'Esc fecha e o foco volta pra quem abriu')
        await pg.click('#comu .cm-esc-topo button:has-text("Trocar de RPG")'); await pg.wait_for_timeout(300)
        async with pg.expect_navigation():
            await pg.click('#sk-rpg .sk-rpg-cartao[data-rpg="livre"]')
        await pg.wait_for_timeout(1500)
        checar(await pg.evaluate("SK.SISTEMA.id") == 'livre', 'escolher outro RPG troca o sistema')
        checar(await pg.evaluate("location.hash") == '#solo=1', 'o resto do endereço continua')
        checar(await pg.evaluate("document.title") == 'Sketcher · Sistema livre', 'título da aba com o Sistema livre')
        checar(await txt(pg, '#marca-rpg') == 'Sistema livre', 'barra com o Sistema livre')
        checar(await txt(pg, '#comu .sk-esc-logo') == 'SketcherSistema livre', 'entrada com o Sistema livre')
        await pg.evaluate("abrirEscolhaRpg()"); await pg.wait_for_timeout(300)
        checar(await pg.locator('#sk-rpg .sk-rpg-cartao.atual[data-rpg="livre"]').count() == 1, 'no Sistema livre o atual é ele')
        async with pg.expect_navigation():
            await pg.click('#sk-rpg .sk-rpg-cartao[data-rpg="cpr"]')
        await pg.wait_for_timeout(1500)
        checar(await pg.evaluate("SK.SISTEMA.id") == 'cpr', 'e volta pro Cyberpunk RED')
        await ctx.close()

        # 6) celular em pé: cartões um embaixo do outro, tudo dentro da largura
        ctx = await b.new_context(primeira_visita=True, viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        await ctx.route('**/*', handler)
        pg = await abrir(ctx)
        caixas = await pg.evaluate("[...document.querySelectorAll('#sk-rpg .sk-rpg-cartao')].map(c=>{const r=c.getBoundingClientRect();return [r.left,r.top,r.right]})")
        checar(len(caixas) >= 2 and abs(caixas[0][0] - caixas[1][0]) < 1 and caixas[1][1] > caixas[0][1], 'celular: um cartão embaixo do outro')
        checar(all(c[2] <= 390 for c in caixas), 'celular: nada passa da largura da tela')
        await pg.screenshot(path=os.path.join(SAIDA, 'rpg_celular.png'), full_page=False)
        await ctx.close()

        print('errors', errs)
        if falhas:
            print('FALHOU:', len(falhas), 'checagens')
        await b.close()

asyncio.run(main())
