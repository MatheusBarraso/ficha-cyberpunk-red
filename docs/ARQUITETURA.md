# Arquitetura

O site é uma página só (`index.html`), servida pelo GitHub Pages a partir da raiz deste repositório.
O `index.html` da raiz é **gerado**: o código de verdade fica em `src/` e o build monta tudo.

## Pastas

| Pasta | O que tem |
|---|---|
| `src/pagina.html` | Esqueleto da página. A ordem das inclusões aqui é a ordem em que o CSS e o JS entram na página. |
| `src/estilos/<área>/` | CSS por área: `nucleo`, `celular`, `anotacoes`, `historia`, `livros`, `comunidade`. |
| `src/estilos/escuro-ajustes.css` | Ajustes à mão do modo escuro (o resto do escuro é gerado — ver abaixo). |
| `src/scripts/<área>/` | JavaScript por área (mesmas áreas do CSS). |
| `src/sistemas/<id>/` | O que é de cada sistema de RPG. `ficha.js` registra a ficha (montar os campos, cálculos), `ficha.css` o visual dela e `ficha/paginas.html` as páginas (vão num `<template>`). No Cyberpunk RED, `ficha/` ainda tem o desenho das 3 páginas (`pagina-N.svg`, arte do PDF oficial) e o mapa de campos (`campos.json`: onde fica cada campo em cada página). |
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

- **Script principal** (ficha, celular, leitor, anotações, história): os arquivos de `src/scripts/` e as
  fichas de `src/sistemas/` que entram no mesmo `<script>` dividem o escopo global. Funções globais usadas
  pelo resto: `$()`, `el()`, `showPage(i)`, `applyScale()`, `openMenu(abrir)`, `save()`, `load()`,
  `lerCampos()`, `recalc()`, `setMob()`, `setLand()`,
  `aoEsc()`, `abrirEscolhaRpg()`, `applyTheme(cor)` / `corDaFicha()` (cor do site, `nucleo/cores.js`).
- **Peças de tela do núcleo**: `criarMoldura()` (`nucleo/moldura.js`, a moldura de folha com cantos
  cortados) e o cartão de escolha `.sk-escolha` / `.sk-esc-*` (`estilos/nucleo/escolha.css`). A Comunidade
  e a escolha de RPG usam as mesmas.
- **Comunidade** (`src/scripts/comunidade/`): é uma função só, cortada em arquivos por recurso —
  `estado.js` abre a função e declara o estado `S`; `combate-menu.js` fecha. Usa as globais acima e
  expõe pontes `window.__cm*`.
- **Pontes `window.__*`**: a ficha expõe `__fichaColetar`, `__fichaAplicar`, `__fichaLocal`,
  `__fichaRemota`, `__fichaVoltarLocal`; anotações e quadro expõem `__notes*`/`__board*`; o leitor expõe
  `__livro*`; o modo escuro, `__cprEscuro`; o Firebase, `__cmLogin`, `__cmLogout`, `__cmConta`.
- **Troca de página**: `showPage(i)` avisa antes (`sk:trocando-pagina`) e depois (`sk:pagina`), com
  `{ detail: { pagina } }`. Quem precisa reagir escuta o evento — não embrulhe a função.
- **Tecla Esc**: quem abre algo por cima registra `aoEsc(prioridade, fechar)` (ver `nucleo/esc.js`); um Esc
  fecha só a camada aberta de maior prioridade. Janelas modais tratam o próprio Esc e marcam o evento.
- **Sessões e sistemas**: a sessão guarda o RPG (`sistema`); `comunidade/sistema-sessao.js` troca o Sketcher
  quando a pessoa entra numa sessão de outro RPG e continua a entrada depois de recarregar (`sk-entrar` no
  sessionStorage). Ferramentas que dependem das regras de um sistema olham `SISTEMA.recursos`.
- **Acesso de mestre**: permissão da conta (`chaves/{uid}` no banco), conferida em `comunidade/acesso-mestre.js`
  (`S.lob.acessoMestre`) e pelo servidor (`mestreOk()`).
