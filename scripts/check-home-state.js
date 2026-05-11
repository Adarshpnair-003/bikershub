const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/#/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('bh_guest', 'true');
    localStorage.setItem('bh_user_id', 'guest');
    localStorage.setItem('bh_username', 'Guest Rider');
  });
  await page.goto('http://127.0.0.1:4173/#/home', { waitUntil: 'networkidle' });
  const state = await page.evaluate(() => ({ hash: location.hash, guest: localStorage.getItem('bh_guest'), title: document.querySelector('h2')?.textContent || document.querySelector('.home-brand-btn')?.textContent || '' }));
  console.log(JSON.stringify(state));
  await browser.close();
})();
