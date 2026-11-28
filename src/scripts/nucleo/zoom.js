/* ================= zoom da ficha =================
   A ficha (desenho de 1920×1080) fica encaixada na tela ('fit') ou num zoom escolhido ('manual').
   No PC o encaixe leva em conta o zoom do navegador (Ctrl + / Ctrl −): com 125% a ficha fica 25% maior e rola.
   As interações (Ctrl + rodinha no ponto do mouse, botões e toque no celular) ficam em nucleo/nitidez.js. */
let zoomMode = 'fit';   // 'fit' | 'manual'
let zoomVal = 1;        // escala manual
const ZMIN = 0.2, ZMAX = 2.5;

const ZOOM_OK = !!(window.CSS && CSS.supports && CSS.supports('zoom', '0.5'));
const NIVEIS_NAVEGADOR = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];

// aparelho de toque com tela de celular (no PC com zoom alto a janela fica estreita, mas continua sendo PC)
function celular() {
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches
    && (document.body.classList.contains('mob') || document.body.classList.contains('land') || Math.min(screen.width, screen.height) <= 600);
}
// zoom do navegador, deduzido da janela (1 quando não dá pra saber)
function zoomNavegador() {
  if (celular() || !window.outerWidth || !window.innerWidth) return 1;
  const r = window.outerWidth / window.innerWidth;
  let melhor = 1, dif = 9;
  for (const n of NIVEIS_NAVEGADOR) { const d = Math.abs(r - n * 1.008); if (d < dif) { dif = d; melhor = n; } }
  return dif <= 0.03 * melhor ? melhor : 1; // janela com painel lateral aberto etc.: não dá pra saber, fica como estava
}
window.__zoomNavegador = zoomNavegador;
// escala em que a página inteira cabe na tela (largura e altura; deitado, só a largura)
function encaixe(z, land, vw) {
  if (z == null) { land = document.body.classList.contains('land'); z = zoomNavegador(); vw = (document.documentElement.clientWidth - (land ? 56 : 16) - (window.__ladoW || 0)) * z; }
  let s = Math.min(vw, 1920 * z) / 1920;
  if (!land) { const tb = document.querySelector('.toolbar'); const vh = (window.innerHeight - (tb ? tb.offsetHeight : 0) - 60) * z; s = Math.min(s, Math.max(0.2, vh / 1080)); }
  return s;
}
function applyScale() {
  const land = document.body.classList.contains('land');
  const z = zoomMode === 'fit' ? zoomNavegador() : 1;
  const vw = (document.documentElement.clientWidth - (land ? 56 : 16) - (window.__ladoW || 0)) * z;
  let s;
  if (zoomMode === 'fit') s = encaixe(z, land, vw);
  else s = Math.min(ZMAX, Math.max(ZMIN, zoomVal));
  const fluid = document.body.classList.contains('mob');
  for (const sc of document.querySelectorAll('.scaler')) {
    if ((fluid && sc.classList.contains('fl')) || (land && sc.classList.contains('fl'))) {
      const fl = sc.querySelector('.sheet'); sc.style.width = ''; sc.style.height = ''; fl.style.transform = ''; fl.style.zoom = '';
      continue;
    }
    sc.style.width = `${1920 * s}px`;
    sc.style.height = `${1080 * s}px`;
    const sh = sc.querySelector('.sheet');
    if (ZOOM_OK) { sh.style.transform = ''; sh.style.zoom = s; } else sh.style.transform = `scale(${s})`;
  }
  const pct = document.getElementById('zoom-pct'); if (pct) pct.textContent = `${Math.round(s * 100)}%`;
}
