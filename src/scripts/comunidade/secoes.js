  // ---------- montagem das seções ----------
  let wrap = null;
  function montar() {
    rc(corpo, );
    wrap = h('div', { class: 'cm-wrap' });
    corpo.append(h('div', { class: 'cm-folha' }, moldura.svg, wrap));
    moldura.seguir(wrap.parentNode);
    corpo.scrollTop = 0;
    S.ui = {};
    pintarTopo();
    if (!S.sess && !S.lob.papel) { montarLobby(wrap); return; } // a escolha não depende da conexão
    if (S.erro) { wrap.append(semAcesso(), h('div', { class: 'cm-row', style: 'justify-content:center' }, btn('Abrir a ficha', fechar, 'cm-pri'))); return; }
    if (!S.db) { wrap.append(h('div', { class: 'cm-vazio', text: 'Conectando…' })); return; }
    if (!S.escreve && !FB) wrap.append(h('div', { class: 'cm-aviso', text: 'Você está só como leitor desta ficha. Pra criar ou entrar em sessões, peça a quem compartilhou a ficha acesso de Colaborador.' }));
    pintarTopo();
    if (noLobby()) { montarLobby(wrap); wrap.append(rodape('00', 'Comunidade')); return; }
    // sala: conteúdo da seção + coluna de resumo ao lado (no PC)
    const principal = h('div', { class: 'cm-principal' });
    S.ui.lado = h('aside', { class: 'cm-lado', 'aria-label': 'Resumo da sessão' });
    wrap.classList.add('cm-com-lado');
    wrap.append(principal, S.ui.lado);
    SECOES[S.sec].montar(principal);
    wrap.append(rodape(String(SECS.findIndex(([k]) => k === S.sec) + 1).padStart(2, '0'), S.sess.nome || 'Sessão'));
    atualizar();
  }
  const rodape = (n, txt) => h('footer', { class: 'cm-rodape', 'aria-hidden': 'true' }, h('b', { text: n }), h('span', { class: 'cm-estatica' }), h('small', { text: txt }));
  // coluna lateral: o que está rolando nas outras seções, pra não precisar ficar trocando de aba
  function pintarLado() {
    const L = S.ui.lado; if (!L) return;
    const bloco = (tit, sec, itensB, vazio) => h('div', { class: 'cm-bloco' },
      h('button', { type: 'button', class: 'cm-faixa cm-faixa-link', onclick: () => abrir(sec) }, tit, h('b', { class: 'cm-n', 'data-n': sec })),
      h('div', { class: 'cm-lista cm-mini-lista' }, itensB.length ? itensB : h('div', { class: 'cm-vazio', text: vazio })));
    const lin = (txt, sub, fn) => h('button', { type: 'button', class: 'cm-linha', onclick: fn }, h('span', { class: 'cm-linha-txt' }, h('b', { text: txt }), sub ? h('small', { text: sub }) : null));
    const out = [];
    if (S.sec !== 'missoes') out.push(bloco('Missões abertas', 'missoes', S.d.missoes.filter((m) => m.status !== 'concluida').slice(0, 4).map((m) => lin(m.titulo, TIPOS_MISSAO[m.tipo], () => abrir('missoes'))), 'Nenhuma aberta.'));
    if (S.sec !== 'pistas') out.push(bloco('Pistas', 'pistas', S.d.pistas.slice(0, 4).map((p) => lin(p.titulo, TIPOS_PISTA[p.tipo], () => abrir('pistas'))), 'Nenhuma ainda.'));
    if (S.sec !== 'npcs') {
      const vis = S.d.npcs.filter((n) => S.mestre || !n.oculto).slice(0, 6);
      out.push(h('div', { class: 'cm-bloco' }, h('button', { type: 'button', class: 'cm-faixa cm-faixa-link', onclick: () => abrir('npcs') }, 'NPCs', h('b', { class: 'cm-n', 'data-n': 'npcs' })),
        vis.length ? h('div', { class: 'cm-mini-npcs' }, vis.map((n) => h('button', { type: 'button', class: 'cm-mini-npc', title: n.nome, onclick: () => { abrir('npcs'); S.npcAberto = n.id; atualizar(); } }, avatar(n.nome, n.img), h('span', { text: n.nome })))) : h('div', { class: 'cm-vazio', text: 'Nenhum ainda.' })));
    }
    const mesa = [S.sess.gm, ...membrosSala()];
    out.push(h('div', { class: 'cm-bloco' }, h('div', { class: 'cm-faixa' }, `Na mesa (${mesa.length})`),
      h('div', { class: 'cm-lista cm-mini-lista' }, mesa.map((u) => h('div', { class: 'cm-linha cm-linha-fixa' }, h('span', { class: 'cm-linha-txt' }, h('b', null, spanNome(u)), u === S.sess.gm ? h('small', { text: 'mestre' }) : (S.d.perfis[u] && S.d.perfis[u].personagem ? h('small', { text: S.d.perfis[u].personagem }) : null)))))));
    rc(L, ...out);
    badges();
  }
  let agendado = false, pendente = false;
  function atualizar() {
    if (!S.aberto || !wrap) return;
    const a = document.activeElement;
    if (a && wrap.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('[data-vivo]')) { pendente = true; return; }
    if (noLobby()) { atualizarLobby(); return; }
    SECOES[S.sec].atualizar();
    pintarLado();
    marcarVisto(S.sec);
    resolverNomes();
  }
  painel.addEventListener('focusout', () => { if (pendente) setTimeout(() => { if (pendente && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-vivo]'))) { pendente = false; atualizar(); } }, 50); });
  function semAcesso() {
    if (window.__cmSemConfig) return h('div', { class: 'cm-vazio', text: 'A Comunidade ainda não foi configurada neste site (falta o firebase-config.js).' });
    const txt = S.erro === 'fora'
      ? 'A Comunidade só funciona com a ficha aberta pelo site, não como arquivo.'
      : FB ? 'Sem conexão com o servidor. Confira a internet e recarregue a página.' : 'A Comunidade não conectou. Entre na sua conta do Claude e abra a ficha pelo link do mestre.';
    return h('div', { class: 'cm-vazio', text: txt });
  }

