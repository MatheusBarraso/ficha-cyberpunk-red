  // ----- MODO AJUDA: abrir um campo escurece a ficha e só ele fica aceso -----
  // No mestre vale pra qualquer ficha aberta. Se for a ficha de um player, a tela dele mostra o mesmo destaque
  // (o mestre "aponta" o campo pro player), com o nome do campo embaixo.
  const ajudaOn = () => { try { return localStorage.getItem('cpr-ajuda') !== '0'; } catch { return true; } };
  const AJUDA_VALE = 120000;
  let focoAtual = null, ajudaEnviada = null, tAjuda = 0;
  const legenda = h('div', { class: 'cm-foco-leg', hidden: true, role: 'status', 'aria-live': 'polite' });
  function focoLimpar() {
    if (focoAtual) {
      cancelAnimationFrame(focoAtual.raf);
      focoAtual.els.forEach((e) => e.classList.remove('cm-foco-alvo'));
      if (focoAtual.marca) focoAtual.marca.remove();
      if (focoAtual.layer) focoAtual.layer.classList.remove('cm-foco-on');
      focoAtual.moldura.remove();
    }
    focoAtual = null; legenda.hidden = true;
  }
  const caixa = (e) => ({ el: e, x: parseFloat(e.style.left) || 0, y: parseFloat(e.style.top) || 0, w: parseFloat(e.style.width) || 0, h: parseFloat(e.style.height) || 0 });
  // posição dos rótulos do desenho (fixos): mede uma vez por folha, quando ela está visível
  let textosCache = new WeakMap();
  try { document.fonts.addEventListener('loadingdone', () => { textosCache = new WeakMap(); }); } catch { /* ok */ }
  function textosDa(sheet) {
    if (!sheet) return null;
    if (textosCache.has(sheet)) return textosCache.get(sheet);
    const l = [...sheet.querySelectorAll('.pdfart text')].map((t) => { try { const b = t.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; } catch { return null; } }).filter((b) => b && b.w > 0);
    if (!l.length) return null; // folha escondida: mede de novo depois
    textosCache.set(sheet, l); return l;
  }
  // a área acesa: a linha inteira (perícia com NVL, ATR e BASE; linha de arma ou armadura) e o rótulo do campo
  function areaDoCampo(fx) {
    const layer = fx.closest('.pdflayer'), alvo = caixa(fx);
    const todos = [...layer.querySelectorAll(':scope > .fx, :scope > .calc')].map(caixa).filter((c) => c.w > 0);
    const naLinha = todos.filter((c) => Math.abs(c.y - alvo.y) < 4 && Math.abs(c.h - alvo.h) < 8).sort((a, b) => a.x - b.x);
    // junta os vizinhos colados (até a próxima coluna, que fica longe)
    let ini = naLinha.indexOf(naLinha.find((c) => c.el === fx)), fim = ini;
    while (ini > 0 && naLinha[ini].x - (naLinha[ini - 1].x + naLinha[ini - 1].w) < 24) ini--;
    while (fim < naLinha.length - 1 && naLinha[fim + 1].x - (naLinha[fim].x + naLinha[fim].w) < 24) fim++;
    let linha = naLinha.slice(ini, fim + 1);
    let x0 = Math.min(...linha.map((c) => c.x)), x1 = Math.max(...linha.map((c) => c.x + c.w));
    let y0 = alvo.y, y1 = alvo.y + alvo.h;
    const antes = ini > 0 ? naLinha[ini - 1].x + naLinha[ini - 1].w : 0;
    // textos do desenho (rótulos): à esquerda na mesma linha (nome da perícia) ou logo acima (NOME, PAPEL...)
    const sheet = fx.closest('.sheet');
    const textos = textosDa(sheet) || [];
    const fora = todos.filter((c) => !linha.includes(c));
    const bloqueado = (t) => fora.some((c) => c.x + c.w > t.x + t.w - 2 && c.x + c.w <= x0 + 2 && c.y < y1 && c.y + c.h > y0); // outra caixa no meio (ex.: Vícios)
    const cabecalho = (t) => fora.some((c) => c.x <= t.x + 1 && c.x + c.w >= t.x + t.w - 1 && c.y >= t.y + t.h - 6 && c.y - (t.y + t.h) < 20); // título de coluna de outra tabela (PB, PENALIDADE…)
    // texto dentro da faixa de uma coluna de outra tabela, logo acima ou abaixo dela (PB, PENALIDADE, "Penalidade aplicada…")
    const emColuna = (t) => fora.some((c) => c.x <= t.x + 2 && c.x + c.w >= t.x + Math.min(t.w, 20) && Math.abs((c.y + c.h / 2) - (t.y + t.h / 2)) < 60 && !(c.y + c.h / 2 > y0 && c.y + c.h / 2 < y1));
    const rodape = (t) => fora.some((c) => c.x <= t.x + 1 && c.x + c.w > t.x && c.y + c.h <= t.y + 6 && t.y - (c.y + c.h) < 20); // texto embaixo de outra tabela (Penalidade aplicada…)
    const esq = textos.filter((t) => t.y + t.h > y0 + 2 && t.y < y1 - 2 && t.x + t.w <= x0 + 2 && t.x >= antes - 2 && x0 - t.x <= 320 && !bloqueado(t) && !cabecalho(t) && !rodape(t) && !emColuna(t));
    const acima = (t) => t.y + t.h <= y0 + 2 && y0 - t.y < 260;
    const maeDe = () => textos.filter((t) => acima(t) && t.x >= antes - 2 && t.x < x0 - 12 && t.x >= x0 - 50 && !bloqueado(t) && !emColuna(t)); // perícia mãe: só um recuo à esquerda
    // tabela (armadura, armas): fica só a tabela do campo, com o título e o cabeçalho de cada coluna
    let tabela = false;
    if (!esq.length && linha.length >= 2 && !maeDe().length) {
      const cab = textos.filter((t) => acima(t) && t.x >= x0 - 12 && t.x < x1);
      const cabDe = (c) => cab.filter((t) => t.x < c.x + c.w && t.x + t.w > c.x).sort((a, b) => b.y - a.y)[0];
      const hAlvo = cabDe(alvo);
      // só vale se entre o cabeçalho e o campo só tiver linhas da mesma coluna
      const limpo = hAlvo && todos.filter((c) => c.x < alvo.x + alvo.w && c.x + c.w > alvo.x && c.y > hAlvo.y && c.y < alvo.y)
        .every((c) => Math.abs(c.x - alvo.x) < 3 && Math.abs(c.w - alvo.w) < 3);
      if (limpo) {
        const grupo = linha.filter((c) => { const hc = cabDe(c); return hc && Math.abs(hc.y - hAlvo.y) < 6; });
        if (grupo.length) linha = grupo;
        x0 = Math.min(...linha.map((c) => c.x)); x1 = Math.max(...linha.map((c) => c.x + c.w)); y0 = hAlvo.y;
        const titulo = cab.filter((t) => t.y < hAlvo.y - 4 && hAlvo.y - t.y < 42 && t.x >= x0 - 4 && t.x + t.w <= x1 + 4);
        if (titulo.length) y0 = Math.min(y0, ...titulo.map((t) => t.y));
        tabela = true;
      }
    }
    if (tabela) { /* pronto */ }
    else if (esq.length) x0 = Math.min(x0, ...esq.map((t) => t.x));
    else {
      const cima = textos.filter((t) => t.y < y0 - 2 && t.y + t.h <= y0 + 12 && t.y + t.h >= y0 - 26 && t.x < x1 && t.x + t.w > x0 - 2);
      if (cima.length) { y0 = Math.min(y0, ...cima.map((t) => t.y)); x0 = Math.min(x0, ...cima.map((t) => t.x)); }
      const dentro = textos.filter((t) => t.y >= y0 - 2 && t.y + t.h <= y1 + 2 && t.x >= x0 - 4 && t.x < x1); // rótulo dentro da caixa (INT, REF…)
      if (dentro.length) y0 = Math.min(y0, ...dentro.map((t) => t.y));
    }
    // linha sem nada escrito (sublinha de Idioma, Especialista Local, Artes Marciais…): sobe até a perícia mãe
    const toca = (t) => t.x < x1 && t.x + t.w > x0 && t.y < y1 && t.y + t.h > y0;
    if (!tabela && !textos.some(toca)) {
      const mae = maeDe();
      const cab = textos.filter((t) => acima(t) && t.x >= x0 - 12 && t.x < x1);
      const m = (mae.length ? mae : cab).sort((a, b) => b.y - a.y)[0];
      if (m) { y0 = m.y; x0 = Math.min(x0, m.x); }
    }
    // tudo que ficou dentro da área acesa não escurece
    const els = todos.filter((c) => c.x >= x0 - 8 && c.x + c.w <= x1 + 8 && c.y >= y0 - 8 && c.y + c.h <= y1 + 8).map((c) => c.el);
    linha.forEach((c) => { if (!els.includes(c.el)) els.push(c.el); });
    return { layer, els, parcial: !textosDa(sheet), x0: x0 - 6, y0: y0 - 5, x1: x1 + 6, y1: y1 + 5 };
  }
