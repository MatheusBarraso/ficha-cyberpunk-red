/* ================= anotações (editor tipo word) — com páginas ================= */
const NOTES_KEY = 'cpr-notas-v2';

function setupNotes() {
  const pad = $('#notepad');
  if (!pad) return;
  const edit = $('#npedit');
  let nPages = [{ html: '', imgs: [] }];
  let nCur = 0;
  let saveT = null;
  let topZ = 10;

  // carrega as páginas salvas
  try {
    const d = JSON.parse(localStorage.getItem(NOTES_KEY) || 'null');
    if (d && Array.isArray(d.pages) && d.pages.length) {
      nPages = d.pages;
      nCur = Math.min(Math.max(d.cur | 0, 0), nPages.length - 1);
    }
  } catch { /* corrompido — começa do zero */ }
  // migra o texto da ficha antiga (textarea única) pra página 1
  try {
    const old = JSON.parse(localStorage.getItem(KEY) || 'null');
    const t = old && old['ANOTAÇÕES GERAIS'];
    if (t && nPages.every(p => !p.html)) {
      nPages[0].html = String(t)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }
  } catch { /* ok */ }

  const scheduleNotesSave = () => { clearTimeout(saveT); saveT = setTimeout(saveNotes, 600); };

  function snapshot() {
    nPages[nCur] = {
      ...(nPages[nCur] || {}),
      html: edit.innerHTML,
      imgs: [...pad.querySelectorAll('.nimg')].map(w => ({
        src: w.querySelector('img').src,
        x: parseFloat(w.style.left), y: parseFloat(w.style.top), w: parseFloat(w.style.width)
      }))
    };
  }
  function persist() {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify({ cur: nCur, pages: nPages }));
      scheduleSave(); // atualiza o status "salvo às…"
    } catch { status.textContent = 'Anotações grandes demais pro armazenamento do navegador'; }
  }
  function saveNotes() { snapshot(); persist(); }

  function renderPage(i) {
    nCur = Math.max(0, Math.min(i, nPages.length - 1));
    const pg = nPages[nCur] || { html: '', imgs: [] };
    edit.innerHTML = pg.html || '';
    pad.querySelectorAll('.nimg').forEach(w => w.remove());
    for (const im of (pg.imgs || [])) addImg(im.src, im);
    updateBar();
    persist();
  }
  function updateBar() {
    $('#np-label').textContent = `Página ${nCur + 1} de ${nPages.length}`;
    const sel = $('#np-sel');
    sel.replaceChildren(...nPages.map((p, k) => { const o = el('option', '', `${k + 1} · ${p.title || 'Sem título'}`); o.value = k; return o; }));
    sel.value = nCur;
    if (document.activeElement !== $('#np-title')) $('#np-title').value = nPages[nCur].title || '';
    $('#np-prev').disabled = nCur === 0;
    $('#np-next').disabled = nCur === nPages.length - 1;
    $('#np-del').disabled = nPages.length <= 1;
  }
  function gotoPage(i) {
    if (i === nCur || i < 0 || i >= nPages.length) return;
    snapshot();
    renderPage(i);
  }
  $('#np-prev').addEventListener('click', () => gotoPage(nCur - 1));
  $('#np-next').addEventListener('click', () => gotoPage(nCur + 1));
  $('#np-add').addEventListener('click', () => {
    escolherModelo('Nova página', (m) => {
      snapshot();
      nPages.push({ html: modeloHTML(m), imgs: [], title: m.titulo(), tipo: m.tipo });
      renderPage(nPages.length - 1);
      if (m.campos && nPages[nCur].title.endsWith('— ')) { $('#np-title').focus(); } else edit.focus();
    });
  });
  $('#np-sel').addEventListener('change', (e) => gotoPage(+e.target.value));
  $('#np-title').addEventListener('input', (e) => {
    nPages[nCur].title = e.target.value;
    const o = $('#np-sel').options[nCur];
    if (o) o.textContent = `${nCur + 1} · ${e.target.value || 'Sem título'}`;
    scheduleNotesSave();
  });
  $('#np-title').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); edit.focus(); } });
  // escreve no ponto do cursor (se o cursor não está no texto, vai pro fim da página)
  function inserirNoTexto(html) {
    const s = document.getSelection();
    if (!s.rangeCount || !edit.contains(s.anchorNode)) {
      edit.focus();
      const r = document.createRange(); r.selectNodeContents(edit); r.collapse(false);
      s.removeAllRanges(); s.addRange(r);
    }
    document.execCommand('insertHTML', false, html);
    scheduleNotesSave();
  }
  $('#nt-data').addEventListener('click', () => inserirNoTexto(`<b>${hojeBR()}</b>&nbsp;— `));
  $('#nt-modelo').addEventListener('click', () => {
    const s = document.getSelection();
    const guardado = s.rangeCount && edit.contains(s.anchorNode) ? s.getRangeAt(0).cloneRange() : null;
    escolherModelo('Inserir modelo nesta página', (m) => {
      if (guardado) { edit.focus(); s.removeAllRanges(); s.addRange(guardado); }
      inserirNoTexto(modeloHTML(m));
    }, true);
  });
  // busca em todas as páginas (sem acento, sem maiúscula)
  const semAcento = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  $('#nt-busca').addEventListener('click', () => {
    snapshot();
    const box = el('div'); box.style.cssText = 'display:flex;flex-direction:column;gap:8px';
    const q = el('input', 'jn-q'); q.type = 'search'; q.placeholder = 'Nome, lugar, gig…'; q.setAttribute('aria-label', 'Buscar nas anotações');
    const res = el('div'); res.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    box.append(q, res);
    const j = janela('Buscar nas anotações', box);
    const tmp = document.createElement('div');
    const textos = nPages.map((p) => { tmp.innerHTML = p.html || ''; return `${p.title || ''}
${tmp.innerText || tmp.textContent || ''}`; });
    const busca = () => {
      const termo = semAcento(q.value.trim());
      res.replaceChildren();
      if (termo.length < 2) { res.append(el('div', 'jn-vazio', 'Digita pelo menos 2 letras.')); return; }
      let n = 0;
      textos.forEach((t, k) => {
        const plano = semAcento(t); const at = plano.indexOf(termo);
        if (at < 0) return;
        n++;
        const b = el('button', 'jn-res'); b.type = 'button';
        b.append(el('b', '', `Página ${k + 1} · ${nPages[k].title || 'Sem título'}`));
        const ini = Math.max(0, at - 40), fim = Math.min(t.length, at + termo.length + 60);
        const sp = el('span');
        sp.append((ini ? '…' : '') + t.slice(ini, at).replace(/\s+/g, ' '));
        sp.append(el('mark', '', t.slice(at, at + termo.length)));
        sp.append(t.slice(at + termo.length, fim).replace(/\s+/g, ' ') + (fim < t.length ? '…' : ''));
        b.append(sp);
        b.addEventListener('click', () => { j.fechar(); gotoPage(k); });
        res.append(b);
      });
      if (!n) res.append(el('div', 'jn-vazio', 'Nada encontrado, choom.'));
    };
    q.addEventListener('input', busca);
    q.addEventListener('keydown', (e) => e.stopPropagation());
    busca(); q.focus();
  });
  $('#np-del').addEventListener('click', async () => {
    if (nPages.length <= 1) return;
    if (!(await confirmar(`Apagar a página ${nCur + 1} das anotações? Isso não tem volta.`))) return;
    nPages.splice(nCur, 1);
    renderPage(Math.min(nCur, nPages.length - 1));
  });

  // --- formatação (pointerdown com preventDefault mantém a seleção do texto) ---
  try { document.execCommand('styleWithCSS', false, true); } catch { /* ok */ }
  for (const b of document.querySelectorAll('.notes-tools .btool')) {
    b.addEventListener('pointerdown', (e) => e.preventDefault());
  }
  for (const b of document.querySelectorAll('.notes-tools .fmt')) {
    b.addEventListener('click', () => { document.execCommand(b.dataset.cmd, false, null); scheduleNotesSave(); });
  }
  $('#nt-big').addEventListener('click', () => { document.execCommand('fontSize', false, '7'); scheduleNotesSave(); });
  $('#nt-small').addEventListener('click', () => { document.execCommand('fontSize', false, '3'); scheduleNotesSave(); });
  $('#nt-c1').addEventListener('click', () => { document.execCommand('foreColor', false, '#111111'); scheduleNotesSave(); });
  $('#nt-c2').addEventListener('click', () => { document.execCommand('foreColor', false, corDaFicha()); scheduleNotesSave(); });
  $('#nt-clearfmt').addEventListener('click', () => { document.execCommand('removeFormat', false, null); scheduleNotesSave(); });
  edit.addEventListener('input', scheduleNotesSave);
  edit.addEventListener('keydown', (e) => { e.stopPropagation(); });

  // --- imagens flutuantes (movem livremente por cima do texto) ---
  const scaleF = () => {
    const r = pad.getBoundingClientRect();
    return pad.clientWidth ? r.width / pad.clientWidth : 1;
  };

  $('#nt-img').addEventListener('click', () => $('#notes-file').click());
  $('#notes-file').addEventListener('change', (e) => {
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
        addImg(src);
        scheduleNotesSave();
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  });

  function addImg(src, pos) {
    const w = el('div', 'bimg nimg');
    const im = el('img'); im.src = src; im.alt = 'Imagem das anotações'; im.draggable = false;
    const del = el('button', 'bdel', '×'); del.type = 'button'; del.title = 'Remover imagem';
    const rsz = el('span', 'brsz');
    w.append(im, del, rsz);
    const n = pad.querySelectorAll('.nimg').length;
    w.style.left = `${pos ? pos.x : 640 + (n % 6) * 50}px`;
    w.style.top = `${pos ? pos.y : 120 + (n % 6) * 50}px`;
    w.style.width = `${pos ? pos.w : 460}px`;
    pad.append(w);

    del.addEventListener('click', () => { w.remove(); scheduleNotesSave(); });
    w.addEventListener('pointerdown', (e) => {
      if (e.target === del || e.target === rsz) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      w.classList.add('moving');
      w.style.zIndex = ++topZ;
      const s = scaleF();
      const sx = e.clientX, sy = e.clientY, ox = parseFloat(w.style.left), oy = parseFloat(w.style.top);
      w.setPointerCapture(e.pointerId);
      const mv = (ev) => {
        w.style.left = `${ox + (ev.clientX - sx) / s}px`;
        w.style.top = `${oy + (ev.clientY - sy) / s}px`;
      };
      const up = () => {
        w.classList.remove('moving');
        w.removeEventListener('pointermove', mv);
        w.removeEventListener('pointerup', up);
        w.removeEventListener('pointercancel', up);
        scheduleNotesSave();
      };
      w.addEventListener('pointermove', mv);
      w.addEventListener('pointerup', up);
      w.addEventListener('pointercancel', up);
    });
    rsz.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      w.classList.add('moving');
      const s = scaleF();
      const sx = e.clientX, ow = parseFloat(w.style.width);
      rsz.setPointerCapture(e.pointerId);
      const mv = (ev) => { w.style.width = `${Math.max(100, ow + (ev.clientX - sx) / s)}px`; };
      const up = () => {
        w.classList.remove('moving');
        rsz.removeEventListener('pointermove', mv);
        rsz.removeEventListener('pointerup', up);
        rsz.removeEventListener('pointercancel', up);
        scheduleNotesSave();
      };
      rsz.addEventListener('pointermove', mv);
      rsz.addEventListener('pointerup', up);
      rsz.addEventListener('pointercancel', up);
    });
  }

  window.__clearNotes = () => {
    nPages = [{ html: '', imgs: [] }];
    nCur = 0;
    localStorage.removeItem(NOTES_KEY);
    renderPage(0);
  };
  window.__notesPages = () => { snapshot(); return nPages; };
  window.__notesData = () => { snapshot(); persist(); return { cur: nCur, pages: nPages }; };

  renderPage(nCur);
}

setupNotes();

