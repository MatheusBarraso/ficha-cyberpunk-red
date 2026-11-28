"""Meu perfil: ao entrar na sala a primeira aba é Perfis; a pessoa escolhe uma foto no lugar da do Google e ela
aparece pra mesa; fora da sala o perfil abre pelo menu da conta."""
import asyncio
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403
from PIL import Image  # noqa: E402

falhas = []


def checar(cond, msg):
    print(('ok: ' if cond else 'FALHOU: ') + msg)
    if not cond:
        falhas.append(msg)


VISIVEL = "(s)=>{const e=document.querySelector(s);return !!e&&!!e.getClientRects().length}"


async def main():
    foto = os.path.join(tempfile.mkdtemp(), 'foto.png')
    Image.new('RGB', (900, 700), (40, 160, 200)).save(foto)
    async with async_playwright() as p:
        b = await lancar(p)
        ctx = await b.new_context(viewport={'width': 1300, 'height': 850}); await ctx.route('**/*', handler)
        errs = []

        async def aba(u):
            x = await ctx.new_page(); x.on('pageerror', lambda e: errs.append(u + ' ' + str(e)))
            await x.goto(f'https://ficha.test/index.html#u={u}&login=1'); await x.wait_for_timeout(1500)
            return x

        # o mestre cria a sessão (entrada direta) e abre a sala: começa em Perfis
        gm = await aba('gm')
        await gm.click('.sk-escolha.mestre'); await gm.wait_for_timeout(500)
        await gm.click('text=＋ Nova sessão'); await gm.fill('label:has-text("Nome da campanha") input', 'Mesa do Perfil')
        await gm.select_option('label:has-text("Entrada") select', 'automatica')
        await gm.click('#comu button:has-text("Criar sessão")'); await gm.wait_for_timeout(2500)
        codigo = await gm.evaluate("__comuEstado.lob.minhas[0].codigo")
        await gm.locator("#comu button").filter(has_text="Abrir sala").first.click(); await gm.wait_for_timeout(1200)
        checar(await gm.evaluate("__comuEstado.sec") == 'perfil', 'mestre: a sala abre em Perfis')

        # o player entra na sessão: a primeira tela é Perfis, com a foto
        p1 = await aba('p1')
        await p1.click('.sk-escolha.player'); await p1.wait_for_timeout(300)
        await buscar(p1, codigo)
        await p1.click('#comu button:has-text("Confirmar entrada")'); await p1.wait_for_timeout(1500)
        checar(await p1.evaluate("__comuEstado.sec") == 'perfil', 'player: ao entrar na sessão a primeira tela é Perfis')
        checar(await p1.evaluate(VISIVEL, '#comu .cm-perfil-foto'), 'com o lugar da foto no Meu perfil')
        async with p1.expect_file_chooser() as fc:
            await p1.click('#comu .cm-perfil-foto button:has-text("Escolher foto")')
        await (await fc.value).set_files(foto); await p1.wait_for_timeout(1500)
        checar(await p1.locator('#comu .cm-perfil-foto img').count() == 1, 'a foto escolhida aparece no perfil')
        await p1.fill('#comu input[placeholder="Seu apelido na comunidade"]', 'Kira')
        await p1.screenshot(path=os.path.join(SAIDA, 'perfil_sala.png'))
        await p1.click('#comu button:has-text("Salvar perfil")'); await p1.wait_for_timeout(1200)
        d = await p1.evaluate("__comuEstado.d.perfis.p1 || null")
        checar(d and d['apelido'] == 'Kira' and d.get('foto'), 'o perfil fica salvo com o apelido e a foto')
        src = await p1.evaluate("(document.querySelector('#comu .cm-conta .cm-av img')||{}).src || ''")
        checar(src.startswith('data:') or 'blob' in src, 'o botão da conta mostra a foto escolhida')

        # o mestre vê a foto do player
        await gm.bring_to_front(); await gm.wait_for_timeout(1200)
        await gm.locator('#comu .cm-linha:has-text("Kira")').first.click(); await gm.wait_for_timeout(600)
        checar(await gm.locator('#comu .cm-npc-big img').count() >= 1, 'a mesa vê a foto no perfil do player')

        # fora da sala: menu da conta → Meu perfil e foto; dá pra voltar pra foto do Google
        await p1.bring_to_front()
        await p1.click('#comu .cm-conta'); await p1.wait_for_timeout(300)
        await p1.click('.cm-conta-painel button:has-text("Sair da sala")'); await p1.wait_for_timeout(600)
        await p1.click('#comu .cm-conta'); await p1.wait_for_timeout(300)
        await p1.click('.cm-conta-painel button:has-text("Meu perfil e foto")'); await p1.wait_for_timeout(500)
        checar('Seu perfil' in (await txt(p1, '#comu .cm-h h2') or ''), 'fora da sala, o menu da conta abre o perfil')
        await p1.click('#comu .cm-perfil-foto button:has-text("Remover foto"), #comu .cm-perfil-foto button:has-text("Usar a do Google")')
        await p1.click('#comu button:has-text("Salvar perfil")'); await p1.wait_for_timeout(1000)
        checar(not (await p1.evaluate("__comuEstado.d.perfis.p1.foto || null")), 'dá pra voltar a não ter foto escolhida')

        print('errors', errs)
        if falhas:
            print('FALHOU:', len(falhas), 'checagens')
        await b.close()

asyncio.run(main())
