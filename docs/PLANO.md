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
- [ ] Um controle de Esc (fecha só a camada de cima: modal → gaveta → menu).
- [ ] Juntar CSS repetido; cores do modo escuro por variáveis onde der.
- [ ] Padronizar nomes e cabeçalhos dos arquivos.

## Etapa 3 — Sketcher

- [ ] Núcleo compartilhado (conta, comunidade, anotações, quadro, livros, temas) separado do que é de sistema.
- [ ] Registro de sistemas: cada sistema em `src/sistemas/<id>/` com ficha, regras, conteúdo, demonstrações.
- [ ] Cyberpunk RED como primeiro sistema; **Sistema livre** como segundo (ficha genérica com campos criados pelo usuário).
- [ ] Tela de escolha de RPG.
- [ ] Sessões da Comunidade guardam o sistema; dados atuais migrados sem perda (`cpr-*` → por sistema).
- [ ] "Acesso de mestre" como permissão por conta (pronto pro sistema de compra).
- [ ] Nome Sketcher no site, app do Windows e PWA; endereço `/sketcher`.
