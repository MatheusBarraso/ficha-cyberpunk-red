  // ---------- códigos de convite ----------
  const ALFA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem 0/O, 1/I/L
  function sortearCodigo() {
    const out = [];
    while (out.length < 8) { const b = crypto.getRandomValues(new Uint8Array(16)); for (const x of b) { if (x < 248 && out.length < 8) out.push(ALFA[x % 31]); } }
    return out.slice(0, 4).join('') + '-' + out.slice(4).join('');
  }
  const limparCodigo = (t) => { const c = (t || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/[01ILO]/g, (x) => ({ 0: 'O', 1: 'I', I: 'I', L: 'L', O: 'O' })[x]); return c.length === 8 ? c.slice(0, 4) + '-' + c.slice(4) : c; };
  const codigoValido = (c) => /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/.test(c);
  async function novoCodigo() {
    for (let i = 0; i < 6; i++) { const c = sortearCodigo(); const s = await S.db.doc('convites/' + c).get(); if (!s.exists) return c; }
    throw { code: 'unavailable' };
  }
  const expiraEm = (dias) => (dias ? agora() + dias * 86400000 : null);
  async function copiar(t, rot = 'Copiado!') {
    try { await navigator.clipboard.writeText(t); toast('Copiado', rot); return; } catch { /* tenta o jeito antigo */ }
    const i = h('textarea', { style: 'position:fixed;left:-9999px;opacity:0' }); i.value = t; document.body.append(i); i.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
    i.remove();
    toast('Copiar', ok ? rot : `Copie à mão: ${t}`);
  }
  async function compartilhar(sess) {
    const sis = sistemaDe(sess);
    const txt = `Sessão “${sess.nome}” de ${SISTEMAS[sis].nome} no Sketcher. Abra o Sketcher, escolha Player e use o código ${sess.codigo}${FB ? ` — ${location.origin}${location.pathname}#rpg=${sis}` : ''}`;
    if (navigator.share) { try { await navigator.share({ title: sess.nome, text: txt }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    copiar(txt, 'Convite copiado.');
  }

