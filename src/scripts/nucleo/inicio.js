/* ================= boot ================= */
const fichaSalva = lerSalvo();
montarFicha(fichaSalva);
rotularAbas();
setMob(wantMob());
setLand(wantLand());
lerCampos();

load(fichaSalva);
recalc();

document.addEventListener('input', (e) => {
  if (!e.target.matches('[data-f]')) return;
  scheduleSave();
  if (FICHA.gatilhoCalculo && e.target.matches(FICHA.gatilhoCalculo)) recalc();
});
document.addEventListener('change', (e) => {
  if (e.target.matches('input[type=checkbox][data-f]')) scheduleSave();
});

// menu
$('#btn-menu').addEventListener('click', () => openMenu(true));
$('#btn-menu-close').addEventListener('click', () => openMenu(false));
$('#backdrop').addEventListener('click', () => openMenu(false));
aoEsc(40, () => { if (!$('#menu').classList.contains('open')) return false; openMenu(false); return true; });

// seções recolhíveis do menu
const FOLD_KEY = 'cpr-menu-fold';
let folds = {};
try { folds = JSON.parse(localStorage.getItem(FOLD_KEY) || '{}'); } catch { /* ok */ }
document.querySelectorAll('.m-sec.fold').forEach(h => {
  const body = document.getElementById(h.dataset.fold);
  const setClosed = (c) => {
    h.classList.toggle('closed', c);
    body.classList.toggle('closed', c);
    h.setAttribute('aria-expanded', String(!c));
  };
  setClosed(!!folds[h.dataset.fold]);
  h.addEventListener('click', () => {
    const c = !body.classList.contains('closed');
    setClosed(c);
    folds[h.dataset.fold] = c;
    try { localStorage.setItem(FOLD_KEY, JSON.stringify(folds)); } catch { /* ok */ }
  });
});

// abas (dentro do menu)
document.querySelectorAll('.tab').forEach((t, i) => t.addEventListener('click', () => { showPage(i); openMenu(false); }));

// zoom (lupa flutuante)
$('#zoom-fab').addEventListener('click', (e) => {
  e.stopPropagation();
  $('#zoom-pop').classList.toggle('open');
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('#zoom-pop') && !e.target.closest('#zoom-fab')) $('#zoom-pop').classList.remove('open');
});
aoEsc(50, () => { const z = $('#zoom-pop'); if (!z.classList.contains('open')) return false; z.classList.remove('open'); return true; });

$('#z-in').addEventListener('click', () => {
  if (zoomMode === 'fit') { const vw = document.documentElement.clientWidth - 16; zoomVal = Math.min(vw, 1920) / 1920; }
  zoomMode = 'manual'; zoomVal = Math.min(ZMAX, zoomVal * 1.15); applyScale();
});
$('#z-out').addEventListener('click', () => {
  if (zoomMode === 'fit') { const vw = document.documentElement.clientWidth - 16; zoomVal = Math.min(vw, 1920) / 1920; }
  zoomMode = 'manual'; zoomVal = Math.max(ZMIN, zoomVal / 1.15); applyScale();
});
$('#z-fit').addEventListener('click', () => { zoomMode = 'fit'; applyScale(); });
window.addEventListener('resize', updateLayout);
// ao girar o aparelho, confere de novo (alguns celulares avisam antes de terminar de girar)
const aoGirar = () => { updateLayout(); setTimeout(updateLayout, 350); };
window.addEventListener('orientationchange', aoGirar);
if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', aoGirar);
// imprimir sempre usa o desenho do PDF, mesmo no celular
let mobBeforePrint = false;
window.addEventListener('beforeprint', () => { mobBeforePrint = mobOn; if (mobOn) setMob(false); });
window.addEventListener('afterprint', () => { if (mobBeforePrint) setMob(true); });

// ações
$('#btn-savebak').addEventListener('click', () => { openMenu(false); salvarBackup(); });
$('#btn-loadbak').addEventListener('click', () => $('#backup-file').click());
$('#backup-file').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) { openMenu(false); carregarBackup(f); }
  e.target.value = '';
});
$('#btn-clear').addEventListener('click', async () => {
  if (window.__fichaRemota) return; // o botão some enquanto o mestre edita a ficha de um player
  // campos com data-estrutura (o modelo do Sistema livre) não são do personagem: ficam
  const estrutura = fields.filter((f) => f.dataset.estrutura !== undefined);
  const msg = 'Apagar TODA a ficha salva neste navegador? Isso não tem volta.' + (estrutura.length ? ' As seções e os campos que você montou continuam.' : '');
  if (!(await confirmar(msg))) return;
  localStorage.removeItem(KEY);
  savedExtra = {};
  for (const f of fields) {
    if (estrutura.includes(f)) continue;
    if (f.type === 'checkbox') f.checked = false; else f.value = '';
  }
  const img = $('#portrait-img');
  if (img) { img.removeAttribute('src'); $('#portrait').classList.remove('hasimg'); }
  if (window.__clearBoard) window.__clearBoard();
  if (window.__clearNotes) window.__clearNotes();
  recalc();
  if (estrutura.length) save();
  openMenu(false);
  status.textContent = 'Ficha limpa — comece de novo';
});

setupPortrait();
showPage(0);


