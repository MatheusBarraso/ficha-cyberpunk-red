/* ================= retrato ================= */
function setupPortrait() {
  const box = $('#portrait'), file = $('#portrait-file'), img = $('#portrait-img');
  const open = () => file.click();
  box.addEventListener('click', open);
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const max = 900; const k = Math.min(1, max / Math.max(im.width, im.height));
        if (k < 1) {
          const cv = document.createElement('canvas');
          cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
          cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
          img.src = cv.toDataURL('image/jpeg', 0.85);
        } else img.src = rd.result;
        box.classList.add('hasimg');
        scheduleSave();
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  });
}

