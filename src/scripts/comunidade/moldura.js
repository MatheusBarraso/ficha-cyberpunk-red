  // ---------- moldura da folha: linha fina com cantos cortados e degraus no meio, como as páginas da ficha ----------
  const NS = 'http://www.w3.org/2000/svg';
  const moldura = (() => {
    const svg = document.createElementNS(NS, 'svg'), path = document.createElementNS(NS, 'path');
    svg.setAttribute('class', 'cm-moldura'); svg.setAttribute('aria-hidden', 'true'); svg.append(path);
    function desenhar(W, H) {
      if (!W || !H) return;
      const p = matchMedia('(max-width:640px)').matches;
      const c = p ? 12 : 18, d = p ? 4 : 6, e = 1, w = W - 2 * e, h = H - 2 * e; // corte, degrau, meia linha
      const m = Math.round(w * 0.5), n = Math.round(h * 0.5);
      const pts = [[0, d + c], [c, d], [m - d, d], [m, 0], [w - d - c, 0], [w - d, c], [w - d, n - d], [w, n], [w, h - d - c], [w - c, h - d],
        [m + d, h - d], [m, h], [d + c, h], [d, h - c], [d, n + d], [0, n]];
      path.setAttribute('d', 'M' + pts.map(([x, y]) => `${x + e} ${y + e}`).join(' L') + ' Z');
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    }
    const ro = new ResizeObserver((es) => { for (const en of es) { const r = en.target.getBoundingClientRect(); desenhar(Math.round(r.width), Math.round(r.height)); } });
    let alvo = null;
    return { svg, seguir(el) { if (alvo) ro.unobserve(alvo); alvo = el; ro.observe(el); } };
  })();

