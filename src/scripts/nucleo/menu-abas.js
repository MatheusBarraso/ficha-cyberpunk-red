/* ================= menu / abas ================= */
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

