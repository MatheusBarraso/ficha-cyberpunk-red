// ---------- cor do site (a "vermelha" da ficha: linhas, faixas, botões) ----------
// Escolhida no menu da conta → Aparência; fica neste navegador e vai junto no backup.
const COR_PADRAO = '#cf2b21';
const CORES_SITE = [['#cf2b21', 'Vermelho padrão'], ['#f2a900', 'Amarelo'], ['#e06c1f', 'Laranja'], ['#21a0cf', 'Azul'],
  ['#1fb8a6', 'Ciano'], ['#3fae5a', 'Verde'], ['#9b59cf', 'Roxo'], ['#e0457a', 'Rosa']];
const THEME_KEY = 'cpr-tema-v2'; // nova chave: ignora a cor azul salva antes, e abre no vermelho padrão da ficha
const corDaFicha = () => getComputedStyle(document.documentElement).getPropertyValue('--red').trim() || COR_PADRAO;
function darker(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.round(v * 0.72));
  return `#${((f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0')}`;
}
function applyTheme(c, save = true) {
  document.documentElement.style.setProperty('--red', c);
  document.documentElement.style.setProperty('--red-dark', darker(c));
  if (save) { try { localStorage.setItem(THEME_KEY, c); } catch { /* ok */ } }
}
{
  let salva = null; try { salva = localStorage.getItem(THEME_KEY); } catch { /* ok */ }
  applyTheme(/^#[0-9a-f]{6}$/i.test(salva || '') ? salva : COR_PADRAO, false);
}
