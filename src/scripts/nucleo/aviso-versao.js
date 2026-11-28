
// avisa quando sai uma versão nova do site (o navegador pode ficar horas com a antiga aberta)
(function () {
  var atual = '__CPR_BUILD__', avisou = false;
  function mostrar() {
    if (avisou || !document.body) return; avisou = true;
    var b = document.createElement('div'); b.id = 'cpr-nova'; b.setAttribute('role', 'alert');
    b.innerHTML = '<span>Saiu uma versão nova do site.</span><button type="button">Atualizar agora</button>';
    b.querySelector('button').onclick = function () { location.reload(); };
    document.body.appendChild(b);
  }
  function checar() {
    if (avisou || !window.fetch) return;
    fetch(location.pathname + '?v=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
      var m = t.match(/<meta name="cpr-build" content="([^"]+)"/);
      if (m && m[1] !== atual) mostrar();
    }).catch(function () {});
  }
  setTimeout(checar, 20000); setInterval(checar, 120000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') checar(); });
})();
