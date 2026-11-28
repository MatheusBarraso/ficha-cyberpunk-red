// Build do site: monta o index.html a partir de src/ e copia os arquivos de src/publico/.
//
//   node tools/build.mjs              gera o site na raiz do repositório (é de lá que o GitHub Pages serve)
//   node tools/build.mjs --conferir   não grava nada: falha se o site na raiz não bate com src/
//   node tools/build.mjs --saida DIR  gera em outra pasta
//
// Sem dependências: só Node 18+.
//
// Diretivas usadas em src/pagina.html (e dentro dos arquivos incluídos):
//   {{> caminho}}          conteúdo do arquivo src/caminho, como está
//   {{base64 caminho}}     o arquivo em base64 (fonte e imagens embutidas no CSS)
//   {{escuro caminho}}     o bloco <style> do modo escuro, gerado de todo o CSS da página + ajustes à mão
//   __CPR_BUILD__          vira a impressão digital desta versão (avisa quem está com a página velha aberta)

import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { blocoEscuro } from './escuro.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(RAIZ, 'src');
const PUBLICO = join(SRC, 'publico');
const args = process.argv.slice(2);
const conferir = args.includes('--conferir');
const saida = args.includes('--saida') ? resolve(args[args.indexOf('--saida') + 1])
  : conferir ? mkdtempSync(join(tmpdir(), 'sketcher-')) : RAIZ;

const usados = new Set();
function ler(caminho, binario = false) {
  const p = join(SRC, caminho);
  if (!existsSync(p)) throw new Error(`arquivo incluído não existe: src/${caminho}`);
  usados.add(caminho);
  return binario ? readFileSync(p) : readFileSync(p, 'utf8');
}

function expandir(texto, pilha = []) {
  const comInclusoes = texto.replace(/\{\{> ([^}]+)\}\}/g, (_, caminho) => {
    if (pilha.includes(caminho)) throw new Error(`inclusão circular: ${[...pilha, caminho].join(' → ')}`);
    return expandir(ler(caminho), [...pilha, caminho]);
  });
  return comInclusoes.replace(/\{\{base64 ([^}]+)\}\}/g, (_, caminho) => ler(caminho, true).toString('base64'));
}

// ---------- monta a página ----------
let html = expandir(ler('pagina.html'));

const escuro = html.match(/\{\{escuro ([^}]+)\}\}/);
if (escuro) html = html.replace(escuro[0], () => blocoEscuro(html.replace(escuro[0], ''), ler(escuro[1])));

const impressao = createHash('sha1').update(html, 'utf8').digest('hex').slice(0, 12);
html = html.replaceAll('__CPR_BUILD__', impressao);

// ---------- conferências ----------
const sobras = html.match(/\{\{(?:>|base64|escuro) [^}]+\}\}/);
if (sobras) throw new Error(`diretiva não resolvida: ${sobras[0]}`);
for (const [, attrs, codigo] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (/\bsrc=/.test(attrs) || /type="module"/.test(attrs) || !codigo.trim()) continue;
  try { new vm.Script(codigo, { filename: 'index.html' }); } catch (e) { throw new Error(`erro de sintaxe num <script>: ${e.message}\n${codigo.slice(0, 200)}`); }
}
JSON.parse(readFileSync(join(SRC, 'sistemas/cpr/ficha/campos.json'), 'utf8'));

// arquivos de src/ que ninguém inclui (fora de publico/) — provavelmente esquecidos
const todos = [];
(function andar(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (p !== PUBLICO) andar(p); } else todos.push(relative(SRC, p).split('\\').join('/'));
  }
})(SRC);
const soltos = todos.filter((p) => !usados.has(p) && p !== 'pagina.html' && !p.endsWith('.md'));
if (soltos.length) console.warn('aviso: arquivos em src/ que o build não usa:\n  ' + soltos.join('\n  '));

// ---------- grava ----------
mkdirSync(saida, { recursive: true });
writeFileSync(join(saida, 'index.html'), html);
cpSync(PUBLICO, saida, { recursive: true });
writeFileSync(join(saida, '.nojekyll'), '');

if (conferir) {
  const diferentes = [];
  (function comparar(dir) {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n), rel = relative(saida, p);
      if (statSync(p).isDirectory()) { comparar(p); continue; }
      const noRepo = join(RAIZ, rel);
      if (!existsSync(noRepo) || !readFileSync(noRepo).equals(readFileSync(p))) diferentes.push(rel);
    }
  })(saida);
  rmSync(saida, { recursive: true, force: true });
  if (diferentes.length) {
    console.error('O site na raiz está desatualizado em relação a src/. Rode `npm run build` e envie de novo:\n  ' + diferentes.join('\n  '));
    process.exit(1);
  }
  console.log('site em dia com src/ ✓');
} else {
  console.log(`site gerado em ${relative(process.cwd(), saida) || '.'} — index.html ${(html.length / 1024).toFixed(0)} KB, versão ${impressao}`);
}
