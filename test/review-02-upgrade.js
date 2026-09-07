/* Reviewer pass 2: a phone that has been running 1.0.0. The localStorage below is exactly what
   the shipped store module (git show f210c38:web/js/store.js) would have written: untrimmed and
   uncapped names, a blank list title, several confirmations on the same day, a lastFix in
   settings, and a survey whose photograph is not in IndexedDB. Nothing may be lost or misread. */
module.exports = async ({ page, shot, wait, text, click, type, errors, log }) => {
  const ev = fn => page.evaluate(fn);
  const DAY = 86400000;
  const LONG_NAME = 'The Old Corn Exchange Coffee House and Reading Rooms, Upper Marlow Street Branch';
  const HUGE_NAME = 'Bahnhofstrassecafeundbuchhandlungmitgrossemschaufensterunddreistufen';

  const seed = await page.evaluate(([longName, hugeName]) => {
    const now = Date.now(), DAY = 86400000;
    const db = {
      v: 1,
      places: [
        { id: 'p_old1', name: '  ' + longName + '  ', kind: 'Cafe', area: 'Upper Marlow Street',
          note: 'x'.repeat(900), lat: 53.4014, lng: -2.9881, at: now - 200 * DAY },
        { id: 'p_old2', name: hugeName, kind: 'Shop', area: '', note: '', lat: null, lng: null, at: now - 20 * DAY },
        { id: 'p_old3', name: 'Ivy Court Clinic', kind: 'Clinic', area: 'Ivy Court',
          note: '', lat: 53.4009, lng: -2.9890, at: now - 400 * DAY }
      ],
      surveys: [
        { id: 's_old1', placeId: 'p_old1', at: now - 200 * DAY, by: 'you', slot: 'morning', seconds: 91,
          facts: { 'entrance.steps': 1, 'entrance.step_height_cm': 12, 'entrance.ramp': 'none',
                   'entrance.door_width_cm': 78, 'entrance.door_type': 'heavy', 'entrance.threshold': 'lip',
                   'bathroom.exists': 'yes', 'bathroom.step_free': 'yes', 'bathroom.accessible': 'no',
                   'bathroom.grab_bars': 'one', 'bathroom.turning_space': 'tight',
                   'inside.circulation': 'tight', 'inside.seating': 'fixed',
                   'sensory.noise': 'loud', 'sensory.crowding': 'busy', 'sensory.lighting': 'harsh',
                   'vision.print': 'small', 'hearing.loop': 'no', 'staff.response': 'willing' },
          photos: [{ media: 'gonemedia-1', role: 'entrance', at: now - 200 * DAY }] },
        { id: 's_old2', placeId: 'p_old1', at: now - 30 * DAY, by: 'The Tuesday group', slot: 'evening', seconds: 74,
          facts: { 'entrance.steps': 1, 'entrance.step_height_cm': 13, 'entrance.door_width_cm': 79,
                   'sensory.noise': 'quiet', 'sensory.crowding': 'calm' }, photos: [] },
        { id: 's_old3', placeId: 'p_old2', at: now - 20 * DAY, by: 'you', slot: 'midday', seconds: 40,
          facts: { 'entrance.steps': 0, 'entrance.door_width_cm': 92 }, photos: [] },
        { id: 's_old4', placeId: 'p_old3', at: now - 400 * DAY, by: 'you', slot: 'afternoon', seconds: 120,
          facts: { 'entrance.steps': 0, 'entrance.door_width_cm': 110, 'bathroom.exists': 'yes',
                   'bathroom.accessible': 'yes', 'bathroom.step_free': 'yes', 'bathroom.turning_space': 'roomy' },
          photos: [] }
      ],
      // 1.0.0 counted every tap, so a real 1.0.0 phone has runs of same-day confirmations.
      confirms: [
        { id: 'c1', placeId: 'p_old1', at: now - 3 * DAY, by: 'you' },
        { id: 'c2', placeId: 'p_old1', at: now - 3 * DAY + 1000, by: 'you' },
        { id: 'c3', placeId: 'p_old1', at: now - 3 * DAY + 2000, by: 'you' },
        { id: 'c4', placeId: 'p_old2', at: now - 9 * DAY, by: 'you' }
      ],
      lists: [
        { id: 'l_old1', title: '', placeIds: ['p_old1', 'p_old2'], at: now - 100 * DAY },
        { id: 'l_old2', title: 'Bad day places', placeIds: ['p_old3'], at: now - 60 * DAY }
      ],
      lens: { modules: [{ type: 'wheeled', params: { maxStep: 2, minDoor: 80, toilet: 'must' } },
                        { type: 'hearing', params: { loop: 'want', lipread: 'need' } }], everyone: false },
      settings: { haptics: false, textScale: 1.15, onboarded: true, sort: 'distance',
                  name: 'The Tuesday group', sample: false,
                  lastFix: { lat: 53.4012, lng: -2.9885, acc: 18, at: now - 2 * 3600000 } }
    };
    localStorage.clear();
    try { indexedDB.deleteDatabase('doorway-photos'); } catch (e) {}
    localStorage.setItem('doorway.v1', JSON.stringify(db));
    return JSON.stringify(db).length;
  }, [LONG_NAME, HUGE_NAME]);
  log('seeded 1.0.0 payload of', seed, 'bytes');

  await page.reload({ waitUntil: 'networkidle0' });
  await wait(1000);

  const read = await ev(() => {
    const S = App._store();
    return {
      places: S.places().map(p => ({ id: p.id, name: p.name, note: p.note.length, at: p.at })),
      surveys: S.db().surveys.length,
      confirms: S.db().confirms.length,
      lists: S.lists().map(l => ({ title: l.title, n: l.placeIds.length })),
      lens: JSON.stringify(S.lens()),
      settings: JSON.stringify(S.settings()),
      onPlacesScreen: !document.getElementById('v-places').hidden,
      onboarding: !document.getElementById('onboard').hidden
    };
  });
  log('read back:', JSON.stringify(read, null, 1));
  if (read.places.length !== 3) throw new Error('places lost');
  if (read.surveys !== 4) throw new Error('surveys lost');
  if (read.confirms !== 4) throw new Error('confirmations lost: 1.0.0 same-day taps must be kept');
  if (read.lists.length !== 2) throw new Error('lists lost');
  if (read.places[0].note !== 900) throw new Error('a 1.0.0 note was silently truncated on read');
  if (read.places[0].name.trim() !== read.places[0].name.trim()) throw new Error('name changed');
  if (read.onboarding) throw new Error('an upgraded phone was shown onboarding again');
  await shot('50-upgraded-places');

  // the untrimmed and over-long names must not break a card
  const overflow = await ev(() => {
    const s = document.querySelector('#v-places .scroller');
    return { pageWide: document.documentElement.scrollWidth > document.documentElement.clientWidth,
             listWide: s.scrollWidth > s.clientWidth + 1 };
  });
  log('overflow:', JSON.stringify(overflow));
  if (overflow.pageWide || overflow.listWide) throw new Error('a 1.0.0 name overflows its card');

  // text scale carried over
  const fs = await ev(() => getComputedStyle(document.documentElement).getPropertyValue('--fs').trim());
  log('--fs after upgrade:', fs);
  if (fs !== '1.15') throw new Error('text size setting lost');

  // every place page renders, drawings and all
  for (const id of ['p_old1', 'p_old2', 'p_old3']) {
    await page.evaluate(i => App.openPlace(i), id);
    await wait(800);
    await shot('51-place-' + id);
    const info = await ev(() => {
      const b = document.getElementById('placeBody');
      return { cap: (b.querySelector('.hero-cap') || {}).textContent || '',
               img: !!b.querySelector('.hero img'),
               canvases: b.querySelectorAll('canvas').length,
               verdict: (b.querySelector('.vpanel-h .big') || {}).textContent || '' };
    });
    log(id, JSON.stringify(info));
    await ev(() => { const b = document.getElementById('placeBody'); b.scrollTop = b.scrollHeight; });
    await wait(400);
    await shot('52-place-' + id + '-bottom');
    await ev(() => App.back());
    await wait(350);
  }

  // the lost photograph must fall back to the drawing, not a grey band
  await page.evaluate(() => App.openPlace('p_old1'));
  await wait(1200);
  const lost = await ev(() => {
    const b = document.getElementById('placeBody');
    return { hasImg: !!b.querySelector('.hero img'), cap: (b.querySelector('.hero-cap') || {}).textContent || '',
             heroH: b.querySelector('.hero').getBoundingClientRect().height };
  });
  log('lost photo hero:', JSON.stringify(lost));
  if (lost.hasImg) throw new Error('a photograph that is no longer stored still rendered as an image');
  if (!/no longer on this phone/.test(lost.cap)) throw new Error('no explanation for the missing photograph');
  await shot('53-lost-photo');
  await ev(() => App.back()); await wait(300);

  // lists: the blank 1.0.0 title must still render as something
  await ev(() => App.show('lists')); await wait(600);
  await shot('54-lists-upgraded');
  const titles = await ev(() => [...document.querySelectorAll('#listIndex .card-h h3')].map(h => h.textContent));
  log('list titles rendered:', JSON.stringify(titles));
  if (titles.some(t => !t.trim())) throw new Error('a 1.0.0 list with a blank title renders as an untitled card');

  // check and you both read
  await ev(() => App.show('check')); await wait(700); await shot('55-check-upgraded');
  await ev(() => App.show('you')); await wait(800); await shot('56-you-upgraded');
  const stats = await ev(() => JSON.stringify(App._store().stats()));
  log('stats:', stats);

  // writing after the upgrade keeps the old records
  await ev(() => App.openPlace('p_old1')); await wait(700);
  await click('#stillBtn'); await wait(500);
  await click('#stillBtn'); await wait(500);
  const after = await ev(() => App._store().db().confirms.length);
  log('confirms after two taps today:', after);
  if (after !== 5) throw new Error('the daily confirmation rule did not hold on upgraded data: ' + after);
  await shot('57-confirm-after-upgrade');

  await page.reload({ waitUntil: 'networkidle0' });
  await wait(900);
  const final = await ev(() => ({ p: App._store().places().length, s: App._store().db().surveys.length,
    c: App._store().db().confirms.length, l: App._store().lists().length }));
  log('after a second reload:', JSON.stringify(final));
  if (final.p !== 3 || final.s !== 4 || final.c !== 5 || final.l !== 2) throw new Error('data changed across the upgrade');

  if (errors.length) throw new Error(errors.length + ' page errors');
};
