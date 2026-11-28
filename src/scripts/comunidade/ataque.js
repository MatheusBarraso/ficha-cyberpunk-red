  // ----- ataque: o mestre manda, o player aceita ou contesta -----
  // 1º passo: mirar no player (um toque) — ou marcar vários; 2º passo: o dano
  const MIRA = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5" stroke="currentColor" stroke-width="2"/></svg>';
  function atacantePadrao() { return R.id && R.tipo !== 'player' ? `${R.tipo}:${R.id}` : ''; }
  function abrirAtaque(alvoFixo) {
    if (alvoFixo) { abrirDano([alvoFixo]); return; }
    const players = membrosSala();
    if (!players.length) { toast('Ataque', 'Nenhum player na mesa ainda. O ataque só chega em quem entrou na sessão.'); return; }
    const o = ordem();
    const noComb = (u) => !!o && o.lista.some((x) => x.tipo === 'player' && x.id === u);
    players.sort((a, b) => noComb(b) - noComb(a) || morta('player', a) - morta('player', b));
    const quem = atacantePadrao();
    const titulo = quem ? tituloFicha(...quem.split(':')) : 'Ataque';
    let varios = false; const marc = new Set();
    const area = h('div', { class: 'cm-mira' });
    const pinta = () => rc(area, players.map((u) => {
      const f = fichaDe(u), d = (f && f.dados) || {};
      const alvo = h('button', { type: 'button', class: 'cm-mira-alvo' + (marc.has(u) ? ' on' : '') + (morta('player', u) ? ' cm-mira-morto' : '') + (naVez('player', u) ? ' cm-vez' : ''),
        onclick: () => { if (!varios) { m.fechar(); abrirDano([u]); } else { if (marc.has(u)) marc.delete(u); else marc.add(u); pinta(); conta(); } } },
        h('span', { class: 'cm-mira-foto' }, d.__img ? h('img', { src: d.__img, alt: '' }) : iniciais(d.NOME || nome(u))),
        h('span', { class: 'cm-mira-txt' }, h('b', { text: tituloFicha('player', u) }),
          h('small', { text: [d[PV] ? `PV ${d[PV]}` : 'PV —', morta('player', u) ? 'morta' : null, noComb(u) ? 'no combate' : null, f ? null : 'ficha ainda não chegou'].filter(Boolean).join(' · ') })));
      const ic = h('span', { class: 'cm-mira-ic' }); ic.innerHTML = MIRA; alvo.append(ic);
      return alvo;
    }));
    const btCont = btn('Continuar', () => { if (!marc.size) { toast('Ataque', 'Toque nos players que vão ser atacados.'); return; } m.fechar(); abrirDano([...marc]); }, 'cm-mini cm-pri');
    const conta = () => { btCont.textContent = marc.size ? `Continuar (${marc.size})` : 'Continuar'; };
    const btVarios = btn('Atacar vários', () => { varios = !varios; btVarios.textContent = varios ? 'Atacar um só' : 'Atacar vários'; btCont.hidden = !varios; dica.textContent = varios ? 'Toque nos players que vão ser atacados e depois em Continuar.' : 'Toque no player que vai ser atacado.'; marc.clear(); pinta(); conta(); }, 'cm-mini');
    btCont.hidden = true;
    const dica = h('div', { class: 'cm-sub', text: 'Toque no player que vai ser atacado.' });
    const m = modal(quem ? `${titulo}: escolha o alvo` : 'Escolha o alvo', [dica, area], [btVarios, h('span', { style: 'flex:1' }), btn('Cancelar', () => m.fechar(), 'cm-mini'), btCont], 'cm-modal-mira');
    pinta();
  }
  function abrirDano(alvos) {
    const { inimigos } = todasFichas();
    const padrao = atacantePadrao();
    const quem = h('select', { class: 'cm-in' }, h('option', { value: '', text: 'Mestre (sem ficha)' }),
      inimigos.map((x) => h('option', { value: `${x.tipo}:${x.id}`, selected: `${x.tipo}:${x.id}` === padrao, text: `${TIPOS_FICHA[x.tipo]} · ${tituloFicha(x.tipo, x.id)}` })));
    const dano = h('input', { class: 'cm-in cm-dano-in', type: 'number', min: '0', max: '999', inputmode: 'numeric', placeholder: '0' });
    const txt = h('textarea', { class: 'cm-ta', maxlength: 500, placeholder: 'O que o atacante faz e o que ele acha desse player. Ex.: “Esse chrome barato não vai te salvar” e dispara uma rajada.' });
    const alvoTxt = alvos.map((u) => { const d = (fichaDe(u) || {}).dados || {}; return `${tituloFicha('player', u)}${d[PV] ? ` (PV ${d[PV]})` : ''}`; }).join(', ');
    const enviar = async () => {
      const n = parseInt(dano.value, 10);
      if (!(n >= 0)) { dano.focus(); return; }
      const [t, i] = quem.value ? quem.value.split(':') : [null, null];
      const de = t ? tituloFicha(t, i) : 'Mestre';
      const ok = await salvar(async () => { for (const u of alvos) await col('ataques').add({ alvo: u, de, deTipo: t || 'mestre', texto: txt.value.trim(), dano: n, estado: 'pendente', ts: agora() }); });
      if (ok) { m.fechar(); toast('Ataque', alvos.length === 1 ? `Ataque enviado pra ${nome(alvos[0])}. Agora é com o player: aceitar ou contestar.` : `Ataque enviado pra ${alvos.length} players.`); }
    };
    dano.addEventListener('keydown', (e) => { if (e.key === 'Enter') enviar(); });
    const conta = h('div', { class: 'cm-formula' });
    const pintaConta = () => {
      const n = Math.max(0, parseInt(dano.value, 10) || 0);
      rc(conta, alvos.map((u) => { const pv = parseInt(((fichaDe(u) || {}).dados || {})[PV], 10); const nome2 = tituloFicha('player', u).replace(/ \(.*\)$/, '');
        return h('div', null, isNaN(pv) ? `${nome2}: PV em branco` : [`${nome2}: PV ${pv} − ${n} = `, h('b', { text: String(Math.max(0, pv - n)) }), pv - n <= 0 ? ' ☠' : null]); }));
    };
    dano.addEventListener('input', pintaConta); pintaConta();
    const m = modal('Dano', [
      h('div', { class: 'cm-dano-alvo' }, (() => { const ic = h('span', { class: 'cm-mira-ic' }); ic.innerHTML = MIRA; return ic; })(), h('span', null, h('small', { text: 'Alvo' }), h('b', { text: alvoTxt }))),
      h('label', { class: 'cm-lbl' }, 'Quanto de dano', dano),
      conta,
      h('label', { class: 'cm-lbl' }, 'Quem ataca', quem),
      h('label', { class: 'cm-lbl' }, 'O que acontece', txt),
      h('div', { class: 'cm-sub', text: 'O player vê o ataque na tela e escolhe aceitar o dano ou contestar. Se contestar, você decide se ele conseguiu.' })],
    [btn('Voltar', () => { m.fechar(); abrirAtaque(); }, 'cm-mini'), h('span', { style: 'flex:1' }), btn('Cancelar', () => m.fechar(), 'cm-mini'), btn('Atacar', enviar, 'cm-mini cm-pri')]);
    setTimeout(() => dano.focus(), 50);
  }
  const decidindo = new Set();
  function checarContestados() {
    if (!S.mestre) return;
    for (const a of (S.d.ataques || [])) if (a.estado === 'contestado' && !decidindo.has(a.id)) { decidindo.add(a.id); decidir(a); }
  }
  function decidir(a) {
    decidindo.add(a.id);
    const d = (fichaDe(a.alvo) || {}).dados || {};
    const dano = h('input', { class: 'cm-in', type: 'number', min: '0', inputmode: 'numeric', value: String(a.dano) });
    const m = modal(`${nome(a.alvo)} contestou`, [
      h('div', { class: 'cm-txt', text: `${a.de} atacou ${tituloFicha('player', a.alvo)} com ${a.dano} de dano.` }),
      a.texto ? h('div', { class: 'cm-alerta-txt cm-mini-txt', text: a.texto }) : null,
      h('div', { class: 'cm-txt' }, h('b', { text: 'Ele conseguiu se defender?' })),
      h('label', { class: 'cm-lbl' }, 'Dano que ele leva se não conseguiu', dano),
      h('div', { class: 'cm-sub', text: d[PV] ? `PV atual na ficha: ${d[PV]}` : 'Os Pontos de Vida dele estão em branco na ficha.' })],
    [btn('Depois', () => m.fechar(), 'cm-mini'),
      btn('Conseguiu', async () => { if (await salvar(() => dok('ataques', a.id).update({ estado: 'defendeu', danoFinal: 0, fimTs: agora() }))) m.fechar(); }, 'cm-mini'),
      btn('Não conseguiu', async () => {
        const n = Math.max(0, parseInt(dano.value, 10) || 0);
        await aplicarDanoPlayer(a.alvo, n);
        if (await salvar(() => dok('ataques', a.id).update({ estado: 'falhou', danoFinal: n, fimTs: agora() }))) m.fechar();
      }, 'cm-mini cm-pri')], 'cm-modal-fixo');
  }
  async function aplicarDanoPlayer(uid, n) {
    const f = fichaDe(uid); if (!f || !n) return;
    const dados = { ...(f.dados || {}) }, pv = parseInt(dados[PV], 10);
    if (isNaN(pv)) { toast('Dano', `A ficha de ${nome(uid)} está sem Pontos de Vida. Ajuste na mão.`); return; }
    dados[PV] = String(Math.max(0, pv - n));
    if (R.tipo === 'player' && R.id === uid) { window.__fichaAplicar(dados, [PV]); R.base = assinatura(dados); }
    await salvar(() => S.db.doc(`sessoes/${S.sess.id}/fichas/${uid}`).set({ dados, ts: agora(), por: S.me, nome: dados.NOME || '' }));
  }

