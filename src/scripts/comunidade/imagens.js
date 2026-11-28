  // ---------- imagens (mestre) ----------
  async function reduzir(file, max) {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return file;
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
  }
  async function enviarImagem(file, max = 1600) {
    if (!S.assets) throw { code: 'invalid_argument' };
    const r = await S.assets.upload(await reduzir(file, max));
    return r.id;
  }
  function campoImagem(atual, rotulo = 'Imagem') {
    let id = atual || null;
    const prev = h('div', { class: 'cm-row' });
    const pinta = () => { rc(prev, id ? h('img', { src: imgSrc(id), alt: '', style: 'max-width:120px;max-height:90px;border:2px solid var(--red)' }) : h('span', { class: 'cm-sub', text: 'sem imagem' }), id ? btn('Tirar', () => { id = null; pinta(); }, 'cm-mini cm-perigo') : null); };
    const inp = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    const st = h('span', { class: 'cm-sub' });
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      st.textContent = 'Enviando…';
      try { id = await enviarImagem(f); st.textContent = ''; pinta(); } catch (e) { st.textContent = ''; falhou(e); }
      inp.value = '';
    });
    pinta();
    const el = h('div', { class: 'cm-lbl' }, rotulo, prev, h('div', { class: 'cm-row' }, btn('Escolher imagem', () => inp.click(), 'cm-mini'), st, inp));
    return { el, valor: () => id };
  }

