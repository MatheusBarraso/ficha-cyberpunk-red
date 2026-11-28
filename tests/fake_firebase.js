// Firebase falso pra testes: mesma API modular usada em fb.js, dados no localStorage,
// e as regras de firestore.rules reproduzidas em JS (pra pegar fluxos que o servidor recusaria).
const W = window;
if (!W.__FAKE) {
  const u = (location.hash.match(/u=(\w+)/) || [])[1] || null;
  const NAMES = { gm: 'Matheus Mestre', p1: 'Ana Jogadora', p2: 'Beto', x: 'Intruso' };
  const _g = Storage.prototype.getItem, _s = Storage.prototype.setItem, _r = Storage.prototype.removeItem;
  const solo = /solo=1/.test(location.hash); // um aparelho de uma pessoa só: sem prefixo nas chaves (igual ao site de verdade)
  const pre = (st, k) => (!solo && st === localStorage && (String(k).startsWith('cpr-com') || String(k).startsWith('cpr-ficha')) ? (u || 'anon') + ':' + k : k);
  Storage.prototype.getItem = function (k) { return _g.call(this, pre(this, k)); };
  Storage.prototype.setItem = function (k, v) { return _s.call(this, pre(this, k), v); };
  Storage.prototype.removeItem = function (k) { return _r.call(this, pre(this, k)); };
  const KEY = 'fakefs';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const F = W.__FAKE = { store: load(), subs: new Set(), negados: [], user: null, logado: sessionStorage.getItem('fake-login') === '1' || /login=1/.test(location.hash) };
  F.user = u && F.logado ? { uid: u, displayName: NAMES[u] || u, email: u + '@x' } : null;
  F.save = () => { localStorage.setItem(KEY, JSON.stringify(F.store)); F.subs.forEach((f) => f()); };
  addEventListener('storage', (e) => { if (e.key === KEY) { F.store = load(); F.subs.forEach((f) => f()); } });
  F.u0 = u;
  // o mestre dos testes antigos já digitou a senha (u=m2 testa a tela de senha)
  if (!/semchave/.test(location.hash) && !F.store['chaves/gm']) { F.store['chaves/gm'] = { senha: '999', ts: 1 }; localStorage.setItem(KEY, JSON.stringify(F.store)); }
}
const F = W.__FAKE;
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const segs = (p) => p.split('/');
const parent = (p) => segs(p).slice(0, -1).join('/');
let n = 0; const nid = () => 'f' + Date.now().toString(36) + (n++) + Math.random().toString(36).slice(2, 6);

