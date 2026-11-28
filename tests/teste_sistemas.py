"""Sistemas de RPG (com #solo=1: o Firebase falso não mexe nas chaves do navegador): escolha na primeira visita, quem já usava o CPR continua nele, dados separados por
sistema (o CPR mantém as chaves de sempre) e backup voltando pro sistema de onde saiu."""
import asyncio
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403


def checar(cond, msg):
    print(('ok: ' if cond else 'FALHOU: ') + msg)


async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        errs = []

        async def abrir(ctx, endereco='https://ficha.test/index.html#solo=1'):
            pg = await ctx.new_page()
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(endereco); await pg.wait_for_timeout(1500)
            return pg

        # 1) primeira visita: ninguém escolheu
        ctx = await b.new_context(); await ctx.route('**/*', handler)
        pg = await abrir(ctx)
        checar(await pg.evaluate("document.documentElement.classList.contains('sk-escolher')"), 'primeira visita pede a escolha de RPG')
        checar(await pg.evaluate("SK.SISTEMA.id") == 'cpr', 'por baixo carrega o Cyberpunk RED')
        await ctx.close()

        # 2) quem já tinha ficha do CPR continua nele, sem tela de escolha
        ctx = await b.new_context(); await ctx.route('**/*', handler)
        await ctx.add_init_script("if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', 1); localStorage.setItem('cpr-ficha-v1', JSON.stringify({ NOME: 'Kira' })); }")
        pg = await abrir(ctx)
        checar(not await pg.evaluate("document.documentElement.classList.contains('sk-escolher')"), 'quem já usava o CPR não vê a escolha')
        checar(await pg.evaluate("localStorage.getItem('sk-sistema')") == 'cpr', 'a escolha fica anotada como CPR')
        checar(await pg.evaluate("SK.chaveLocal('ficha')") == 'cpr-ficha-v1', 'o CPR usa a mesma chave de antes')

        # 3) Sistema livre pelo endereço: chaves próprias, ficha do CPR intacta
        await pg.goto('https://ficha.test/index.html#rpg=livre&solo=1'); await pg.reload(); await pg.wait_for_timeout(1500)
        checar(await pg.evaluate("SK.SISTEMA.id") == 'livre', '#rpg=livre abre o Sistema livre')
        checar(await pg.evaluate("SK.chaveLocal('ficha')") == 'sk-livre-ficha', 'o Sistema livre usa chaves próprias')
        checar(json.loads(await pg.evaluate("localStorage.getItem('cpr-ficha-v1')"))['NOME'] == 'Kira', 'a ficha do CPR continua lá')

        # 4) backup antigo (sem sistema) carregado no Sistema livre volta pro CPR
        bk = {'app': 'cpr-ficha', 'versao': 1, 'ficha': {'NOME': 'Do backup'}, 'notas': None, 'quadro': None, 'livros': None}
        arq = os.path.join(tempfile.mkdtemp(), 'backup.json'); open(arq, 'w').write(json.dumps(bk))
        await pg.set_input_files('#backup-file', arq); await pg.wait_for_timeout(2500)
        checar(await pg.evaluate("SK.SISTEMA.id") == 'cpr', 'backup antigo troca pro Cyberpunk RED')
        checar(json.loads(await pg.evaluate("localStorage.getItem('cpr-ficha-v1')"))['NOME'] == 'Do backup', 'e a ficha do backup entra no CPR')
        print('errors', errs)
        await b.close()

asyncio.run(main())