- **Eventos**: `cm-fechou` (Comunidade fechou), `cm-asset` (imagem chegou), `livros-mudaram`,
  `cpr-escuro` (tema trocou), `cm-gate-fim` (Comunidade liberou a ficha).

## Sistemas de RPG

O Sketcher roda **um sistema por carregamento** — trocar recarrega a página.

1. `scripts/cabeca/sistema.js` (no `<head>`, antes de tudo) decide qual: `#rpg=<id>` no endereço →
   última escolha (`sk-sistema`) → quem já tinha ficha do Cyberpunk RED fica nele → senão é a primeira
   visita (`html.sk-escolher`). Anota em `<html data-sistema="…">`.
2. `scripts/nucleo/sistemas.js` é o registro: `SISTEMAS` (id, nome, descrição e itens da tela de escolha,
   páginas da ficha, `recursos` = ferramentas da Comunidade que valem pro sistema), `SISTEMA` (o aberto),
   `chaveLocal(nome)` / `chaveDe(sistema, nome)` (chave no navegador) e `trocarSistema(id)`.
3. `scripts/nucleo/escolha-rpg.js` é a tela de escolha: abre sozinha na primeira visita (por cima da
   entrada da Comunidade, sem fechar até escolher) e por `abrirEscolhaRpg()`.

4. `scripts/nucleo/ficha.js` põe na tela as páginas de ficha do sistema aberto (`<template id="paginas-<id>">`,
   de `src/sistemas/<id>/ficha/paginas.html`) e completa com vagas escondidas as que ele não usa: as abas
   1–3 são da ficha e Anotações, História e Livros são sempre as páginas 3, 4 e 5 (contando do 0).
   A ficha do sistema se registra com `registrarFicha(id, { montar(dados), remontar(dados),
   recalcular(), gatilhoCalculo })` — ver `nucleo/sistemas.js`.

Pra acrescentar um sistema: uma entrada em `SISTEMAS`, o id na lista `conhecidos` de `cabeca/sistema.js`
(o `<head>` roda antes do registro) e o conteúdo próprio em `src/sistemas/<id>/` (`ficha.js`, `ficha.css`,
`ficha/paginas.html`), incluído em `src/pagina.html` ao lado dos outros.

**Sistema livre** (`src/sistemas/livre/`): a ficha é HTML. O modelo (seções e campos) fica no campo
escondido `__layout` dentro dos próprios dados da ficha — por isso salvar, backup e a Comunidade levam o
modelo junto sem saber que ele existe. Cada campo guarda o valor na sua chave (`id`, que não muda quando o
rótulo muda; o recurso guarda o máximo em `<id>:max`); o nome é o campo fixo `NOME`. Modelo vindo de fora
passa por `ler()`, que só aceita ids `[a-z0-9-]`, tipos conhecidos e sem repetição.

**Livros por sistema**: os livros que o sistema já conhece ficam no registro (`livros`; no Sistema livre a
estante começa vazia). PDFs guardados no aparelho levam o sistema (`sistema` no IndexedDB); os de antes do
Sketcher são do Cyberpunk RED.

## Dados

**No navegador** (por aparelho): RPG escolhido `sk-sistema`; do Cyberpunk RED, ficha `cpr-ficha-v1`,
anotações `cpr-notas-v2`, quadro `cpr-quadro-v2`, livros/marcações `cpr-livros-v1` (as chaves de antes do
Sketcher); dos outros sistemas, `sk-<id>-ficha`, `sk-<id>-notas`, `sk-<id>-quadro`, `sk-<id>-livros`;
aparência `cpr-tema-v2`/`cpr-escuro`/`cpr-destaque`; PDFs dos livros no IndexedDB `cpr-livros` (nunca saem
do aparelho). Backup completo pelo menu (arquivo .json, com o sistema de onde saiu).

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
mestre e players rodam em abas do mesmo navegador de teste. Os navegadores de teste já começam com o
Cyberpunk RED escolhido; pra testar a primeira visita, `b.new_context(primeira_visita=True)`.
