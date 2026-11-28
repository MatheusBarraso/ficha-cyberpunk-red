  // ----- quem está no combate: só o que o mestre coloca (a ordem de jogada) -----
  async function salvarOrdem(lista, vez, rodada) {
    if (!lista.length) { S.d.ordem = null; mudou(); await salvar(() => dok('mestreEstado', 'ordem').delete()); return; }
    const novo = { lista, vez: Math.min(Math.max(0, vez), lista.length - 1), rodada: rodada || 1, ts: agora() };
    S.d.ordem = novo; mudou();
    await salvar(() => dok('mestreEstado', 'ordem').set(novo));
  }
  async function tirarDoCombate(x) {
    const o = ordem(); if (!o) return;
    const i = o.lista.findIndex((y) => y.tipo === x.tipo && y.id === x.id); if (i < 0) return;
    const lista = o.lista.filter((_, k) => k !== i);
    await salvarOrdem(lista, i < o.vez ? o.vez - 1 : (o.vez >= lista.length ? 0 : o.vez), o.rodada);
  }
  async function colocarNoCombate(itens, lado) {
    const o = ordem();
    const lista = [...(o ? o.lista : []), ...itens.map((x) => ({ tipo: x.tipo, id: x.id }))];
    // NPC e monstro entram no lado de onde o mestre adicionou
    for (const x of itens) {
      const f = x.tipo !== 'player' && fichaM(x.id);
      if (f && ladoDe(x.tipo, x.id) !== lado) { const { id: _i, ...resto } = f; await salvar(() => dok('fichasMestre', x.id).set({ ...resto, lado })); }
    }
    await salvarOrdem(lista, o ? o.vez : 0, o ? o.rodada : 1);
  }
  function abrirAddCombate(lado) {
    const o = ordem();
    const dentro = new Set((o ? o.lista : []).map((x) => chaveF(x.tipo, x.id)));
    const { players, inimigos } = todasFichas();
    const todos = [...players, ...inimigos].filter((x) => !dentro.has(chaveF(x.tipo, x.id)));
    const F = { q: '', tipo: lado === 'aliado' ? 'todos' : 'inimigos', min: '', max: '', quando: 'qualquer', ordem: 'recente', ocultas: false };
    const marcados = new Set();
    const nivelDe = (x) => parseInt((((registroDe(x.tipo, x.id) || {}).dados) || {}).NIVEL, 10);
    const lista = h('div', { class: 'cm-add-lista' });
    const cont = h('span', { class: 'cm-sub' });
    const botao = btn('Adicionar ao combate', async () => {
      const it = todos.filter((x) => marcados.has(chaveF(x.tipo, x.id)));
      if (!it.length) { toast('Combate', 'Marque pelo menos uma ficha.'); return; }
      m.fechar(); await colocarNoCombate(it, lado);
      toast('Combate', it.length === 1 ? `${tituloFicha(it[0].tipo, it[0].id)} entrou no combate.` : `${it.length} fichas entraram no combate.`);
    }, 'cm-mini cm-pri');
    const pinta = () => {
      let it = todos.filter((x) => {
        const reg = registroDe(x.tipo, x.id);
        if (!F.ocultas && oculta(x.tipo, x.id)) return false;
        const pj = x.tipo === 'player' || x.tipo === 'demo';
        if (F.tipo === 'player' && !pj) return false;
        if (F.tipo === 'inimigos' && pj) return false;
        if ((F.tipo === 'npc' || F.tipo === 'monstro') && x.tipo !== F.tipo) return false;
        if (F.q && !norm(tituloFicha(x.tipo, x.id)).includes(norm(F.q))) return false;
        const n = nivelDe(x);
        if (F.min !== '' && !(n >= +F.min)) return false;
        if (F.max !== '' && !(n <= +F.max)) return false;
        const ts = (reg && reg.ts) || 0;
        if (F.quando === 'dia' && ts < agora() - 864e5) return false;
        if (F.quando === 'semana' && ts < agora() - 7 * 864e5) return false;
        return true;
      });
      const ts = (x) => ((registroDe(x.tipo, x.id) || {}).ts || 0);
      const fv = (x) => (favorita(x.tipo, x.id) ? 0 : 1);
      it.sort(F.ordem === 'nome' ? (a, b) => fv(a) - fv(b) || tituloFicha(a.tipo, a.id).localeCompare(tituloFicha(b.tipo, b.id))
        : F.ordem === 'nivel' ? (a, b) => fv(a) - fv(b) || (nivelDe(b) || 0) - (nivelDe(a) || 0) : (a, b) => fv(a) - fv(b) || ts(b) - ts(a));
      rc(lista, it.length ? it.map((x) => {
        const reg = registroDe(x.tipo, x.id), d = (reg && reg.dados) || {}, k = chaveF(x.tipo, x.id);
        const cb = h('input', { type: 'checkbox' }); cb.checked = marcados.has(k);
        cb.addEventListener('change', () => { if (cb.checked) marcados.add(k); else marcados.delete(k); conta(); });
        return h('label', { class: 'cm-add-item' + (oculta(x.tipo, x.id) ? ' cm-add-oculta' : '') }, cb,
          h('span', { class: `cm-ml-tag cm-ml-${x.tipo}`, text: SIGLA[x.tipo] }),
          favorita(x.tipo, x.id) ? h('span', { class: 'cm-add-fav', text: '★' }) : null,
          morta(x.tipo, x.id) ? caveira('cm-caveira cm-add-cav') : null,
          h('span', { class: 'cm-add-txt' }, h('b', { text: tituloFicha(x.tipo, x.id) + (morta(x.tipo, x.id) ? ' (morta)' : '') }),
            h('small', { text: [d.PAPEL, d.NIVEL ? `nível ${d.NIVEL}` : null, d[PV] ? `PV ${d[PV]}` : null, reg ? `alterada ${quando(reg.ts)}` : 'ficha ainda não chegou'].filter(Boolean).join(' · ') })));
      }) : h('div', { class: 'cm-vazio', text: todos.length ? 'Nenhuma ficha com esses filtros.' : 'Todas as fichas já estão no combate.' }));
      conta();
    };
    const conta = () => { cont.textContent = marcados.size ? `${marcados.size} marcada${marcados.size === 1 ? '' : 's'}` : ''; botao.textContent = marcados.size ? `Adicionar ao combate (${marcados.size})` : 'Adicionar ao combate'; };
    const campo = (rot, el, chave, ev = 'input') => { el.addEventListener(ev, () => { F[chave] = el.type === 'checkbox' ? el.checked : el.value; pinta(); }); return h('label', { class: 'cm-lbl' }, rot, el); };
    const sel = (ops, v) => { const s = h('select', { class: 'cm-in' }, ops.map(([val, txt]) => h('option', { value: val, text: txt, selected: val === v }))); return s; };
    const busca = h('input', { class: 'cm-in', type: 'search', placeholder: 'Nome da ficha' });
    const minI = h('input', { class: 'cm-in', type: 'number', min: '0', inputmode: 'numeric', placeholder: 'de' });
    const maxI = h('input', { class: 'cm-in', type: 'number', min: '0', inputmode: 'numeric', placeholder: 'até' });
    const ocI = h('input', { type: 'checkbox' });
    const m = modal(lado === 'aliado' ? 'Adicionar aliado ao combate' : 'Adicionar inimigo ao combate', [
      h('div', { class: 'cm-add-filtros' },
        campo('Buscar', busca, 'q'),
        campo('Tipo', sel([['todos', 'Todos'], ['player', 'Players'], ['inimigos', 'NPCs e monstros'], ['npc', 'Só NPCs'], ['monstro', 'Só monstros']], F.tipo), 'tipo', 'change'),
        h('div', { class: 'cm-lbl' }, 'Nível', h('div', { class: 'cm-add-nivel' }, minI, h('span', { text: 'a' }), maxI)),
        campo('Alteração', sel([['qualquer', 'Qualquer data'], ['dia', 'Últimas 24 horas'], ['semana', 'Últimos 7 dias']], F.quando), 'quando', 'change'),
        campo('Ordenar', sel([['recente', 'Mais recente'], ['nome', 'Nome'], ['nivel', 'Nível']], F.ordem), 'ordem', 'change')),
      h('label', { class: 'cm-row cm-check' }, ocI, 'Mostrar fichas ocultas'),
      lista],
    [cont, h('span', { style: 'flex:1' }), btn('Cancelar', () => m.fechar(), 'cm-mini'), botao], 'cm-modal-add');
    minI.addEventListener('input', () => { F.min = minI.value; pinta(); });
    maxI.addEventListener('input', () => { F.max = maxI.value; pinta(); });
    ocI.addEventListener('change', () => { F.ocultas = ocI.checked; pinta(); });
    pinta();
    setTimeout(() => busca.focus(), 50);
  }

