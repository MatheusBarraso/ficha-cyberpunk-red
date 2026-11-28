  // ----- menu de combate -----
  // blocos de um lado: quem está na ordem vem primeiro, com o número; quem não está fica apagado no fim
  function grupoCombate(tit, lado, o) {
    const dentro = (o ? o.lista.map((x, n) => ({ x, n })) : []).filter(({ x }) => ladoDe(x.tipo, x.id) === lado);
    return h('div', { class: 'cm-fb-grupo cm-lado-' + lado },
      h('div', { class: 'cm-faixa cm-faixa-' + lado, text: `${tit} (${dentro.length})` }),
      h('div', { class: 'cm-fb-grade' },
        dentro.map(({ x, n }) => blocoFicha(x.tipo, x.id, { num: n + 1, lado: true, tirar: true })),
        h('button', { type: 'button', class: 'cm-fb cm-fb-novo cm-fb-add', onclick: () => abrirAddCombate(lado) },
          h('b', { text: '+' }), h('span', { text: lado === 'aliado' ? 'Adicionar aliado' : 'Adicionar inimigo' }))));
  }
  const ESTADO_AT = { pendente: 'esperando resposta', aceito: 'aceitou o dano', contestado: 'contestou', defendeu: 'se defendeu', falhou: 'não se defendeu' };
  function pintarCombate() {
    const o = ordem();
    const linhaOrdem = (x, k) => {
      const reg = registroDe(x.tipo, x.id), d = (reg && reg.dados) || {};
      return h('button', { type: 'button', class: 'cm-cb-item' + (o.vez === k ? ' cm-vez' : ''), disabled: !reg, onclick: () => abrirFicha(x.tipo, x.id) },
        h('span', { class: 'cm-ordem-n', text: k + 1 }), h('span', { class: `cm-ml-tag cm-ml-${x.tipo}`, text: SIGLA[x.tipo] }),
        h('span', { class: 'cm-ml-nome', text: tituloFicha(x.tipo, x.id) }),
        o.vez === k ? h('span', { class: 'cm-cb-vez', text: 'Vez' }) : null,
        SISTEMA.recursos.ataque ? h('span', { class: 'cm-ml-pv', text: d[PV] ? `PV ${d[PV]}` : 'PV —' }) : null);
    };
    const cont = (S.d.ataques || []).filter((a) => a.estado === 'contestado');
    const lados = porLado();
    const ult = (S.d.ataques || []).slice(0, 12);
    const resolvidos = (S.d.ataques || []).filter((a) => a.estado !== 'pendente' && a.estado !== 'contestado');
    rc(S.ui.area,
      h('div', { class: 'cm-cb-acoes' },
        SISTEMA.recursos.ataque ? btn('Atacar / aplicar dano', () => abrirAtaque(), 'cm-pri') : null,
        btn('Alertar players', abrirAlerta),
        o ? btn('Editar ordem', abrirOrdem) : null),
      cont.length ? h('div', { class: 'cm-fb-grupo' }, h('div', { class: 'cm-faixa', text: `Contestaram (${cont.length})` }),
        h('div', { class: 'cm-lista' }, cont.map((a) => h('div', { class: 'cm-linha cm-linha-fixa' },
          h('span', { class: 'cm-rot', text: `${a.dano} dano` }),
          h('span', { class: 'cm-linha-txt' }, h('b', { text: `${nome(a.alvo)} contestou` }), h('small', { text: `${a.de}${a.texto ? ': ' + corte(a.texto, 60) : ''}` })),
          btn('Decidir', () => decidir(a), 'cm-mini cm-pri'))))) : null,
      o ? h('div', { class: 'cm-cb-vezbar' },
        h('div', { class: 'cm-ml-vez-tit' }, h('small', { text: `Rodada ${o.rodada || 1} · ${o.vez + 1} de ${o.lista.length}` }), h('b', { text: o.lista[o.vez] ? 'Vez de ' + tituloFicha(o.lista[o.vez].tipo, o.lista[o.vez].id) : '' })),
        h('div', { class: 'cm-row' }, btn('‹ Anterior', () => passarVez(-1), 'cm-mini'), btn('Próxima vez ›', () => passarVez(1), 'cm-pri'),
          btn('Encerrar combate', async () => { if (await confirmar('Encerrar o combate e apagar a ordem de jogada?', 'Encerrar')) await salvar(() => dok('mestreEstado', 'ordem').delete()); }, 'cm-mini cm-perigo')))
        : nota('Tiroteio de sexta à noite', 'Ninguém no combate ainda. Toque em “Adicionar aliado” ou “Adicionar inimigo” pra escolher quem entra. A ordem em que você adiciona vira a ordem de jogada.'),
      grupoCombate('Aliados', 'aliado', o),
      grupoCombate('Inimigos', 'inimigo', o),
      h('div', { class: 'cm-fb-grupo' }, h('div', { class: 'cm-faixa', text: 'Últimos ataques' }),
        ult.length ? h('div', { class: 'cm-lista' }, ult.map((a) => h('div', { class: 'cm-linha cm-linha-fixa cm-at-' + a.estado },
          h('span', { class: 'cm-rot', text: a.estado === 'falhou' ? `−${a.danoFinal} PV` : a.estado === 'aceito' ? `−${a.dano} PV` : `${a.dano} dano` }),
          h('span', { class: 'cm-linha-txt' }, h('b', { text: `${a.de} → ${nome(a.alvo)}` }), h('small', { text: ESTADO_AT[a.estado] || a.estado })),
          h('span', { class: 'cm-quando', text: quando(a.fimTs || a.respTs || a.ts) }))))
          : h('div', { class: 'cm-vazio', text: 'Nenhum ataque ainda.' }),
        resolvidos.length ? h('div', { class: 'cm-row' }, btn('Limpar os resolvidos', async () => { await salvar(async () => { for (const a of resolvidos) await dok('ataques', a.id).delete(); }); }, 'cm-mini')) : null));
  }
  const nota = (tit, txt) => h('aside', { class: 'cm-nota' }, h('b', { text: tit }), h('p', { text: txt }));
  function blocoFicha(tipo, id, op = {}) {
    const f = registroDe(tipo, id), d = (f && f.dados) || {};
    const tit = d.NOME || (tipo === 'player' ? nome(id) : `${TIPOS_FICHA[tipo]} sem nome`);
    const linhas = [tipo === 'player' && d.NOME ? nome(id) : null, d.PAPEL || null].filter(Boolean);
    const stats = [['REF', d.REF], ['DES', d.DES], ['TCO', d.TCO], ['PB', d['PB 1']]].filter(([, v]) => v !== undefined && v !== '');
    const pv = d['PONTOS DE VIDA'];
    const abrirEste = () => { if (f) abrirFicha(tipo, id); };
    const morreu = morta(tipo, id);
    return h('div', { class: 'cm-fb-w' + (naVez(tipo, id) ? ' cm-vez' : '') + (op.fora ? ' cm-fb-fora' : '') + (op.olho && oculta(tipo, id) ? ' cm-fb-oculta' : '') + (morreu ? ' cm-fb-morta' : '') }, h('div', { class: `cm-fb cm-fb-${tipo}` + (f ? '' : ' cm-fb-off'), role: 'button', tabindex: f ? '0' : '-1', 'aria-disabled': f ? null : 'true',
      onclick: abrirEste, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirEste(); } } },
      h('div', { class: 'cm-fb-topo' }, op.num ? h('span', { class: 'cm-fb-num', text: op.num + 'º' }) : null, h('span', { text: TIPOS_FICHA[tipo] }),
        op.lado && tipo !== 'player' && tipo !== 'demo' ? h('button', { type: 'button', class: 'cm-fb-lado', title: 'Trocar de lado', text: ladoDe(tipo, id) === 'aliado' ? '→ inimigo' : '→ aliado', onclick: (e) => { e.stopPropagation(); trocarLado(id); } }) : null,
        op.olho ? (() => { const fav = favorita(tipo, id); const b = h('button', { type: 'button', class: 'cm-fb-olho cm-fb-estrela' + (fav ? ' on' : ''), title: fav ? 'Tirar da frente' : 'Deixar sempre na frente', 'aria-label': fav ? 'Tirar a estrela' : 'Marcar com estrela', onclick: (e) => { e.stopPropagation(); alternarMarca('favoritas', tipo, id); } }); b.innerHTML = ESTRELA.replace('FILL', fav ? 'currentColor' : 'none'); return b; })() : null,
        op.olho ? (() => { const mm = marcada('mortas', tipo, id), pz = pvZerado(tipo, id); const b = h('button', { type: 'button', class: 'cm-fb-olho cm-fb-matar' + (mm || pz ? ' on' : ''), title: pz && !mm ? 'Morta (PV 0)' : mm ? 'Marcar como viva' : 'Marcar como morta', 'aria-label': mm ? 'Marcar como viva' : 'Marcar como morta', onclick: (e) => { e.stopPropagation(); if (pz && !mm) { toast('Ficha', 'Ela está morta porque os Pontos de Vida estão em 0. Pra voltar, aumente a vida na ficha.'); return; } alternarMarca('mortas', tipo, id); } }); b.innerHTML = CAVEIRA; return b; })() : null,
        op.olho ? (() => { const b = h('button', { type: 'button', class: 'cm-fb-olho', title: oculta(tipo, id) ? 'Mostrar ficha' : 'Ocultar ficha', 'aria-label': oculta(tipo, id) ? 'Mostrar ficha' : 'Ocultar ficha', onclick: (e) => { e.stopPropagation(); alternarOculta(tipo, id); } }); b.innerHTML = oculta(tipo, id) ? OLHO_X : OLHO; return b; })() : null,
        op.tirar ? h('button', { type: 'button', class: 'cm-fb-x', title: 'Tirar do combate', 'aria-label': 'Tirar do combate', text: '×', onclick: (e) => { e.stopPropagation(); tirarDoCombate({ tipo, id }); } }) : null,
        !op.lado && tipo !== 'player' ? h('button', { type: 'button', class: 'cm-fb-x', title: 'Apagar ficha', 'aria-label': 'Apagar ficha', text: '×', onclick: (e) => { e.stopPropagation(); apagarFicha(tipo, id); } }) : null),
      h('div', { class: 'cm-fb-corpo' },
        h('div', { class: 'cm-fb-foto' }, d.__img ? h('img', { src: d.__img, alt: '' }) : iniciais(tit), morreu ? caveira('cm-caveira cm-fb-cav') : null),
        h('div', { class: 'cm-fb-txt' }, h('b', { text: tit }), linhas.map((l) => h('small', { text: l })),
          stats.length ? h('span', { class: 'cm-fb-stats' }, stats.map(([k, v], i) => [i ? h('i', { text: ' • ' }) : null, h('span', {}, h('em', { text: k }), ' ' + v)])) : null)),
      favorita(tipo, id) ? h('span', { class: 'cm-fb-fav', title: 'Sempre na frente', text: '★' }) : null,
      h('div', { class: 'cm-fb-pe' },
        morreu ? h('span', { class: 'cm-fb-pv cm-fb-morto' }, caveira(), 'Morta') : pv ? h('span', { class: 'cm-fb-pv', text: `PV ${pv}` }) : null,
        h('span', { text: !f ? 'a ficha ainda não chegou: peça pro player abrir o site de novo' : (f.por === S.me ? 'você mexeu ' : 'atualizada ') + quando(f.ts) }))));
  }
  const blocoNovo = (tipo) => h('button', { type: 'button', class: 'cm-fb cm-fb-novo', onclick: () => novaFicha(tipo) },
    h('b', { text: '+' }), h('span', { text: tipo === 'npc' ? 'Nova ficha de NPC' : 'Nova ficha de monstro' }));

  ligarMenu();
  addEventListener('cm-asset', () => mudou());
  iniciar();
})();
