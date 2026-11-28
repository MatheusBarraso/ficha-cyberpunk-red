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
        async def nova(u, extra=''):
            pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(u+str(e)))
            await pg.goto(f'https://ficha.test/index.html#u={u}&login=1{extra}'); await pg.wait_for_timeout(1300); return pg
        # ---- senha ----
        m2 = await nova('m2', '&semchave')
        await m2.click('.cm-escolha.mestre'); await m2.wait_for_timeout(600)
        print('m2 tela:', await txt(m2, '#comu .cm-body'))
        await m2.fill('.cm-senha input', 'lapis e legal'); await m2.click('text=Entrar como mestre'); await m2.wait_for_timeout(600)
        print('senha errada ->', await txt(m2, '.cm-senha .cm-err'))
        print('m2 cria sessão direto no banco:', await m2.evaluate("""(async()=>{const db=await claude.use('db');try{await db.doc('mestres/m2/sessoes/zz').set({gm:'m2',nome:'x'});return 'GRAVOU'}catch(e){return e.code}})()"""))
        await m2.fill('.cm-senha input', ' 999 '); await m2.click('text=Entrar como mestre'); await m2.wait_for_timeout(800)
        print('senha certa ->', (await txt(m2, '#comu .cm-body'))[:80])
        await m2.close()
        # ---- mestre sem ficha ----
        gm = await nova('gm')
        await gm.click('.cm-escolha.mestre'); await gm.wait_for_timeout(400)
        await gm.click('text=＋ Nova sessão')
        await gm.fill('label:has-text("Nome da campanha") input', 'Mesa ferramentas'); await gm.select_option('label:has-text("Entrada") select', 'automatica')
        await gm.click('#comu button:has-text("Criar sessão")'); await gm.wait_for_timeout(2000)
        code = await txt(gm, '.cm-codigo.grande span')
        await gm.locator("#comu button").filter(has_text="sala").first.click(); await gm.wait_for_timeout(1200)
        print('gm abas:', await gm.evaluate("[...document.querySelectorAll('.cm-tab')].filter(t=>!t.hidden).map(t=>t.textContent)"))
        p1 = await nova('p1'); await p1.click('.cm-escolha.player'); await buscar(p1, code)
        await p1.click('#comu button:has-text("Confirmar entrada")'); await p1.wait_for_timeout(1500)
        print('p1 abas:', await p1.evaluate("[...document.querySelectorAll('.cm-tab')].filter(t=>!t.hidden).map(t=>t.textContent)"))
        await p1.evaluate("showPage(0)"); await p1.wait_for_timeout(500)
        campo = await p1.evaluate("fields.map(f=>f.dataset.f).find(k=>/HP|PV|VIDA/i.test(k)) || fields[20].dataset.f")
        print('campo extra:', campo)
        await p1.fill('[data-f="NOME"]', 'Kira'); await p1.fill('[data-f="PAPEL"]', 'Netrunner'); await p1.wait_for_timeout(2500)
        print('doc ficha p1:', await p1.evaluate("(()=>{const k=Object.keys(__FAKE.store).find(k=>/fichas\\/p1$/.test(k));return k&&[__FAKE.store[k].dados.NOME,__FAKE.store[k].por]})()"))
        # mestre
        await gm.evaluate("__comuAbrir('ferramentas')"); await gm.wait_for_timeout(800)
        print('ferramentas:', await txt(gm, '#comu .cm-principal'))
        await gm.click('.cm-fb-player'); await gm.wait_for_timeout(1200)
        print('gm vê:', await gm.evaluate(V('NOME')), await gm.evaluate(V('PAPEL')), 'barra:', await gm.evaluate("!document.getElementById('cm-remota').hidden"), 'semficha?', await gm.evaluate("document.body.classList.contains('cm-semficha')"))
        await gm.fill(f'[data-f="{campo}"]', '42'); await gm.fill('[data-f="PAPEL"]', 'Solo'); await gm.wait_for_timeout(2500)
        print('p1 recebeu:', await p1.evaluate(V(campo)), await p1.evaluate(V('PAPEL')), 'toast:', await p1.evaluate("[...document.querySelectorAll('.cm-toast')].map(t=>t.textContent).join(' | ')"))
        print('p1 salvo local:', await p1.evaluate(f"JSON.parse(localStorage.getItem('cpr-ficha-v1'))['{campo}']"))
        print('gm local intacto:', await gm.evaluate(f"(JSON.parse(localStorage.getItem('cpr-ficha-v1'))||{{}})['{campo}']"))
        await p1.fill('[data-f="NOME"]', 'Kira Volt'); await p1.wait_for_timeout(3000)
        print('gm recebeu do p1:', await gm.evaluate(V('NOME')))
        await gm.screenshot(path='tests/saida/ferr_gm.png')
        await gm.click('#cm-remota button:has-text("Fichas")'); await gm.wait_for_timeout(800)
        await gm.evaluate("document.querySelector('.cm-bar .cm-app') && 0")
        print('gm de volta: comunidade aberta', await gm.evaluate("document.body.classList.contains('comu-on')"), 'campos limpos', repr(await gm.evaluate(V('NOME'))))
        await gm.evaluate("showPage(1)"); await gm.wait_for_timeout(600)
        print('gm sem ficha:', await gm.evaluate("document.body.classList.contains('cm-semficha')"))
        await gm.screenshot(path='tests/saida/ferr_semficha.png')
        # NPC e monstro
        await gm.evaluate("__comuAbrir('ferramentas')"); await gm.wait_for_timeout(600)
        await gm.locator('.cm-fb-novo').nth(0).click(); await gm.wait_for_timeout(1200)
        print('npc nova aberta:', await gm.evaluate("[document.body.classList.contains('cm-remota'), document.querySelector('.cm-ml-tit small').textContent]"), repr(await gm.evaluate(V('NOME'))))
        await gm.fill('[data-f="NOME"]', 'Kira Volt'); await gm.fill('[data-f="PAPEL"]', 'Informante'); await gm.wait_for_timeout(1500)
        await gm.locator('.cm-fb-novo').nth(1).evaluate("e=>0")
        await gm.click('#cm-remota button:has-text("Fichas")'); await gm.wait_for_timeout(700)
        await gm.locator('.cm-fb-novo').nth(1).click(); await gm.wait_for_timeout(1200)
        await gm.fill('[data-f="NOME"]', 'Ciberpsicopata'); await gm.fill('[data-f="PONTOS DE VIDA"]', '55'); await gm.wait_for_timeout(1500)
        print('trocar no select:', await gm.evaluate("[...document.querySelectorAll('#cm-remota .cm-ml-item')].map(o=>o.parentElement.label+':'+o.textContent)"))
        await gm.click('#cm-remota button:has-text("Fichas")'); await gm.wait_for_timeout(700)
        print('blocos:', await gm.evaluate("[...document.querySelectorAll('.cm-fb:not(.cm-fb-novo)')].map(b=>b.innerText.split(String.fromCharCode(10)).filter(Boolean).join(' | '))"))
        await gm.screenshot(path='tests/saida/ferr_blocos.png', full_page=True)
        await gm.set_viewport_size({'width':390,'height':844}); await gm.wait_for_timeout(600)
        await gm.screenshot(path='tests/saida/ferr_blocos_cel.png')
        await gm.set_viewport_size({'width':1400,'height':900}); await gm.wait_for_timeout(300)
        # reabre a NPC e confere que guardou
        await gm.locator('.cm-fb-npc').first.click(); await gm.wait_for_timeout(1000)
        print('npc reaberta:', await gm.evaluate(V('NOME')), await gm.evaluate(V('PAPEL')))
        await gm.click('#cm-remota button:has-text("Fichas")'); await gm.wait_for_timeout(600)
        print('p1 lê ficha de NPC do mestre:', await p1.evaluate("""(async()=>{const db=await claude.use('db');const k=Object.keys(__FAKE.store).find(k=>/fichasMestre/.test(k));try{await db.doc(k).get();return 'LEU'}catch(e){return e.code}})()"""))
        gm.on('dialog', lambda d: None)
        await gm.locator('.cm-fb-monstro .cm-fb-x').first.click(); await gm.wait_for_timeout(400)
        print('confirm:', await gm.evaluate("[...document.querySelectorAll('.cfm, [class*=cfm], dialog')].map(e=>e.className+':'+e.innerText.slice(0,80))"))
        await gm.click('.cfm .ok'); await gm.wait_for_timeout(1500)
        print('depois de apagar monstro:', await gm.evaluate("document.querySelectorAll('.cm-fb-monstro').length"))
        # intruso tenta ler/forjar
        x = await nova('x')
        print('intruso lê ficha:', await x.evaluate("""(async()=>{const db=await claude.use('db');const k=Object.keys(__FAKE.store).find(k=>/fichas\\/p1$/.test(k));try{await db.doc(k).get();return 'LEU'}catch(e){return e.code}})()"""))
        print('p1 escreve ficha de outro:', await p1.evaluate("""(async()=>{const db=await claude.use('db');const k=Object.keys(__FAKE.store).find(k=>/fichas\\/p1$/.test(k)).replace('/p1','/p2');try{await db.doc(k).set({dados:{},por:'p1'});return 'GRAVOU'}catch(e){return e.code}})()"""))
        print('neg', await neg(gm), await neg(p1))
        print('errors', errs)
        await b.close()
asyncio.run(main())
