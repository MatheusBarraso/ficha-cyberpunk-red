  // ---------- painel e menu ----------
  const painel = h('section', { id: 'comu', hidden: true, 'aria-label': 'Comunidade' });
  const appBtn = h('button', { type: 'button', class: 'cm-app', 'aria-label': 'Menu principal', title: 'Menu principal', onclick: () => openMenu(true) }, '☰', h('b', { class: 'cm-dot', 'data-total': '' }));
  const papel = h('span', { class: 'cm-papel' });
  const fichaBtn = h('button', { type: 'button', class: 'cm-btn cm-mini', title: 'Abrir a ficha do personagem', onclick: () => fechar() }, 'Ficha');
  const salaBtn = h('button', { type: 'button', class: 'cm-btn cm-mini cm-salabtn', title: 'Sessões', onclick: () => irLobby() }, 'Sessões', h('b', { class: 'cm-n', 'data-lob': '' }));
  const titulo = h('div', { class: 'cm-tit' }, h('small', { text: 'Comunidade' }), h('span', { class: 'cm-cidade', text: 'Cidade' }));
  const tabs = h('nav', { class: 'cm-tabs', role: 'tablist', 'aria-label': 'Seções da comunidade' },
    SECS.map(([k, n]) => h('button', { type: 'button', class: 'cm-tab', role: 'tab', 'data-sec': k, onclick: (e) => { if (k === 'ferramentas' && S.mestre) { e.stopPropagation(); alternarFerr(); } else abrir(k); } }, n, h('b', { class: 'cm-n', 'data-n': k }))));
  // novidades: sino na barra, com painel suspenso
  // novidades: sino na barra da Comunidade e na barra da ficha (vai junto pra todo lado), com painel suspenso
  const SINO_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  const sinos = [];
  function novoSino() {
    const b = h('button', { type: 'button', class: 'cm-sino', 'aria-label': 'Novidades', title: 'Novidades', 'aria-expanded': 'false', onclick: (e) => { e.stopPropagation(); alternarSino(undefined, b); } });
    b.innerHTML = SINO_SVG; b.append(h('b', { class: 'cm-n', 'data-total': '' }));
    sinos.push(b); return b;
  }
  // conta: avatar + papel; abre o menu com sessões, papel, modo escuro e troca de conta
  const contas = [];
  function novaConta() {
    const b = h('button', { type: 'button', class: 'cm-conta', 'aria-label': 'Conta e sessões', title: 'Conta e sessões', 'aria-expanded': 'false', onclick: (e) => { e.stopPropagation(); alternarConta(undefined, b); } },
      h('span', { class: 'cm-av' }), h('span', { class: 'cm-conta-txt' }, h('b', { class: 'cm-conta-nome' }), h('small', { class: 'cm-conta-papel' })), h('i', { class: 'cm-conta-seta', 'aria-hidden': 'true', text: '▾' }));
    contas.push(b); return b;
  }
  const sinoBtn = novoSino(), contaBtn = novaConta();
  const sinoBtnT = novoSino(), contaBtnT = novaConta();
  const barraT = h('span', { class: 'cm-tb', hidden: true }, sinoBtnT, contaBtnT);
  const sinoPainel = h('div', { class: 'cm-sino-painel cm-pop', hidden: true, role: 'dialog', 'aria-label': 'Novidades', onclick: (e) => e.stopPropagation() });
  const contaPainel = h('div', { class: 'cm-sino-painel cm-pop cm-conta-painel', hidden: true, role: 'dialog', 'aria-label': 'Conta e sessões', onclick: (e) => e.stopPropagation() });
  const corpo = h('div', { class: 'cm-body' });
  const avisoLento = h('div', { class: 'cm-aviso cm-lento', hidden: true, text: 'Sem resposta do servidor ainda. Confira a internet.' });
  painel.append(h('header', { class: 'cm-top' }, h('div', { class: 'cm-bar' }, appBtn, titulo, h('span', { style: 'flex:1' }), fichaBtn, sinoBtn, contaBtn), tabs), avisoLento, corpo);
  queueMicrotask(() => painel.querySelector('.cm-top').append(ferrPainel));
  let seguraPops = false; // clique de mentira nos botões do menu ☰ (cores) não fecha o painel
  const fecharPops = () => { if (seguraPops) return; if (!sinoPainel.hidden) alternarSino(false); if (!contaPainel.hidden) alternarConta(false); };
  document.addEventListener('click', fecharPops);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharPops(); });
  addEventListener('resize', fecharPops);

  function abrir(sec) {
    if (sec && sec !== S.sec) { S.npcAberto = null; S.chatNpc = null; fecharThread(); S.perfilAberto = null; S.verDen = false; }
    if (sec === 'mural' || sec === 'mapa') sec = 'historia';
    S.sec = (sec && SECOES[sec] && NOME_SEC[sec]) ? sec : (SECOES[S.sec] && NOME_SEC[S.sec] ? S.sec : 'historia');
    if (S.sec === 'ferramentas' && !S.mestre) S.sec = 'historia';
    S.aberto = true; S.verLobby = false;
    painel.hidden = false; marca.hidden = !(S.sess && !S.mestre && !marca.hidden);
    document.body.classList.add('comu-on');
    if (typeof openMenu === 'function') openMenu(false);
    tabs.querySelectorAll('.cm-tab').forEach((t) => { const on = t.dataset.sec === S.sec; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); if (on) t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
    montar();
    marcarMenu();
  }
  // menu principal: com a Comunidade aberta, quem fica marcado é ela (e não a página da ficha que está por baixo)
  function marcarMenu() {
    const pags = [...document.querySelectorAll('#menu .tab')];
    const itensC = [...document.querySelectorAll('#menu .cm-go')];
    if (S.aberto) {
      pags.forEach((t) => t.classList.remove('active'));
      itensC.forEach((b) => b.classList.toggle('active', !noLobby() ? b.dataset.sec === S.sec : !b.dataset.sec));
    } else {
      itensC.forEach((b) => b.classList.remove('active'));
      const i = [...document.querySelectorAll('.sheet')].findIndex((x) => x.classList.contains('active'));
      pags.forEach((t, k) => t.classList.toggle('active', k === i));
    }
  }
  // a ficha fica escondida (html.cm-gate) até a pessoa escolher Mestre ou Player
  function liberarFicha() {
    if (!document.documentElement.classList.contains('cm-gate')) return;
    document.documentElement.classList.remove('cm-gate');
    window.dispatchEvent(new Event('cm-gate-fim'));
  }
  function fechar() {
    liberarFicha();
    if (!S.aberto) return;
    S.aberto = false; painel.hidden = true; document.body.classList.remove('comu-on'); fecharThread();
    alternarSino(false);
    marcarMenu();
    pintarMarca();
    window.dispatchEvent(new Event('cm-fechou')); // a página da ficha ficou visível agora
  }
  window.__comuAbrir = abrir;
  window.__comuEstado = S;

