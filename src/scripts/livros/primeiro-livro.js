// Livros: ao abrir a aba pela primeira vez, já começa a desenhar a 1ª página do primeiro livro do sistema.

document.addEventListener('DOMContentLoaded', () => {
  const f = document.getElementById('lv-frame');
  const t = document.querySelector('button.tab[data-page="5"]');
  if (!f || !t) return;
  t.addEventListener('click', () => {
    if (f.dataset.init) return; f.dataset.init = '1';
    const b = Object.keys(LIVROS)[0]; // o primeiro livro do sistema (a estante do Sistema livre começa vazia)
    if (b) window.__livroLoad(b, 1).then(u => { if (!f.getAttribute('src')) f.src = u; }).catch(() => {});
  });
});
