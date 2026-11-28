  // ---------- caminhos dos dados (cada sessão tem os seus) ----------
  // conteúdo do mestre: só o mestre da sessão escreve (regra mestres/{self})
  const DO_MESTRE = new Set(['conteudo', 'locais', 'npcs', 'pistas', 'missoes', 'reputacao', 'membros', 'livros', 'livrosPartes']);
  function baseDe(nomeCol) {
    if (nomeCol === 'perfis') return '';
    if (DO_MESTRE.has(nomeCol)) return `mestres/${S.sess.gm}/sessoes/${S.sess.id}/`;
    if (nomeCol === 'rascunhos' || nomeCol === 'fichasMestre' || nomeCol === 'mestreEstado') return `data/users/${S.me}/s-${S.sess.id}/`; // privado do mestre
    return `sessoes/${S.sess.id}/`; // o que os jogadores escrevem (mural, conversas, aceites…)
  }
  const col = (n) => S.db.collection(baseDe(n) + n);
  const dok = (n, id) => col(n).doc(id);
  const sessRef = (gm, sid) => S.db.doc(`mestres/${gm}/sessoes/${sid}`);
  const membroRef = (gm, sid, uid) => sessRef(gm, sid).collection('membros').doc(uid);
  function membrosSala() {
    if (!S.sess) return [];
    const ids = new Set();
    for (const [u, m] of Object.entries(S.lob.membrosSala || {})) if (m.estado === 'aprovado') ids.add(u);
    for (const [u, p] of Object.entries(S.lob.pedidosTodos)) { const it = p.itens && p.itens[S.sess.id]; if (it && !it.cancelado && acesso(S.sess, (S.lob.membrosSala || {})[u], it) === 'ok') ids.add(u); }
    ids.delete(S.sess.gm);
    return [...ids];
  }

