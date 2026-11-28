/* ================= boot ================= */
buildPdfPages();
setMob(wantMob());
setLand(wantLand());
fields = Array.from(document.querySelectorAll('[data-f]'));

load();
recalc();

document.addEventListener('input', (e) => {
  if (!e.target.matches('[data-f]')) return;
  scheduleSave();
  if (e.target.matches('input[data-stat], input[data-nvl]')) recalc();
});
document.addEventListener('change', (e) => {
  if (e.target.matches('input[type=checkbox][data-f]')) scheduleSave();
});

// menu
$('#btn-menu').addEventListener('click', () => openMenu(true));
$('#btn-menu-close').addEventListener('click', () => openMenu(false));
$('#backdrop').addEventListener('click', () => openMenu(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') openMenu(false); });

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
  setClosed(folds[h.dataset.fold] ?? (h.dataset.fold === 'fold-config')); // configuração começa recolhida
  h.addEventListener('click', () => {
    const c = !body.classList.contains('closed');
    setClosed(c);
    folds[h.dataset.fold] = c;
    try { localStorage.setItem(FOLD_KEY, JSON.stringify(folds)); } catch { /* ok */ }
  });
});

// tema de cores (configuração)
const corDaFicha = () => getComputedStyle(document.documentElement).getPropertyValue('--red').trim() || '#cf2b21';
const THEME_KEY = 'cpr-tema-v2'; // nova chave: ignora a cor azul salva antes, e abre no vermelho padrão da ficha
function darker(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.round(v * 0.72));
  return `#${((f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0')}`;
}
function applyTheme(c, save = true) {
  document.documentElement.style.setProperty('--red', c);
  document.documentElement.style.setProperty('--red-dark', darker(c));
  document.querySelectorAll('.csw[data-c]').forEach(b => b.classList.toggle('sel', b.dataset.c.toLowerCase() === c.toLowerCase()));
  const ci = $('#cfg-custom');
  if (ci) ci.value = c;
  if (save) { try { localStorage.setItem(THEME_KEY, c); } catch { /* ok */ } }
}
document.querySelectorAll('.csw[data-c]').forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.c)));
$('#cfg-custom').addEventListener('input', (e) => applyTheme(e.target.value));
$('#cfg-reset').addEventListener('click', () => applyTheme('#cf2b21'));
applyTheme(localStorage.getItem(THEME_KEY) || '#cf2b21', false);

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
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#zoom-pop').classList.remove('open'); });

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
  if (!(await confirmar('Apagar TODA a ficha salva neste navegador? Isso não tem volta.'))) return;
  localStorage.removeItem(KEY);
  savedExtra = {};
  for (const f of fields) {
    if (f.type === 'checkbox') f.checked = false; else f.value = '';
  }
  const img = $('#portrait-img');
  img.removeAttribute('src');
  $('#portrait').classList.remove('hasimg');
  if (window.__clearBoard) window.__clearBoard();
  if (window.__clearNotes) window.__clearNotes();
  recalc();
  openMenu(false);
  status.textContent = 'Ficha limpa — comece de novo';
});

setupPortrait();
showPage(0);


