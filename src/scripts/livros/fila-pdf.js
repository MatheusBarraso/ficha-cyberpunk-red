
// livros: as páginas são desenhadas na hora a partir dos PDFs (letra nítida em qualquer zoom).
// Enquanto o leitor de PDF carrega, os pedidos ficam na fila.
(() => {
  let real = null, falhou = null;
  const fila = [];
  window.__livroCached = (b, p) => (real ? real.cached(b, p) : null);
  window.__livroLoad = (b, p) => {
    if (real) return real.load(b, p);
    if (falhou) return Promise.reject(falhou);
    return new Promise((res, rej) => fila.push([b, p, res, rej]));
  };
  window.__livroReady = (impl) => { real = impl; fila.splice(0).forEach(([b, p, res, rej]) => impl.load(b, p).then(res, rej)); };
  window.__livroFail = (e) => { falhou = e; fila.splice(0).forEach(([, , , rej]) => rej(e)); };
})();
