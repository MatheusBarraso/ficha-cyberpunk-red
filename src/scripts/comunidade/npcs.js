  // ---------- NPCs e conversas ----------
  function relDe(uid, npc) { const r = S.d.rep[uid]; return (r && r.npcs && r.npcs[npc]) || 0; }
  function barraRel(v) {
    const nomeR = (REL.find((x) => x[0] === v) || [0, 'Neutro'])[1];
    return h('div', { class: 'cm-rel' }, 'Relação:', h('span', { class: 'cm-relbar', 'aria-hidden': 'true' }, [-3, -2, -1, 0, 1, 2, 3].map((k) => h('i', { class: (v >= 0 ? (k >= 0 && k <= v) : (k <= 0 && k >= v)) ? 'on' : '' }))), h('span', { text: nomeR }));
  }
  SECOES.npcs = {
    montar(w) {
      const top = h('div', { class: 'cm-h' }, h('h2', { text: 'NPCs' }));
      if (S.mestre) top.append(btn('＋ Novo NPC', () => formNpc(), 'cm-mini'), S.ui.caixa = btn('Conversas', () => { S.npcAberto = null; S.chatNpc = null; S.ui.modoCaixa = !S.ui.modoCaixa; if (!S.ui.modoCaixa) fecharThread(); atualizar(); }, 'cm-mini'));
      w.append(top);
      S.ui.area = h('div', { style: 'display:flex;flex-direction:column;gap:10px', 'data-vivo': '' });
      w.append(S.ui.area);
    },
    atualizar() {
      const a = S.ui.area;
      if (S.ui.caixa) { const n = S.d.conversas.filter((c) => c.ultimoDe === 'jogador').length; S.ui.caixa.textContent = `Conversas${n ? ` (${n})` : ''}`; }
      if (S.mestre && (S.ui.modoCaixa || S.threadDe)) { rc(a, ...(S.threadDe ? viewThread() : caixaEntrada())); rolarChat(); return; }
      if (S.chatNpc && npcDe(S.chatNpc)) { rc(a, ...viewChat(npcDe(S.chatNpc))); rolarChat(); return; }
      if (S.npcAberto && npcDe(S.npcAberto)) { rc(a, viewNpc(npcDe(S.npcAberto))); return; }
      const vis = S.d.npcs.filter((n) => S.mestre || !n.oculto);
      if (!vis.length) { rc(a, h('div', { class: 'cm-vazio', text: S.mestre ? 'Nenhum NPC. Os jogadores conversam com eles e você responde.' : 'Nenhum NPC ainda.' })); return; }
      rc(a, h('div', { class: 'cm-fichas' }, vis.map((n) => {
        const naoLidas = S.mestre ? 0 : S.d.msgs.filter((m) => m.npc === n.id && m.de === 'npc' && m.ts > ((S.visto && S.visto.npcs) || 0)).length;
        return h('button', { type: 'button', class: 'cm-ficha' + (n.oculto ? ' cm-oculto' : ''), onclick: () => { S.npcAberto = n.id; atualizar(); corpo.scrollTop = 0; } },
          avatar(n.nome, n.img, 'cm-retrato'), naoLidas ? h('span', { class: 'cm-n cm-n-canto', text: naoLidas }) : null,
          h('span', { class: 'cm-ficha-nome', text: n.nome }),
          h('span', { class: 'cm-ficha-sub', text: [n.papel, n.local && localDe(n.local) ? localDe(n.local).nome : null, n.oculto ? 'oculto' : null].filter(Boolean).join(' · ') }));
      })));
    },
  };
  function viewNpc(n) {
    const box = h('div', { class: 'cm-card' },
      btn('← NPCs', () => { S.npcAberto = null; atualizar(); }, 'cm-mini cm-voltar'),
      h('div', { class: 'cm-row', style: 'align-items:flex-start;gap:14px' }, S.mestre ? fotoNpc(n) : avatar(n.nome, n.img, 'cm-npc-big'),
        h('div', { style: 'display:flex;flex-direction:column;gap:6px;flex:1 1 220px;min-width:0' },
          h('div', { class: 'cm-nome', style: 'font-size:24px;letter-spacing:1px', text: n.nome }),
          n.papel ? h('span', { class: 'cm-tag cm-red', style: 'align-self:flex-start', text: n.papel }) : null,
          n.local && localDe(n.local) ? h('div', { class: 'cm-sub', text: localDe(n.local).nome }) : null,
          !S.mestre && S.me ? barraRel(relDe(S.me, n.id)) : null,
          n.personalidade ? h('div', null, h('b', { text: 'Personalidade: ' }), h('span', { class: 'cm-txt', text: n.personalidade })) : null)),
      n.bio ? h('div', { class: 'cm-txt', text: n.bio }) : null);
    const ac = h('div', { class: 'cm-row' });
    if (!S.mestre && S.me) ac.append(btn('Conversar', () => { S.chatNpc = n.id; atualizar(); }, 'cm-pri'));
    if (S.mestre) ac.append(btn('Editar', () => formNpc(n), 'cm-mini'), btn(n.oculto ? 'Mostrar aos jogadores' : 'Ocultar dos jogadores', () => salvar(() => dok('npcs', n.id).update({ oculto: !n.oculto, ts: agora() })), 'cm-mini'),
      btn('Apagar', async () => { if (await confirmar(`Apagar ${n.nome}?`, 'Apagar')) { S.npcAberto = null; await salvar(() => dok('npcs', n.id).delete()); } }, 'cm-mini cm-perigo'));
    box.append(ac);
    return box;
  }
  // mestre: toca no retrato pra enviar ou trocar a foto do NPC
  function fotoNpc(n) {
    const inp = h('input', { type: 'file', accept: 'image/*', hidden: true });
    const st = h('span', { class: 'cm-foto-txt', text: n.img ? 'Trocar foto' : 'Enviar foto' });
    const b = h('button', { type: 'button', class: 'cm-foto', title: 'Enviar ou trocar a foto', onclick: () => inp.click() }, avatar(n.nome, n.img, 'cm-npc-big'), st);
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0]; inp.value = ''; if (!f) return;
      st.textContent = 'Enviando…'; b.disabled = true;
      const ok = await salvar(async () => { const id = await enviarImagem(f, 900); await dok('npcs', n.id).update({ img: id, ts: agora() }); });
      b.disabled = false; st.textContent = ok ? 'Trocar foto' : (n.img ? 'Trocar foto' : 'Enviar foto');
    });
    return h('div', { class: 'cm-foto-box' }, b, inp);
  }
  function formNpc(n) {
    n = n || {};
    const campos = {
      nome: h('input', { class: 'cm-in', value: n.nome || '', maxlength: 60 }),
      papel: h('input', { class: 'cm-in', value: n.papel || '', maxlength: 60, placeholder: 'Comerciante, informante, jornalista…' }),
      personalidade: h('input', { class: 'cm-in', value: n.personalidade || '', maxlength: 200, placeholder: 'Desconfiado, fala rápido, adora gírias…' }),
    };
    const bio = h('textarea', { class: 'cm-ta', maxlength: 3000, placeholder: 'Biografia, o que sabe da cidade, segredos…' }); bio.value = n.bio || '';
    const local = h('select', { class: 'cm-sel' }, h('option', { value: '', text: 'Sem local' }), S.d.locais.map((l) => h('option', { value: l.id, text: l.nome })));
    local.value = n.local || '';
    const oculto = h('input', { type: 'checkbox' }); oculto.checked = !!n.oculto;
    const img = campoImagem(n.img, 'Foto do NPC');
    const lbl = (t, e) => h('label', { class: 'cm-lbl' }, t, e);
    
    const c = h('div', { style: 'display:flex;flex-direction:column;gap:10px;color:var(--ink)' }, lbl('Nome', campos.nome), lbl('Papel', campos.papel), lbl('Personalidade', campos.personalidade), lbl('Biografia', bio), lbl('Onde encontrar', local), img.el,
      h('label', { class: 'cm-row', style: 'font-weight:700' }, oculto, 'Ocultar dos jogadores por enquanto'));
    const j = janela(n.id ? 'Editar NPC' : 'Novo NPC', c);
    c.append(btn('Salvar', async () => {
      const nm = campos.nome.value.trim(); if (!nm) { campos.nome.focus(); return; }
      const dados = { nome: nm, papel: campos.papel.value.trim(), personalidade: campos.personalidade.value.trim(), bio: bio.value.trim(), local: local.value || null, img: img.valor(), oculto: oculto.checked, autor: S.me, ts: agora() };
      if (await salvar(() => (n.id ? dok('npcs', n.id).set(dados) : col('npcs').add(dados)))) j.fechar();
    }, 'cm-pri'));
    campos.nome.focus();
  }
  function bolha(m, eu, rotulo) {
    return h('div', { class: 'cm-msg' + (eu ? ' eu' : '') }, h('div', { class: 'cm-meta' }, rotulo, quando(m.ts)), h('div', { class: 'cm-txt', text: m.texto }));
  }
  function rolarChat() { const c = wrap && wrap.querySelector('.cm-chat'); if (c) c.scrollTop = c.scrollHeight; }
  function viewChat(n) {
    const msgs = S.d.msgs.filter((m) => m.npc === n.id).sort((a, b) => a.ts - b.ts);
    const chat = h('div', { class: 'cm-chat', 'aria-live': 'polite' }, msgs.length ? msgs.map((m) => bolha(m, m.de === 'jogador', m.de === 'jogador' ? 'Você' : h('b', { text: n.nome })))
      : h('div', { class: 'cm-vazio', text: 'Nenhuma mensagem ainda.' }));
    const out = [h('div', { class: 'cm-card' }, h('div', { class: 'cm-row' }, btn('← Voltar', () => { S.chatNpc = null; atualizar(); }, 'cm-mini'), avatar(n.nome, n.img), h('div', { class: 'cm-nome', text: n.nome }), h('span', { style: 'flex:1' }), barraRel(relDe(S.me, n.id))), chat)];
    if (S.escreve) {
      const ta = h('textarea', { class: 'cm-ta', style: 'min-height:60px', placeholder: `Mensagem para ${n.nome}…`, maxlength: 1500, 'aria-label': 'Mensagem' });
      ta.value = S.rascCom['npc' + n.id] || '';
      ta.addEventListener('input', () => { S.rascCom['npc' + n.id] = ta.value; });
      const env = btn('Enviar', async () => {
        const t = ta.value.trim(); if (!t) return;
        env.disabled = true;
        const ok = await salvar(async () => {
          const ts = agora();
          await dok('conversas', S.me).collection('msgs').add({ npc: n.id, de: 'jogador', autor: S.me, texto: t, ts });
          await dok('conversas', S.me).set({ ultimoTs: ts, ultimoTexto: corte(t, 140), ultimoNpc: n.id, ultimoDe: 'jogador' });
        });
        env.disabled = false;
        if (ok) { ta.value = ''; S.rascCom['npc' + n.id] = ''; }
      }, 'cm-pri');
      ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) env.click(); });
      out[0].append(ta, h('div', { class: 'cm-row', style: 'justify-content:flex-end' }, env));
    }
    return out;
  }
  function caixaEntrada() {
    const lst = [...S.d.conversas].sort((a, b) => (b.ultimoTs || 0) - (a.ultimoTs || 0));
    const out = [h('div', { class: 'cm-row' }, btn('← NPCs', () => { S.ui.modoCaixa = false; atualizar(); }, 'cm-mini'))];
    if (!lst.length) { out.push(h('div', { class: 'cm-vazio', text: 'Nenhuma conversa ainda.' })); return out; }
    out.push(h('div', { class: 'cm-lista' }, lst.map((c) => h('button', { type: 'button', class: 'cm-linha' + (c.ultimoDe === 'jogador' ? '' : ' cm-velho'), onclick: () => abrirThread(c.id) },
      h('span', { class: 'cm-rot', text: c.ultimoDe === 'jogador' ? 'Responder' : 'Respondida' }),
      h('span', { class: 'cm-linha-txt' }, h('b', null, spanNome(c.id), ` → ${npcNome(c.ultimoNpc)}`), h('small', { text: c.ultimoTexto || '' })),
      h('span', { class: 'cm-quando', text: quando(c.ultimoTs) })))));
    return out;
  }
  function abrirThread(uid) {
    fecharThread();
    S.threadDe = uid; S.d.thread = [];
    S.subThread = dok('conversas', uid).collection('msgs').orderBy('ts').onSnapshot((s) => { S.d.thread = s.docs.map((d) => ({ id: d.id, ...d.data() })); if (S.sec === 'npcs') atualizar(); }, () => {});
  }
  function fecharThread() { if (S.subThread) { S.subThread(); S.subThread = null; } S.threadDe = null; S.d.thread = []; }
  function viewThread() {
    const uid = S.threadDe, conv = S.d.conversas.find((c) => c.id === uid) || {};
    const chat = h('div', { class: 'cm-chat' }, S.d.thread.map((m) => bolha(m, m.de === 'npc', m.de === 'npc' ? h('b', { text: `${npcNome(m.npc)} (você)` }) : h('span', null, spanNome(uid), ` → ${npcNome(m.npc)}`))));
    const npcSel = h('select', { class: 'cm-sel', style: 'width:auto', 'aria-label': 'Responder como' }, S.d.npcs.map((n) => h('option', { value: n.id, text: `Responder como ${n.nome}` })));
    npcSel.value = conv.ultimoNpc || (S.d.npcs[0] && S.d.npcs[0].id) || '';
    const relBox = h('div', { class: 'cm-row' });
    const pintaRel = () => { const v = relDe(uid, npcSel.value); rc(relBox, barraRel(v), btn('−', () => mudaRel(uid, npcSel.value, v - 1), 'cm-mini'), btn('+', () => mudaRel(uid, npcSel.value, v + 1), 'cm-mini')); };
    npcSel.addEventListener('change', pintaRel); pintaRel();
    const ta = h('textarea', { class: 'cm-ta', style: 'min-height:60px', placeholder: 'Resposta do NPC…', maxlength: 1500 });
    ta.value = S.rascCom['th' + uid] || ''; ta.addEventListener('input', () => { S.rascCom['th' + uid] = ta.value; });
    const env = btn('Responder', async () => {
      const t = ta.value.trim(); if (!t || !npcSel.value) return;
      env.disabled = true;
      const ok = await salvar(async () => {
        const ts = agora();
        await dok('conversas', uid).collection('msgs').add({ npc: npcSel.value, de: 'npc', autor: S.me, texto: t, ts });
        const { id: _i, ...convSemId } = conv;
        await dok('conversas', uid).set({ ...convSemId, ultimoTs: ts, ultimoTexto: corte(t, 140), ultimoNpc: npcSel.value, ultimoDe: 'npc' });
      });
      env.disabled = false;
      if (ok) { ta.value = ''; S.rascCom['th' + uid] = ''; }
    }, 'cm-pri');
    return [h('div', { class: 'cm-card' }, h('div', { class: 'cm-row' }, btn('← Conversas', () => { fecharThread(); S.ui.modoCaixa = true; atualizar(); }, 'cm-mini'), h('span', null, 'Conversa com ', spanNome(uid))), chat, npcSel, relBox, ta, h('div', { class: 'cm-row', style: 'justify-content:flex-end' }, env))];
  }
  async function mudaRel(uid, npc, v) {
    v = Math.max(-3, Math.min(3, v));
    const r = S.d.rep[uid] || {};
    await salvar(() => dok('reputacao', uid).set({ ...r, npcs: { ...(r.npcs || {}), [npc]: v }, hist: [{ txt: `Relação com ${npcNome(npc)}: ${(REL.find((x) => x[0] === v) || [0, ''])[1]}`, pts: 0, ts: agora() }, ...(r.hist || [])].slice(0, 40), autor: S.me, ts: agora() }));
  }

