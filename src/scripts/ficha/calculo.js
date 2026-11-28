/* ================= cálculo ATR/BASE ================= */
let baseCells = null;
function recalc() {
  const stats = {};
  for (const s of document.querySelectorAll('input[data-stat]')) stats[s.dataset.stat] = parseInt(s.value, 10) || 0;
  for (const c of document.querySelectorAll('.calc.atr')) c.textContent = stats[c.dataset.stat] || '';
  if (!baseCells) baseCells = Array.from(document.querySelectorAll('.calc.base'))
    .map(c => [c, document.querySelector(`input[data-f="${CSS.escape(c.dataset.nvlf)}"]`)]);
  for (const [c, n] of baseCells) {
    if (!n) continue;
    const total = (parseInt(n.value, 10) || 0) + (stats[n.dataset.atr] || 0);
    c.textContent = total || '';
  }
}

