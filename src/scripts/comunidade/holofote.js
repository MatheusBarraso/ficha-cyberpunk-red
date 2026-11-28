  // ----- o holofote: uma camada fixa na tela que segue o campo a cada quadro -----
  // ao aparecer, o escuro fecha devagar das bordas da tela até o campo (com zoom ou no celular, o player acha onde ir)
  // o campo numa folha de ficha de qualquer sistema; a caixa dele é quem tem data-label (CPR: .fx; Sistema livre: .sl-campo)
  const FOCO_SEL = (c) => `.sheet.sk-ficha [data-f="${CSS.escape(c)}"]`;
  const naFicha = (t) => t instanceof HTMLElement && !!t.dataset.f && !!t.closest('.sheet.sk-ficha');
  const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function recorte(f) { // área onde o escuro aparece: a ficha (não cobre barra nem painéis)
    const vw = innerWidth, vh = innerHeight;
    let r = { x: 0, y: 0, r: vw, b: vh };
    const st = f.stage && f.stage.getBoundingClientRect();
    if (st && st.width) r = { x: Math.max(0, st.left), y: Math.max(0, st.top), r: Math.min(vw, st.right), b: Math.min(vh, st.bottom) };
    const tb = document.querySelector('.toolbar'); const tr = tb && tb.getBoundingClientRect();
    if (tr && tr.height && tr.top < 4 && tr.width > innerWidth * 0.6 && tr.bottom < innerHeight * 0.4 && getComputedStyle(tb).position !== 'static') r.y = Math.max(r.y, tr.bottom); // só barra de cima
    return r;
  }
  function alvoNaTela(f) {
    const b = f.alvoEl.getBoundingClientRect();
    if (!b.width && !b.height) return null;
    const p = f.marca ? 0 : 6;
    return { x: b.left - p, y: b.top - p, w: b.width + 2 * p, h: b.height + 2 * p };
  }
  function quadroFoco() {
    const f = focoAtual; if (!f) return;
    if (f.parcial && textosDa(f.fx.closest('.sheet'))) { // a folha apareceu: refaz a área com os rótulos
      f.parcial = false;
      const a = areaDoCampo(f.fx);
      f.els.forEach((e) => e.classList.remove('cm-foco-alvo')); f.els = a.els; f.els.forEach((e) => e.classList.add('cm-foco-alvo'));
      f.marca.style.cssText = `left:${a.x0}px;top:${a.y0}px;width:${a.x1 - a.x0}px;height:${a.y1 - a.y0}px`;
    }
    const c = recorte(f), alvo = alvoNaTela(f);
    const m = f.moldura.style;
    m.left = c.x + 'px'; m.top = c.y + 'px'; m.width = Math.max(0, c.r - c.x) + 'px'; m.height = Math.max(0, c.b - c.y) + 'px';
    if (!alvo) { f.luz.hidden = true; f.raf = requestAnimationFrame(quadroFoco); return; }
    f.luz.hidden = false;
    let q = alvo;
    const t = Math.min(1, (performance.now() - f.t0) / f.dur);
    if (t < 1) {
      // de: a tela inteira (um pouco pra fora, pra borda escura entrar de fora) ou o lugar do destaque anterior
      const de = f.de || { x: c.x - 40, y: c.y - 40, w: c.r - c.x + 80, h: c.b - c.y + 80 };
      const k = suave(t);
      q = { x: de.x + (alvo.x - de.x) * k, y: de.y + (alvo.y - de.y) * k, w: de.w + (alvo.w - de.w) * k, h: de.h + (alvo.h - de.h) * k };
    }
    f.ultimo = q;
    if (t >= 1 && f.depois) { const d = f.depois; f.depois = null; d(); }
    const l = f.luz.style;
    l.left = (q.x - c.x) + 'px'; l.top = (q.y - c.y) + 'px'; l.width = q.w + 'px'; l.height = q.h + 'px';
    f.raf = requestAnimationFrame(quadroFoco);
  }
  function focoEm(campo, texto, lento) {
    const inp = document.querySelector(FOCO_SEL(campo));
    const fx = inp && inp.closest('[data-label]');
    if (!fx) { focoLimpar(); return null; }
    if (focoAtual && focoAtual.campo === campo && focoAtual.inp === inp) { if (texto) { legenda.textContent = texto; legenda.hidden = false; } return fx; }
    const anterior = focoAtual && focoAtual.ultimo;
    focoLimpar();
    // no desenho do PDF a área é a linha inteira com o rótulo (modo-ajuda.js); na ficha em HTML, a própria caixa
    let a = { layer: null, els: [fx], parcial: false }, marca = null;
    if (fx.closest('.pdflayer')) {
      a = areaDoCampo(fx);
      marca = h('div', { class: 'cm-foco-marca', 'aria-hidden': 'true' });
      marca.style.cssText = `left:${a.x0}px;top:${a.y0}px;width:${a.x1 - a.x0}px;height:${a.y1 - a.y0}px`;
      a.layer.append(marca); a.layer.classList.add('cm-foco-on');
    }
    const layer = a.layer, els = a.els, alvoEl = marca || fx;
    els.forEach((e) => e.classList.add('cm-foco-alvo'));
    const luz = h('div', { class: 'cm-foco-luz', 'aria-hidden': 'true' });
    const moldura = h('div', { class: 'cm-foco-moldura', 'aria-hidden': 'true' }, luz);
    document.body.append(moldura);
    focoAtual = { campo, inp, fx, alvoEl, marca, layer, els, luz, moldura, stage: inp.closest('.stage'), parcial: a.parcial,
      t0: performance.now(), dur: anterior ? (lento ? 700 : 260) : (lento ? 1700 : 420), de: anterior, raf: 0, ultimo: null };
    quadroFoco();
    if (texto) { legenda.textContent = texto; legenda.hidden = false; }
    return fx;
  }
  // mestre: entrou num campo
  document.addEventListener('focusin', (e) => {
    const t = e.target; if (!naFicha(t)) return;
    if (!S.mestre || !R.id || !ajudaOn()) return;
    clearTimeout(tAjuda);
    const fx = focoEm(t.dataset.f, null);
    if (R.tipo === 'player' && S.sess) {
      const rot = (fx && fx.dataset && fx.dataset.label) || t.dataset.f;
      if (!ajudaEnviada || ajudaEnviada.campo !== t.dataset.f || ajudaEnviada.uid !== R.id) {
        ajudaEnviada = { uid: R.id, campo: t.dataset.f, rotulo: rot, ts: agora() };
        sessRef(S.sess.gm, S.sess.id).update({ ajuda: ajudaEnviada }).catch(() => {});
      }
    }
  });
  document.addEventListener('focusout', (e) => {
    const t = e.target; if (!naFicha(t) || !S.mestre) return;
    clearTimeout(tAjuda);
    tAjuda = setTimeout(() => {
      const a = document.activeElement;
      if (naFicha(a)) return; // foi pra outro campo: o focusin cuida
      focoLimpar();
      if (ajudaEnviada && S.sess) { ajudaEnviada = null; sessRef(S.sess.gm, S.sess.id).update({ ajuda: null }).catch(() => {}); }
    }, 250);
  });
  // player: o mestre está apontando um campo da ficha dele
  let ajudaVista = null;
  function pintarAjuda() {
    if (S.mestre) return;
    const a = S.sess && S.sess.ajuda;
    const vale = a && a.uid === S.me && a.campo && agora() - (a.ts || 0) < AJUDA_VALE;
    const chave = vale ? a.campo + '|' + a.ts : null;
    if (chave === ajudaVista) return;
    ajudaVista = chave;
    if (!vale) { focoLimpar(); return; }
    const inp = document.querySelector(FOCO_SEL(a.campo));
    const sheet = inp && inp.closest('.sheet');
    const idx = sheet ? [...document.querySelectorAll('.sheet')].indexOf(sheet) : -1;
    if (idx >= 0 && !sheet.classList.contains('active') && typeof showPage === 'function' && !S.aberto) showPage(idx);
    // no celular: página inteira primeiro (pro player ver onde fica), o escuro fecha, depois amplia no campo
    const cel = !S.aberto && inp && inp.closest('.pdflayer') && window.__cprAjudaCel && window.__cprAjudaCel(inp, 'inteira');
    const fx = focoEm(a.campo, `O mestre está te mostrando: ${a.rotulo || a.campo}`, true);
    if (!fx || S.aberto) return;
    if (cel) { const alvo = focoAtual.alvoEl; focoAtual.depois = () => setTimeout(() => window.__cprAjudaCel(alvo), 250); }
    else (focoAtual.alvoEl || fx).scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }
  window.__cmArea = (c) => { const i = document.querySelector(FOCO_SEL(c)); const a = areaDoCampo(i.closest('.fx')); return [a.x0, a.y0, a.x1, a.y1, a.els.length]; };
  window.__cmAjuda = () => ({ foco: focoAtual && focoAtual.campo, legenda: legenda.hidden ? null : legenda.textContent });

  // brilho na ficha aberta quando é a vez dela
  function estadoVez() { document.body.classList.toggle('cm-vez-ficha', !!R.id && naVez(R.tipo, R.id)); }

