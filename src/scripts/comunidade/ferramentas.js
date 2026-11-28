  // ----- menu que desce da aba Ferramentas -----
  const ferrPainel = h('div', { class: 'cm-ferr-painel', hidden: true, role: 'dialog', 'aria-label': 'Ferramentas do mestre', onclick: (e) => e.stopPropagation() });
  function alternarFerr(abre) {
    const vai = abre === undefined ? ferrPainel.hidden : abre;
    ferrPainel.hidden = !vai;
    const t = tabs.querySelector('[data-sec="ferramentas"]'); if (t) t.setAttribute('aria-expanded', String(vai));
    if (vai) { alternarSino(false); pintarFerr(); }
  }
  // o menu que desce tem só duas saídas: o menu de fichas e o menu de combate
  function irFerr(ver) { alternarFerr(false); S.ferrVer = ver; if (S.aberto && S.sec === 'ferramentas') montar(); else abrir('ferramentas'); }
  function pintarFerr() {
    if (ferrPainel.hidden) return;
    const t = tabs.querySelector('[data-sec="ferramentas"]');
    if (t) ferrPainel.style.left = Math.max(8, Math.min(t.offsetLeft - tabs.scrollLeft + 14, window.innerWidth - 300)) + 'px';
    const cont = (S.d.ataques || []).filter((a) => a.estado === 'contestado').length;
    const o = ordem(), v = o && o.lista[o.vez];
    const op = (ver, tit, sub, extra) => h('button', { type: 'button', class: 'cm-fm-op' + (S.ferrVer === ver && S.sec === 'ferramentas' ? ' on' : ''), onclick: () => irFerr(ver) },
      h('span', { class: 'cm-fm-op-txt' }, h('b', { text: tit }), h('small', { text: sub })), extra || null, h('span', { class: 'cm-fm-op-ir', text: '›' }));
    rc(ferrPainel,
      op('fichas', 'Fichas', `${membrosSala().length} players · ${(S.d.fichasM || []).filter((f) => f.tipo === 'npc').length} NPCs · ${(S.d.fichasM || []).filter((f) => f.tipo === 'monstro').length} monstros`),
      op('combate', 'Combate', v ? `Rodada ${o.rodada || 1} · vez de ${tituloFicha(v.tipo, v.id)}` : 'Ordem de jogada, ataques e alertas', cont ? h('b', { class: 'cm-n', text: cont }) : null));
  }
  document.addEventListener('click', () => { if (!ferrPainel.hidden) alternarFerr(false); });
  aoEsc(55, () => { if (ferrPainel.hidden) return false; alternarFerr(false); return true; });

