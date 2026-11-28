// Modo escuro gerado: para cada regra de CSS que mexe em cor (fundo, texto, borda, sombra, fill/stroke)
// cria uma cópia com o prefixo `html.cpr-escuro`, trocando só as cores neutras — fundos claros viram
// escuros, textos escuros viram claros; vermelhos e cores fortes ficam como estão.
// (Porta exata do escuro.py original: o resultado tem que sair igual, byte a byte.)

const FUNDO = new Set(['background', 'background-color', 'background-image', 'box-shadow']);
const TEXTO = new Set(['color', 'fill', 'stroke', 'caret-color', 'text-decoration-color', '-webkit-text-fill-color']);
const BORDA = new Set(['border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-color',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'outline', 'outline-color', 'column-rule']);
const PROPS = new Set([...FUNDO, ...TEXTO, ...BORDA]);

// arredonda como o Python (meio a meio vai pro par)
function arredonda(v) {
  const f = Math.floor(v), d = v - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

// '%.3f' do Python, sem zeros no fim
function tresCasas(a) {
  let t = a.toFixed(3);
  const m = a * 2000; // empate exato na 4ª casa: o Python escolhe o par
  if (Number.isInteger(m) && m % 2 === 1) {
    const baixo = Math.floor(a * 1000) / 1000;
    const k = Math.round(baixo * 1000);
    t = ((k % 2 === 0 ? k : k + 1) / 1000).toFixed(3);
  }
  return t.replace(/0+$/, '').replace(/\.$/, '');
}

function hex(c) {
  c = c.slice(1);
  if (c.length === 3 || c.length === 4) c = [...c].map((x) => x + x).join('');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const a = c.length === 8 ? parseInt(c.slice(6, 8), 16) / 255 : 1;
  return [r, g, b, a];
}

function fmt(r, g, b, a) {
  [r, g, b] = [r, g, b].map((v) => Math.max(0, Math.min(255, arredonda(v))));
  if (a >= 0.999) return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  return `rgba(${r},${g},${b},${tresCasas(a)})`;
}

function trocar(r, g, b, a, tipo) {
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
  if (a === 0) return null;
  if (tipo === 'fundo') {
    if (L < 0.55 || (sat > 0.35 && L < 0.85)) return null;
    const nl = (0.118 + (1 - L) * 0.45) * 255, gl = L * 255, k = 0.55;
    return fmt(nl + (r - gl) * k, nl + (g - gl) * k, nl + (b - gl) * k, a);
  }
  if (tipo === 'texto') {
    if (sat > 0.25 || L >= 0.45) return null;
    const nl = (0.93 - L * 0.6) * 255;
    return fmt(nl, nl, nl, a);
  }
  if (tipo === 'borda') {
    if (sat > 0.25 || L < 0.75) return null;
    const nl = (0.16 + (1 - L) * 0.5) * 255;
    return fmt(nl, nl, nl, a);
  }
  return null;
}

const COR = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)|\b(?:white|black)\b/g;

