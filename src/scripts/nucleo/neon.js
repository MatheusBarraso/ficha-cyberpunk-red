
/* neon: na primeira vez que cada página da ficha aparece (nesta visita), as linhas acendem */
(function () {
  const vistas = new Set();
  function brilhar(i) {
    if (i === 5 || vistas.has(i)) return; // Livros abre no leitor
    if (document.body.classList.contains('comu-on')) { // a Comunidade está cobrindo a ficha: espera ela fechar
      addEventListener('cm-fechou', () => setTimeout(() => brilhar([...document.querySelectorAll('.sheet')].findIndex((s) => s.classList.contains('active'))), 80), { once: true });
      return;
    }
    vistas.add(i);
    const sheet = document.querySelectorAll('.sheet')[i];
    const fim = [];
    // passa a luz pela borda de cada elemento, com atraso conforme a posição na tela
    const acender = (lista, fx, fy) => {
      const H = innerHeight, W = innerWidth;
      lista.forEach((c) => {
        const r = c.getBoundingClientRect();
        if (!r.width || r.bottom < -50 || r.top > H + 200) return;
        c.classList.add('neon');
        if (getComputedStyle(c).position === 'static') c.classList.add('neon-rel');
        c.style.setProperty('--d', `${(Math.max(0, r.top) / H * fy + Math.max(0, r.left) / W * fx).toFixed(2)}s`);
        fim.push(() => { c.classList.remove('neon', 'neon-rel'); c.style.removeProperty('--d'); });
      });
    };
    if (sheet) {
      const bg = sheet.querySelector('.pdfbg'), art = bg && bg.querySelector(':scope > .pdfart');
      if (art) {
        // cópia das linhas, clara e brilhante, que só aparece dentro da faixa de luz
        const cor = document.createElement('div'); cor.className = 'corrida';
        const copia = art.cloneNode(true);
        copia.querySelectorAll('defs').forEach((d) => d.remove());
        copia.removeAttribute('id');
        cor.append(copia); bg.append(cor);
        fim.push(() => cor.remove());
      } else {
        // Anotações e História: a luz corre pelas bordas dos botões, do texto e do quadro
        acender(sheet.querySelectorAll('.notepad,.board,.btool,.pgsel,.pgtitle'), 0.9, 0.6);
      }
      sheet.classList.add('brilha'); fim.push(() => sheet.classList.remove('brilha'));
    }
    setTimeout(() => fim.forEach((f) => f()), 2900);
  }
  addEventListener('sk:pagina', (e) => brilhar(e.detail.pagina));
  const ativa = [...document.querySelectorAll('.sheet')].findIndex((s) => s.classList.contains('active'));
  const comecar = () => {
    if (document.documentElement.classList.contains('cm-gate')) { addEventListener('cm-gate-fim', () => setTimeout(comecar, 150), { once: true }); return; }
    if (document.visibilityState !== 'visible') {
      document.addEventListener('visibilitychange', function v() { if (document.visibilityState === 'visible') { document.removeEventListener('visibilitychange', v); comecar(); } });
      return;
    }
    setTimeout(() => requestAnimationFrame(() => {
      const atual = [...document.querySelectorAll('.sheet')].findIndex((s) => s.classList.contains('active'));
      brilhar(atual < 0 ? 0 : atual);
    }), 350);
  };
  if (document.readyState === 'complete') comecar(); else addEventListener('load', comecar, { once: true });
})();
