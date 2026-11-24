// Ponte Firebase: oferece pra Comunidade o mesmo jeito de ler/gravar dados que ela usa no Claude
// (window.claude.use('db' | 'user' | 'assets')), só que guardando tudo no Firestore do seu projeto.
const V = '10.12.2';
const pronto = window.__fbResolver;
const cfg = window.FIREBASE_CONFIG;
if (!cfg || !cfg.apiKey || /COLE/i.test(cfg.apiKey)) {
  window.__cmSemConfig = true;
  pronto(null);
} else {
  try {
    const [{ initializeApp }, A, F] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
    ]);
    const app = initializeApp(cfg);
    const auth = A.getAuth(app);
    const fs = F.initializeFirestore(app, { ignoreUndefinedProperties: true });

    // ---------- erros no formato que a Comunidade entende ----------
    const MAPA = { 'permission-denied': 'invalid_argument', 'invalid-argument': 'invalid_argument', 'resource-exhausted': 'resource_exhausted', unauthenticated: 'invalid_argument' };
    const erro = (e) => ({ code: MAPA[e && e.code] || (e && e.code) || 'unknown', message: e && e.message });
    const tenta = (p) => p.catch((e) => { throw erro(e); });

    // ---------- leituras / gravações ----------
    const meta = (m) => ({ fromCache: !!(m && m.fromCache), hasPendingWrites: !!(m && m.hasPendingWrites) });
    const snapDoc = (s) => ({ id: s.id, exists: s.exists(), data: () => s.data(), metadata: meta(s.metadata) });
    const snapQ = (s) => { const docs = s.docs.map(snapDoc); return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: meta(s.metadata) }; };
    function docRef(path) {
      const ref = F.doc(fs, path);
      return {
        id: ref.id, path,
        get: () => tenta(F.getDoc(ref)).then(snapDoc),
        set: (d) => tenta(F.setDoc(ref, d)),
        update: (d) => tenta(F.setDoc(ref, d, { merge: true })),
        delete: () => tenta(F.deleteDoc(ref)),
        onSnapshot: (next, falha) => F.onSnapshot(ref, (s) => next(snapDoc(s)), (e) => falha && falha(erro(e))),
        collection: (c) => colRef(path + '/' + c),
      };
    }
    function consulta(path, partes) {
      const q = () => (partes.length ? F.query(F.collection(fs, path), ...partes) : F.collection(fs, path));
      return {
        where: (f, op, v) => consulta(path, [...partes, F.where(f, op, v)]),
        orderBy: (f, dir = 'asc') => consulta(path, [...partes, F.orderBy(f, dir)]),
        limit: (n) => consulta(path, [...partes, F.limit(n)]),
        get: () => tenta(F.getDocs(q())).then(snapQ),
        onSnapshot: (next, falha) => F.onSnapshot(q(), (s) => next(snapQ(s)), (e) => falha && falha(erro(e))),
      };
    }
    function colRef(path) {
      return Object.assign(consulta(path, []), {
        path,
        doc: (id) => docRef(id ? path + '/' + id : F.doc(F.collection(fs, path)).path),
        add: async (d) => { const r = await tenta(F.addDoc(F.collection(fs, path), d)); return docRef(r.path); },
      });
    }
    const db = { doc: docRef, collection: colRef };

    // ---------- conta (login com Google) ----------
    const provedor = new A.GoogleAuthProvider();
    provedor.setCustomParameters({ prompt: 'select_account' });
    window.__cmLogin = async () => {
      try { await A.signInWithPopup(auth, provedor); location.reload(); }
      catch (e) {
        if (/popup-blocked|operation-not-supported/.test(e && e.code || '')) { try { sessionStorage.setItem('cpr-fb-redir', '1'); await A.signInWithRedirect(auth, provedor); return; } catch { /* segue */ } }
        if (/popup-closed|cancelled-popup/.test(e && e.code || '')) return;
        alertar(e && e.code === 'auth/unauthorized-domain'
          ? 'Este endereço ainda não foi autorizado no Firebase (Authentication → Configurações → Domínios autorizados).'
          : 'Não deu pra entrar com o Google agora. Tente de novo.');
      }
    };
    window.__cmLogout = async () => { try { await A.signOut(auth); } finally { location.reload(); } };
    // trocar de conta: sai e já abre a escolha de conta do Google
    window.__cmTrocarConta = async () => { try { await A.signOut(auth); } catch { /* ok */ } await window.__cmLogin(); location.reload(); };
    try { await A.getRedirectResult(auth); } catch { /* sem login pendente */ }
    const eu = await new Promise((res) => { const un = A.onAuthStateChanged(auth, (u) => { un(); res(u); }); });
    // voltou do login por redirecionamento sem entrar (Safari/Firefox bloqueiam esse caminho): avisa
    let voltouRedir = false; try { voltouRedir = sessionStorage.getItem('cpr-fb-redir') === '1'; sessionStorage.removeItem('cpr-fb-redir'); } catch { /* ok */ }
    if (voltouRedir && !eu) setTimeout(() => alertar('O navegador bloqueou a janela de login. Permita pop-ups para este site (ícone na barra de endereço) e toque em “Entrar com Google” de novo.'), 800);
    window.__cmConta = eu ? { nome: eu.displayName || '', email: eu.email || '', foto: eu.photoURL || '' } : null;
    if (eu) {
      // nome que os outros veem nos avisos e listas
      F.setDoc(F.doc(fs, 'usuarios/' + eu.uid), { nome: eu.displayName || (eu.email || '').split('@')[0] || 'Jogador', ts: Date.now() }, { merge: true }).catch(() => {});
    }
    const nomes = {};
    const user = {
      id: async () => (eu ? eu.uid : null),
      me: async () => (eu ? { id: eu.uid, name: eu.displayName || '' } : null),
      can: async () => !!eu,
      isOwner: async () => false,
      canEdit: async () => !!eu,
      profiles: async (ids) => {
        const out = {};
        await Promise.all(ids.map(async (id) => {
          if (!(id in nomes)) { try { const s = await F.getDoc(F.doc(fs, 'usuarios/' + id)); nomes[id] = s.exists() ? s.data().nome || '' : ''; } catch { nomes[id] = ''; } }
          out[id] = { name: nomes[id] };
        }));
        return out;
      },
    };

    // ---------- imagens: guardadas no próprio banco (até ~700 KB cada) ----------
    const LIMITE = 900000; // tamanho máximo do texto da imagem
    const lerUrl = (b) => new Promise((r, j) => { const f = new FileReader(); f.onload = () => r(f.result); f.onerror = j; f.readAsDataURL(b); });
    async function caber(blob) {
      let url = await lerUrl(blob);
      if (url.length <= LIMITE) return url;
      const bmp = await createImageBitmap(blob);
      let lado = Math.max(bmp.width, bmp.height), q = 0.8;
      for (let i = 0; i < 8 && url.length > LIMITE; i++) {
        lado = Math.round(lado * 0.8); q = Math.max(0.5, q - 0.05);
        const k = Math.min(1, lado / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        url = c.toDataURL('image/jpeg', q);
      }
      if (url.length > LIMITE) throw { code: 'quota_exceeded' };
      return url;
    }
    const assets = {
      upload: async (blob) => {
        if (!eu) throw { code: 'invalid_argument' };
        const url = await caber(blob);
        const ref = F.doc(F.collection(fs, 'assets'));
        await tenta(F.setDoc(ref, { dono: eu.uid, url, ts: Date.now() }));
        cacheImg[ref.id] = url;
        return { id: ref.id, url, sizeBytes: url.length, contentType: 'image/jpeg' };
      },
    };
    // imagens da cidade de exemplo vêm junto com o site
    const EXEMPLO = { d047cb35c00e6aebc7ce5a6dd96966ae: './exemplo/mapa-exemplo.jpg', '1a34a15bc70349e8ef3f881527c06630': './exemplo/npc-exemplo.jpg' };
    const cacheImg = {}, pedindo = {};
    const VAZIA = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    // enquanto a imagem chega, um marcador com o id; quando chega, troca em todo <img> que estiver esperando
    const espera = (id) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><!--cm:${id}--></svg>`);
    window.__cmCarregarImg = (id) => {
      if (!id) return VAZIA;
      if (EXEMPLO[id]) return EXEMPLO[id];
      if (/^(https?:|data:|\.\/)/.test(id)) return id;
      if (cacheImg[id]) return cacheImg[id];
      if (!pedindo[id] && eu) {
        pedindo[id] = F.getDoc(F.doc(fs, 'assets/' + id)).then((s) => {
          if (!s.exists()) return;
          cacheImg[id] = s.data().url;
          const marca = espera(id);
          document.querySelectorAll('img').forEach((im) => { if (im.getAttribute('src') === marca) im.src = cacheImg[id]; });
          dispatchEvent(new Event('cm-asset'));
        }).catch(() => {});
      }
      return espera(id);
    };
    window.__cmFbApi = { db, user, assets: eu ? assets : null };
    pronto(window.__cmFbApi);
  } catch (e) {
    console.error('Firebase não carregou', e);
    pronto(null);
  }
}
function alertar(msg) {
  const d = document.createElement('div');
  d.className = 'cm-toast'; d.setAttribute('role', 'alert');
  d.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:9999;max-width:min(92vw,460px)';
  const caixa = document.createElement('div'), t = document.createElement('b'), m = document.createElement('span');
  t.textContent = 'Login'; m.textContent = msg; caixa.append(t, m); d.append(caixa); d.onclick = () => d.remove();
  document.body.append(d); setTimeout(() => d.remove(), 9000);
}
