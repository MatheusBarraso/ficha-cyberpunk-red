  // ---------- MURAL ----------
  SECOES.mural = {
    montar(w) {
      const top = h('div', { class: 'cm-h' }, h('h2', { text: 'Mural' }));
      if (S.mestre) top.append(S.ui.denBtn = btn('Denúncias', () => { S.verDen = !S.verDen; atualizar(); }, 'cm-mini'));
      w.append(top);
      if (S.me && S.escreve) {
        const ta = h('textarea', { class: 'cm-ta', placeholder: 'Escreva no mural…', maxlength: 2000, 'aria-label': 'Nova publicação' });
        const como = h('select', { class: 'cm-sel', 'aria-label': 'Postar como', style: 'width:auto' }, h('option', { value: '', text: S.mestre ? 'Como mestre' : 'Como eu' }), S.mestre ? S.d.npcs.map((n) => h('option', { value: n.id, text: `Como ${n.nome}` })) : []);
        const onde = h('select', { class: 'cm-sel', 'aria-label': 'Local', style: 'width:auto' }, h('option', { value: '', text: 'Sem local' }), S.d.locais.map((l) => h('option', { value: l.id, text: l.nome })));
        const postar = btn('Postar', async () => {
          const t = ta.value.trim(); if (!t) { ta.focus(); return; }
          postar.disabled = true;
          const ok = await salvar(() => col('mural').add({ autor: S.me, mestre: S.mestre || null, npc: como.value || null, local: onde.value || null, texto: t, ts: agora(), reacoes: {} }));
          postar.disabled = false;
          if (ok) ta.value = '';
        }, 'cm-pri');
        w.append(h('div', { class: 'cm-caixa cm-postar', 'data-vivo': '' }, ta, h('div', { class: 'cm-row' }, como.options.length > 1 ? como : null, S.d.locais.length ? onde : null, h('span', { style: 'flex:1' }), postar)));
      }
      S.ui.lista = h('div', { class: 'cm-lista cm-feed', 'data-vivo': '' });
      w.append(S.ui.lista);
    },
    atualizar() {
      if (S.ui.denBtn) { const n = S.d.den.reduce((a, d) => a + (d.itens || []).length, 0); S.ui.denBtn.textContent = n ? `Denúncias (${n})` : 'Denúncias'; }
      if (S.verDen && S.mestre) { rc(S.ui.lista, ...listaDenuncias()); return; }
      if (!S.d.mural.length) { rc(S.ui.lista, h('div', { class: 'cm-vazio', text: 'Nada no mural ainda.' })); return; }
      rc(S.ui.lista, ...S.d.mural.map(cartaoPost));
    },
  };
  function cartaoPost(p) {
    const npc = p.npc && npcDe(p.npc);
    const quem = npc ? h('span', { class: 'cm-nome', text: npc.nome }) : spanNome(p.autor);
    const head = h('div', { class: 'cm-npc cm-ph' }, npc ? avatar(npc.nome, npc.img) : avatar(nome(p.autor)),
      h('div', { style: 'display:flex;flex-direction:column;gap:3px;min-width:0' }, h('div', { class: 'cm-row', style: 'gap:6px' }, quem, npc ? h('span', { class: 'cm-tag cm-red', text: 'NPC' }) : null, !npc && p.mestre ? h('span', { class: 'cm-tag cm-red', text: 'Mestre' }) : null),
        h('div', { class: 'cm-meta' }, quando(p.ts), p.local && localDe(p.local) ? h('span', { text: localDe(p.local).nome }) : null)));
    const reac = p.reacoes || {};
    const reagir = (e) => { const on = S.me && reac[S.me] === e; S.ui.reagindo = null; salvar(() => dok('mural', p.id).update({ reacoes: { [S.me]: on ? null : e } })); };
    const usadas = REACOES.map((e) => [e, Object.values(reac).filter((x) => x === e).length]).filter(([, n]) => n);
    const pode = S.me && S.escreve;
    const reacoes = h('div', { class: 'cm-reacoes' },
      usadas.map(([e, n]) => { const on = S.me && reac[S.me] === e; return h('button', { type: 'button', class: 'cm-reac' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', 'aria-label': `${e} ${n}`, disabled: !pode, onclick: () => reagir(e) }, `${e} ${n}`); }),
      pode && S.ui.reagindo === p.id ? REACOES.filter((e) => !usadas.some(([u]) => u === e)).map((e) => h('button', { type: 'button', class: 'cm-reac', 'aria-label': `Reagir com ${e}`, onclick: () => reagir(e) }, e)) : null);
    const coms = S.d.coment.filter((c) => c.post === p.id).sort((a, b) => a.ts - b.ts);
    const aberto = S.abertosCom.has(p.id);
    const acoes = h('div', { class: 'cm-acoes' },
      pode ? h('button', { type: 'button', class: 'cm-link', text: S.ui.reagindo === p.id ? 'Fechar' : 'Reagir', onclick: () => { S.ui.reagindo = S.ui.reagindo === p.id ? null : p.id; atualizar(); } }) : null,
      h('button', { type: 'button', class: 'cm-link', text: coms.length ? `${coms.length} comentário${coms.length === 1 ? '' : 's'}` : 'Comentar', onclick: () => { aberto ? S.abertosCom.delete(p.id) : S.abertosCom.add(p.id); atualizar(); } }),
      (p.autor === S.me || S.mestre) ? h('button', { type: 'button', class: 'cm-link', text: 'Apagar', onclick: () => apagar(dok('mural', p.id), 'Apagar esta publicação?') }) : null,
      p.autor !== S.me && S.me ? h('button', { type: 'button', class: 'cm-link', text: 'Denunciar', onclick: () => denunciar('post', p.id, p.texto) }) : null);
    const card = h('article', { class: 'cm-post' }, head, h('div', { class: 'cm-txt', text: p.texto || '' }), usadas.length || S.ui.reagindo === p.id ? reacoes : null, acoes);
    if (aberto) {
      const box = h('div', { class: 'cm-coms' }, coms.map((c) => h('div', { class: 'cm-com' }, h('div', { class: 'cm-meta' }, spanNome(c.autor), quando(c.ts),
        (c.autor === S.me || S.mestre) ? h('button', { type: 'button', class: 'cm-link', text: 'Apagar', onclick: () => apagar(dok('comentarios', c.id), 'Apagar este comentário?') }) : null,
        c.autor !== S.me && S.me ? h('button', { type: 'button', class: 'cm-link', text: 'Denunciar', onclick: () => denunciar('comentario', c.id, c.texto) }) : null),
      h('div', { class: 'cm-txt', text: c.texto }))));
      if (S.me && S.escreve) {
        const inp = h('input', { class: 'cm-in', placeholder: 'Comentar…', maxlength: 800, value: S.rascCom[p.id] || '', 'aria-label': 'Comentário', oninput: () => { S.rascCom[p.id] = inp.value; } });
        const env = async () => { const t = inp.value.trim(); if (!t) return; inp.disabled = true; const ok = await salvar(() => col('comentarios').add({ post: p.id, autor: S.me, texto: t, ts: agora() })); inp.disabled = false; if (ok) { inp.value = ''; S.rascCom[p.id] = ''; } };
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') env(); });
        box.append(h('div', { class: 'cm-row', style: 'flex-wrap:nowrap' }, inp, btn('Enviar', env, 'cm-mini')));
      }
      card.append(box);
    }
    return card;
  }
  async function apagar(ref, pergunta) {
    if (!(await confirmar(pergunta, 'Apagar'))) return;
    await salvar(() => ref.delete());
  }
  function denunciar(tipo, id, texto) {
    const motivo = h('select', { class: 'cm-sel' }, ['Ofensivo ou assédio', 'Dados pessoais de alguém', 'Spam', 'Fora do jogo / inadequado', 'Outro'].map((m) => h('option', { value: m, text: m })));
    const obs = h('textarea', { class: 'cm-ta', placeholder: 'Detalhes (opcional)', maxlength: 400 });
    const corpoJ = h('div', { style: 'display:flex;flex-direction:column;gap:10px;color:var(--ink)' }, h('div', { text: 'Só o mestre vê as denúncias.' }), motivo, obs);
    const j = janela('Denunciar', corpoJ);
    corpoJ.append(btn('Enviar denúncia', async () => {
      const ref = dok('denuncias', S.me);
      const ok = await salvar(async () => {
        const at = await ref.get();
        const itens = (at.exists && at.data().itens) || [];
        await ref.set({ itens: [...itens.slice(-29), { tipo, alvo: id, resumo: corte(texto, 120), motivo: motivo.value, obs: obs.value.trim(), ts: agora() }], ts: agora() });
      });
      if (ok) { j.fechar(); toast('Denúncia', 'Enviada ao mestre.'); }
    }, 'cm-pri'));
  }
  function listaDenuncias() {
    const todas = [];
    S.d.den.forEach((d) => (d.itens || []).forEach((x, i) => todas.push({ ...x, quem: d.id, i })));
    todas.sort((a, b) => b.ts - a.ts);
    const out = [h('div', { class: 'cm-row' }, btn('← Voltar pro quadro', () => { S.verDen = false; atualizar(); }, 'cm-mini'))];
    if (!todas.length) { out.push(h('div', { class: 'cm-vazio', text: 'Nenhuma denúncia.' })); return out; }
    todas.forEach((x) => out.push(h('div', { class: 'cm-post' },
      h('div', { class: 'cm-meta' }, h('span', { class: 'cm-tag cm-red', text: x.tipo === 'post' ? 'Publicação' : 'Comentário' }), 'por ', spanNome(x.quem), quando(x.ts)),
      h('div', { class: 'cm-txt', text: `Motivo: ${x.motivo}${x.obs ? ' — ' + x.obs : ''}` }), h('div', { class: 'cm-sub', text: `“${x.resumo || ''}”` }),
      h('div', { class: 'cm-acoes' },
        btn('Apagar o conteúdo', async () => { if (await confirmar('Apagar o conteúdo denunciado?', 'Apagar')) { await salvar(() => dok(x.tipo === 'post' ? 'mural' : 'comentarios', x.alvo).delete()); await dispensar(x); } }, 'cm-mini'),
        btn('Dispensar', () => dispensar(x), 'cm-mini cm-perigo')))));
    return out;
  }
  async function dispensar(x) {
    const d = S.d.den.find((y) => y.id === x.quem); if (!d) return;
    await salvar(() => dok('denuncias', x.quem).set({ itens: (d.itens || []).filter((y) => y.ts !== x.ts), ts: agora() }));
  }

  // (o MAPA virou parte da HISTÓRIA: os lugares aparecem embaixo do quadro)
