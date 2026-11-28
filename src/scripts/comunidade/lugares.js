  // ---------- LUGARES da cidade (distritos, pontos, eventos): usados pela História ----------
  const npcsEm = (lid) => S.d.npcs.filter((n) => n.local === lid && (S.mestre || !n.oculto));
  const pistasEm = (lid) => S.d.pistas.filter((p) => p.local === lid);
  const missoesEm = (lid) => S.d.missoes.filter((m) => m.local === lid && m.status !== 'concluida');
  function editarCidade() {
    const m = S.d.mapa || {};
    const nomeI = h('input', { class: 'cm-in', value: m.cidade || '', maxlength: 60, placeholder: 'Nome da cidade' });
    const desc = h('textarea', { class: 'cm-ta', maxlength: 1500, placeholder: 'Uma apresentação curta da cidade' }); desc.value = m.descricao || '';
    const c = h('div', { style: 'display:flex;flex-direction:column;gap:10px;color:var(--ink)' }, h('label', { class: 'cm-lbl' }, 'Cidade', nomeI), h('label', { class: 'cm-lbl' }, 'Descrição', desc));
    const j = janela('Cidade', c);
    c.append(btn('Salvar', async () => { if (await salvar(() => dok('conteudo', 'mapa').set({ ...m, cidade: nomeI.value.trim(), descricao: desc.value.trim(), autor: S.me, ts: agora() }))) j.fechar(); }, 'cm-pri'));
  }
  function formLocal(l, pos) {
    l = l || {};
    const nomeI = h('input', { class: 'cm-in', value: l.nome || '', maxlength: 60 });
    const tipo = h('select', { class: 'cm-sel' }, Object.entries(TIPOS_LOCAL).map(([k, v]) => h('option', { value: k, text: v })));
    tipo.value = l.tipo || 'local';
    let cor = l.cor || CORES[0];
    const cores = h('div', { class: 'cm-row' });
    const pintaCores = () => rc(cores, ...CORES.map((c) => h('button', { type: 'button', 'aria-label': `Cor ${c}`, style: `width:30px;height:30px;background:${c};border:${c === cor ? '3px solid #000' : '1px solid #999'};cursor:pointer`, onclick: () => { cor = c; pintaCores(); } })));
    pintaCores();
    const desc = h('textarea', { class: 'cm-ta', maxlength: 2000 }); desc.value = l.descricao || '';
    const img = campoImagem(l.img);
    const c = h('div', { style: 'display:flex;flex-direction:column;gap:10px;color:var(--ink)' },
      h('label', { class: 'cm-lbl' }, 'Nome', nomeI), h('label', { class: 'cm-lbl' }, 'Tipo', tipo),
      h('div', { class: 'cm-lbl' }, 'Cor (identidade do lugar)', cores), h('label', { class: 'cm-lbl' }, 'Descrição, pontos de interesse, eventos', desc), img.el);
    
    const j = janela(l.id ? 'Editar lugar' : 'Novo lugar', c);
    c.append(btn('Salvar', async () => {
      const n = nomeI.value.trim(); if (!n) { nomeI.focus(); return; }
      const dados = { nome: n, tipo: tipo.value, cor, descricao: desc.value.trim(), img: img.valor(), x: pos ? pos.x : (l.x ?? null), y: pos ? pos.y : (l.y ?? null), autor: S.me, ts: agora() };
      if (await salvar(() => (l.id ? dok('locais', l.id).set(dados) : col('locais').add(dados)))) j.fechar();
    }, 'cm-pri'));
    nomeI.focus();
  }
  function verLocal(id) {
    const l = localDe(id); if (!l) return;
    const c = h('div', { style: 'display:flex;flex-direction:column;gap:10px;color:var(--ink)' },
      h('div', { class: 'cm-meta' }, h('span', { class: 'cm-tag', style: `border-color:${l.cor}`, text: TIPOS_LOCAL[l.tipo] || 'Local' })),
      l.img ? h('img', { src: imgSrc(l.img), alt: '', style: 'max-width:100%;max-height:260px;object-fit:contain' }) : null,
      l.descricao ? h('div', { style: 'white-space:pre-wrap;line-height:1.45', text: l.descricao }) : null);
    const lista = (tit, arr, rot, fn) => { if (arr.length) c.append(h('b', { text: tit }), h('div', { class: 'cm-row' }, arr.map((x) => h('button', { type: 'button', class: 'cm-btn cm-mini', text: rot(x), onclick: () => { j.fechar(); fn(x); } })))); };
    const j = janela(l.nome, c);
    lista('Quem está aqui', npcsEm(l.id), (n) => n.nome, (n) => { abrir('npcs'); S.npcAberto = n.id; atualizar(); });
    lista('Pistas daqui', pistasEm(l.id), (p) => p.titulo, () => { S.filtroLocal = l.id; abrir('pistas'); });
    lista('Missões daqui', missoesEm(l.id), (m) => m.titulo, () => abrir('missoes'));
    if (S.mestre) c.append(h('div', { class: 'cm-row' },
      btn('Editar', () => { j.fechar(); formLocal(l); }, 'cm-mini'),
      btn('Apagar', async () => { j.fechar(); await apagar(dok('locais', l.id), `Apagar “${l.nome}”?`); }, 'cm-mini cm-perigo')));
  }

