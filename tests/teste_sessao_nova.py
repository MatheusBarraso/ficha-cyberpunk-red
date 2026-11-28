import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403
sys.argv=['x','ok']

async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        ctx = await b.new_context(viewport={'width':1440,'height':900}); await ctx.route('**/*', handler)
        errs=[]
        gm = await ctx.new_page(); gm.on('pageerror', lambda e: errs.append(str(e)))
        await gm.goto('https://ficha.test/index.html#u=gm&login=1'); await gm.wait_for_timeout(1500)
        await gm.click('.sk-escolha.mestre'); await gm.wait_for_timeout(1500)
        print('brilho por baixo da comunidade?', await gm.evaluate("!!document.querySelector('.sheet.brilha')"))
        await gm.click('text=＋ Nova sessão'); await gm.fill('label:has-text("Nome da campanha") input', 'Noites de Cromo'); await gm.check('label:has-text("cidade de exemplo") input')
        await gm.click('#comu button:has-text("Criar sessão")'); await gm.wait_for_timeout(2500)
        await gm.locator("#comu button").filter(has_text="sala").first.click(); await gm.wait_for_timeout(1500)
        await gm.evaluate("(async()=>{const db=await claude.use('db');const s=__comuEstado.sess;await db.collection('sessoes/'+s.id+'/mural').add({autor:'gm',mestre:true,npc:'ex-kira',texto:'Alguém sabe quem está comprando chips de memória no cais?',ts:Date.now(),reacoes:{}})})()"); await gm.wait_for_timeout(800)
        print('menu marcado:', await gm.evaluate("[...document.querySelectorAll('#menu .active')].map(e=>e.textContent.trim())"))
        await gm.screenshot(path='tests/saida/n_sala.png')
        await gm.click('#comu .cm-sino'); await gm.wait_for_timeout(400)
        print('sino:', await gm.evaluate("[document.querySelector('#comu .cm-sino .cm-n').textContent, document.querySelectorAll('.cm-sino-painel .cm-linha').length, document.querySelector('.cm-sino-painel').innerText.slice(0,200), __comuEstado.sec]"))
        await gm.screenshot(path='tests/saida/n_sino.png')
        await gm.mouse.click(700, 600); await gm.wait_for_timeout(300)
        print('sino fecha ao clicar fora:', await gm.evaluate("document.querySelector('.cm-sino-painel').hidden"))
        # foto do NPC
        await gm.evaluate("__comuAbrir('npcs')"); await gm.wait_for_timeout(300)
        await gm.locator('#comu .cm-ficha').first.click(); await gm.wait_for_timeout(300)
        await gm.locator('.cm-foto-box input[type=file]').set_input_files('src/publico/exemplo/mapa-exemplo.jpg'); await gm.wait_for_timeout(2000)
        print('foto npc:', await gm.evaluate("(()=>{const i=document.querySelector('.cm-foto img');return i&&[i.getAttribute('src').slice(0,30), i.naturalWidth]})()"), await gm.evaluate("document.querySelector('.cm-foto-txt').textContent"))
        await gm.screenshot(path='tests/saida/n_npc.png')
        # fecha comunidade: menu volta pra página e o brilho acontece agora
        await gm.evaluate("[...document.querySelectorAll('#menu .tab')][1].click()"); await gm.wait_for_timeout(500)
        print('depois de abrir a ficha:', await gm.evaluate("[[...document.querySelectorAll('#menu .active')].map(e=>e.textContent.trim()), !!document.querySelector('.sheet.brilha')]"))
        print('errors', errs)
        # celular em pé
        c2 = await b.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True); await c2.route('**/*', handler)
        m = await c2.new_page(); await m.goto('https://ficha.test/index.html#u=p1&login=1'); await m.wait_for_timeout(1500)
        await m.click('.sk-escolha.player'); await m.wait_for_timeout(300)
        await m.evaluate("[...document.querySelectorAll('#comu .cm-bar .cm-btn')].find(b=>/Ficha/i.test(b.textContent)).click()"); await m.wait_for_timeout(3500)
        print('em pé:', await m.evaluate("({mob:document.body.classList.contains('mob'), sheet:getComputedStyle(document.querySelector('.sheet.active')).display, mpage:document.querySelector('#mpage-0') && getComputedStyle(document.querySelector('#mpage-0')).display, zoom:document.getElementById('zoom-pct').textContent, nomeNaFicha: !!document.querySelector('.sheet.active [data-f=\"NOME\"]')})"))
        await m.screenshot(path='tests/saida/n_empe.png')
        await m.evaluate("showPage(3)"); await m.wait_for_timeout(800); await m.screenshot(path='tests/saida/n_empe_notas.png')
        await b.close()
asyncio.run(main())