// ---------- regras (transcritas de firestore.rules) ----------
const D = () => F.store;
const uidAtual = () => (F.user ? F.user.uid : null);
function liberado(gm, sid) {
  const me = uidAtual(); if (!me) return false;
  if (me === gm) return true;
  const s = D()[`mestres/${gm}/sessoes/${sid}`]; if (!s) return false;
  if (s.encerrada === true) return false;
  const m = D()[`mestres/${gm}/sessoes/${sid}/membros/${me}`];
  const estado = m ? m.estado : 'nenhum';
  if (estado === 'aprovado') return true;
  const p = D()[`mestres/${gm}/sessoes/${sid}/pedidos/${me}`];
  return estado === 'nenhum' && s.aprovacao === 'automatica' && !!p && p.cancelado !== true && (s.codigosAceitos || []).includes(p.codigo || '');
}
const gmDe = (sid) => (D()['sessoes/' + sid] || {}).gm;
const membroSala = (sid) => !!uidAtual() && !!D()['sessoes/' + sid] && liberado(gmDe(sid), sid);
const mestreOk = () => !!uidAtual() && !!D()['chaves/' + uidAtual()];
const SENHA = '999'; // no servidor de verdade só existe o hash
const gmSala = (sid) => !!uidAtual() && !!D()['sessoes/' + sid] && gmDe(sid) === uidAtual() && mestreOk();
function pode(op, path, novo) {
  // op: get | list | create | update | delete
  const me = uidAtual(); if (!me) return false;
  const s = segs(path), old = D()[path];
  const leitura = op === 'get' || op === 'list';
  const autorNovo = () => novo && novo.autor === me;
  const autorAtual = () => old && old.autor === me;
  const [c0, a, c1, b, c2, c, c3] = s;
  if (c0 === 'usuarios' && s.length === 2) return op === 'get' || (!leitura && op !== 'delete' && a === me);
  if (c0 === 'perfis' && s.length === 2) return leitura || a === me;
  if (c0 === 'pedidos' && s.length === 2) return a === me;
  if (c0 === 'assets' && s.length === 2) return op === 'get' || (op === 'create' && novo.dono === me && novo.url.length < 1000000) || (op === 'delete' && old && old.dono === me);
  if (c0 === 'data' && a === 'users') return c1 === me;
  if (c0 === 'chaves' && s.length === 2) return a === me && (op === 'get' || ((op === 'create' || op === 'update') && Object.keys(novo).every((k) => k === 'senha' || k === 'ts') && novo.senha === SENHA));
  if (c0 === 'convites' && s.length === 2) return op === 'get' || (op === 'create' && mestreOk() && novo.gm === me && /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(a)) || ((op === 'update' || op === 'delete') && old && old.gm === me);
  if (c0 === 'mestres' && c1 === 'sessoes') {
    const gm = a, sid = b;
    if (s.length === 4) return op === 'get' || (op === 'list' && gm === me) || (!leitura && mestreOk() && gm === me && (op === 'delete' || novo.gm === me));
    if (s.length === 6 && c2 === 'membros') return leitura || (gm === me && mestreOk());
    if (s.length === 6 && c2 === 'pedidos' && (leitura || (c === me && c !== gm))) return true;
    if (s.length === 6) return leitura ? liberado(gm, sid) : (gm === me && mestreOk());
    return false;
  }
  if (c0 === 'sessoes') {
    const sid = a;
    if (s.length === 2) return op === 'get' || (op === 'create' && mestreOk() && novo.gm === me && !!D()[`mestres/${me}/sessoes/${sid}`]) || ((op === 'update' || op === 'delete') && old && old.gm === me);
    const col = c1, id = b;
    if (s.length === 4 && col === 'quadro') {
      if (leitura) return membroSala(sid);
      if (op === 'delete') return autorAtual() || gmSala(sid);
      if (op === 'create') return membroSala(sid) && autorNovo() && ['texto', 'imagem', 'traco'].includes(novo.tipo);
      if (op === 'update') return membroSala(sid) && (autorAtual() || gmSala(sid)) && novo.autor === old.autor && novo.tipo === old.tipo;
      return false;
    }
    if (s.length === 4 && ['mural', 'comentarios', 'descobertas', 'aceites'].includes(col)) {
      if (leitura) return membroSala(sid);
      if (op === 'delete') return autorAtual() || gmSala(sid);
      if (col === 'mural' && op === 'update') {
        const ks = new Set([...Object.keys(novo), ...Object.keys(old || {})].filter((k) => JSON.stringify(novo[k]) !== JSON.stringify((old || {})[k])));
        const rs = new Set([...Object.keys(novo.reacoes || {}), ...Object.keys((old || {}).reacoes || {})].filter((k) => JSON.stringify((novo.reacoes || {})[k]) !== JSON.stringify(((old || {}).reacoes || {})[k])));
        return membroSala(sid) && [...ks].every((k) => k === 'reacoes') && [...rs].every((k) => k === me);
      }
      if (col === 'aceites') return membroSala(sid) && autorNovo() && id === novo.missao + '_' + me;
      if (col === 'mural' && op === 'create') return membroSala(sid) && autorNovo() && (gmSala(sid) || ((novo.mestre ?? null) === null && (novo.npc ?? null) === null));
      if (op === 'create') return membroSala(sid) && autorNovo();
      return false;
    }
    if (col === 'conversas') {
      if (s.length === 4) {
        if (op === 'list') return gmSala(sid);
        return (id === me && membroSala(sid)) || gmSala(sid);
      }
      if (s.length === 6 && c2 === 'msgs') {
        if (leitura) return (id === me && membroSala(sid)) || gmSala(sid);
        if (op === 'create') return (id === me && membroSala(sid) && autorNovo() && novo.de === 'jogador') || gmSala(sid);
        if (op === 'delete') return gmSala(sid);
        return false;
      }
    }
    if (col === 'fichas' && s.length === 4) {
      if (op === 'get') return (id === me && membroSala(sid)) || gmSala(sid);
      if (op === 'list') return gmSala(sid);
      if (op === 'delete') return false;
      return novo.por === me && ((id === me && membroSala(sid)) || gmSala(sid));
    }
    if (col === 'alertas' && s.length === 4) {
      if (leitura) return membroSala(sid);
      if (op === 'create') return gmSala(sid) && novo.autor === me;
      if (op === 'delete') return gmSala(sid);
      return false;
    }
    if (col === 'ataques' && s.length === 4) {
      if (op === 'get') return (old && old.alvo === me && membroSala(sid)) || gmSala(sid);
      if (op === 'list') return gmSala(sid) || membroSala(sid); // no servidor: só com where alvo == eu
      if (op === 'create' || op === 'delete') return gmSala(sid);
      if (op === 'update') {
        if (gmSala(sid)) return true;
        const ks = [...new Set([...Object.keys(novo), ...Object.keys(old || {})])].filter((k) => JSON.stringify(novo[k]) !== JSON.stringify((old || {})[k]));
        return !!old && old.alvo === me && membroSala(sid) && old.estado === 'pendente' && ['aceito', 'contestado'].includes(novo.estado) && ks.every((k) => k === 'estado' || k === 'respTs');
      }
    }
    if (col === 'denuncias' && s.length === 4) {
      if (op === 'get') return id === me || gmSala(sid);
      if (op === 'list') return gmSala(sid);
      return (id === me && membroSala(sid)) || gmSala(sid);
    }
  }
  return false;
}
function checar(op, path, novo) {
  if (!pode(op, path, novo)) {
    F.negados.push(op + ' ' + path + ' as ' + uidAtual());
    const e = new Error('Missing or insufficient permissions.'); e.code = 'permission-denied'; throw e;
  }
}

