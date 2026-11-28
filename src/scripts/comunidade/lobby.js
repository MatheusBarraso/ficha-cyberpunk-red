  // ---------- lobby: mestre e player ----------
  function assinarLobby() {
    const me = S.me;
    // mestre: as minhas sessões e os pedidos de entrada
    subLob('minhas', S.db.collection(`mestres/${me}/sessoes`), (s) => {
      S.lob.minhas = s.docs.map((d) => ({ ...d.data(), id: d.id, gm: me })).sort((a, b) => (b.criada || 0) - (a.criada || 0));
      for (const ss of S.lob.minhas) subLob('m:' + ss.id, sessRef(me, ss.id).collection('membros'), (q) => { S.lob.membrosDe[ss.id] = Object.fromEntries(q.docs.map((d) => [d.id, d.data()])); });
      if (FB) {
        S.carregou.add('lob:pedidos');
        for (const ss of S.lob.minhas) subLob('p:' + ss.id, sessRef(me, ss.id).collection('pedidos'), (q) => { S.lob.pedFB[ss.id] = Object.fromEntries(q.docs.map((d) => [d.id, d.data()])); juntarPedidos(); });
      }
    });
    if (!FB) subLob('pedidos', S.db.collection('pedidos'), (s) => { S.lob.pedidosTodos = Object.fromEntries(s.docs.map((d) => [d.id, d.data()])); });
    // player: os meus pedidos, e a sessão + situação de cada um
    subLob('meus', S.db.doc('pedidos/' + me), (s) => {
      S.lob.meusPedidos = (s.exists && s.data().itens) || {};
      for (const [sid, it] of Object.entries(S.lob.meusPedidos)) {
        if (!it || it.cancelado || !it.gm) continue;
        subLob('s:' + sid, sessRef(it.gm, sid), (q) => { S.lob.sessDe[sid] = q.exists ? { ...q.data(), id: sid, gm: it.gm } : null; });
        subLob('mm:' + sid, membroRef(it.gm, sid, me), (q) => { S.lob.meuMembro[sid] = q.exists ? q.data() : null; });
      }
    });
  }
  function juntarPedidos() {
    const todos = {};
    for (const [sid, ps] of Object.entries(S.lob.pedFB)) for (const [u, it] of Object.entries(ps)) (todos[u] || (todos[u] = { itens: {} })).itens[sid] = it;
    S.lob.pedidosTodos = todos;
  }
  // cópia do pedido dentro da sessão (só no Firebase): é por ela que o servidor confere a entrada direta
  const espelhar = (gm, sid, it) => (FB ? sessRef(gm, sid).collection('pedidos').doc(S.me).set(it) : Promise.resolve());
  function subLob(chave, q, fn) {
    if (S.subsLob[chave]) return;
    S.subsLob[chave] = sub(q, fn, 'lob:' + chave, null);
  }
  function pendentesDe(sess) {
    const out = [];
    const mem = S.lob.membrosDe[sess.id] || {};
    for (const [u, p] of Object.entries(S.lob.pedidosTodos)) {
      const it = p.itens && p.itens[sess.id];
      if (u === sess.gm || !it || it.cancelado) continue;
      out.push({ uid: u, it, membro: mem[u], estado: acesso(sess, mem[u], it) });
    }
    for (const [u, m] of Object.entries(mem)) if (!out.find((x) => x.uid === u)) out.push({ uid: u, it: null, membro: m, estado: acesso(sess, m, null) });
    return out;
  }
  const contaLobby = () => (S.lob.papel === 'mestre' || !S.sess ? S.lob.minhas.filter((s) => !s.encerrada).reduce((a, s) => a + pendentesDe(s).filter((x) => x.estado === 'pendente').length, 0) : 0);
  // avisos do lobby: pedidos novos (mestre) e respostas aos meus pedidos (player); entrada automática
  function verificarLobby() {
    if (!S.me) return;
    const chaves = new Map();
    S.lob.minhas.filter((s) => !s.encerrada).forEach((s) => pendentesDe(s).forEach((x) => {
      if (x.estado === 'pendente') chaves.set(`p|${s.id}|${x.uid}`, () => toast('Pedido de entrada', h('span', null, spanNome(x.uid), ` quer entrar em “${s.nome}”`), () => { S.lob.papel = 'mestre'; S.lob.ger = s.id; irLobby(); }));
      // aprovação automática registrada pelo mestre quando ele está online
      if (s.aprovacao === 'automatica' && x.estado === 'ok' && !x.membro && !S.lob.gravando) {
        S.lob.gravando = true;
        membroRef(S.me, s.id, x.uid).set({ estado: 'aprovado', ts: agora(), auto: true }).catch(() => {}).finally(() => { S.lob.gravando = false; });
      }
    }));
    for (const [sid, it] of Object.entries(S.lob.meusPedidos)) {
      if (!it || it.cancelado) continue;
      const st = acesso(S.lob.sessDe[sid], S.lob.meuMembro[sid], it);
      if (S.lob.sessDe[sid] !== undefined && st !== 'pendente') chaves.set(`e|${sid}|${st}`, () => toast(it.nome || 'Sessão', st === 'ok' ? 'Entrada liberada. Toque pra entrar.' : ESTADO_TXT[st] + '.', st === 'ok' ? () => entrarSala(it.gm, sid, S.lob.sessDe[sid]) : () => { S.lob.papel = 'player'; irLobby(); }));
    }
    if (!S.lob.conhecidosLob) { if (S.carregou.has('lob:minhas') && S.carregou.has('lob:meus') && S.carregou.has('lob:pedidos')) S.lob.conhecidosLob = new Set(chaves.keys()); return; }
    for (const [k, f] of chaves) if (!S.lob.conhecidosLob.has(k)) { S.lob.conhecidosLob.add(k); f(); }
  }

  function montarLobby(w) {
    S.ui.lob = h('div', { style: 'display:flex;flex-direction:column;gap:12px', 'data-vivo': '' });
    if (S.sess && S.verLobby) w.append(h('div', { class: 'cm-volta' }, h('span', { class: 'cm-volta-txt' }, h('small', { text: 'Você continua na sessão' }), h('b', { text: S.sess.nome || 'Sessão' })),
      btn('Voltar pra sala', () => abrir(), 'cm-mini cm-pri'), btn('Sair dela', () => sairDaSala(), 'cm-mini')));
    w.append(S.ui.lob);
    atualizarLobby();
  }
  function atualizarLobby() {
    const L = S.ui.lob; if (!L) return;
    if (!S.lob.papel) { rc(L, telaEscolha()); return; }
    if (!S.me) {
      if (window.__cmLogin && (S.db || S.erro)) { rc(L, h('div', { class: 'cm-h' }, h('h2', { text: S.lob.papel === 'mestre' ? 'Mestre' : 'Player' }), btn('Trocar', () => trocarPapel(null), 'cm-mini')), h('div', { class: 'cm-caixa cm-login' }, h('div', { class: 'cm-txt', text: 'Entre com a conta Google pra ' + (S.lob.papel === 'mestre' ? 'criar sessões.' : 'entrar numa sessão.') }), btn('Entrar com Google', () => { try { sessionStorage.setItem('cpr-com-poslogin', S.lob.papel || ''); } catch { /* ok */ } window.__cmLogin(); }, 'cm-pri'))); return; }
      rc(L, h('div', { class: 'cm-vazio', text: S.db ? 'Entre com a sua conta do Claude pra usar a Comunidade.' : 'Conectando…' })); return;
    }
    rc(L, S.lob.papel === 'mestre' ? (S.lob.chave !== true ? telaSenha() : S.lob.ger ? painelSessao() : telaMestre()) : telaPlayer());
    resolverNomes();
  }
  function trocarPapel(p) { sairRemota(true); if (p) liberarFicha(); if (p === 'mestre' && S.lob.chave === undefined) conferirChave(); if (S.aberto && !S.db && !S.erro && p) { /* ainda conectando: monta de novo quando chegar */ } S.lob.papel = p; S.lob.ger = null; S.lob.busca = null; try { p ? localStorage.setItem(PAPEL_KEY, p) : localStorage.removeItem(PAPEL_KEY); } catch { /* ok */ } dispatchEvent(new Event('cm-papel')); estadoFicha(); pintarTopo(); montar(); corpo.scrollTop = 0; mudou(); }
  function telaEscolha() {
    const cartao = (cls, tit, txt, p) => h('button', { type: 'button', class: `cm-escolha ${cls}`, onclick: () => trocarPapel(p) },
      h('span', { class: 'cm-esc-tit', text: tit }), h('span', { class: 'cm-esc-txt', text: txt }),
      h('span', { class: 'cm-esc-ir', text: S.lob.ultimo === p ? 'Entrar · última vez' : 'Entrar' }));
    let u = null; try { u = JSON.parse(localStorage.getItem(ULTIMA_KEY) || 'null'); } catch { /* ok */ }
    const cont = S.me && u && u.sid && u.me === S.me && (u.papel === 'player' || S.lob.chave === true)
      ? h('button', { type: 'button', class: 'cm-continuar', onclick: () => entrarComo(u.papel, u.gm, u.sid, null) },
        h('span', { class: 'cm-esc-tit', text: 'Continuar' }), h('span', { class: 'cm-esc-txt' }, h('b', { text: u.nome || 'Última sessão' }), ' · como ' + (u.papel === 'mestre' ? 'Mestre' : 'Player')), h('span', { class: 'cm-esc-ir', text: 'Entrar ›' }))
      : null;
    return [h('div', { class: 'cm-esc-logo' }, h('span', { text: 'FICHA' }), h('b', { text: 'CYBERPUNK RED' })), cont,
      h('div', { class: 'cm-esc-grid' },
        cartao('mestre', 'Mestre', 'Cria a sessão, convida a mesa e cuida da cidade. Precisa da senha.', 'mestre'),
        cartao('player', 'Player', 'Entra na sessão com o código do mestre.', 'player'))];
  }

  // ----- MESTRE -----
  function telaMestre() {
    const out = [h('div', { class: 'cm-h' }, h('h2', { text: 'Suas sessões' }), !S.lob.criando && S.escreve ? btn('＋ Nova sessão', () => { S.lob.criando = true; atualizarLobby(); }, 'cm-mini cm-pri') : null)];
    if (!S.escreve) { out.push(h('div', { class: 'cm-aviso', text: 'Pra criar sessões você precisa de acesso de Colaborador nesta ficha.' })); }
    else if (S.lob.criando) out.push(formSessao());
    const ss = S.lob.minhas;
    if (!S.carregou.has('lob:minhas')) out.push(h('div', { class: 'cm-vazio', text: 'Carregando…' }));
    else if (!ss.length) { if (!S.lob.criando) out.push(h('div', { class: 'cm-vazio', text: 'Nenhuma sessão ainda.' })); }
    else out.push(h('div', { class: 'cm-lista' }, ss.map(cartaoSessaoMestre)));
    return out;
  }
  function cartaoSessaoMestre(s) {
    const ps = pendentesDe(s);
    const pend = ps.filter((x) => x.estado === 'pendente').length;
    const ocup = ocupadas(s, S.lob.membrosDe[s.id], S.lob.pedidosTodos);
    const venc = s.codigoExpira && s.codigoExpira < agora();
    return h('div', { class: 'cm-sessao' + (s.encerrada ? ' cm-off' : '') },
      h('div', { class: 'cm-sessao-info' },
        h('b', { class: 'cm-sessao-nome', text: s.nome }),
        h('span', { class: 'cm-sub' }, s.encerrada ? 'Encerrada' : `${ocup}/${s.limite} jogadores`, pend ? h('span', { class: 'cm-n', text: pend }) : null, pend ? ` pedido${pend === 1 ? '' : 's'}` : null, !s.encerrada && venc ? h('span', { class: 'cm-err', text: ' · código vencido' }) : null)),
      !s.encerrada ? h('span', { class: 'cm-codigo' + (venc ? ' venc' : '') }, h('span', { text: s.codigo })) : null,
      h('div', { class: 'cm-row' }, btn('Gerenciar', () => { S.lob.ger = s.id; atualizarLobby(); corpo.scrollTop = 0; }, 'cm-mini'), !s.encerrada ? btn('Abrir sala', () => entrarSala(s.gm, s.id, s), 'cm-mini cm-pri') : null));
  }
  function formSessao(s) {
    s = s || {};
    const nomeI = h('input', { class: 'cm-in', value: s.nome || '', maxlength: 60, placeholder: 'Ex.: Noites de Cromo' });
    const desc = h('textarea', { class: 'cm-ta', maxlength: 1500, placeholder: 'Do que se trata a campanha, tom, horário da mesa…' }); desc.value = s.descricao || '';
    const lim = h('input', { class: 'cm-in', type: 'number', min: 1, max: 20, value: s.limite || 5 });
    const apr = h('select', { class: 'cm-sel' }, h('option', { value: 'manual', text: 'Eu aprovo cada pedido' }), h('option', { value: 'automatica', text: 'Entra direto com o código' })); apr.value = s.aprovacao || 'manual';
    const val = h('select', { class: 'cm-sel' }, [[1, '1 dia'], [7, '7 dias'], [30, '30 dias'], [0, 'Sem validade']].map(([v, t]) => h('option', { value: v, text: t }))); val.value = String(s.validadeDias != null ? s.validadeDias : 7);
    const ex = h('input', { type: 'checkbox' });
    const lbl = (t, e) => h('label', { class: 'cm-lbl' }, t, e);
    const st = h('span', { class: 'cm-sub' });
    const salvarB = btn(s.id ? 'Salvar' : 'Criar sessão', async () => {
      const nm = nomeI.value.trim(); if (!nm) { nomeI.focus(); return; }
      const limite = Math.max(1, Math.min(20, +lim.value || 5));
      salvarB.disabled = true; st.textContent = 'Salvando…';
      const ok = await salvar(async () => {
        if (s.id) {
          await sessRef(S.me, s.id).update({ nome: nm, descricao: desc.value.trim(), limite, aprovacao: apr.value, validadeDias: +val.value, ts: agora() });
          return;
        }
        const codigo = await novoCodigo();
        const ref = S.db.collection(`mestres/${S.me}/sessoes`).doc();
        await ref.set({ nome: nm, descricao: desc.value.trim(), limite, aprovacao: apr.value, validadeDias: +val.value, codigo, codigoExpira: expiraEm(+val.value), codigosAceitos: [codigo], encerrada: false, gm: S.me, criada: agora(), ts: agora() });
        await S.db.doc('convites/' + codigo).set({ gm: S.me, sid: ref.id, ts: agora() });
        await S.db.doc('sessoes/' + ref.id).set({ gm: S.me, ts: agora() });
        if (ex.checked) await criarExemplo(ref.id);
        S.lob.ger = ref.id;
      });
      salvarB.disabled = false; st.textContent = '';
      if (ok) { S.lob.criando = false; S.lob.editando = false; toast('Sessão', s.id ? 'Salvo.' : 'Sessão criada.'); atualizarLobby(); }
    }, 'cm-pri');
    return h('div', { class: 'cm-caixa' }, h('div', { class: 'cm-faixa', text: s.id ? 'Editar sessão' : 'Nova sessão' }),
      lbl('Nome da campanha', nomeI), lbl('Descrição', desc),
      h('div', { class: 'cm-grid', style: 'grid-template-columns:repeat(auto-fill,minmax(180px,1fr))' }, lbl('Limite de jogadores', lim), lbl('Entrada', apr), lbl('Validade do código', val)),
      !s.id ? h('label', { class: 'cm-row cm-check' }, ex, 'Incluir cidade de exemplo') : null,
      h('div', { class: 'cm-row' }, salvarB, st, h('span', { style: 'flex:1' }), btn('Cancelar', () => { S.lob.criando = false; S.lob.editando = false; atualizarLobby(); }, 'cm-mini')));
  }
  function painelSessao() {
    const s = S.lob.minhas.find((x) => x.id === S.lob.ger);
    if (!s) { S.lob.ger = null; return telaMestre(); }
    const ps = pendentesDe(s);
    const ocup = ocupadas(s, S.lob.membrosDe[s.id], S.lob.pedidosTodos);
    const lotada = ocup >= s.limite;
    const venc = s.codigoExpira && s.codigoExpira < agora();
    const out = [h('div', { class: 'cm-row' }, btn('← Suas sessões', () => { S.lob.ger = null; S.lob.editando = false; atualizarLobby(); }, 'cm-mini')),
      h('div', { class: 'cm-h' }, h('h2', { text: s.nome }), s.encerrada ? h('span', { class: 'cm-tag', text: 'Encerrada' }) : null, !s.encerrada ? btn('Abrir sala', () => entrarSala(S.me, s.id, s), 'cm-mini cm-pri') : null)];
    if (s.descricao) out.push(h('div', { class: 'cm-txt', text: s.descricao }));
    // convite
    if (!s.encerrada) out.push(h('div', { class: 'cm-caixa' }, h('div', { class: 'cm-faixa', text: 'Código de convite' }),
      h('div', { class: 'cm-codigo grande' + (venc ? ' venc' : '') }, h('span', { text: s.codigo })),
      h('div', { class: 'cm-meta' }, s.codigoExpira ? (venc ? h('span', { class: 'cm-err', text: 'Vencido' }) : h('span', { text: `Vale até ${new Date(s.codigoExpira).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` })) : h('span', { text: 'Sem validade' }), h('span', { text: '·' }), h('span', { text: s.aprovacao === 'automatica' ? 'Entra direto' : 'Você aprova cada pedido' })),
      h('div', { class: 'cm-row' }, btn('Copiar código', () => copiar(s.codigo, 'Código copiado.'), 'cm-mini cm-pri'), btn('Compartilhar', () => compartilhar(s), 'cm-mini'),
        btn('Renovar código', async () => {
          if (!(await confirmar('Gerar um código novo? O atual para de valer pra novas entradas (quem já está na sessão continua).', 'Renovar'))) return;
          await salvar(async () => {
            const c = await novoCodigo();
            await S.db.doc('convites/' + c).set({ gm: S.me, sid: s.id, ts: agora() });
            await sessRef(S.me, s.id).update({ codigo: c, codigoExpira: expiraEm(s.validadeDias), codigosAceitos: [...(s.codigosAceitos || []), c].slice(-20), ts: agora() });
            try { await S.db.doc('convites/' + s.codigo).delete(); } catch { /* ok */ }
            toast('Convite', `Código novo: ${c}`);
          });
        }, 'cm-mini'))));
    // jogadores
    const pend = ps.filter((x) => x.estado === 'pendente');
    const dentro = ps.filter((x) => x.estado === 'ok');
    const fora = ps.filter((x) => x.estado === 'removido' || x.estado === 'recusado');
    const linha = (x, ...acoes) => h('div', { class: 'cm-jog' }, avatar(nome(x.uid)), h('div', { style: 'flex:1;min-width:0;display:flex;flex-direction:column' }, spanNome(x.uid), h('span', { class: 'cm-sub', text: (S.d.perfis[x.uid] && S.d.perfis[x.uid].personagem) || (x.it ? `pediu ${quando(x.it.ts)}` : '') })), ...acoes);
    const marca = (x, estado) => salvar(() => membroRef(S.me, s.id, x.uid).set({ estado, ts: agora() }));
    if (pend.length) out.push(h('div', { class: 'cm-caixa' }, h('div', { class: 'cm-faixa', text: `Pedidos de entrada (${pend.length})` }),
      lotada ? h('div', { class: 'cm-err', text: `Lotada (${ocup}/${s.limite}). Aumente o limite ou remova alguém.` }) : null,
      pend.map((x) => linha(x, btn('Aprovar', () => marca(x, 'aprovado'), 'cm-mini cm-pri', lotada), btn('Recusar', () => marca(x, 'recusado'), 'cm-mini cm-perigo')))));
    out.push(h('div', { class: 'cm-caixa' }, h('div', { class: 'cm-faixa', text: `Jogadores ${ocup}/${s.limite}` }),
      dentro.length ? dentro.map((x) => linha(x, btn('Remover', async () => { if (await confirmar(`Remover ${nome(x.uid)} da sessão?`, 'Remover')) marca(x, 'removido'); }, 'cm-mini cm-perigo'))) : h('div', { class: 'cm-sub', text: 'Ninguém entrou ainda.' }),
      fora.length ? [h('div', { class: 'cm-divisa', text: 'Removidos e recusados' }), ...fora.map((x) => linha(x, h('span', { class: 'cm-tag', text: x.estado === 'removido' ? 'Removido' : 'Recusado' }), btn('Readmitir', () => marca(x, 'aprovado'), 'cm-mini', lotada)))] : null));
    // dados da sessão
    out.push(S.lob.editando ? formSessao(s) : h('div', { class: 'cm-caixa' }, h('div', { class: 'cm-faixa', text: 'Configuração' }),
      h('div', { class: 'cm-campos' },
        h('div', { class: 'cm-campo' }, h('small', { text: 'Limite' }), h('b', { text: `${s.limite} jogador${s.limite === 1 ? '' : 'es'}` })),
        h('div', { class: 'cm-campo' }, h('small', { text: 'Entrada' }), h('b', { text: s.aprovacao === 'automatica' ? 'Direta' : 'Com aprovação' })),
        h('div', { class: 'cm-campo' }, h('small', { text: 'Código vale' }), h('b', { text: s.validadeDias ? `${s.validadeDias} dia${s.validadeDias === 1 ? '' : 's'}` : 'Sempre' }))),
      h('div', { class: 'cm-row' }, btn('Editar', () => { S.lob.editando = true; atualizarLobby(); }, 'cm-mini'))));
    out.push(h('div', { class: 'cm-row', style: 'justify-content:flex-end' }, s.encerrada
      ? btn('Reabrir sessão', () => salvar(async () => { const c = await novoCodigo(); await S.db.doc('convites/' + c).set({ gm: S.me, sid: s.id, ts: agora() }); await sessRef(S.me, s.id).update({ encerrada: false, codigo: c, codigoExpira: expiraEm(s.validadeDias), codigosAceitos: [...(s.codigosAceitos || []), c].slice(-20), ts: agora() }); }), 'cm-mini')
      : btn('Encerrar sessão', async () => {
        if (!(await confirmar(`Encerrar “${s.nome}”? Os jogadores saem da sala e o código para de valer. Dá pra reabrir depois.`, 'Encerrar'))) return;
        await salvar(async () => { await sessRef(S.me, s.id).update({ encerrada: true, ts: agora() }); try { await S.db.doc('convites/' + s.codigo).delete(); } catch { /* ok */ } });
      }, 'cm-mini cm-perigo')));
    return out;
  }

  // ----- PLAYER -----
  function telaPlayer() {
    const out = [h('div', { class: 'cm-h' }, h('h2', { text: 'Entrar numa sessão' }))];
    const inp = h('input', { class: 'cm-in cm-in-codigo', placeholder: 'XXXX-XXXX', maxlength: 12, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'Código da sessão', value: (S.lob.busca && S.lob.busca.codigo) || '' });
    inp.addEventListener('input', () => { const p = inp.selectionStart; inp.value = inp.value.toUpperCase(); inp.setSelectionRange(p, p); });
    const ir = btn('Buscar sessão', () => buscarCodigo(inp.value), 'cm-pri');
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ir.click(); });
    out.push(h('div', { class: 'cm-caixa' }, h('div', { class: 'cm-faixa', text: 'Código do mestre' }),
      h('div', { class: 'cm-row', style: 'flex-wrap:nowrap' }, inp, ir), S.lob.busca && S.lob.busca.msg ? h('div', { class: S.lob.busca.erro ? 'cm-err' : 'cm-sub', role: 'status', text: S.lob.busca.msg }) : null));
    if (S.lob.busca && S.lob.busca.sess) out.push(cartaoEncontrada(S.lob.busca));
    const minhas = Object.entries(S.lob.meusPedidos).filter(([, it]) => it && !it.cancelado);
    if (!S.carregou.has('lob:meus')) out.push(h('div', { class: 'cm-vazio', text: 'Carregando…' }));
    else if (minhas.length) out.push(h('div', { class: 'cm-faixa', text: 'Minhas sessões' }), h('div', { class: 'cm-lista' }, minhas.map(([sid, it]) => {
      const ss = S.lob.sessDe[sid];
      const st = ss === undefined ? 'carregando' : acesso(ss, S.lob.meuMembro[sid], it);
      return h('div', { class: 'cm-sessao' + (st === 'ok' ? '' : ' cm-off') },
        h('div', { class: 'cm-sessao-info' }, h('b', { class: 'cm-sessao-nome', text: (ss && ss.nome) || it.nome || 'Sessão' }),
          h('span', { class: 'cm-sub' }, st === 'carregando' ? '…' : ESTADO_TXT[st], ' · mestre ', spanNome(it.gm))),
        h('div', { class: 'cm-row' }, st === 'ok' ? btn('Entrar na sala', () => entrarSala(it.gm, sid, ss), 'cm-mini cm-pri') : null,
          btn(st === 'pendente' ? 'Cancelar pedido' : 'Tirar', () => cancelarPedido(sid), 'cm-mini')));
    })));
    return out;
  }
  async function buscarCodigo(txt) {
    const codigo = limparCodigo(txt);
    const fim = (msg, erro = true, extra = {}) => { S.lob.busca = { codigo, msg, erro, ...extra }; atualizarLobby(); };
    if (!codigoValido(codigo)) return fim('Código inválido. São 8 letras e números, tipo ABCD-2345.');
    S.lob.busca = { codigo, msg: 'Procurando…', erro: false }; atualizarLobby();
    try {
      const cv = await S.db.doc('convites/' + codigo).get();
      if (!cv.exists) return fim('Nenhuma sessão com esse código. Confira com o mestre: ele pode ter renovado ou encerrado.');
      const { gm, sid } = cv.data() || {};
      if (!gm || !sid) return fim('Esse convite está quebrado. Peça um código novo ao mestre.');
      const ss = await sessRef(gm, sid).get();
      if (!ss.exists) return fim('A sessão desse código não existe mais.');
      const sess = { ...ss.data(), id: sid, gm };
      if (sess.codigo !== codigo) return fim('Esse código foi trocado pelo mestre. Peça o novo.');
      if (sess.encerrada) return fim('Essa sessão foi encerrada.');
      if (sess.codigoExpira && sess.codigoExpira < agora()) return fim('Esse código expirou. Peça ao mestre pra renovar.');
      if (gm === S.me) return fim('Essa sessão é sua: entre por Mestre.', true);
      const [mem, ped] = await Promise.all([sessRef(gm, sid).collection('membros').get(), FB ? sessRef(gm, sid).collection('pedidos').get() : S.db.collection('pedidos').get()]);
      const membros = Object.fromEntries(mem.docs.map((d) => [d.id, d.data()]));
      const pedidos = FB ? Object.fromEntries(ped.docs.map((d) => [d.id, { itens: { [sid]: d.data() } }])) : Object.fromEntries(ped.docs.map((d) => [d.id, d.data()]));
      const ocup = ocupadas(sess, membros, pedidos);
      fim('', false, { sess, ocup, meuMembro: membros[S.me] || null });
    } catch (e) { fim('Não deu pra validar agora. Confira a conexão e tente de novo.'); }
  }
  function cartaoEncontrada(b) {
    const s = b.sess, it = S.lob.meusPedidos[s.id];
    const st = acesso(s, S.lob.meuMembro[s.id] !== undefined ? S.lob.meuMembro[s.id] : b.meuMembro, it);
    const lotada = b.ocup >= s.limite && st !== 'ok';
    const acao = st === 'ok' ? btn('Entrar na sala', () => entrarSala(s.gm, s.id, s), 'cm-pri')
      : st === 'pendente' ? h('div', { class: 'cm-sub', text: 'Pedido enviado. Aparece um aviso quando o mestre aprovar.' })
      : st === 'removido' || st === 'recusado' ? h('div', { class: 'cm-err', text: ESTADO_TXT[st] + ' nesta sessão.' })
      : lotada ? h('div', { class: 'cm-err', text: `Sessão lotada (${b.ocup}/${s.limite}).` })
      : btn(s.aprovacao === 'automatica' ? 'Confirmar entrada' : 'Solicitar entrada', () => pedirEntrada(s, b.codigo), 'cm-pri');
    return h('div', { class: 'cm-caixa cm-entra' }, h('div', { class: 'cm-faixa', text: 'Sessão encontrada' }),
      h('div', { class: 'cm-sessao-nome cm-nome', text: s.nome }),
      h('div', { class: 'cm-meta' }, h('span', null, 'Mestre ', spanNome(s.gm)), h('span', { text: `${b.ocup}/${s.limite} jogadores` }), h('span', { text: s.aprovacao === 'automatica' ? 'entrada direta' : 'o mestre aprova' })),
      s.descricao ? h('div', { class: 'cm-txt', text: s.descricao }) : null, acao);
  }
  async function pedirEntrada(sess, codigo) {
    const atual = { ...S.lob.meusPedidos };
    atual[sess.id] = { gm: sess.gm, codigo, nome: sess.nome, ts: agora() };
    const ok = await salvar(async () => { await espelhar(sess.gm, sess.id, atual[sess.id]); await S.db.doc('pedidos/' + S.me).set({ itens: atual, ts: agora() }); });
    if (!ok) return;
    S.lob.meusPedidos = atual;
    if (sess.aprovacao === 'automatica' && (sess.codigosAceitos || []).includes(codigo)) { toast('Sessão', 'Entrada liberada.'); entrarSala(sess.gm, sess.id, sess); }
    else { toast('Sessão', 'Pedido enviado ao mestre.'); atualizarLobby(); }
  }
  async function cancelarPedido(sid) {
    if (!(await confirmar('Tirar essa sessão da sua lista?', 'Tirar'))) return;
    const atual = { ...S.lob.meusPedidos };
    if (atual[sid]) atual[sid] = { ...atual[sid], cancelado: true, ts: agora() };
    if (await salvar(async () => { if (atual[sid] && atual[sid].gm) { try { await espelhar(atual[sid].gm, sid, atual[sid]); } catch { /* sessão apagada */ } } await S.db.doc('pedidos/' + S.me).set({ itens: atual, ts: agora() }); })) { S.lob.meusPedidos = atual; atualizarLobby(); }
  }

