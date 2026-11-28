  // ===================== SENHA DO MESTRE =====================
  // Pra entrar como mestre precisa da senha. Quem confere é o servidor (firestore.rules compara o hash
  // dela); a senha em si não fica no código do site. Cada conta digita uma vez.
  const normSenha = (t) => norm(t).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  async function conferirChave() {
    if (!FB) { S.lob.chave = true; return; }
    if (!S.me || !S.db) return;
    try { const d = await S.db.doc('chaves/' + S.me).get(); S.lob.chave = !!d.exists; } catch { S.lob.chave = false; }
    if (S.aberto && noLobby()) atualizarLobby();
  }
  function telaSenha() {
    const topo = h('div', { class: 'cm-h' }, h('h2', { text: 'Mestre' }), btn('Trocar perfil', () => trocarPapel(null), 'cm-mini'));
    if (S.lob.chave === undefined) return [topo, h('div', { class: 'cm-vazio', text: 'Conferindo…' })];
    const inp = h('input', { class: 'cm-in', type: 'password', autocomplete: 'off', placeholder: 'Senha do mestre', 'aria-label': 'Senha do mestre' });
    const msg = h('div', { class: 'cm-sub' });
    const ir = async () => {
      const senha = normSenha(inp.value);
      if (!senha) { inp.focus(); return; }
      bt.disabled = true; msg.className = 'cm-sub'; msg.textContent = 'Conferindo…';
      try {
        await S.db.doc('chaves/' + S.me).set({ senha, ts: agora() });
        S.lob.chave = true; toast('Mestre', 'Senha certa. Pode criar e abrir suas sessões.'); atualizarLobby();
      } catch { bt.disabled = false; msg.className = 'cm-err'; msg.textContent = 'Senha errada.'; inp.select(); }
    };
    const bt = btn('Entrar como mestre', ir, 'cm-pri');
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ir(); });
    setTimeout(() => inp.focus(), 50);
    return [topo, h('div', { class: 'cm-caixa cm-login cm-senha' }, h('div', { class: 'cm-faixa', text: 'Senha do mestre' }),
      h('div', { class: 'cm-txt', text: 'Só quem tem a senha entra como mestre. Você digita uma vez nesta conta.' }), inp, h('div', { class: 'cm-row' }, bt), msg)];
  }

