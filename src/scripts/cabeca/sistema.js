// Sketcher: qual sistema de RPG esta página roda — decidido antes de tudo carregar.
// Ordem: #rpg=<id> no endereço → última escolha (sk-sistema) → quem já tinha ficha do Cyberpunk RED
// continua nele → ninguém escolheu ainda (mostra a tela de escolha de RPG; por baixo carrega o CPR).
(function () {
  var conhecidos = ['cpr', 'livre'], d = document.documentElement, s = null;
  try { s = localStorage.getItem('sk-sistema'); } catch (e) { /* sem armazenamento */ }
  var m = /(?:^#|[#&])rpg=([a-z0-9-]+)/.exec(location.hash);
  if (m && conhecidos.indexOf(m[1]) >= 0) s = m[1];
  if (conhecidos.indexOf(s) < 0) s = null;
  if (!s) { try { if (localStorage.getItem('cpr-ficha-v1')) s = 'cpr'; } catch (e) { /* idem */ } }
  if (s) { try { localStorage.setItem('sk-sistema', s); } catch (e) { /* idem */ } } else d.classList.add('sk-escolher');
  d.setAttribute('data-sistema', s || 'cpr');
})();
