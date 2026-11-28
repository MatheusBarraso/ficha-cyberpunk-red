// confirmar(mensagem, sim, não): janela de confirmação no visual do site, no lugar do confirm() do navegador.
// Devolve uma Promise<boolean>; Esc ou clicar fora = não.

window.confirmar = function (msg, sim = 'Sim', nao = 'Cancelar') {
  return new Promise((resolve) => {
    const bg = document.createElement('div');
    bg.className = 'cfm-bg';
    bg.innerHTML = '<div class="cfm" role="alertdialog" aria-modal="true"><p></p><div class="cfm-bts"><button type="button" class="no"></button><button type="button" class="ok"></button></div></div>';
    bg.querySelector('p').textContent = msg;
    bg.querySelector('.no').textContent = nao;
    bg.querySelector('.ok').textContent = sim;
    const fim = (v) => { bg.remove(); document.removeEventListener('keydown', tecla, true); resolve(v); };
    const tecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fim(false); } };
    bg.addEventListener('click', (e) => { if (e.target === bg) fim(false); });
    bg.querySelector('.no').addEventListener('click', () => fim(false));
    bg.querySelector('.ok').addEventListener('click', () => fim(true));
    document.addEventListener('keydown', tecla, true);
    document.body.append(bg);
    bg.querySelector('.ok').focus();
  });
};
