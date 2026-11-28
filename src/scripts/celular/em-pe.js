/* ================= celular em pé: páginas 1–3 em cartões numa coluna =================
   Os MESMOS campos da ficha (os inputs com data-f) são movidos pra cá quando a tela fica estreita
   e voltam pro desenho do PDF quando ela alarga — nada é duplicado, o salvamento não muda. */
const MOB_MAX = 760;               // largura (px) a partir da qual vira modo celular
const mobSlots = [];               // lugares onde cada campo entra no modo celular
const mobHome = new Map();         // campo → onde ele mora no desenho do PDF
let mobOn = false;

// perícias na ordem da ficha: [nº do NVL no PDF, nome, atributo, negrito?]
// ['g', nome, atributo, negrito?] = linha de grupo (sem campos) · ['s', nº, rótulo fixo, chave do campo de texto]
const MSK = [
  ['Perícias de Atenção', [[1, 'Concentração', 'FVO', 1], [2, 'Ocultar/Revelar Objeto', 'INT'], [3, 'Leitura Labial', 'INT'], [4, 'Percepção', 'INT', 1], [5, 'Rastrear', 'INT']]],
  ['Perícias Corporais', [[6, 'Atletismo', 'DES', 1], [7, 'Contorcionismo', 'DES'], [8, 'Dançar', 'DES'], [9, 'Resistência', 'FVO'], [10, 'Resistência à Tortura/Drogas', 'FVO'], [11, 'Furtividade', 'DES', 1]]],
  ['Perícias de Condução', [[12, 'Dirigir Veículo Terrestre', 'REF'], [13, 'Pilotar Veículo Aéreo (x2)', 'REF'], [14, 'Pilotar Veículo Marítimo', 'REF'], [15, 'Motocicleta', 'REF']]],
  ['Perícias de Educação', [[16, 'Contabilidade', 'INT'], [17, 'Lidar com Animais', 'INT'], [18, 'Burocracia', 'INT'], [19, 'Negócios', 'INT'], [20, 'Composição', 'INT'],
    [21, 'Criminologia', 'INT'], [22, 'Criptografia', 'INT'], [23, 'Dedução', 'INT'], [24, 'Educação', 'INT', 1], [25, 'Apostar', 'INT'],
    ['g', 'Idioma', 'INT', 1], ['s', 26, 'Idioma das Ruas', null], ['s', 27, '', 'IDIOMA 1'], ['s', 28, '', 'IDIOMA 2'],
    [29, 'Pesquisa em Biblioteca', 'INT'],
    ['g', 'Especialista Local', 'INT'], ['s', 30, 'Sua casa', null], ['s', 31, '', 'ESPECIALISTA LOCAL 1'], ['s', 32, '', 'ESPECIALISTA LOCAL 2'],
    ['g', 'Ciência', 'INT'], ['s', 33, '', 'CIÊNCIA 1'], ['s', 34, '', 'CIÊNCIA 2'],
    [35, 'Estratégia', 'INT'], [36, 'Sobrevivência', 'INT']]],
  ['Perícias de Luta', [[37, 'Briga', 'DES', 1], [38, 'Evasão', 'DES', 1], [39, 'Artes Marciais (x2)', 'DES'], [40, 'Armas Brancas', 'DES']]],
  ['Perícias de Performance', [[41, 'Atuação', 'COOL'], ['g', 'Tocar Instrumento', 'TEC'], ['s', 42, '', 'INSTRUMENTO 1'], ['s', 43, '', 'INSTRUMENTO 2']]],
  ['Perícias de Armas', [[44, 'Arqueirismo', 'REF'], [45, 'Automática (x2)', 'REF'], [46, 'Armas Curtas', 'REF'], [47, 'Armas Pesadas (x2)', 'REF'], [48, 'Fuzil', 'REF']]],
  ['Perícias Sociais', [[49, 'Suborno', 'COOL'], [50, 'Oratória', 'EMP', 1], [51, 'Percepção Humana', 'EMP', 1], [52, 'Interrogatório', 'COOL'], [53, 'Persuasão', 'COOL', 1],
    [54, 'Cuidados Pessoais', 'COOL'], [55, 'Malandragem', 'COOL'], [56, 'Negociação', 'COOL'], [57, 'Roupa e Estilo', 'COOL']]],
  ['Perícias Técnicas', [[58, 'Tecnologia de Veículos Aéreos', 'TEC'], [59, 'Tecnologia Básica', 'TEC'], [60, 'Cibertecnologia', 'TEC'], [61, 'Demolições (x2)', 'TEC'],
    [62, 'Eletrônica/Tec. de Segurança (x2)', 'TEC'], [63, 'Primeiros Socorros', 'TEC', 1], [64, 'Falsificação', 'TEC'], [65, 'Tecnologia de Veículo Terrestre', 'TEC'],
    [66, 'Pintar/Desenhar/Esculpir', 'TEC'], [67, 'Medicamentos (x2)', 'TEC'], [68, 'Fotografia e Filmagem', 'TEC'], [69, 'Arrombamento', 'TEC'], [70, 'Furto', 'TEC'],
    [71, 'Tecnologia de Veículo Marítimo', 'TEC'], [72, 'Tecnologia de Armas/Armeiro', 'TEC']]],
];

