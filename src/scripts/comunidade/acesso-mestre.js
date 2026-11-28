  // ===================== ACESSO DE MESTRE =====================
  // Criar e abrir sessões como mestre é uma permissão da conta: quem tem acesso tem o documento chaves/{uid},
  // e é ele que o servidor confere (mestreOk() no firestore.rules). Hoje o acesso é liberado com a senha da
  // equipe — o servidor só aceita criar o documento com a senha certa, que não fica no código do site.
  // Quando vier a compra, é ela que cria o documento; o resto do site não muda (ver docs/FIREBASE.md).
  // S.lob.acessoMestre: true / false, ou undefined enquanto confere.
  const normSenha = (t) => norm(t).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  async function conferirAcessoMestre() {
    if (!FB) { S.lob.acessoMestre = true; return; }
    if (!S.me || !S.db) return;
    try { const d = await S.db.doc('chaves/' + S.me).get(); S.lob.acessoMestre = !!d.exists; } catch { S.lob.acessoMestre = false; }
    if (S.aberto && noLobby()) atualizarLobby();
  }
  function telaAcessoMestre() {
    const topo = h('div', { class: 'cm-h' }, h('h2', { text: 'Mestre' }), btn('Trocar perfil', () => trocarPapel(null), 'cm-mini'));
    if (S.lob.acessoMestre === undefined) return [topo, h('div', { class: 'cm-vazio', text: 'Conferindo…' })];
    const inp = h('input', { class: 'cm-in', type: 'password', autocomplete: 'off', placeholder: 'Senha da equipe', 'aria-label': 'Senha da equipe' });
    const msg = h('div', { class: 'cm-sub' });
    const ir = async () => {
      const senha = normSenha(inp.value);
      if (!senha) { inp.focus(); return; }
      bt.disabled = true; msg.className = 'cm-sub'; msg.textContent = 'Conferindo…';
      try {
        await S.db.doc('chaves/' + S.me).set({ senha, ts: agora() });
        S.lob.acessoMestre = true; toast('Mestre', 'Acesso de mestre liberado nesta conta.'); atualizarLobby();
      } catch { bt.disabled = false; msg.className = 'cm-err'; msg.textContent = 'Senha errada.'; inp.select(); }
    };
    const bt = btn('Entrar como mestre', ir, 'cm-pri');
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ir(); });
    setTimeout(() => inp.focus(), 50);
    return [topo, h('div', { class: 'cm-caixa cm-login cm-senha' }, h('div', { class: 'cm-faixa', text: 'Acesso de mestre' }),
      h('div', { class: 'cm-txt', text: 'O acesso de mestre é da conta: com ele você cria e abre sessões. Libere com a senha da equipe — uma vez só nesta conta.' }), inp, h('div', { class: 'cm-row' }, bt), msg)];
  }

