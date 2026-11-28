  // ----- lado do player: alertas e ataques chegam em qualquer tela -----
  function irPraFicha() {
    if (S.aberto) fechar();
    if (typeof openMenu === 'function') openMenu(false);
    const i = [...document.querySelectorAll('.sheet')].findIndex((x) => x.classList.contains('active'));
    if (i > 2 && typeof showPage === 'function') showPage(0);
  }
  function recebeuAlertas(sid, q) {
    const k = `cpr-com-alerta-${sid}`;
    let visto = 0; try { visto = +localStorage.getItem(k) || 0; } catch { /* ok */ }
    const novos = q.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.ts > visto && a.ts > agora() - 15 * 60000).sort((a, b) => a.ts - b.ts);
    if (!novos.length) return;
    const ult = novos[novos.length - 1];
    try { localStorage.setItem(k, String(ult.ts)); } catch { /* ok */ }
    irPraFicha();
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch { /* ok */ }
    const m = modal('Aviso do mestre', h('div', { class: 'cm-alerta-txt', text: ult.texto || 'O mestre está chamando a mesa.' }), [btn('Ok', () => m.fechar(), 'cm-pri')], 'cm-modal-alerta cm-modal-fixo');
  }
  const ataqueAberto = new Set();
  function recebeuAtaques(sid, q) {
    const k = 'cpr-com-ataques';
    let vistos = {}; try { vistos = JSON.parse(localStorage.getItem(k) || '{}'); } catch { /* ok */ }
    for (const d of q.docs) {
      const a = { id: d.id, sid, ...d.data() };
      if (a.estado === 'pendente' && !ataqueAberto.has(a.id)) { ataqueAberto.add(a.id); mostrarAtaque(a); }
      else if ((a.estado === 'falhou' || a.estado === 'defendeu') && vistos[a.id] !== a.estado) {
        vistos[a.id] = a.estado;
        if ((a.fimTs || 0) > agora() - 15 * 60000) toast('Ataque', a.estado === 'defendeu' ? `O mestre decidiu: você se defendeu de ${a.de}. Sem dano.` : `O mestre decidiu: você não se defendeu de ${a.de}. −${a.danoFinal} PV.`);
      }
    }
    try { localStorage.setItem(k, JSON.stringify(vistos)); } catch { /* ok */ }
  }
  function mostrarAtaque(a) {
    irPraFicha();
    try { if (navigator.vibrate) navigator.vibrate(300); } catch { /* ok */ }
    const ref = S.db.doc(`sessoes/${a.sid}/ataques/${a.id}`);
    const m = modal(`${a.de} ataca você`, [
      a.texto ? h('div', { class: 'cm-alerta-txt', text: a.texto }) : null,
      h('div', { class: 'cm-at-dano' }, h('small', { text: 'Dano' }), h('b', { text: String(a.dano) })),
      h('div', { class: 'cm-sub', text: 'Aceite o dano ou conteste. Se contestar, esta janela fecha pra você conferir as suas habilidades na ficha, e o mestre decide se você conseguiu.' })],
    [btn('Contestar', async () => {
      if (await salvar(() => ref.update({ estado: 'contestado', respTs: agora() }))) { m.fechar(); irPraFicha(); if (typeof showPage === 'function') showPage(0); toast('Ataque', 'Contestado. O mestre vai decidir se você conseguiu.'); }
    }, 'cm-mini'),
    btn('Aceitar o dano', async () => {
      if (await salvar(() => ref.update({ estado: 'aceito', respTs: agora() }))) { m.fechar(); tomarDano(a.dano); }
    }, 'cm-mini cm-pri')], 'cm-modal-ataque cm-modal-fixo');
  }
  function tomarDano(n) {
    const local = window.__fichaLocal ? window.__fichaLocal() : {};
    const pv = parseInt(local[PV], 10);
    if (isNaN(pv)) { toast('Ataque', 'Seus Pontos de Vida estão em branco na ficha. Ajuste na mão.'); return; }
    const novo = String(Math.max(0, pv - n));
    window.__fichaAplicar({ ...local, [PV]: novo }, [PV]);
    if (typeof save === 'function') save();
    toast('Ataque', `−${n} PV (${pv} → ${novo}).`);
  }

