  // ----- ordem de jogada (só o mestre vê; a ficha da vez brilha) -----
  function abrirOrdem() {
    const o = ordem() || { lista: [], vez: 0, rodada: 1 };
    const atual = o.lista[o.vez];
    const lista = o.lista.filter((x) => x.tipo === 'player' || registroDe(x.tipo, x.id));
    const area = h('div', { class: 'cm-ordem' });
    const pinta = () => {
      const { players, inimigos } = todasFichas();
      const fora = [...players, ...inimigos].filter((x) => !lista.some((y) => y.tipo === x.tipo && y.id === x.id));
      const sel = h('select', { class: 'cm-in', 'aria-label': 'Adicionar ficha na ordem' }, h('option', { value: '', text: 'Adicionar ficha…' }),
        fora.map((x) => h('option', { value: `${x.tipo}:${x.id}`, text: `${TIPOS_FICHA[x.tipo]} · ${tituloFicha(x.tipo, x.id)}` })));
      sel.addEventListener('change', () => { if (!sel.value) return; const [t, i] = sel.value.split(':'); lista.push({ tipo: t, id: i }); pinta(); });
      rc(area,
        lista.length ? h('ol', { class: 'cm-ordem-lista' }, lista.map((x, k) => h('li', null,
          h('span', { class: 'cm-ordem-n', text: k + 1 }), h('span', { class: `cm-ml-tag cm-ml-${x.tipo}`, text: SIGLA[x.tipo] }),
          h('span', { class: 'cm-ordem-nome', text: tituloFicha(x.tipo, x.id) }),
          btn('↑', () => { [lista[k - 1], lista[k]] = [lista[k], lista[k - 1]]; pinta(); }, 'cm-mini', !k),
          btn('↓', () => { [lista[k + 1], lista[k]] = [lista[k], lista[k + 1]]; pinta(); }, 'cm-mini', k === lista.length - 1),
          btn('×', () => { lista.splice(k, 1); pinta(); }, 'cm-mini cm-perigo'))))
          : h('div', { class: 'cm-vazio', text: 'Ninguém na ordem ainda.' }),
        h('div', { class: 'cm-sub', text: 'Pra colocar mais fichas no combate, use “Adicionar aliado” ou “Adicionar inimigo”.' }));
    };
    pinta();
    const m = modal('Ordem de jogada', [h('div', { class: 'cm-sub', text: 'Coloque na ordem em que cada um joga. Na vez de alguém, a ficha dele brilha pra você.' }), area],
      [ordem() ? btn('Encerrar', async () => { if (await salvar(() => dok('mestreEstado', 'ordem').delete())) m.fechar(); }, 'cm-mini cm-perigo') : null,
        btn('Cancelar', () => m.fechar(), 'cm-mini'),
        btn('Salvar ordem', async () => {
          if (!lista.length) { toast('Ordem', 'Coloque pelo menos uma ficha.'); return; }
          const i = atual ? lista.findIndex((x) => x.tipo === atual.tipo && x.id === atual.id) : -1;
          if (await salvar(() => dok('mestreEstado', 'ordem').set({ lista, vez: Math.max(0, i), rodada: o.rodada || 1, ts: agora() }))) m.fechar();
        }, 'cm-mini cm-pri')]);
  }
  async function passarVez(d) {
    const o = ordem(); if (!o) return;
    let vez = o.vez + d, rodada = o.rodada || 1;
    if (vez >= o.lista.length) { vez = 0; rodada++; }
    if (vez < 0) { vez = o.lista.length - 1; rodada = Math.max(1, rodada - 1); }
    const novo = { ...o, vez, rodada, ts: agora() };
    S.d.ordem = novo; mudou();
    const x = o.lista[vez];
    if (R.id && registroDe(x.tipo, x.id)) abrirFicha(x.tipo, x.id); else if (R.id) pintarRemota();
    await salvar(() => dok('mestreEstado', 'ordem').set(novo));
  }

