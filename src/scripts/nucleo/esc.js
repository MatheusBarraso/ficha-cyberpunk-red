/* ================= tecla Esc: fecha só o que está por cima =================
   Cada parte que abre alguma coisa por cima da página (menu, gaveta, balão, painel…) se registra com
   aoEsc(prioridade, fechar): `fechar` fecha e devolve true se havia algo aberto. Um Esc fecha só a
   camada de maior prioridade que estava aberta. Janelas modais (confirmar, janelas do dossiê, janelas da
   Comunidade) tratam o próprio Esc e marcam o evento, então nada por baixo fecha junto.
   Prioridades: 80 janela de página salva · 70 modo de vincular · 60 balões da Comunidade (sino, conta)
   · 55 painel Ferramentas · 50 controles de zoom · 40 menu · 30 gaveta do leitor. */
const camadasEsc = [];
function aoEsc(prioridade, fechar) {
  camadasEsc.push({ prioridade, fechar });
  camadasEsc.sort((a, b) => b.prioridade - a.prioridade);
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  for (const c of camadasEsc) if (c.fechar()) { e.preventDefault(); return; }
});
