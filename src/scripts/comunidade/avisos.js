  // ---------- avisos (toasts) e erros ----------
  const toasts = h('div', { class: 'cm-toasts', 'aria-live': 'polite' });
  function toast(titulo, txt, onclick) {
    const t = h('div', { class: 'cm-toast', role: 'status' }, h('div', null, h('b', { text: titulo }), typeof txt === 'string' ? h('span', { text: txt }) : txt));
    t.addEventListener('click', () => { t.remove(); if (onclick) onclick(); });
    toasts.append(t);
    while (toasts.children.length > 4) toasts.firstChild.remove();
    setTimeout(() => t.remove(), 7000);
  }
  function falhou(e) {
    const c = e && e.code;
    const msg = c === 'quota_exceeded' ? 'O espaço da comunidade encheu. Peça pro mestre apagar coisas antigas.'
      : c === 'invalid_argument' ? (FB ? 'O servidor recusou: você não tem permissão pra isso.' : 'Sem permissão pra isso. Peça ao mestre acesso de Colaborador na ficha.')
      : c === 'resource_exhausted' ? 'Muitas ações seguidas. Espere uns segundos e tente de novo.'
      : 'Não deu pra salvar agora. Confira a conexão e tente de novo.';
    toast('Erro', msg);
  }
  async function salvar(fn) { try { await fn(); return true; } catch (e) { falhou(e); return false; } }

