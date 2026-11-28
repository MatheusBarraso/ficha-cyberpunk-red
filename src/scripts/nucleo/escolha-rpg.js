// ---------- escolha de RPG: a porta de entrada do Sketcher ----------
// Aparece sozinha na primeira visita (html.sk-escolher, decidido em cabeca/sistema.js) e pelo
// "Trocar de RPG" (menu ☰, menu da conta e entrada da Comunidade). Os cartões saem do registro SISTEMAS.
// Escolher o RPG que já está aberto só fecha a tela; escolher outro chama trocarSistema (recarrega).

// o RPG aberto aparece no título da aba, na barra e no menu ☰
document.title = `Sketcher · ${SISTEMA.nome}`;
for (const id of ['marca-rpg', 'btn-rpg-nome']) { const e = document.getElementById(id); if (e) e.textContent = SISTEMA.nome; }

const escolhaRpg = (() => {
  const raiz = document.documentElement;
  const primeiraVez = () => raiz.classList.contains('sk-escolher');
  let tela = null, folha = null, moldura = null, voltarFoco = null;

  // <tag atributos…>filhos</tag> — text vira textContent, onclick vira ouvinte
  function el(tag, attrs, ...filhos) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'text') e.textContent = v;
      else if (k === 'onclick') e.addEventListener('click', v);
      else e.setAttribute(k, v);
    }
    e.append(...filhos.flat().filter((f) => f != null));
    return e;
  }

  function cartao(s) {
    const atual = !primeiraVez() && s.id === SISTEMA.id;
    return el('button', { type: 'button', class: 'sk-escolha sk-rpg-cartao' + (atual ? ' atual vermelha' : ''), 'data-rpg': s.id, 'aria-current': atual ? 'true' : null, onclick: () => escolher(s.id) },
      el('span', { class: 'sk-esc-tit', text: s.nome }),
      el('span', { class: 'sk-esc-txt', text: s.descricao }),
      s.itens && s.itens.length ? el('span', { class: 'sk-rpg-itens' }, s.itens.map((t) => el('span', { text: t }))) : null,
      el('span', { class: 'sk-rpg-pe' },
        el('span', { class: 'sk-esc-ir', text: atual ? 'Continuar' : 'Jogar' }),
        atual ? el('span', { class: 'sk-rpg-aqui', text: 'Você está aqui' }) : null));
  }

  function pintar() {
    const prim = primeiraVez();
    const wrap = el('div', { class: 'sk-rpg-wrap' },
      el('div', { class: 'sk-rpg-topo' },
        el('h1', { class: 'sk-esc-logo', id: 'sk-rpg-tit' }, el('span', { text: 'Sketcher' }), el('b', { text: prim ? 'Escolha o RPG' : 'Trocar de RPG' })),
        prim ? null : el('button', { type: 'button', class: 'sk-rpg-x', 'aria-label': 'Fechar', title: 'Fechar (Esc)', text: '✕', onclick: () => fechar() })),
      el('p', { class: 'sk-rpg-sub', text: prim
        ? 'Qual RPG você vai jogar? Dá pra trocar depois pelo menu.'
        : 'Cada RPG guarda a própria ficha, anotações e história neste navegador: trocar não apaga nada.' }),
      el('div', { class: 'sk-esc-grid sk-rpg-grade' }, Object.values(SISTEMAS).map(cartao)));
    folha.replaceChildren(moldura.svg, wrap);
    moldura.seguir(folha);
  }

  function montar() {
    if (tela) return;
    moldura = criarMoldura();
    folha = el('div', { class: 'sk-rpg-folha' });
    tela = el('div', { id: 'sk-rpg', class: 'sk-rpg', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sk-rpg-tit', tabindex: '-1', hidden: '' }, folha);
    // Tab não sai da tela enquanto ela está aberta
    tela.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const fs = [...tela.querySelectorAll('button')];
      const i = fs.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); fs[fs.length - 1].focus(); }
      else if (!e.shiftKey && i === fs.length - 1) { e.preventDefault(); fs[0].focus(); }
    });
    document.body.append(tela);
  }

  function abrir() {
    montar();
    if (typeof openMenu === 'function') openMenu(false);
    if (tela.hidden) voltarFoco = document.activeElement;
    pintar();
    tela.hidden = false;
    tela.scrollTop = 0;
    // foco no RPG aberto (Enter = continuar); na primeira visita, na própria tela, sem pré-escolher nada
    (tela.querySelector('.sk-rpg-cartao.atual') || tela).focus({ preventScroll: true });
  }

  // na primeira visita não tem pra onde voltar: só fecha escolhendo
  function fechar() {
    if (!tela || tela.hidden || primeiraVez()) return false;
    tela.hidden = true;
    // o foco volta pra quem abriu, se ainda estiver à vista (o menu ☰ fecha ao abrir a escolha)
    const v = voltarFoco; voltarFoco = null;
    if (v && v.isConnected && v.getClientRects().length && !v.closest('#menu:not(.open)')) v.focus({ preventScroll: true });
    return true;
  }

  function escolher(id) {
    if (id !== SISTEMA.id) { trocarSistema(id); return; }
    // o RPG que já está carregado: só anota a escolha e segue
    try { localStorage.setItem('sk-sistema', id); } catch { /* sem armazenamento */ }
    raiz.classList.remove('sk-escolher');
    fechar();
  }

  aoEsc(90, () => {
    if (!tela || tela.hidden) return false;
    fechar();
    return true; // na primeira visita o Esc não passa pra trás da tela
  });

  for (const b of document.querySelectorAll('#btn-rpg')) b.addEventListener('click', abrir);
  if (primeiraVez()) abrir();
  return { abrir, fechar, aberta: () => !!tela && !tela.hidden };
})();
function abrirEscolhaRpg() { escolhaRpg.abrir(); }
