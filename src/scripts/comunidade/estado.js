/* ================= COMUNIDADE =================
   Dados compartilhados (db do Claude) entre o mestre (Editor/Dono) e os jogadores (Colaboradores).
   O mestre cria o conteúdo (mapa, locais, NPCs, pistas, missões); jogadores postam, comentam,
   conversam com NPCs (o mestre responde), resolvem pistas e aceitam missões. */
(function () {
  'use strict';
  const SECS = [['historia', 'História'], ['npcs', 'NPCs'], ['pistas', 'Pistas'], ['missoes', 'Missões'], ['perfil', 'Perfis'], ['ferramentas', 'Ferramentas']];
  const NOME_SEC = Object.fromEntries(SECS.map((s) => [s[0], s[1]]));
  const TIPOS_PISTA = { documento: 'Documento', cifrada: 'Mensagem cifrada', enigma: 'Enigma', arquivo: 'Arquivo', transmissao: 'Transmissão' };
  const TIPOS_LOCAL = { distrito: 'Distrito', local: 'Ponto de interesse', evento: 'Evento' };
  const TIPOS_MISSAO = { individual: 'Individual', comunidade: 'Comunitária', evento: 'Evento temporário' };
  const REACOES = ['⚡', '🔥', '💀', '😂', '👍'];
  const CORES = ['#ff2a6d', '#05d9e8', '#f2a900', '#3fae5a', '#9b59cf', '#e06c1f', '#ffffff'];
  const REL = [[-3, 'Hostil'], [-2, 'Hostil'], [-1, 'Desconfiado'], [0, 'Neutro'], [1, 'Amigável'], [2, 'Aliado'], [3, 'Aliado fiel']];
  const NIVEIS = [[0, 'Ninguém'], [10, 'Conhecido nas ruas'], [25, 'Respeitado'], [50, 'Nome de peso'], [100, 'Lenda de rua']];

  const S = {
    db: null, user: null, assets: null, me: null, mestre: false, escreve: true, erro: null, lento: false,
    d: { quadro: [], quadroConf: null, mapa: null, locais: [], npcs: [], pistas: [], rasc: [], missoes: [], aceites: [], rep: {}, perfis: {}, mural: [], coment: [], desc: [], conversas: [], minhaConv: null, msgs: [], den: [], thread: [], fichas: [], fichasM: [], ataques: [], ordem: null },
    visto: null, nomes: {}, sec: 'historia', aberto: false, carregou: new Set(), conhecidos: null,
    ui: {}, abertosCom: new Set(), abertosDesc: new Set(), rascCom: {}, rascDesc: {}, npcAberto: null, chatNpc: null, threadDe: null, subThread: null,
    sess: null, subsSala: [], lob: { pedFB: {}, papel: null, minhas: [], membrosDe: {}, pedidosTodos: {}, meusPedidos: {}, sessDe: {}, meuMembro: {}, ger: null, busca: null, criando: false, conhecidosLob: null }, subsLob: {}, 
    pistasVer: 'pub', missoesVer: 'abertas', filtroLocal: '', pondo: false, movendo: null, mz: 1, perfilAberto: null, verDen: false,
  };

