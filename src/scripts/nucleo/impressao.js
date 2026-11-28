/* ================= impressão: materializa todas as páginas ================= */
function buildPrintPages() {
  const root = el('div'); root.id = 'print-root';
  const notes = window.__notesPages ? window.__notesPages() : [];
  const boards = window.__boardPages ? window.__boardPages() : [];

  notes.forEach((pg, i) => {
    const sc = el('div', 'scaler print-pg');
    const sheet = el('section', 'sheet p4');
    sheet.append(el('div', 'phead', (notes.length > 1 ? `Anotações (${i + 1}/${notes.length})` : 'Anotações') + (pg.title ? ` — ${pg.title}` : '')));
    const pad2 = el('div', 'notepad');
    const ed = el('div', 'npedit');
    ed.innerHTML = pg.html || '';
    pad2.append(ed);
    for (const im of (pg.imgs || [])) {
      const w = el('div', 'bimg');
      const img = el('img'); img.src = im.src; img.alt = '';
      w.append(img);
      w.style.left = `${im.x}px`; w.style.top = `${im.y}px`; w.style.width = `${im.w}px`;
      pad2.append(w);
    }
    sheet.append(pad2); sc.append(sheet); root.append(sc);
  });

  boards.forEach((pg, i) => {
    const sc = el('div', 'scaler print-pg');
    const sheet = el('section', 'sheet p5');
    sheet.append(el('div', 'phead', (boards.length > 1 ? `História — Quadro Livre (${i + 1}/${boards.length})` : 'História — Quadro Livre') + (pg.title ? ` — ${pg.title}` : '')));
    const bd = el('div', 'board');
    if (pg.draw) {
      const im = el('img'); im.src = pg.draw; im.alt = '';
      im.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
      bd.append(im);
    }
    for (const it of (pg.items || [])) {
      const w = el('div', it.t === 'txt' ? `bimg btxt${it.nota ? ' nota' : ''}` : 'bimg');
      if (it.t === 'txt') {
        const ed2 = el('div', 'bedit');
        ed2.innerText = it.text || '';
        if (it.color) ed2.style.color = it.color;
        w.append(ed2);
      } else {
        const img = el('img'); img.src = it.src; img.alt = '';
        w.append(img);
      }
      w.style.left = `${it.x}px`; w.style.top = `${it.y}px`; w.style.width = `${it.w}px`;
      bd.append(w);
    }
    sheet.append(bd); sc.append(sheet); root.append(sc);
  });

  document.body.append(root);
  document.body.classList.add('pm');
}

window.addEventListener('beforeprint', () => { if (!$('#print-root')) buildPrintPages(); });
window.addEventListener('afterprint', () => { $('#print-root')?.remove(); document.body.classList.remove('pm'); });

// PWA


