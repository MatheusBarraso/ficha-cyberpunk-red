/* ================= persistência ================= */
const KEY = chaveLocal('ficha');
let fields = [];
const status = $('#savestatus');
let saveTimer = null;
let savedExtra = {}; // chaves salvas que não têm campo na tela (ex.: versões antigas) — continuam no salvamento

function collect() {
  const data = Object.assign({}, savedExtra);
  delete data.__img;
  for (const f of fields) data[f.dataset.f] = f.type === 'checkbox' ? f.checked : f.value;
  const img = $('#portrait-img');
  if (img.src && img.src.startsWith('data:')) data.__img = img.src;
  return data;
}
function save() {
  if (window.__fichaRemota) { window.__fichaRemota.salvou(collect()); status.textContent = 'Salvo na ficha do player'; return; }
  try {
    localStorage.setItem(KEY, JSON.stringify(collect()));
    const h = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    status.textContent = `Salvo automaticamente às ${h}`;
    if (window.__fichaSalvouLocal) window.__fichaSalvouLocal();
  } catch (e) {
    status.textContent = 'Não consegui salvar (armazenamento cheio?)';
  }
}
function scheduleSave() {
  clearTimeout(saveTimer);
  status.textContent = 'Salvando…';
  saveTimer = setTimeout(save, 400);
}
function load() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* corrompido */ }
  if (!data) return;
  // antes as notas do equipamento (pág. 2) e as das armas (pág. 1) dividiam a chave "NOTAS n": agora cada uma tem a sua
  for (let i = 1; i <= 19; i++) {
    const nk = `NOTAS EQUIPAMENTO ${i}`;
    if (data[nk] === undefined && data[`NOTAS ${i}`] !== undefined) data[nk] = data[`NOTAS ${i}`];
  }
  savedExtra = data;
  for (const f of fields) {
    const v = data[f.dataset.f];
    if (v === undefined) continue;
    if (f.type === 'checkbox') f.checked = !!v; else f.value = v;
  }
  if (data.__img) {
    const img = $('#portrait-img');
    img.src = data.__img;
    $('#portrait').classList.add('hasimg');
  }
  status.textContent = 'Ficha carregada — salva automaticamente neste navegador';
}

// põe na tela os dados de outra ficha (a do player, quando o mestre abre) ou volta pra ficha deste aparelho
window.__fichaColetar = () => collect();
window.__fichaAplicar = (data, chaves) => {
  data = data || {};
  const so = chaves ? new Set(chaves) : null;
  if (!so) savedExtra = Object.assign({}, data);
  else for (const k of so) { if (data[k] === undefined) delete savedExtra[k]; else savedExtra[k] = data[k]; }
  for (const f of fields) {
    const k = f.dataset.f;
    if (so && !so.has(k)) continue;
    const v = data[k];
    if (f.type === 'checkbox') f.checked = !!v; else f.value = v == null ? '' : v;
  }
  if (!so || so.has('__img')) {
    const img = $('#portrait-img');
    if (data.__img) { img.src = data.__img; $('#portrait').classList.add('hasimg'); }
    else { img.removeAttribute('src'); $('#portrait').classList.remove('hasimg'); }
  }
  recalc();
  if (window.__renderBadges) window.__renderBadges();
};
window.__fichaLocal = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch { return {}; } };
window.__fichaVoltarLocal = () => { window.__fichaAplicar(window.__fichaLocal()); status.textContent = 'Ficha deste aparelho'; };

