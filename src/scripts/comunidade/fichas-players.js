  // ===================== FICHAS DOS PLAYERS =====================
  // O player manda a ficha dele pra cada sessão em que está (sessoes/{sid}/fichas/{uid}).
  // O mestre abre a ficha de qualquer player pelas Ferramentas e mexe à vontade: a mudança chega no player na hora.
  const IMG_MAX = 600000; // retrato maior que isso não cabe no documento: fica só no aparelho
  const limparDados = (d) => { const o = { ...(d || {}) }; if (o.__img && o.__img.length > IMG_MAX) delete o.__img; return o; };
  const nv = (k, v) => (v === undefined || v === null || v === false ? '' : k === '__img' && v ? v.length + ':' + v.slice(-48) : v);
  const difere = (a, b) => { a = a || {}; b = b || {}; return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => JSON.stringify(nv(k, a[k])) !== JSON.stringify(nv(k, b[k]))); };
  const assinatura = (d) => { const o = { ...(d || {}) }; if (o.__img) o.__img = nv('__img', o.__img); return o; };
  const fichaLocal = () => limparDados(window.__fichaLocal ? window.__fichaLocal() : {});
  const fichaDe = (u) => (S.d.fichas || []).find((f) => f.id === u);

  // ----- player: manda a própria ficha e recebe o que o mestre mudou -----
  const PS = {}; // sid -> { ref, base, unsub }
  let tPush = 0;
  const BASE_KEY = (sid) => `cpr-ficha-base-${sid}-${S.me}`;
  function sessoesOk() {
    if (S.lob.papel !== 'player' || !S.me || !S.db) return [];
    const out = new Set();
    for (const [sid, it] of Object.entries(S.lob.meusPedidos || {})) {
      if (!it || it.cancelado) continue;
      const ss = S.lob.sessDe[sid];
      if (ss && acesso(ss, S.lob.meuMembro[sid], it) === 'ok') out.add(sid);
    }
    if (S.sess && !S.mestre) out.add(S.sess.id);
    return [...out];
  }
  function sincFichas() {
    const quer = new Set(sessoesOk());
    for (const sid of Object.keys(PS)) if (!quer.has(sid)) { PS[sid].unsub(); delete PS[sid]; }
    for (const sid of quer) {
      if (PS[sid]) continue;
      let base = null; try { base = JSON.parse(localStorage.getItem(BASE_KEY(sid)) || 'null'); } catch { /* ok */ }
      const st = PS[sid] = { ref: S.db.doc(`sessoes/${sid}/fichas/${S.me}`), base, unsub: () => {} };
      const us = [st.ref.onSnapshot((s) => recebeuMinha(sid, s), () => {}),
        S.db.collection(`sessoes/${sid}/alertas`).orderBy('ts', 'desc').limit(3).onSnapshot((q) => recebeuAlertas(sid, q), () => {}),
        S.db.collection(`sessoes/${sid}/ataques`).where('alvo', '==', S.me).onSnapshot((q) => recebeuAtaques(sid, q), () => {})];
      st.unsub = () => us.forEach((f) => f());
    }
  }
  function guardarBase(sid, d) {
    const st = PS[sid]; if (!st) return;
    st.base = assinatura(d);
    try { localStorage.setItem(BASE_KEY(sid), JSON.stringify(st.base)); } catch { /* cheio: fica só na memória */ }
  }
  function recebeuMinha(sid, s) {
    const st = PS[sid]; if (!st) return;
    if (!s.exists) { enviarMinha(sid, fichaLocal(), true); return; }
    const d = s.data() || {}, remoto = d.dados || {};
    if (d.por && d.por !== S.me) {
      // o mestre mexeu: vale o que mudou desde a última vez que sincronizei (sem histórico, tudo que difere)
      const mud = st.base ? difere(st.base, remoto) : difere(fichaLocal(), remoto);
      if (mud.length) aplicarNaMinha(remoto, mud);
    }
    guardarBase(sid, remoto);
    const local = fichaLocal();
    if (difere(local, remoto).length) enviarMinha(sid, local); // o que mudei aqui e o servidor ainda não tem
  }
  // o campo que a pessoa acabou de digitar não é sobrescrito (o que ela digitou vai pro servidor logo depois)
  const digitado = {};
  document.addEventListener('input', (e) => { const k = e.target && e.target.dataset && e.target.dataset.f; if (k) digitado[k] = Date.now(); }, true);
  const naoDigitando = (ks) => ks.filter((k) => !(digitado[k] > Date.now() - 2500));
  function aplicarNaMinha(remoto, chaves) {
    chaves = naoDigitando(chaves);
    if (!chaves.length || window.__fichaRemota || !window.__fichaAplicar) return;
    window.__fichaAplicar(remoto, chaves);
    if (typeof save === 'function') save();
    toast('Ficha', chaves.length === 1 ? 'O mestre mudou 1 campo da sua ficha.' : `O mestre mudou ${chaves.length} campos da sua ficha.`);
  }
  function enviarMinha(sid, dados, forca) {
    const st = PS[sid]; if (!st) return;
    if (!forca && st.base && !difere(st.base, dados).length) return;
    guardarBase(sid, dados);
    st.ref.set({ dados, ts: agora(), por: S.me, nome: dados.NOME || '' }).then(() => {
      const k = `cpr-com-ficha-enviada-${sid}`;
      let ja = null; try { ja = localStorage.getItem(k); localStorage.setItem(k, '1'); } catch { /* ok */ }
      if (!ja) toast('Ficha', 'Sua ficha agora aparece pro mestre da sessão. O que ele mudar chega aqui na hora.');
    }).catch((e) => { st.base = null; console.warn('ficha', e && e.code); if (!st.avisouErro) { st.avisouErro = true; toast('Ficha', 'Não consegui mandar sua ficha pro mestre. Confira a internet e recarregue a página.'); } });
  }
  window.__cmFichasSync = () => Object.fromEntries(Object.entries(PS).map(([k, v]) => [k, !!v.base]));
  window.__fichaSalvouLocal = () => {
    if (!Object.keys(PS).length) return;
    clearTimeout(tPush);
    tPush = setTimeout(() => { const d = fichaLocal(); for (const sid of Object.keys(PS)) enviarMinha(sid, d); }, 1200);
  };

  // ----- mestre: abre uma ficha (de player, NPC ou monstro) na própria tela da ficha -----
  // As de player ficam na sessão (o player recebe as mudanças); as de NPC e monstro são só do mestre.
  const TIPOS_FICHA = { player: 'Player', demo: 'Player demo', npc: 'NPC', monstro: 'Monstro' };
  const fichaM = (id) => (S.d.fichasM || []).find((f) => f.id === id);
  const registroDe = (tipo, id) => (tipo === 'player' ? fichaDe(id) : fichaM(id));
  const refFicha = (tipo, id) => (tipo === 'player' ? S.db.doc(`sessoes/${S.sess.id}/fichas/${id}`) : dok('fichasMestre', id));
  function tituloFicha(tipo, id) {
    const d = ((registroDe(tipo, id) || {}).dados) || {};
    if (tipo === 'player') return d.NOME ? `${d.NOME} (${nome(id)})` : nome(id);
    return d.NOME || `${TIPOS_FICHA[tipo]} sem nome`;
  }
  const R = { tipo: null, id: null, ref: null, unsub: null, base: null, pend: null, t: 0 };
