  // ---------- assinaturas ----------
  const lista = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  function sub(q, fn, chave, guarda = S.subsSala) {
    const t = setTimeout(() => { S.lento = true; mudou(); }, 10000);
    const un = q.onSnapshot((snap) => {
      // qualquer resposta (do servidor ou da memória do aparelho) já conta como carregado
      clearTimeout(t); S.carregou.add(chave); S.lento = false;
      fn(snap); mudou();
    }, (e) => { clearTimeout(t); S.carregou.add(chave); S.lento = false; console.warn('comunidade', chave, e && e.code); mudou(); });
    const fim = () => { clearTimeout(t); un(); };
    if (guarda) guarda.push(fim);
    return fim;
  }
  // busca os nomes (perfil do Claude) de quem aparece nos dados, pra avisos e listas
  let buscandoNomes = false;
  async function preNomes() {
    if (buscandoNomes || !S.user || !S.user.profiles) return;
    const ids = new Set();
    S.d.mural.forEach((x) => ids.add(x.autor)); S.d.coment.forEach((x) => ids.add(x.autor)); S.d.desc.forEach((x) => ids.add(x.autor));
    S.d.aceites.forEach((x) => ids.add(x.autor)); S.d.conversas.forEach((x) => ids.add(x.id)); S.d.den.forEach((x) => ids.add(x.id));
    Object.keys(S.d.rep).forEach((x) => ids.add(x)); Object.keys(S.lob.pedidosTodos).forEach((x) => ids.add(x));
    S.lob.minhas.forEach((x) => ids.add(x.gm)); Object.values(S.lob.sessDe).forEach((x) => x && ids.add(x.gm));
    const falta = [...ids].filter((id) => id && !(id in S.nomes)).slice(0, 100);
    if (!falta.length) return;
    buscandoNomes = true;
    try { const ps = await S.user.profiles(falta); falta.forEach((id) => { S.nomes[id] = (ps && ps[id] && ps[id].name) || ''; }); } catch { falta.forEach((id) => { S.nomes[id] = ''; }); }
    buscandoNomes = false;
    mudou();
  }
  let tMudou = 0;
  let tSinc = 0;
  function mudou() {
    // a ficha sincroniza mesmo com a aba em segundo plano (lá o requestAnimationFrame não roda)
    clearTimeout(tSinc); tSinc = setTimeout(sincFichas, 30);
    if (tMudou) return;
    tMudou = requestAnimationFrame(() => { tMudou = 0; preNomes(); verificarLobby(); badges(); atualizar(); pintarTopo(); pintarSino(); pintarMarca(); pintarAjuda(); if (S.mestre) pintarFerr(); });
  }
  function pintarTopo() {
    avisoLento.hidden = !(S.lento && S.aberto);
    const c = painel.querySelector('.cm-cidade'), sm = painel.querySelector('.cm-tit small');
    painel.classList.toggle('cm-l-mestre', noLobby() && S.lob.papel === 'mestre');
    painel.classList.toggle('cm-l-player', noLobby() && S.lob.papel === 'player');
    tabs.hidden = noLobby();
    const passou = !!(S.lob.papel || S.sess);
    sinoBtn.hidden = !passou;
    barraT.hidden = !passou;
    fichaBtn.hidden = !passou || papelAtual() === 'mestre';
    pintarConta(); pintarSino();
    document.querySelectorAll('[data-sec="ferramentas"]').forEach((b) => { b.hidden = !S.mestre; });
    appBtn.hidden = !S.lob.papel && !S.sess;
    if (!noLobby()) {
      sm.textContent = (S.d.mapa && S.d.mapa.cidade) || 'Comunidade';
      c.textContent = S.sess.nome || 'Sessão';
      papel.textContent = S.mestre ? 'Mestre' : (S.escreve ? 'Player' : 'Leitor');
    } else {
      sm.textContent = 'Comunidade';
      c.textContent = S.lob.papel ? 'Sessões' : 'Entrar';
      papel.textContent = S.lob.papel === 'mestre' ? 'Mestre' : S.lob.papel === 'player' ? 'Player' : '';
    }
    papel.hidden = !papel.textContent;
    papel.classList.toggle('mestre', papel.textContent === 'Mestre');
  }

  function limparSala() {
    S.subsSala.splice(0).forEach((f) => f());
    fecharThread();
    S.d = { quadro: [], quadroConf: null, mapa: null, locais: [], npcs: [], pistas: [], rasc: [], missoes: [], aceites: [], rep: {}, perfis: S.d.perfis || {}, mural: [], coment: [], desc: [], conversas: [], minhaConv: null, msgs: [], den: [], thread: [], fichas: [], fichasM: [], ataques: [], ordem: null };
    S.visto = null; S.conhecidos = null; S.carregou = new Set([...S.carregou].filter((k) => k.startsWith('lob:'))); S.lob.membrosSala = {}; S.lento = false;
    S.npcAberto = null; S.chatNpc = null; S.perfilAberto = null; S.verDen = false; S.filtroLocal = ''; S.ui = {};
    for (const k in decifradas) delete decifradas[k];
  }
  function assinarSala() {
    const g = S.sess;
    sub(sessRef(g.gm, g.id), (s) => {
      if (!s.exists) { expulsar('Essa sessão não existe mais.'); return; }
      S.sess = { ...s.data(), id: g.id, gm: g.gm };
      try { const u = JSON.parse(localStorage.getItem(ULTIMA_KEY) || 'null'); if (u && u.sid === g.id && u.nome !== S.sess.nome) localStorage.setItem(ULTIMA_KEY, JSON.stringify({ ...u, nome: S.sess.nome || '' })); } catch { /* ok */ }
      pintarChips();
      if (S.sess.encerrada && !S.mestre) expulsar('O mestre encerrou essa sessão.');
    }, 'sessao');
    sub(sessRef(g.gm, g.id).collection('membros'), (s) => {
      S.lob.membrosSala = Object.fromEntries(s.docs.map((d) => [d.id, d.data()]));
      if (!S.mestre) { const st = acesso(S.sess, S.lob.membrosSala[S.me], (S.lob.meusPedidos || {})[g.id]); if (st === 'removido' || st === 'recusado') expulsar(null); }
    }, 'membros');
    sub(dok('conteudo', 'mapa'), (s) => { S.d.mapa = s.exists ? s.data() : null; }, 'mapa');
    sub(dok('conteudo', 'quadro'), (s) => { S.d.quadroConf = s.exists ? s.data() : null; }, 'quadroConf');
    sub(col('quadro').orderBy('ts').limit(800), (s) => { S.d.quadro = lista(s); }, 'quadro');
    sub(col('locais'), (s) => { S.d.locais = lista(s); }, 'locais');
    sub(col('npcs'), (s) => { S.d.npcs = lista(s).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')); }, 'npcs');
    sub(col('pistas').orderBy('ts', 'desc'), (s) => { S.d.pistas = lista(s); }, 'pistas');
    sub(col('missoes').orderBy('ts', 'desc'), (s) => { S.d.missoes = lista(s); }, 'missoes');
    sub(col('aceites'), (s) => { S.d.aceites = lista(s); }, 'aceites');
    sub(col('reputacao'), (s) => { S.d.rep = Object.fromEntries(s.docs.map((d) => [d.id, d.data()])); }, 'rep');
    sub(col('mural').orderBy('ts', 'desc').limit(150), (s) => { S.d.mural = lista(s); }, 'mural');
    sub(col('comentarios').orderBy('ts', 'desc').limit(400), (s) => { S.d.coment = lista(s); }, 'coment');
    sub(col('descobertas').orderBy('ts', 'desc').limit(400), (s) => { S.d.desc = lista(s); }, 'desc');
    if (FB) sub(col('livros'), (s) => { S.d.livrosMesa = lista(s); avisarLivros(); }, 'livros');
    if (S.mestre) {
      sub(col('rascunhos'), (s) => { S.d.rasc = lista(s); }, 'rasc');
      sub(col('fichas'), (s) => { S.d.fichas = lista(s); if (R.id) pintarRemota(); }, 'fichas');
      sub(col('fichasMestre'), (s) => { S.d.fichasM = lista(s); if (R.id) pintarRemota(); }, 'fichasM');
      sub(col('ataques'), (s) => { S.d.ataques = lista(s).sort((a, b) => (b.ts || 0) - (a.ts || 0)); checarContestados(); if (R.id) pintarRemota(); }, 'ataques');
      sub(dok('mestreEstado', 'ordem'), (s) => { S.d.ordem = s.exists ? s.data() : null; if (R.id) pintarRemota(); }, 'ordem');
      for (const doc of ['ocultas', 'mortas', 'favoritas']) sub(dok('mestreEstado', doc), (s) => { S.d[doc] = s.exists ? s.data() : {}; if (R.id) pintarRemota(); }, doc);
      sub(col('conversas'), (s) => { S.d.conversas = lista(s); }, 'conversas');
      sub(col('denuncias'), (s) => { S.d.den = lista(s); }, 'den');
    } else {
      sub(dok('conversas', S.me).collection('msgs').orderBy('ts'), (s) => { S.d.msgs = lista(s); }, 'msgs');
    }
    sub(S.db.doc(`data/users/${S.me}/visto-${g.id}`), (s) => { if (!S.visto || !s.metadata || !s.metadata.hasPendingWrites) S.visto = s.exists ? { ...s.data() } : {}; }, 'visto');
    // respostas já acertadas neste aparelho abrem sozinhas
    setTimeout(async () => { const rs = respSalvas(); for (const p of S.d.pistas) if (p.cifra && rs[p.id] && decifradas[p.id] == null) { try { decifradas[p.id] = await decifrar(p, rs[p.id]); } catch { /* resposta mudou */ } } mudou(); }, 2500);
  }
