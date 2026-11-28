  // ----- alerta pra mesa -----
  function abrirAlerta() {
    const txt = h('textarea', { class: 'cm-ta', maxlength: 300, placeholder: 'Ex.: Combate começou! Todo mundo na ficha.' });
    const m = modal('Alertar players', [h('label', { class: 'cm-lbl' }, 'Mensagem', txt),
      h('div', { class: 'cm-sub', text: 'Aparece na tela de todos os players da sessão, por cima de tudo, e leva eles pra ficha.' })],
    [btn('Cancelar', () => m.fechar(), 'cm-mini'), btn('Alertar', async () => {
      if (await salvar(() => col('alertas').add({ texto: txt.value.trim(), ts: agora(), autor: S.me }))) { m.fechar(); toast('Alerta', 'Alerta enviado pra mesa.'); }
    }, 'cm-mini cm-pri')]);
    setTimeout(() => txt.focus(), 50);
  }

