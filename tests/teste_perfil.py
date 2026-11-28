"""Meu perfil: é a primeira tela depois de entrar com a conta (enquanto a pessoa não tiver perfil), aceita uma
foto escolhida no lugar da do Google, segue pra escolha de Mestre / Player e volta pelo menu da conta."""
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
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('https://ficha.test/index.html#u=p1&login=1&perfil=1'); await pg.wait_for_timeout(1800)

        # 1) primeira tela depois de entrar: o perfil, antes de Mestre / Player
        checar('Seu perfil' in (await txt(pg, '#comu .cm-h h2') or ''), 'a primeira tela é "Seu perfil"')
        checar(not await pg.evaluate(VISIVEL, '#comu .sk-escolha.mestre'), 'a escolha de Mestre / Player vem depois')

        # 2) foto escolhida no lugar da do Google
        async with pg.expect_file_chooser() as fc:
            await pg.click('#comu .cm-perfil-foto button:has-text("Escolher foto")')
        await (await fc.value).set_files(foto); await pg.wait_for_timeout(1500)
        checar(await pg.locator('#comu .cm-perfil-foto img').count() == 1, 'a foto escolhida aparece no perfil')
        await pg.fill('#comu input[placeholder="Seu apelido na comunidade"]', 'Kira')
        await pg.screenshot(path=os.path.join(SAIDA, 'perfil_inicio.png'))
        await pg.click('#comu button:has-text("Salvar e continuar")'); await pg.wait_for_timeout(1200)
        d = await pg.evaluate("__comuEstado.d.perfis.p1 || null")
        checar(d and d['apelido'] == 'Kira' and d.get('foto'), 'o perfil fica salvo com o apelido e a foto')
        checar(await pg.evaluate(VISIVEL, '#comu .sk-escolha.mestre'), 'salvar segue pra escolha de Mestre / Player')
        src = await pg.evaluate("(document.querySelector('#comu .cm-conta .cm-av img')||{}).src || ''")
        checar(src.startswith('data:') or 'blob' in src, 'o botão da conta mostra a foto escolhida')

        # 3) com perfil, a tela não aparece mais
        await pg.reload(); await pg.wait_for_timeout(1800)
        checar(await pg.evaluate(VISIVEL, '#comu .sk-escolha.mestre'), 'na volta vai direto pra escolha de Mestre / Player')

        # 4) pelo menu da conta: abrir o perfil, voltar pra foto do Google
        await pg.click('#comu .cm-conta'); await pg.wait_for_timeout(300)
        await pg.click('.cm-conta-painel button:has-text("Meu perfil e foto")'); await pg.wait_for_timeout(500)
        checar('Seu perfil' in (await txt(pg, '#comu .cm-h h2') or ''), 'menu da conta → Meu perfil e foto abre o perfil')
        await pg.click('#comu .cm-perfil-foto button:has-text("Remover foto"), #comu .cm-perfil-foto button:has-text("Usar a do Google")')
        await pg.click('#comu button:has-text("Salvar e continuar")'); await pg.wait_for_timeout(1000)
        checar(not (await pg.evaluate("__comuEstado.d.perfis.p1.foto || null")), 'dá pra voltar a não ter foto escolhida')

        # 5) "Agora não": fica pra depois nesta visita
        p2 = await ctx.new_page(); p2.on('pageerror', lambda e: errs.append(str(e)))
        await p2.goto('https://ficha.test/index.html#u=p2&login=1&perfil=1'); await p2.wait_for_timeout(1800)
        await p2.click('#comu button:has-text("Agora não")'); await p2.wait_for_timeout(500)
        checar(await p2.evaluate(VISIVEL, '#comu .sk-escolha.player'), '"Agora não" segue pra escolha')
        await p2.reload(); await p2.wait_for_timeout(1800)
        checar(await p2.evaluate(VISIVEL, '#comu .sk-escolha.player'), 'e não pergunta de novo nesta visita')

        print('errors', errs)
        if falhas:
            print('FALHOU:', len(falhas), 'checagens')
        await b.close()

asyncio.run(main())
