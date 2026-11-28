"""Trocar de página dispara o que cada parte precisa (eventos sk:trocando-pagina / sk:pagina).

Antes isso era feito embrulhando showPage 4 vezes; aqui fica garantido o comportamento:
entrar/sair do modo leitura, fechar a Comunidade, brilho das linhas e ajuste do zoom.
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
        await pg.goto('https://ficha.test/index.html#u=p1&login=1'); await pg.wait_for_timeout(1500)
        checar(await pg.evaluate("document.body.classList.contains('comu-on')"), 'a Comunidade abre na entrada')
        eventos = await pg.evaluate("""(() => { const v = []; addEventListener('sk:trocando-pagina', (e) => v.push('antes ' + e.detail.pagina));
            addEventListener('sk:pagina', (e) => v.push('depois ' + e.detail.pagina)); window.__ev = v; showPage(1); return v.slice(); })()""")
        checar(eventos == ['antes 1', 'depois 1'], f'eventos na ordem certa: {eventos}')
        checar(not await pg.evaluate("document.body.classList.contains('comu-on')"), 'trocar de página fecha a Comunidade')
        await pg.wait_for_timeout(300)
        checar(await pg.evaluate("!!document.querySelector('.sheet.brilha')"), 'as linhas da página acendem (neon)')
        await pg.evaluate('showPage(5)'); await pg.wait_for_timeout(600)
        checar(await pg.evaluate("document.body.classList.contains('reading')"), 'a aba Livros entra no modo leitura')
        await pg.evaluate('showPage(0)'); await pg.wait_for_timeout(600)
        checar(not await pg.evaluate("document.body.classList.contains('reading')"), 'sair da aba Livros sai do modo leitura')
        checar(await pg.evaluate("document.querySelectorAll('.sheet')[0].classList.contains('active')"), 'a página 1 fica visível')
        print('errors', errs)
        await b.close()

asyncio.run(main())
