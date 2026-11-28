  // ----- marca no canto da tela: em qual ficha o mestre está -----
  // o mestre vê o nome da ficha aberta; o player vê um aviso quando o mestre está na ficha dele
  const OLHO_MARCA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>';
  const marca = h('div', { class: 'cm-marca', hidden: true, role: 'status', 'aria-live': 'polite' });
  const tituloT = h('button', { type: 'button', class: 'cm-tb-ficha', hidden: true, title: 'Abrir o painel de fichas', onclick: () => { S.ladoFechado = false; pintarRemota(); } });
  const VENDO_VALE = 180000; // o aviso do player some se o mestre parar de dar sinal por 3 min
  let vendoEnviado = null, tVendo = 0;
  function avisarVendo() {
    clearTimeout(tVendo);
    if (!S.sess || !S.mestre || !S.db) return;
    const v = R.id && R.tipo === 'player' ? R.id : null;
    if (v || vendoEnviado) sessRef(S.sess.gm, S.sess.id).update({ vendo: v, vendoTs: v ? agora() : 0 }).catch(() => {});
    vendoEnviado = v;
    if (v) tVendo = setTimeout(avisarVendo, 60000);
  }
  addEventListener('pagehide', () => { if (vendoEnviado && S.sess && S.mestre) { try { sessRef(S.sess.gm, S.sess.id).update({ vendo: null, vendoTs: 0 }); } catch { /* ok */ } } });
  function pintarMarca() {
    let conteudo = null, cls = '';
    if (R.id && S.mestre && !S.aberto) {
      cls = 'cm-marca-mestre';
      conteudo = [h('span', { class: 'cm-marca-tag cm-ml-' + R.tipo, text: SIGLA[R.tipo] }),
        h('span', { class: 'cm-marca-txt' }, h('small', { text: R.tipo === 'player' ? 'Você está na ficha do player' : 'Você está na ficha de ' + TIPOS_FICHA[R.tipo].toLowerCase() }), h('b', { text: tituloFicha(R.tipo, R.id) }))];
    } else if (S.sess && !S.mestre && S.sess.vendo === S.me && agora() - (S.sess.vendoTs || 0) < VENDO_VALE) {
      cls = 'cm-marca-player';
      conteudo = [(() => { const o = h('span', { class: 'cm-marca-olho' }); o.innerHTML = OLHO_MARCA; return o; })(), h('span', { class: 'cm-marca-txt' }, h('small', { text: 'Ao vivo' }), h('b', { text: 'O mestre está na sua ficha' }))];
    }
    marca.hidden = !conteudo;
    marca.className = 'cm-marca ' + cls;
    marca.onclick = cls === 'cm-marca-mestre' ? () => { S.ladoFechado = false; pintarRemota(); } : null;
    marca.title = cls === 'cm-marca-mestre' ? 'Abrir o painel de fichas' : '';
    if (conteudo) rc(marca, conteudo);
    // na barra de cima, no lugar do nome do site: a ficha que o mestre está mexendo
    const naFicha = !!(R.id && S.mestre);
    tituloT.hidden = !naFicha;
    document.body.classList.toggle('cm-tb-remota', naFicha);
    if (naFicha) rc(tituloT, h('span', { class: 'cm-marca-tag cm-ml-' + R.tipo, text: SIGLA[R.tipo] }),
      h('span', { class: 'cm-tb-ficha-txt' }, h('small', { text: 'Ficha de ' + TIPOS_FICHA[R.tipo].toLowerCase() + (morta(R.tipo, R.id) ? ' · morta' : '') }), h('b', { text: tituloFicha(R.tipo, R.id) })));
  }
  setInterval(pintarMarca, 20000);
  const barraR = h('div', { id: 'cm-remota', hidden: true, role: 'region', 'aria-label': 'Ficha aberta pelo mestre' });
  function abrirFicha(tipo, id, nova) {
    if (!S.sess || !S.mestre || (!nova && !registroDe(tipo, id))) return;
    sairRemota(false);
    R.tipo = tipo; R.id = id; R.base = null;
    R.ref = refFicha(tipo, id);
    window.__fichaRemota = {
      salvou: (d) => { R.pend = limparDados(d); clearTimeout(R.t); R.t = setTimeout(enviarRemota, 600); },
      sair: () => sairRemota(true),
    };
    document.body.classList.add('cm-remota');
    R.unsub = R.ref.onSnapshot((s) => {
      if (!s.exists) { if (R.base === null && nova) return; toast('Ficha', 'Essa ficha não existe mais.'); sairRemota(true); return; }
      const d = s.data() || {}, remoto = d.dados || {};
      if (R.base === null) { window.__fichaAplicar(remoto); R.base = assinatura(remoto); return; }
      if (d.por === S.me) { R.base = assinatura(remoto); return; }
      const mud = difere(R.base, remoto); R.base = assinatura(remoto);
      const ks = naoDigitando(mud); if (ks.length) window.__fichaAplicar(remoto, ks); // o player mexeu ao mesmo tempo
    }, () => { toast('Ficha', 'Não deu pra abrir essa ficha.'); sairRemota(true); });
    fechar();
    if (typeof showPage === 'function') showPage(0);
    estadoFicha(); pintarRemota();
    avisarVendo(); pintarMarca();
    { const st = document.getElementById('savestatus'); if (st) st.textContent = tipo === 'player' ? 'O que você muda vai pro player' : 'Só você vê esta ficha'; }
  }
  function enviarRemota() {
    const d = R.pend; R.pend = null;
    if (!d || !R.ref) return;
    R.base = assinatura(d);
    const reg = { dados: d, ts: agora(), por: S.me, nome: d.NOME || '' };
    if (R.tipo !== 'player') { reg.tipo = R.tipo; const f = fichaM(R.id); if (f && f.lado) reg.lado = f.lado; if (f && f.demo) reg.demo = true; }
    R.ref.set(reg).catch(falhou);
  }
  async function novaFicha(tipo) {
    let ref = null;
    const ok = await salvar(async () => { ref = await col('fichasMestre').add({ tipo, dados: {}, ts: agora(), por: S.me, nome: '' }); });
    if (ok && ref && ref.id) abrirFicha(tipo, ref.id, true);
  }
  async function apagarFicha(tipo, id) {
    if (!(await confirmar(`Apagar a ficha “${tituloFicha(tipo, id)}”? Isso não tem volta.`, 'Apagar'))) return;
    if (R.id === id) sairRemota(true);
    await salvar(() => dok('fichasMestre', id).delete());
  }
  function sairRemota(restaurar) {
    if (!R.id) return;
    clearTimeout(R.t); if (R.pend) enviarRemota();
    if (R.unsub) R.unsub();
    Object.assign(R, { tipo: null, id: null, ref: null, unsub: null, base: null, pend: null });
    window.__fichaRemota = null;
    document.body.classList.remove('cm-remota');
    if (restaurar !== false && window.__fichaVoltarLocal) window.__fichaVoltarLocal();
    pintarRemota(); estadoFicha();
    if (restaurar !== false) avisarVendo();
    pintarMarca();
    focoLimpar();
    if (ajudaEnviada && S.sess) { ajudaEnviada = null; sessRef(S.sess.gm, S.sess.id).update({ ajuda: null }).catch(() => {}); }
  }
  // o mestre não tem ficha própria: no lugar das páginas da ficha aparece um aviso
  function estadoFicha() {
    const sem = S.lob.papel === 'mestre' && !R.id;
    document.body.classList.toggle('cm-semficha', sem);
    document.querySelectorAll('.sheet.pdfpage .pdflayer').forEach((l) => { l.inert = sem; });
  }
  function caixasSemFicha() {
    document.querySelectorAll('.sheet.pdfpage').forEach((sh) => {
      if (sh.querySelector(':scope > .cm-semficha-box')) return;
      sh.append(h('div', { class: 'cm-semficha-box' },
        h('div', { class: 'cm-sf-faixa', text: 'Mestre' }),
        h('b', { text: 'O mestre não tem ficha própria' }),
        h('p', { text: 'Pra ver ou mexer na ficha de um player, abra a sala da sessão e vá em Ferramentas.' }),
        h('button', { type: 'button', class: 'cm-btn cm-pri', text: 'Abrir as Ferramentas', onclick: () => (S.sess && S.mestre ? abrir('ferramentas') : abrir()) })));
    });
  }

