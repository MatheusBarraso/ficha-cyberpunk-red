/* ================= celular em pé (tela estreita) =================
   Em pé a ficha continua sendo o desenho do PDF, com zoom livre (ver nucleo/nitidez.js). O modo
   celular (classe body.mob) só ajusta barra, menu, anotações e livros pra tela estreita. */
const MOB_MAX = 760;               // largura (px) a partir da qual vira modo celular
let mobOn = false;

function setMob(on) {
  if (on === mobOn) return;
  mobOn = on;
  document.body.classList.toggle('mob', on);
  if (window.__renderBadges) window.__renderBadges();
  applyScale();
}
// em pé: tela estreita e o celular NÃO está deitado (o teclado aberto não troca o layout)
const wantMob = () => window.innerWidth <= MOB_MAX && !phoneLandscape() && !(matchMedia('(pointer: fine)').matches && !matchMedia('(pointer: coarse)').matches);

