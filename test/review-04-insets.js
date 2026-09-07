/* Reviewer pass 4: --sat 48px, --sab 34px. Nothing may sit under either bar, on any screen. */
module.exports = async ({ page, shot, wait, text, click, type, errors, log }) => {
  const ev = fn => page.evaluate(fn);
  const evA = (fn, a) => page.evaluate(fn, a);
  const SAT = 48, SAB = 34;
  const bad = [];

  await ev(() => { localStorage.clear(); try { indexedDB.deleteDatabase('doorway-photos'); } catch (e) {} });
  await page.evaluateOnNewDocument((t, b) => {
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.setProperty('--sat', t + 'px');
      document.documentElement.style.setProperty('--sab', b + 'px');
    });
  }, SAT, SAB);
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(700);
  log('insets applied:', await ev(() => getComputedStyle(document.documentElement).getPropertyValue('--sat') + ' / ' +
    getComputedStyle(document.documentElement).getPropertyValue('--sab')));

  /* Every element that carries text or takes a tap, on whatever is currently on screen. */
  const audit = async (name) => {
    const out = await evA(([sat, sab]) => {
      const H = window.innerHeight, W = window.innerWidth;
      const hits = [];
      const vis = el => {
        const st = getComputedStyle(el);
        if (st.visibility === 'hidden' || st.display === 'none' || +st.opacity === 0) return false;
        let n = el;
        while (n && n !== document.body) { if (n.hidden) return false; n = n.parentElement; }
        return true;
      };
      const sel = 'button, a, input, textarea, select, h1, h2, h3, p, span.prow-name, b, li, .toast, canvas, svg.scene, svg.terrace';
      for (const el of document.querySelectorAll(sel)) {
        if (!vis(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (r.bottom <= 0 || r.top >= H) continue;                 // scrolled out of the frame
        const txt = (el.textContent || '').trim().slice(0, 34);
        // an element that starts above the fold is scrolled, not badly placed: only flag the
        // ones whose own box begins inside the bar while the rest of it is on screen.
        if (r.top < sat && r.bottom > 0 && r.top > -4) hits.push({ where: 'status bar', top: Math.round(r.top), tag: el.tagName, txt });
        if (r.bottom > H - sab && r.top < H - sab + 4 && r.bottom < H + 4) hits.push({ where: 'nav bar', bottom: Math.round(H - r.bottom), tag: el.tagName, txt });
      }
      return hits;
    }, [SAT, SAB]);
    // the scroller's own padding means a list can legitimately run under the tab bar while
    // scrolling; only fixed furniture is a real hit, so filter to what is not in a scroller.
    const real = await evA(([sat, sab]) => {
      const H = window.innerHeight;
      const hits = [];
      const inScroller = el => !!el.closest('.scroller, .sheet-body, .chips.scrollx, .photo-strip, .ob-track');
      const vis = el => {
        const st = getComputedStyle(el);
        if (st.visibility === 'hidden' || st.display === 'none' || +st.opacity === 0) return false;
        let n = el;
        while (n && n !== document.body) { if (n.hidden) return false; n = n.parentElement; }
        return true;
      };
      for (const el of document.querySelectorAll('button, a, input, textarea, select, h1, h2, h3, p, b, li, canvas, svg')) {
        if (!vis(el) || inScroller(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (r.bottom <= 0 || r.top >= H) continue;
        const txt = (el.textContent || '').trim().slice(0, 34) || el.tagName;
        if (r.top < sat) hits.push('under the status bar: ' + txt + ' (top ' + Math.round(r.top) + ')');
        if (r.bottom > H - sab) hits.push('under the nav bar: ' + txt + ' (bottom gap ' + Math.round(H - r.bottom) + ')');
      }
      return hits;
    }, [SAT, SAB]);
    if (real.length) { log('  ' + name + ' HITS: ' + real.join(' | ')); bad.push(name + ': ' + real.join(' | ')); }
    else log('  ' + name + ': clear');
    await shot('70-inset-' + name);
  };

  await audit('onboard');
  await click('#obNext'); await wait(250);
  await click('#obNext'); await wait(250);
  await click('#obNext'); await wait(450);
  await audit('lens-setup');
  await click('#lensSkip'); await wait(600);
  await audit('places-empty');
  await ev(() => { Sample.install(); App.renderPlaces(); }); await wait(700);
  await ev(() => { document.getElementById('toast').hidden = true; });
  await audit('places');
  await ev(() => App.show('lists')); await wait(500); await audit('lists');
  await ev(() => App.show('check')); await wait(600); await audit('check');
  await ev(() => App.show('you')); await wait(700); await audit('you');
  await ev(() => App.openPlace('smp-ledger')); await wait(800); await audit('place');
  await ev(() => { const b = document.getElementById('placeBody'); b.scrollTop = b.scrollHeight; }); await wait(400);
  await audit('place-bottom');
  await ev(() => { [...document.querySelectorAll('#placeActions button')].find(b => /Add to a list/.test(b.textContent)).click(); });
  await wait(500); await audit('list-picker');
  await ev(() => App.back()); await wait(300);
  await ev(() => App.back()); await wait(300);
  await ev(() => App.startSurvey(null, null)); await wait(600); await audit('survey');
  await type('#npName', 'Inset Test Cafe'); await wait(200);
  await ev(() => { document.getElementById('surveyNext').click(); }); await wait(600);
  await audit('survey-questions');
  await ev(() => { [...document.querySelectorAll('#surveyBody .btnrow button')].find(b => /Photograph/.test(b.textContent)).click(); });
  await wait(1700); await audit('camera');
  await click('#camShoot'); await wait(900); await audit('camera-review');
  await ev(() => App.back()); await wait(400);
  await ev(() => App.back()); await wait(400);
  await ev(() => { const y = document.getElementById('confirmYes'); if (!document.getElementById('confirm').hidden) y.click(); });
  await wait(400);
  await ev(() => App.show('you')); await wait(600);
  await ev(() => { [...document.querySelectorAll('#youBody button')].find(b => /Edit your lens|Build a lens/.test(b.textContent)).click(); });
  await wait(600); await audit('lens-sheet');
  await ev(() => App.back()); await wait(300);
  await ev(() => { [...document.querySelectorAll('#youBody button')].find(b => /Send a pack/.test(b.textContent)).click(); });
  await wait(900); await audit('share');
  await ev(() => App.back()); await wait(300);
  await ev(() => { [...document.querySelectorAll('#youBody button')].find(b => /Add a pack/.test(b.textContent)).click(); });
  await wait(600); await audit('import');
  await ev(() => App.back()); await wait(300);
  await ev(() => { [...document.querySelectorAll('#youBody button')].find(b => /Delete everything/.test(b.textContent)).click(); });
  await wait(500); await audit('modal');
  await ev(() => App.back()); await wait(400);
  await ev(() => App.toast('A message that has to clear the navigation bar as well.')); await wait(500);
  const toastGap = await ev(() => window.innerHeight - document.getElementById('toast').getBoundingClientRect().bottom);
  log('  toast gap below:', toastGap);
  if (toastGap < SAB) bad.push('toast sits ' + toastGap + 'px from the bottom, under the ' + SAB + 'px nav bar');
  await shot('70-inset-toast');

  if (bad.length) throw new Error('safe-area failures:\n  ' + bad.join('\n  '));
  if (errors.length) throw new Error(errors.length + ' page errors');
};