function mslot(host, key, h) {
  // o nome amigável do campo (ex.: "Arqueirismo") também vale na ficha do PDF (editor do celular deitado e selos dos livros)
  const real = key === '__img' ? null : document.querySelector(`[data-f="${CSS.escape(key)}"]`);
  const fx = real && real.closest('.fx');
  if (fx && host.dataset.label && host.dataset.label !== key) fx.dataset.label = host.dataset.label;
  const s = el('span', 'mslot');
  s.dataset.k = key;
  if (h) s.dataset.h = h;
  host.append(s);
  mobSlots.push(s);
  return s;
}
// caixa com rótulo + campo; o = { c: centraliza, big: número grande, red: rótulo vermelho, h: altura do texto longo, flex, dl: nome pro vínculo }
function mcell(key, label, o = {}) {
  const c = el('div', 'mcell mhost' + (o.c ? ' c' : '') + (o.big ? ' big' : '') + (o.cls ? ` ${o.cls}` : ''));
  if (o.flex) c.style.flex = o.flex;
  c.dataset.label = o.dl || label || key;
  if (label) c.append(el('span', 'ml' + (o.red ? ' red' : ''), label));
  mslot(c, key, o.h);
  return c;
}
function mrow(...cells) { const r = el('div', 'mrow'); r.append(...cells); return r; }
function mcard(o = {}) { return el('section', 'mcard' + (o.cls ? ` ${o.cls}` : '')); }
function mhead(t) { return el('div', 'mhead', t); }
function mtable(heads, cols, rows, cen = []) {
  const t = el('div', 'mtable');
  t.style.gridTemplateColumns = cols;
  for (const h of heads) t.append(el('span', 'mth', h));
  for (const r of rows) r.forEach((k, j) => {
    const c = el('span', 'mtd mhost' + (cen[j] ? ' c' : ''));
    c.dataset.label = k;
    mslot(c, k);
    t.append(c);
  });
  return t;
}
function mkv(label, key) {
  const r = el('div', 'mkv');
  r.append(el('span', 'mkl', label));
  const c = el('span', 'mtd mhost'); c.dataset.label = label; mslot(c, key);
  r.append(c);
  return r;
}
const mskName = (nome, atr, neg) => `<span class="st"><span class="${neg ? 'nb' : ''}">${nome}</span> <b>(${atr})</b></span>`;

