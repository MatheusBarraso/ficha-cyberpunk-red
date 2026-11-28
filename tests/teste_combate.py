import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403
sys.argv=['x','ok']

V = lambda k: f"(document.querySelector('[data-f=\"{k}\"]')||{{}}).value"
async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        ctx = await b.new_context(viewport={'width':1400,'height':900}); await ctx.route('**/*', handler)
        errs=[]
        async def nova(u):
            pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(u+str(e)))
            await pg.goto(f'https://ficha.test/index.html#u={u}&login=1'); await pg.wait_for_timeout(1300); return pg
        gm = await nova('gm')
        await gm.click('.cm-escolha.mestre'); await gm.wait_for_timeout(400)
        await gm.click('text=＋ Nova sessão')
        await gm.fill('label:has-text("Nome da campanha") input', 'Combate'); await gm.select_option('label:has-text("Entrada") select', 'automatica')
        await gm.fill('label:has-text("Limite") input', '4') if await gm.locator('label:has-text("Limite") input').count() else None
        await gm.click('#comu button:has-text("Criar sessão")'); await gm.wait_for_timeout(2000)
        code = await txt(gm, '.cm-codigo.grande span')
        await gm.locator("#comu button").filter(has_text="sala").first.click(); await gm.wait_for_timeout(1200)
        pls = {}
        for u, nm, pv in (('p1','Kira','40'), ('p2','Rex','30')):
            pg = await nova(u); await pg.click('.cm-escolha.player'); await buscar(pg, code)
            await pg.click('#comu button:has-text("Confirmar entrada")'); await pg.wait_for_timeout(1500)
            await pg.evaluate("showPage(0)"); await pg.wait_for_timeout(300)
            await pg.fill('[data-f="NOME"]', nm); await pg.fill('[data-f="PONTOS DE VIDA"]', pv); await pg.wait_for_timeout(2200)
            await pg.evaluate("__comuAbrir('mural')"); await pg.wait_for_timeout(300)
            pls[u] = pg
        p1, p2 = pls['p1'], pls['p2']
        # menu que desce
        await gm.wait_for_timeout(800)
        await gm.click('.cm-tab[data-sec="ferramentas"]'); await gm.wait_for_timeout(500)
        print('menu desce:', await gm.evaluate("[!document.querySelector('.cm-ferr-painel').hidden, document.querySelector('.cm-ferr-painel').innerText.split(String.fromCharCode(10)).filter(Boolean)]"))
        await gm.screenshot(path='tests/saida/cb_menu.png')
        await gm.click('.cm-fm-op:has-text("Fichas")'); await gm.wait_for_timeout(600)
        print('pagina fichas:', await gm.evaluate("document.querySelector('.cm-h h2').textContent"))
        await gm.locator('.cm-fb-novo').nth(1).click(); await gm.wait_for_timeout(1200)
        await gm.fill('[data-f="NOME"]', 'Ciberpsicopata'); await gm.fill('[data-f="PONTOS DE VIDA"]', '60'); await gm.wait_for_timeout(1500)
        print('painel direita:', await gm.evaluate("[!document.getElementById('cm-remota').hidden, document.body.classList.contains('cm-lado-on'), window.__ladoW, document.querySelector('.cm-ml-tit b').textContent]"))
        # combate: o mestre escolhe quem entra
        await gm.click('#cm-remota button:has-text("+ Aliado")'); await gm.wait_for_timeout(400)
        print('picker aliado:', await gm.evaluate("[...document.querySelectorAll('.cm-add-item')].map(e=>e.innerText.replace(/\\s+/g,' '))"))
        for cb in await gm.locator('.cm-add-item:has-text("PJ") input').all(): await cb.check()
        await gm.click('.cm-modal button:has-text("Adicionar ao combate")'); await gm.wait_for_timeout(1000)
        await gm.click('#cm-remota button:has-text("+ Inimigo")'); await gm.wait_for_timeout(400)
        print('picker inimigo:', await gm.evaluate("[...document.querySelectorAll('.cm-add-item')].map(e=>e.innerText.replace(/\\s+/g,' '))"))
        await gm.fill('.cm-add-filtros input[type=search]', 'zzz'); await gm.wait_for_timeout(200)
        print('filtro nome vazio:', await gm.evaluate("document.querySelector('.cm-add-lista').innerText"))
        await gm.fill('.cm-add-filtros input[type=search]', 'ciber'); await gm.wait_for_timeout(200)
        for cb in await gm.locator('.cm-add-item input').all(): await cb.check()
        await gm.screenshot(path='tests/saida/cb_picker.png')
        await gm.click('.cm-modal button:has-text("Adicionar ao combate")'); await gm.wait_for_timeout(1000)
        print('ordem:', await gm.evaluate("__comuEstado.d.ordem.lista.map(x=>x.tipo)"))
        print('vez:', await gm.evaluate("[document.querySelector('.cm-ml-vez-tit b').textContent, document.body.classList.contains('cm-vez-ficha'), [...document.querySelectorAll('.cm-ml-item.cm-vez')].map(e=>e.textContent)]"))
        await gm.click('#cm-remota button:has-text("Próxima vez")'); await gm.wait_for_timeout(1200)
        print('depois de passar:', await gm.evaluate("[document.querySelector('.cm-ml-vez-tit b').textContent, document.querySelector('.cm-ml-tit b').textContent, document.body.classList.contains('cm-vez-ficha')]"))
        await gm.screenshot(path='tests/saida/cb_painel.png')
        # alerta
        await gm.click('#cm-remota button:has-text("Alertar players")'); await gm.wait_for_timeout(300)
        await gm.fill('.cm-modal textarea', 'Combate! Todo mundo na ficha.'); await gm.click('.cm-modal button:has-text("Alertar")'); await gm.wait_for_timeout(1500)
        print('p1 alerta:', await p1.evaluate("[document.querySelector('.cm-modal-alerta') && document.querySelector('.cm-modal-alerta').innerText.split(String.fromCharCode(10)).filter(Boolean), document.body.classList.contains('comu-on')]"))
        await p1.screenshot(path='tests/saida/cb_alerta.png')
        await p1.click('.cm-modal-alerta button'); await p2.click('.cm-modal-alerta button')
        # ataque (volta pro monstro)
        await gm.click('#cm-remota .cm-ml-item:has-text("Ciberpsicopata")'); await gm.wait_for_timeout(900)
        await gm.click('#cm-remota button:has-text("Atacar")'); await gm.wait_for_timeout(400)
        print('mira:', await gm.evaluate("[document.querySelector('.cm-modal-tit').textContent, ...[...document.querySelectorAll('.cm-mira-alvo')].map(e=>e.innerText.replace(/\\s+/g,' '))]"))
        await gm.screenshot(path='tests/saida/cb_mira.png')
        await gm.click('.cm-modal button:has-text("Atacar vários")'); await gm.wait_for_timeout(200)
        for a in await gm.locator('.cm-mira-alvo').all(): await a.click()
        await gm.click('.cm-modal button:has-text("Continuar")'); await gm.wait_for_timeout(400)
        print('dano:', await gm.evaluate("[document.querySelector('.cm-dano-alvo').innerText.replace(/\\s+/g,' '), document.querySelector('.cm-modal select').selectedOptions[0].textContent]"))
        await gm.fill('.cm-modal input[type=number]', '10'); await gm.fill('.cm-modal textarea', '“Teu cromo é lixo.” Rajada de submetralhadora.')
        await gm.screenshot(path='tests/saida/cb_ataque_gm.png')
        await gm.click('.cm-modal button:has-text("Atacar")'); await gm.wait_for_timeout(1500)
        print('p1 vê ataque:', await p1.evaluate("document.querySelector('.cm-modal-ataque') && document.querySelector('.cm-modal-ataque').innerText.split(String.fromCharCode(10)).filter(Boolean)"))
        await p1.screenshot(path='tests/saida/cb_ataque_p1.png')
        # forjas
        print('p1 forja estado:', await p1.evaluate("""(async()=>{const db=await claude.use('db');const k=Object.keys(__FAKE.store).find(k=>/ataques\\//.test(k)&&__FAKE.store[k].alvo==='p1');try{await db.doc(k).update({estado:'defendeu'});return 'GRAVOU'}catch(e){return e.code}})()"""))
        print('p1 mexe no ataque do p2:', await p1.evaluate("""(async()=>{const db=await claude.use('db');const k=Object.keys(__FAKE.store).find(k=>/ataques\\//.test(k)&&__FAKE.store[k].alvo==='p2');try{await db.doc(k).update({estado:'aceito'});return 'GRAVOU'}catch(e){return e.code}})()"""))
        await p1.click('.cm-modal-ataque button:has-text("Aceitar")'); await p1.wait_for_timeout(2500)
        print('p1 PV:', await p1.evaluate(V('PONTOS DE VIDA')), '| no mestre:', await gm.evaluate("(()=>{const k=Object.keys(__FAKE.store).find(k=>/fichas\\/p1$/.test(k));return __FAKE.store[k].dados['PONTOS DE VIDA']})()"))
        await p2.click('.cm-modal-ataque button:has-text("Contestar")'); await p2.wait_for_timeout(1500)
        print('p2 modal fechou:', await p2.evaluate("!document.querySelector('.cm-modal-ataque')"), 'pagina', await p2.evaluate("[...document.querySelectorAll('.sheet')].findIndex(x=>x.classList.contains('active'))"))
        print('gm decide:', await gm.evaluate("document.querySelector('.cm-modal-fixo') && document.querySelector('.cm-modal-fixo').innerText.split(String.fromCharCode(10)).filter(Boolean)"))
        await gm.screenshot(path='tests/saida/cb_decidir.png')
        await gm.fill('.cm-modal-fixo input[type=number]', '8'); await gm.click('.cm-modal-fixo button:has-text("Não conseguiu")'); await gm.wait_for_timeout(2500)
        print('p2 PV:', await p2.evaluate(V('PONTOS DE VIDA')), 'toasts:', await p2.evaluate("[...document.querySelectorAll('.cm-toast')].map(t=>t.innerText.replace(/\\s+/g,' ')).join(' || ')"))
        # blocos com brilho
        await gm.click('#cm-remota button:has-text("Combate")'); await gm.wait_for_timeout(800)
        print('pagina combate:', await gm.evaluate("document.querySelector('#comu .cm-principal').innerText.split(String.fromCharCode(10)).filter(Boolean).slice(0,30)"))
        await gm.screenshot(path='tests/saida/cb_combate.png', full_page=True)
        grupos = "[...document.querySelectorAll('.cm-fb-grupo.cm-lado-aliado .cm-fb, .cm-fb-grupo.cm-lado-inimigo .cm-fb')].map(b=>b.closest('.cm-fb-grupo').className.split('cm-lado-')[1]+':'+b.innerText.split(String.fromCharCode(10)).filter(Boolean).slice(0,4).join(' '))"
        print('grupos:', await gm.evaluate(grupos))
        print('brilho:', await gm.evaluate("[...document.querySelectorAll('.cm-fb-w.cm-vez')].map(e=>e.innerText.split(String.fromCharCode(10)).slice(0,3).join(' '))"))
        print('lado antes:', await gm.evaluate("__comuEstado.d.fichasM.map(f=>f.lado)"), await gm.locator('.cm-fb-lado').count())
        await gm.click('.cm-fb-lado'); await gm.wait_for_timeout(1500)
        print('lado depois:', await gm.evaluate("__comuEstado.d.fichasM.map(f=>f.lado)"), await toasts(gm))
        print('depois de trocar lado:', await gm.evaluate(grupos))
        await gm.click('.cm-fb-lado'); await gm.wait_for_timeout(1000)
        await gm.set_viewport_size({'width':390,'height':844}); await gm.wait_for_timeout(400)
        await gm.screenshot(path='tests/saida/cb_combate_cel.png', full_page=True)
        await gm.set_viewport_size({'width':1400,'height':900}); await gm.wait_for_timeout(300)
        await gm.click('.cm-ferr-troca:has-text("Fichas")'); await gm.wait_for_timeout(600)
        print('bloco na vez:', await gm.evaluate("[...document.querySelectorAll('.cm-fb-w.cm-vez')].map(e=>e.innerText.split(String.fromCharCode(10))[0])"))
        await gm.screenshot(path='tests/saida/cb_blocos.png', full_page=True)
        # celular: painel recolhido
        await gm.set_viewport_size({'width':390,'height':844}); await gm.wait_for_timeout(300)
        await gm.click('.cm-fb-monstro'); await gm.wait_for_timeout(1000)
        print('cel:', await gm.evaluate("[document.getElementById('cm-remota').hidden, !document.getElementById('cm-aba-lado').hidden]"))
        await gm.click('.cm-ml-recolher'); await gm.wait_for_timeout(300)
        print('recolhido:', await gm.evaluate("[document.getElementById('cm-remota').hidden, !document.getElementById('cm-aba-lado').hidden]"))
        await gm.screenshot(path='tests/saida/cb_cel_fechado.png')
        await gm.click('#cm-aba-lado'); await gm.wait_for_timeout(400)
        await gm.screenshot(path='tests/saida/cb_cel.png')
        print('neg', await neg(gm), await neg(p1), await neg(p2))
        print('errors', errs)
        await b.close()
asyncio.run(main())
