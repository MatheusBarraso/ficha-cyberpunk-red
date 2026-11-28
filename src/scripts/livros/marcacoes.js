/* ================= livros + marcações vinculadas à ficha ================= */
const LIVROS_KEY = 'cpr-livros-v1';
const LIVROS = {
  regras: { nome: 'CEMK — Livro de Regras', paginas: 71, dim: [992, 1404] },
  jacket: { nome: 'CEMK — The Jacket', paginas: 62, dim: [992, 1404] },
  red:    { nome: 'Cyberpunk RED — Livro Básico', paginas: 458, dim: [1005, 1305] }
};
// na pasta: arquivos ./livros/... ; no link publicado: páginas carregadas sob demanda (window.__livroCached / __livroLoad)
const livroPageUrl = (book, page) => (window.__livroCached
  ? (window.__livroCached(book, page) || '')
  : `./livros/${book}/p${String(page).padStart(4, '0')}.jpg`);
// define a imagem de uma página; se ainda não estiver pronta (link), espera e só então aplica
function setLivroSrc(im, book, page) {
  const key = `${book}:${page}`;
  im.dataset.want = key;
  const u = livroPageUrl(book, page);
  if (u) { im.src = u; return; }
  window.__livroLoad(book, page).then(url => { if (im.dataset.want === key) im.src = url; }).catch(() => {});
}

