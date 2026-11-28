/* ===== ficha nítida no celular =====
   Em pé, a ficha inteira cabe em ~20% do tamanho e o texto vira borrão. Aqui:
   - tocar na ficha (página inteira) amplia no ponto tocado, num tamanho que dá pra ler e editar;
   - botões − / + / "Página inteira" no canto; tocar duas vezes num espaço vazio volta pra página inteira.
   A ampliação muda o tamanho de verdade (zoom do CSS), então o navegador redesenha tudo nítido. */
(() => {
  const PASSOS = [0.35, 0.45, 0.6, 0.8, 1, 1.25];
  const PADRAO = 0.45;
  const stage = document.querySelector('.stage');
  if (!stage || typeof applyScale !== 'function') return;
  // só aparelho de toque: no PC com zoom alto a janela fica estreita, mas continua sendo PC
  const celular = () => matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches
    && (document.body.classList.contains('mob') || document.body.classList.contains('land') || Math.min(screen.width, screen.height) <= 600);
  const emPe = () => celular() && !document.body.classList.contains('land');
  const folha = () => document.querySelector('.sheet.active');
  const ehPdf = () => { const s = folha(); return !document.body.classList.contains('cartoes') && !!(s && s.classList.contains('pdfpage')); };
  const ampliada = () => zoomMode === 'manual';

  const b = (txt, tit, fn, cls) => { const e = document.createElement('button'); e.type = 'button'; e.className = 'zmc-b' + (cls ? ' ' + cls : ''); e.textContent = txt; e.title = tit; e.setAttribute('aria-label', tit); e.addEventListener('click', (ev) => { ev.stopPropagation(); fn(); }); return e; };
  const ctl = document.createElement('div'); ctl.className = 'zmc'; ctl.hidden = true;
  const menos = b('−', 'Diminuir', () => passo(-1));
  const pct = document.createElement('span'); pct.className = 'zmc-pct';
  const mais = b('+', 'Aumentar', () => passo(1));
  const inteira = b('Página inteira', 'Ver a página inteira', () => aplicar(null), 'zmc-largo');
  const ampliar = b('Ampliar', 'Ampliar a ficha', () => aplicar(PADRAO, centro()), 'zmc-largo zmc-pri');
  const dica = document.createElement('span'); dica.className = 'zmc-dica'; dica.textContent = 'ou toque na ficha';
  ctl.append(ampliar, dica, menos, pct, mais, inteira);
  document.body.append(ctl);

  const centro = () => ({ x: innerWidth / 2, y: Math.min(innerHeight / 2, (folha() ? folha().getBoundingClientRect().bottom : innerHeight) - 40) });
  function aplicar(v, ancora) {
    const sh = folha();
    let rel = null;
    if (ancora && sh) { const r = sh.getBoundingClientRect(); rel = { x: (ancora.x - r.left) / r.width, y: (ancora.y - r.top) / r.height, cx: ancora.x, cy: ancora.y }; }
    if (v == null) zoomMode = 'fit'; else { zoomMode = 'manual'; zoomVal = v; }
    applyScale();
    if (rel && sh) {
      const r = sh.getBoundingClientRect();
      stage.scrollLeft += (r.left + rel.x * r.width) - rel.cx;
      window.scrollBy(0, (r.top + rel.y * r.height) - rel.cy);
    } else if (v == null) { stage.scrollLeft = 0; }
    pintar();
  }
  // modo ajuda (celular): 1) página inteira pro player ver onde fica; 2) amplia no campo num tamanho que dá pra ler
  window.__cprAjudaCel = (el, etapa) => {
    if (!el || !celular() || !ehPdf()) return false;
    const sh = folha(); if (!sh || !sh.contains(el)) return false;
    if (etapa === 'inteira') { if (ampliada()) aplicar(null); window.scrollTo({ top: 0, behavior: 'instant' }); return true; }
    const r = el.getBoundingClientRect(), esc = sh.getBoundingClientRect().width / 1920;
    if (!r.width || !esc) return false;
    const v = Math.max(0.35, Math.min(1, (innerWidth - 28) / (r.width / esc)));
    if (!ampliada() || r.width > innerWidth - 12) aplicar(v, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const r2 = el.getBoundingClientRect();
    stage.scrollLeft += (r2.left + r2.width / 2) - innerWidth / 2;
    window.scrollBy({ left: 0, top: (r2.top + r2.height / 2) - innerHeight * 0.42, behavior: 'smooth' });
    return true;
  };
  function passo(d) {
    const atual = ampliada() ? zoomVal : 0;
    let i = PASSOS.findIndex((x) => x > atual + 0.001);
    if (d < 0) { i = PASSOS.slice().reverse().findIndex((x) => x < atual - 0.001); i = i < 0 ? -1 : PASSOS.length - 1 - i; }
    if (i < 0) { aplicar(null); return; }
    aplicar(PASSOS[i], centro());
  }
  function pintar() {
    const mostra = celular() && ehPdf() && !document.body.classList.contains('comu-on') && !(document.getElementById('menu') || {}).classList?.contains('open');
    ctl.hidden = !mostra;
    document.body.classList.toggle('zm-ctl', mostra);
    const amp = ampliada();
    document.body.classList.toggle('zm-ampliada', amp && celular());
    document.body.classList.toggle('zm-toca', !amp && emPe() && ehPdf());
    ampliar.hidden = dica.hidden = amp;
    dica.hidden = amp || !emPe();
    menos.hidden = pct.hidden = mais.hidden = inteira.hidden = !amp;
    pct.textContent = Math.round(zoomVal * 100) + '%';
  }
  // página inteira (em pé): tocar amplia ali; os campos só recebem toque depois de ampliar
  stage.addEventListener('click', (e) => {
    if (ampliada() || !emPe() || !ehPdf()) return;
    const sh = folha(); if (!sh || !sh.contains(e.target)) return;
    e.preventDefault();
    aplicar(PADRAO, { x: e.clientX, y: e.clientY });
  });
  // ampliada: dois toques num espaço sem campo voltam pra página inteira
  stage.addEventListener('dblclick', (e) => {
    if (!ampliada() || !celular() || !ehPdf()) return;
    if (e.target.closest('input,textarea,select,button,label,[contenteditable]')) return;
    aplicar(null);
  });
  // girou o celular ou mudou de página: volta pro encaixe automático
  let larg = innerWidth;
  addEventListener('resize', () => { if (Math.abs(innerWidth - larg) > 80 && ampliada() && celular()) { larg = innerWidth; aplicar(null); } else { larg = innerWidth; pintar(); } });
  addEventListener('sk:pagina', () => setTimeout(pintar, 0));
  new MutationObserver(pintar).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const mn = document.getElementById('menu'); if (mn) new MutationObserver(pintar).observe(mn, { attributes: true, attributeFilter: ['class'] });
  pintar();
})();

/* ===== zoom do navegador (Ctrl + / Ctrl −) aumenta a ficha de verdade =====
   O encaixe automático deixava a ficha sempre do tamanho da janela, então o zoom do navegador não fazia efeito.
   Agora o encaixe é calculado como se o zoom estivesse em 100%: com 125% a ficha fica 25% maior (e rola). */
(() => {
  if (typeof applyScale !== 'function') return;
  const NIVEIS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
  // só aparelho de toque: no PC com zoom alto a janela fica estreita, mas continua sendo PC
  const celular = () => matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches
    && (document.body.classList.contains('mob') || document.body.classList.contains('land') || Math.min(screen.width, screen.height) <= 600);
  function zoomNavegador() {
    if (celular() || !window.outerWidth || !window.innerWidth) return 1;
    const r = window.outerWidth / window.innerWidth;
    let melhor = 1, dif = 9;
    for (const n of NIVEIS) { const d = Math.abs(r - n * 1.008); if (d < dif) { dif = d; melhor = n; } }
    return dif <= 0.03 * melhor ? melhor : 1; // janela com painel lateral aberto etc.: não dá pra saber, fica como estava
  }
  window.__zoomNavegador = zoomNavegador;
  const MENOR = 0.2; // menor zoom da ficha (20%)
  function encaixe(z, land, vw) {
    if (z == null) { land = document.body.classList.contains('land'); z = zoomNavegador(); vw = (document.documentElement.clientWidth - (land ? 56 : 16) - (window.__ladoW || 0)) * z; }
    let s = Math.min(vw, 1920 * z) / 1920;
    if (!land) { const tb = document.querySelector('.toolbar'); const vh = (window.innerHeight - (tb ? tb.offsetHeight : 0) - 60) * z; s = Math.min(s, Math.max(0.2, vh / 1080)); }
    return s;
  }
  applyScale = function () {
    const land = document.body.classList.contains('land');
    const z = zoomMode === 'fit' ? zoomNavegador() : 1;
    const vw = (document.documentElement.clientWidth - (land ? 56 : 16) - (window.__ladoW || 0)) * z;
    let s;
    if (zoomMode === 'fit') s = encaixe(z, land, vw);
    else s = Math.min(ZMAX, Math.max(MENOR, zoomVal));
    const fluid = document.body.classList.contains('mob');
    for (const sc of document.querySelectorAll('.scaler')) {
      if ((fluid && sc.classList.contains('fl')) || (land && sc.classList.contains('fl'))) {
        const fl = sc.querySelector('.sheet'); sc.style.width = ''; sc.style.height = ''; fl.style.transform = ''; fl.style.zoom = '';
        continue;
      }
      sc.style.width = `${1920 * s}px`;
      sc.style.height = `${1080 * s}px`;
      const sh = sc.querySelector('.sheet');
      if (ZOOM_OK) { sh.style.transform = ''; sh.style.zoom = s; } else sh.style.transform = `scale(${s})`;
    }
    const pct = document.getElementById('zoom-pct'); if (pct) pct.textContent = `${Math.round(s * 100)}%`;
  };
  applyScale();

  /* ===== zoom na ficha com Ctrl + rodinha (ou pinça do touchpad) e Ctrl + / Ctrl −, aproximando onde está o mouse =====
     Só a ficha aumenta (a barra de cima fica do tamanho normal) e o ponto embaixo do mouse continua no lugar. */
  const toque = () => matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
  const fichaAberta = () => { const sh = document.querySelector('.sheet.active'); return sh && sh.classList.contains('pdfpage') && !document.body.classList.contains('comu-on') && !document.body.classList.contains('cartoes') ? sh : null; };
  let mx = innerWidth / 2, my = innerHeight / 2;
  addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  let ancora = null;
  function zoomEm(fator, cx, cy) {
    const sh = fichaAberta(); if (!sh) return false;
    const r = sh.getBoundingClientRect();
    const atual = r.width / 1920;
    const fit = encaixe();
    let novo = Math.min(ZMAX, Math.max(MENOR, atual * fator));
    // ponto da ficha embaixo do mouse (em px da ficha sem escala). Durante um mesmo gesto o ponto fica guardado:
    // enquanto a ficha ainda é mais estreita que a tela ela fica centralizada e não dá pra segurar o ponto,
    // mas assim que der pra rolar ele volta pra baixo do mouse.
    let px, py;
    if (ancora && Math.abs(ancora.cx - cx) < 4 && Math.abs(ancora.cy - cy) < 4 && Date.now() - ancora.t < 1500) { px = ancora.px; py = ancora.py; }
    else { px = Math.min(1920, Math.max(0, (cx - r.left) / atual)); py = Math.min(1080, Math.max(0, (cy - r.top) / atual)); }
    ancora = { px, py, cx, cy, t: Date.now() };
    // passando pelo tamanho que cabe na tela, ele "gruda" ali um instante; dá pra continuar afastando até 20%
    if (Math.abs(novo - fit) < 0.015) { zoomMode = 'fit'; } else { zoomMode = 'manual'; zoomVal = novo; }
    applyScale();
    const r2 = sh.getBoundingClientRect(), s2 = r2.width / 1920;
    const st = document.querySelector('.stage');
    if (st) st.scrollLeft += (r2.left + px * s2) - cx;
    window.scrollBy({ left: 0, top: (r2.top + py * s2) - cy, behavior: 'instant' });
    selo(Math.round(s2 * 100));
    return true;
  }
  // mostra o tamanho por um instante, perto do mouse
  const badge = document.createElement('div'); badge.className = 'zm-selo'; badge.hidden = true; document.body.append(badge);
  let tSelo = 0;
  function selo(pct) {
    badge.textContent = pct + '%'; badge.hidden = false;
    badge.style.left = Math.min(innerWidth - 70, mx + 14) + 'px'; badge.style.top = Math.min(innerHeight - 40, my + 14) + 'px';
    clearTimeout(tSelo); tSelo = setTimeout(() => { badge.hidden = true; }, 900);
  }
  addEventListener('wheel', (e) => {
    if (!e.ctrlKey || toque() || !fichaAberta()) return;
    e.preventDefault();
    // rodinha: ~10% por clique; pinça do touchpad manda passos pequenos
    const passo = Math.max(-1, Math.min(1, -e.deltaY / (e.deltaMode === 1 ? 3 : 100)));
    zoomEm(Math.pow(1.12, passo), e.clientX, e.clientY);
  }, { passive: false });
  addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || toque() || !fichaAberta()) return;
    const k = e.key;
    if (k === '+' || k === '=' || k === 'Add') { e.preventDefault(); zoomEm(1.15, mx, my); }
    else if (k === '-' || k === '_' || k === 'Subtract') { e.preventDefault(); zoomEm(1 / 1.15, mx, my); }
    else if (k === '0' && zoomMode === 'manual') { e.preventDefault(); zoomMode = 'fit'; applyScale(); window.scrollTo(0, 0); const st = document.querySelector('.stage'); if (st) st.scrollLeft = 0; selo(Math.round((document.querySelector('.sheet.active').getBoundingClientRect().width / 1920) * 100)); }
  });
})();
