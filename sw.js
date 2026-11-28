// Sketcher — service worker mínimo: permite instalar como app no Android/PC.
// Sempre busca a versão nova na internet; só usa a cópia guardada da página se estiver sem conexão.
const CACHE = 'cpr-app-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || r.mode !== 'navigate' || new URL(r.url).origin !== location.origin) return; // Firebase, imagens etc.: direto, sem mexer
  e.respondWith(
    fetch(r).then((resp) => {
      if (resp.ok) { const c = resp.clone(); caches.open(CACHE).then((cache) => cache.put('./', c)); }
      return resp;
    }).catch(() => caches.match('./').then((c) => c || Response.error()))
  );
});