function cores(valor, tipo) {
  // não mexe dentro de url(...)
  const partes = valor.split(/(url\((?:"[^"]*"|'[^']*'|[^)]*)\))/);
  let mudou = false;
  for (let i = 0; i < partes.length; i += 2) {
    partes[i] = partes[i].replace(COR, (t) => {
      let r, g, b, a;
      if (t === 'white') [r, g, b, a] = [255, 255, 255, 1];
      else if (t === 'black') [r, g, b, a] = [0, 0, 0, 1];
      else if (t.startsWith('#')) [r, g, b, a] = hex(t);
      else {
        const n = t.match(/[\d.]+/g).map(Number);
        [r, g, b] = n; a = n.length > 3 ? n[3] : 1;
      }
      const novo = trocar(r, g, b, a, tipo);
      if (novo === null) return t;
      mudou = true;
      return novo;
    });
  }
  return [partes.join(''), mudou];
}

const SEM_COMENTARIO = /\/\*[\s\S]*?\*\//g;

// divide em [prelúdio, corpo] no nível de cima, respeitando strings, comentários e chaves
function blocos(css) {
  const out = [], n = css.length;
  let i = 0, ini = 0;
  while (i < n) {
    const c = css[i];
    if (css.startsWith('/*', i)) { const j = css.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && css[j] !== c) j += css[j] === '\\' ? 2 : 1;
      i = j + 1; continue;
    }
    if (c === ';' && css.slice(ini, i).trim().startsWith('@')) { ini = i + 1; i += 1; continue; }
    if (c === '{') {
      const prel = css.slice(ini, i);
      let prof = 1, j = i + 1;
      while (j < n && prof) {
        const d = css[j];
        if (css.startsWith('/*', j)) { const k = css.indexOf('*/', j + 2); j = k < 0 ? n : k + 2; continue; }
        if (d === '"' || d === "'") {
          let k = j + 1;
          while (k < n && css[k] !== d) k += css[k] === '\\' ? 2 : 1;
          j = k + 1; continue;
        }
        if (d === '{') prof += 1;
        else if (d === '}') prof -= 1;
        j += 1;
      }
      out.push([prel.replace(SEM_COMENTARIO, '').trim(), css.slice(i + 1, j - 1)]);
      ini = i = j; continue;
    }
    i += 1;
  }
  return out;
}

function decls(corpo) {
  const out = [];
  let prof = 0, aspas = null, ini = 0;
  for (let i = 0; i < corpo.length; i++) {
    const c = corpo[i];
    if (aspas) { if (c === aspas) aspas = null; continue; }
    if (c === '"' || c === "'") aspas = c;
    else if (c === '(') prof += 1;
    else if (c === ')') prof -= 1;
    else if (c === ';' && prof === 0) { out.push(corpo.slice(ini, i)); ini = i + 1; }
  }
  out.push(corpo.slice(ini));
  return out.filter((d) => d.includes(':') && d.trim()).map((d) => d.trim());
}

function virgulas(sel) {
  const out = [];
  let prof = 0, ini = 0;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === '(' || c === '[') prof += 1;
    else if (c === ')' || c === ']') prof -= 1;
    else if (c === ',' && prof === 0) { out.push(sel.slice(ini, i)); ini = i + 1; }
  }
  out.push(sel.slice(ini));
  return out.map((x) => x.trim()).filter(Boolean);
}

function prefixo(sel) {
  return virgulas(sel).map((s) => {
    if (s.startsWith(':root')) return 'html.cpr-escuro' + s.slice(5);
    if (/^html(?![\w-])/.test(s)) return 'html.cpr-escuro' + s.slice(4);
    return 'html.cpr-escuro ' + s;
  }).join(',');
}

const tipoDe = (prop) => (FUNDO.has(prop) ? 'fundo' : TEXTO.has(prop) ? 'texto' : 'borda');

export function converter(css) {
  const saida = [];
  for (const [prel, corpo] of blocos(css)) {
    if (prel.startsWith('@')) {
      const nome = prel.split(/\s+/)[0].toLowerCase();
      if ((nome === '@media' || nome === '@supports') && !prel.toLowerCase().includes('print')) {
        const dentro = converter(corpo);
        if (dentro) saida.push(prel + '{' + dentro + '}');
      }
      continue;
    }
    const ds = [];
    for (const d of decls(corpo)) {
      const k = d.indexOf(':');
      const prop = d.slice(0, k).trim().toLowerCase(), val = d.slice(k + 1);
      if (!PROPS.has(prop)) continue;
      const [novo] = cores(val, tipoDe(prop));
      ds.push(prop + ':' + novo.trim());
    }
    if (ds.length) saida.push(prefixo(prel) + '{' + ds.join(';') + '}');
  }
  return saida.join('');
}

// o bloco <style> do modo escuro, a partir de todo o CSS da página
export function blocoEscuro(html, ajustes = '') {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('');
  return '<style id="cpr-escuro-css">@media screen{' + converter(css) + ajustes + '}</style>';
}
