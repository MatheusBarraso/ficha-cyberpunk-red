/* ================= Sistema livre: a ficha que o jogador monta =================
   Seções com os campos que a pessoa cria: texto, número, texto longo, atributo, recurso (atual / máximo)
   e marcar. O modelo (seções e campos) fica no campo escondido __layout, dentro dos próprios dados da
   ficha — salvar, backup, mandar pro mestre e o mestre abrir funcionam sem saber que ele existe. Cada
   campo guarda o valor na sua chave (um id que não muda quando o rótulo muda); o recurso guarda o máximo
   em "<id>:max". O nome do personagem é o campo fixo NOME, como nos outros sistemas. */
(() => {
  const TIPOS = [['texto', 'Texto'], ['numero', 'Número'], ['longo', 'Texto longo'], ['atributo', 'Atributo'],
    ['recurso', 'Recurso (atual / máx.)'], ['marcar', 'Marcar (sim / não)']];
  const TIPO_OK = new Set(TIPOS.map(([t]) => t));
  const ID_OK = /^[a-z0-9-]{1,40}$/; // nunca bate com as chaves fixas da ficha (NOME, __img, __layout)
  const LIMITE = { secoes: 60, campos: 120, texto: 80 };

  const campo = (id, rotulo, tipo) => ({ id, rotulo, tipo });
  // ficha nova: um ponto de partida comum a muitos RPGs — dá pra renomear, trocar ou apagar tudo.
  // Os ids não se repetem entre seções e campos (s-… são as seções).
  const modelo = () => ({ v: 1, secoes: [
    { id: 's-personagem', titulo: 'Personagem', campos: [campo('jogador', 'Jogador', 'texto'), campo('conceito', 'Conceito / classe', 'texto'), campo('nivel', 'Nível', 'numero')] },
    { id: 's-atributos', titulo: 'Atributos', campos: ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma'].map((n, i) => campo('atr' + (i + 1), n, 'atributo')) },
    { id: 's-recursos', titulo: 'Recursos', campos: [campo('vida', 'Vida', 'recurso'), campo('energia', 'Energia', 'recurso')] },
    { id: 's-habilidades', titulo: 'Perícias e habilidades', campos: [campo('habilidades', '', 'longo')] },
    { id: 's-equipamento', titulo: 'Equipamento', campos: [campo('equipamento', 'Itens', 'longo'), campo('dinheiro', 'Dinheiro', 'texto')] },
  ] });

  // o modelo pode vir de um backup ou da ficha de outra pessoa: fica só o que a ficha entende
  function ler(txt) {
    let l = null;
    try { l = typeof txt === 'string' ? JSON.parse(txt) : null; } catch { return null; }
    if (!l || !Array.isArray(l.secoes)) return null;
    const vistos = new Set();
    const novo = (id) => typeof id === 'string' && ID_OK.test(id) && !vistos.has(id) && vistos.add(id);
    const texto = (t) => String(t == null ? '' : t).slice(0, LIMITE.texto);
    return { v: 1, secoes: l.secoes.filter((s) => s && novo(s.id)).slice(0, LIMITE.secoes).map((s) => ({
      id: s.id, titulo: texto(s.titulo),
      campos: (Array.isArray(s.campos) ? s.campos : []).filter((c) => c && TIPO_OK.has(c.tipo) && novo(c.id)).slice(0, LIMITE.campos)
        .map((c) => campo(c.id, texto(c.rotulo), c.tipo)),
    })) };
  }

  let layout = modelo(), editando = false;
  let folha = null, secoesEl = null, campoModelo = null, botaoEditar = null;

  const existe = (id) => layout.secoes.some((s) => s.id === id || s.campos.some((c) => c.id === id));
  function novoId() { let id; do { id = 'c-' + Math.random().toString(36).slice(2, 8); } while (existe(id)); return id; }
  const chavesDe = (c) => (c.tipo === 'recurso' ? [c.id, c.id + ':max'] : [c.id]);

  // ---------- desenho ----------
  function mk(tag, attrs, ...filhos) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    e.append(...filhos.flat().filter((f) => f != null && f !== false));
    return e;
  }
  const entrada = (tipo, chave, rotulo) => mk(tipo === 'longo' ? 'textarea' : 'input', {
    type: tipo === 'longo' ? null : tipo === 'marcar' ? 'checkbox' : (tipo === 'texto' ? 'text' : 'number'),
    rows: tipo === 'longo' ? 4 : null, 'data-f': chave, 'aria-label': rotulo, autocomplete: tipo === 'texto' ? 'off' : null,
  });

  // o campo como aparece pra jogar (no modo de edição fica escondido, mas continua guardando o valor)
  function campoJogo(c) {
    const rot = c.rotulo || '';
    const nome = rot || 'Campo sem rótulo';
    const r = rot ? mk('span', { class: 'sl-rot', text: rot }) : null;
    const base = { class: `sl-campo t-${c.tipo}`, 'data-label': nome, 'data-campo': c.id };
    if (c.tipo === 'recurso') {
      return mk('div', { ...base, role: 'group', 'aria-label': nome }, r,
        mk('span', { class: 'sl-par' }, entrada('numero', c.id, `${nome} (atual)`), mk('span', { class: 'sl-de', 'aria-hidden': 'true', text: '/' }), entrada('numero', c.id + ':max', `${nome} (máximo)`)));
    }
    if (c.tipo === 'atributo' || c.tipo === 'marcar') return mk('label', base, entrada(c.tipo === 'atributo' ? 'numero' : 'marcar', c.id, nome), r);
    return mk('label', base, r, entrada(c.tipo, c.id, nome));
  }

  const botao = (txt, titulo, fn, extra) => mk('button', { type: 'button', class: 'sl-ed-b', title: titulo, 'aria-label': titulo, text: txt, onclick: fn, ...extra });
  // botões de subir e descer: o foco volta no mesmo item depois de mover
  const setas = (lista, i, id, nome) => [
    botao('↑', `Subir ${nome}`, () => mover(lista, i, -1, id), { disabled: i === 0, 'data-foco': `sobe:${id}` }),
    botao('↓', `Descer ${nome}`, () => mover(lista, i, 1, id), { disabled: i === lista.length - 1, 'data-foco': `desce:${id}` })];

  // o mesmo campo no modo de edição: rótulo, tipo, mover e apagar
  function campoEdicao(s, c, i) {
    return mk('div', { class: 'sl-campo-ed', 'data-campo': c.id },
      mk('input', { class: 'sl-ed-rot', value: c.rotulo, maxlength: LIMITE.texto, placeholder: 'Sem rótulo', 'aria-label': 'Rótulo do campo', 'data-foco': `rot:${c.id}`,
        oninput: (e) => { c.rotulo = e.target.value; mudou(); } }),
      mk('select', { class: 'sl-ed-tipo', 'aria-label': `Tipo do campo ${c.rotulo || ''}`.trim(), 'data-foco': `tipo:${c.id}`,
        onchange: (e) => { c.tipo = e.target.value; mudou(`[data-foco="tipo:${c.id}"]`); } },
      TIPOS.map(([t, n]) => mk('option', { value: t, selected: t === c.tipo, text: n }))),
      setas(s.campos, i, c.id, 'campo'),
      botao('✕', 'Apagar campo', () => apagarCampo(s, c), { class: 'sl-ed-b perigo' }));
  }

  function secao(s, i) {
    const titulo = s.titulo || 'Seção sem nome';
    return mk('section', { class: 'sl-secao', 'data-secao': s.id, 'data-neon': true, 'aria-label': titulo },
      mk('h3', { class: 'sl-sec-tit', text: titulo }),
      mk('div', { class: 'sl-sec-ed' },
        mk('input', { class: 'sl-ed-titulo', value: s.titulo, maxlength: LIMITE.texto, placeholder: 'Nome da seção', 'aria-label': 'Nome da seção', 'data-foco': `tit:${s.id}`,
          oninput: (e) => { s.titulo = e.target.value; mudou(); } }),
        setas(layout.secoes, i, s.id, 'seção'),
        botao('✕', 'Apagar seção', () => apagarSecao(s), { class: 'sl-ed-b perigo' })),
      mk('div', { class: 'sl-campos' }, s.campos.map(campoJogo)),
      mk('div', { class: 'sl-campos-ed' }, s.campos.map((c, k) => campoEdicao(s, c, k)),
        mk('button', { type: 'button', class: 'btool sl-ed-mais', text: '＋ Campo', onclick: () => novoCampo(s) })),
      !s.campos.length ? mk('p', { class: 'sl-vazia', text: 'Seção sem campos. Em “Editar ficha”, use “＋ Campo”.' }) : null);
  }

  // redesenha as seções sem perder o que já foi digitado; foco = seletor pra devolver o foco
  function desenhar(foco) {
    const antes = {};
    secoesEl.querySelectorAll('[data-f]').forEach((f) => { antes[f.dataset.f] = f.type === 'checkbox' ? f.checked : f.value; });
    secoesEl.replaceChildren(...layout.secoes.map(secao));
    secoesEl.querySelectorAll('[data-f]').forEach((f) => {
      const v = antes[f.dataset.f];
      if (v === undefined) return;
      if (f.type === 'checkbox') f.checked = !!v; else f.value = v;
    });
    folha.classList.toggle('editando', editando);
    botaoEditar.textContent = editando ? '✓ Pronto' : '✎ Editar ficha';
    botaoEditar.setAttribute('aria-pressed', String(editando));
    lerCampos();
    if (window.__renderBadges) window.__renderBadges();
    if (foco) { const f = folha.querySelector(foco); if (f) f.focus(); }
  }

  // ---------- edição ----------
  // o modelo mudou: guarda no campo escondido e salva; com redesenho, refaz as seções (e devolve o foco)
  function mudou(redesenhar) {
    campoModelo.value = JSON.stringify(layout);
    scheduleSave();
    if (redesenhar) desenhar(typeof redesenhar === 'string' ? redesenhar : null);
  }
  function mover(lista, i, d, id) {
    const j = i + d;
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    mudou(true);
    // foco na mesma seta (ou na outra, se o item chegou na ponta)
    const sobe = folha.querySelector(`[data-foco="sobe:${id}"]`), desce = folha.querySelector(`[data-foco="desce:${id}"]`);
    const alvo = d < 0 ? (sobe.disabled ? desce : sobe) : (desce.disabled ? sobe : desce);
    if (alvo) alvo.focus();
  }
  const temValor = (c) => chavesDe(c).some((k) => {
    const f = secoesEl.querySelector(`[data-f="${CSS.escape(k)}"]`);
    return f && (f.type === 'checkbox' ? f.checked : String(f.value).trim() !== '');
  });
  // apaga também o valor guardado: senão ele fica na ficha salva pra sempre
  const esquecer = (c) => chavesDe(c).forEach((k) => { delete savedExtra[k]; });
  async function apagarCampo(s, c) {
    if (temValor(c) && !(await confirmar(`Apagar o campo “${c.rotulo || 'sem rótulo'}” e o que está escrito nele?`))) return;
    const i = s.campos.indexOf(c);
    s.campos.splice(i, 1); esquecer(c);
    const vizinho = s.campos[Math.min(i, s.campos.length - 1)];
    mudou(vizinho ? `[data-foco="rot:${vizinho.id}"]` : `[data-foco="tit:${s.id}"]`);
  }
  async function apagarSecao(s) {
    const cheia = s.campos.some(temValor);
    if (!(await confirmar(`Apagar a seção “${s.titulo || 'sem nome'}”${s.campos.length ? ` e os ${s.campos.length === 1 ? 'campo' : s.campos.length + ' campos'} dela` : ''}?${cheia ? ' O que está escrito neles some junto.' : ''}`))) return;
    const i = layout.secoes.indexOf(s);
    layout.secoes.splice(i, 1); s.campos.forEach(esquecer);
    const vizinha = layout.secoes[Math.min(i, layout.secoes.length - 1)];
    mudou(vizinha ? `[data-foco="tit:${vizinha.id}"]` : '.sl-nova-secao');
  }
  function novoCampo(s) {
    if (s.campos.length >= LIMITE.campos) return;
    const c = campo(novoId(), 'Novo campo', 'texto');
    s.campos.push(c);
    mudou(`[data-foco="rot:${c.id}"]`);
    const f = secoesEl.querySelector(`[data-foco="rot:${c.id}"]`); if (f) f.select();
  }
  function novaSecao() {
    if (layout.secoes.length >= LIMITE.secoes) return;
    const s = { id: novoId(), titulo: 'Nova seção', campos: [] };
    layout.secoes.push(s);
    s.campos.push(campo(novoId(), 'Novo campo', 'texto'));
    mudou(`[data-foco="tit:${s.id}"]`);
    const f = secoesEl.querySelector(`[data-foco="tit:${s.id}"]`);
    if (f) { f.select(); f.scrollIntoView({ block: 'nearest' }); }
  }
  function alternarEdicao() {
    editando = !editando;
    desenhar(editando ? '.sl-ed-titulo' : null);
  }

  // ---------- ligação com o núcleo (nucleo/ficha.js e persistência) ----------
  function usar(l) {
    layout = l;
    campoModelo.value = JSON.stringify(layout);
    desenhar();
  }
  registrarFicha('livre', {
    montar(dados) {
      folha = $('.sheet.livre');
      secoesEl = folha.querySelector('.sl-secoes');
      campoModelo = folha.querySelector('[data-f="__layout"]');
      botaoEditar = folha.querySelector('.sl-editar');
      botaoEditar.addEventListener('click', alternarEdicao);
      folha.querySelector('.sl-nova-secao').addEventListener('click', novaSecao);
      usar(ler(dados.__layout) || modelo());
    },
    // chegou outra ficha (a do player, quando o mestre abre): o modelo dela manda
    remontar(dados) {
      const l = ler(dados.__layout);
      editando = false;
      usar(l || modelo());
      if (!l) dados.__layout = campoModelo.value; // ficha sem modelo: fica com o modelo inicial
    },
  });
})();
