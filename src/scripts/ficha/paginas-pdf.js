;

function buildPdfPages() {
  for (const [pi, list] of Object.entries(FIELDMAP)) {
    const layer = $(`#layer-${pi}`);
    for (const d of list) {
      const [x, y, w, h] = d.r;
      const pos = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
      if (d.t === 'img') {
        const box = el('div', 'portrait');
        box.id = 'portrait'; box.style.cssText = pos;
        box.setAttribute('role', 'button'); box.tabIndex = 0;
        box.setAttribute('aria-label', 'Enviar imagem do personagem');
        box.append(el('span', 'ph', 'Clique para enviar a imagem do personagem'));
        const img = el('img'); img.id = 'portrait-img'; img.alt = 'Imagem do personagem';
        box.append(img); layer.append(box);
        continue;
      }
      if (d.t === 'atr' || d.t === 'base') {
        const s = el('span', `calc ${d.t}`);
        s.style.cssText = `${pos};font-size:${d.f}px`;
        if (d.t === 'atr') s.dataset.stat = d.s; else s.dataset.nvlf = d.nk;
        layer.append(s);
        continue;
      }
      const box = el('div', 'fx' + (d.c ? ' c' : '') + (d.t === 'c' ? ' chk' : ''));
      box.style.cssText = pos;
      box.dataset.label = d.lab || d.k;
      let inp;
      if (d.t === 'a') inp = el('textarea');
      else { inp = el('input'); inp.type = d.t === 'n' ? 'number' : d.t === 'c' ? 'checkbox' : 'text'; }
      inp.dataset.f = d.k;
      inp.setAttribute('aria-label', d.lab || d.k);
      if (d.pdf) inp.dataset.pdf = d.pdf;
      if (d.t !== 'c') inp.style.fontSize = `${d.f}px`;
      if (d.stat) { inp.dataset.stat = d.k; inp.min = 0; }
      if (d.nvl) { inp.dataset.nvl = ''; inp.dataset.atr = d.s; inp.min = 0; }
      box.append(inp);
      layer.append(box);
    }
  }
}

