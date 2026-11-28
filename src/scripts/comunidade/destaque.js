  // ----- cor de destaque (secundária): rara, só no que precisa chamar o olho -----
  const DESTAQUE_KEY = 'cpr-destaque', DESTAQUE_PADRAO = '#fcee0a';
  const DESTAQUES = [['#fcee0a', 'Amarelo (padrão)'], ['#00f0ff', 'Ciano'], ['#ff2a6d', 'Rosa neon'], ['#39ff14', 'Verde'], ['#ff8a00', 'Laranja'], ['#f2f2f2', 'Branco']];
  const tintaDe = (hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#0d0d0d' : '#ffffff'; };
  function destaqueAtual() { try { const v = localStorage.getItem(DESTAQUE_KEY); if (/^#[0-9a-f]{6}$/i.test(v || '')) return v.toLowerCase(); } catch { /* ok */ } return DESTAQUE_PADRAO; }
  function aplicarDestaque(cor) {
    const c = /^#[0-9a-f]{6}$/i.test(cor || '') ? cor.toLowerCase() : DESTAQUE_PADRAO;
    const st = document.documentElement.style; st.setProperty('--acc2', c); st.setProperty('--acc2-ink', tintaDe(c));
    try { if (c === DESTAQUE_PADRAO) localStorage.removeItem(DESTAQUE_KEY); else localStorage.setItem(DESTAQUE_KEY, c); } catch { /* ok */ }
  }
  aplicarDestaque(destaqueAtual());
  window.__cprDestaque = aplicarDestaque;
  function destaqueConta() {
    const atual = destaqueAtual();
    const outra = h('input', { type: 'color', class: 'cm-cor-outra', 'aria-label': 'Outra cor de destaque', title: 'Outra cor', value: atual });
    outra.addEventListener('input', () => aplicarDestaque(outra.value));
    outra.addEventListener('change', () => setTimeout(pintarConta, 0));
    const escolher = (c) => { aplicarDestaque(c); setTimeout(pintarConta, 0); };
    return h('div', { class: 'cm-cores' }, h('div', { class: 'cm-cores-tit' }, 'Cor de destaque', h('small', { text: 'Aparece só no que pede atenção: sua vez, novidades, modo ajuda, onde você está.' })),
      h('div', { class: 'cm-cores-grade' },
        DESTAQUES.map(([c, nome]) => h('button', { type: 'button', class: 'cm-cor' + (c === atual ? ' on' : ''), style: '--c:' + c, title: nome, 'aria-label': nome, 'aria-pressed': String(c === atual), onclick: () => escolher(c) })),
        h('label', { class: 'cm-cor cm-cor-mais', title: 'Outra cor' }, outra)),
      atual !== DESTAQUE_PADRAO ? btn('Voltar ao amarelo', () => escolher(DESTAQUE_PADRAO), 'cm-mini') : null);
  }
  // cor do site (nucleo/cores.js)
  function coresConta() {
    const atual = corDaFicha().toLowerCase();
    const escolher = (c) => { applyTheme(c); setTimeout(pintarConta, 0); };
    const outra = h('input', { type: 'color', class: 'cm-cor-outra', 'aria-label': 'Outra cor', title: 'Outra cor', value: /^#[0-9a-f]{6}$/.test(atual) ? atual : COR_PADRAO });
    outra.addEventListener('input', () => applyTheme(outra.value));
    outra.addEventListener('change', () => setTimeout(pintarConta, 0));
    return h('div', { class: 'cm-cores' }, h('div', { class: 'cm-cores-tit', text: 'Cor do site' }),
      h('div', { class: 'cm-cores-grade' },
        CORES_SITE.map(([c, nome]) => h('button', { type: 'button', class: 'cm-cor' + (c === atual ? ' on' : ''), style: '--c:' + c, title: nome, 'aria-label': nome, 'aria-pressed': String(c === atual), onclick: () => escolher(c) })),
        h('label', { class: 'cm-cor cm-cor-mais', title: 'Outra cor' }, outra)),
      btn('Voltar ao padrão', () => escolher(COR_PADRAO), 'cm-mini'));
  }
  function pintarConta() {
    pintarChips();
    if (contaPainel.hidden) return;
    const { nome, email } = dadosConta();
    const sec = (tit, ...filhos) => h('div', { class: 'cm-conta-sec' }, tit ? h('div', { class: 'cm-conta-rot', text: tit }) : null, ...filhos);
    const out = [h('div', { class: 'cm-conta-hd' }, avatarConta(true), h('div', { class: 'cm-conta-id' },
      h('b', { text: S.me ? (nome || 'Sua conta') : 'Sem conta' }), h('small', { text: S.me ? (email || (window.__cmLogout ? '' : 'Conta do Claude')) : 'Entre com o Google pra criar ou entrar em sessões.' })))];
    if (!S.me) {
      if (window.__cmLogin && (S.db || S.erro)) out.push(sec(null, btn('Entrar com Google', () => { try { sessionStorage.setItem('cpr-com-poslogin', S.lob.papel || ''); } catch { /* ok */ } window.__cmLogin(); }, 'cm-pri cm-largo')));
    } else {
      const pa = papelAtual();
      out.push(sec('Entrar como', h('div', { class: 'cm-seg' }, [['mestre', 'Mestre'], ['player', 'Player']].map(([p, n]) =>
        h('button', { type: 'button', class: 'cm-seg-b' + (pa === p ? ' on' : ''), 'aria-pressed': String(pa === p), onclick: () => { if (pa === p && !S.sess) { fecharPops(); abrir(); return; } mudarPapel(p); } }, n)))));
      if (S.sess) out.push(sec('Sessão atual', h('div', { class: 'cm-conta-atual' }, h('b', { text: S.sess.nome || 'Sessão' }), h('small', { text: S.mestre ? 'Você é o mestre' : 'Você é player' })),
        h('div', { class: 'cm-row' },
          S.aberto && !S.verLobby ? (!S.mestre ? btn('Ir pra ficha', () => { fecharPops(); fechar(); }, 'cm-mini') : null) : btn('Ir pra sala', () => { fecharPops(); abrir(); }, 'cm-mini cm-pri'),
          btn('Sair da sala', () => { fecharPops(); sairDaSala(); }, 'cm-mini'))));
      const lista = minhasSessoes().filter((x) => !(S.sess && x.sid === S.sess.id));
      out.push(sec(S.sess ? 'Trocar de sessão' : 'Suas sessões',
        lista.length ? h('div', { class: 'cm-conta-lista' }, lista.slice(0, 8).map((x) => h('button', { type: 'button', class: 'cm-conta-item', onclick: () => entrarComo(x.p, x.gm, x.sid, x.dados) },
          h('span', { class: 'cm-ml-tag cm-ml-' + (x.p === 'mestre' ? 'npc' : 'player'), text: x.p === 'mestre' ? 'GM' : 'PJ' }), h('b', { text: x.nome }), h('i', { 'aria-hidden': 'true', text: '›' }))))
          : h('div', { class: 'cm-sub', text: !S.carregou.has('lob:minhas') && !S.carregou.has('lob:meus') ? 'Carregando…' : S.sess ? 'Você só está nesta sessão por enquanto.' : 'Nenhuma sessão ainda.' }),
        btn('Todas as sessões e códigos', () => { fecharPops(); irLobby(); }, 'cm-mini cm-largo')));
    }
    out.push(sec('Aparência', chaveEscuro(), coresConta(), destaqueConta()));
    if (S.me && window.__cmLogout) out.push(sec(null, h('div', { class: 'cm-row' },
      btn('Trocar de conta', () => { try { sessionStorage.setItem('cpr-com-poslogin', S.lob.papel || ''); } catch { /* ok */ } (window.__cmTrocarConta || window.__cmLogout)(); }, 'cm-mini'),
      btn('Sair da conta', () => window.__cmLogout(), 'cm-mini cm-perigo'))));
    rc(contaPainel, out);
  }


