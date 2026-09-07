/* Rapid double taps on every primary button, empty search and filter results,
   everyone view, list rename edges, and deleting a place from under its own sheet. */
module.exports = async ({ page, shot, wait, text, click, errors, log }) => {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('doorway.v1', JSON.stringify({
      v: 1, places: [], surveys: [], confirms: [], lists: [],
      lens: { modules: [{ type: 'wheeled', params: {} }], everyone: false },
      settings: { haptics: true, textScale: 1, onboarded: true, sort: 'name', name: '', sample: false }
    }));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(300);

  // double tap the sample button
  await page.evaluate(() => { const b = document.getElementById('sampleBtn'); b.click(); b.click(); });
  await wait(600);
  log('places after double tap sample: ' + await page.evaluate(() => Store.places().length));

  // double tap Survey
  await page.evaluate(() => { const b = document.getElementById('surveyNewBtn'); b.click(); b.click(); });
  await wait(400);
  log('survey sheets open: ' + await page.evaluate(() => [...document.querySelectorAll('.sheet')].filter(s => !s.hidden).length));

  // save a survey by double tapping Save
  await page.type('#npName', 'Double Tap Cafe');
  await page.evaluate(() => document.getElementById('surveyNext').click()); await wait(350);
  await page.evaluate(() => { document.querySelector('#surveyBody .q .chip').click(); }); await wait(300);
  await page.evaluate(() => { // jump to review
    while (window.__x !== 1) { const b = document.getElementById('surveyNext'); if (b.textContent === 'Save survey') break; b.click(); }
  });
  await wait(500);
  log('button now: ' + await text('#surveyNext'));
  await page.evaluate(() => { const b = document.getElementById('surveyNext'); b.click(); b.click(); });
  await wait(800);
  log('surveys saved (want 1): ' + await page.evaluate(() => Store.db().surveys.filter(s => s.by === 'you').length));
  log('errors so far: ' + errors.length);
  await shot('70-after-double-save');

  // double tap "Still accurate" in the check queue
  await page.evaluate(() => window.App.back()); await wait(300);

  // empty search
  await page.evaluate(() => window.App.show('places')); await wait(300);
  await page.type('#placeSearch', 'zzzzzz');
  await wait(400);
  await shot('71-search-empty');
  log('search empty text: ' + await text('#placeList'));
  await page.evaluate(() => { const i = document.getElementById('placeSearch'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await wait(300);

  // every filter on at once
  await page.evaluate(() => { document.querySelectorAll('#filterChips .chip').forEach(c => c.click()); });
  await wait(500);
  await shot('72-filters-empty');
  log('all filters text: ' + await text('#placeList'));
  await page.evaluate(() => { document.querySelectorAll('#filterChips .chip.is-on').forEach(c => c.click()); });
  await wait(400);

  // everyone view
  await page.evaluate(() => { Store.setLens({ everyone: true }); window.App.show('places'); }); await wait(400);
  await shot('73-everyone-places');
  await page.evaluate(() => window.App.openPlace('smp-ledger')); await wait(500);
  await shot('74-everyone-place');
  await page.evaluate(() => window.App.back()); await wait(300);
  await page.evaluate(() => window.App.show('check')); await wait(400);
  await shot('75-everyone-check');
  await page.evaluate(() => { Store.setLens({ everyone: false }); });

  // list rename to empty
  await page.evaluate(() => window.App.show('lists')); await wait(300);
  await page.evaluate(() => { document.getElementById('newListBtn').click(); }); await wait(400);
  await page.evaluate(() => { const i = document.getElementById('renameInput'); i.value = '   '; });
  await page.evaluate(() => { [...document.querySelectorAll('#listIndex .btn')].find(b => b.textContent === 'Save').click(); });
  await wait(400);
  log('list titles: ' + JSON.stringify(await page.evaluate(() => Store.lists().map(l => l.title))));
  await shot('76-list-blank-title');

  // delete a place while its sheet is open
  await page.evaluate(() => window.App.openPlace('smp-coffee')); await wait(500);
  await page.evaluate(() => { [...document.querySelectorAll('#placeBody .btn')].find(b => b.textContent === 'Remove').click(); });
  await wait(400);
  await shot('77-remove-confirm');
  await page.evaluate(() => document.getElementById('confirmYes').click());
  await wait(600);
  await shot('78-after-remove');
  log('places now: ' + await page.evaluate(() => Store.places().length));
  log('sheet open: ' + await page.evaluate(() => !document.getElementById('sh-place').hidden));
  log('errors: ' + errors.length);
};
