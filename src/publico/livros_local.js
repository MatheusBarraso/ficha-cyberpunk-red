// livros: o mestre adiciona os PDFs e compartilha com a mesa; o player vê os da mesa. Ficam guardados só no aparelho (IndexedDB).
// As páginas são desenhadas na hora (letra nítida em qualquer zoom), com texto selecionável e busca.
try {
  const pdfjsLib = await import('./lib/pdf.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('./lib/pdf.worker.js', location.href).href;
  // livros que a ficha já conhece (pelo número de páginas): as marcações salvas continuam valendo
  const CONHECIDOS = { 71: 'regras', 62: 'jacket', 458: 'red' };
  const LARGURA = 1600;

  // ---------- banco local ----------
  const banco = new Promise((res, rej) => {
    const r = indexedDB.open('cpr-livros', 1);
    r.onupgradeneeded = () => { const d = r.result; ['meta', 'pdfs', 'idx'].forEach((n) => d.objectStoreNames.contains(n) || d.createObjectStore(n, { keyPath: 'id' })); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  async function op(nome, modo, fn) {
    const d = await banco;
    return new Promise((res, rej) => {
      const t = d.transaction(nome, modo);
      const q = fn(t.objectStore(nome));
      t.oncomplete = () => res(q && q.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error('abortado'));
    });
  }

  const docs = {}, prontas = {}, andamento = {};
  let fila = Promise.resolve(); // desenha uma página por vez (poupa memória no celular)
  const temLocal = (b) => !!(LIVROS[b] && LIVROS[b].local);
  const getDoc = (b) => docs[b] || (docs[b] = op('pdfs', 'readonly', (s) => s.get(b)).then((r) => {
    if (!r) throw new Error('sem-pdf');
    return pdfjsLib.getDocument({ data: new Uint8Array(r.bytes), isEvalSupported: false }).promise;
  }).catch((e) => { delete docs[b]; throw e; }));

  async function desenhar(b, p) {
    const doc = await getDoc(b);
    const page = await doc.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: LARGURA / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    page.cleanup();
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
    canvas.width = canvas.height = 0;
    return URL.createObjectURL(blob);
  }
  window.__livroTexto = async (b, p, div) => {
    if (!temLocal(b)) throw new Error('sem-pdf');
    const doc = await getDoc(b);
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const textContentSource = await page.getTextContent();
    const tl = new pdfjsLib.TextLayer({ textContentSource, container: div, viewport });
    await tl.render();
    const fim = document.createElement('div'); fim.className = 'endOfContent'; div.append(fim);
    return viewport.width;
  };
  // índice de busca: tirado do próprio PDF na primeira busca e guardado no aparelho
  window.__livroIdxLoad = async (b) => {
    if (!temLocal(b)) return [];
    const salvo = await op('idx', 'readonly', (s) => s.get(b)).catch(() => null);
    if (salvo && salvo.p) return salvo.p;
    const doc = await getDoc(b);
    const p = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i);
      const tc = await pg.getTextContent();
      p.push(tc.items.map((x) => x.str).join(' ').replace(/\s+/g, ' ').trim());
      pg.cleanup();
    }
    op('idx', 'readwrite', (s) => s.put({ id: b, p })).catch(() => {});
    return p;
  };
  window.__livroReady({
    cached: (b, p) => prontas[b + ':' + p] || null,
    load(b, p) {
      const k = b + ':' + p;
      if (prontas[k]) return Promise.resolve(prontas[k]);
      if (andamento[k]) return andamento[k];
      if (!temLocal(b)) return Promise.reject(new Error('sem-pdf'));
      if (p < 1 || p > LIVROS[b].paginas) return Promise.reject(new Error('página fora do livro'));
      const tarefa = () => desenhar(b, p).then((u) => (prontas[k] = u));
      fila = fila.then(tarefa, tarefa);
      return (andamento[k] = fila.finally(() => { delete andamento[k]; }));
    },
  });

  // ---------- lista de livros ----------
  // só o mestre carrega livros; o player vê os que o mestre compartilhou com a mesa
  const ehMestre = () => {
    const c = window.__cmLivros; if (!c) return true; // sem Comunidade (arquivo offline): cada um usa os seus
    const sala = c.sala(); return sala ? !!sala.mestre : (c.papel && c.papel()) === 'mestre';
  };
  const naMesa = (id) => (window.__cmLivrosLista || []).some((x) => x.id === id);
  const visivel = (id) => { const l = LIVROS[id]; return !!l && (ehMestre() || !!l.mesa || (l.local && (l.origem === 'mesa' || naMesa(id)))); };
  function opcoes() {
    const sel = document.getElementById('lv-book');
    if (!sel) return;
    const v = sel.value;
    const ids = Object.keys(LIVROS).filter(visivel);
    if (!ids.length) { // player sem livro da mesa: o leitor mostra o aviso
      const o = document.createElement('option'); o.value = Object.keys(LIVROS)[0]; o.textContent = 'Nenhum livro na mesa';
      sel.replaceChildren(o); sel.value = o.value; return;
    }
    sel.replaceChildren(...ids.map((id) => {
      const l = LIVROS[id], o = document.createElement('option');
      o.value = id; o.textContent = l.local ? l.nome : l.mesa ? `${l.nome} (baixar da mesa)` : `${l.nome} (adicionar PDF)`;
      return o;
    }));
    sel.value = ids.includes(v) ? v : ids[0];
  }
  const registrar = (m) => { LIVROS[m.id] = { nome: m.nome, paginas: m.paginas, dim: m.dim, local: true, origem: m.origem }; };
  const metas = await op('meta', 'readonly', (s) => s.getAll()).catch(() => []);
  (metas || []).forEach(registrar);

  // ---------- adicionar / tirar PDFs ----------
  const arquivo = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/pdf,.pdf', multiple: true, hidden: true });
  document.body.append(arquivo);
  const hash = (t) => { let x = 0; for (const c of t) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x.toString(36); };
  async function guardar(bytes, nomeArq, forca) {
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)), isEvalSupported: false }).promise;
    const n = doc.numPages;
    const v = (await doc.getPage(1)).getViewport({ scale: 1 });
    const id = (forca && forca.id) || CONHECIDOS[n] || `pdf-${n}-${hash(nomeArq)}`;
    const nome = (forca && forca.nome) || ((LIVROS[id] && CONHECIDOS[n]) ? LIVROS[id].nome : nomeArq.replace(/\.pdf$/i, '').slice(0, 60));
    const meta = { id, nome, paginas: n, dim: [Math.round(v.width), Math.round(v.height)] };
    if (forca && forca.origem) meta.origem = forca.origem;
    await op('pdfs', 'readwrite', (s) => s.put({ id, bytes }));
    await op('meta', 'readwrite', (s) => s.put(meta));
    await op('idx', 'readwrite', (s) => s.delete(id)).catch(() => {});
    for (const k in prontas) if (k.startsWith(id + ':')) delete prontas[k];
    docs[id] = Promise.resolve(doc);
    const mesa = LIVROS[id] && LIVROS[id].mesa;
    registrar(meta);
    if (mesa) LIVROS[id].mesa = mesa;
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch { /* ok */ }
    return meta;
  }
  async function adicionar(files) {
    if (!ehMestre()) { aviso('Só o mestre carrega livros. Os que ele compartilhar com a mesa aparecem aqui.'); return; }
    const feitos = [];
    for (const f of files) {
      if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) { aviso(`“${f.name}” não é PDF.`); continue; }
      aviso(`Lendo “${f.name}”…`, true);
      try {
        feitos.push(await guardar(await f.arrayBuffer(), f.name));
      } catch (e) {
        console.error(e);
        aviso(e && e.name === 'QuotaExceededError' ? 'Sem espaço no aparelho pra guardar esse PDF.' : `Não deu pra abrir “${f.name}”.`);
      }
    }
    if (!feitos.length) return;
    opcoes();
    dispatchEvent(new CustomEvent('livros-mudaram', { detail: { ids: feitos.map((m) => m.id), abrir: feitos[0].id } }));
    aviso(feitos.length === 1 ? `“${feitos[0].nome}” adicionado (${feitos[0].paginas} páginas).` : `${feitos.length} livros adicionados.`);
  }
  window.__livroRemover = async (id) => {
    await op('pdfs', 'readwrite', (s) => s.delete(id));
    await op('meta', 'readwrite', (s) => s.delete(id));
    await op('idx', 'readwrite', (s) => s.delete(id)).catch(() => {});
    delete docs[id];
    for (const k in prontas) if (k.startsWith(id + ':')) delete prontas[k];
    if (['regras', 'jacket', 'red'].includes(id) || LIVROS[id].mesa) LIVROS[id].local = false; else delete LIVROS[id];
    opcoes();
    dispatchEvent(new CustomEvent('livros-mudaram', { detail: { ids: [id] } }));
  };
  arquivo.addEventListener('change', () => { const fs = [...arquivo.files]; arquivo.value = ''; adicionar(fs); });
  window.__livroEscolher = () => arquivo.click();

  // botões "＋ Adicionar PDF" e "Tirar" ao lado da lista de livros
  const sel = document.getElementById('lv-book');
  const bAdd = document.getElementById('lv-add'), bRem = document.getElementById('lv-rem');
  if (bAdd) bAdd.addEventListener('click', () => window.__livroEscolher());
  function botoesPapel() {
    const m = ehMestre();
    if (bAdd) bAdd.hidden = !m;
    if (bRem) bRem.textContent = m ? 'Tirar' : 'Apagar cópia';
  }
  if (bRem) bRem.addEventListener('click', async () => {
    const id = sel && sel.value, l = LIVROS[id];
    if (!l || !l.local) { aviso('Esse livro não está neste aparelho.'); return; }
    const ok = window.confirmar ? await window.confirmar(`Tirar “${l.nome}” deste aparelho? As marcações continuam salvas.`, 'Tirar') : true;
    if (ok) window.__livroRemover(id);
  });

  // ---------- aviso dentro do leitor quando o livro não está no aparelho ----------
  let tAviso = 0;
  function aviso(msg, fica) {
    const v = document.getElementById('lv-view');
    let a = document.getElementById('lv-msg');
    if (!a && v) { a = document.createElement('div'); a.id = 'lv-msg'; v.prepend(a); }
    if (!a) return;
    a.textContent = msg; a.hidden = false;
    clearTimeout(tAviso);
    if (!fica) tAviso = setTimeout(() => { a.hidden = true; }, 4000);
  }
  window.__livroAviso = (b) => {
    const v = document.getElementById('lv-view');
    if (!v) return;
    let c = document.getElementById('lv-falta');
    const falta = !temLocal(b);
    if (!c) {
      c = document.createElement('div'); c.id = 'lv-falta';
      c.innerHTML = '<b></b><p></p><div class="lv-falta-bts"><button type="button" class="btool lv-baixar">Baixar da mesa</button><button type="button" class="btool lv-addpdf">＋ Adicionar PDF</button></div>';
      c.querySelector('.lv-addpdf').addEventListener('click', () => window.__livroEscolher());
      c.querySelector('.lv-baixar').addEventListener('click', () => baixarDaMesa(c.dataset.livro));
      v.prepend(c);
    }
    const l = LIVROS[b], mesa = l && l.mesa, mestre = ehMestre();
    const sala = window.__cmLivros && window.__cmLivros.sala();
    const nenhum = !mestre && !Object.keys(LIVROS).some(visivel);
    c.dataset.livro = b;
    c.querySelector('b').textContent = nenhum ? 'Livros da mesa' : l ? l.nome : 'Livro';
    c.querySelector('p').textContent = mesa
      ? `O mestre compartilhou este livro com a mesa (${mb(mesa.tamanho)}). Depois de baixar, ele fica guardado neste aparelho.`
      : mestre ? 'Este livro não está neste aparelho. Adicione o PDF e use “Enviar pra mesa” pros jogadores verem.'
        : sala ? (nenhum ? 'O mestre ainda não compartilhou nenhum livro com a mesa.' : 'O mestre ainda não compartilhou este livro com a mesa.')
          : 'Os livros são carregados pelo mestre. Entre na sessão dele pela Comunidade pra ver.';
    c.querySelector('.lv-baixar').hidden = !mesa;
    c.querySelector('.lv-addpdf').hidden = !mestre;
    c.hidden = !falta;
    // o player não precisa clicar: o livro da mesa baixa sozinho na primeira vez que ele abre
    if (falta && mesa && !mestre && !tentados.has(b)) { tentados.add(b); baixarDaMesa(b); }
    v.classList.toggle('lv-semlivro', falta);
  };
  // ---------- livros da mesa (Comunidade): baixar, e o mestre envia ----------
  const mb = (n) => `${Math.max(0.1, (n || 0) / 1048576).toFixed(1).replace('.', ',')} MB`;
  let baixando = false;
  const tentados = new Set();
  async function baixarDaMesa(id) {
    const l = LIVROS[id], m = l && l.mesa;
    if (!m || baixando || !window.__cmLivros) return;
    baixando = true;
    try {
      aviso(`Baixando “${l.nome}”… 0%`, true);
      const bytes = await window.__cmLivros.baixar(m, (f) => aviso(`Baixando “${l.nome}”… ${Math.round(f * 100)}%`, true));
      aviso('Guardando no aparelho…', true);
      await guardar(bytes, l.nome, { id, nome: l.nome, origem: 'mesa' });
      opcoes();
      dispatchEvent(new CustomEvent('livros-mudaram', { detail: { ids: [id] } }));
      aviso(`“${l.nome}” pronto pra ler.`);
    } catch (e) {
      console.error(e);
      aviso(e && e.code === 'invalid_argument' ? 'Sem acesso: entre na sessão do mestre pra baixar.' : 'Não deu pra baixar agora. Confira a internet e tente de novo.');
    } finally { baixando = false; }
  }
  addEventListener('livros-mesa', () => {
    for (const k in LIVROS) if (LIVROS[k].mesa && !LIVROS[k].local && !(window.__cmLivrosLista || []).some((x) => x.id === k) && !['regras', 'jacket', 'red'].includes(k)) delete LIVROS[k];
    for (const k in LIVROS) delete LIVROS[k].mesa;
    for (const m of window.__cmLivrosLista || []) {
      if (!LIVROS[m.id]) LIVROS[m.id] = { nome: m.nome, paginas: m.paginas, dim: m.dim || [1000, 1400], local: false };
      LIVROS[m.id].mesa = m;
    }
    const antes = sel && sel.value;
    opcoes(); botaoMesa(); botoesPapel();
    if (sel && sel.value !== antes) sel.dispatchEvent(new Event('change')); // o livro aberto sumiu da lista: troca
    if (sel && window.__livroAviso) window.__livroAviso(sel.value);
  });
  addEventListener('cm-papel', () => dispatchEvent(new Event('livros-mesa')));
  const bMesa = document.getElementById('lv-mesa');
  function botaoMesa() {
    if (!bMesa) return;
    const sala = window.__cmLivros && window.__cmLivros.sala();
    const l = sel && LIVROS[sel.value];
    bMesa.hidden = !(sala && sala.mestre && l && (l.local || l.mesa));
    bMesa.textContent = l && l.mesa ? 'Tirar da mesa' : 'Enviar pra mesa';
  }
  if (sel) sel.addEventListener('change', botaoMesa);
  addEventListener('livros-mudaram', botaoMesa);
  if (bMesa) bMesa.addEventListener('click', async () => {
    const sala = window.__cmLivros && window.__cmLivros.sala();
    const id = sel.value, l = LIVROS[id];
    if (!sala || !sala.mestre || !l) return;
    const conf = (t, b) => (window.confirmar ? window.confirmar(t, b) : Promise.resolve(true));
    if (l.mesa) {
      if (!(await conf(`Tirar “${l.nome}” da sessão “${sala.nome}”? Quem já baixou continua com ele no aparelho.`, 'Tirar'))) return;
      try { await window.__cmLivros.tirar(id); aviso('Livro tirado da mesa.'); } catch { aviso('Não deu pra tirar agora.'); }
      return;
    }
    const r = await op('pdfs', 'readonly', (s) => s.get(id)).catch(() => null);
    if (!r) { aviso('Esse livro não está neste aparelho.'); return; }
    if (!(await conf(`Enviar “${l.nome}” (${mb(r.bytes.byteLength)}) pra sessão “${sala.nome}”? Só quem você aprovou nela consegue baixar.`, 'Enviar'))) return;
    bMesa.disabled = true;
    try {
      await window.__cmLivros.enviar({ id, nome: l.nome, paginas: l.paginas, dim: l.dim }, r.bytes, (f) => aviso(`Enviando “${l.nome}”… ${Math.round(f * 100)}%`, true));
      aviso(`“${l.nome}” está na mesa. Os jogadores já podem baixar.`);
    } catch (e) {
      console.error(e);
      aviso(e && e.code === 'quota_exceeded' ? 'O espaço gratuito do banco encheu.' : 'Não deu pra enviar agora. Tente de novo.');
    } finally { bMesa.disabled = false; }
  });
  if (window.__cmLivrosLista) dispatchEvent(new Event('livros-mesa'));
  opcoes(); botaoMesa(); botoesPapel();
  dispatchEvent(new CustomEvent('livros-mudaram', { detail: { ids: Object.keys(LIVROS), inicio: true } }));
  setTimeout(() => dispatchEvent(new Event('livros-mesa')), 0); // se o livro aberto não é da mesa (player), troca
} catch (e) {
  console.error('leitor de PDF não carregou', e);
  window.__livroFail(e);
}
