
document.addEventListener('DOMContentLoaded', () => {
  const f = document.getElementById('lv-frame');
  const t = document.querySelector('button.tab[data-page="5"]');
  if (!f || !t) return;
  t.addEventListener('click', () => {
    if (f.dataset.init) return; f.dataset.init = '1';
    window.__livroLoad('regras', 1).then(u => { if (!f.getAttribute('src')) f.src = u; }).catch(() => {});
  });
});
