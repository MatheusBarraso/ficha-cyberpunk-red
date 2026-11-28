/* ================= quadro livre (história) — com páginas ================= */
const BOARD_KEY = 'cpr-quadro-v2';
const BOARD_OLD = 'cpr-quadro-v1';

function setupBoard() {
  const cv = $('#board-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const board = $('#board');
  let tool = 'pen', color = '#111111', drawing = false, last = null;
  let saveT = null;
  let topZ = 10; // item tocado por último vem pra frente
  let espessura = 5;
  const desfazer = []; // fotos do quadro antes de cada traço/limpeza
  let bPages = [{ draw: '', items: [] }];
  let bCur = 0;
  // o desenho só é recodificado quando o traço mudou; senão reaproveita o salvo
  // (codificar a tela inteira a cada salvamento era o que deixava o quadro lento)
  let drawDirty = true;

  // carrega as páginas salvas (migra o formato antigo de quadro único)
  try {
    let d = JSON.parse(localStorage.getItem(BOARD_KEY) || 'null');
    if (!d) {
      const old = JSON.parse(localStorage.getItem(BOARD_OLD) || 'null');
      if (old) { d = { cur: 0, pages: [old] }; localStorage.removeItem(BOARD_OLD); }
    }
    if (d && Array.isArray(d.pages) && d.pages.length) {
      bPages = d.pages;
      bCur = Math.min(Math.max(d.cur | 0, 0), bPages.length - 1);
    }
  } catch { /* corrompido — começa do zero */ }

  const toCanvas = (e) => {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
  };
  const scheduleBoardSave = () => { clearTimeout(saveT); saveT = setTimeout(saveBoard, 600); };

  // JPEG sobre branco: o fundo do quadro já é branco, então o resultado é igual ao visto,
  // e o JPEG é menor e mais rápido de codificar que PNG/WebP (e vai direto pro PDF sem recodificação)
  function encodeDraw() {
    const c = document.createElement('canvas');
    c.width = cv.width; c.height = cv.height;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(cv, 0, 0);
    return c.toDataURL('image/jpeg', 0.9);
  }
  function snapshot() {
    if (!cv.dataset.sized) return; // quadro nunca exibido: o conteúdo salvo ainda é a verdade
    const items = itensAgora();
    const draw = drawDirty ? encodeDraw() : (bPages[bCur]?.draw || '');
    drawDirty = false;
    bPages[bCur] = { ...(bPages[bCur] || {}), draw, items };
  }
  function itensAgora() {
    return [...board.querySelectorAll('.bimg')].map(w => {
      const base = { x: parseFloat(w.style.left), y: parseFloat(w.style.top), w: parseFloat(w.style.width) };
      if (w.classList.contains('btxt')) {
        const o = { t: 'txt', text: w.querySelector('.bedit').innerText, color: w.querySelector('.bedit').style.color || '', ...base };
        if (w.classList.contains('nota')) o.nota = true;
        return o;
      }
      return { t: 'img', src: w.querySelector('img').src, ...base };
    });
  }
  function guardar() {
    if (!cv.dataset.sized) return;
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    c.getContext('2d').drawImage(cv, 0, 0);
    desfazer.push({ c, items: itensAgora() });
    if (desfazer.length > 12) desfazer.shift();
    $('#bt-undo').disabled = false;
  }
  function persist() {
    try {
      localStorage.setItem(BOARD_KEY, JSON.stringify({ cur: bCur, pages: bPages }));
      scheduleSave(); // atualiza o status "salvo às…"
    } catch { status.textContent = 'Quadro grande demais pro armazenamento do navegador'; }
  }
  function saveBoard() { snapshot(); persist(); }

  function renderPage(i) {
    bCur = Math.max(0, Math.min(i, bPages.length - 1));
    desfazer.length = 0; $('#bt-undo').disabled = true;
    ctx.clearRect(0, 0, cv.width, cv.height);
    drawDirty = false; // a tela agora espelha exatamente o desenho salvo desta página
    board.querySelectorAll('.bimg').forEach(w => w.remove());
    const pg = bPages[bCur] || { draw: '', items: [] };
    if (pg.draw) {
      const im = new Image();
      im.onload = () => ctx.drawImage(im, 0, 0, cv.width, cv.height);
      im.src = pg.draw;
    }
    for (const it of (pg.items || [])) {
      if (it.t === 'txt') addText(it);
      else addImage(it.src, it);
    }
    updateBar();
    persist();
  }
  function updateBar() {
    $('#bp-label').textContent = `Página ${bCur + 1} de ${bPages.length}`;
    const sel = $('#bp-sel');
    sel.replaceChildren(...bPages.map((p, k) => { const o = el('option', '', `${k + 1} · ${p.title || 'Sem título'}`); o.value = k; return o; }));
    sel.value = bCur;
    if (document.activeElement !== $('#bp-title')) $('#bp-title').value = (bPages[bCur] && bPages[bCur].title) || '';
    $('#bp-prev').disabled = bCur === 0;
    $('#bp-next').disabled = bCur === bPages.length - 1;
    $('#bp-del').disabled = bPages.length <= 1;
  }
  function gotoPage(i) {
    if (i === bCur || i < 0 || i >= bPages.length) return;
    snapshot(); // guarda a página atual antes de trocar
    if (!cv.dataset.sized) { bCur = i; updateBar(); persist(); return; }
    renderPage(i);
  }
  $('#bp-prev').addEventListener('click', () => gotoPage(bCur - 1));
  $('#bp-next').addEventListener('click', () => gotoPage(bCur + 1));
  $('#bp-add').addEventListener('click', () => {
    snapshot();
    bPages.push({ draw: '', items: [], title: '' });
    if (!cv.dataset.sized) { bCur = bPages.length - 1; updateBar(); persist(); return; }
    renderPage(bPages.length - 1);
    $('#bp-title').focus();
  });
  $('#bp-del').addEventListener('click', async () => {
    if (bPages.length <= 1) return;
    if (!(await confirmar(`Apagar a página ${bCur + 1} do quadro? Isso não tem volta.`))) return;
    bPages.splice(bCur, 1);
    const alvo = Math.min(bCur, bPages.length - 1);
    if (!cv.dataset.sized) { bCur = alvo; updateBar(); persist(); return; }
    renderPage(alvo);
  });

  // --- desenho ---
  cv.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    guardar();
    drawing = true; drawDirty = true; last = toCanvas(e);
    cv.setPointerCapture(e.pointerId);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = tool === 'eraser' ? Math.max(30, espessura * 3) : espessura;
    ctx.beginPath(); ctx.moveTo(last.x, last.y);
    ctx.lineTo(last.x + 0.01, last.y + 0.01); ctx.stroke(); // ponto único
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = toCanvas(e);
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p;
  });
  const endStroke = () => { if (drawing) { drawing = false; scheduleBoardSave(); } };
  cv.addEventListener('pointerup', endStroke);
  cv.addEventListener('pointercancel', endStroke);

  // --- ferramentas ---
  const setTool = (t) => {
    tool = t;
    $('#bt-pen').classList.toggle('active', t === 'pen');
    $('#bt-eraser').classList.toggle('active', t === 'eraser');
  };
  $('#bt-pen').addEventListener('click', () => setTool('pen'));
  $('#bt-eraser').addEventListener('click', () => setTool('eraser'));
  $('#bt-c1').addEventListener('click', () => { color = '#111111'; setTool('pen'); });
  $('#bt-c2').addEventListener('click', () => { color = corDaFicha(); setTool('pen'); });
  $('#bt-cor').addEventListener('input', (e) => { color = e.target.value; $('#bt-cor-lbl i').style.background = color; setTool('pen'); });
  const TRACOS = [[3, 'fino'], [5, 'médio'], [10, 'grosso'], [18, 'marcador']];
  $('#bt-traco').addEventListener('click', () => {
    const k = (TRACOS.findIndex((t) => t[0] === espessura) + 1) % TRACOS.length;
    espessura = TRACOS[k][0];
    $('#bt-traco').textContent = `Traço: ${TRACOS[k][1]}`;
  });
  $('#bt-undo').addEventListener('click', () => {
    const s = desfazer.pop();
    if (!s) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(s.c, 0, 0);
    board.querySelectorAll('.bimg').forEach(w => w.remove());
    for (const it of s.items) { if (it.t === 'txt') addText(it); else addImage(it.src, it); }
    drawDirty = true;
    $('#bt-undo').disabled = !desfazer.length;
    scheduleBoardSave();
  });
  $('#bt-nota').addEventListener('click', () => { guardar(); addText(null, { nota: true }); scheduleBoardSave(); });
  $('#bp-sel').addEventListener('change', (e) => gotoPage(+e.target.value));
  $('#bp-title').addEventListener('input', (e) => {
    if (!bPages[bCur]) bPages[bCur] = { draw: '', items: [] };
    bPages[bCur].title = e.target.value;
    const o = $('#bp-sel').options[bCur];
    if (o) o.textContent = `${bCur + 1} · ${e.target.value || 'Sem título'}`;
    persist();
  });
  $('#bp-title').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') e.target.blur(); });
  $('#bt-clear').addEventListener('click', async () => {
    if (!(await confirmar('Limpar a página atual do quadro (desenhos, textos e imagens)?'))) return;
    guardar();
    drawDirty = true;
    ctx.clearRect(0, 0, cv.width, cv.height);
    board.querySelectorAll('.bimg').forEach(w => w.remove());
    saveBoard();
  });

  // --- imagens móveis ---
  $('#bt-img').addEventListener('click', () => $('#board-file').click());
  $('#board-file').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const max = 700; const k = Math.min(1, max / Math.max(im.width, im.height));
        let src = rd.result;
        if (k < 1) {
          const c2 = document.createElement('canvas');
          c2.width = Math.round(im.width * k); c2.height = Math.round(im.height * k);
          c2.getContext('2d').drawImage(im, 0, 0, c2.width, c2.height);
          src = c2.toDataURL('image/jpeg', 0.82);
        }
        guardar(); addImage(src);
        scheduleBoardSave();
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  });

  function addImage(src, pos) {
    const w = el('div', 'bimg');
    const im = el('img'); im.src = src; im.alt = 'Imagem do quadro'; im.draggable = false;
    const del = el('button', 'bdel', '×'); del.type = 'button'; del.title = 'Remover imagem';
    const rsz = el('span', 'brsz');
    w.append(im, del, rsz);
    const nI = board.querySelectorAll('.bimg').length;
    w.style.left = `${pos ? pos.x : 660 + (nI % 6) * 50}px`;
    w.style.top = `${pos ? pos.y : 240 + (nI % 6) * 50}px`;
    w.style.width = `${pos ? pos.w : 560}px`;
    board.append(w);

    del.addEventListener('click', () => { w.remove(); scheduleBoardSave(); });
    w.addEventListener('pointerdown', (e) => { if (e.target === del || e.target === rsz) return; startDrag(e, w, w); });
    rsz.addEventListener('pointerdown', (e) => e.stopImmediatePropagation(), true);
    resizify(rsz, w);
  }

  function startDrag(e, w, captureEl) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    w.classList.add('moving');
    w.style.zIndex = ++topZ;
    const s = board.getBoundingClientRect().width / cv.width;
    const sx = e.clientX, sy = e.clientY, ox = parseFloat(w.style.left), oy = parseFloat(w.style.top);
    captureEl.setPointerCapture(e.pointerId);
    const mv = (ev) => {
      w.style.left = `${ox + (ev.clientX - sx) / s}px`;
      w.style.top = `${oy + (ev.clientY - sy) / s}px`;
    };
    const up = () => {
      w.classList.remove('moving');
      captureEl.removeEventListener('pointermove', mv);
      captureEl.removeEventListener('pointerup', up);
      captureEl.removeEventListener('pointercancel', up);
      scheduleBoardSave();
    };
    captureEl.addEventListener('pointermove', mv);
    captureEl.addEventListener('pointerup', up);
    captureEl.addEventListener('pointercancel', up);
  }

  function dragify(handle, w) {
    handle.addEventListener('pointerdown', (e) => startDrag(e, w, handle));
  }

  function resizify(rsz, w) {
    rsz.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      w.classList.add('moving');
      const s = board.getBoundingClientRect().width / cv.width;
      const sx = e.clientX, ow = parseFloat(w.style.width);
      rsz.setPointerCapture(e.pointerId);
      const mv = (ev) => { w.style.width = `${Math.max(120, ow + (ev.clientX - sx) / s)}px`; };
      const up = () => {
        w.classList.remove('moving');
        rsz.removeEventListener('pointermove', mv);
        rsz.removeEventListener('pointerup', up);
        rsz.removeEventListener('pointercancel', up);
        scheduleBoardSave();
      };
      rsz.addEventListener('pointermove', mv);
      rsz.addEventListener('pointerup', up);
      rsz.addEventListener('pointercancel', up);
    });
  }

  // --- blocos de texto móveis ---
  $('#bt-text').addEventListener('click', () => { guardar(); addText(); scheduleBoardSave(); });

  function addText(pos, opts) {
    const w = el('div', 'bimg btxt');
    const ehNota = !!((pos && pos.nota) || (opts && opts.nota));
    if (ehNota) w.classList.add('nota');
    const grip = el('span', 'bgrip', '⠿');
    const edit = el('div', 'bedit');
    edit.contentEditable = 'true';
    edit.setAttribute('aria-label', 'Bloco de texto do quadro');
    edit.innerText = pos ? (pos.text || '') : (ehNota ? 'Pista…' : 'Escreve aqui…');
    if (pos && pos.color) edit.style.color = pos.color;
    else if (!pos) edit.style.color = ehNota ? '#111111' : color;
    const del = el('button', 'bdel', '×'); del.type = 'button'; del.title = 'Remover texto';
    const rsz = el('span', 'brsz');
    w.append(grip, edit, del, rsz);
    const nT = board.querySelectorAll('.bimg').length;
    w.style.left = `${pos ? pos.x : 180 + (nT % 6) * 50}px`;
    w.style.top = `${pos ? pos.y : 220 + (nT % 6) * 50}px`;
    w.style.width = `${pos ? pos.w : (ehNota ? 320 : 480)}px`;
    board.append(w);
    del.addEventListener('click', () => { w.remove(); scheduleBoardSave(); });
    edit.addEventListener('input', scheduleBoardSave);
    edit.addEventListener('keydown', (e) => { e.stopPropagation(); });
    edit.addEventListener('pointerdown', () => { w.style.zIndex = ++topZ; });
    dragify(grip, w);
    resizify(rsz, w);
    if (!pos) { // texto novo: já entra em edição (foco imediato, senão a barra de espaço re-dispara o botão)
      edit.focus();
      document.getSelection()?.selectAllChildren(edit);
    }
  }

  window.__clearBoard = () => {
    bPages = [{ draw: '', items: [] }];
    bCur = 0;
    drawDirty = false;
    localStorage.removeItem(BOARD_KEY);
    if (cv.dataset.sized) { ctx.clearRect(0, 0, cv.width, cv.height); board.querySelectorAll('.bimg').forEach(w => w.remove()); }
    updateBar();
  };
  window.__boardPages = () => { snapshot(); return bPages; };
  window.__boardData = () => { snapshot(); persist(); return { cur: bCur, pages: bPages }; };

  // o quadro fica numa página oculta: mede e renderiza só na primeira exibição
  // (redimensionar o canvas apaga o conteúdo; depois disso ele fica vivo no DOM)
  window.__boardShow = () => {
    if (cv.dataset.sized) return;
    const sheet = cv.closest('.sheet');
    const sc = sheet.getBoundingClientRect().width / 1920 || 1;
    const r = board.getBoundingClientRect();
    if (r.width < 10) return;
    cv.width = Math.round(r.width / sc);
    cv.height = Math.round(r.height / sc);
    cv.dataset.sized = '1';
    renderPage(bCur);
  };

  updateBar();
}

setupBoard();


