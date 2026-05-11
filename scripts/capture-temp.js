const { chromium, devices } = require('playwright');

const mockRide = [{
  _id: 'mock-ride-1',
  destination: 'Munnar',
  startLocation: 'Ernakulam',
  rideDate: '2026-03-28T20:30:00.000Z',
  participantsCount: 2,
  maxParticipants: 10,
  createdBy: { username: 'username' },
  status: 'upcoming'
}];

const mockPosts = [{
  _id: 'mock-post-1',
  author: { _id: 'u1', username: 'username', profilePic: '' },
  content: "A forgotten logging route reclaimed by nature. It's narrow, overgrown, and mostly dirt, but it leads to a clearing with a 19th-century stone bridge that's worth the mud on your boots. It's quiet enough that you can hear your engine echo off the canyon walls.",
  media: [{ url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800', type: 'image' }],
  likes: [],
  likesCount: 17,
  commentsCount: 10,
  createdAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
}];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 13'] });

  await context.route('**/api/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/api/notifications/unread-count')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ unread: 12 }) });
      return;
    }
    if (url.includes('/api/chat/unread')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ unread: 4 }) });
      return;
    }
    if (url.includes('/api/rides')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockRide) });
      return;
    }
    if (url.includes('/api/posts')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPosts) });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await context.addInitScript(() => {
    localStorage.setItem('bh_guest', 'true');
    localStorage.setItem('bh_user_id', 'guest');
    localStorage.setItem('bh_username', 'Guest Rider');
  });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/#/home', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: 'frontend/homepage-redesign.png' });
  await browser.close();
})();
