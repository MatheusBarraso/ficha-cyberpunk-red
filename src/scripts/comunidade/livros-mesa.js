  // ---------- livros da mesa: o mestre envia o PDF pra sessão; só quem está nela consegue baixar ----------
  const PARTE = 600000; // bytes por pedaço (cada documento do banco aceita até 1 MB)
  const paraB64 = (u8) => { let t = ''; for (let i = 0; i < u8.length; i += 0x8000) t += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(t); };
  function avisarLivros() {
    if (!FB) return;
    window.__cmLivrosLista = S.sess ? (S.d.livrosMesa || []).map((l) => ({ ...l, gm: S.sess.gm, sid: S.sess.id })) : (window.__cmLivrosLista || []);
    dispatchEvent(new Event('livros-mesa'));
  }
  if (FB) window.__cmLivros = {
    sala: () => (S.sess ? { gm: S.sess.gm, sid: S.sess.id, mestre: S.mestre, nome: S.sess.nome || 'Sessão' } : null),
    papel: () => S.lob.papel,
    async enviar(meta, bytes, prog) {
      if (!S.sess || !S.mestre) throw { code: 'invalid_argument' };
      const u8 = new Uint8Array(bytes), n = Math.ceil(u8.length / PARTE);
      for (let i = 0; i < n; i++) {
        await dok('livrosPartes', `${meta.id}~${i}`).set({ livro: meta.id, i, d: paraB64(u8.subarray(i * PARTE, (i + 1) * PARTE)) });
        if (prog) prog((i + 1) / n);
      }
      await dok('livros', meta.id).set({ nome: meta.nome, paginas: meta.paginas, dim: meta.dim, partes: n, tamanho: u8.length, autor: S.me, ts: agora() });
    },
    async baixar(m, prog) {
      const base = `mestres/${m.gm}/sessoes/${m.sid}/livrosPartes/`;
      const out = new Uint8Array(m.tamanho);
      let pos = 0;
      for (let i = 0; i < m.partes; i++) {
        const s = await S.db.doc(base + `${m.id}~${i}`).get();
        if (!s.exists) throw new Error('parte faltando');
        const u = deB64(s.data().d); out.set(u, pos); pos += u.length;
        if (prog) prog((i + 1) / m.partes);
      }
      return out.buffer;
    },
    async tirar(id) {
      if (!S.sess || !S.mestre) throw { code: 'invalid_argument' };
      const l = (S.d.livrosMesa || []).find((x) => x.id === id);
      await dok('livros', id).delete();
      for (let i = 0; i < ((l && l.partes) || 0); i++) await dok('livrosPartes', `${id}~${i}`).delete();
    },
  };
  const SALA_KEY = 'cpr-com-sala', PAPEL_KEY = 'cpr-com-papel', ULTIMA_KEY = 'cpr-com-ultima';
  function entrarSala(gm, sid, dados) {
    if (dados && deOutroSistema(dados)) { trocarPraSessao(gm, sid, dados); return; }
    if (S.sess && S.sess.id === sid && S.sess.gm === gm) { S.verLobby = false; abrir(); return; }
    if (S.sess) sairSala();
    limparSala();
    S.sess = { ...(dados || {}), id: sid, gm };
    S.mestre = gm === S.me;
    try { localStorage.setItem(SALA_KEY, JSON.stringify({ gm, sid })); localStorage.setItem(ULTIMA_KEY, JSON.stringify({ gm, sid, nome: (dados && dados.nome) || '', papel: gm === S.me ? 'mestre' : 'player', me: S.me, sistema: SISTEMA.id })); } catch { /* ok */ }
    if (!S.assets) claude.use('assets').then((a) => { S.assets = a; }).catch(() => {});
    assinarSala();
    // a sala abre em Perfis: a primeira coisa é a pessoa ver e acertar o próprio perfil (apelido, foto, personagem)
    S.sec = 'perfil';
    abrir('perfil');
  }
  function sairSala() {
    S.verLobby = false;
    sairRemota(true); alternarFerr(false);
    limparSala();
    S.sess = null; S.mestre = false;
    avisarLivros();
    try { localStorage.removeItem(SALA_KEY); } catch { /* ok */ }
  }
  // lista de sessões: dá pra olhar sem sair da sessão atual (ela continua ligada por baixo)
  function irLobby() { S.verLobby = !!S.sess; S.aberto = true; painel.hidden = false; document.body.classList.add('comu-on'); liberarFicha(); if (typeof openMenu === 'function') openMenu(false); pintarTopo(); montar(); marcarMenu(); corpo.scrollTop = 0; }
  function sairDaSala() { sairSala(); irLobby(); }
  function expulsar(msg) {
    if (!S.sess) return;
    sairSala(); if (msg) toast('Sessão', msg);
    if (S.aberto) montar();
  }

