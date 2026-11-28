  // a v67 chegou a guardar ficha/notas/quadro/livros na conta; o combinado é o mínimo no banco:
  // apaga essas cópias uma vez por aparelho (a ficha continua no navegador, como sempre)
  function limparSalvoAntigo() {
    try { if (localStorage.getItem('cpr-limpou-salvo-v1') === S.me) return; } catch { return; }
    const ids = [];
    ['ficha', 'notas', 'quadro', 'livros'].forEach((n) => { ids.push(n); for (let i = 0; i < 8; i++) ids.push(`${n}-p${i}`); });
    Promise.all(ids.map((id) => S.db.doc(`data/users/${S.me}/salvo-${id}`).delete().catch(() => null)))
      .then(() => { try { localStorage.setItem('cpr-limpou-salvo-v1', S.me); localStorage.removeItem('cpr-nuvem-meta'); } catch { /* ok */ } });
  }

