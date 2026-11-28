# Plano de refatoração → Sketcher

Objetivo: transformar a Ficha Cyberpunk RED no **Sketcher**, uma plataforma de RPG com vários sistemas,
depois de organizar e corrigir o código. Cada etapa é testada (testes de ponta a ponta + comparação
visual) e publicada separadamente.

Decisões do Matheus (28/11/2026):
- O endereço muda pra `/sketcher` no fim (etapa 3).
- Sistemas agora: **Cyberpunk RED** e **Sistema livre** (ficha genérica). Outros virão depois — sem
  cartões "em breve" por enquanto, mas a estrutura fica pronta pra eles.
- Acesso de mestre vai virar um sistema de compra (por conta). A senha atual fica até lá; a arquitetura
  prepara "acesso de mestre" como permissão por conta.

## Diagnóstico (antes da etapa 1)

1. Código-fonte fora do repositório: só o site pronto ia pro GitHub; build, comu.js e testes existiam
   só no espaço de trabalho temporário.
2. Bug: duas funções `avatar` no mesmo escopo da Comunidade — a segunda (foto da conta) substituía a
   primeira, então NPCs, perfis e membros mostravam a foto de quem está logado.
3. Senha de mestre de 3 dígitos com hash público (descobre-se na hora) — será trocada pelo sistema de compra.
4. Remendos empilhados: `showPage` embrulhada 3 vezes; zoom com 2 versões (`applyScale` original +
   `nitidez.js`); 9 tratadores de Esc no documento; 83 nomes globais + 45 pontes `window.__`;
   layout de cartões do celular desligado mas ainda montado; seção "MAPA (antigo)" sem uso.
5. CSS acumulado por acréscimo: seletores repetidos (`:root` 7×), 218 `!important`, 39 z-index;
   modo escuro gerado copiando 666 regras porque as cores estão escritas direto.
6. Entulho no espaço de trabalho (~40 cópias de segurança e scripts abandonados).
7. Testes misturados com experimentos, sem comando único.
8. Tudo amarrado ao Cyberpunk RED (chaves `cpr-*`, ficha SVG fixa, combate com PV/SP, variável `--red`).

## Etapa 1 — código no repositório, sem mudança visível ✅

- [x] Site atual cortado em arquivos por área (`src/`), com o que é do CPR em `src/sistemas/cpr/`.
- [x] Build único em Node (`tools/build.mjs`), sem dependências; modo escuro portado (`tools/escuro.mjs`).
- [x] Prova: o site gerado saiu **idêntico, byte a byte**, ao que estava no ar.
- [x] 19 testes de ponta a ponta em `tests/` com um comando só (`tests/rodar.py`).
- [x] Comparação visual de 16 telas (claro, escuro, celular em pé e deitado).
- [x] GitHub confere a cada envio se o site da raiz bate com `src/`.

## Etapa 2 — limpeza e correções

- [x] Corrigir o `avatar` (NPCs mostrando a foto da conta) — com teste (`teste_avatar_npc.py`).
- [x] Remover código morto: cartões do celular em pé (montados a cada carregamento e escondidos) e a
      tela do mapa antigo (com o botão "Mover no mapa", que não fazia mais nada). −29 KB.
- [ ] Tirar a limpeza da v67 depois que todo mundo tiver entrado uma vez (fim de dezembro).
- [x] Troca de página por eventos (`sk:trocando-pagina` / `sk:pagina`) em vez de 4 embrulhos em `showPage` — com teste (`teste_troca_pagina.py`).
- [x] Um zoom só: `nucleo/zoom.js` (encaixe, zoom do navegador, `applyScale`); `nitidez.js` ficou só com as interações. Limite mínimo unificado em 20% (os botões do menu paravam em 30%).
- [x] Um controle de Esc (`nucleo/esc.js`): fecha só a camada de cima. Antes um Esc fechava, por exemplo, a janela de página salva e a gaveta do leitor juntas — com teste (`teste_tecla_esc.py`).
- [x] "Configuração" do menu ☰ estava só escondida por CSS: o menu da conta trocava a cor do site
      clicando nos botões escondidos dela (com um "clique de mentira" pra o painel não fechar), e no
      celular deitado o corpo da seção aparecia solto numa terceira coluna. A cor foi pra `nucleo/cores.js`,
      a seção saiu do HTML e o menu deitado ficou em duas colunas, com a posição das seções num lugar só.