function mskills(title, rows) {
  const card = mcard({ cls: 'msk' });
  const h = el('div', 'mskr mskh');
  h.append(el('span', 'n', title), el('span', 'c', 'NVL'), el('span', 'c', 'ATR'), el('span', 'c', 'BASE'));
  card.append(h);
  for (const r of rows) {
    const row = el('div', 'mskr' + (r[0] === 's' ? ' sub' : ''));
    if (r[0] === 'g') {
      row.append(el('span', 'sl', mskName(r[1], r[2], r[3])), el('span', 'vz'), el('span', 'vz'), el('span', 'vz'));
      card.append(row);
      continue;
    }
    const n = r[0] === 's' ? r[1] : r[0];
    const nvl = document.querySelector(`input[data-pdf="NVL ${n}"]`);
    if (!nvl) continue;
    const sl = el('span', 'sl');
    let nome;
    if (r[0] === 's') {
      if (r[3]) { sl.classList.add('mhost', 'tx'); sl.dataset.label = r[3]; mslot(sl, r[3]); nome = r[3]; }
      else { sl.append(el('b', '', r[2])); nome = r[2]; }
    } else { sl.innerHTML = mskName(r[1], r[2], r[3]); nome = r[1]; }
    const nc = el('span', 'nv mhost'); nc.dataset.label = nome; mslot(nc, nvl.dataset.f);
    const a = el('span', 'calc atr mc'); a.dataset.stat = nvl.dataset.atr;
    const b = el('span', 'calc base mc'); b.dataset.nvlf = nvl.dataset.f;
    row.append(sl, nc, a, b);
    card.append(row);
  }
  return card;
}

function mobPage1(host) {
  let c = mcard();
  const pc = el('div', 'mportrait mhost'); pc.dataset.label = 'Retrato'; mslot(pc, '__img'); c.append(pc);
  c.append(mrow(mcell('NOME', 'Nome')));
  c.append(mrow(mcell('PAPEL', 'Papel')));
  c.append(mrow(mcell('HABILIDADE DO PAPEL', 'Habilidade do Papel'), mcell('NIVEL', 'Nível', { red: 1, c: 1, flex: '0 0 84px' })));
  c.append(mrow(mcell('NOTAS', 'Notas', { h: 120 })));
  c.append(mrow(mcell('HUMANIDADE', 'Humanidade', { c: 1, big: 1 }), mcell('HUMANIDADE TOTAL', 'De', { red: 1, c: 1, big: 1 })));
  host.append(c);

  c = mcard({ cls: 'mstats' });
  const g = el('div', 'mstatg');
  for (const s of ['INT', 'REF', 'DES', 'TEC', 'COOL', 'FVO', 'SOR', 'MOV', 'TCO', 'EMP']) {
    const cell = mcell(s, s, { c: 1, big: 1, cls: 'mstat' });
    if (s === 'SOR' || s === 'EMP') {
      const de = el('span', 'mde mhost'); de.dataset.label = `${s} (de)`;
      de.append(el('span', 'ml red', 'De'));
      mslot(de, `${s} TOTAL`);
      cell.append(de); cell.classList.add('has-de');
    }
    g.append(cell);
  }
  c.append(g);
  host.append(c);

  for (const [t, rows] of MSK) host.append(mskills(t, rows));

  c = mcard();
  c.append(mrow(mcell('PONTOS DE VIDA', 'Pontos de Vida', { c: 1, big: 1 }), mcell('PONTOS DE VIDA 1', 'De', { red: 1, c: 1, big: 1 })));
  c.append(mrow(mcell('GRAVEMENTE FERIDO', 'Gravemente Ferido', { c: 1, big: 1 })));
  c.append(el('div', 'mredbar', '-2 para todas as ações quando estiver gravemente ferido'));
  c.append(mrow(mcell('RESISTÊNCIA A MORTE', 'Resistência a Morte', { c: 1, big: 1 })));
  c.append(mrow(mcell('LESÕES CRÍTICAS', 'Lesões Críticas', { h: 80 })));
  c.append(mrow(mcell('VÍCIOS', 'Vícios', { h: 70 })));
  host.append(c);

  c = mcard();
  c.append(el('div', 'mbig', 'Armas e Armadura'));
  c.append(mtable(['Armadura', 'PB', 'Penalidade'], 'minmax(0,1fr) 58px 92px',
    [1, 2, 3, 4].map(i => [`ARMADURA ${i}`, `PB ${i}`, `PENALIDADE ${i}`]), [0, 1, 1]));
  c.append(el('div', 'mredbar', 'Penalidade aplicada em REF, DES e MOV'));
  host.append(c);

  c = mcard();
  c.append(mhead('Armas'));
  for (let i = 1; i <= 6; i++) {
    const w = el('div', 'mweap');
    w.append(mrow(mcell(`ARMA ${i}`, `Arma ${i}`)));
    w.append(mrow(mcell(`DANO ${i}`, 'Dano', { c: 1 }), mcell(`MUNIÇÃO ${i}`, 'Munição', { c: 1 }), mcell(`CDT ${i}`, 'CDT', { c: 1 })));
    w.append(mrow(mcell(`NOTAS ${i}`, 'Notas', { dl: `Notas da arma ${i}` })));
    c.append(w);
  }
  host.append(c);
}

