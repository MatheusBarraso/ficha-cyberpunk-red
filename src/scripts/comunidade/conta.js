  // ----- menu da conta: quem está logado, papel, trocar de sessão, modo escuro, trocar de conta -----
  const escuroOn = () => document.documentElement.classList.contains('cpr-escuro');
  const noLobby = () => !S.sess || !!S.verLobby;
  const papelAtual = () => (S.sess ? (S.mestre ? 'mestre' : 'player') : S.lob.papel);
  function dadosConta() {
    const c = window.__cmConta || {};
    const nome = c.nome || S.meuNome || (S.me && S.d.perfis && S.d.perfis[S.me] && S.d.perfis[S.me].nome) || '';
    return { nome, email: c.email || '', foto: c.foto || '' };
  }
  function avatar(grande) {
    const { nome, foto } = dadosConta();
    const el = h('span', { class: 'cm-av' + (grande ? ' cm-av-g' : '') });
    const ini = () => { el.textContent = S.me ? ((nome.trim()[0] || '?').toUpperCase()) : '?'; };
    if (foto && S.me) { const im = h('img', { src: foto, alt: '', referrerpolicy: 'no-referrer' }); im.onerror = () => { im.remove(); ini(); }; el.append(im); } else ini();
    return el;
  }
  function pintarChips() {
    const { nome } = dadosConta(), p = papelAtual();
    contas.forEach((b) => {
      b.querySelector('.cm-av').replaceWith(avatar());
      b.querySelector('.cm-conta-nome').textContent = S.me ? (nome.split(/\s+/)[0] || 'Conta') : 'Entrar';
      b.querySelector('.cm-conta-papel').textContent = S.sess ? (S.mestre ? 'Mestre' : 'Player') + ' · ' + (S.sess.nome || 'Sessão') : p === 'mestre' ? 'Mestre' : p === 'player' ? 'Player' : 'Conta';
      b.classList.toggle('cm-conta-mestre', p === 'mestre');
    });
  }
  function mudarPapel(p) { fecharPops(); if (S.sess) sairSala(); trocarPapel(p); abrir(); }
  function entrarComo(p, gm, sid, dados) {
    fecharPops();
    if (S.sess && S.sess.id === sid) { abrir(); return; }
    if (S.sess) sairSala();
    if (S.lob.papel !== p) trocarPapel(p); else liberarFicha();
    if (p === 'mestre' && S.lob.chave !== true) { abrir(); return; }
    entrarSala(gm, sid, dados);
  }
  function minhasSessoes() {
    const ms = (S.lob.chave === true || S.lob.papel === 'mestre') ? S.lob.minhas.filter((x) => !x.encerrada).map((x) => ({ p: 'mestre', gm: x.gm, sid: x.id, nome: x.nome, dados: x })) : [];
    const ps = Object.entries(S.lob.meusPedidos || {}).filter(([, it]) => it && !it.cancelado).map(([sid, it]) => {
      const ss = S.lob.sessDe[sid];
      return { p: 'player', gm: it.gm, sid, nome: (ss && ss.nome) || it.nome || 'Sessão', dados: ss, st: ss === undefined ? 'carregando' : acesso(ss, S.lob.meuMembro[sid], it) };
    }).filter((x) => x.st === 'ok');
    return [...ms, ...ps];
  }
  function chaveEscuro() {
    const on = escuroOn();
    return h('button', { type: 'button', role: 'switch', 'aria-checked': String(on), class: 'cm-switch' + (on ? ' on' : ''), onclick: () => { if (window.__cprEscuro) window.__cprEscuro(!escuroOn()); pintarConta(); } },
      h('span', { text: 'Modo escuro' }), h('i', { 'aria-hidden': 'true' }));
  }
  // cor do site, a mesma da Configuração do menu ☰ (os botões de lá fazem o trabalho)
