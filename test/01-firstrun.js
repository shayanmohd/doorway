/* First run: onboarding, lens setup, empty state, sample, happy path through every screen. */
module.exports = async ({ page, shot, wait, text, click, errors, log }) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(400);

  await shot('01-onboard-1');
  await click('#obNext'); await wait(250);
  await shot('02-onboard-2');
  await click('#obNext'); await wait(250);
  await click('#obNext'); await wait(400);
  await shot('03-lens-setup');

  // turn on wheeled mobility
  await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#lensModules .mod-card')];
    cards[0].querySelector('.toggle').click();
  });
  await wait(300);
  await shot('04-lens-params');
  await click('#lensDone'); await wait(400);
  await shot('05-empty-places');

  log('empty text: ' + (await text('#placesEmpty')));

  await click('#sampleBtn'); await wait(600);
  await shot('06-places-populated');

  // open a place
  await page.evaluate(() => window.App.openPlace('smp-orangery'));
  await wait(600);
  await shot('07-place');
  await page.evaluate(() => { document.getElementById('placeBody').scrollTop = 900; });
  await wait(300);
  await shot('08-place-scrolled');

  log('back returns: ' + await page.evaluate(() => window.App.back()));
  await wait(300);

  // lists
  await page.evaluate(() => window.App.show('lists'));
  await wait(400);
  await shot('09-lists');

  await page.evaluate(() => window.App.show('check'));
  await wait(400);
  await shot('10-check');
  await page.evaluate(() => { document.querySelector('#v-check .scroller').scrollTop = 1200; });
  await wait(200);
  await shot('11-check-scrolled');

  await page.evaluate(() => window.App.show('you'));
  await wait(400);
  await shot('12-you');
  await page.evaluate(() => { document.querySelector('#v-you .scroller').scrollTop = 1000; });
  await wait(200);
  await shot('13-you-scrolled');
  await page.evaluate(() => { document.querySelector('#v-you .scroller').scrollTop = 2200; });
  await wait(200);
  await shot('14-you-bottom');

  log('errors: ' + errors.length);
};
