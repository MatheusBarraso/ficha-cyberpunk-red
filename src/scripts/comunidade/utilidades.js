  // ---------- utilidades ----------
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'style') e.style.cssText = v;
      else if (k === 'value') e.value = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    // em linhas de detalhes, cada texto vira um item (senão os pedaços grudam)
    const solto = !!(props && props.class && /\bcm-meta\b/.test(props.class));
    for (const c of kids.flat(3)) if (c != null && c !== false) e.append(c.nodeType ? c : solto ? Object.assign(document.createElement('span'), { textContent: String(c) }) : String(c));
    return e;
  }
  // troca o conteúdo ignorando vazios (null/false)
  function rc(el, ...k) { el.replaceChildren(...k.flat(3).filter((x) => x != null && x !== false)); }
  const btn = (txt, on, cls = '', desligado = false) => h('button', { type: 'button', class: `cm-btn ${cls}`, text: txt, onclick: on, disabled: !!desligado });
  const agora = () => Date.now();
  function quando(ts) {
    if (!ts) return '';
    const s = Math.round((agora() - ts) / 1000);
    if (s < 60) return 'agora';
    if (s < 3600) return `há ${Math.round(s / 60)} min`;
    if (s < 86400) return `há ${Math.round(s / 3600)} h`;
    if (s < 86400 * 7) return `há ${Math.round(s / 86400)} d`;
    return new Date(ts).toLocaleDateString('pt-BR');
  }
  const iniciais = (t) => (t || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase() || '?';
  const FB = !!window.__cmFirebase; // hospedado no GitHub + Firebase (sem o Claude)
  const imgSrc = (id) => (window.__cmBlob && window.__cmBlob[id]) || (window.__cmCarregarImg ? window.__cmCarregarImg(id) : '/_blob/' + encodeURIComponent(id));
  function avatar(txt, img, cls = 'cm-av') {
    const a = h('div', { class: cls });
    if (img) a.append(h('img', { src: imgSrc(img), alt: '' })); else a.textContent = iniciais(txt);
    return a;
  }
  const norm = (t) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const corte = (t, n) => { t = (t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
  const byId = (lista, id) => lista.find((x) => x.id === id);
  const npcDe = (id) => byId(S.d.npcs, id);
  const npcNome = (id) => (npcDe(id) && npcDe(id).nome) || 'NPC';
  const localDe = (id) => byId(S.d.locais, id);

  function nome(uid) {
    if (!uid) return 'Alguém';
    const p = S.d.perfis[uid];
    return (p && p.apelido) || S.nomes[uid] || 'Alguém';
  }
  const spanNome = (uid) => h('span', { class: 'cm-nome', 'data-uid': uid || '', text: nome(uid) });
  let resolvendo = false;
  async function resolverNomes() {
    if (resolvendo || !S.user || !S.user.profiles) return;
    const ids = [...new Set([...document.querySelectorAll('#comu [data-uid], .cm-toasts [data-uid]')].map((e) => e.dataset.uid))].filter((id) => id && !(id in S.nomes));
    if (!ids.length) return;
    resolvendo = true;
    try { const ps = await S.user.profiles(ids); for (const id of ids) S.nomes[id] = (ps && ps[id] && ps[id].name) || ''; } catch { for (const id of ids) S.nomes[id] = ''; }
    resolvendo = false;
    document.querySelectorAll('#comu [data-uid], .cm-toasts [data-uid]').forEach((e) => { e.textContent = nome(e.dataset.uid); });
  }

