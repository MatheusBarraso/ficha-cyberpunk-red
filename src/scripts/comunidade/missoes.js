  // ---------- MISSÕES ----------
  SECOES.missoes = {
    montar(w) {
      const top = h('div', { class: 'cm-h' }, h('h2', { text: 'Missões' }));
      if (S.mestre) top.append(btn('＋ Nova missão', () => formMissao(), 'cm-mini'));
      w.append(top);
      S.ui.filtro = h('div', { class: 'cm-row' });
      S.ui.area = h('div', { class: 'cm-docs' });
      w.append(S.ui.filtro, S.ui.area);
    },
    atualizar() {
      rc(S.ui.filtro, ...[['abertas', 'Abertas'], ['concluidas', 'Concluídas']].map(([k, t]) => btn(t, () => { S.missoesVer = k; atualizar(); }, 'cm-mini cm-aba' + (S.missoesVer === k ? ' on' : ''))));
      const lst = S.d.missoes.filter((m) => (S.missoesVer === 'abertas') === (m.status !== 'concluida'));
      if (!lst.length) { rc(S.ui.area, h('div', { class: 'cm-vazio', text: S.missoesVer === 'abertas' ? 'Nenhuma missão aberta.' : 'Nenhuma missão concluída.' })); return; }
      rc(S.ui.area, ...lst.map(cartaoMissao));
    },
  };
  function cartaoMissao(m) {
    const ac = S.d.aceites.filter((a) => a.missao === m.id);
    const meu = ac.find((a) => a.autor === S.me);
    const venceu = m.prazo && Date.parse(m.prazo + 'T23:59:59') < agora();
    const prazo = m.prazo ? `${venceu ? 'encerrou' : 'até'} ${new Date(m.prazo + 'T12:00:00').toLocaleDateString('pt-BR')}` : '';
    const card = h('article', { class: 'cm-doc' + (m.status === 'concluida' ? ' cm-feita' : '') },
      h('div', { class: 'cm-doc-hd' }, h('span', { text: `${TIPOS_MISSAO[m.tipo] || 'Missão'}${m.status === 'concluida' ? ' · concluída' : ''}` }), h('span', { class: venceu ? 'cm-venceu' : '', text: prazo })),
      h('div', { class: 'cm-doc-tit', text: m.titulo }),
      (m.local && localDe(m.local)) || (m.npc && npcDe(m.npc) && !npcDe(m.npc).oculto) ? h('div', { class: 'cm-meta' }, m.local && localDe(m.local) ? localDe(m.local).nome : null, m.npc && npcDe(m.npc) && !npcDe(m.npc).oculto ? `NPC: ${npcNome(m.npc)}` : null) : null,
      m.desc ? h('div', { class: 'cm-txt', text: m.desc }) : null,
      h('div', { class: 'cm-campos' }, h('div', { class: 'cm-campo' }, h('small', { text: 'Reputação' }), h('b', { text: `+${m.pontos || 0}` })), m.premio ? h('div', { class: 'cm-campo cm-largo' }, h('small', { text: 'Prêmio' }), h('b', { text: m.premio })) : null));
    if (m.tipo === 'comunidade' && m.meta) {
      const pct = Math.min(100, Math.round(ac.length / m.meta * 100));
      card.append(h('div', { class: 'cm-meta' }, `Participantes ${ac.length}/${m.meta}`), h('div', { class: 'cm-prog', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: `width:${pct}%` })));
    }
    if (ac.length) card.append(h('div', { class: 'cm-meta' }, 'Na missão', ac.map((a) => h('span', null, spanNome(a.autor), a.estado === 'entregue' ? ' ✔' : ''))));
    const row = h('div', { class: 'cm-row' });
    if (!S.mestre && S.me && S.escreve && m.status !== 'concluida' && !venceu) {
      if (!meu) row.append(btn('Aceitar missão', () => salvar(() => dok('aceites', `${m.id}_${S.me}`).set({ missao: m.id, autor: S.me, estado: 'aceita', ts: agora() })), 'cm-pri'));
      else {
        if (meu.estado !== 'entregue') row.append(btn('Marcar como feita', () => salvar(() => dok('aceites', `${m.id}_${S.me}`).set({ missao: m.id, autor: S.me, estado: 'entregue', ts: agora() })), 'cm-pri'));
        row.append(btn('Desistir', async () => { if (await confirmar('Desistir desta missão?', 'Desistir')) salvar(() => dok('aceites', `${m.id}_${S.me}`).delete()); }, 'cm-mini cm-perigo'));
      }
    }
    if (S.mestre) {
      row.append(btn('Editar', () => formMissao(m), 'cm-mini'));
      if (m.status !== 'concluida') row.append(btn('Concluir e recompensar', () => concluir(m, ac), 'cm-mini cm-pri'));
      else row.append(btn('Reabrir', () => salvar(() => dok('missoes', m.id).update({ status: 'aberta', ts: agora() })), 'cm-mini'));
      row.append(btn('Apagar', () => apagar(dok('missoes', m.id), `Apagar a missão “${m.titulo}”?`), 'cm-mini cm-perigo'));
    }
    card.append(row);
    return card;
  }
  function formMissao(m) {
    m = m || {};
    const tit = h('input', { class: 'cm-in', value: m.titulo || '', maxlength: 80 });
    const tipo = h('select', { class: 'cm-sel' }, Object.entries(TIPOS_MISSAO).map(([k, v]) => h('option', { value: k, text: v }))); tipo.value = m.tipo || 'individual';
    const desc = h('textarea', { class: 'cm-ta', maxlength: 3000 }); desc.value = m.desc || '';
    const pts = h('input', { class: 'cm-in', type: 'number', min: 0, max: 100, value: m.pontos != null ? m.pontos : 5 });
    const premio = h('input', { class: 'cm-in', value: m.premio || '', maxlength: 120, placeholder: 'Eddies, item, contato… (opcional)' });
    const meta = h('input', { class: 'cm-in', type: 'number', min: 0, max: 50, value: m.meta || '', placeholder: 'Quantas pessoas pra completar (comunitária)' });
    const prazo = h('input', { class: 'cm-in', type: 'date', value: m.prazo || '' });
    const local = h('select', { class: 'cm-sel' }, h('option', { value: '', text: 'Sem local' }), S.d.locais.map((l) => h('option', { value: l.id, text: l.nome }))); local.value = m.local || '';
    const npc = h('select', { class: 'cm-sel' }, h('option', { value: '', text: 'Sem NPC' }), S.d.npcs.map((n) => h('option', { value: n.id, text: n.nome }))); npc.value = m.npc || '';
    const lbl = (t, e) => h('label', { class: 'cm-lbl' }, t, e);
    const c = h('div', { style: 'display:flex;flex-direction:column;gap:10px;color:var(--ink)' }, lbl('Título', tit), lbl('Tipo', tipo), lbl('Descrição', desc), lbl('Reputação ao concluir', pts), lbl('Prêmio extra', premio), lbl('Meta de participantes', meta), lbl('Prazo (eventos)', prazo), lbl('Lugar', local), lbl('NPC que deu a missão', npc));
    const j = janela(m.id ? 'Editar missão' : 'Nova missão', c);
    c.append(btn('Salvar', async () => {
      const t = tit.value.trim(); if (!t) { tit.focus(); return; }
      const d = { titulo: t, tipo: tipo.value, desc: desc.value.trim(), pontos: Math.max(0, Math.min(100, +pts.value || 0)), premio: premio.value.trim(), meta: +meta.value || null, prazo: prazo.value || null, local: local.value || null, npc: npc.value || null, status: m.status || 'aberta', autor: S.me, ts: agora() };
      if (await salvar(() => (m.id ? dok('missoes', m.id).set(d) : col('missoes').add(d)))) j.fechar();
    }, 'cm-pri'));
    tit.focus();
  }
  function concluir(m, ac) {
    const marcados = new Set(ac.map((a) => a.autor));
    const pessoas = [...new Set([...ac.map((a) => a.autor), ...membrosSala()])];
    const pts = h('input', { class: 'cm-in', type: 'number', min: 0, max: 100, value: m.pontos || 0 });
    const lista = h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, pessoas.length ? pessoas.map((u) => { const c = h('input', { type: 'checkbox' }); c.checked = marcados.has(u); c.addEventListener('change', () => { c.checked ? marcados.add(u) : marcados.delete(u); }); return h('label', { class: 'cm-row', style: 'gap:6px;font-weight:700' }, c, spanNome(u)); }) : h('div', { class: 'cm-sub', text: 'Ninguém aceitou ou tem perfil ainda.' }));
    const c = h('div', { style: 'display:flex;flex-direction:column;gap:10px;color:var(--ink)' }, h('div', { text: 'Quem recebe a recompensa?' }), lista, h('label', { class: 'cm-lbl' }, 'Reputação pra cada um', pts));
    const j = janela('Concluir missão', c);
    resolverNomesEm(c);
    c.append(btn('Concluir', async () => {
      const p = Math.max(0, Math.min(100, +pts.value || 0));
      for (const u of marcados) await darRep(u, p, `Missão: ${m.titulo}`);
      if (await salvar(() => dok('missoes', m.id).update({ status: 'concluida', ts: agora() }))) j.fechar();
    }, 'cm-pri'));
  }
  async function resolverNomesEm(raiz) {
    if (!S.user || !S.user.profiles) return;
    const ids = [...raiz.querySelectorAll('[data-uid]')].map((e) => e.dataset.uid).filter((id) => id && !(id in S.nomes));
    if (ids.length) { try { const ps = await S.user.profiles(ids); ids.forEach((id) => { S.nomes[id] = (ps && ps[id] && ps[id].name) || ''; }); } catch { /* ok */ } }
    raiz.querySelectorAll('[data-uid]').forEach((e) => { e.textContent = nome(e.dataset.uid); });
  }
  async function darRep(uid, pts, motivo, conquista) {
    const r = S.d.rep[uid] || {};
    const novo = { ...r, pontos: Math.max(0, (r.pontos || 0) + pts), hist: [{ txt: motivo, pts, ts: agora() }, ...(r.hist || [])].slice(0, 40), autor: S.me, ts: agora() };
    if (conquista) novo.conquistas = [...(r.conquistas || []), conquista];
    return salvar(() => dok('reputacao', uid).set(novo));
  }

