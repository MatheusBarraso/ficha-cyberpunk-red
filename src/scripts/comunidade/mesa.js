  // ===================== MESA EM JOGO: painel do mestre, ataques, alertas, ordem de jogada =====================
  const SIGLA = { player: 'PJ', demo: 'PJ', npc: 'NPC', monstro: 'MON' };
  const ordem = () => (S.d.ordem && Array.isArray(S.d.ordem.lista) && S.d.ordem.lista.length ? S.d.ordem : null);
  const naVez = (tipo, id) => { const o = ordem(); const v = o && o.lista[o.vez]; return !!v && v.tipo === tipo && v.id === id; };
  function todasFichas() {
    const players = membrosSala().map((u) => ({ tipo: 'player', id: u }));
    const inimigos = (S.d.fichasM || []).slice().sort((a, b) => (a.tipo || '').localeCompare(b.tipo || '') || (a.nome || '').localeCompare(b.nome || '')).map((f) => ({ tipo: f.tipo, id: f.id }));
    const fav = (x) => (typeof favorita === 'function' && favorita(x.tipo, x.id) ? 0 : 1);
    inimigos.sort((a, b) => fav(a) - fav(b));
    return { players, inimigos };
  }
  const PV = 'PONTOS DE VIDA';
  const ladoDe = (tipo, id) => { if (tipo === 'player') return 'aliado'; const l = (fichaM(id) || {}).lado; return l === 'aliado' || l === 'inimigo' ? l : (tipo === 'demo' ? 'aliado' : 'inimigo'); };
  function porLado() {
    const { players, inimigos } = todasFichas();
    const todos = [...players, ...inimigos];
    return { aliados: todos.filter((x) => ladoDe(x.tipo, x.id) === 'aliado'), inimigos: todos.filter((x) => ladoDe(x.tipo, x.id) === 'inimigo') };
  }
  async function trocarLado(id) {
    const f = fichaM(id); if (!f) return;
    const { id: _id, ...resto } = f;
    await salvar(() => dok('fichasMestre', id).set({ ...resto, lado: ladoDe(f.tipo, id) === 'aliado' ? 'inimigo' : 'aliado' }));
  }

  // janela simples por cima de tudo (ficha, livros ou comunidade)
  function modal(tit, conteudo, rodape, cls = '') {
    const fundo = h('div', { class: 'cm-modal-fundo ' + cls });
    const caixa = h('div', { class: 'cm-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': tit },
      h('div', { class: 'cm-modal-tit', text: tit }), h('div', { class: 'cm-modal-corpo' }, conteudo), h('div', { class: 'cm-modal-pe' }, rodape));
    fundo.append(caixa); document.body.append(fundo);
    const fecharM = () => fundo.remove();
    if (!/cm-modal-fixo/.test(cls)) {
      fundo.addEventListener('click', (e) => { if (e.target === fundo) fecharM(); });
      fundo.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharM(); });
    }
    return { fechar: fecharM, el: caixa };
  }

  // ----- painel da direita (mestre com uma ficha aberta) -----
  const abaLado = h('button', { type: 'button', id: 'cm-aba-lado', hidden: true, title: 'Abrir o painel de fichas', onclick: () => { S.ladoFechado = false; pintarRemota(); } }, h('span', { text: '‹' }), h('b', { text: 'Fichas' }));
  S.ladoFechado = window.innerWidth < 1000;
  function ajustarLado() {
    const aberto = !!R.id && !S.ladoFechado;
    document.body.classList.toggle('cm-lado-on', aberto);
    abaLado.hidden = !R.id || aberto;
    const tb = document.querySelector('.toolbar');
    const topo = tb && !document.body.classList.contains('land') ? Math.max(0, Math.round(tb.getBoundingClientRect().bottom)) : 0;
    barraR.style.top = topo + 'px';
    const largo = window.innerWidth >= 1000;
    const w = aberto && largo ? 290 : 0;
    if (window.__ladoW !== w) { window.__ladoW = w; if (typeof applyScale === 'function') applyScale(); }
  }
  addEventListener('resize', () => { if (R.id) ajustarLado(); });
  function itemFicha(x, fechaAntes) {
    const reg = registroDe(x.tipo, x.id), d = (reg && reg.dados) || {};
    const atual = x.tipo === R.tipo && x.id === R.id;
    return h('button', { type: 'button', class: 'cm-ml-item' + (atual ? ' on' : '') + (naVez(x.tipo, x.id) ? ' cm-vez' : '') + (oculta(x.tipo, x.id) ? ' cm-ml-oculta' : ''), disabled: !reg && !atual,
      onclick: () => { if (fechaAntes) fechaAntes(); if (window.innerWidth < 1000) S.ladoFechado = true; abrirFicha(x.tipo, x.id); } },
      h('span', { class: `cm-ml-tag cm-ml-${x.tipo}`, text: SIGLA[x.tipo] }),
      favorita(x.tipo, x.id) ? h('span', { class: 'cm-ml-fav', text: '★' }) : null,
      h('span', { class: 'cm-ml-nome', text: tituloFicha(x.tipo, x.id) }),
      morta(x.tipo, x.id) ? caveira('cm-caveira cm-ml-cav') : null,
      d[PV] ? h('span', { class: 'cm-ml-pv', text: d[PV] }) : null);
  }
  function blocoVez(fechaAntes) {
    const o = ordem();
    if (!o) return h('div', { class: 'cm-ml-vez' }, h('div', { class: 'cm-ml-vez-tit' }, h('small', { text: 'Ninguém no combate' })), h('div', { class: 'cm-row' }, btn('+ Aliado', () => { if (fechaAntes) fechaAntes(); abrirAddCombate('aliado'); }, 'cm-mini'), btn('+ Inimigo', () => { if (fechaAntes) fechaAntes(); abrirAddCombate('inimigo'); }, 'cm-mini cm-pri')));
    const v = o.lista[o.vez];
    return h('div', { class: 'cm-ml-vez' },
      h('div', { class: 'cm-ml-vez-tit' }, h('small', { text: `Rodada ${o.rodada || 1} · ${o.vez + 1} de ${o.lista.length}` }), h('b', { text: v ? 'Vez de ' + tituloFicha(v.tipo, v.id) : '' })),
      h('div', { class: 'cm-row' }, btn('‹', () => passarVez(-1), 'cm-mini'), btn('Próxima vez ›', () => passarVez(1), 'cm-mini cm-pri'), btn('Ordem', () => { if (fechaAntes) fechaAntes(); abrirOrdem(); }, 'cm-mini')),
      h('div', { class: 'cm-row' }, btn('+ Aliado', () => { if (fechaAntes) fechaAntes(); abrirAddCombate('aliado'); }, 'cm-mini'), btn('+ Inimigo', () => { if (fechaAntes) fechaAntes(); abrirAddCombate('inimigo'); }, 'cm-mini')));
  }
  function blocoContestados(fechaAntes) {
    const cont = (S.d.ataques || []).filter((a) => a.estado === 'contestado');
    if (!cont.length) return null;
    return h('div', { class: 'cm-ml-cont' }, h('div', { class: 'cm-faixa', text: 'Contestaram' }),
      cont.map((a) => h('button', { type: 'button', class: 'cm-ml-item', onclick: () => { if (fechaAntes) fechaAntes(); decidir(a); } },
        h('span', { class: 'cm-ml-tag cm-ml-player', text: '!' }), h('span', { class: 'cm-ml-nome', text: `${nome(a.alvo)} × ${a.de}` }), h('span', { class: 'cm-ml-pv', text: a.dano }))));
  }
  function pintarRemota() {
    barraR.hidden = !R.id || S.ladoFechado;
    ajustarLado(); estadoVez();
    if (!R.id) { barraR.replaceChildren(); return; }
    const lados = porLado();
    const inimigo = R.tipo !== 'player';
    rc(barraR,
      h('div', { class: 'cm-ml-topo' },
        h('div', { class: 'cm-ml-tit' }, h('small', { text: TIPOS_FICHA[R.tipo] + (morta(R.tipo, R.id) ? ' · morta' : '') }), h('b', null, morta(R.tipo, R.id) ? caveira('cm-caveira cm-ml-cav') : null, tituloFicha(R.tipo, R.id))),
        h('button', { type: 'button', class: 'cm-ml-recolher', title: 'Recolher o painel', 'aria-label': 'Recolher o painel', text: '›', onclick: () => { S.ladoFechado = true; pintarRemota(); } })),
      h('div', { class: 'cm-ml-corpo' },
        h('div', { class: 'cm-ml-acoes' },
          btn(inimigo ? 'Atacar' : 'Aplicar dano', () => abrirAtaque(inimigo ? null : R.id), 'cm-mini cm-pri'),
          btn('Alertar players', abrirAlerta, 'cm-mini'),
          btn('Combate', () => { sairRemota(true); S.ferrVer = 'combate'; abrir('ferramentas'); }, 'cm-mini'),
          btn('Fichas', () => { sairRemota(true); S.ferrVer = 'fichas'; abrir('ferramentas'); }, 'cm-mini')),
        h('div', { class: 'cm-sub cm-ml-dica', text: R.tipo === 'player' ? 'O que você muda vai direto pra ficha do player.' : 'Só você vê esta ficha.' }),
        h('button', { type: 'button', class: 'cm-switch cm-ml-ajuda' + (ajudaOn() ? ' on' : ''), role: 'switch', 'aria-checked': String(ajudaOn()),
          title: R.tipo === 'player' ? 'Ao abrir um campo, a ficha escurece e só ele fica aceso — na sua tela e na do player' : 'Ao abrir um campo, a ficha escurece e só ele fica aceso',
          onclick: () => { try { localStorage.setItem('cpr-ajuda', ajudaOn() ? '0' : '1'); } catch { /* ok */ } if (!ajudaOn()) focoLimpar(); pintarRemota(); } },
          h('span', { text: R.tipo === 'player' ? 'Modo ajuda (destaca o campo pro player)' : 'Modo ajuda (destaca o campo)' }), h('i', { 'aria-hidden': 'true' })),
        blocoVez(), blocoContestados(),
        h('div', { class: 'cm-faixa cm-faixa-aliado', text: `Aliados (${lados.aliados.length})` }),
        h('div', { class: 'cm-ml-lista' }, lados.aliados.length ? lados.aliados.map((x) => itemFicha(x)) : h('div', { class: 'cm-vazio', text: 'Ninguém ainda.' })),
        h('div', { class: 'cm-faixa cm-faixa-inimigo', text: `Inimigos (${lados.inimigos.length})` }),
        h('div', { class: 'cm-ml-lista' }, lados.inimigos.length ? lados.inimigos.map((x) => itemFicha(x)) : h('div', { class: 'cm-vazio', text: 'Nenhum ainda.' })),
        h('div', { class: 'cm-row' }, btn('+ NPC', () => novaFicha('npc'), 'cm-mini'), btn('+ Monstro', () => novaFicha('monstro'), 'cm-mini'))));
  }
