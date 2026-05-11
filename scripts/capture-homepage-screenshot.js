const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 13'] });

  await context.addInitScript(() => {
    localStorage.setItem('bh_guest', 'true');
    localStorage.setItem('bh_user_id', 'guest');
    localStorage.setItem('bh_username', 'Guest Rider');
  });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/#/home', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: 'frontend/homepage-redesign.png', fullPage: true });
  await browser.close();
})();
