  // ---------- MAPA (antigo, fica de reserva) ----------
  SECOES.mapa = {
    montar(w) {
      S.ui.cab = h('div', { style: 'display:flex;flex-direction:column;gap:6px' });
      w.append(S.ui.cab);
      if (S.mestre) {
        const inp = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
        inp.addEventListener('change', async () => {
          const f = inp.files && inp.files[0]; inp.value = ''; if (!f) return;
          toast('Mapa', 'Enviando o mapa…');
          await salvar(async () => { const id = await enviarImagem(f, 3000); await dok('conteudo', 'mapa').set({ ...(S.d.mapa || {}), img: id, autor: S.me, ts: agora() }); });
        });
        S.ui.ponto = btn('＋ Ponto no mapa', () => { S.pondo = !S.pondo; S.movendo = null; atualizar(); }, 'cm-mini');
        w.append(h('div', { class: 'cm-row' }, btn('Editar cidade', editarCidade, 'cm-mini'), btn(S.d.mapa && S.d.mapa.img ? 'Trocar imagem do mapa' : 'Enviar imagem do mapa', () => inp.click(), 'cm-mini'), S.ui.ponto, inp));
      }
      S.ui.zoom = h('div', { class: 'cm-row' }, btn('－', () => { S.mz = Math.max(1, S.mz - 0.5); atualizar(); }, 'cm-mini'), h('span', { class: 'cm-sub', text: 'zoom' }), btn('＋', () => { S.mz = Math.min(4, S.mz + 0.5); atualizar(); }, 'cm-mini'));
      S.ui.dica = h('div', { class: 'cm-aviso', hidden: true });
      S.ui.mapa = h('div', { class: 'cm-mapa' });
      S.ui.locais = h('div', { class: 'cm-lista' });
      w.append(S.ui.zoom, S.ui.dica, S.ui.mapa, h('div', { class: 'cm-faixa', text: 'Lugares' }), S.ui.locais);
    },
    atualizar() {
      const m = S.d.mapa || {};
      rc(S.ui.cab, h('div', { class: 'cm-h' }, h('h2', { text: m.cidade || 'Mapa' })), m.descricao ? h('div', { class: 'cm-txt', text: m.descricao }) : null);
      if (S.ui.ponto) S.ui.ponto.textContent = S.pondo ? '✕ Cancelar ponto' : '＋ Ponto no mapa';
      S.ui.dica.hidden = !(S.pondo || S.movendo);
      S.ui.dica.textContent = S.movendo ? 'Toque no mapa onde o ponto deve ficar.' : 'Toque no mapa onde quer criar o ponto.';
      S.ui.mapa.classList.toggle('cm-pondo', !!(S.pondo || S.movendo));
      S.ui.zoom.hidden = !m.img;
      if (!m.img) {
        rc(S.ui.mapa, h('div', { class: 'cm-vazio', style: 'border:0', text: S.mestre ? 'Sem mapa. Envie uma imagem e toque nela pra marcar os lugares.' : 'O mestre ainda não colocou o mapa.' }));
      } else {
        const inn = h('div', { class: 'cm-mapa-in', style: `--mz:${S.mz}` }, h('img', { src: imgSrc(m.img), alt: `Mapa de ${m.cidade || 'cidade'}`, draggable: 'false' }));
        inn.addEventListener('click', (e) => {
          if (!(S.pondo || S.movendo) || e.target.closest('.cm-pin')) return;
          const r = inn.getBoundingClientRect();
          const x = +((e.clientX - r.left) / r.width).toFixed(4), y = +((e.clientY - r.top) / r.height).toFixed(4);
          if (S.movendo) { const id = S.movendo; S.movendo = null; salvar(() => dok('locais', id).update({ x, y, ts: agora() })); atualizar(); return; }
          S.pondo = false; atualizar(); formLocal(null, { x, y });
        });
        S.d.locais.filter((l) => l.x != null).forEach((l) => inn.append(h('button', { type: 'button', class: `cm-pin ${l.tipo || 'local'}`, style: `left:${l.x * 100}%;top:${l.y * 100}%;--pc:${l.cor || 'var(--red)'}`, title: l.nome, onclick: () => verLocal(l.id) }, h('span', { text: l.nome }), h('i'))));
        rc(S.ui.mapa, inn);
      }
      const ord = [...S.d.locais].sort((a, b) => (a.tipo === 'distrito' ? 0 : 1) - (b.tipo === 'distrito' ? 0 : 1) || (a.nome || '').localeCompare(b.nome || ''));
      const conta = (n, um, varios) => (n ? `${n} ${n === 1 ? um : varios}` : null);
      rc(S.ui.locais, ...(ord.length ? ord.map((l) => h('button', { type: 'button', class: 'cm-linha cm-lugar', style: `--pc:${l.cor || 'var(--red)'}`, onclick: () => verLocal(l.id) },
        h('span', { class: 'cm-rot', text: TIPOS_LOCAL[l.tipo] || 'Local' }),
        h('span', { class: 'cm-linha-txt' }, h('b', { text: l.nome }), l.descricao ? h('small', { text: corte(l.descricao, 140) }) : null),
        h('span', { class: 'cm-quando', text: [conta(npcsEm(l.id).length, 'NPC', 'NPCs'), conta(pistasEm(l.id).length, 'pista', 'pistas')].filter(Boolean).join(' · ') })))
        : [h('div', { class: 'cm-vazio', text: S.mestre ? 'Nenhum lugar ainda. Use “＋ Ponto no mapa”.' : 'Nenhum lugar marcado.' })]));
    },
  };
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
      btn('Mover no mapa', () => { j.fechar(); S.movendo = l.id; S.pondo = false; atualizar(); }, 'cm-mini'),
      btn('Apagar', async () => { j.fechar(); await apagar(dok('locais', l.id), `Apagar “${l.nome}”?`); }, 'cm-mini cm-perigo')));
  }

