// livros: cada pessoa adiciona os PDFs que tem; eles ficam guardados só no aparelho dela (IndexedDB).
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
  function opcoes() {
    const sel = document.getElementById('lv-book');
    if (!sel) return;
    const v = sel.value;
    sel.replaceChildren(...Object.entries(LIVROS).map(([id, l]) => {
      const o = document.createElement('option');
      o.value = id; o.textContent = l.local ? l.nome : `${l.nome} (adicionar PDF)`;
      return o;
    }));
    sel.value = LIVROS[v] ? v : Object.keys(LIVROS)[0];
  }
  const registrar = (m) => { LIVROS[m.id] = { nome: m.nome, paginas: m.paginas, dim: m.dim, local: true }; };
  const metas = await op('meta', 'readonly', (s) => s.getAll()).catch(() => []);
  (metas || []).forEach(registrar);

  // ---------- adicionar / tirar PDFs ----------
  const arquivo = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/pdf,.pdf', multiple: true, hidden: true });
  document.body.append(arquivo);
  const hash = (t) => { let x = 0; for (const c of t) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x.toString(36); };
  async function adicionar(files) {
    const feitos = [];
    for (const f of files) {
      if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) { aviso(`“${f.name}” não é PDF.`); continue; }
      aviso(`Lendo “${f.name}”…`, true);
      try {
        const bytes = await f.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)), isEvalSupported: false }).promise;
        const n = doc.numPages;
        const v = (await doc.getPage(1)).getViewport({ scale: 1 });
        const id = CONHECIDOS[n] || `pdf-${n}-${hash(f.name)}`;
        const nome = (LIVROS[id] && CONHECIDOS[n]) ? LIVROS[id].nome : f.name.replace(/\.pdf$/i, '').slice(0, 60);
        const meta = { id, nome, paginas: n, dim: [Math.round(v.width), Math.round(v.height)] };
        await op('pdfs', 'readwrite', (s) => s.put({ id, bytes }));
        await op('meta', 'readwrite', (s) => s.put(meta));
        await op('idx', 'readwrite', (s) => s.delete(id)).catch(() => {});
        for (const k in prontas) if (k.startsWith(id + ':')) delete prontas[k];
        docs[id] = Promise.resolve(doc);
        registrar(meta);
        feitos.push(meta);
      } catch (e) {
        console.error(e);
        aviso(e && e.name === 'QuotaExceededError' ? 'Sem espaço no aparelho pra guardar esse PDF.' : `Não deu pra abrir “${f.name}”.`);
      }
    }
    if (!feitos.length) return;
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch { /* ok */ }
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
    if (['regras', 'jacket', 'red'].includes(id)) LIVROS[id].local = false; else delete LIVROS[id];
    opcoes();
    dispatchEvent(new CustomEvent('livros-mudaram', { detail: { ids: [id] } }));
  };
  arquivo.addEventListener('change', () => { const fs = [...arquivo.files]; arquivo.value = ''; adicionar(fs); });
  window.__livroEscolher = () => arquivo.click();

  // botões "＋ Adicionar PDF" e "Tirar" ao lado da lista de livros
  const sel = document.getElementById('lv-book');
  const bAdd = document.getElementById('lv-add'), bRem = document.getElementById('lv-rem');
  if (bAdd) bAdd.addEventListener('click', () => window.__livroEscolher());
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
      c.innerHTML = '<b></b><p>Os livros não vêm junto com o site. Adicione o seu PDF: ele fica guardado só neste aparelho (não vai pra internet).</p><button type="button" class="btool">＋ Adicionar PDF</button>';
      c.querySelector('button').addEventListener('click', () => window.__livroEscolher());
      v.prepend(c);
    }
    c.querySelector('b').textContent = `📖 ${LIVROS[b] ? LIVROS[b].nome : 'Livro'}`;
    c.hidden = !falta;
    v.classList.toggle('lv-semlivro', falta);
  };
  opcoes();
  dispatchEvent(new CustomEvent('livros-mudaram', { detail: { ids: Object.keys(LIVROS), inicio: true } }));
} catch (e) {
  console.error('leitor de PDF não carregou', e);
  window.__livroFail(e);
}
