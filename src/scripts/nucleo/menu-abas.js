/* ================= menu / abas / zoom ================= */
let zoomMode = 'fit';   // 'fit' | 'manual'
let zoomVal = 1;        // escala manual
const ZMIN = 0.3, ZMAX = 2.5;

const ZOOM_OK = !!(window.CSS && CSS.supports && CSS.supports('zoom', '0.5'));
function applyScale() {
  const land = document.body.classList.contains('land');
  const vw = document.documentElement.clientWidth - (land ? 56 : 16) - (window.__ladoW || 0); // painel do mestre aberto à direita
  let s;
  if (zoomMode === 'fit') {
    s = Math.min(vw, 1920) / 1920; // deitado ocupa a largura toda (rola pra baixo)
    if (!land) { const tb = document.querySelector('.toolbar'); const vh = window.innerHeight - (tb ? tb.offsetHeight : 0) - 60; s = Math.min(s, Math.max(0.2, vh / 1080)); }
  }
  else s = Math.min(ZMAX, Math.max(ZMIN, zoomVal));
  const fluid = document.body.classList.contains('mob');
  for (const sc of document.querySelectorAll('.scaler')) {
    if ((fluid && sc.classList.contains('fl')) || (land && sc.classList.contains('fl'))) {
      sc.style.width = ''; sc.style.height = ''; sc.querySelector('.sheet').style.transform = ''; sc.querySelector('.sheet').style.zoom = '';
      continue;
    }
    sc.style.width = `${1920 * s}px`;
    sc.style.height = `${1080 * s}px`;
    const sh = sc.querySelector('.sheet');
    if (ZOOM_OK) { sh.style.transform = ''; sh.style.zoom = s; } else sh.style.transform = `scale(${s})`;
  }
  $('#zoom-pct').textContent = `${Math.round(s * 100)}%`;
}
// Troca a página visível (0–2 ficha, 3 anotações, 4 história, 5 livros).
// Quem precisa reagir escuta os eventos em window, em vez de embrulhar esta função:
//   'sk:trocando-pagina' — antes da troca (fechar a Comunidade, sair da leitura…)
//   'sk:pagina'          — depois da troca (brilho das linhas, entrar na leitura, ajustar o zoom…)
// Os dois levam { detail: { pagina } }.
function showPage(i) {
  dispatchEvent(new CustomEvent('sk:trocando-pagina', { detail: { pagina: i } }));
  document.querySelectorAll('.tab').forEach((t, k) => t.classList.toggle('active', k === i));
  document.querySelectorAll('.sheet').forEach((s, k) => s.classList.toggle('active', k === i));
  document.querySelectorAll('.scaler').forEach((sc, k) => { sc.style.display = k === i ? 'block' : 'none'; });
  document.body.classList.toggle('on-board', i === 4);
  applyScale();
  window.scrollTo({ top: 0 });
  if (i === 4 && window.__boardShow) window.__boardShow();
  dispatchEvent(new CustomEvent('sk:pagina', { detail: { pagina: i } }));
}
function openMenu(o) {
  $('#menu').classList.toggle('open', o);
  $('#backdrop').classList.toggle('open', o);
  $('#zoom-fab').classList.toggle('hide', !o); // a lupa só aparece com o menu aberto
  if (!o) $('#zoom-pop').classList.remove('open');
}

