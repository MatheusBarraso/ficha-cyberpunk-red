  // ---------- NOVIDADES / notificações ----------
  function itens() {
    const me = S.me, it = [];
    if (!S.sess) return it;
    const add = (sec, id, ts, txt, autor, abrirFn) => { if (!ts || (autor && autor === me)) return; it.push({ sec, id, ts, txt, abrirFn }); };
    (S.d.quadro || []).filter((q) => q.tipo !== 'traco').forEach((q) => add('historia', 'q' + q.id, q.ts, `${q.autor === S.sess.gm ? 'O mestre' : nome(q.autor)} pôs ${q.tipo === 'imagem' ? 'uma imagem' : 'um texto'} na história`, q.autor));
    S.d.mural.forEach((p) => add('historia', 'p' + p.id, p.ts, p.npc ? `${npcNome(p.npc)} postou no mural` : `${nome(p.autor)} postou no mural`, p.autor));
    S.d.coment.forEach((c) => add('historia', 'c' + c.id, c.ts, `${nome(c.autor)} comentou: “${corte(c.texto, 50)}”`, c.autor, () => { S.abertosCom.add(c.post); }));
    if (S.d.mapa && S.d.mapa.ts) add('historia', 'mapa', S.d.mapa.ts, 'O mapa da cidade foi atualizado', S.d.mapa.autor);
    S.d.locais.forEach((l) => add('historia', 'l' + l.id, l.ts, `${TIPOS_LOCAL[l.tipo] || 'Local'}: ${l.nome}`, l.autor));
    S.d.npcs.filter((n) => S.mestre || !n.oculto).forEach((n) => add('npcs', 'n' + n.id, n.ts, `NPC: ${n.nome}`, n.autor, () => { S.npcAberto = n.id; }));
    if (S.mestre) S.d.conversas.forEach((c) => { if (c.ultimoDe === 'jogador') add('npcs', 'cv' + c.id + c.ultimoTs, c.ultimoTs, `${nome(c.id)} → ${npcNome(c.ultimoNpc)}: “${corte(c.ultimoTexto, 50)}”`, null, () => { abrirThread(c.id); }); });
    else S.d.msgs.forEach((m) => { if (m.de === 'npc') add('npcs', 'm' + m.id, m.ts, `${npcNome(m.npc)} respondeu: “${corte(m.texto, 50)}”`, null, () => { S.chatNpc = m.npc; S.npcAberto = m.npc; }); });
    S.d.pistas.forEach((p) => add('pistas', 'p' + p.id, p.ts, `Pista nova: ${p.titulo}`, p.autor));
    S.d.desc.forEach((d) => add('pistas', 'd' + d.id, d.ts, d.tipo === 'resolveu' ? `${nome(d.autor)} decifrou uma pista` : `${nome(d.autor)} compartilhou uma descoberta`, d.autor, () => { S.abertosDesc.add(d.pista); }));
    S.d.missoes.forEach((m) => add('missoes', 'ms' + m.id, m.ts, `Missão${m.status === 'concluida' ? ' concluída' : ''}: ${m.titulo}`, m.autor));
    if (S.mestre) S.d.aceites.forEach((a) => add('missoes', 'a' + a.id + a.ts, a.ts, `${nome(a.autor)} ${a.estado === 'entregue' ? 'entregou' : 'aceitou'} uma missão`, a.autor));
    const r = S.me && S.d.rep[S.me];
    if (r && r.ts) add('perfil', 'rep' + r.ts, r.ts, 'O mestre mexeu na sua reputação', r.autor === me ? null : r.autor);
    if (S.mestre) S.d.den.forEach((d) => (d.itens || []).forEach((x, i) => add('historia', 'den' + d.id + x.ts, x.ts, 'Denúncia nova no mural', null, () => { S.verDen = true; })));
    return it.sort((a, b) => b.ts - a.ts);
  }
  function irPara(x) { abrir(x.sec); if (x.abrirFn) { x.abrirFn(); atualizar(); } }
  // a História juntou o Mural e o Mapa: o que já tinha sido visto lá continua visto
  const vistoEm = (sec) => (S.visto[sec] || (sec === 'historia' ? Math.max(S.visto.mural || 0, S.visto.mapa || 0) : 0));
  const naoVistos = () => (S.visto ? itens().filter((x) => x.ts > vistoEm(x.sec)) : []);
  function badges() {
    const nv = naoVistos();
    const por = {};
    nv.forEach((x) => { por[x.sec] = (por[x.sec] || 0) + 1; });
    por.novidades = nv.length;
    const lob = contaLobby();
    const fmt = (n) => (n ? (n > 99 ? '99+' : String(n)) : '');
    document.querySelectorAll('[data-n]').forEach((b) => { b.textContent = fmt(por[b.dataset.n] || 0); });
    document.querySelectorAll('[data-lob]').forEach((b) => { b.textContent = fmt(lob); });
    document.querySelectorAll('[data-total]').forEach((b) => { b.textContent = fmt(nv.length + lob); });
    pintarSino(); pintarConta();
    // avisos de coisas que chegaram agora (só depois da primeira carga)
    if (buscandoNomes) return;
    if (!S.conhecidos) { if (S.visto && [...S.carregou].filter((k) => !k.startsWith('lob:')).length >= 6) { S.conhecidos = new Set(itens().map((x) => x.sec + x.id + x.ts)); } return; }
    const novos = nv.filter((x) => !S.conhecidos.has(x.sec + x.id + x.ts));
    itens().forEach((x) => S.conhecidos.add(x.sec + x.id + x.ts));
    const mostrar = novos.filter((x) => !(S.aberto && S.sec === x.sec));
    mostrar.slice(0, 3).forEach((x) => toast(NOME_SEC[x.sec], x.txt, () => irPara(x)));
    if (mostrar.length > 3) toast('Novidades', `Mais ${mostrar.length - 3} coisas novas`, () => { abrir(); alternarSino(true); });
  }
  let tVisto = null;
  function marcarVisto(sec) {
    if (!S.visto || !S.me || sec === 'novidades') return;
    const max = Math.max(0, ...itens().filter((x) => x.sec === sec).map((x) => x.ts));
    if (!max || vistoEm(sec) >= max) return;
    S.visto = { ...S.visto, [sec]: max };
    badges();
    clearTimeout(tVisto);
    tVisto = setTimeout(() => salvarVisto(), 1200);
  }
  let gravandoVisto = false;
  async function salvarVisto() {
    if (gravandoVisto) { tVisto = setTimeout(salvarVisto, 800); return; }
    gravandoVisto = true;
    try { await S.db.doc(`data/users/${S.me}/visto-${S.sess.id}`).set({ ...S.visto }); } catch { /* sem permissão de escrita: os avisos ficam só nesta visita */ }
    gravandoVisto = false;
  }
  function marcarTudo() {
    if (!S.visto) return;
    const v = { ...S.visto };
    for (const x of itens()) v[x.sec] = Math.max(v[x.sec] || 0, x.ts);
    S.visto = v; badges(); salvarVisto(); atualizar();
  }

  const SECOES = {};
  // painel suspenso preso no botão que abriu (barra de cima; na ficha deitada, a barra fica na lateral)
  function ancorar(p, b) {
    const r = b.getBoundingClientRect();
    p.style.left = p.style.right = p.style.top = '';
    if (document.body.classList.contains('land') && b.closest('.toolbar')) { p.style.left = Math.round(r.right + 8) + 'px'; p.style.top = Math.round(Math.max(8, Math.min(r.top, innerHeight - 320))) + 'px'; }
    else { const w = p.offsetWidth || 340; p.style.left = Math.round(Math.max(6, Math.min(r.right - w, innerWidth - w - 6))) + 'px'; p.style.top = Math.round(r.bottom + 8) + 'px'; }
  }
  const visivel = (b) => !!b && !b.hidden && b.getClientRects().length > 0;
  const botaoPadrao = (lista) => lista.find(visivel) || lista[0];
  let ancS = null, ancC = null;
  function alternarSino(abre, b) {
    const quer = abre === undefined ? sinoPainel.hidden : !!abre;
    if (quer) { if (!contaPainel.hidden) alternarConta(false); ancS = visivel(b) ? b : botaoPadrao(sinos); }
    sinoPainel.hidden = !quer;
    sinos.forEach((x) => { const on = quer && x === ancS; x.setAttribute('aria-expanded', String(on)); x.classList.toggle('on', on); });
    if (quer) { ancorar(sinoPainel, ancS); pintarSino(); }
  }
  function alternarConta(abre, b) {
    const quer = abre === undefined ? contaPainel.hidden : !!abre;
    if (quer) { if (!sinoPainel.hidden) alternarSino(false); ancC = visivel(b) ? b : botaoPadrao(contas); }
    contaPainel.hidden = !quer;
    contas.forEach((x) => { const on = quer && x === ancC; x.setAttribute('aria-expanded', String(on)); x.classList.toggle('on', on); });
    if (quer) { ancorar(contaPainel, ancC); pintarConta(); }
  }
  function pintarSino() {
    if (sinoPainel.hidden) return;
    const nv = S.sess ? naoVistos() : [];
    const kNv = new Set(nv.map((x) => x.sec + '|' + x.id + '|' + x.ts));
    const recentes = S.sess ? itens().filter((x) => !kNv.has(x.sec + '|' + x.id + '|' + x.ts)).slice(0, 12) : [];
    const linha = (x, velho) => h('button', { type: 'button', class: 'cm-linha' + (velho ? ' cm-velho' : ''), onclick: () => { alternarSino(false); irPara(x); } },
      h('span', { class: 'cm-rot', text: NOME_SEC[x.sec] || '' }), h('span', { class: 'cm-linha-txt', text: x.txt }), h('span', { class: 'cm-quando', text: quando(x.ts) }));
    // pedidos de entrada nas sessões do mestre aparecem em qualquer tela
    const pedidos = [];
    S.lob.minhas.filter((ss) => !ss.encerrada).forEach((ss) => pendentesDe(ss).filter((x) => x.estado === 'pendente').forEach((x) => pedidos.push(
      h('button', { type: 'button', class: 'cm-linha', onclick: () => { alternarSino(false); irGerenciar(ss.id); } },
        h('span', { class: 'cm-rot', text: 'Pedido' }), h('span', { class: 'cm-linha-txt' }, spanNome(x.uid), ` quer entrar em “${ss.nome}”`), h('span', { class: 'cm-quando', text: x.it && x.it.ts ? quando(x.it.ts) : '' })))));
    rc(sinoPainel,
      h('div', { class: 'cm-sino-hd' }, h('span', { text: S.sess ? 'Novidades · ' + (S.sess.nome || 'Sessão') : 'Novidades' }), nv.length ? btn('Marcar como visto', () => { marcarTudo(); pintarSino(); }, 'cm-mini') : null),
      h('div', { class: 'cm-sino-lista' },
        pedidos.length ? [h('div', { class: 'cm-divisa', text: 'Pedidos de entrada' }), ...pedidos] : null,
        nv.length ? [pedidos.length ? h('div', { class: 'cm-divisa', text: 'Na sessão' }) : null, ...nv.slice(0, 60).map((x) => linha(x))]
          : !pedidos.length ? h('div', { class: 'cm-vazio', text: S.sess ? 'Nada novo.' : 'Nada novo. Quando você estiver numa sessão, as novidades da mesa aparecem aqui.' }) : null,
        recentes.length ? [h('div', { class: 'cm-divisa', text: 'Já visto' }), ...recentes.map((x) => linha(x, true))] : null));
  }
  function irGerenciar(sid) { fecharPops(); if (S.sess && !S.mestre) sairSala(); if (S.lob.papel !== 'mestre') trocarPapel('mestre'); S.lob.ger = sid; irLobby(); }

