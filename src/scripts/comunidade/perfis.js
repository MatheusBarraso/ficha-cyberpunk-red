  // ---------- PERFIS ----------
  const nivel = (p) => NIVEIS.filter((n) => p >= n[0]).pop()[1];
  SECOES.perfil = {
    montar(w) {
      w.append(h('div', { class: 'cm-h' }, h('h2', { text: 'Perfis' })));
      S.ui.meu = h('div', { 'data-vivo': '' });
      S.ui.area = h('div', { style: 'display:flex;flex-direction:column;gap:10px' });
      w.append(S.ui.meu, S.ui.area);
      if (S.me && S.escreve) S.ui.meu.append(formPerfil());
    },
    atualizar() {
      if (S.perfilAberto) { rc(S.ui.area, btn('← Todos', () => { S.perfilAberto = null; atualizar(); }, 'cm-mini cm-voltar'), viewPerfil(S.perfilAberto)); return; }
      const ids = [...new Set([...membrosSala(), ...Object.keys(S.d.rep)])];
      ids.sort((a, b) => ((S.d.rep[b] || {}).pontos || 0) - ((S.d.rep[a] || {}).pontos || 0));
      rc(S.ui.area, h('div', { class: 'cm-faixa', text: 'Jogadores' }),
        ids.length ? h('div', { class: 'cm-lista' }, ids.map((u) => { const r = S.d.rep[u] || {}; const p = S.d.perfis[u] || {};
          return h('button', { type: 'button', class: 'cm-linha', onclick: () => { S.perfilAberto = u; atualizar(); } }, h('span', { class: 'cm-rot', text: `${r.pontos || 0} rep` }),
            h('span', { class: 'cm-linha-txt' }, h('b', null, spanNome(u)), p.personagem ? h('small', { text: `${p.personagem}${p.papelPj ? ' · ' + p.papelPj : ''}` }) : null), h('span', { class: 'cm-quando', text: nivel(r.pontos || 0) })); }))
          : h('div', { class: 'cm-vazio', text: 'Ninguém na mesa ainda.' }));
    },
  };
  function formPerfil() {
    const p = (S.me && S.d.perfis[S.me]) || {};
    const ap = h('input', { class: 'cm-in', value: p.apelido || '', maxlength: 40, placeholder: 'Seu apelido na comunidade' });
    const pj = h('input', { class: 'cm-in', value: p.personagem || '', maxlength: 60, placeholder: 'Nome do personagem' });
    const pp = h('input', { class: 'cm-in', value: p.papelPj || '', maxlength: 40, placeholder: 'Papel (Solo, Netrunner…)' });
    const bio = h('textarea', { class: 'cm-ta', maxlength: 1000, placeholder: 'Quem é o seu personagem nas ruas' }); bio.value = p.bio || '';
    const puxar = btn('Puxar da ficha', () => {
      const v = (sel) => { const e = document.querySelector(sel); return e ? (e.value || '').trim() : ''; };
      const n = v('[data-f="NOME"]'), r = v('[data-f="PAPEL"]');
      if (n) pj.value = n; if (r) pp.value = r;
      if (!n && !r) toast('Perfil', 'Os campos Nome e Papel da ficha estão vazios.');
    }, 'cm-mini');
    const lbl = (t, e) => h('label', { class: 'cm-lbl' }, t, e);
    return h('div', { class: 'cm-caixa' }, h('div', { class: 'cm-faixa', text: 'Meu perfil' }),
      h('div', { class: 'cm-grid', style: 'grid-template-columns:repeat(auto-fill,minmax(200px,1fr))' }, lbl('Apelido', ap), lbl('Personagem', pj), lbl('Papel', pp)), lbl('Bio', bio),
      h('div', { class: 'cm-sub', text: 'Todo mundo da mesa vê o seu perfil.' }),
      h('div', { class: 'cm-row' }, puxar, h('span', { style: 'flex:1' }), btn('Salvar perfil', () => salvar(() => dok('perfis', S.me).set({ apelido: ap.value.trim(), personagem: pj.value.trim(), papelPj: pp.value.trim(), bio: bio.value.trim(), ts: agora() })).then((ok) => ok && toast('Perfil', 'Perfil salvo.')), 'cm-pri')));
  }
  function viewPerfil(u) {
    const p = S.d.perfis[u] || {}, r = S.d.rep[u] || {};
    const minhas = S.d.aceites.filter((a) => a.autor === u).map((a) => byId(S.d.missoes, a.missao)).filter(Boolean);
    const card = h('div', { class: 'cm-caixa' },
      h('div', { class: 'cm-npc' }, avatar(nome(u), null, 'cm-npc-big'), h('div', { style: 'display:flex;flex-direction:column;gap:6px;min-width:0' },
        h('div', { class: 'cm-nome', style: 'font-size:22px' }, spanNome(u)), p.personagem ? h('div', { class: 'cm-sub', text: `${p.personagem}${p.papelPj ? ' · ' + p.papelPj : ''}` }) : null,
        h('div', null, h('span', { class: 'cm-num', text: r.pontos || 0 }), h('span', { class: 'cm-sub', text: ` reputação · ${nivel(r.pontos || 0)}` })))),
      p.bio ? h('div', { class: 'cm-txt', text: p.bio }) : null);
    if ((r.conquistas || []).length) card.append(h('b', { text: 'Conquistas' }), h('div', { class: 'cm-row' }, r.conquistas.map((c, i) => h('span', { class: 'cm-conq', title: c.desc || '' }, c.nome, S.mestre ? h('button', { type: 'button', class: 'cm-link', 'aria-label': 'Remover conquista', text: '✕', onclick: () => salvar(() => dok('reputacao', u).set({ ...r, conquistas: r.conquistas.filter((_, k) => k !== i), ts: agora(), autor: S.me })) }) : null))));
    const rels = Object.entries(r.npcs || {}).filter(([id]) => npcDe(id) && (S.mestre || !npcDe(id).oculto));
    if (rels.length) card.append(h('b', { text: 'Relações' }), ...rels.map(([id, v]) => h('div', { class: 'cm-row' }, h('span', { class: 'cm-nome', text: npcNome(id) }), barraRel(v))));
    if (minhas.length) card.append(h('b', { text: 'Missões' }), h('div', { class: 'cm-row' }, minhas.map((m) => h('span', { class: 'cm-tag', text: `${m.status === 'concluida' ? '✔ ' : ''}${m.titulo}` }))));
    if ((r.hist || []).length) card.append(h('b', { text: 'Histórico' }), ...r.hist.slice(0, 15).map((x) => h('div', { class: 'cm-meta' }, quando(x.ts), h('span', { class: 'cm-txt', text: x.txt }), x.pts ? h('b', { text: `${x.pts > 0 ? '+' : ''}${x.pts}` }) : null)));
    if (S.mestre) {
      const q = h('input', { class: 'cm-in', type: 'number', value: 1, style: 'width:90px' });
      const mot = h('input', { class: 'cm-in', placeholder: 'Motivo', maxlength: 100, style: 'flex:1 1 160px;width:auto' });
      const cn = h('input', { class: 'cm-in', placeholder: 'Nome da conquista', maxlength: 50, style: 'flex:1 1 160px;width:auto' });
      card.append(h('div', { class: 'cm-coms', 'data-vivo': '' }, h('b', { text: 'Mestre' }),
        h('div', { class: 'cm-row' }, q, mot, btn('Dar/tirar reputação', () => { const v = +q.value || 0; if (v) darRep(u, v, mot.value.trim() || 'Ajuste do mestre'); }, 'cm-mini')),
        h('div', { class: 'cm-row' }, cn, btn('Dar conquista', () => { const n = cn.value.trim(); if (n) darRep(u, 0, `Conquista: ${n}`, { nome: n, ts: agora() }); }, 'cm-mini'))));
    }
    return card;
  }

