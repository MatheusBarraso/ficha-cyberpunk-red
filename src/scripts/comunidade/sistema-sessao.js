  // ---------- o RPG de cada sessão ----------
  // A sessão guarda o sistema em que o mestre a criou (as de antes do Sketcher são do Cyberpunk RED).
  // Entrar numa sessão de outro sistema troca o Sketcher pra ele: a entrada fica anotada (sessionStorage)
  // e continua sozinha depois de recarregar.
  const ENTRAR_KEY = 'sk-entrar';
  const sistemaDe = (s) => (s && SISTEMAS[s.sistema] ? s.sistema : 'cpr');
  const deOutroSistema = (s) => sistemaDe(s) !== SISTEMA.id;
  // etiqueta com o nome do RPG, só nas sessões que não são do RPG aberto
  const tagSistema = (s) => (deOutroSistema(s) ? h('span', { class: 'cm-tag cm-tag-sis', text: SISTEMAS[sistemaDe(s)].nome }) : null);
  function trocarPraSessao(gm, sid, s) {
    const sis = sistemaDe(s);
    try { sessionStorage.setItem(ENTRAR_KEY, JSON.stringify({ papel: gm === S.me ? 'mestre' : 'player', gm, sid, me: S.me })); } catch { /* ok */ }
    toast('Sessão', `“${(s && s.nome) || 'Sessão'}” é de ${SISTEMAS[sis].nome}: abrindo o ${SISTEMAS[sis].nome}…`);
    setTimeout(() => trocarSistema(sis), 400);
  }
  // já no sistema da sessão (depois de recarregar): entra nela
  async function retomarEntrada() {
    let p = null;
    try { p = JSON.parse(sessionStorage.getItem(ENTRAR_KEY) || 'null'); sessionStorage.removeItem(ENTRAR_KEY); } catch { /* ok */ }
    if (!p || p.me !== S.me || !p.gm || !p.sid) return;
    if (p.papel === 'mestre') await conferirAcessoMestre();
    entrarComo(p.papel, p.gm, p.sid, null);
  }