function mobPage2(host) {
  let c = mcard();
  c.append(mrow(mcell('ALIADOS', 'Aliados')));
  c.append(mrow(mcell('PONTOS DE EXPERIÊNCIA', 'Pontos de Experiência', { c: 1 }), mcell('PONTOS DE EXPERIÊNCIA TOTAIS', 'De', { red: 1, c: 1, flex: '0 0 30%' })));
  c.append(mrow(mcell('REPUTAÇÃO', 'Reputação')));
  c.append(mrow(mcell('EVENTOS DE REPUTAÇÃO', 'Eventos de Reputação', { h: 70 })));
  host.append(c);

  c = mcard();
  c.append(el('div', 'mbig', 'Fluxovida'));
  for (const [label, key] of [['Origens Culturais', 'ORIGENS CULTURAIS'], ['Personalidade', 'PERSONALIDADE'], ['Estilo das Roupas', 'ESTILO DAS ROUPAS'],
    ['Estilo do Cabelo', 'ESTILO DO CABELO'], ['O que você mais valoriza?', 'O QUE VOCÊ MAIS VALORIZA?'],
    ['Qual a sua opinião em relação a maioria das pessoas?', 'QUAL A SUA OPINIÃO EM RELAÇÃO A MAIORIA DAS PESSOAS?'],
    ['Pessoa que mais valoriza', 'PESSOA QUE MAIS VALORIZA'], ['Objeto que mais valoriza', 'OBJETO QUE MAIS VALORIZA'],
    ['Antecedente Familiar', 'ANTECEDENTE FAMILIAR'], ['Ambiente da sua Infância', 'AMBIENTE DA SUA INFÂNCIA'],
    ['Tragédia Familiar', 'TRAGÉDIA FAMILIAR'], ['Objetivo de Vida', 'OBJETIVO DE VIDA']]) {
    c.append(mrow(mcell(key, label, { h: 46 })));
  }
  host.append(c);

  for (const [t, k] of [['Amigos', 'AMIGOS'], ['Amores Trágicos', 'AMORES TRÁGICOS']]) {
    c = mcard({ cls: 'mlist' });
    c.append(el('div', 'mtab', t));
    for (let i = 1; i <= 3; i++) c.append(mrow(mcell(`${k} ${i}`, '', { h: 52, dl: `${t} ${i}` })));
    host.append(c);
  }

  c = mcard({ cls: 'mlist' });
  c.append(el('div', 'mtab', 'Inimigos'));
  for (let i = 1; i <= 3; i++) {
    const s = el('div', 'msub');
    s.append(el('div', 'msubt', `Inimigo ${i}`));
    s.append(mrow(mcell(`QUEM ${i}`, 'Quem?', { h: 44 })));
    s.append(mrow(mcell(`O QUE CAUSOU ISSO ${i}`, 'O que causou isso?', { h: 44 })));
    s.append(mrow(mcell(`COMO ELE(A) PODE TE CONFRONTAR ${i}`, 'Como ele(a) pode te confrontar?', { h: 44 })));
    s.append(mrow(mcell(`O QUE VAI ACONTECER ${i}`, 'O que vai acontecer?', { h: 44 })));
    c.append(s);
  }
  host.append(c);

  c = mcard();
  c.append(mtable(['Equipamento', 'Notas'], 'minmax(0,1fr) minmax(0,1.25fr)',
    Array.from({ length: 19 }, (_, i) => [`EQUIPAMENTO ${i + 1}`, `NOTAS EQUIPAMENTO ${i + 1}`])));
  c.append(mkv('Munição', 'MUNIÇÃO'), mkv('Dinheiro', 'DINHEIRO'));
  host.append(c);

  c = mcard();
  c.append(mrow(mcell('MODA/ESTILO', 'Moda/Estilo', { h: 80 })));
  c.append(mrow(mcell('HABITAÇÃO', 'Habitação')));
  c.append(mrow(mcell('ALUGUEL', 'Aluguel'), mcell('ESTILO DE VIDA', 'Estilo de Vida')));
  c.append(mrow(mcell('FLUXO DE VIDA', 'Fluxovida Específico do Papel', { h: 140 })));
  host.append(c);
}

