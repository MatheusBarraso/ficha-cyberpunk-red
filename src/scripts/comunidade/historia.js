  // ---------- HISTÓRIA: mural + mapa num quadro só (texto, imagem e desenho em cima de uma grade) ----------
  // Cada coisa no quadro é um documento em sessoes/{sid}/quadro: texto, imagem ou traço. Todo mundo da mesa escreve;
  // cada um mexe no que é seu e o mestre mexe em tudo. As imagens ficam ATRÁS da grade; o mestre escolhe a cor da grade e do fundo.
  const QW = 3200, QH = 2000;                    // tamanho do quadro (unidades do quadro)
  const Q_CORES = ['auto', '#111111', '#ffffff', '#cf2b21', '#f2a900', '#05d9e8', '#3fae5a', '#9b59cf', '#ff2a6d'];
  const Q_ESP = [['Fino', 4], ['Médio', 9], ['Grosso', 18]];
  const Q_TAM = [['P', 28], ['M', 42], ['G', 68]];
  const Q_FUNDOS = [['Rede (padrão)', '#0d1016', 'tema'], ['Claro', '#f4f1ea', '#c9c3b6'], ['Escuro', '#15161a', '#3a3d46'], ['Papel vermelho', '#fbe9e4', '#e3a597'], ['Azul planta', '#0f2238', '#2d5a86']];
  const qPode = (it) => !!S.me && S.escreve && (S.mestre || it.autor === S.me);
  const qConf = () => ({ fundo: '#0d1016', grade: 'tema', ...((S.d.quadroConf) || {}) });
  const qGrade = (g) => (!g || g === 'tema' ? 'color-mix(in srgb,var(--red) 45%,transparent)' : g);
  // cor "auto": preto em fundo claro, branco em fundo escuro (continua legível se o mestre trocar o fundo)
  const qTinta = () => { const f = (qConf().fundo || '#ffffff').replace('#', ''); const n = parseInt(f.length === 3 ? f.replace(/./g, '$&$&') : f, 16); const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; return l < 0.5 ? '#f2f2f2' : '#111111'; };
  const qCorReal = (c) => (!c || c === 'auto' ? qTinta() : c);
  const qPts = (pts) => { let d = ''; for (let i = 0; i < pts.length; i += 2) d += (i ? 'L' : 'M') + pts[i] + ' ' + pts[i + 1]; return d; };
  function qCoord(e) {
    const t = S.ui.qTabua.getBoundingClientRect(), z = S.qz || 0.4;
    return { x: Math.round((e.clientX - t.left) / z), y: Math.round((e.clientY - t.top) / z) };
  }
  function qAjustar() {
    const v = S.ui.qVista; if (!v) return;
    S.qz = Math.max(0.1, Math.min(2, Math.max(v.clientWidth / QW, v.clientHeight / QH)));
    pintarQuadro(); v.scrollLeft = 0; v.scrollTop = 0;
  }
  function qZoom(f, cx, cy) {
    const v = S.ui.qVista; if (!v) return;
    const r = v.getBoundingClientRect(), z0 = S.qz || 0.4;
    if (cx == null) { cx = r.left + v.clientWidth / 2; cy = r.top + v.clientHeight / 2; }
    const bx = (v.scrollLeft + cx - r.left) / z0, by = (v.scrollTop + cy - r.top) / z0;
    S.qz = Math.max(0.1, Math.min(2, z0 * f));
    pintarQuadro();
    v.scrollLeft = bx * S.qz - (cx - r.left); v.scrollTop = by * S.qz - (cy - r.top);
  }
  SECOES.historia = {
    montar(w) {
      const top = h('div', { class: 'cm-h' }, h('h2', { text: 'História' }));
      if (S.mestre) top.append(S.ui.denBtn = btn('Denúncias', () => { S.verDen = !S.verDen; atualizar(); }, 'cm-mini'));
      w.append(top);
      S.ui.qDen = h('div', { class: 'cm-lista', hidden: true });
      w.append(S.ui.qDen);
      if (!S.qFerr) { S.qFerr = 'mover'; S.qCor = 'auto'; S.qEsp = 9; S.qTam = 42; }
      // barra de ferramentas
      const ferr = (k, t, ic) => h('button', { type: 'button', class: 'cm-qf' + (S.qFerr === k ? ' on' : ''), 'data-f': k, 'aria-pressed': String(S.qFerr === k), title: t, onclick: () => { S.qFerr = k; S.qSel = null; pintarBarraQ(); pintarQuadro(); } }, h('span', { 'aria-hidden': 'true', text: ic }), t);
      const arq = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
      arq.addEventListener('change', async () => {
        const f = arq.files && arq.files[0]; arq.value = ''; if (!f) return;
        toast('História', 'Enviando a imagem…');
        await salvar(async () => {
          let iw = 800, ih = 600; try { const b = await createImageBitmap(f); iw = b.width; ih = b.height; } catch { /* ok */ }
          const id = await enviarImagem(f, 1800);
          const v = S.ui.qVista, z = S.qz || 0.4;
          const w0 = Math.min(1000, iw), h0 = Math.round(w0 * ih / iw);
          const cx = v ? (v.scrollLeft + v.clientWidth / 2) / z : QW / 2, cy = v ? (v.scrollTop + v.clientHeight / 2) / z : QH / 2;
          await col('quadro').add({ tipo: 'imagem', img: id, x: Math.round(cx - w0 / 2), y: Math.round(cy - h0 / 2), w: w0, h: h0, autor: S.me, ts: agora() });
        });
        S.qFerr = 'mover'; pintarBarraQ();
      });
      const ICO = {
        mover: '<path d="M12 2l3 3h-2v4h4V7l3 3-3 3v-2h-4v4h2l-3 3-3-3h2v-4H7v2l-3-3 3-3v2h4V5H9z"/>',
        texto: '<path d="M5 4h14v4h-2V6h-4v12h2v2H9v-2h2V6H7v2H5z"/>',
        lapis: '<path d="M16.5 3.5l4 4L8 20H4v-4zM14.8 5.2l4 4"/>',
        borracha: '<path d="M15 3l6 6-9.5 9.5H6L3 15.5zM9 9l6 6M12 20h9"/>',
        imagem: '<path d="M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 9.5a1.5 1.5 0 1 0 0-.01"/>',
      };
      const icone = (k) => { const sp = h('span', { class: 'cm-qico', 'aria-hidden': 'true' }); sp.innerHTML = `<svg viewBox="0 0 24 24">${ICO[k]}</svg>`; return sp; };
      const ferrB = (k, t, fn) => h('button', { type: 'button', class: 'cm-qdb' + (S.qFerr === k ? ' on' : ''), 'data-f': k, 'aria-pressed': String(S.qFerr === k), title: t, 'aria-label': t,
        onclick: fn || (() => { S.qFerr = k; S.qSel = null; pintarBarraQ(); pintarQuadro(); }) }, icone(k), h('span', { class: 'cm-qdl', text: t }));
      S.ui.qDoca = h('div', { class: 'cm-qdoca', role: 'toolbar', 'aria-label': 'Ferramentas do quadro' });
      S.ui.qOpc = h('div', { class: 'cm-qopc' });
      S.ui.qSelB = h('div', { class: 'cm-qselb' });
      S.ui.qZoomB = h('div', { class: 'cm-qzoomb' });
      const pintarBarraQ = () => {
        const pode = !!S.me && S.escreve;
        const sel = S.qSel && (S.d.quadro || []).find((x) => x.id === S.qSel);
        rc(S.ui.qDoca, ferrB('mover', 'Mover'), pode ? [ferrB('texto', 'Texto'), ferrB('lapis', 'Desenhar'), ferrB('borracha', 'Borracha'), ferrB('imagem', 'Imagem', () => arq.click())] : null, arq);
        const mostraOpc = pode && ['texto', 'lapis'].includes(S.qFerr);
        S.ui.qOpc.hidden = !mostraOpc;
        if (mostraOpc) rc(S.ui.qOpc,
          h('div', { class: 'cm-qcores' }, Q_CORES.map((c) => h('button', { type: 'button', class: 'cm-qcor' + (S.qCor === c ? ' on' : '') + (c === 'auto' ? ' cm-qauto' : ''), style: `--c:${c === 'auto' ? qTinta() : c}`, 'aria-label': c === 'auto' ? 'Cor automática (contrasta com o fundo)' : `Cor ${c}`, title: c === 'auto' ? 'Automática: contrasta com o fundo' : c, onclick: () => { S.qCor = c; pintarBarraQ(); } }))),
          h('div', { class: 'cm-qtams' }, (S.qFerr === 'lapis' ? Q_ESP : Q_TAM).map(([n, v]) => {
            const on = S.qFerr === 'lapis' ? S.qEsp === v : S.qTam === v;
            return h('button', { type: 'button', class: 'cm-qtam' + (on ? ' on' : ''), title: n, 'aria-label': n, onclick: () => { if (S.qFerr === 'lapis') S.qEsp = v; else S.qTam = v; pintarBarraQ(); } },
              S.qFerr === 'lapis' ? h('i', { style: `height:${Math.max(2, v / 3)}px` }) : h('b', { text: 'Aa', style: `font-size:${10 + v / 6}px` }));
          })));
        S.ui.qSelB.hidden = !(sel && qPode(sel));
        if (sel && qPode(sel)) rc(S.ui.qSelB, sel.tipo === 'texto' ? h('button', { type: 'button', class: 'cm-qsb', text: 'Editar', onclick: () => qEditarTexto(sel) }) : null,
          h('button', { type: 'button', class: 'cm-qsb cm-qsb-x', text: 'Apagar', onclick: () => qApagar(sel.id) }));
        rc(S.ui.qZoomB, h('button', { type: 'button', class: 'cm-qzb', 'aria-label': 'Afastar', text: '−', onclick: () => qZoom(1 / 1.25) }),
          h('button', { type: 'button', class: 'cm-qzb cm-qzpct', title: 'Ajustar o quadro na tela', text: Math.round((S.qz || 0.4) * 100) + '%', onclick: qAjustar }),
          h('button', { type: 'button', class: 'cm-qzb', 'aria-label': 'Aproximar', text: '+', onclick: () => qZoom(1.25) }),
          S.mestre ? h('button', { type: 'button', class: 'cm-qzb cm-qzfundo', text: 'Fundo', title: 'Cor do fundo e da grade', onclick: qFundo }) : null);
      };
      S.ui.qPintarBarra = pintarBarraQ;
      S.ui.qVista = h('div', { class: 'cm-qvista', tabindex: '0', 'aria-label': 'Quadro da história' });
      S.ui.qTabua = h('div', { class: 'cm-qtabua', style: `width:${QW}px;height:${QH}px` });
      S.ui.qVista.append(S.ui.qTabua);
      S.ui.qCena = h('div', { class: 'cm-qcena' }, S.ui.qVista, h('div', { class: 'cm-qvinheta', 'aria-hidden': 'true' }), S.ui.qDoca, S.ui.qOpc, S.ui.qSelB, S.ui.qZoomB);
      w.append(S.ui.qCena);
      qEventos(S.ui.qVista);
      // lugares (o que era o mapa): NPCs, pistas e missões continuam ligados a eles
      S.ui.lugares = h('div', { class: 'cm-lista' });
      const lugCab = h('div', { class: 'cm-row cm-qlug' }, h('span', { class: 'cm-faixa', text: 'Lugares' }), h('span', { style: 'flex:1' }),
        S.mestre ? [btn('Editar cidade', editarCidade, 'cm-mini'), btn('＋ Lugar', () => formLocal(null, { x: null, y: null }), 'cm-mini'),
          S.d.mapa && S.d.mapa.img ? btn('Pôr o mapa antigo no quadro', async () => { await salvar(() => col('quadro').add({ tipo: 'imagem', img: S.d.mapa.img, x: 0, y: 0, w: 1600, h: 1000, autor: S.me, ts: agora() })); toast('História', 'Mapa colocado no quadro. Use “Mover” pra ajustar o tamanho.'); }, 'cm-mini') : null] : null);
      S.ui.recados = h('div', { class: 'cm-lista cm-feed' });
      S.ui.recCab = h('div', { class: 'cm-row cm-qlug' }, h('span', { class: 'cm-faixa', text: 'Recados do mural antigo' }));
      w.append(lugCab, S.ui.lugares, S.ui.recCab, S.ui.recados);
      pintarBarraQ();
      requestAnimationFrame(() => { if (!S.qz) qAjustar(); else pintarQuadro(); });
    },
    atualizar() {
      if (S.ui.denBtn) { const n = S.d.den.reduce((a, d) => a + (d.itens || []).length, 0); S.ui.denBtn.textContent = n ? `Denúncias (${n})` : 'Denúncias'; S.ui.denBtn.hidden = !n && !S.verDen; }
      S.ui.qDen.hidden = !(S.verDen && S.mestre);
      if (S.verDen && S.mestre) rc(S.ui.qDen, ...listaDenuncias());
      if (!S.qArrasto) { pintarQuadro(); if (S.ui.qPintarBarra) S.ui.qPintarBarra(); }
      const ord = [...S.d.locais].sort((a, b) => (a.tipo === 'distrito' ? 0 : 1) - (b.tipo === 'distrito' ? 0 : 1) || (a.nome || '').localeCompare(b.nome || ''));
      const conta = (n, um, varios) => (n ? `${n} ${n === 1 ? um : varios}` : null);
      rc(S.ui.lugares, ...(ord.length ? ord.map((l) => h('button', { type: 'button', class: 'cm-linha cm-lugar', style: `--pc:${l.cor || 'var(--red)'}`, onclick: () => verLocal(l.id) },
        h('span', { class: 'cm-rot', text: TIPOS_LOCAL[l.tipo] || 'Local' }),
        h('span', { class: 'cm-linha-txt' }, h('b', { text: l.nome }), l.descricao ? h('small', { text: corte(l.descricao, 140) }) : null),
        h('span', { class: 'cm-quando', text: [conta(npcsEm(l.id).length, 'NPC', 'NPCs'), conta(pistasEm(l.id).length, 'pista', 'pistas')].filter(Boolean).join(' · ') })))
        : [h('div', { class: 'cm-vazio', text: S.mestre ? 'Nenhum lugar ainda. Use “＋ Lugar”.' : 'Nenhum lugar marcado.' })]));
      S.ui.recCab.hidden = S.ui.recados.hidden = !S.d.mural.length;
      if (S.d.mural.length) rc(S.ui.recados, ...S.d.mural.map(cartaoPost));
    },
  };
  // desenha o quadro inteiro (é rápido: poucas dezenas de coisas)
  function pintarQuadro() {
    const t = S.ui.qTabua; if (!t || !t.isConnected) return;
    if (t.querySelector('.cm-qeditor')) return; // texto sendo escrito: o quadro espera terminar pra redesenhar
    const c = qConf(), z = S.qz || 0.4;
    t.style.zoom = z;
    t.style.setProperty('--q-fundo', c.fundo); t.style.setProperty('--q-grade', qGrade(c.grade));
    if (S.ui.qCena) { S.ui.qCena.style.setProperty('--q-fundo', c.fundo); S.ui.qCena.style.setProperty('--q-grade', qGrade(c.grade)); }
    t.dataset.ferr = S.qFerr;
    const its = [...(S.d.quadro || [])].sort((a, b) => (a.ts || 0) - (b.ts || 0));
    const imgs = its.filter((i) => i.tipo === 'imagem'), tracos = its.filter((i) => i.tipo === 'traco'), textos = its.filter((i) => i.tipo === 'texto');
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('class', 'cm-qtracos'); svg.setAttribute('viewBox', `0 0 ${QW} ${QH}`);
    for (const tr of tracos) {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', qPts(tr.pts || [])); p.setAttribute('stroke', qCorReal(tr.cor)); p.setAttribute('stroke-width', tr.esp || 6);
      p.dataset.id = tr.id; if (qPode(tr)) p.classList.add('cm-qmeu'); if (S.qSel === tr.id) p.classList.add('cm-qsel');
      svg.append(p);
    }
    S.ui.qSvg = svg;
    const el = (it, filho) => {
      const d = h('div', { class: `cm-qit cm-q-${it.tipo}` + (qPode(it) ? ' cm-qmeu' : '') + (S.qSel === it.id ? ' cm-qsel' : ''), 'data-id': it.id, style: `left:${it.x}px;top:${it.y}px;width:${it.w || 360}px;${it.h && it.tipo === 'imagem' ? `height:${it.h}px;` : ''}` }, filho);
      if (S.qSel === it.id && qPode(it) && it.tipo !== 'traco') d.append(h('span', { class: 'cm-qalca', 'data-alca': it.id, title: 'Arraste pra mudar o tamanho' }));
      return d;
    };
    rc(t,
      h('div', { class: 'cm-qbase' }),
      imgs.map((it) => el(it, h('img', { src: imgSrc(it.img), alt: '', draggable: 'false' }))),
      h('div', { class: 'cm-qgrade', 'aria-hidden': 'true' }, Array.from({ length: QW / 200 }, (_, i) => h('span', { class: 'cm-qcx', style: `left:${i * 200 + 10}px`, text: String.fromCharCode(65 + i) })), Array.from({ length: QH / 200 }, (_, i) => h('span', { class: 'cm-qcy', style: `top:${i * 200 + 8}px`, text: String(i + 1) }))),
      svg,
      textos.map((it) => el(it, h('div', { class: 'cm-qtexto', style: `color:${qCorReal(it.cor)};font-size:${it.tam || 42}px`, text: it.texto || '' }),
        h('small', { class: 'cm-qautor', text: it.autor === S.sess.gm ? 'mestre' : nome(it.autor) }))),
      !its.length ? h('div', { class: 'cm-qvazio' }, h('b', { text: 'A história começa aqui' }), h('span', { text: S.escreve ? 'Escreva, desenhe ou solte uma imagem — use as ferramentas do lado esquerdo.' : 'Quando a mesa escrever, aparece aqui.' })) : null);
  }
  async function qApagar(id) {
    S.qSel = null;
    await salvar(() => dok('quadro', id).delete());
  }
  function qEditarTexto(it, novo) {
    const t = S.ui.qTabua; if (!t) return;
    const ta = h('textarea', { class: 'cm-qeditor', maxlength: 1500, style: `left:${it.x}px;top:${it.y}px;width:${Math.max(300, it.w || 360)}px;color:${novo ? '#111' : '#111'};font-size:${it.tam || S.qTam}px` });
    ta.value = it.texto || '';
    t.append(ta); S.qArrasto = 'editando';
    setTimeout(() => ta.focus(), 0);
    let feito = false;
    const fim = async (salvarTxt) => {
      if (feito) return; feito = true; S.qArrasto = null;
      const txt = ta.value.trim(); ta.remove();
      if (salvarTxt && txt) {
        if (novo) await salvar(() => col('quadro').add({ tipo: 'texto', texto: txt, x: it.x, y: it.y, w: Math.max(300, it.w || 360), cor: S.qCor, tam: S.qTam, autor: S.me, ts: agora() }));
        else if (txt !== it.texto) await salvar(() => dok('quadro', it.id).update({ texto: txt }));
      } else if (salvarTxt && !txt && !novo) await qApagar(it.id);
      pintarQuadro();
    };
    ta.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); fim(false); } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); fim(true); } e.stopPropagation(); });
    ta.addEventListener('blur', () => fim(true));
  }
  function qFundo() {
    const c = qConf();
    let fundo = c.fundo, grade = c.grade || 'tema';
    const corTema = () => { const v = getComputedStyle(document.documentElement).getPropertyValue('--red').trim(); return /^#[0-9a-f]{6}$/i.test(v) ? v : '#cf2b21'; };
    const prev = h('div', { class: 'cm-qprev' });
    const pinta = () => { prev.style.setProperty('--q-fundo', fundo); prev.style.setProperty('--q-grade', qGrade(grade)); rc(opcs, ...Q_FUNDOS.map(([n, f, g]) => h('button', { type: 'button', class: 'cm-qfp' + (f === fundo && g === grade ? ' on' : ''), style: `--f:${f};--g:${qGrade(g)}`, onclick: () => { fundo = f; grade = g; fI.value = f; gI.value = g === 'tema' ? corTema() : g; pinta(); } }, h('i'), h('span', { text: n })))); };
    const opcs = h('div', { class: 'cm-qfps' });
    const fI = h('input', { type: 'color', value: fundo, oninput: () => { fundo = fI.value; pinta(); } });
    const gI = h('input', { type: 'color', value: grade === 'tema' ? corTema() : grade, oninput: () => { grade = gI.value; pinta(); } });
    const corpoF = h('div', { style: 'display:flex;flex-direction:column;gap:12px;color:var(--ink)' },
      h('div', { class: 'cm-sub', text: 'As imagens ficam atrás da grade. Imagem clara pede grade escura; imagem escura, grade clara.' }),
      opcs, h('div', { class: 'cm-row' }, h('label', { class: 'cm-lbl' }, 'Cor do fundo', fI), h('label', { class: 'cm-lbl' }, 'Cor da grade', gI),
        btn('Grade na cor do site', () => { grade = 'tema'; gI.value = corTema(); pinta(); }, 'cm-mini')), prev);
    pinta();
    const j = janela('Fundo e grade', corpoF);
    corpoF.append(btn('Salvar', async () => { if (await salvar(() => dok('conteudo', 'quadro').set({ fundo, grade, autor: S.me, ts: agora() }))) j.fechar(); }, 'cm-pri'));
  }
  // mouse, dedo e caneta no quadro
  function qEventos(v) {
    let ar = null; // arrasto em andamento
    const itemEm = (e) => e.target.closest && e.target.closest('[data-id]');
    v.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (e.target.closest('.cm-qeditor')) return;
      const f = S.qFerr, p = qCoord(e);
      const alca = e.target.closest('[data-alca]');
      if (alca) {
        const it = (S.d.quadro || []).find((x) => x.id === alca.dataset.alca); if (!it) return;
        e.preventDefault(); v.setPointerCapture(e.pointerId);
        ar = { modo: 'tam', it, el: alca.parentElement, p0: p, w0: it.w || 360, h0: it.h || 0 }; S.qArrasto = 'tam'; return;
      }
      if (f === 'lapis' && S.escreve) {
        e.preventDefault(); v.setPointerCapture(e.pointerId);
        const ns = 'http://www.w3.org/2000/svg', path = document.createElementNS(ns, 'path');
        path.setAttribute('stroke', qCorReal(S.qCor)); path.setAttribute('stroke-width', S.qEsp); S.ui.qSvg.append(path);
        ar = { modo: 'lapis', pts: [p.x, p.y], path }; path.setAttribute('d', qPts(ar.pts)); S.qArrasto = 'lapis'; return;
      }
      if (f === 'borracha') { e.preventDefault(); v.setPointerCapture(e.pointerId); ar = { modo: 'borracha', ids: new Set() }; S.qArrasto = 'borracha'; qApagarEm(e, ar); return; }
      if (f === 'texto' && S.escreve) {
        const it = itemEm(e) && (S.d.quadro || []).find((x) => x.id === itemEm(e).dataset.id);
        if (it && it.tipo === 'texto' && qPode(it)) { qEditarTexto(it); return; }
        e.preventDefault(); qEditarTexto({ x: p.x, y: p.y - 10, w: 420 }, true); return;
      }
      // mover: pega a coisa (se for sua) ou arrasta a vista
      const alvo = itemEm(e), it = alvo && (S.d.quadro || []).find((x) => x.id === alvo.dataset.id);
      if (it && qPode(it) && it.tipo !== 'traco') {
        e.preventDefault(); v.setPointerCapture(e.pointerId);
        if (S.qSel !== it.id) { S.qSel = it.id; pintarQuadro(); S.ui.qPintarBarra(); }
        const el = S.ui.qTabua.querySelector(`.cm-qit[data-id="${CSS.escape(it.id)}"]`);
        ar = { modo: 'mover', it, el, p0: p, x0: it.x, y0: it.y, mexeu: false }; S.qArrasto = 'mover'; return;
      }
      if (it && qPode(it) && it.tipo === 'traco') { S.qSel = it.id; pintarQuadro(); S.ui.qPintarBarra(); return; }
      if (S.qSel) { S.qSel = null; pintarQuadro(); S.ui.qPintarBarra(); }
      if (e.pointerType === 'mouse') { e.preventDefault(); ar = { modo: 'vista', cx: e.clientX, cy: e.clientY, sl: v.scrollLeft, st: v.scrollTop }; v.setPointerCapture(e.pointerId); v.classList.add('cm-qpuxando'); }
    });
    v.addEventListener('pointermove', (e) => {
      if (!ar) return;
      if (ar.modo === 'vista') { v.scrollLeft = ar.sl - (e.clientX - ar.cx); v.scrollTop = ar.st - (e.clientY - ar.cy); return; }
      const p = qCoord(e);
      if (ar.modo === 'lapis') { const n = ar.pts.length; if (Math.hypot(p.x - ar.pts[n - 2], p.y - ar.pts[n - 1]) >= 3) { ar.pts.push(p.x, p.y); ar.path.setAttribute('d', qPts(ar.pts)); } return; }
      if (ar.modo === 'borracha') { qApagarEm(e, ar); return; }
      if (ar.modo === 'mover') { const dx = p.x - ar.p0.x, dy = p.y - ar.p0.y; if (Math.abs(dx) + Math.abs(dy) > 2) ar.mexeu = true; ar.nx = Math.round(Math.max(-200, Math.min(QW - 40, ar.x0 + dx))); ar.ny = Math.round(Math.max(-200, Math.min(QH - 40, ar.y0 + dy))); if (ar.el) { ar.el.style.left = ar.nx + 'px'; ar.el.style.top = ar.ny + 'px'; } return; }
      if (ar.modo === 'tam') {
        const nw = Math.round(Math.max(80, ar.w0 + (p.x - ar.p0.x))); ar.nw = nw;
        if (ar.it.tipo === 'imagem' && ar.h0) { ar.nh = Math.round(nw * ar.h0 / ar.w0); ar.el.style.height = ar.nh + 'px'; }
        ar.el.style.width = nw + 'px';
      }
    });
    const solta = async () => {
      const a = ar; ar = null; if (S.qArrasto !== 'editando') S.qArrasto = null; v.classList.remove('cm-qpuxando');
      if (!a) return;
      if (a.modo === 'lapis') { if (a.pts.length >= 4) await salvar(() => col('quadro').add({ tipo: 'traco', pts: a.pts.slice(0, 4000), cor: S.qCor, esp: S.qEsp, autor: S.me, ts: agora() })); else a.path.remove(); }
      else if (a.modo === 'borracha') { for (const id of a.ids) await salvar(() => dok('quadro', id).delete()); }
      else if (a.modo === 'mover' && a.mexeu) await salvar(() => dok('quadro', a.it.id).update({ x: a.nx, y: a.ny }));
      else if (a.modo === 'tam' && a.nw) await salvar(() => dok('quadro', a.it.id).update(a.nh ? { w: a.nw, h: a.nh } : { w: a.nw }));
      pintarQuadro();
    };
    v.addEventListener('pointerup', solta); v.addEventListener('pointercancel', solta);
    v.addEventListener('dblclick', (e) => { const alvo = itemEm(e), it = alvo && (S.d.quadro || []).find((x) => x.id === alvo.dataset.id); if (it && it.tipo === 'texto' && qPode(it)) qEditarTexto(it); });
    v.addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); e.stopPropagation(); qZoom(Math.pow(1.15, Math.max(-1, Math.min(1, -e.deltaY / 100))), e.clientX, e.clientY); }, { passive: false });
    v.addEventListener('keydown', (e) => { if ((e.key === 'Delete' || e.key === 'Backspace') && S.qSel && !e.target.closest('textarea')) { const it = (S.d.quadro || []).find((x) => x.id === S.qSel); if (it && qPode(it)) { e.preventDefault(); qApagar(it.id); } } });
  }
  function qApagarEm(e, ar) {
    const alvo = document.elementFromPoint(e.clientX, e.clientY);
    const p = alvo && alvo.closest && alvo.closest('path[data-id]');
    if (!p || ar.ids.has(p.dataset.id)) return;
    const it = (S.d.quadro || []).find((x) => x.id === p.dataset.id);
    if (it && qPode(it)) { ar.ids.add(it.id); p.style.opacity = '.15'; }
  }

