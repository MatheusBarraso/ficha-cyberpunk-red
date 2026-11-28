  // ---------- menu principal: seção Comunidade ----------
  function ligarMenu() {
    const fichaSec = document.querySelector('#menu [data-fold="fold-ficha"]');
    if (!fichaSec) return;
    const secBtn = h('button', { class: 'm-sec fold', type: 'button', 'data-fold': 'fold-comu', 'aria-expanded': 'true' }, 'Comunidade', h('b', { class: 'cm-n', 'data-n': 'novidades' }), h('span', { class: 'chev', text: '▾' }));
    const corpoM = h('div', { class: 'fold-body', id: 'fold-comu' }, h('button', { class: 'm-item cm-go', type: 'button', onclick: () => { if (S.sess) irLobby(); else abrir(); } }, 'Sessões', h('b', { class: 'cm-n', 'data-lob': '' })), SECS.map(([k, n]) => h('button', { class: 'm-item cm-go', type: 'button', 'data-sec': k, onclick: () => abrir(k) }, n, k === 'novidades' ? null : h('b', { class: 'cm-n', 'data-n': k }))));
    fichaSec.before(secBtn, corpoM);
    secBtn.addEventListener('click', () => { const fechado = corpoM.classList.toggle('closed'); secBtn.classList.toggle('closed', fechado); secBtn.setAttribute('aria-expanded', String(!fechado)); });
    // contador no botão ☰ da ficha e no ☰ do leitor de livros
    ['#btn-menu', '#lvb-app'].forEach((s) => { const b = document.querySelector(s); if (b) b.append(h('b', { class: 'cm-dot', 'data-total': '' })); });
    // trocar de página da ficha fecha a comunidade
    const anterior = showPage;
    showPage = function (i) { fechar(); anterior(i); };
  }

