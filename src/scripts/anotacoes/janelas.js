/* ================= janelas dentro da página + modelos do dossiê ================= */
function janela(titulo, corpo) {
  const bg = el('div', 'jn-bg');
  const box = el('div', 'jn'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  const hd = el('div', 'jn-hd'); hd.append(el('span', '', titulo));
  const x = el('button', '', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar');
  hd.append(x);
  const bd = el('div', 'jn-bd'); bd.append(corpo);
  box.append(hd, bd); bg.append(box);
  const tecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fechar(); } };
  function fechar() { bg.remove(); document.removeEventListener('keydown', tecla, true); }
  x.addEventListener('click', fechar);
  bg.addEventListener('click', (e) => { if (e.target === bg) fechar(); });
  document.addEventListener('keydown', tecla, true);
  document.body.append(bg);
  return { fechar, bd };
}
const hojeBR = () => new Date().toLocaleDateString('pt-BR');
const MODELOS = [
  { tipo: 'livre', nome: 'Página em branco', desc: 'Só o papel, sem estrutura', titulo: () => '', html: () => '' },
  { tipo: 'sessao', nome: 'Diário de sessão', desc: 'O que rolou na mesa: grana, XP e ganchos',
    titulo: () => `Sessão ${hojeBR()}`,
    campos: ['Data', 'Onde a gente parou', 'O que aconteceu', 'Eddies ganhos / gastos', 'XP ganho', 'Gente nova', 'Pontas soltas pra próxima'] },
  { tipo: 'gig', nome: 'Gig (trabalho)', desc: 'Contrato do fixer: alvo, pagamento e o que deu errado',
    titulo: () => 'Gig — ',
    campos: ['Fixer / contratante', 'Objetivo', 'Alvo', 'Local (distrito)', 'Pagamento combinado', 'Prazo', 'Plano', 'O que deu errado', 'Pago'] },
  { tipo: 'contato', nome: 'Contato (NPC)', desc: 'Quem é, onde achar e quem deve favor a quem',
    titulo: () => 'Contato — ',
    campos: ['Nome / alcunha', 'Papel', 'Onde encontrar', 'Como conheci', 'Relação (aliado, neutro, inimigo)', 'Me deve / eu devo', 'Notas'] },
  { tipo: 'lugar', nome: 'Lugar de Night City', desc: 'Distrito, quem manda e os perigos',
    titulo: () => 'Lugar — ',
    campos: ['Nome', 'Distrito / zona', 'Quem manda (gangue, corp, ninguém)', 'Perigos', 'Contatos aqui', 'Notas'] },
  { tipo: 'inimigo', nome: 'Inimigo / ameaça', desc: 'Quem quer te ver morto e por quê',
    titulo: () => 'Inimigo — ',
    campos: ['Quem é', 'Por que me odeia', 'O que pode fazer contra mim', 'Recursos (gangue, corp, grana)', 'Última vez que apareceu', 'Fraquezas'] }
];
function modeloHTML(m) {
  if (!m.campos) return '';
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const head = `<div><b><font size="5">${esc(m.nome.toUpperCase())}</font></b></div>`;
  const linhas = m.campos.map((c) => `<div><b>${esc(c)}:</b>&nbsp;${c === 'Data' ? hojeBR() : ''}</div>`).join('');
  return `${head}${linhas}<div><br></div>`;
}
function escolherModelo(titulo, cb, semBranco) {
  const lista = el('div'); lista.style.cssText = 'display:flex;flex-direction:column;gap:8px';
  let j;
  for (const m of MODELOS) {
    if (semBranco && !m.campos) continue;
    const b = el('button', 'jn-op'); b.type = 'button';
    b.append(el('b', '', m.nome), el('small', '', m.desc));
    b.addEventListener('click', () => { j.fechar(); cb(m); });
    lista.append(b);
  }
  j = janela(titulo, lista);
  lista.querySelector('button')?.focus();
}

