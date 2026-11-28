// Sketcher — app do Electron (até a versão 1.0 se chamava Ficha Cyberpunk RED).
// Abre o site online numa janela própria: cada versão nova do site já aparece no app, sem reinstalar.
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const SITE = 'https://matheusbarraso.github.io/sketcher/';
// o endereço de antes do nome Sketcher: os dois são do site, e se um não existir (404) o app abre o outro
const SITE_ANTIGO = 'https://matheusbarraso.github.io/ficha-cyberpunk-red/';
const PASTAS = ['/sketcher/', '/ficha-cyberpunk-red/'];
// os dados (fichas, anotações) ficam na pasta do app: continua a mesma de quando ele se chamava Ficha Cyberpunk RED
app.setPath('userData', path.join(app.getPath('appData'), 'Ficha Cyberpunk RED'));
// login com o Google (Firebase): precisa abrir dentro do app pra voltar logado
const LOGIN = [
  /^https:\/\/accounts\.google\.com\//,
  /^https:\/\/accounts\.youtube\.com\//,
  /^https:\/\/[a-z0-9-]+\.firebaseapp\.com\//,
  /^https:\/\/[a-z0-9-]+\.web\.app\//,
  /^https:\/\/apis\.google\.com\//,
  /^https:\/\/www\.google\.com\/recaptcha\//,
];
const doSite = (url) => {
  try { const u = new URL(url); return u.origin === new URL(SITE).origin && PASTAS.some((p) => u.pathname === p.slice(0, -1) || u.pathname.startsWith(p)); } catch { return false; }
};
const ehLogin = (url) => LOGIN.some((r) => r.test(url));

// o Google recusa login em "navegador embutido": o app se apresenta como um Chrome comum
app.userAgentFallback = app.userAgentFallback
  .replace(/\sElectron\/\S+/i, '')
  .replace(/\s(?:sketcher|ficha-cyberpunk-red)\/\S+/i, '')
  .replace(/\s(?:Sketcher|Ficha Cyberpunk RED)\/\S+/i, '');

if (!app.requestSingleInstanceLock()) { app.quit(); }

// lembra tamanho e posição da janela
const ARQ_JANELA = () => path.join(app.getPath('userData'), 'janela.json');
function lerJanela() { try { return JSON.parse(fs.readFileSync(ARQ_JANELA(), 'utf8')); } catch { return {}; } }
function gravarJanela(win) {
  try {
    const b = win.getNormalBounds();
    fs.writeFileSync(ARQ_JANELA(), JSON.stringify({ ...b, max: win.isMaximized(), cheia: win.isFullScreen() }));
  } catch { /* ok */ }
}

let principal = null;

function criarJanela() {
  const j = lerJanela();
  const win = new BrowserWindow({
    width: j.width || 1366, height: j.height || 860, x: j.x, y: j.y,
    minWidth: 360, minHeight: 480,
    backgroundColor: '#0b0b0d',
    title: 'Sketcher',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: false },
  });
  principal = win;
  if (j.max) win.maximize();
  if (j.cheia) win.setFullScreen(true);
  win.once('ready-to-show', () => win.show());
  win.on('close', () => gravarJanela(win));

  // links de fora (livros, YouTube, GitHub...) abrem no navegador do computador
  win.webContents.on('will-navigate', (e, url) => {
    if (doSite(url) || ehLogin(url) || url.startsWith('file:')) return;
    e.preventDefault(); shell.openExternal(url);
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (ehLogin(url) || url === 'about:blank') {
      return { action: 'allow', overrideBrowserWindowOptions: { width: 520, height: 680, parent: win, autoHideMenuBar: true, backgroundColor: '#ffffff' } };
    }
    if (doSite(url) || url.startsWith('blob:')) return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true } };
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // endereço que não existe (o site mudou de pasta): tenta o outro uma vez
  let tentouOutro = false;
  win.webContents.on('did-navigate', (e, url, codigo) => {
    if (codigo !== 404 || tentouOutro || !doSite(url)) return;
    tentouOutro = true;
    win.loadURL(url.includes('/sketcher') ? SITE_ANTIGO : SITE);
  });

  // sem internet: mostra uma tela com "tentar de novo"
  win.webContents.on('did-fail-load', (e, codigo, desc, url, principalFrame) => {
    if (!principalFrame || codigo === -3) return; // -3 = carregamento cancelado (normal)
    win.loadFile(path.join(__dirname, 'offline.html'), { query: { erro: String(desc || codigo) } });
  });

  win.loadURL(SITE);
  return win;
}

// atalhos de sempre (recarregar, tela cheia, copiar/colar); o zoom fica com o próprio site
Menu.setApplicationMenu(Menu.buildFromTemplate([
  { label: 'App', submenu: [
    { role: 'reload', label: 'Recarregar' },
    { role: 'forceReload', label: 'Recarregar sem cache' },
    { role: 'togglefullscreen', label: 'Tela cheia' },
    { type: 'separator' },
    { role: 'toggleDevTools', label: 'Ferramentas do desenvolvedor' },
    { type: 'separator' },
    { role: 'quit', label: 'Sair' },
  ] },
  { label: 'Editar', submenu: [
    { role: 'undo', label: 'Desfazer' }, { role: 'redo', label: 'Refazer' }, { type: 'separator' },
    { role: 'cut', label: 'Recortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Colar' }, { role: 'selectAll', label: 'Selecionar tudo' },
  ] },
]));

app.on('second-instance', () => {
  if (!principal) return;
  if (principal.isMinimized()) principal.restore();
  principal.focus();
});

app.whenReady().then(() => {
  criarJanela();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) criarJanela(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
