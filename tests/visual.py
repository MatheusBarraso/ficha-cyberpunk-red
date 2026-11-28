"""Comparação visual: tira capturas das telas principais e compara com uma base, pixel a pixel.

    python3 tests/visual.py base       guarda as capturas atuais como referência (tests/visual-base/)
    python3 tests/visual.py comparar   tira de novo e aponta o que mudou (diferenças em tests/saida/visual/)

Serve pra refatorar com segurança: antes de mexer, `base`; depois de mexer, `comparar`.
"""
import asyncio
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import AQUI, SAIDA, handler, lancar, async_playwright  # noqa: E402

from PIL import Image, ImageChops  # noqa: E402

MODO = sys.argv[1] if len(sys.argv) > 1 else 'comparar'
BASE = os.path.join(AQUI, 'visual-base')
AGORA = os.path.join(SAIDA, 'visual')
PC = {'width': 1300, 'height': 850}
EM_PE = {'width': 390, 'height': 844}
DEITADO = {'width': 844, 'height': 390}
UA_CEL = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'

# (nome, tela, escuro, passos em JS depois de carregar)
CENAS = [
    ('escolha', PC, False, []),
    ('ficha-1', PC, False, ['showPage(0)']),
    ('ficha-2', PC, False, ['showPage(1)']),
    ('ficha-3', PC, False, ['showPage(2)']),
    ('anotacoes', PC, False, ['showPage(3)']),
    ('historia', PC, False, ['showPage(4)']),
    ('livros', PC, False, ['showPage(5)']),
    ('menu', PC, False, ['showPage(0)', 'openMenu(true)']),
    ('ficha-1-escuro', PC, True, ['showPage(0)']),
    ('ficha-3-escuro', PC, True, ['showPage(2)']),
    ('menu-escuro', PC, True, ['showPage(0)', 'openMenu(true)']),
    ('escolha-escuro', PC, True, []),
    ('celular-ficha', EM_PE, False, ['showPage(0)']),
    ('celular-ficha-escuro', EM_PE, True, ['showPage(0)']),
    ('celular-anotacoes', EM_PE, False, ['showPage(3)']),
    ('deitado-ficha', DEITADO, False, ['showPage(0)']),
    ('deitado-menu', DEITADO, False, ['showPage(0)', 'openMenu(true)']),
    ('rpg', PC, False, []),
    ('rpg-escuro', PC, True, []),
    ('celular-rpg', EM_PE, False, []),
    ('rpg-trocar', PC, False, ['abrirEscolhaRpg()']),
    ('livre-ficha', PC, False, ['showPage(0)']),
    ('livre-editar', PC, False, ['showPage(0)', "document.querySelector('.sl-editar').click()"]),
    ('livre-ficha-escuro', PC, True, ['showPage(0)']),
    ('celular-livre', EM_PE, False, ['showPage(0)']),
    ('deitado-livre', DEITADO, False, ['showPage(0)']),
]
PRIMEIRA_VISITA = {'rpg', 'rpg-escuro', 'celular-rpg'}  # sem RPG escolhido: abre na tela de escolha
LIVRE = {'livre-ficha', 'livre-editar', 'livre-ficha-escuro', 'celular-livre', 'deitado-livre'}  # no Sistema livre


async def capturar(p, destino):
    os.makedirs(destino, exist_ok=True)
    b = await lancar(p)
    for nome, tela, escuro, passos in CENAS:
        cel = tela is not PC
        ctx = await b.new_context(viewport=tela, is_mobile=cel, has_touch=cel, user_agent=UA_CEL if cel else None, primeira_visita=nome in PRIMEIRA_VISITA)
        await ctx.route('**/*', handler)
        await ctx.add_init_script("try{localStorage.setItem('cpr-escuro','%s')}catch(e){}" % ('1' if escuro else '0'))
        if nome in LIVRE:
            await ctx.add_init_script("try{localStorage.setItem('sk-sistema','livre')}catch(e){}")
        pg = await ctx.new_page()
        await pg.goto('https://ficha.test/index.html')
        await pg.wait_for_timeout(1800)
        for passo in passos:
            await pg.evaluate(passo)
            await pg.wait_for_timeout(500)
        await pg.wait_for_timeout(3500)  # o neon das linhas termina
        await pg.evaluate("(()=>{const s=document.getElementById('savestatus');if(s&&/\\d\\d:\\d\\d/.test(s.textContent))s.textContent=s.textContent.replace(/\\d\\d:\\d\\d/,'12:00')})()")  # o relógio muda a cada minuto
        await pg.screenshot(path=os.path.join(destino, nome + '.png'))
        await ctx.close()
    await b.close()


def comparar():
    mudou = []
    for nome, *_ in CENAS:
        a, b = os.path.join(BASE, nome + '.png'), os.path.join(AGORA, nome + '.png')
        if not os.path.exists(a):
            mudou.append((nome, 'sem base'))
            continue
        ia, ib = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
        if ia.size != ib.size:
            mudou.append((nome, f'tamanho {ia.size} → {ib.size}'))
            continue
        dif = ImageChops.difference(ia, ib)
        caixa = dif.getbbox()
        if not caixa:
            continue
        px = sum(1 for v in dif.convert('L').tobytes() if v > 24)
        if px == 0:
            continue
        dif.point(lambda v: 255 if v > 24 else 0).save(os.path.join(AGORA, nome + '-diferenca.png'))
        mudou.append((nome, f'{px} pixels diferentes em {caixa}'))
    return mudou


async def main():
    async with async_playwright() as p:
        if MODO == 'base':
            shutil.rmtree(BASE, ignore_errors=True)
            await capturar(p, BASE)
            print(f'base guardada: {len(CENAS)} telas em {BASE}')
            return
        shutil.rmtree(AGORA, ignore_errors=True)
        await capturar(p, AGORA)
    mudou = comparar()
    for nome, o in mudou:
        print(f'✗ {nome}: {o}')
    print(f'\n{len(CENAS) - len(mudou)} de {len(CENAS)} telas iguais à base')
    sys.exit(1 if mudou else 0)


asyncio.run(main())