function setupLivros() {
  const frame = $('#lv-frame');
  if (!frame) return;
  let marks = [];
  let linkModeFor = null; // id da marcação esperando um campo da ficha
  let curBook = 'regras', curPage = 1;
  let editing = null;
  let clickTimer = null;

  try {
    marks = JSON.parse(localStorage.getItem(LIVROS_KEY) || '[]');
    if (!Array.isArray(marks)) marks = [];
  } catch { marks = []; }

  const persist = () => {
    try { localStorage.setItem(LIVROS_KEY, JSON.stringify(marks)); scheduleSave(); }
    catch { status.textContent = 'Marcações grandes demais pro armazenamento'; }
  };

  let scrollMode = false;
  const view = $('#lv-view');

  function syncPageUi() {
    $('#lv-book').value = curBook;
    $('#lv-page').value = curPage;
    $('#lv-total').textContent = `/ ${LIVROS[curBook].paginas}`;
  }

  // ---- texto selecionável: uma camada invisível por página, alinhada à imagem ----
  const roTexto = new ResizeObserver((es) => es.forEach((e) => posTexto(e.target)));
  function posTexto(im) {
    const d = im._txt;
    if (!d || !d._pw) return;
    d.style.top = `${im.offsetTop}px`;
    d.style.left = `${im.offsetLeft}px`;
    d.style.setProperty('--total-scale-factor', im.offsetWidth / d._pw);
  }
  function poeTexto(im) {
    if (im._txt || !window.__livroTexto) return;
    const d = el('div', 'textLayer');
    im._txt = d;
    im.after(d);
    window.__livroTexto(im.dataset.book, +im.dataset.pg, d).then((pw) => {
      d._pw = pw; posTexto(im); roTexto.observe(im);
    }).catch(() => { d.remove(); im._txt = null; });
  }
  // marca "selecionando" enquanto arrasta (evita a seleção pular pro fim da página)
  view.addEventListener('pointerdown', (e) => { const d = e.target.closest('.textLayer'); if (d) d.classList.add('selecting'); });
  document.addEventListener('pointerup', () => view.querySelectorAll('.textLayer.selecting').forEach((d) => d.classList.remove('selecting')));

  function buildStack() {
    roTexto.disconnect();
    view.querySelector('.lv-stack')?.remove();
    const [w, h] = LIVROS[curBook].dim;
    const stack = el('div', 'lv-stack');
    const frag = document.createDocumentFragment();
    const obs = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      setLivroSrc(e.target, e.target.dataset.book, +e.target.dataset.pg);
    }), { root: view, rootMargin: '1500px 0px' });
    for (let i = 1; i <= LIVROS[curBook].paginas; i++) {
      const im = el('img');
      im.dataset.book = curBook;
      obs.observe(im);
      im.loading = 'lazy'; // navegador só baixa as páginas perto da tela
      im.alt = `${LIVROS[curBook].nome} — página ${i}`;
      im.dataset.pg = i;
      im.style.aspectRatio = `${w} / ${h}`;
      im.addEventListener('load', () => poeTexto(im));
      frag.append(im);
    }
    stack.append(frag);
    view.append(stack);
  }

  function scrollToPage(p) {
    const im = view.querySelector(`.lv-stack img[data-pg="${p}"]`);
    if (!im) return;
    // offsetTop é em pixels de layout (imune ao zoom/escala da ficha)
    view.scrollTop = im.offsetTop - 4;
  }

  function openBook(book, page) {
    if (!LIVROS[book]) book = 'regras';
    const trocou = book !== curBook;
    curBook = book;
    curPage = Math.min(Math.max(1, page | 0 || 1), LIVROS[curBook].paginas);
    syncPageUi();
    if (scrollMode) {
      if (trocou || !view.querySelector('.lv-stack')) buildStack();
      scrollToPage(curPage);
    } else {
      setLivroSrc(frame, curBook, curPage);
      // pré-carrega a próxima página pra navegação ficar instantânea
      frame.onload = () => {
        if (curPage < LIVROS[curBook].paginas) {
          if (window.__livroLoad) window.__livroLoad(curBook, curPage + 1).catch(() => {});
          else { const pre = new Image(); pre.src = livroPageUrl(curBook, curPage + 1); }
        }
      };
    }
    if (window.__livroAviso) window.__livroAviso(curBook);
    showPage(5);
  }

  // rolagem contínua: acompanha qual página está no meio da tela
  let scrollTick = null;
  view.addEventListener('scroll', () => {
    if (!scrollMode || scrollTick) return;
    scrollTick = setTimeout(() => {
      scrollTick = null;
      const imgs = view.querySelectorAll('.lv-stack img');
      if (!imgs.length) return;
      // página que contém a linha do meio da área de leitura (offsetTop é relativo à view, que é posicionada)
      const mid = view.scrollTop + view.clientHeight / 2;
      let lo = 0, hi = imgs.length - 1, idx = 0;
      while (lo <= hi) {
        const m = (lo + hi) >> 1;
        if (imgs[m].offsetTop <= mid) { idx = m; lo = m + 1; } else hi = m - 1;
      }
      const best = +imgs[idx].dataset.pg;
      if (best !== curPage) { curPage = best; $('#lv-page').value = best; }
    }, 120);
  });

  $('#lv-mode').addEventListener('click', () => {
    scrollMode = !scrollMode;
    $('#lv-mode').classList.toggle('active', scrollMode);
    $('#lv-mode').textContent = scrollMode ? 'Página única' : 'Modo rolagem';
    view.classList.toggle('scroll', scrollMode);
    if (scrollMode) {
      frame.style.display = 'none';
      buildStack();
      scrollToPage(curPage);
    } else {
      view.querySelector('.lv-stack')?.remove();
      frame.style.display = '';
      setLivroSrc(frame, curBook, curPage);
    }
  });

  // ---------- modo leitura: tela cheia, rolagem contínua, letra ajustável ----------
  const ZOOMS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  let lvz = 1;
  try { lvz = parseFloat(localStorage.getItem('cpr-lv-zoom')) || 1; } catch { /* ok */ }
  const casaView = { pai: view.parentNode, depois: view.nextSibling };
  let lendo = false;
  const lvbPg = () => {
    const inp = $('#lvb-pg');
    if (document.activeElement !== inp) inp.value = curPage;
    inp.max = LIVROS[curBook].paginas;
    $('#lvb-tot').textContent = `/ ${LIVROS[curBook].paginas}`;
  };
  const drawer = $('#lvdrawer');
  const moverDrawer = [$('#lv-book'), $('#lv-addrow'), $('#lv-mesa'), $('#lv-save'), document.querySelector('.p6 .lv-side')];
  const casas = moverDrawer.map((n) => ({ n, pai: n.parentNode, depois: n.nextSibling }));
  // abrir/fechar o painel muda a largura da página: mantém a página que estava sendo lida
  const setDrawer = (on) => {
    const p = curPage;
    drawer.classList.toggle('aberta', on);
    document.body.classList.toggle('gaveta', on);
    if (lendo) irPara(p);
  };
  const fecharDrawer = () => { if (drawer.classList.contains('aberta')) setDrawer(false); };
  function aplicarZoom() {
    view.style.setProperty('--lvz', lvz);
    try { localStorage.setItem('cpr-lv-zoom', String(lvz)); } catch { /* ok */ }
  }
  function entrarLeitura() {
    if (lendo) return;
    lendo = true;
    const p = curPage;
    if (!scrollMode) $('#lv-mode').click(); // no modo leitura a rolagem é contínua
    $('#lvreader').append(view);               // sai da ficha (que pode estar escalada) e cobre a tela
    for (const c of casas) drawer.append(c.n);
    $('#lvbar').classList.remove('oculta');
    view.classList.add('reading');
    document.body.classList.add('reading');
    aplicarZoom();
    curPage = p;
    lvbPg();
    irPara(p);
  }
  // espera o layout novo antes de rolar (senão a página lida pelo meio da tela fica errada)
  function irPara(p) {
    curPage = p;
    requestAnimationFrame(() => requestAnimationFrame(() => { scrollToPage(p); curPage = p; lvbPg(); }));
    setTimeout(() => { scrollToPage(p); curPage = p; lvbPg(); }, 250);
  }
  function sairLeitura() {
    if (!lendo) return;
    lendo = false;
    const p = curPage;
    fecharDrawer();
    view.classList.remove('reading');
    document.body.classList.remove('reading');
    casaView.pai.insertBefore(view, casaView.depois);
    for (const c of casas.slice().reverse()) c.pai.insertBefore(c.n, c.depois && c.depois.parentNode === c.pai ? c.depois : null);
    irPara(p);
  }
  function mudarZoom(d) {
    const p = curPage;
    const i = ZOOMS.indexOf(lvz);
    lvz = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, (i < 0 ? 0 : i) + d))];
    aplicarZoom();
    irPara(p);
    requestAnimationFrame(() => { view.scrollLeft = 0; });
  }
  const noCelular = () => document.body.classList.contains('mob') || document.body.classList.contains('land')
    || window.innerWidth <= MOB_MAX
    || (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) <= 600);
  // abrir um livro vindo da busca, das páginas salvas ou do selo de um campo: no celular já abre em tela cheia
  const abrirLeitura = (b, p) => {
    if (lendo) { openBook(b, p); irPara(p); return; }
    openBook(b, p);
    if (noCelular()) entrarLeitura();
  };
  $('#lv-read').addEventListener('click', entrarLeitura);
  $('#lvb-sair').addEventListener('click', sairLeitura);
  const passo = (d) => { const p = Math.min(LIVROS[curBook].paginas, Math.max(1, curPage + d)); openBook(curBook, p); irPara(p); };
  $('#lvb-prev').addEventListener('click', () => passo(-1));
  $('#lvb-next').addEventListener('click', () => passo(1));
  $('#lvb-pg').addEventListener('change', () => { const v = parseInt($('#lvb-pg').value, 10); if (v) { $('#lvb-pg').blur(); passo(v - curPage); } });
  $('#lvb-pg').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#lvb-pg').blur(); });
  $('#lvb-menu').addEventListener('click', () => setDrawer(!drawer.classList.contains('aberta')));
  $('#lv-book').addEventListener('change', () => { if (lendo) irPara(1); });
  // tocar na página esconde/mostra a barra (mais espaço pra ler)
  view.addEventListener('click', () => { if (!lendo || drawer.classList.contains('aberta')) return; const s = getSelection(); if (s && !s.isCollapsed && view.contains(s.anchorNode)) return; $('#lvbar').classList.toggle('oculta'); });
  // a aba Livros agora é sempre o modo leitura (celular e PC); sair da aba sai da leitura
  addEventListener('sk:trocando-pagina', (e) => { if (e.detail.pagina !== 5) sairLeitura(); });
  addEventListener('sk:pagina', (e) => { if (e.detail.pagina === 5) entrarLeitura(); });
  $('#lvb-app').addEventListener('click', () => openMenu(true));
  $('#lvb-menos').addEventListener('click', () => mudarZoom(-1));
  $('#lvb-mais').addEventListener('click', () => mudarZoom(1));
  view.addEventListener('scroll', () => { if (lendo) setTimeout(lvbPg, 160); });
  document.addEventListener('keydown', (e) => { if (lendo && e.key === 'Escape' && !$('#menu').classList.contains('open')) fecharDrawer(); });
  aplicarZoom();

  $('#lv-book').addEventListener('change', () => openBook($('#lv-book').value, 1));
  $('#lv-prev').addEventListener('click', () => openBook(curBook, curPage - 1));
  $('#lv-next').addEventListener('click', () => openBook(curBook, curPage + 1));
  $('#lv-go').addEventListener('click', () => openBook(curBook, parseInt($('#lv-page').value, 10) || 1));
  $('#lv-page').addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') openBook(curBook, parseInt(e.target.value, 10) || 1);
  });

  $('#lv-save').addEventListener('click', () => {
    const p = Math.max(1, parseInt($('#lv-page').value, 10) || curPage);
    const m = { id: `m${Date.now()}`, book: curBook, page: p, title: `${LIVROS[curBook].nome} — pág. ${p}`, note: '', link: null, linkLabel: null };
    marks.push(m);
    persist();
    renderMarks();
    openModal(m.id);
  });

  // --- busca de texto nos livros (índice pré-gerado, carrega só quando precisa) ---
  const idxCache = {};
  addEventListener('livros-mudaram', (e) => {
    const d = e.detail || {};
    for (const k in idxCache) delete idxCache[k];
    if (d.abrir && LIVROS[d.abrir]) { curBook = d.abrir; curPage = 1; }
    if (!LIVROS[curBook]) curBook = Object.keys(LIVROS)[0];
    curPage = Math.min(Math.max(1, curPage), LIVROS[curBook].paginas);
    syncPageUi();
    try { lvbPg(); } catch { /* leitor ainda não montado */ }
    const mexeu = d.abrir || (d.ids || []).includes(curBook);
    if (scrollMode) { if (view.querySelector('.lv-stack') && (mexeu || d.inicio)) { buildStack(); scrollToPage(curPage); } }
    else if (mexeu || d.inicio) setLivroSrc(frame, curBook, curPage);
    if (window.__livroAviso) window.__livroAviso(curBook);
  });
  function loadIdx(book) {
    if (idxCache[book]) return idxCache[book];
    if (window.__livroIdxLoad) return (idxCache[book] = window.__livroIdxLoad(book));
    idxCache[book] = new Promise((res) => {
      if (window.__LIVRO_IDX && window.__LIVRO_IDX[book]) return res(window.__LIVRO_IDX[book].p);
      const s = document.createElement('script');
      s.src = './livros/busca.js'; // índice de busca dos 3 livros num arquivo só
      s.onload = () => res((window.__LIVRO_IDX[book] || { p: [] }).p);
      s.onerror = () => res([]);
      document.head.append(s);
    });
    return idxCache[book];
  }

  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const FOLD = { a: 'aàáâãäAÀÁÂÃÄ', e: 'eèéêëEÈÉÊË', i: 'iìíîïIÌÍÎÏ', o: 'oòóôõöOÒÓÔÕÖ', u: 'uùúûüUÙÚÛÜ', c: 'cçCÇ', n: 'nñNÑ' };
  function termRegex(term) {
    const pat = term.split('').map(ch => {
      for (const k in FOLD) if (FOLD[k].includes(ch)) return `[${FOLD[k]}]`;
      return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');
    return new RegExp(pat);
  }

  function switchPane(which) {
    const search = which === 'search';
    $('#lv-tab-saved').classList.toggle('active', !search);
    $('#lv-tab-search').classList.toggle('active', search);
    $('#lv-pane-saved').classList.toggle('hide', search);
    $('#lv-pane-search').classList.toggle('hide', !search);
    if (search) $('#lv-q').focus();
  }
  $('#lv-tab-saved').addEventListener('click', () => switchPane('saved'));
  $('#lv-tab-search').addEventListener('click', () => switchPane('search'));

  async function runSearch() {
    const raw = $('#lv-q').value.trim();
    const box = $('#lv-results');
    box.innerHTML = '';
    const terms = norm(raw).split(/\s+/).filter(Boolean);
    if (!terms.length) { box.append(el('div', 'lv-empty', 'Digita uma palavra ou termo pra buscar.')); return; }
    const books = $('#lv-qall').checked ? Object.keys(LIVROS) : [curBook];
    box.append(el('div', 'lv-empty', 'Buscando…'));
    let total = 0;
    const frag = document.createDocumentFragment();
    for (const b of books) {
      const pages = await loadIdx(b);
      for (let i = 0; i < pages.length; i++) {
        const t = norm(pages[i]);
        if (!terms.every(term => t.includes(term))) continue;
        total++;
        if (frag.childNodes.length >= 60) continue;
        const m = pages[i].match(termRegex(terms[0]));
        const at = m ? m.index : 0, len = m ? m[0].length : terms[0].length;
        const a = Math.max(0, at - 60), z = Math.min(pages[i].length, at + len + 100);
        const item = el('button', 'bres'); item.type = 'button';
        item.append(el('div', 'bp', `${LIVROS[b].nome} — pág. ${i + 1}`));
        const snip = el('div', 'bs');
        if (a > 0) snip.append('…');
        snip.append(document.createTextNode(pages[i].slice(a, at)));
        snip.append(el('b', '', pages[i].slice(at, at + len)));
        snip.append(document.createTextNode(pages[i].slice(at + len, z)));
        if (z < pages[i].length) snip.append('…');
        item.append(snip);
        item.addEventListener('click', () => abrirLeitura(b, i + 1));
        frag.append(item);
      }
    }
    box.innerHTML = '';
    if (!total) { box.append(el('div', 'lv-empty', `Nada encontrado pra “${raw}”.`)); return; }
    box.append(frag);
    if (total > 60) box.append(el('div', 'lv-empty', `Mais ${total - 60} resultados não mostrados — refina a busca pra achar mais rápido.`));
    status.textContent = `Busca: ${total} resultado${total > 1 ? 's' : ''} pra “${raw}”`;
  }
  $('#lv-qgo').addEventListener('click', runSearch);
  $('#lv-q').addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') runSearch();
  });

  function renderMarks() {
    const list = $('#lv-marks');
    list.innerHTML = '';
    if (!marks.length) {
      list.append(el('div', 'lv-empty', 'Nenhuma página salva ainda. Vai pra página importante e toca em ★ Salvar página.'));
      renderBadges();
      return;
    }
    for (const m of marks) {
      const item = el('div', 'bmark');
      item.append(el('div', 'bt', m.title || '(sem título)'));
      item.append(el('div', 'bi', `${LIVROS[m.book] ? LIVROS[m.book].nome : m.book} · página ${m.page}`));
      if (m.note) item.append(el('div', 'bn', m.note));
      const btns = el('div', 'bbtns');
      const abrir = el('button', '', 'Abrir'); abrir.type = 'button';
      abrir.addEventListener('click', () => abrirLeitura(m.book, m.page));
      const vinc = el('button', 'bm-link'); vinc.type = 'button';
      vinc.title = m.link ? `Vinculado a “${m.linkLabel || m.link}” — toque pra trocar o campo` : 'Vincular a um campo da ficha';
      vinc.setAttribute('aria-label', vinc.title);
      if (m.link) item.classList.add('ligado');
      vinc.addEventListener('click', () => startLinkMode(m.id));
      const editar = el('button', '', 'Editar'); editar.type = 'button';
      editar.addEventListener('click', () => openModal(m.id));
      const del = el('button', 'danger bm-del', '×'); del.type = 'button'; del.title = 'Excluir marcação'; del.setAttribute('aria-label', 'Excluir marcação');
      del.addEventListener('click', async () => {
        if (!(await confirmar(`Excluir a marcação “${m.title}”?`))) return;
        marks = marks.filter(x => x.id !== m.id);
        persist();
        renderMarks();
      });
      btns.append(abrir, editar);
      item.append(del, vinc);
      item.append(btns);
      list.append(item);
    }
    renderBadges();
  }

  // --- selos nos campos vinculados da ficha ---
  const bookSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h13"/></svg>';

  function renderBadges() {
    document.querySelectorAll('.bkbadge').forEach(b => b.remove());
    document.querySelectorAll('.tem-selo').forEach(h => h.classList.remove('tem-selo'));
    for (const m of marks) {
      if (!m.link) continue;
      const inp = document.querySelector(`[data-f="${CSS.escape(m.link)}"]`);
      if (!inp) continue;
      const host = inp.closest('.box,.skrow,.trow,.fx');
      if (!host) continue;
      const b = el('button', 'bkbadge');
      b.type = 'button';
      b.title = `${m.title} — 1 clique abre a página · 2 cliques editam`;
      b.innerHTML = bookSvg;
      wireBadge(b, m);
      host.append(b);
      host.classList.add('tem-selo');
    }
  }

  function wireBadge(b, m) {
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (clickTimer) { // segundo clique = duplo → edita a marcação
        clearTimeout(clickTimer);
        clickTimer = null;
        openModal(m.id);
        return;
      }
      clickTimer = setTimeout(() => { clickTimer = null; abrirLeitura(m.book, m.page); }, 280); // clique único → abre a página do livro
    });
  }

  // --- modo vincular: o próximo clique num campo da ficha recebe o selo ---
  function startLinkMode(id) {
    showPage(0); // o campo fica na ficha: sai do leitor e vai pra página do personagem
    linkModeFor = id;
    $('#linkbar').classList.add('open');
  }
  function stopLinkMode() {
    linkModeFor = null;
    $('#linkbar').classList.remove('open');
  }
  document.addEventListener('click', (e) => {
    if (!linkModeFor) return;
    const host = e.target.closest('.box,.skrow,.trow,.fx');
    if (!host || !host.closest('.sheet')) return; // cliques fora da ficha (menu, abas…) passam normal
    e.preventDefault();
    e.stopPropagation();
    const inp = host.querySelector('[data-f]');
    if (!inp) return;
    const m = marks.find(x => x.id === linkModeFor);
    if (m) {
      m.link = inp.dataset.f;
      m.linkLabel = host.dataset.label
        || host.querySelector('.lbl')?.textContent.trim()
        || host.querySelector('.slabel')?.textContent.trim()
        || (inp.value && inp.value.trim())
        || inp.dataset.f;
      persist();
      renderMarks();
      status.textContent = `Página vinculada a “${m.linkLabel}” — 1 clique no selo abre o livro · 2 cliques editam`;
    }
    stopLinkMode();
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') stopLinkMode(); });

  // --- modal de edição ---
  function openModal(id) {
    const m = marks.find(x => x.id === id);
    if (!m) return;
    editing = id;
    $('#bk-title').value = m.title || '';
    $('#bk-book').value = m.book;
    $('#bk-page').value = m.page;
    $('#bk-note').value = m.note || '';
    $('#bk-linkinfo').textContent = m.link ? `Vinculado a “${m.linkLabel || m.link}” na ficha.` : 'Não vinculado a nenhum campo da ficha.';
    $('#bkmodal').classList.add('open');
  }
  function closeModal() { editing = null; $('#bkmodal').classList.remove('open'); }
  $('#bk-save').addEventListener('click', () => {
    const m = marks.find(x => x.id === editing);
    if (m) {
      m.title = $('#bk-title').value.trim();
      m.book = $('#bk-book').value;
      m.page = Math.max(1, parseInt($('#bk-page').value, 10) || 1);
      m.note = $('#bk-note').value;
      persist();
      renderMarks();
    }
    closeModal();
  });
  $('#bk-unlink').addEventListener('click', () => {
    const m = marks.find(x => x.id === editing);
    if (m) { m.link = null; m.linkLabel = null; persist(); renderMarks(); }
    closeModal();
  });
  $('#bk-del').addEventListener('click', async () => {
    const m = marks.find(x => x.id === editing);
    if (m && (await confirmar(`Excluir a marcação “${m.title}”?`))) {
      marks = marks.filter(x => x.id !== m.id);
      persist();
      renderMarks();
    }
    closeModal();
  });
  $('#bk-close').addEventListener('click', closeModal);
  $('#bkmodal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
  $('#bkmodal').addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  window.__livrosData = () => marks;
  window.__renderBadges = renderBadges;
  renderMarks();
}

setupLivros();

