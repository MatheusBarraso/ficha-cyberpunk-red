import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403
sys.argv=['x','ok']

T = "(s)=>[...document.querySelectorAll(s)].filter(e=>e.getClientRects().length).map(e=>e.innerText.replace(/\\s+/g,' ').trim())"
async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        ctx = await b.new_context(viewport={'width':1400,'height':900}); await ctx.route('**/*', handler)
        errs=[]
        async def pg(u):
            x = await ctx.new_page(); x.on('pageerror', lambda e: errs.append(u+' '+str(e)))
            await x.goto(f'https://ficha.test/index.html#u={u}&login=1'); await x.wait_for_timeout(1300); return x
        gm = await pg('gm')
        await gm.click('.cm-escolha.mestre'); await gm.wait_for_timeout(500)
        await gm.click('text=＋ Nova sessão'); await gm.fill('label:has-text("Nome da campanha") input', 'Noites de Cromo')
        await gm.click('#comu button:has-text("Criar sessão")'); await gm.wait_for_timeout(2500)
        code = await gm.evaluate("document.querySelector('.cm-codigo.grande span').textContent")
        p1 = await pg('p1')
        await p1.click('.cm-escolha.player'); await p1.wait_for_timeout(300)
        await p1.fill('.cm-in-codigo', code); await p1.click('#comu button:has-text("Buscar sessão")'); await p1.wait_for_timeout(1200)
        await p1.click('#comu button:has-text("Solicitar entrada")'); await p1.wait_for_timeout(1200)
        await gm.bring_to_front(); await gm.wait_for_timeout(600)
        await gm.click('#comu button:has-text("Aprovar")'); await gm.wait_for_timeout(900)
        await p1.bring_to_front(); await p1.wait_for_timeout(900)
        await p1.click('#comu button:has-text("Entrar na sala")'); await p1.wait_for_timeout(1500)
        await p1.fill('[data-f="NOME"]', 'Kira Navalha') if False else None
        await p1.click('#comu .cm-bar button:has-text("Ficha")'); await p1.wait_for_timeout(800)
        await p1.fill('[data-f="NOME"]', 'Kira Navalha'); await p1.wait_for_timeout(2500)
        print('p1 marca antes:', await p1.evaluate(T, '.cm-marca'))
        await gm.bring_to_front()
        await gm.bring_to_front()
        await gm.locator("#comu button").filter(has_text="Abrir sala").first.click(); await gm.wait_for_timeout(1500)
        print('aba:', await gm.evaluate("[__comuEstado.sec, [...document.querySelectorAll('.cm-tabs button')].map(b=>b.textContent.trim()).join('|')]"))
        await gm.wait_for_timeout(600); await gm.screenshot(path='tests/saida/h_vazio.png')
        v = await gm.evaluate("(()=>{const r=document.querySelector('.cm-qvista').getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()")
        # texto
        await gm.click('.cm-qdb[data-f="texto"]'); await gm.wait_for_timeout(200)
        await gm.evaluate("window.__lg=[]; const o=HTMLTextAreaElement.prototype.remove; HTMLTextAreaElement.prototype.remove=function(){window.__lg.push('remove '+new Error().stack.split('\\n').slice(1,4).join('|'));return o.call(this)}; const rc0=Element.prototype.replaceChildren; Element.prototype.replaceChildren=function(...a){if(this.classList&&this.classList.contains('cm-qtabua'))window.__lg.push('rc '+new Error().stack.split('\\n').slice(2,7).map(x=>x.trim().slice(3,60)).join('|'));return rc0.apply(this,a)}; document.addEventListener('focusout',e=>window.__lg.push('focusout '+e.target.className+' -> '+(e.relatedTarget&&e.relatedTarget.className)),true)")
        await gm.mouse.click(v[0]+220, v[1]+120); await gm.wait_for_timeout(300)
        print('log', await gm.evaluate("window.__lg"))
        print('editor?', await gm.evaluate("[__comuEstado.qFerr, __comuEstado.escreve, !!document.querySelector('.cm-qeditor'), document.activeElement.className, document.elementFromPoint(%d,%d).className]" % (v[0]+220, v[1]+120)))
        await gm.keyboard.type('Noite 1: o grupo chegou em Watson.'); await gm.keyboard.press('Control+Enter'); await gm.wait_for_timeout(800)
        # desenho
        await gm.click('.cm-qdb[data-f="lapis"]'); await gm.wait_for_timeout(200)
        await gm.click('.cm-qcor[aria-label="Cor #cf2b21"]')
        await gm.mouse.move(v[0]+300, v[1]+330); await gm.mouse.down()
        for i in range(20): await gm.mouse.move(v[0]+300+i*15, v[1]+330+ (i%5)*8)
        await gm.mouse.up(); await gm.wait_for_timeout(800)
        # imagem
        await gm.set_input_files('.cm-qdoca input[type=file]', 'src/publico/exemplo/mapa-exemplo.jpg'); await gm.wait_for_timeout(2500)
        print('itens gm:', await gm.evaluate("__comuEstado.d.quadro.map(q=>q.tipo)"))
        # fundo escuro
        await gm.click('.cm-qzfundo'); await gm.wait_for_timeout(300)
        await gm.click('.jn .cm-qfp:has-text("Rede")'); await gm.click('.jn button:has-text("Salvar")'); await gm.wait_for_timeout(800)
        await gm.click('.cm-qdb[data-f="mover"]'); await gm.wait_for_timeout(300)
        await gm.screenshot(path='tests/saida/h_gm.png')
        await gm.click('.cm-qdb[data-f="lapis"]'); await gm.wait_for_timeout(300); await gm.screenshot(path='tests/saida/h_gm_lapis.png'); await gm.click('.cm-qdb[data-f="mover"]')
        # player
        await p1.bring_to_front(); await p1.evaluate("__comuAbrir('historia')"); await p1.wait_for_timeout(1500)
        print('itens p1:', await p1.evaluate("__comuEstado.d.quadro.map(q=>q.tipo)"), await p1.evaluate("getComputedStyle(document.querySelector('.cm-qtabua')).getPropertyValue('--q-fundo')"))
        v2 = await p1.evaluate("(()=>{const r=document.querySelector('.cm-qvista').getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()")
        await p1.click('.cm-qdb[data-f="texto"]'); await p1.mouse.click(v2[0]+500, v2[1]+80); await p1.wait_for_timeout(300)
        await p1.keyboard.type('Kira: eu não confio no fixer.'); await p1.keyboard.press('Control+Enter'); await p1.wait_for_timeout(900)
        # p1 tenta arrastar o texto do mestre: não pode
        await p1.click('.cm-qdb[data-f="mover"]'); await p1.wait_for_timeout(200)
        el = await p1.evaluate("(()=>{const e=[...document.querySelectorAll('.cm-q-texto')].find(x=>x.textContent.includes('Watson'));const r=e.getBoundingClientRect();return [r.x+20,r.y+10, e.className]})()")
        await p1.mouse.move(el[0], el[1]); await p1.mouse.down(); await p1.mouse.move(el[0]+120, el[1]+80, steps=5); await p1.mouse.up(); await p1.wait_for_timeout(600)
        print('p1 moveu do mestre?', el[2], await p1.evaluate("__comuEstado.d.quadro.find(q=>q.texto&&q.texto.includes('Watson')).x"))
        # mestre move o texto do player
        await gm.bring_to_front(); await gm.wait_for_timeout(800)
        el = await gm.evaluate("(()=>{const e=[...document.querySelectorAll('.cm-q-texto')].find(x=>x.textContent.includes('fixer'));const r=e.getBoundingClientRect();return [r.x+20,r.y+10]})()")
        antes = await gm.evaluate("__comuEstado.d.quadro.find(q=>q.texto&&q.texto.includes('fixer')).x")
        await gm.mouse.move(el[0], el[1]); await gm.mouse.down(); await gm.mouse.move(el[0]+100, el[1]+60, steps=5); await gm.mouse.up(); await gm.wait_for_timeout(800)
        print('mestre moveu do player:', antes, '->', await gm.evaluate("__comuEstado.d.quadro.find(q=>q.texto&&q.texto.includes('fixer')).x"))
        await p1.bring_to_front(); await p1.wait_for_timeout(800)
        await p1.screenshot(path='tests/saida/h_p1.png')
        print('sino p1:', await p1.evaluate("document.querySelector('#comu .cm-sino .cm-n').textContent"))
        print('errors', errs)
        await b.close()
asyncio.run(main())
