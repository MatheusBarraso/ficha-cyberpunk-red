import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403
from playwright.async_api import async_playwright
JS = """(()=>{const mk=(cls,tag='div',pai=document.body)=>{const e=document.createElement(tag);e.className=cls;pai.append(e);return e};
const r={};
const n=mk('cm-n','span'); r.badge=getComputedStyle(n).backgroundColor;
const t=mk('cm-tab on','button'); r.tab=getComputedStyle(t).borderBottomColor;
const l=mk('cm-foco-luz'); r.luz=getComputedStyle(l).borderTopColor;
const g=mk('cm-foco-leg'); r.leg=getComputedStyle(g).backgroundColor+' / '+getComputedStyle(g).color;
const to=mk('cm-toast'); const tb=mk('','b',to); r.toast=getComputedStyle(tb).backgroundColor;
const m=mk('cm-marca'); r.marca=getComputedStyle(m).borderLeftColor;
const a=mk('cm-aviso'); r.aviso=getComputedStyle(a).borderLeftColor;
r.acc2=getComputedStyle(document.documentElement).getPropertyValue('--acc2'); r.ink=getComputedStyle(document.documentElement).getPropertyValue('--acc2-ink');
return r})()"""
async def main():
    async with async_playwright() as p:
        b=await lancar(p)
        for nome,init in [('claro',''),('escuro',"localStorage.setItem('cpr-escuro','1')"),('ciano',"localStorage.setItem('cpr-escuro','1');localStorage.setItem('cpr-destaque','#00f0ff')"),('rosa',"localStorage.setItem('cpr-destaque','#ff2a6d')")]:
            ctx=await b.new_context()
            if init: await ctx.add_init_script("try{"+init+"}catch(e){}")
            pg=await ctx.new_page(); await pg.goto('file://' + ROOT + '/index.html'); await pg.wait_for_timeout(1200)
            print(nome, await pg.evaluate(JS)); await ctx.close()
        await b.close()
asyncio.run(main())
