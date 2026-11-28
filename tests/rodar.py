"""Roda todos os testes (tests/teste_*.py) e dá um veredito só.

    python3 tests/rodar.py                 todos
    python3 tests/rodar.py combate ajuda   só os que têm essas palavras no nome

Um teste passa quando: termina sem erro, não mostra Traceback, não escreve FALHOU e todas as
linhas de erros da página ("errors [...]", "erros: [...]") vêm vazias.
Precisa de: pip install playwright (e um Chrome/Chromium). O site testado é o da raiz do repositório
(gere antes com `npm run build`) ou o da pasta em SKETCHER_SITE.
"""
import concurrent.futures as cf
import glob
import os
import re
import subprocess
import sys
import time

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
filtros = sys.argv[1:]
testes = sorted(glob.glob(os.path.join(AQUI, 'teste_*.py')))
if filtros:
    testes = [t for t in testes if any(f in os.path.basename(t) for f in filtros)]

ERROS = re.compile(r'(?:errors|erros)\s*:?\s*\[(.*)\]')


def rodar(caminho):
    ini = time.time()
    try:
        r = subprocess.run([sys.executable, caminho], cwd=RAIZ, capture_output=True, text=True, timeout=420)
        saida = r.stdout + r.stderr
        problemas = []
        if r.returncode != 0:
            problemas.append(f'saiu com código {r.returncode}')
        if 'Traceback' in saida:
            problemas.append('exceção no teste')
        if 'FALHOU' in saida:
            problemas += [ln.strip() for ln in saida.splitlines() if 'FALHOU' in ln][:5]
        for m in ERROS.finditer(saida):
            if m.group(1).strip():
                problemas.append('erros na página: ' + m.group(1).strip()[:300])
    except subprocess.TimeoutExpired:
        saida, problemas = '', ['passou do tempo (7 min)']
    return caminho, problemas, saida, time.time() - ini


falhas = 0
with cf.ThreadPoolExecutor(max_workers=int(os.environ.get('TESTES_JUNTOS', '3'))) as ex:
    for caminho, problemas, saida, seg in ex.map(rodar, testes):
        nome = os.path.basename(caminho)[6:-3]
        if problemas:
            falhas += 1
            print(f'✗ {nome} ({seg:.0f}s)')
            for p in problemas:
                print('    ' + p)
            if os.environ.get('MOSTRAR'):
                print(saida[-3000:])
        else:
            print(f'✓ {nome} ({seg:.0f}s)')
print(f'\n{len(testes) - falhas} de {len(testes)} passaram')
sys.exit(1 if falhas else 0)
