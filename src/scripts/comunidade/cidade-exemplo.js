  // ----- cidade de exemplo pra uma sessão nova -----
  async function criarExemplo(sid) {
    const base = `mestres/${S.me}/sessoes/${sid}/`;
    const t = agora();
    const w = (p, d) => S.db.doc(base + p).set({ ...d, autor: S.me });
    await w('conteudo/mapa', { cidade: 'Porto Sombrio (exemplo)', descricao: 'Cidade de exemplo: uma metrópole portuária dividida em seis distritos, onde corporações mandam de dia e gangues mandam de noite. Edite ou apague à vontade.', img: 'd047cb35c00e6aebc7ce5a6dd96966ae', ts: t });
    const L = [['ex-neon', 'Distrito Neon', 'distrito', '#ff2a6d', 0.32, 0.256, 'Bares, clubes e letreiros que nunca apagam.'], ['ex-corp', 'Centro Corporativo', 'distrito', '#05d9e8', 0.6025, 0.252, 'Torres de vidro, seguranças privados e notícias oficiais.'],
      ['ex-mercado', 'Mercado Underground', 'distrito', '#f2a900', 0.86, 0.304, 'Peças, cromo usado e personalizações sem nota fiscal.'], ['ex-resid', 'Distrito Residencial', 'distrito', '#3fae5a', 0.285, 0.784, 'Conjuntos apertados e vizinhos que sabem de tudo.'],
      ['ex-sub', 'Submundo Digital', 'distrito', '#9b59cf', 0.565, 0.824, 'Servidores piratas, arquivos vazados e enigmas.'], ['ex-ind', 'Zona Industrial', 'distrito', '#e06c1f', 0.85, 0.844, 'Fábricas, oficinas e projetos que ninguém devia construir.'],
      ['ex-bar', 'Bar Curto-Circuito', 'local', '#ff2a6d', 0.42, 0.36, 'Balcão de metal, música alta e a melhor rede de fofoca do distrito.']];
    for (const [id, nomeL, tipo, cor, x, y, descricao] of L) await w('locais/' + id, { nome: nomeL, tipo, cor, x, y, descricao, img: null, ts: t });
    await w('npcs/ex-kira', { nome: 'Kira Volt', papel: 'Informante', personalidade: 'Desconfiada, fala rápido, cobra adiantado.', bio: 'Vende informação nos fundos do Bar Curto-Circuito e sabe quem entra e sai do cais.', local: 'ex-bar', img: '1a34a15bc70349e8ef3f881527c06630', oculto: false, ts: t });
    const rasc = { titulo: 'Transmissão interceptada', tipo: 'cifrada', texto: 'Carga troca de mãos no Píer 7, quarta-feira, 3h da manhã.', pergunta: 'A senha é o nome do lugar onde Kira atende (sem a palavra “Bar”).', resposta: 'curto-circuito', local: 'ex-sub', npc: 'ex-kira', img: null, liga: [], autor: S.me, ts: t };
    await S.db.doc(`data/users/${S.me}/s-${sid}/rascunhos/ex-transmissao`).set(rasc);
    await w('pistas/ex-transmissao', { titulo: rasc.titulo, tipo: rasc.tipo, pergunta: rasc.pergunta, local: rasc.local, npc: rasc.npc, img: null, liga: [], ts: t, ...(await cifrar(rasc.texto, rasc.resposta)) });
    await criarDemos(`data/users/${S.me}/s-${sid}/`);
    await w('missoes/ex-m1', { titulo: 'Rastrear a carga', tipo: 'comunidade', desc: 'Descubram de onde vem e pra onde vai a carga do Píer 7.', pontos: 5, premio: '', meta: 3, prazo: null, local: 'ex-ind', npc: 'ex-kira', status: 'aberta', ts: t });
  }

  async function iniciar() {
    document.body.append(painel, toasts, barraR, abaLado, sinoPainel, contaPainel, marca, legenda);
    { const tb = document.querySelector('.toolbar'); if (tb) { tb.append(barraT); const br = tb.querySelector('.brand'); if (br) br.after(tituloT); } }
    addEventListener('cpr-escuro', () => pintarConta()); // o modo escuro também muda por fora do menu da conta
    caixasSemFicha();
    try { S.lob.ultimo = localStorage.getItem(PAPEL_KEY) || null; } catch { S.lob.ultimo = null; }
    S.lob.papel = null;
    abrir();
    // voltando do login: continua no perfil que tinha escolhido
    let pl = null; try { pl = sessionStorage.getItem('cpr-com-poslogin'); sessionStorage.removeItem('cpr-com-poslogin'); } catch { /* ok */ }
    if (pl === 'mestre' || pl === 'player') trocarPapel(pl);
    const c = window.claude;
    if (!c || typeof c.use !== 'function') { S.erro = 'fora'; if (S.aberto) montar(); return; }
    let db = null, user = null;
    try { [db, user] = await Promise.all([c.use('db'), c.use('user')]); } catch { /* sem db */ }
    if (!db) { S.erro = 'semdb'; if (S.aberto) montar(); return; }
    S.db = db; S.user = user;
    try { S.me = user ? await user.id() : null; } catch { S.me = null; }
    try { const eu = S.me ? await user.me() : null; S.meuNome = (eu && eu.name) || ''; } catch { S.meuNome = ''; }
    pintarConta();
    try { const w = user ? await user.can('data.write') : null; S.escreve = w !== false && !!S.me; } catch { S.escreve = !!S.me; }
    if (!S.me) { if (S.aberto) montar(); return; }
    limparSalvoAntigo();
    sub(S.db.collection('perfis'), (s) => { S.d.perfis = Object.fromEntries(s.docs.map((d) => [d.id, d.data()])); }, 'perfis', null);
    assinarLobby();
    conferirChave();
    if (S.aberto) montar();
    mudou();
  }

