/* ================= sistemas de RPG =================
   O Sketcher roda um sistema por vez, escolhido antes de a página carregar (ver cabeca/sistema.js) e
   anotado em <html data-sistema="…">. Trocar de sistema recarrega a página: cada um começa limpo.
   Cada sistema diz o nome, o que mostrar na tela de escolha (descricao, itens), as páginas da ficha que usa
   e quais ferramentas da Comunidade valem pra ele;
   o conteúdo próprio (desenho da ficha, campos, regras) mora em src/sistemas/<id>/. */
const SISTEMAS = {
  cpr: {
    id: 'cpr',
    nome: 'Cyberpunk RED',
    descricao: 'A ficha oficial, igual ao PDF, com cálculo de perícias, combate na mesa e os livros de regras.',
    itens: ['Ficha igual ao PDF', 'Perícias calculadas', 'Combate na mesa', 'Livros de regras'],
    paginasFicha: 3, // páginas 1–3: desenho do PDF oficial
    recursos: { ataque: true, demonstracao: true },
  },
  livre: {
    id: 'livre',
    nome: 'Sistema livre',
    descricao: 'Pra qualquer RPG: você monta a ficha com as seções e os campos que o seu jogo usa.',
    itens: ['Ficha que você monta', 'Anotações e história', 'Sessões com o mestre'],
    paginasFicha: 1,
    recursos: { ataque: false, demonstracao: false },
  },
};
const SISTEMA = SISTEMAS[document.documentElement.getAttribute('data-sistema')] || SISTEMAS.cpr;

// chave no navegador dos dados de um sistema: o Cyberpunk RED mantém as chaves de antes do Sketcher
// (nada é migrado, nada se perde); os outros sistemas ganham as suas.
const CHAVES_CPR = { ficha: 'cpr-ficha-v1', notas: 'cpr-notas-v2', quadro: 'cpr-quadro-v2', livros: 'cpr-livros-v1' };
function chaveDe(sistema, nome) { return sistema === 'cpr' ? CHAVES_CPR[nome] : `sk-${sistema}-${nome}`; }
function chaveLocal(nome) { return chaveDe(SISTEMA.id, nome); }

// troca o sistema e recarrega (o endereço perde só o rpg=… do #, pra não voltar pro anterior)
function trocarSistema(id) {
  if (!SISTEMAS[id]) return;
  try { localStorage.setItem('sk-sistema', id); } catch { /* sem armazenamento */ }
  const resto = location.hash.slice(1).split('&').filter((p) => p && !p.startsWith('rpg='));
  history.replaceState(null, '', location.pathname + location.search + (resto.length ? '#' + resto.join('&') : ''));
  location.reload();
}
window.SK = { SISTEMAS, SISTEMA, chaveDe, chaveLocal, trocarSistema };
