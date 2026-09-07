/* Reviewer pass 5: WCAG AA on every text and control that is actually on screen.
   The background is composited up the ancestor chain; where an ancestor paints a gradient the
   element is reported separately so its worst stop can be judged by eye and by hand. */
module.exports = async ({ page, shot, wait, text, click, type, errors, log }) => {
  const ev = fn => page.evaluate(fn);
  const worst = new Map();
  const grads = new Map();

  const AUDIT = `(() => {
    const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
      return (hi + 0.05) / (lo + 0.05); };
    const parse = s => { const m = String(s).match(/rgba?\\(([^)]+)\\)/); if (!m) return null;
      const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
    const over = (fg, bg) => [0, 1, 2].map(i => Math.round(fg[i] * fg[3] + bg[i] * (1 - fg[3])));
    const vis = el => { const st = getComputedStyle(el);
      if (st.visibility === 'hidden' || st.display === 'none' || +st.opacity < 0.6) return false;
      let n = el; while (n && n !== document.body) { if (n.hidden) return false; n = n.parentElement; }
      const r = el.getBoundingClientRect();
      return r.width > 3 && r.height > 3 && r.bottom > 0 && r.top < window.innerHeight; };
    const bgOf = el => {
      let n = el, acc = null, grad = null;
      while (n) {
        const st = getComputedStyle(n);
        if (st.backgroundImage && st.backgroundImage !== 'none' && !grad) grad = st.backgroundImage.slice(0, 90);
        const c = parse(st.backgroundColor);
        if (c && c[3] > 0) { acc = acc === null ? c : over(acc, c); if (acc[3] === undefined) acc = [acc[0], acc[1], acc[2], 1];
          if (c[3] >= 0.999) return { rgb: [acc[0], acc[1], acc[2]], grad }; acc = [acc[0], acc[1], acc[2], 1]; }
        n = n.parentElement;
      }
      return { rgb: acc ? [acc[0], acc[1], acc[2]] : [255, 255, 255], grad };
    };
    const out = [];
    const own = el => { for (const c of el.childNodes) if (c.nodeType === 3 && c.textContent.trim()) return true; return false; };
    for (const el of document.querySelectorAll('*')) {
      if (!own(el) || !vis(el)) continue;
      const st = getComputedStyle(el);
      const fg = parse(st.color); if (!fg) continue;
      const b = bgOf(el);
      const f = fg[3] < 1 ? over(fg, b.rgb) : [fg[0], fg[1], fg[2]];
      const size = parseFloat(st.fontSize), weight = +st.fontWeight || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const r = ratio(f, b.rgb);
      out.push({ sel: el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ').filter(Boolean).slice(0, 2).join('.'),
        txt: (el.textContent || '').trim().slice(0, 30), r: Math.round(r * 100) / 100,
        need: large ? 3 : 4.5, size, weight, grad: b.grad,
        fg: 'rgb(' + f.join(',') + ')', bg: 'rgb(' + b.rgb.join(',') + ')' });
    }
    return out;
  })()`;

  const sweep = async (name) => {
    const rows = await page.evaluate(AUDIT);
    for (const row of rows) {
      const key = row.sel + '|' + row.fg + '|' + row.bg;
      const rec = Object.assign({ screen: name }, row);
      if (row.grad) { if (!grads.has(key)) grads.set(key, rec); }
      else if (!worst.has(key) || worst.get(key).r > row.r) worst.set(key, rec);
    }
    log(name + ': ' + rows.length + ' text nodes measured');
  };

  await ev(() => { localStorage.clear(); try { indexedDB.deleteDatabase('doorway-photos'); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle0' }); await wait(600);
  await sweep('onboard');
  await click('#obNext'); await wait(250); await click('#obNext'); await wait(250); await click('#obNext'); await wait(450);
  await sweep('lens-setup');
  await ev(() => { const c = document.querySelectorAll('.mod-card')[0]; c.querySelector('.toggle').click(); }); await wait(350);
  await sweep('lens-setup-on');
  await click('#lensDone'); await wait(600);
  await sweep('places-empty');
  await ev(() => { Sample.install(); App.renderPlaces(); }); await wait(700);
  await sweep('places');
  await ev(() => { document.querySelectorAll('#filterChips .chip')[0].click(); }); await wait(350);
  await sweep('places-filtered');
  await ev(() => { document.querySelectorAll('#filterChips .chip')[0].click(); }); await wait(300);
  for (const v of ['lists', 'check', 'you']) { await page.evaluate(x => App.show(x), v); await wait(700); await sweep(v); }
  await ev(() => { const s = document.querySelector('#v-you .scroller'); s.scrollTop = 1200; }); await wait(400);
  await sweep('you-scrolled');
  await ev(() => { const s = document.querySelector('#v-you .scroller'); s.scrollTop = s.scrollHeight; }); await wait(400);
  await sweep('you-bottom');
  for (const id of ['smp-ledger', 'smp-coffee', 'smp-clinic']) {
    await page.evaluate(i => App.openPlace(i), id); await wait(800); await sweep('place-' + id);
    await ev(() => { const b = document.getElementById('placeBody'); b.scrollTop = 900; }); await wait(400);
    await sweep('place-' + id + '-mid');
    await ev(() => { const b = document.getElementById('placeBody'); b.scrollTop = b.scrollHeight; }); await wait(400);
    await sweep('place-' + id + '-bottom');
    await ev(() => App.back()); await wait(350);
  }
  await ev(() => App.startSurvey(null, null)); await wait(600); await sweep('survey-place');
  await type('#npName', 'Contrast Cafe');
  await ev(() => document.getElementById('surveyNext').click()); await wait(600); await sweep('survey-entrance');
  await ev(() => { const box = [...document.querySelectorAll('#surveyBody .q')].find(x => /How many steps/.test(x.querySelector('.q-h').textContent));
    [...box.querySelectorAll('.chip')].find(c => c.textContent === 'Two steps').click(); }); await wait(400);
  await ev(() => { const box = [...document.querySelectorAll('#surveyBody .q')].find(x => /tall is the tallest/.test(x.querySelector('.q-h').textContent));
    [...box.querySelectorAll('.chip')].find(c => c.textContent === '15 cm').click(); }); await wait(400);
  await ev(() => { document.getElementById('surveyBody').scrollTop = 400; }); await wait(300);
  await sweep('survey-stepper');
  await ev(() => { for (let i = 0; i < 5; i++) document.getElementById('surveyNext').click(); }); await wait(800);
  await sweep('survey-review');
  await ev(() => { document.getElementById('surveyNext').click(); }); await wait(400);
  await ev(() => document.getElementById('npName') && (document.getElementById('npName').value = 'x')); await wait(200);
  await ev(() => App.back()); await wait(400);
  await sweep('modal');
  await ev(() => { const y = document.getElementById('confirmYes'); if (!document.getElementById('confirm').hidden) y.click(); }); await wait(500);
  await ev(() => App.show('you')); await wait(500);
  await ev(() => { [...document.querySelectorAll('#youBody button')].find(b => /Send a pack/.test(b.textContent)).click(); }); await wait(1000);
  await sweep('share');
  await ev(() => App.back()); await wait(300);
  await ev(() => { [...document.querySelectorAll('#youBody button')].find(b => /Add a pack/.test(b.textContent)).click(); }); await wait(600);
  await sweep('import');
  await ev(() => App.back()); await wait(300);
  await ev(() => App.toast('Checking the toast for contrast as well.')); await wait(400);
  await sweep('toast');

  const rows = [...worst.values()].sort((a, b) => a.r - b.r);
  const failing = rows.filter(r => r.r < r.need);
  log('\n--- flat backgrounds, the ten tightest ---');
  for (const r of rows.slice(0, 10)) log('  ' + r.r.toFixed(2) + ' / ' + r.need + '  ' + r.sel + '  ' + r.fg + ' on ' + r.bg + '  "' + r.txt + '"  [' + r.screen + ']');
  log('\n--- text over a gradient, judged against the stop it sits on ---');
  const g = [...grads.values()].sort((a, b) => a.r - b.r);
  for (const r of g.slice(0, 14)) log('  ' + r.r.toFixed(2) + ' / ' + r.need + '  ' + r.sel + '  ' + r.fg + ' on ' + r.bg + '  "' + r.txt + '"  [' + r.screen + ']  ' + r.grad);
  if (failing.length) {
    log('\n!!! FAILING ' + failing.length + ':');
    for (const r of failing) log('  ' + r.r.toFixed(2) + ' < ' + r.need + '  ' + r.sel + '  ' + r.fg + ' on ' + r.bg + '  "' + r.txt + '"  [' + r.screen + ']');
  }
  if (errors.length) log(errors.length + ' page errors');
};
