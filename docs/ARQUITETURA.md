# Arquitetura

O site é uma página só (`index.html`), servida pelo GitHub Pages a partir da raiz deste repositório.
O `index.html` da raiz é **gerado**: o código de verdade fica em `src/` e o build monta tudo.

## Pastas

| Pasta | O que tem |
|---|---|
| `src/pagina.html` | Esqueleto da página. A ordem das inclusões aqui é a ordem em que o CSS e o JS entram na página. |
| `src/estilos/<área>/` | CSS por área: `nucleo`, `ficha`, `celular`, `anotacoes`, `historia`, `livros`, `comunidade`. |
| `src/estilos/escuro-ajustes.css` | Ajustes à mão do modo escuro (o resto do escuro é gerado — ver abaixo). |
| `src/scripts/<área>/` | JavaScript por área (mesmas áreas do CSS). |
| `src/sistemas/cpr/` | O que é do Cyberpunk RED: desenho das 3 páginas da ficha (`pagina-N.svg`, arte do PDF oficial) e o mapa de campos (`campos.json`: onde fica cada campo em cada página). |
| `src/publico/` | Copiado como está pra raiz do site: ponte do Firebase (`fb.js`), configuração, leitor de PDF local (`livros_local.js` + `lib/`), PWA (`manifest.webmanifest`, `sw.js`), ícones, imagens de exemplo. |
| `src/fontes/`, `src/imagens/` | Embutidos no CSS pelo build (base64). |
| `tools/` | `build.mjs` (monta o site) e `escuro.mjs` (gera o modo escuro). Só Node, sem dependências. |
| `tests/` | Testes de ponta a ponta (Playwright) e comparação visual. |
| `firebase/firestore.rules` | Regras do banco. São publicadas à mão no console do Firebase. |
| `app/` | App do Windows (Electron). Abre o site online; o GitHub monta o instalador. |
| `docs/` | Esta documentação, o plano de refatoração e a configuração do Firebase. |

## Build

```
npm run build       # gera o site na raiz (index.html + arquivos de src/publico/)
npm run conferir    # falha se a raiz não bater com src/ (o GitHub roda isso a cada envio)
```

Diretivas que o build entende (em `src/pagina.html` e nos arquivos incluídos):

- `{{> caminho}}` — conteúdo de `src/caminho`, como está.
- `{{base64 caminho}}` — o arquivo em base64 (fonte e imagens embutidas no CSS).
- `{{escuro caminho}}` — o bloco `<style>` do modo escuro: para cada regra com cor, uma cópia com
  `html.cpr-escuro` e as cores neutras invertidas, mais os ajustes à mão de `caminho`.
- `__CPR_BUILD__` — vira a impressão digital da versão; o site compara com a do servidor e avisa
  quando sai versão nova.

O build também confere a sintaxe de todo `<script>` montado e avisa sobre arquivos de `src/` que ninguém inclui.

## Como as partes conversam (estado atual)

Herança do jeito que o site cresceu — a refatoração vai trocando isso por módulos com contratos claros
(ver `PLANO.md`).

- **Script principal** (ficha, celular, leitor, anotações, história): os arquivos de `src/scripts/` que
  entram no mesmo `<script>` dividem o escopo global. Funções globais usadas pelo resto:
  `showPage(i)`, `applyScale()`, `openMenu(abrir)`, `save()`, `load()`, `recalc()`, `setMob()`, `setLand()`.
- **Comunidade** (`src/scripts/comunidade/`): é uma função só, cortada em arquivos por recurso —
  `estado.js` abre a função e declara o estado `S`; `combate-menu.js` fecha. Usa as globais acima e
  expõe pontes `window.__cm*`.
- **Pontes `window.__*`**: a ficha expõe `__fichaColetar`, `__fichaAplicar`, `__fichaLocal`,
  `__fichaRemota`, `__fichaVoltarLocal`; anotações e quadro expõem `__notes*`/`__board*`; o leitor expõe
  `__livro*`; o modo escuro, `__cprEscuro`; o Firebase, `__cmLogin`, `__cmLogout`, `__cmConta`.
- **Eventos**: `cm-fechou` (Comunidade fechou), `cm-asset` (imagem chegou), `livros-mudaram`,
  `cpr-escuro` (tema trocou), `cm-gate-fim` (Comunidade liberou a ficha).

## Dados

**No navegador** (por aparelho): ficha `cpr-ficha-v1`, anotações `cpr-notas-v2`, quadro `cpr-quadro-v2`,
livros/marcações `cpr-livros-v1`, aparência `cpr-tema-v2`/`cpr-escuro`/`cpr-destaque`; PDFs dos livros
no IndexedDB `cpr-livros` (nunca saem do aparelho). Backup completo pelo menu (arquivo .json).

**No Firestore** (Comunidade), em resumo:

- `usuarios`, `perfis`, `pedidos` — conta e perfil público de cada pessoa.
- `chaves/{uid}` — quem digitou a senha de mestre (o servidor confere o hash).
- `convites/{código}` — código da sessão → sessão.
- `mestres/{gm}/sessoes/{sid}` — a sessão (só o mestre grava), com `membros`, `pedidos` e o conteúdo
  do mestre (NPCs, pistas, missões, locais…).
- `sessoes/{sid}/…` — o que a mesa escreve: `mural`, `quadro` (História), `comentarios`, `descobertas`,
  `aceites`, `conversas`, `fichas` (cópia da ficha de cada player, pro mestre ver/editar), `alertas`,
  `ataques`, `denuncias`.
- `assets` — imagens enviadas; `data/users/{uid}` — marcações pequenas de cada pessoa.

## Testes

```
pip install playwright pillow
npm run build
python3 tests/rodar.py            # todos os testes de ponta a ponta (ou: rodar.py combate ajuda)
python3 tests/visual.py base      # antes de mexer: guarda as telas
python3 tests/visual.py comparar  # depois de mexer: mostra o que mudou na tela
```

Os testes usam um Firebase falso (`tests/fake_firebase.js`) com as mesmas regras de acesso, então
mestre e players rodam em abas do mesmo navegador de teste.
