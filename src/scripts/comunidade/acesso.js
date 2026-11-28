  // ---------- regras de acesso ----------
  function acesso(sess, membro, pedido) {
    if (!sess) return 'inexistente';
    if (sess.encerrada) return 'encerrada';
    const m = membro && membro.estado;
    if (m === 'removido') return 'removido';
    if (m === 'recusado') return 'recusado';
    if (m === 'aprovado') return 'ok';
    if (pedido && !pedido.cancelado) {
      if (sess.aprovacao === 'automatica' && (sess.codigosAceitos || []).includes(pedido.codigo)) return 'ok';
      return 'pendente';
    }
    return 'nenhum';
  }
  const ESTADO_TXT = { ok: 'Liberado', pendente: 'Aguardando o mestre', recusado: 'Pedido recusado', removido: 'Você foi removido', encerrada: 'Sessão encerrada', inexistente: 'Sessão não existe mais', nenhum: '' };
  function ocupadas(sess, membros, pedidosTodos) {
    const ids = new Set();
    for (const [u, m] of Object.entries(membros || {})) if (m.estado === 'aprovado') ids.add(u);
    for (const [u, p] of Object.entries(pedidosTodos || {})) { const it = p.itens && p.itens[sess.id]; if (it && acesso(sess, (membros || {})[u], it) === 'ok') ids.add(u); }
    ids.delete(sess.gm);
    return ids.size;
  }