function mobPage3(host) {
  let c = mcard({ cls: 'mcwtop' });
  c.append(el('div', 'mbig', 'Cyberware'));
  c.insertAdjacentHTML('beforeend', '<svg class="mskel" viewBox="565 285 275 700" aria-hidden="true" focusable="false"><use href="#art-3"/></svg>');
  host.append(c);
  for (const [t, n, chk] of [['Equipamento Neural', 5, 1], ['Ciberáudio', 3, 1], ['Ciberóptico Esquerdo', 3, 1], ['Ciberóptico Direito', 3, 1],
    ['Ciberbraço Esquerdo', 4, 1], ['Ciberbraço Direito', 4, 1], ['Ciberperna Esquerda', 3, 1], ['Ciberperna Direita', 3, 1],
    ['Cyberware Interno', 7, 0], ['Cyberware Externo', 7, 0], ['Cibermoda', 7, 0], ['Borgware', 7, 0]]) {
    const k = t.toUpperCase();
    c = mcard({ cls: 'mcw' });
    const h = el('div', 'mcwh' + (chk ? ' chk' : ''));
    h.append(el('span', 'n', t));
    if (chk) { const b = el('span', 'mbox mhost'); b.dataset.label = t; mslot(b, `CAIXA DE SELEÇÃO ${k}`); h.append(b); }
    h.append(el('span', 'd', 'Dados'));
    c.append(h);
    const rows = el('div', 'mtable nohead');
    rows.style.gridTemplateColumns = 'minmax(0,1fr) minmax(0,1.3fr)';
    for (let i = 1; i <= n; i++) for (const key of [`${k} ${i}`, `DADOS ${k} ${i}`]) {
      const cell = el('span', 'mtd mhost'); cell.dataset.label = key; mslot(cell, key); rows.append(cell);
    }
    c.append(rows);
    host.append(c);
  }
}

function buildMobile() {
  mobPage1($('#mpage-0'));
  mobPage2($('#mpage-1'));
  mobPage3($('#mpage-2'));
}

const EM_PE_CARTOES = false; // os cartões de celular em pé ficaram ruins: em pé mostra a ficha normal
function setMob(on) {
  if (on === mobOn) return;
  mobOn = on;
  document.body.classList.toggle('mob', on);
  for (const s of (EM_PE_CARTOES ? mobSlots : [])) {
    const k = s.dataset.k;
    const node = k === '__img' ? $('#portrait') : document.querySelector(`[data-f="${CSS.escape(k)}"]`);
    if (!node) continue;
    if (on) {
      if (!mobHome.has(node)) mobHome.set(node, node.parentNode);
      s.append(node);
      if (s.dataset.h && node.tagName === 'TEXTAREA') node.style.height = `${s.dataset.h}px`;
    } else {
      const home = mobHome.get(node);
      if (home) home.append(node);
      if (node.tagName === 'TEXTAREA') node.style.height = '';
    }
  }
  if (window.__renderBadges) window.__renderBadges();
  applyScale();
}
// em pé: tela estreita e o celular NÃO está deitado (o teclado aberto não troca o layout)
const wantMob = () => window.innerWidth <= MOB_MAX && !phoneLandscape() && !(matchMedia('(pointer: fine)').matches && !matchMedia('(pointer: coarse)').matches);

