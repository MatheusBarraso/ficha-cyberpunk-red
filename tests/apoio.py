"""Apoio comum dos testes: serve o site gerado em https://ficha.test/ e troca o Firebase por um falso.

O Firebase falso (fake_firebase.js) guarda tudo no localStorage do navegador de teste e aplica as
mesmas regras de acesso do firestore.rules — dá pra testar mestre e players em abas do mesmo contexto.
Cada aba escolhe quem é pelo endereço: #u=gm&login=1 (u = id do usuário; login=1 já entra logado).
"""
import mimetypes
import os
import sys

from playwright.async_api import async_playwright  # noqa: F401 (usado pelos testes)

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
ROOT = os.environ.get('SKETCHER_SITE', RAIZ)          # pasta com o site gerado (index.html)
FAKE = open(os.path.join(AQUI, 'fake_firebase.js'), encoding='utf-8').read()
SAIDA = os.path.join(AQUI, 'saida')                     # capturas de tela dos testes
os.makedirs(SAIDA, exist_ok=True)
CHROME = os.environ.get('CHROME') or ('/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None)
CFG = sys.argv[1] if len(sys.argv) > 1 else 'ok'


async def handler(route):
    url = route.request.url
    if 'gstatic.com/firebasejs' in url:
        return await route.fulfill(body=FAKE, content_type='text/javascript', headers={'access-control-allow-origin': '*'})
    if not url.startswith('https://ficha.test/'):
        return await route.abort()
    path = url.split('https://ficha.test/', 1)[1].split('?')[0].split('#')[0] or 'index.html'
    if path == 'firebase-config.js' and CFG == 'ok':
        return await route.fulfill(body='window.FIREBASE_CONFIG={apiKey:"teste",projectId:"x"};', content_type='text/javascript')
    fp = os.path.join(ROOT, path)
    if os.path.isfile(fp):
        ct = 'text/javascript' if fp.endswith('.js') else (mimetypes.guess_type(fp)[0] or 'application/octet-stream')
        await route.fulfill(path=fp, content_type=ct)
    else:
        await route.fulfill(status=404, body='nf')


async def lancar(p, **kw):
    """Abre o Chrome do sistema (se houver) ou o Chromium do Playwright.

    Os contextos saem com o service worker bloqueado (ele buscaria o site de teste na internet de verdade)
    e já com um RPG escolhido (Cyberpunk RED), pra tela de escolha da primeira visita não cobrir a página,
    e com a tela "Seu perfil" (primeira tela depois de entrar com a conta) deixada pra depois.
    Pra testar a primeira visita: b.new_context(primeira_visita=True); pra ver a tela do perfil: #perfil=1 no endereço.
    """
    if CHROME:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'], **kw)
    else:
        b = await p.chromium.launch(**kw)
    original = b.new_context

    async def novo_contexto(primeira_visita=False, **opcoes):
        opcoes.setdefault('service_workers', 'block')
        ctx = await original(**opcoes)
        if not primeira_visita:
            await ctx.add_init_script("try{if(!localStorage.getItem('sk-sistema'))localStorage.setItem('sk-sistema','cpr')}catch(e){}")
            await ctx.add_init_script("try{var m=/[#&]u=([^&]+)/.exec(location.hash);if(m&&!/perfil=1/.test(location.hash))sessionStorage.setItem('cpr-com-perfil-depois',m[1])}catch(e){}")
        return ctx
    b.new_context = novo_contexto
    return b


async def txt(pg, sel): return await pg.evaluate(f"(()=>{{const e=document.querySelector({sel!r});return e?e.textContent:null}})()")
async def msgs(pg): return await pg.evaluate("[...document.querySelectorAll('#comu .cm-err, #comu [role=status]')].map(e=>e.textContent)")
async def toasts(pg): return await pg.evaluate("[...document.querySelectorAll('.cm-toast')].map(t=>t.textContent)")
async def neg(pg): return await pg.evaluate("window.__FAKE ? __FAKE.negados.splice(0) : 'sem fake'")


async def buscar(pg, code):
    await pg.fill('.cm-in-codigo', code)
    await pg.click('#comu button:has-text("Buscar sessão")')
    await pg.wait_for_timeout(500)