- [x] Peças de tela reaproveitáveis no núcleo: moldura de folha (`criarMoldura()`) e cartão de escolha
      (`.sk-escolha`), usados pela Comunidade e pela escolha de RPG.
- [ ] Juntar CSS repetido; cores do modo escuro por variáveis onde der.
- [ ] Padronizar nomes e cabeçalhos dos arquivos.

## Etapa 3 — Sketcher

Desenho (decidido na análise da etapa 2):

- **Sistema atual por carregamento.** O sistema (`cpr`, `livre`, …) é decidido antes de tudo carregar, por
  `#rpg=<id>` no endereço ou pela última escolha (`sk-sistema` no navegador), e fica em
  `<html data-sistema="…">`. Trocar de sistema recarrega a página: cada sistema começa limpo.
- **Registro de sistemas** (`src/scripts/nucleo/sistemas.js`): id, nome, descrição, quais páginas tem
  (ex.: o CPR usa as 3 páginas do PDF; o Sistema livre uma página só) e quais ferramentas da Comunidade
  valem (ex.: ataque com PV/armadura só no CPR). Cada sistema mora em `src/sistemas/<id>/`.
- **Dados por sistema.** `chaveLocal(nome)` dá a chave do navegador: o CPR continua com as chaves de sempre
  (`cpr-ficha-v1`, `cpr-notas-v2`, `cpr-quadro-v2`, `cpr-livros-v1`) — nenhum dado é migrado, então nada
  se perde —; os outros sistemas usam `sk-<id>-<nome>`. O backup leva o id do sistema.
- **Tela de escolha de RPG** (início do Sketcher): aparece na primeira visita e pelo "Trocar de RPG"
  (menu e menu da conta).
- **Sistema livre**: ficha em HTML (não é desenho de PDF) com seções e campos que o usuário cria
  (texto, número, texto longo, atributo, recurso atual/máximo). A estrutura vai num campo escondido
  `__layout` dentro dos próprios dados da ficha — assim salvar, backup, mandar pro mestre e o mestre
  abrir a ficha funcionam sem mudar nada disso. As páginas 2 e 3 (do PDF) somem; Anotações, História e
  Livros continuam.
- **Comunidade**: a sessão guarda `sistema` (sessões antigas = `cpr`; as regras do banco já aceitam o
  campo). Entrar numa sessão de outro sistema troca o sistema. Ferramentas que dependem das regras do CPR
  (ataque com PV/armadura, fichas de demonstração) só aparecem em sessões do CPR.
- **Acesso de mestre** como permissão por conta, pronto pro sistema de compra.

Passos:

- [x] 3a. Registro de sistemas (`nucleo/sistemas.js`, `cabeca/sistema.js`) + chaves por sistema + backup sabendo o sistema — com teste (`teste_sistemas.py`).
- [x] 3b. Tela de escolha de RPG (`nucleo/escolha-rpg.js`) + "Trocar de RPG" no menu ☰, no menu da conta e na entrada da Comunidade; nome Sketcher e o RPG aberto na barra, na aba e na entrada — com teste (`teste_escolha_rpg.py`) e 5 telas novas na comparação visual.
- [x] 3c. Ficha do Sistema livre (uso local): seções e campos que a pessoa monta (texto, número, texto
      longo, atributo, recurso atual/máximo, marcar), modelo inicial, editar / mover / apagar, salvar,
      backup, "Limpar ficha" mantendo o modelo, celular em pé e deitado, impressão. Antes, a ficha do CPR
      virou módulo do sistema (`src/sistemas/cpr/`) e o núcleo passou a montar "a ficha do sistema aberto".
      Livros por sistema: a estante do Sistema livre começa vazia (o mestre adiciona os PDFs) e o leitor
      ganhou o estado "nenhum livro ainda" — com teste (`teste_livre.py`) e 5 telas novas na comparação.
- [ ] 3d. Comunidade com sistema na sessão; Sistema livre nas sessões (ficha do player, mestre abrindo, modo ajuda).
- [ ] 3e. Nome Sketcher no site, app do Windows e PWA; endereço `/sketcher` (renomear o repositório) e app novo.
