import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403
import sys as _s; _e=_s.argv[1:]; sys.argv=['x','ok']+_e

T = "(s)=>[...document.querySelectorAll(s)].filter(e=>e.getClientRects().length).map(e=>e.innerText.replace(/\\s+/g,' ').trim())"
ESC = len(sys.argv)>2
async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        ctx = await b.new_context(viewport={'width':412,'height':860}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'); await ctx.route('**/*', handler)
        if ESC: await ctx.add_init_script("try{localStorage.setItem('cpr-escuro','1');localStorage.setItem('cpr-tema-v2','#1a9fd6')}catch(e){}")
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
        await gm.evaluate("__comuEstado.ferrVer='fichas'; __comuAbrir('ferramentas')"); await gm.wait_for_timeout(800)
        await gm.locator('.cm-fb-player').first.click(); await gm.wait_for_timeout(1500)
        print('switch:', await gm.evaluate("[...document.querySelectorAll('.cm-ml-ajuda')].map(b=>b.textContent+' '+b.getAttribute('aria-checked'))"))

        await gm.wait_for_timeout(300)
        print('mob gm/p1', await gm.evaluate("document.body.classList.contains('mob')"), await p1.evaluate("document.body.classList.contains('mob')"))
        async def seq(campo, nome, tempos):
            await gm.bring_to_front(); await gm.evaluate("(c)=>{const e=c.startsWith('input')?document.querySelector(c):document.querySelector('[data-f=\"'+c+'\"]'); e.focus()}", campo)
            await p1.bring_to_front(); await p1.evaluate("scrollTo(0,0)"); t=0
            for k,ms in enumerate(tempos):
                await p1.wait_for_timeout(ms-t); t=ms
                await p1.screenshot(path=f'tests/saida/an_{nome}{k}.png')
            print(nome, await p1.evaluate("__cmAjuda()"), await gm.evaluate("__cmAjuda()"))
        await seq('input[data-pdf="NVL 16"]', 'c', [300, 1000, 1900, 3200])
        await seq('ARMADURA 3', 'd', [300, 1000, 1900, 3200])
        print('area p1', await p1.evaluate("__cmArea('ARMADURA 3')"), 'gm', await gm.evaluate("__cmArea('ARMADURA 3')"))
        print('txt', await p1.evaluate("(()=>{const sh=document.querySelector('[data-f=\"ARMADURA 3\"]').closest('.sheet');return [...sh.querySelectorAll('.pdfart text')].map(t=>{const b=t.getBBox();return [t.textContent.slice(0,18),+b.x.toFixed(1),+b.y.toFixed(1),+b.width.toFixed(1),+b.height.toFixed(1)]}).filter(a=>a[1]>500&&a[1]<560&&a[2]>820&&a[2]<1000)})()"))
        print('onde', await p1.evaluate("(()=>{const i=document.querySelector('[data-f=\"ARMADURA 3\"]');const n=document.querySelector('input[data-pdf=\"NVL 16\"]');return [!!i.closest('.pdflayer'),!!i.closest('.mslot'),!!n.closest('.pdflayer'),document.body.className, document.querySelector('.sheet.active').className, getComputedStyle(document.querySelector('.mobv')||document.body).display]})()"))
        print('errors', errs)
        await b.close()
asyncio.run(main())
