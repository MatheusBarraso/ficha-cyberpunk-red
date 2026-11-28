
// Ficha Cyberpunk RED — construção dos campos + interatividade + ponte PDF
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

/* ================= páginas 1–3 = desenho do PDF + campos nas posições do PDF =================
   FIELDMAP: por página, cada campo do PDF preenchível — k = chave salva (data-f), t = tipo
   (t texto, n número, a texto longo, c caixa, atr/base calculados, img retrato), r = [x, y, largura, altura] em px */
