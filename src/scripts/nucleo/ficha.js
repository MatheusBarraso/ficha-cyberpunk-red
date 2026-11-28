/* ================= a ficha do sistema aberto =================
   As abas 1–3 são as páginas de ficha do sistema (SISTEMA.paginas); 4–6 são Anotações, História e Livros,
   iguais pra todos. montarFicha() põe na página as do sistema aberto (do <template id="paginas-<id>">),
   completa com vagas vazias e escondidas as que ele não usa — assim Anotações continua sendo a página 3
   (contando do 0) pra todo mundo — e chama a ficha do sistema pra montar os campos. */
const PAGINAS_FICHA = 3;
const FICHA = SISTEMA.ficha || {};

function montarFicha(dados) {
  const stage = $('#stage'), comuns = stage.querySelector('.scaler'); // a primeira página comum (Anotações)
  const t = document.getElementById('paginas-' + SISTEMA.id);
  if (t) stage.insertBefore(t.content, comuns);
  for (let i = SISTEMA.paginas.length; i < PAGINAS_FICHA; i++) {
    const vaga = el('div', 'scaler sem-pagina'); vaga.dataset.sheet = i; vaga.hidden = true;
    vaga.append(el('section', 'sheet'));
    stage.insertBefore(vaga, comuns);
  }
  document.querySelectorAll('template[id^="paginas-"]').forEach((x) => x.remove());
  if (FICHA.montar) FICHA.montar(dados || {});
}
// página de ficha que o sistema aberto não usa
const paginaSemUso = (i) => i < PAGINAS_FICHA && i >= SISTEMA.paginas.length;
// valores calculados (no Cyberpunk RED: o ATR e a BASE das perícias)
function recalc() { if (FICHA.recalcular) FICHA.recalcular(); }
