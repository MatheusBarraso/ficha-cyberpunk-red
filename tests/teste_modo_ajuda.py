import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403
import sys as _s; _e=_s.argv[1:]; sys.argv=['x','ok']+_e

T = "(s)=>[...document.querySelectorAll(s)].filter(e=>e.getClientRects().length).map(e=>e.innerText.replace(/\\s+/g,' ').trim())"
ESC = 'esc' in sys.argv
PERTURBA = 'fonte' in sys.argv
async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        ctx = await b.new_context(viewport={'width':1400,'height':900}, device_scale_factor=2); await ctx.route('**/*', handler)
        if PERTURBA: await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const st=document.createElement('style');st.textContent='.pdfart text{font-family:serif!important}';document.head.append(st)})")
        if ESC: await ctx.add_init_script("try{localStorage.setItem('cpr-escuro','1');localStorage.setItem('cpr-tema-v2','#1a9fd6')}catch(e){}")
        errs=[]
        async def pg(u):
            x = await ctx.new_page(); x.on('pageerror', lambda e: errs.append(u+' '+str(e)))
            await x.goto(f'https://ficha.test/index.html#u={u}&login=1'); await x.wait_for_timeout(1300); return x
        gm = await pg('gm')
        await gm.click('.sk-escolha.mestre'); await gm.wait_for_timeout(500)
        await gm.click('text=＋ Nova sessão'); await gm.fill('label:has-text("Nome da campanha") input', 'Noites de Cromo')
        await gm.click('#comu button:has-text("Criar sessão")'); await gm.wait_for_timeout(2500)
        code = await gm.evaluate("document.querySelector('.cm-codigo.grande span').textContent")
        p1 = await pg('p1')
        await p1.click('.sk-escolha.player'); await p1.wait_for_timeout(300)
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
        await gm.evaluate("__comuEstado.ferrVer='fichas'; __comuAbrir('ferramentas')"); await gm.wait_for_timeout(800)
        await gm.locator('.cm-fb-player').first.click(); await gm.wait_for_timeout(1500)
        print('switch:', await gm.evaluate("[...document.querySelectorAll('.cm-ml-ajuda')].map(b=>b.textContent+' '+b.getAttribute('aria-checked'))"))
        await gm.click('[data-f="PAPEL"]'); await gm.wait_for_timeout(700)
        print('gm foco:', await gm.evaluate("__cmAjuda()"))
        await gm.screenshot(path='tests/saida/aj_gm.png')
        await gm.click('input[data-pdf="NVL 16"]'); await gm.wait_for_timeout(600)
        print('linha:', await gm.evaluate("(()=>{const l=document.querySelector('.cm-foco-luz');return [l&&l.style.cssText, document.querySelectorAll('.cm-foco-alvo').length]})()"))
        await gm.screenshot(path='tests/saida/aj_linha.png')
        await gm.click('[data-f="REF"]'); await gm.wait_for_timeout(500)
        await gm.screenshot(path='tests/saida/aj_ref.png')
        for i,c in enumerate(['ESPECIALISTA LOCAL 2','ARMADURA 3','IDIOMA 2','ARMADURA 1','ARMA 1','ARMA 5','ARMADURA 4','ARMA 6','NOTAS 6']):
            loc=gm.locator(f'.pdflayer [data-f="{c}"]')
            if await loc.count()==0: print('sem',c); continue
            await loc.first.click(); await gm.wait_for_timeout(500)
            print(c, await gm.evaluate("(()=>{const l=document.querySelector('.cm-foco-luz');return [l&&l.style.cssText, document.querySelectorAll('.cm-foco-alvo').length]})()"))
            await gm.screenshot(path=f'tests/saida/aj_sub{i}{"e" if ESC else ""}.png')
        await gm.click('[data-f="PAPEL"]'); await gm.wait_for_timeout(500)
        await p1.bring_to_front(); await p1.wait_for_timeout(1500)
        print('p1 foco:', await p1.evaluate("__cmAjuda()"))
        await p1.screenshot(path='tests/saida/aj_p1.png')
        await gm.bring_to_front(); await gm.click('[data-f="REF"]'); await gm.wait_for_timeout(600)
        await p1.bring_to_front(); await p1.wait_for_timeout(1200)
        print('p1 foco 2:', await p1.evaluate("__cmAjuda()"))
        await gm.bring_to_front(); await gm.evaluate("document.activeElement.blur()"); await gm.wait_for_timeout(800)
        print('gm depois:', await gm.evaluate("__cmAjuda()"))
        await p1.bring_to_front(); await p1.wait_for_timeout(1200)
        print('p1 depois:', await p1.evaluate("__cmAjuda()"))
        # desliga o modo ajuda
        await gm.bring_to_front(); await gm.click('.cm-ml-ajuda'); await gm.wait_for_timeout(300)
        await gm.click('[data-f="PAPEL"]'); await gm.wait_for_timeout(500)
        print('gm desligado:', await gm.evaluate("__cmAjuda()"))
        print('errors', errs)
        await b.close()
asyncio.run(main())
