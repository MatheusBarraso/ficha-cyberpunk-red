  // ===================== FICHAS DE DEMONSTRAÇÃO =====================
  // 3 players de exemplo, 3 NPCs e 3 monstros já preenchidos, pra ver como fica a mesa em combate.
  const PERICIA = {
    concentracao: 'NVL 1 ATENÇÃO', ocultar: 'NVL 2 ATENÇÃO', leitura: 'NVL 3 ATENÇÃO', percepcao: 'NVL 4 ATENÇÃO', rastrear: 'NVL 5 ATENÇÃO',
    atletismo: 'NVL 6 CORPORAIS', contorcionismo: 'NVL 7 CORPORAIS', resistencia: 'NVL 9 CORPORAIS', tortura: 'NVL 10 CORPORAIS', furtividade: 'NVL 11 CORPORAIS',
    dirigir: 'NVL 12 CONDUÇÃO', moto: 'NVL 15 CONDUÇÃO', burocracia: 'NVL 18 EDUCAÇÃO A', negocios: 'NVL 19 EDUCAÇÃO A', criminologia: 'NVL 21 EDUCAÇÃO A',
    criptografia: 'NVL 22 EDUCAÇÃO A', deducao: 'NVL 23 EDUCAÇÃO A', educacao: 'NVL 24 EDUCAÇÃO A', apostar: 'NVL 25 EDUCAÇÃO A', idiomaRuas: 'NVL SUB IDIOMA DAS RUAS',
    biblioteca: 'NVL 29 EDUCAÇÃO B', suaCasa: 'NVL SUB SUA CASA', estrategia: 'NVL 35 EDUCAÇÃO B', sobrevivencia: 'NVL 36 EDUCAÇÃO B',
    briga: 'NVL 37 LUTA', evasao: 'NVL 38 LUTA', artesMarciais: 'NVL 39 LUTA', armasBrancas: 'NVL 40 LUTA',
    automatica: 'NVL 45 ARMAS A', armasCurtas: 'NVL 46 ARMAS A', armasPesadas: 'NVL 47 ARMAS B', fuzil: 'NVL 48 ARMAS B',
    suborno: 'NVL 49 SOCIAIS', percepcaoHumana: 'NVL 51 SOCIAIS', interrogatorio: 'NVL 52 SOCIAIS', persuasao: 'NVL 53 SOCIAIS', malandragem: 'NVL 55 SOCIAIS', negociacao: 'NVL 56 SOCIAIS',
    tecBasica: 'NVL 59 TÉCNICAS', cibertec: 'NVL 60 TÉCNICAS', demolicoes: 'NVL 61 TÉCNICAS', eletronica: 'NVL 62 TÉCNICAS', primeirosSocorros: 'NVL 63 TÉCNICAS',
    falsificacao: 'NVL 64 TÉCNICAS', tecTerrestre: 'NVL 65 TÉCNICAS', medicamentos: 'NVL 67 TÉCNICAS', arrombamento: 'NVL 69 TÉCNICAS', furto: 'NVL 70 TÉCNICAS', tecArmas: 'NVL 72 TÉCNICAS',
  };
  // monta os dados de uma ficha: atributos, vida calculada como no livro (10 + 5 × metade de TCO+FVO, arredondada pra cima), perícias, armas, armadura e cyberware
  function fichaDemo(b) {
    const [INT, REF, DES, TEC, COOL, FVO, SOR, MOV, TCO, EMP] = b.atr;
    const pv = 10 + 5 * Math.ceil((TCO + FVO) / 2);
    const hum = b.humanidade != null ? b.humanidade : EMP * 10;
    const d = { NOME: b.nome, PAPEL: b.papel, 'HABILIDADE DO PAPEL': b.habilidade || '', NIVEL: String(b.nivel || ''), NOTAS: b.notas || '',
      INT, REF, DES, TEC, COOL, FVO, SOR, 'SOR TOTAL': SOR, MOV, TCO, EMP, 'EMP TOTAL': Math.floor(hum / 10),
      [PV]: b.pv != null ? b.pv : pv, 'PONTOS DE VIDA 1': pv, 'GRAVEMENTE FERIDO': Math.ceil(pv / 2), 'RESISTÊNCIA A MORTE': TCO,
      HUMANIDADE: hum, 'HUMANIDADE TOTAL': EMP * 10 };
    for (const [k, v] of Object.entries(b.pericias || {})) d[PERICIA[k]] = v;
    (b.armas || []).forEach(([arma, dano, mun, cdt, notas], i) => Object.assign(d, { [`ARMA ${i + 1}`]: arma, [`DANO ${i + 1}`]: dano, [`MUNIÇÃO ${i + 1}`]: mun, [`CDT ${i + 1}`]: cdt, [`NOTAS ${i + 1}`]: notas || '' }));
    (b.armadura || []).forEach(([parte, pb, pen], i) => Object.assign(d, { [`ARMADURA ${i + 1}`]: parte, [`PB ${i + 1}`]: pb, [`PENALIDADE ${i + 1}`]: pen || '' }));
    (b.equip || []).forEach((e, i) => { d[`EQUIPAMENTO ${i + 1}`] = e; });
    for (const [lugar, itens] of Object.entries(b.cyber || {})) {
      const caixa = `CAIXA DE SELEÇÃO ${lugar}`;
      itens.forEach(([nomeC, dados], i) => { d[`${lugar} ${i + 1}`] = nomeC; d[`DADOS ${lugar} ${i + 1}`] = dados; });
      if (/^(CIBERÁUDIO|CIBERÓPTICO|CIBERBRAÇO|CIBERPERNA|EQUIPAMENTO NEURAL)/.test(lugar)) d[caixa] = true;
    }
    Object.assign(d, b.extra || {});
    for (const k of Object.keys(d)) if (typeof d[k] === 'number') d[k] = String(d[k]);
    return d;
  }
  const DEMOS = [
    // ----- players de exemplo -----
    ['demo', 'aliado', { nome: 'Vex', papel: 'Solo', habilidade: 'Consciência de Combate', nivel: 4, atr: [5, 8, 6, 4, 6, 5, 4, 6, 7, 4],
      notas: 'Ex-segurança corporativa. Fala pouco, atira primeiro.',
      pericias: { concentracao: 2, percepcao: 4, atletismo: 4, resistencia: 4, furtividade: 3, idiomaRuas: 2, suaCasa: 2, briga: 4, evasao: 6, armasBrancas: 4, armasCurtas: 6, fuzil: 6, interrogatorio: 2, primeirosSocorros: 2 },
      armas: [['Pistola pesada', '3d6', '8', '2'], ['Fuzil de assalto', '5d6', '25', '1', 'Mira teleóptica'], ['Faca de combate', '1d6', '—', '2']],
      armadura: [['Corpo — jaqueta blindada leve', 11, '0'], ['Cabeça — capacete leve', 11, '0']],
      equip: ['Agenda (celular)', 'Lanterna', 'Kit de munição extra'],
      cyber: { 'CIBERÓPTICO DIREITO': [['Cibervisão', 'Base pro olho']], 'CIBERÓPTICO ESQUERDO': [['Mira teleóptica', '+1 em ataques a distância']], 'CYBERWARE INTERNO': [['Biomonitor', 'Mostra a própria vida']] },
      extra: { DINHEIRO: '1.200 eb', 'ORIGENS CULTURAIS': 'Norte-americana', PERSONALIDADE: 'Fria e calculista', 'OBJETIVO DE VIDA': 'Pagar a dívida com quem salvou a vida dela' } }],
    ['demo', 'aliado', { nome: 'Pixel', papel: 'Netrunner', habilidade: 'Interface', nivel: 4, atr: [8, 6, 6, 6, 4, 6, 5, 5, 4, 5],
      notas: 'Hacker de dezenove anos que nunca saiu do bairro.',
      pericias: { concentracao: 4, percepcao: 4, atletismo: 2, furtividade: 4, criptografia: 4, deducao: 2, educacao: 4, idiomaRuas: 2, biblioteca: 4, suaCasa: 4, evasao: 4, armasCurtas: 4, tecBasica: 6, cibertec: 4, eletronica: 6 },
      armas: [['Pistola média', '2d6', '12', '2']],
      armadura: [['Corpo — roupa blindada', 7, '0']],
      equip: ['Deck de cyberdeck', 'Óculos de RV', 'Agenda (celular)', 'Ferramentas de técnico'],
      cyber: { 'EQUIPAMENTO NEURAL': [['Plugue neural', 'Liga no cyberdeck'], ['Porta de interface', '+2 vias de dados']], 'CYBERWARE INTERNO': [['Filtro tóxico', 'Ignora venenos no ar']] },
      extra: { DINHEIRO: '800 eb', PERSONALIDADE: 'Curiosa e impulsiva', 'OBJETIVO DE VIDA': 'Entrar na rede da corporação que despejou a família' } }],
    ['demo', 'aliado', { nome: 'Doc Brasa', papel: 'Medtech', habilidade: 'Medicina', nivel: 4, atr: [7, 5, 6, 8, 5, 6, 5, 6, 5, 7],
      notas: 'Médico de rua. Atende qualquer um que pagar, e alguns que não podem.',
      pericias: { concentracao: 2, percepcao: 4, resistencia: 2, educacao: 4, idiomaRuas: 2, biblioteca: 4, suaCasa: 4, evasao: 2, armasCurtas: 4, percepcaoHumana: 4, persuasao: 2, tecBasica: 4, cibertec: 6, primeirosSocorros: 6, medicamentos: 6 },
      armas: [['Pistola leve', '1d6', '12', '2'], ['Bisturi', '1d6', '—', '2']],
      armadura: [['Corpo — jaqueta blindada leve', 11, '0']],
      equip: ['Maleta de medtech', 'Spray de cura (4 doses)', 'Criobolsa', 'Agenda (celular)'],
      cyber: { 'CIBERBRAÇO DIREITO': [['Ciberbraço', 'Mão firme pra cirurgia'], ['Ferramenta médica embutida', '+2 em Primeiros Socorros']] },
      extra: { DINHEIRO: '2.000 eb', PERSONALIDADE: 'Calmo e irônico', 'OBJETIVO DE VIDA': 'Abrir uma clínica de verdade no bairro' } }],
    // ----- NPCs -----
    ['npc', 'aliado', { nome: 'Kira Volt', papel: 'Informante', habilidade: 'Operação', nivel: 3, atr: [7, 5, 6, 5, 7, 5, 6, 5, 4, 7],
      notas: 'Atende nos fundos do Bar Curto-Circuito. Cobra adiantado e nunca diz quem contou.',
      pericias: { percepcao: 6, furtividade: 4, idiomaRuas: 4, suaCasa: 6, negocios: 4, evasao: 4, armasCurtas: 4, suborno: 6, percepcaoHumana: 6, persuasao: 6, malandragem: 4, negociacao: 6 },
      armas: [['Pistola média', '2d6', '12', '2']], armadura: [['Corpo — roupa blindada', 7, '0']], extra: { DINHEIRO: 'Bastante, mas nunca no bolso' } }],
    ['npc', 'inimigo', { nome: 'Sargento Okada', papel: 'Policial', habilidade: 'Autoridade', nivel: 4, atr: [6, 7, 6, 4, 7, 7, 4, 6, 7, 4],
      notas: 'Comanda a patrulha do cais. Aceita propina, mas nunca a mesma duas vezes.',
      pericias: { percepcao: 6, atletismo: 4, resistencia: 4, dirigir: 6, criminologia: 6, briga: 4, evasao: 4, armasCurtas: 6, fuzil: 4, interrogatorio: 6, suborno: 2 },
      armas: [['Pistola pesada', '3d6', '8', '2'], ['Escopeta', '5d6', '4', '1'], ['Cassetete', '1d6', '—', '2']],
      armadura: [['Corpo — colete blindado médio', 12, '-2'], ['Cabeça — capacete', 12, '-2']] }],
    ['npc', 'aliado', { nome: 'Tio Zé da Oficina', papel: 'Techie', habilidade: 'Fabricar', nivel: 3, atr: [7, 4, 7, 8, 5, 6, 5, 4, 6, 5],
      notas: 'Conserta qualquer coisa com fita, solda e paciência. Gosta de quem traz café.',
      pericias: { percepcao: 4, idiomaRuas: 2, suaCasa: 6, armasCurtas: 2, negociacao: 4, tecBasica: 6, cibertec: 4, eletronica: 6, tecTerrestre: 6, tecArmas: 6, demolicoes: 2 },
      armas: [['Chave inglesa', '2d6', '—', '1'], ['Escopeta de cano serrado', '5d6', '2', '1']], armadura: [['Corpo — avental de couro', 4, '0']] }],
    // ----- monstros -----
    ['monstro', 'inimigo', { nome: 'Navalha', papel: 'Ciberpsicopata', habilidade: '', nivel: 6, atr: [4, 8, 8, 3, 6, 8, 3, 7, 10, 2], humanidade: 4,
      notas: 'Perdeu o controle depois do quinto implante. Ataca qualquer coisa que se mexe.',
      pericias: { percepcao: 6, atletismo: 6, resistencia: 6, furtividade: 4, briga: 8, evasao: 6, artesMarciais: 6, armasBrancas: 8, automatica: 4 },
      armas: [['Lâminas de ciberbraço (x2)', '3d6', '—', '2', 'Ignora metade da armadura'], ['Submetralhadora', '2d6', '40', '1', 'Rajada 3d6']],
      armadura: [['Pele blindada subdérmica', 11, '0']],
      cyber: { 'CIBERBRAÇO ESQUERDO': [['Ciberbraço', 'Força bruta'], ['Lâminas retráteis', '3d6']], 'CIBERBRAÇO DIREITO': [['Ciberbraço', 'Força bruta'], ['Lâminas retráteis', '3d6']], 'CYBERWARE INTERNO': [['Reforço de reflexos', '+1 iniciativa'], ['Pele subdérmica', 'PB 11']], BORGWARE: [['Estrutura óssea reforçada', '+2 em Resistência']] } }],
    ['monstro', 'inimigo', { nome: 'Capanga dos Ossos de Cromo', papel: 'Gangue', nivel: 2, atr: [3, 6, 5, 3, 4, 4, 3, 5, 6, 3],
      notas: 'Gangue de rua do Mercado Underground. Andam em grupos de três a cinco.',
      pericias: { percepcao: 2, atletismo: 4, briga: 6, evasao: 4, armasBrancas: 4, armasCurtas: 6, automatica: 4, malandragem: 4 },
      armas: [['Pistola média', '2d6', '12', '2'], ['Taco com pregos', '2d6', '—', '2']], armadura: [['Corpo — jaqueta blindada leve', 11, '0']] }],
    ['monstro', 'inimigo', { nome: 'Drone de segurança', papel: 'Máquina', nivel: 3, atr: [3, 7, 6, 0, 0, 0, 0, 8, 4, 0], pv: 25, humanidade: 0,
      notas: 'Patrulha os prédios do Centro Corporativo. Dispara um aviso antes de atirar.',
      pericias: { percepcao: 6, evasao: 4, automatica: 6 },
      armas: [['Submetralhadora acoplada', '2d6', '30', '1', 'Rajada 3d6']], armadura: [['Carcaça', 11, '0']], extra: { 'PONTOS DE VIDA 1': '25' } }],
  ];
  async function criarDemos(base) {
    // base: o começo do caminho das fichas do mestre (data/users/{me}/s-{sid}/); ids fixos, então criar de novo só refaz as fichas de demonstração
    const t = agora();
    for (const [i, [tipo, lado, b]] of DEMOS.entries()) {
      const dados = fichaDemo(b);
      await S.db.doc(`${base}fichasMestre/demo-${i + 1}`).set({ tipo, lado, demo: true, dados, ts: t + i, por: S.me, nome: dados.NOME });
    }
  }

  SECOES.ferramentas = {
    montar(w) {
      const ver = S.ferrVer === 'combate' ? 'combate' : 'fichas';
      const troca = (v, txt) => h('button', { type: 'button', class: 'cm-ferr-troca' + (ver === v ? ' on' : ''), onclick: () => { S.ferrVer = v; montar(); } }, txt);
      w.append(h('div', { class: 'cm-h' }, h('h2', { text: ver === 'combate' ? 'Combate' : 'Fichas' }), h('div', { class: 'cm-ferr-trocas' }, troca('fichas', 'Fichas'), troca('combate', 'Combate'))));
      S.ui.area = h('div', { class: 'cm-fb-area' });
      w.append(S.ui.area);
    },
    atualizar() {
      if (!S.mestre) { rc(S.ui.area, h('div', { class: 'cm-vazio', text: 'Só o mestre vê esta parte.' })); return; }
      if (S.ferrVer === 'combate') { pintarCombate(); return; }
      const players = membrosSala();
      const doTipo = (t) => (S.d.fichasM || []).filter((f) => f.tipo === t).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      const real = (t) => (t === 'player' ? 0 : 1);
      const blocos = (xs, pjPrimeiro) => xs.filter(([t, i]) => !morta(t, i))
        .sort((a, b) => (pjPrimeiro ? real(a[0]) - real(b[0]) : 0) || pesoF(a[0], a[1]) - pesoF(b[0], b[1])).map(([t, i]) => blocoFicha(t, i, { olho: true }));
      const todasT = [...players.map((u) => ['player', u]), ...(S.d.fichasM || []).slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).map((f) => [f.tipo, f.id])];
      const mortos = todasT.filter(([t, i]) => morta(t, i)).sort((a, b) => pesoF(a[0], a[1]) - pesoF(b[0], b[1])).map(([t, i]) => blocoFicha(t, i, { olho: true }));
      const vivos = (t) => doTipo(t).filter((f) => !morta(f.tipo, f.id)).length;
      const grupo = (tit, itens, vazio) => h('div', { class: 'cm-fb-grupo' },
        h('div', { class: 'cm-faixa', text: tit }),
        h('div', { class: 'cm-fb-grade' }, itens.length ? itens : h('div', { class: 'cm-vazio', text: vazio })));
      rc(S.ui.area,
        nota('Fichas na mesa', 'Toque numa ficha pra abrir e mexer à vontade. A de player muda na ficha dele na hora; as de NPC e monstro só você vê. ' + (SISTEMA.id === 'livre' ? 'Cada ficha tem as suas seções: abra e use “Editar ficha”.' : 'Por enquanto todas usam o mesmo modelo de ficha.')),
        !SISTEMA.recursos.demonstracao ? null : h('div', { class: 'cm-row' }, (S.d.fichasM || []).some((f) => f.demo)
          ? btn('Apagar as fichas de demonstração', async () => { if (await confirmar('Apagar as 9 fichas de demonstração?', 'Apagar')) await salvar(async () => { for (const f of S.d.fichasM.filter((x) => x.demo)) { if (R.id === f.id) sairRemota(true); await dok('fichasMestre', f.id).delete(); } }); }, 'cm-mini')
          : btn('Criar fichas de demonstração', async () => { if (await salvar(() => criarDemos(baseDe('fichasMestre')))) toast('Fichas', '3 players, 3 NPCs e 3 monstros de demonstração criados.'); }, 'cm-mini cm-pri')),
        grupo(`Players (${players.filter((u) => !morta('player', u)).length + vivos('demo')})`, blocos([...players.map((u) => ['player', u]), ...doTipo('demo').map((f) => ['demo', f.id])], true), 'Ninguém na mesa ainda.'),
        grupo(`NPCs (${vivos('npc')})`, [...blocos(doTipo('npc').map((f) => ['npc', f.id])), blocoNovo('npc')]),
        grupo(`Monstros (${vivos('monstro')})`, [...blocos(doTipo('monstro').map((f) => ['monstro', f.id])), blocoNovo('monstro')]),
        h('div', { class: 'cm-fb-grupo cm-fb-mortos' }, h('div', { class: 'cm-faixa cm-faixa-mortos' }, caveira(), ` Mortos (${mortos.length})`),
          h('div', { class: 'cm-fb-grade' }, mortos.length ? mortos : h('div', { class: 'cm-vazio', text: 'Ninguém morreu ainda. Use a caveira no canto de uma ficha pra marcar como morta (ou zere os Pontos de Vida).' }))));
    },
  };
