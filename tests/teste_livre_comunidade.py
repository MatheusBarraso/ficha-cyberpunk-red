"""Sistema livre nas sessões: a sessão guarda o RPG, o player que está no Cyberpunk RED entra e o Sketcher
troca sozinho pro Sistema livre, a ficha livre do player chega no mestre (valores e modelo), o mestre mexe
nela e o player vê, o modo ajuda aponta campo da ficha livre e as ferramentas que são do CPR somem."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403

falhas = []


def checar(cond, msg):
    print(('ok: ' if cond else 'FALHOU: ') + msg)
    if not cond:
        falhas.append(msg)


VIS = "(s)=>[...document.querySelectorAll(s)].filter(e=>e.getClientRects().length).map(e=>e.innerText.replace(/\\s+/g,' ').trim())"


async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        ctx = await b.new_context(viewport={'width': 1400, 'height': 900}); await ctx.route('**/*', handler)
        errs = []

        async def aba(u, rpg):
            x = await ctx.new_page(); x.on('pageerror', lambda e: errs.append(u + ' ' + str(e)))
            await x.goto(f'https://ficha.test/index.html#rpg={rpg}&u={u}&login=1'); await x.wait_for_timeout(1400)
            return x

        # 1) o mestre, no Sistema livre, cria a sessão
        gm = await aba('gm', 'livre')
        await gm.click('.sk-escolha.mestre'); await gm.wait_for_timeout(600)
        await gm.click('text=＋ Nova sessão'); await gm.wait_for_timeout(200)
        checar(await gm.locator('#comu label:has-text("Incluir cidade de exemplo")').count() == 0, 'no Sistema livre não tem a cidade de exemplo (é do CPR)')
        await gm.fill('label:has-text("Nome da campanha") input', 'Mesa Livre')
        await gm.select_option('label:has-text("Entrada") select', 'automatica')
        await gm.click('#comu button:has-text("Criar sessão")'); await gm.wait_for_timeout(2500)
        s = await gm.evaluate("(()=>{const s=__comuEstado.lob.minhas[0];return {sistema:s.sistema,codigo:s.codigo,id:s.id}})()")
        checar(s['sistema'] == 'livre', 'a sessão guarda o RPG em que foi criada')

        # 2) o player está no Cyberpunk RED; acha a sessão e vê que ela é do Sistema livre
        p1 = await aba('p1', 'cpr')
        checar(await p1.evaluate("SK.SISTEMA.id") == 'cpr', 'player começa no Cyberpunk RED')
        await p1.click('.sk-escolha.player'); await p1.wait_for_timeout(300)
        await buscar(p1, s['codigo'])
        aviso = ' '.join(await p1.evaluate(VIS, '#comu .cm-entra .cm-aviso'))
        checar('Sistema livre' in aviso, f'a sessão encontrada avisa que é do Sistema livre: {aviso[:70]}')
        checar('SISTEMA LIVRE' in ' '.join(await p1.evaluate(VIS, '#comu .cm-entra .cm-tag-sis')).upper(), 'com a etiqueta do RPG')
        async with p1.expect_navigation():
            await p1.click('#comu button:has-text("Confirmar entrada")')
        await p1.wait_for_timeout(2500)
        checar(await p1.evaluate("SK.SISTEMA.id") == 'livre', 'entrar troca o Sketcher pro Sistema livre')
        checar(await p1.evaluate("!!__comuEstado.sess && __comuEstado.sess.id") == s['id'], 'e depois de recarregar ele já está na sala')
        checar('u=p1' in await p1.evaluate("location.hash"), 'o resto do endereço continua')

        # 3) o player preenche a ficha livre; ela vai pra sessão
        await p1.click('#comu .cm-bar button:has-text("Ficha")'); await p1.wait_for_timeout(800)
        await p1.fill('[data-f="NOME"]', 'Kira Livre'); await p1.fill('[data-f="atr1"]', '15'); await p1.wait_for_timeout(2500)

        # 4) o mestre abre a ficha do player: vem com o modelo do Sistema livre e os valores
        await gm.bring_to_front()
        await gm.locator("#comu button").filter(has_text="Abrir sala").first.click(); await gm.wait_for_timeout(1500)
        await gm.evaluate("__comuEstado.ferrVer='fichas'; __comuAbrir('ferramentas')"); await gm.wait_for_timeout(800)
        checar(await gm.locator('#comu button:has-text("fichas de demonstração")').count() == 0, 'sem fichas de demonstração (são do CPR)')
        await gm.evaluate("__comuEstado.ferrVer='combate'; __comuAbrir('ferramentas')"); await gm.wait_for_timeout(600)
        checar(await gm.locator('#comu button:has-text("Atacar")').count() == 0, 'combate sem "Atacar / aplicar dano" (regras do CPR)')
        await gm.evaluate("__comuEstado.ferrVer='fichas'; __comuAbrir('ferramentas')"); await gm.wait_for_timeout(600)
        await gm.locator('.cm-fb-player').first.click(); await gm.wait_for_timeout(1500)
        checar(await gm.input_value('[data-f="NOME"]') == 'Kira Livre' and await gm.input_value('[data-f="atr1"]') == '15', 'o mestre vê a ficha livre do player')
        checar(await gm.evaluate("document.querySelectorAll('.sheet.livre .sl-secao').length") == 5, 'com as seções do modelo dele')
        checar(await gm.locator('#cm-remota button:has-text("Atacar"), #cm-remota button:has-text("Aplicar dano")').count() == 0, 'painel da ficha sem atacar / aplicar dano')

        # 5) modo ajuda: o mestre entra num campo da ficha livre e o player vê o destaque
        await gm.click('[data-f="atr1"]'); await gm.wait_for_timeout(800)
        checar((await gm.evaluate("__cmAjuda()"))['foco'] == 'atr1', 'modo ajuda acende o campo na tela do mestre')
        await gm.screenshot(path=os.path.join(SAIDA, 'livre_ajuda_mestre.png'))
        await p1.bring_to_front(); await p1.wait_for_timeout(2500)
        aj = await p1.evaluate("__cmAjuda()")
        checar(aj['foco'] == 'atr1' and 'Força' in (aj['legenda'] or ''), f'e na tela do player, com o nome do campo: {aj}')
        await p1.screenshot(path=os.path.join(SAIDA, 'livre_ajuda_player.png'))

        # 6) o mestre muda um valor e o modelo; o player recebe os dois
        await gm.bring_to_front()
        await gm.fill('[data-f="atr2"]', '12'); await gm.wait_for_timeout(300)
        await gm.click('.sl-editar'); await gm.wait_for_timeout(200)
        sec = gm.locator('.sl-secao').nth(1)
        await sec.locator('.sl-ed-mais').click(); await gm.wait_for_timeout(150)
        await gm.keyboard.type('Sorte'); await sec.locator('.sl-ed-tipo').last.select_option('atributo')
        await gm.click('.sl-editar'); await gm.wait_for_timeout(2500)
        await p1.bring_to_front(); await p1.wait_for_timeout(2500)
        checar(await p1.input_value('[data-f="atr2"]') == '12', 'o valor que o mestre mudou chega no player')
        rot = await p1.evaluate("[...document.querySelectorAll('.sl-secao')][1].innerText")
        checar('SORTE' in rot.upper(), 'o campo que o mestre criou aparece na ficha do player')
        checar(await p1.input_value('[data-f="atr1"]') == '15', 'sem perder o que o player tinha escrito')

        # 7) o mestre fechando a ficha do player: no lugar dela, o aviso de que o mestre não tem ficha
        await gm.bring_to_front()
        await gm.evaluate("__comuEstado && window.__fichaRemota && window.__fichaRemota.sair && window.__fichaRemota.sair()"); await gm.wait_for_timeout(800)
        await gm.evaluate("showPage(0)"); await gm.wait_for_timeout(600)
        checar(await gm.evaluate("document.body.classList.contains('cm-semficha') && getComputedStyle(document.querySelector('.sheet.livre .cm-semficha-box')).display !== 'none'"),
               'mestre sem ficha aberta: o aviso aparece por cima da ficha livre')

        print('errors', errs)
        if falhas:
            print('FALHOU:', len(falhas), 'checagens')
        await b.close()

asyncio.run(main())
