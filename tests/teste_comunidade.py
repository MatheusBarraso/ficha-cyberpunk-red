import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403

async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        ctx = await b.new_context(viewport={'width':1300,'height':850})
        await ctx.route('**/*', handler)
        errs=[]
        async def pg_new(u, login=True):
            pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(u+' '+str(e)))
            pg.on('console', lambda m: m.type=='error' and errs.append(u+' console '+m.text))
            await pg.goto(f'https://ficha.test/index.html#u={u}' + ('&login=1' if login else '')); await pg.wait_for_timeout(1200); return pg
        if CFG != 'ok':
            pg = await pg_new('gm')
            await pg.wait_for_selector('.sk-escolha'); await pg.click('.sk-escolha.mestre'); await pg.wait_for_timeout(400)
            print('semconfig:', await pg.evaluate("document.querySelector('#comu').innerText.slice(0,400)"))
            await pg.screenshot(path='tests/saida/gh_semconfig.png')
            print('ficha liberada?', await pg.evaluate("!document.documentElement.classList.contains('cm-gate')"))
            print('errors', errs); await b.close(); return
        # login pelo botão
        gm = await pg_new('gm', login=False)
        await gm.wait_for_selector('.sk-escolha'); await gm.click('.sk-escolha.mestre'); await gm.wait_for_timeout(300)
        print('antes do login:', await gm.evaluate("document.querySelector('#comu').innerText.slice(0,200)"))
        await gm.screenshot(path='tests/saida/gh_login.png')
        await gm.click('#comu button:has-text("Entrar com Google")'); await gm.wait_for_timeout(1500)
        print('depois:', await txt(gm, '.cm-cidade'), 'me=', await gm.evaluate("__comuEstado && __comuEstado.me"))
        if await gm.locator('.sk-escolha.mestre').count(): await gm.click('.sk-escolha.mestre'); await gm.wait_for_timeout(300)
        await gm.click('text=＋ Nova sessão')
        await gm.fill('label:has-text("Nome da campanha") input', 'Noites de Cromo'); await gm.fill('label:has-text("Descrição") textarea', 'Campanha de teste.')
        await gm.fill('label:has-text("Limite de jogadores") input', '1')
        await gm.check('label:has-text("cidade de exemplo") input')
        await gm.click('#comu button:has-text("Criar sessão")'); await gm.wait_for_timeout(2500)
        code = await txt(gm, '.cm-codigo.grande span'); print('code', code, 'neg gm', await neg(gm))
        p1 = await pg_new('p1')
        await p1.wait_for_selector('.sk-escolha'); await p1.click('.sk-escolha.player'); await p1.wait_for_timeout(200)
        await buscar(p1, 'ABCD-2345'); print('inexistente', await msgs(p1))
        await buscar(p1, code); print('achou', await txt(p1, '.cm-entra .cm-nome'), await txt(p1, '.cm-entra .cm-meta'))
        await p1.click('#comu button:has-text("Solicitar entrada")'); await p1.wait_for_timeout(700)
        print('neg p1', await neg(p1))
        # intruso tenta ler conteúdo e pedidos diretamente
        x = await pg_new('x')
        print('intruso:', await x.evaluate("""(async()=>{const db=await claude.use('db');const sid=Object.keys(__FAKE.store).find(k=>k.startsWith('sessoes/')&&k.split('/').length==2).split('/')[1];const out=[];
          for (const [n,q] of [['npcs',db.collection('mestres/gm/sessoes/'+sid+'/npcs')],['pedidosTodos',db.collection('pedidos')],['pedidoP1',db.doc('pedidos/p1')],['sessoesDoGm',db.collection('mestres/gm/sessoes')],['mural',db.collection('sessoes/'+sid+'/mural')],['convitesLista',db.collection('convites')]]) { try { await q.get(); out.push(n+':LEU'); } catch(e){ out.push(n+':'+e.code); } }
          try { await db.doc('mestres/gm/sessoes/'+sid+'/membros/x').set({estado:'aprovado'}); out.push('autoaprovar:GRAVOU'); } catch(e){ out.push('autoaprovar:'+e.code); }
          return out.join(' ');})()"""))
        await gm.bring_to_front(); await gm.wait_for_timeout(700)
        print('gm toasts', await toasts(gm))
        await gm.click('#comu button:has-text("Aprovar")'); await gm.wait_for_timeout(700)
        await p1.bring_to_front(); await p1.wait_for_timeout(800)
        print('p1 toasts', await toasts(p1))
        await p1.click('#comu button:has-text("Entrar na sala")'); await p1.wait_for_timeout(1500)
        print('p1 sala', await txt(p1, '.cm-cidade'), await txt(p1, '#comu .cm-conta-papel'))
        await p1.evaluate("__comuAbrir('mapa')"); await p1.wait_for_timeout(500)
        print('mapa img', await p1.evaluate("(()=>{const i=document.querySelector('#comu .cm-mapa-in img');return i&&[i.getAttribute('src'),i.naturalWidth]})()"))
        await p1.screenshot(path='tests/saida/gh_p1_mapa.png')
        await p1.evaluate("__comuAbrir('npcs')"); await p1.wait_for_timeout(400); print('npcs p1', await p1.evaluate("[...document.querySelectorAll('#comu .cm-nome')].map(e=>e.textContent)"))
        await p1.evaluate("__comuAbrir('mural')"); await p1.wait_for_timeout(400)
        await p1.evaluate("__comuAbrir('historia')"); await p1.wait_for_timeout(500); await p1.click('.cm-qdb[data-f="texto"]'); vq = await p1.evaluate("(()=>{const r=document.querySelector('.cm-qvista').getBoundingClientRect();return [r.x+200,r.y+120]})()"); await p1.mouse.click(vq[0], vq[1]); await p1.wait_for_timeout(300); await p1.keyboard.type('Alguém viu a Kira?'); await p1.keyboard.press('Control+Enter'); await p1.wait_for_timeout(700)
        print('quadro p1', await p1.evaluate("[...document.querySelectorAll('.cm-qtexto')].map(e=>e.textContent)"), 'forjar quadro:', await p1.evaluate("""(async()=>{const db=await claude.use('db');const sid=__comuEstado.sess.id;try{await db.collection('sessoes/'+sid+'/quadro').add({autor:'gm',tipo:'texto',texto:'falso',ts:1});return 'GRAVOU'}catch(e){return e.code}})()"""))
        print('mural p1', await p1.evaluate("[...document.querySelectorAll('#comu .cm-txt')].map(e=>e.textContent).slice(0,3)"), 'neg p1', await neg(p1))
        # tentar reagir pelo outro (forjar reação de gm)
        print('forjar reação:', await p1.evaluate("""(async()=>{const db=await claude.use('db');const k=Object.keys(__FAKE.store).find(k=>k.includes('/mural/'));try{await db.doc(k).update({reacoes:{gm:'🔥'}});return 'GRAVOU'}catch(e){return e.code}})()"""))
        print('forjar autor:', await p1.evaluate("""(async()=>{const db=await claude.use('db');const sid=__comuEstado.sess.id;try{await db.collection('sessoes/'+sid+'/mural').add({autor:'gm',texto:'falso',ts:1});return 'GRAVOU'}catch(e){return e.code}})()"""))
        print('forjar NPC:', await p1.evaluate("""(async()=>{const db=await claude.use('db');const sid=__comuEstado.sess.id;try{await db.collection('sessoes/'+sid+'/mural').add({autor:'p1',mestre:true,npc:'ex-kira',texto:'falso',ts:1});return 'GRAVOU'}catch(e){return e.code}})()"""))
        p2 = await pg_new('p2')
        await p2.wait_for_selector('.sk-escolha'); await p2.click('.sk-escolha.player'); await buscar(p2, code); print('p2 lotada', await txt(p2, '.cm-entra .cm-err'))
        # remover p1 -> perde acesso no servidor
        await gm.bring_to_front(); await gm.click('#comu button:has-text("Remover")'); await gm.click('.cfm .ok'); await gm.wait_for_timeout(700)
        await p1.bring_to_front(); await p1.wait_for_timeout(900)
        print('p1 expulso', await p1.evaluate("!__comuEstado.sess"), await toasts(p1))
        print('p1 lê depois de removido:', await p1.evaluate("""(async()=>{const db=await claude.use('db');const sid=Object.keys(__FAKE.store).find(k=>k.startsWith('sessoes/')&&k.split('/').length==2).split('/')[1];try{await db.collection('mestres/gm/sessoes/'+sid+'/npcs').get();return 'LEU'}catch(e){return e.code}})()"""))
        await neg(p1)
        # sessão com entrada direta
        await gm.click('#comu button:has-text("Suas sessões")')
        await gm.wait_for_timeout(300); print('gm tela:', (await gm.evaluate("document.querySelector('#comu').innerText"))[:300].replace(chr(10),' | '))
        await gm.click('text=＋ Nova sessão')
        await gm.fill('label:has-text("Nome da campanha") input', 'Entrada direta')
        await gm.select_option('label:has-text("Entrada") select', 'automatica')
        await gm.click('#comu button:has-text("Criar sessão")'); await gm.wait_for_timeout(2000)
        code3 = await txt(gm, '.cm-codigo.grande span'); print('code3', code3)
        await p2.bring_to_front(); await buscar(p2, code3)
        await p2.click('#comu button:has-text("Confirmar entrada")'); await p2.wait_for_timeout(1500)
        print('p2 entrou direto', await txt(p2, '.cm-cidade'), 'neg p2', await neg(p2))
        await p2.evaluate("__comuAbrir('npcs')"); await p2.wait_for_timeout(400)
        await gm.bring_to_front(); await gm.wait_for_timeout(800)
        print('gm registrou membro auto', await gm.evaluate("Object.entries(__FAKE.store).filter(([k,v])=>k.includes('/membros/p2')).map(([k,v])=>v.estado)"))
        # conversa com NPC (sessão 1 já não tem p1; usa a sessão 2 com p2)
        print('neg gm final', await neg(gm))
        await gm.screenshot(path='tests/saida/gh_gm.png')
        print('errors', errs)
        await b.close()
asyncio.run(main())
