  // ----- fichas ocultas (o mestre esconde da lista de fichas; ficam transparentes) -----
  // ficha morta: Pontos de Vida em 0 (ou menos)
  const pvZerado = (tipo, id) => { const d = ((registroDe(tipo, id) || {}).dados) || {}; const pv = parseInt(d[PV], 10); return !isNaN(pv) && pv <= 0; };
  const morta = (tipo, id) => marcada('mortas', tipo, id) || pvZerado(tipo, id);
  const favorita = (tipo, id) => marcada('favoritas', tipo, id);
  const CAVEIRA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c-4.7 0-8 3.2-8 7.6 0 2.6 1.2 4.4 2.8 5.5V19a1 1 0 0 0 1 1h1.4v1.5h1.6V20h2.4v1.5h1.6V20h1.4a1 1 0 0 0 1-1v-3.4c1.6-1.1 2.8-2.9 2.8-5.5 0-4.4-3.3-7.6-8-7.6z" fill="currentColor"/><circle cx="8.7" cy="11" r="2.1" fill="#fff"/><circle cx="15.3" cy="11" r="2.1" fill="#fff"/><path d="M12 13.6l-1.3 2.4h2.6z" fill="#fff"/></svg>';
  const caveira = (cls = 'cm-caveira') => { const e = h('span', { class: cls, title: 'Morta', 'aria-label': 'Morta' }); e.innerHTML = CAVEIRA; return e; };
  const chaveF = (tipo, id) => `${tipo}:${id}`;
  const marcada = (doc, tipo, id) => !!(S.d[doc] || {})[chaveF(tipo, id)];
  const oculta = (tipo, id) => marcada('ocultas', tipo, id);
  async function alternarMarca(doc, tipo, id) {
    const o = { ...(S.d[doc] || {}) }, k = chaveF(tipo, id);
    if (o[k]) delete o[k]; else o[k] = true;
    S.d[doc] = o; mudou();
    await salvar(() => dok('mestreEstado', doc).set(o));
  }
  const alternarOculta = (tipo, id) => alternarMarca('ocultas', tipo, id);
  // ordem dentro de um grupo: estrelinha na frente, ocultas no fim
  const pesoF = (tipo, id) => (favorita(tipo, id) ? 0 : 1) + (oculta(tipo, id) ? 2 : 0);
  const ESTRELA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" fill="FILL" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  const OLHO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  const OLHO_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="2"/></svg>';

