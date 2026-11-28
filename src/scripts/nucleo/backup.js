/* ================= backup completo (ficha + anotações + quadros) ================= */
function salvarBackup() {
  try {
    const payload = {
      app: 'cpr-ficha',
      versao: 1,
      sistema: SISTEMA.id,
      salvoEm: new Date().toISOString(),
      ficha: window.__fichaRemota ? window.__fichaLocal() : collect(),
      notas: window.__notesData ? window.__notesData() : null,
      quadro: window.__boardData ? window.__boardData() : null,
      tema: localStorage.getItem(THEME_KEY) || null,
      livros: window.__livrosData ? window.__livrosData() : null
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const nome = ($('input[data-f="NOME"]').value || 'personagem').trim().replace(/[\\/:*?"<>|]+/g, '-');
    const a = el('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ficha-${SISTEMA.id === 'cpr' ? '' : SISTEMA.id + '-'}${nome}-completa.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = 'Backup completo salvo (ficha + anotações + quadros)';
  } catch (e) {
    console.error(e);
    status.textContent = 'Deu ruim ao gerar o backup — tenta de novo';
  }
}

function carregarBackup(file) {
  if (window.__fichaRemota) window.__fichaRemota.sair();
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const d = JSON.parse(rd.result);
      if (!d || d.app !== 'cpr-ficha' || typeof d.ficha !== 'object' || !d.ficha) throw new Error('inválido');
      // o backup volta pro sistema de onde saiu (os de antes do Sketcher são do Cyberpunk RED)
      const sis = SISTEMAS[d.sistema] ? d.sistema : 'cpr';
      const chave = (nome) => chaveDe(sis, nome);
      localStorage.setItem(chave('ficha'), JSON.stringify(d.ficha));
      if (d.notas && Array.isArray(d.notas.pages) && d.notas.pages.length) {
        localStorage.setItem(chave('notas'), JSON.stringify({ cur: d.notas.cur | 0, pages: d.notas.pages }));
      }
      if (d.quadro && Array.isArray(d.quadro.pages) && d.quadro.pages.length) {
        localStorage.setItem(chave('quadro'), JSON.stringify({ cur: d.quadro.cur | 0, pages: d.quadro.pages }));
      }
      if (d.tema) localStorage.setItem(THEME_KEY, d.tema);
      if (Array.isArray(d.livros)) localStorage.setItem(chave('livros'), JSON.stringify(d.livros));
      if (sis !== SISTEMA.id) {
        status.textContent = `Backup do ${SISTEMAS[sis].nome} carregado — abrindo o ${SISTEMAS[sis].nome}…`;
        setTimeout(() => trocarSistema(sis), 500);
        return;
      }
      status.textContent = 'Backup carregado — reabrindo a ficha…';
      setTimeout(() => location.reload(), 500);
    } catch (e) {
      console.error(e);
      status.textContent = 'Esse arquivo não é um backup válido da ficha';
    }
  };
  rd.readAsText(file);
}

