import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403
sys.argv=['x','ok']

async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        ctx = await b.new_context(viewport={'width':1300,'height':850}); await ctx.route('**/*', handler)
        errs=[]; logs=[]
        async def nova(u):
            pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(u+str(e))); pg.on('console', lambda m: logs.append(u+':'+m.text) if 'ficha' in m.text or 'comunidade' in m.text else None)
            await pg.goto(f'https://ficha.test/index.html#u={u}&login=1'); await pg.wait_for_timeout(1300); return pg
        gm = await nova('gm'); await gm.click('.sk-escolha.mestre'); await gm.wait_for_timeout(300)
        await gm.click('text=＋ Nova sessão'); await gm.fill('label:has-text("Nome da campanha") input', 'Manual')
        await gm.click('#comu button:has-text("Criar sessão")'); await gm.wait_for_timeout(2000)
        code = await txt(gm, '.cm-codigo.grande span')
        p1 = await nova('p1'); await p1.click('.sk-escolha.player'); await buscar(p1, code)
        await p1.click('#comu button:has-text("Solicitar entrada")'); await p1.wait_for_timeout(800)
        await gm.bring_to_front(); await gm.wait_for_timeout(600); await gm.click('#comu button:has-text("Aprovar")'); await gm.wait_for_timeout(800)
        # o player abre o site de novo, escolhe Player e vai direto pra ficha (sem entrar na sala)
        await p1.reload(); await p1.wait_for_timeout(1500)
        await p1.click('.sk-escolha.player'); await p1.wait_for_timeout(1500)
        await p1.evaluate("[...document.querySelectorAll('#comu .cm-bar .cm-btn')].find(b=>/Ficha/i.test(b.textContent)).click()"); await p1.wait_for_timeout(500)
        await p1.fill('[data-f="NOME"]', 'Yuii'); await p1.wait_for_timeout(2500)
        await p1.wait_for_timeout(3000)
        print('debug:', await p1.evaluate("[JSON.parse(localStorage.getItem('cpr-ficha-v1')||'{}').NOME, document.querySelector('[data-f=NOME]').value, Object.keys(window).filter(k=>k.startsWith('__ficha')), document.getElementById('savestatus').textContent]"))
        print('estado:', await p1.evaluate("(()=>{const L=__comuEstado.lob;return {papel:L.papel, me:__comuEstado.me, pedidos:Object.keys(L.meusPedidos||{}), sessDe:Object.keys(L.sessDe||{}).map(k=>[k,!!L.sessDe[k]]), membro:JSON.stringify(L.meuMembro)}})()"))
        print('logs:', logs[-8:])
        print('PS:', await p1.evaluate("window.__cmFichasSync()"), await p1.evaluate("(()=>{const k=Object.keys(__FAKE.store).find(k=>/\\/fichas\\//.test(k));return [k, k&&JSON.stringify(__FAKE.store[k]).slice(0,200)]})()"))
        print('PS depois do mudou:', await p1.evaluate("window.__cmFichasSync()"))
        print('ficha no banco:', await p1.evaluate("(()=>{const k=Object.keys(__FAKE.store).find(k=>/\\/fichas\\/p1$/.test(k));return k&&__FAKE.store[k].dados.NOME})()"))
        print('toasts p1:', await toasts(p1))
        await gm.locator("#comu button").filter(has_text="sala").first.click(); await gm.wait_for_timeout(1200)
        await gm.evaluate("__comuEstado.ferrVer='fichas'; __comuAbrir('ferramentas')"); await gm.wait_for_timeout(800)
        print('mestre vê:', await gm.evaluate("[...document.querySelectorAll('.cm-fb-player')].map(b=>b.innerText.split(String.fromCharCode(10)).filter(Boolean).join(' '))"))
        await gm.set_viewport_size({'width':390,'height':844}); await gm.wait_for_timeout(300)
        await gm.click('.cm-ferr-troca:has-text("Combate")'); await gm.wait_for_timeout(400)
        await gm.click('.cm-cb-acoes button:has-text("Atacar")'); await gm.wait_for_timeout(400)
        await gm.screenshot(path='tests/saida/mira_cel.png')
        await gm.locator('.cm-mira-alvo').first.click(); await gm.wait_for_timeout(400)
        print('dano 1 alvo:', await gm.evaluate("document.querySelector('.cm-dano-alvo').innerText.replace(/\\s+/g,' ')"))
        await gm.fill('.cm-modal input[type=number]', '7'); await gm.screenshot(path='tests/saida/dano_cel.png')
        await gm.keyboard.press('Enter'); await gm.wait_for_timeout(1500)
        await p1.bring_to_front(); await p1.wait_for_timeout(800)
        print('p1 recebeu:', await p1.evaluate("document.querySelector('.cm-modal-ataque') && document.querySelector('.cm-modal-ataque .cm-at-dano').innerText.replace(/\\s+/g,' ')"))
        print('neg', await neg(gm), await neg(p1), 'errors', errs)
        await b.close()
asyncio.run(main())
