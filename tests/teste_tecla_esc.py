"""Esc fecha só o que está por cima (uma camada por vez).

Antes eram 9 tratadores de Esc no documento e um Esc podia fechar várias coisas de uma vez
(ex.: a janela de página salva e a gaveta do leitor juntas).
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403


def checar(cond, msg):
    print(('ok: ' if cond else 'FALHOU: ') + msg)


async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        ctx = await b.new_context(viewport={'width': 1300, 'height': 850})
        await ctx.route('**/*', handler)
        errs = []
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('https://ficha.test/index.html'); await pg.wait_for_timeout(1500)
        aberto = lambda sel, cls='open': pg.evaluate(f"document.querySelector('{sel}').classList.contains('{cls}')")
        # menu + controles de zoom
        await pg.evaluate('showPage(0)'); await pg.evaluate('openMenu(true)'); await pg.wait_for_timeout(300)
        await pg.click('#zoom-fab'); await pg.wait_for_timeout(200)
        checar(await aberto('#zoom-pop') and await aberto('#menu'), 'menu e controles de zoom abertos')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
        checar(not await aberto('#zoom-pop') and await aberto('#menu'), '1º Esc fecha só os controles de zoom')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
        checar(not await aberto('#menu'), '2º Esc fecha o menu')
        # leitor: gaveta + janela de página salva
        await pg.evaluate('showPage(5)'); await pg.wait_for_timeout(800)
        await pg.click('#lvb-menu'); await pg.wait_for_timeout(300)
        await pg.evaluate("document.getElementById('bkmodal').classList.add('open')"); await pg.wait_for_timeout(100)
        checar(await aberto('#lvdrawer', 'aberta') and await aberto('#bkmodal'), 'gaveta e janela de página salva abertas')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
        checar(not await aberto('#bkmodal') and await aberto('#lvdrawer', 'aberta'), '1º Esc fecha só a janela')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
        checar(not await aberto('#lvdrawer', 'aberta'), '2º Esc fecha a gaveta')
        # janela de confirmação por cima do menu
        await pg.evaluate('openMenu(true)'); await pg.wait_for_timeout(200)
        await pg.evaluate("(() => { window.__resp = 'nada'; confirmar('Teste?').then((r) => { window.__resp = r; }); })()"); await pg.wait_for_timeout(200)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        checar(await pg.evaluate('window.__resp') is False and await aberto('#menu'), 'Esc na confirmação responde "não" e deixa o menu aberto')
        print('errors', errs)
        await b.close()

asyncio.run(main())
