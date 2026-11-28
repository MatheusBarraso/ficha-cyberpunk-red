/* ================= celular deitado: a ficha inteira cabe na tela + editor grande do campo tocado ================= */
let landOn = false, landLastH = 0;
let qeField = null;
// altura usada pra encaixar a ficha: enquanto o teclado está aberto (editando um campo), mantém a última medida
function landH() {
  const typing = qeField || (document.activeElement && document.activeElement.matches && document.activeElement.matches('input, textarea, [contenteditable]'));
  if (!typing || !landLastH) landLastH = window.innerHeight;
  return landLastH;
}
const coarseQ = window.matchMedia('(pointer: coarse)');
// o aparelho está deitado? (pela orientação do aparelho, não da área da página — o teclado não engana)
function deviceLandscape() {
  const t = screen.orientation && screen.orientation.type;
  if (t) return t.startsWith('landscape');
  if (typeof window.orientation === 'number') return Math.abs(window.orientation) === 90;
  return window.innerWidth > window.innerHeight;
}
// celular deitado = tela de toque, lado menor do aparelho com até 600px, e aparelho na horizontal
function phoneLandscape() {
  return (coarseQ.matches || navigator.maxTouchPoints > 0) && Math.min(screen.width, screen.height) <= 600 && deviceLandscape();
}
const wantLand = () => phoneLandscape();
function updateLayout() {
  const l = wantLand();
  if (l) setMob(false); else setMob(wantMob());
  setLand(l);
  applyScale();
}
function setLand(on) {
  if (on === landOn) return;
  landOn = on;
  document.body.classList.toggle('land', on);
  if (!on) closeQedit();
  applyScale();
}

// editor grande: o campo tocado na ficha é editado numa caixa no topo da tela
const QE_SEL = '.pdflayer .fx input:not([type=checkbox]), .pdflayer .fx textarea';
function qeList() { return [...qeField.closest('.pdflayer').querySelectorAll(QE_SEL)]; }
function openQedit(f) {
  if (qeField) qeField.closest('.fx')?.classList.remove('qe-on');
  qeField = f;
  const host = f.closest('.fx');
  host.classList.add('qe-on');
  const box = $('#qe-box');
  box.innerHTML = '';
  const ctl = f.tagName === 'TEXTAREA' ? el('textarea') : el('input');
  if (ctl.tagName === 'INPUT') {
    ctl.type = f.type === 'number' ? 'number' : 'text';
    if (f.type === 'number') ctl.inputMode = 'numeric';
    ctl.enterKeyHint = 'next';
  }
  ctl.value = f.value;
  ctl.setAttribute('aria-label', host.dataset.label || f.dataset.f);
  ctl.addEventListener('input', () => {
    f.value = ctl.value;
    f.dispatchEvent(new Event('input', { bubbles: true })); // salva e recalcula como se digitasse na ficha
  });
  ctl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && ctl.tagName === 'INPUT') { e.preventDefault(); qeMove(1); }
    else if (e.key === 'Escape') closeQedit();
  });
  box.append(ctl);
  $('#qe-lbl').textContent = host.dataset.label || f.dataset.f;
  $('#qedit').classList.add('open');
  document.body.classList.add('qe-open'); // a ficha desce pra nada ficar escondido atrás do editor
  ctl.focus({ preventScroll: true });
  const r = host.getBoundingClientRect(); // o campo fica visível logo abaixo do editor
  if (r.top < 84 || r.bottom > window.innerHeight) window.scrollBy(0, r.top - 90);
  if (ctl.tagName === 'INPUT') { try { ctl.select(); } catch { /* número não seleciona em alguns aparelhos */ } }
}
function qeMove(d) {
  const list = qeList();
  const n = list[list.indexOf(qeField) + d];
  if (n) openQedit(n); else closeQedit();
}
function closeQedit() {
  if (qeField) qeField.closest('.fx')?.classList.remove('qe-on');
  qeField = null;
  $('#qedit').classList.remove('open');
  document.body.classList.remove('qe-open');
  $('#qe-box').innerHTML = '';
}
document.addEventListener('focusin', (e) => {
  if (!landOn || $('#linkbar').classList.contains('open')) return;
  const f = e.target;
  if (f.matches && f.matches(QE_SEL)) openQedit(f);
});
document.addEventListener('pointerdown', (e) => {
  if (!qeField || e.target.closest('#qedit') || e.target.closest('.pdflayer .fx')) return;
  closeQedit(); // tocar fora fecha o editor
});
$('#qe-prev').addEventListener('click', () => qeMove(-1));
$('#qe-next').addEventListener('click', () => qeMove(1));
$('#qe-ok').addEventListener('click', closeQedit);

