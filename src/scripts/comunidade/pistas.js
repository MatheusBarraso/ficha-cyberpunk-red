  // ---------- PISTAS ----------
  SECOES.pistas = {
    montar(w) {
      const top = h('div', { class: 'cm-h' }, h('h2', { text: 'Pistas' }));
      if (S.mestre) top.append(btn('＋ Nova pista', () => formPista(), 'cm-mini'), S.ui.verBtn = btn('', () => { S.pistasVer = S.pistasVer === 'pub' ? 'rasc' : 'pub'; atualizar(); }, 'cm-mini'));
      w.append(top);
      S.ui.filtro = h('select', { class: 'cm-sel', style: 'width:auto', 'aria-label': 'Filtrar por lugar', onchange: (e) => { S.filtroLocal = e.target.value; atualizar(); } });
      w.append(h('div', { class: 'cm-row' }, S.ui.filtro));
      S.ui.area = h('div', { class: 'cm-docs', 'data-vivo': '' });
      w.append(S.ui.area);
    },
    atualizar() {
      rc(S.ui.filtro, h('option', { value: '', text: 'Todos os lugares' }), S.d.locais.map((l) => h('option', { value: l.id, text: l.nome })));
      S.ui.filtro.hidden = !S.d.locais.length;
      S.ui.filtro.value = S.filtroLocal;
      if (S.ui.verBtn) S.ui.verBtn.textContent = S.pistasVer === 'pub' ? 'Rascunhos' : 'Publicadas';
      if (S.mestre && S.pistasVer === 'rasc') { rc(S.ui.area, ...listaRascunhos()); return; }
      const lst = S.d.pistas.filter((p) => !S.filtroLocal || p.local === S.filtroLocal);
      if (!lst.length) { rc(S.ui.area, h('div', { class: 'cm-vazio', text: S.mestre ? 'Nenhuma pista publicada. As novas ficam em rascunho até você publicar.' : 'Nenhuma pista ainda.' })); return; }
      rc(S.ui.area, ...lst.map(cartaoPista));
    },
  };
  function cartaoPista(p) {
    const tn = TIPOS_PISTA[p.tipo] || 'Pista';
    const card = h('article', { class: 'cm-doc' },
      h('div', { class: 'cm-doc-hd' }, h('span', { text: tn }), h('span', { text: quando(p.ts) })),
      h('div', { class: 'cm-doc-tit', text: p.titulo }),
      (p.local && localDe(p.local)) || (p.npc && npcDe(p.npc) && !npcDe(p.npc).oculto) ? h('div', { class: 'cm-meta' }, p.local && localDe(p.local) ? localDe(p.local).nome : null, p.npc && npcDe(p.npc) && !npcDe(p.npc).oculto ? `NPC: ${npcNome(p.npc)}` : null) : null);
    if (p.img) card.append(h('img', { class: 'cm-img', src: imgSrc(p.img), alt: '' }));
    const resolveram = [...new Set(S.d.desc.filter((d) => d.pista === p.id && d.tipo === 'resolveu').map((d) => d.autor))];
    if (p.cifra) {
      const aberto = decifradas[p.id];
      if (aberto != null) card.append(h('div', { class: 'cm-ok', text: '✔ Decifrada' }), h('div', { class: 'cm-txt', text: aberto }));
      else {
        if (p.pergunta) card.append(h('div', { class: 'cm-txt', style: 'font-weight:700', text: p.pergunta }));
        card.append(h('div', { class: 'cm-cifra', 'aria-label': 'Conteúdo cifrado', text: p.cifra.slice(0, 220).replace(/(.{4})/g, '$1 ') }));
        const inp = h('input', { class: 'cm-in', placeholder: 'Sua resposta', 'aria-label': 'Resposta', maxlength: 200, value: S.rascDesc['r' + p.id] || '', oninput: () => { S.rascDesc['r' + p.id] = inp.value; } });
        const st = h('span', { class: S.rascDesc['e' + p.id] ? 'cm-err' : 'cm-sub', text: S.rascDesc['e' + p.id] ? 'Resposta errada.' : '' });
        const tentar = async () => {
          const r = inp.value; if (!r.trim()) return;
          st.textContent = 'Testando…'; st.className = 'cm-sub';
          try {
            decifradas[p.id] = await decifrar(p, r); S.rascDesc['e' + p.id] = 0;
            const rs = respSalvas(); rs[p.id] = r; try { localStorage.setItem(RESP_KEY, JSON.stringify(rs)); } catch { /* ok */ }
            if (S.me && S.escreve && !resolveram.includes(S.me)) salvar(() => col('descobertas').add({ pista: p.id, autor: S.me, tipo: 'resolveu', ts: agora() }));
            atualizar();
          } catch { st.textContent = 'Resposta errada.'; st.className = 'cm-err'; S.rascDesc['e' + p.id] = 1; }
        };
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') tentar(); });
        card.append(h('div', { class: 'cm-row', style: 'flex-wrap:nowrap' }, inp, btn('Decifrar', tentar, 'cm-mini')), st);
      }
    } else if (p.texto) card.append(h('div', { class: 'cm-txt', text: p.texto }));
    if (resolveram.length) card.append(h('div', { class: 'cm-meta' }, 'Decifrada por', resolveram.map((u) => spanNome(u))));
    const ligadas = (p.liga || []).map((id) => byId(S.d.pistas, id)).filter(Boolean);
    if (ligadas.length) card.append(h('div', { class: 'cm-meta' }, 'Ligada a', ligadas.map((x) => h('button', { type: 'button', class: 'cm-link', text: x.titulo, onclick: () => { S.filtroLocal = ''; atualizar(); setTimeout(() => { const alvo = [...wrap.querySelectorAll('article')].find((a) => a.querySelector('.cm-doc-tit') && a.querySelector('.cm-doc-tit').textContent === x.titulo); if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 30); } }))));
    // descobertas coletivas
    const notas = S.d.desc.filter((d) => d.pista === p.id && d.tipo === 'nota').sort((a, b) => a.ts - b.ts);
    const aberto = S.abertosDesc.has(p.id);
    card.append(h('div', { class: 'cm-acoes' }, h('button', { type: 'button', class: 'cm-link', text: notas.length ? `Teorias da mesa (${notas.length})` : 'Teorias da mesa', onclick: () => { aberto ? S.abertosDesc.delete(p.id) : S.abertosDesc.add(p.id); atualizar(); } }),
      S.mestre ? h('button', { type: 'button', class: 'cm-link', text: 'Editar', onclick: () => { const r = byId(S.d.rasc, p.id); if (r) formPista(r); } }) : null));
    if (aberto) {
      const box = h('div', { class: 'cm-coms' }, notas.map((d) => h('div', { class: 'cm-com' }, h('div', { class: 'cm-meta' }, spanNome(d.autor), quando(d.ts), (d.autor === S.me || S.mestre) ? h('button', { type: 'button', class: 'cm-link', text: 'Apagar', onclick: () => apagar(dok('descobertas', d.id), 'Apagar esta descoberta?') }) : null), h('div', { class: 'cm-txt', text: d.texto }))));
      if (S.me && S.escreve) {
        const inp = h('input', { class: 'cm-in', placeholder: 'Sua teoria…', maxlength: 800, value: S.rascDesc[p.id] || '', oninput: () => { S.rascDesc[p.id] = inp.value; } });
        const env = async () => { const t = inp.value.trim(); if (!t) return; if (await salvar(() => col('descobertas').add({ pista: p.id, autor: S.me, tipo: 'nota', texto: t, ts: agora() }))) { inp.value = ''; S.rascDesc[p.id] = ''; } };
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') env(); });
        box.append(h('div', { class: 'cm-row', style: 'flex-wrap:nowrap' }, inp, btn('Enviar', env, 'cm-mini')));
      }
      card.append(box);
    }
    return card;
  }
  function listaRascunhos() {
    const lst = [...S.d.rasc].sort((a, b) => (b.ts || 0) - (a.ts || 0));
    if (!lst.length) return [h('div', { class: 'cm-vazio', text: 'Nenhuma pista criada.' })];
    return lst.map((r) => {
      const tn = TIPOS_PISTA[r.tipo] || 'Pista';
      const pub = !!byId(S.d.pistas, r.id);
      return h('div', { class: 'cm-doc' + (pub ? '' : ' cm-rascunho') },
        h('div', { class: 'cm-doc-hd' }, h('span', { text: `${tn} · ${pub ? 'publicada' : 'rascunho'}` }), h('span', { text: quando(r.ts) })),
        h('div', { class: 'cm-doc-tit', text: r.titulo }),
        r.resposta ? h('div', { class: 'cm-sub', text: `Resposta: ${r.resposta}` }) : null,
        h('div', { class: 'cm-sub', text: corte(r.texto, 200) }),
        h('div', { class: 'cm-row' }, btn('Editar', () => formPista(r), 'cm-mini'), btn(pub ? 'Atualizar publicação' : 'Publicar', () => publicar(r), 'cm-mini cm-pri'),
          pub ? btn('Esconder', () => salvar(() => dok('pistas', r.id).delete()), 'cm-mini') : null,
          btn('Apagar', async () => { if (await confirmar(`Apagar a pista “${r.titulo}”?`, 'Apagar')) { await salvar(async () => { await dok('pistas', r.id).delete(); await dok('rascunhos', r.id).delete(); }); } }, 'cm-mini cm-perigo')));
    });
  }
  async function publicar(r) {
    await salvar(async () => {
      const base = { titulo: r.titulo, tipo: r.tipo, local: r.local || null, npc: r.npc || null, img: r.img || null, liga: r.liga || [], pergunta: r.pergunta || '', autor: S.me, ts: agora() };
      const precisa = (r.tipo === 'cifrada' || r.tipo === 'enigma') && r.resposta;
      const dados = precisa ? { ...base, ...(await cifrar(r.texto || '', r.resposta)) } : { ...base, texto: r.texto || '' };
      await dok('pistas', r.id).set(dados);
      toast('Pistas', `“${r.titulo}” publicada.`);
    });
  }
  function formPista(r) {
    r = r || {};
    const tit = h('input', { class: 'cm-in', value: r.titulo || '', maxlength: 80 });
    const tipo = h('select', { class: 'cm-sel' }, Object.entries(TIPOS_PISTA).map(([k, n]) => h('option', { value: k, text: n })));
    tipo.value = r.tipo || 'documento';
    const texto = h('textarea', { class: 'cm-ta', style: 'min-height:120px', maxlength: 8000, placeholder: 'O conteúdo da pista (documento, transcrição, mensagem…)' }); texto.value = r.texto || '';
    const perg = h('input', { class: 'cm-in', value: r.pergunta || '', maxlength: 300, placeholder: 'Enigma ou dica que os jogadores veem' });
    const resp = h('input', { class: 'cm-in', value: r.resposta || '', maxlength: 120, placeholder: 'A resposta destrava o conteúdo (sem diferença de acento/maiúscula)' });
    const local = h('select', { class: 'cm-sel' }, h('option', { value: '', text: 'Sem local' }), S.d.locais.map((l) => h('option', { value: l.id, text: l.nome }))); local.value = r.local || '';
    const npc = h('select', { class: 'cm-sel' }, h('option', { value: '', text: 'Sem NPC' }), S.d.npcs.map((n) => h('option', { value: n.id, text: n.nome }))); npc.value = r.npc || '';
    const outras = S.d.rasc.filter((x) => x.id !== r.id);
    const liga = new Set(r.liga || []);
    const ligaBox = h('div', { style: 'display:flex;flex-direction:column;gap:4px;max-height:140px;overflow:auto' }, outras.map((x) => { const c = h('input', { type: 'checkbox' }); c.checked = liga.has(x.id); c.addEventListener('change', () => { c.checked ? liga.add(x.id) : liga.delete(x.id); }); return h('label', { class: 'cm-row', style: 'font-weight:600;gap:6px' }, c, x.titulo); }));
    const img = campoImagem(r.img); 
    const lbl = (t, e) => h('label', { class: 'cm-lbl' }, t, e);
    const cif = h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, lbl('Pergunta / dica', perg), lbl('Resposta (os jogadores precisam acertar)', resp));
    const mostraCif = () => { cif.hidden = !(tipo.value === 'cifrada' || tipo.value === 'enigma'); };
    tipo.addEventListener('change', mostraCif); mostraCif();
    const c = h('div', { style: 'display:flex;flex-direction:column;gap:10px;color:var(--ink)' }, lbl('Título', tit), lbl('Tipo', tipo), lbl('Conteúdo', texto), cif, lbl('Lugar', local), lbl('NPC ligado', npc), img.el, outras.length ? h('div', { class: 'cm-lbl' }, 'Conectada a outras pistas', ligaBox) : null,
      h('div', { class: 'cm-sub', text: 'Cifrada e enigma: o conteúdo só abre com a resposta certa.' }));
    const j = janela(r.id ? 'Editar pista' : 'Nova pista', c);
    const juntar = () => ({ titulo: tit.value.trim(), tipo: tipo.value, texto: texto.value, pergunta: perg.value.trim(), resposta: resp.value.trim(), local: local.value || null, npc: npc.value || null, img: img.valor(), liga: [...liga], autor: S.me, ts: agora() });
    const valida = (d) => { if (!d.titulo) { tit.focus(); return false; } if ((d.tipo === 'cifrada' || d.tipo === 'enigma') && !d.resposta) { resp.focus(); toast('Pistas', 'Coloque a resposta que destrava a pista.'); return false; } return true; };
    const gravar = async (pub) => {
      const d = juntar(); if (!valida(d)) return;
      let id = r.id;
      const ok = await salvar(async () => { if (id) await dok('rascunhos', id).set(d); else id = (await col('rascunhos').add(d)).id; });
      if (!ok) return;
      if (pub || byId(S.d.pistas, id)) await publicar({ ...d, id });
      j.fechar();
    };
    c.append(h('div', { class: 'cm-row' }, btn('Salvar rascunho', () => gravar(false)), btn(byId(S.d.pistas, r.id) ? 'Salvar e atualizar' : 'Salvar e publicar', () => gravar(true), 'cm-pri')));
    tit.focus();
  }