// ---------- app / auth ----------
export const initializeApp = (cfg) => ({ cfg });
export const getAuth = () => ({});
export class GoogleAuthProvider { setCustomParameters() {} }
export const getRedirectResult = async () => null;
export const onAuthStateChanged = (auth, cb) => { setTimeout(() => cb(F.user), 5); return () => {}; };
export const signInWithPopup = async () => { sessionStorage.setItem('fake-login', '1'); F.user = { uid: F.u0, displayName: F.u0 }; };
export const signInWithRedirect = signInWithPopup;
export const signOut = async () => { sessionStorage.removeItem('fake-login'); F.user = null; };

// ---------- firestore ----------
export const initializeFirestore = () => ({});
export function doc(base, path) {
  if (base && base.type === 'col' && path === undefined) return { type: 'doc', path: base.path + '/' + nid(), get id() { return segs(this.path).pop(); } };
  const p = base && base.type === 'col' ? base.path + '/' + path : path;
  if (segs(p).length % 2) throw new Error('doc parity ' + p);
  return { type: 'doc', path: p, id: segs(p).pop() };
}
export function collection(base, path) {
  const p = base && base.type === 'doc' ? base.path + '/' + path : path;
  if (segs(p).length % 2 === 0) throw new Error('col parity ' + p);
  return { type: 'col', path: p };
}
export const where = (f, op, v) => ({ k: 'where', f, op, v });
export const orderBy = (f, dir = 'asc') => ({ k: 'orderBy', f, dir });
export const limit = (n) => ({ k: 'limit', n });
export const query = (c, ...parts) => ({ type: 'q', path: c.path, parts });
const meta = { fromCache: false, hasPendingWrites: false };
const snapD = (path) => { const d = D()[path]; return { id: segs(path).pop(), exists: () => d !== undefined, data: () => clone(d), metadata: meta }; };
function rodar(q) {
  const parts = q.parts || [];
  let ds = Object.keys(D()).filter((p) => parent(p) === q.path).map(snapD);
  for (const w of parts.filter((x) => x.k === 'where')) ds = ds.filter((d) => { const x = d.data()[w.f]; return w.op === '==' ? x === w.v : w.op === '!=' ? x !== w.v : true; });
  const o = parts.find((x) => x.k === 'orderBy');
  if (o) ds = ds.filter((d) => d.data()[o.f] !== undefined).sort((a, b) => { const x = a.data()[o.f], y = b.data()[o.f]; return (x < y ? -1 : x > y ? 1 : 0) * (o.dir === 'desc' ? -1 : 1); });
  const l = parts.find((x) => x.k === 'limit'); if (l) ds = ds.slice(0, l.n);
  return { docs: ds, metadata: meta };
}
const tarde = () => new Promise((r) => setTimeout(r, 5));
export async function getDoc(r) { await tarde(); checar('get', r.path); return snapD(r.path); }
export async function getDocs(q) { await tarde(); checar('list', q.path + '/__x'); return rodar(q); }
function fundir(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') fundir(a[k], b[k]); else a[k] = b[k]; } return a; }
const semUndef = (d) => JSON.parse(JSON.stringify(d));
export async function setDoc(r, d, o) {
  await tarde();
  const old = D()[r.path];
  const novo = o && o.merge && old ? fundir(clone(old), semUndef(d)) : semUndef(d);
  checar(old === undefined ? 'create' : 'update', r.path, novo);
  D()[r.path] = novo; F.save();
}
export async function addDoc(c, d) { const r = doc(c); await setDoc(r, d); return r; }
export async function deleteDoc(r) { await tarde(); if (D()[r.path] === undefined) return; checar('delete', r.path); delete D()[r.path]; F.save(); }
export function onSnapshot(r, next, err) {
  let last, morto = false;
  const f = () => {
    if (morto) return;
    try {
      if (r.type === 'doc') { checar('get', r.path); const s = JSON.stringify(D()[r.path]) || '∅'; if (s !== last) { last = s; next(snapD(r.path)); } }
      else { checar('list', r.path + '/__x'); const q = r.type === 'q' ? r : { path: r.path, parts: [] }; const res = rodar(q); const s = JSON.stringify(res.docs.map((d) => [d.id, d.data()])); if (s !== last) { last = s; next(res); } }
    } catch (e) { morto = true; F.subs.delete(f); if (err) err(e); }
  };
  F.subs.add(f); setTimeout(f, 10);
  return () => { morto = true; F.subs.delete(f); };
}
