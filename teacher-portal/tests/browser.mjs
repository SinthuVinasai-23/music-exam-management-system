import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'msedge',
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage();
const errors = [],
  results = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error')
    errors.push(msg.text() + ' ' + msg.location().url);
});
const url = process.env.TEST_URL || 'http://localhost:3000';
const key = 'music-teacher-portal-v1';
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
    console.log(`PASS ${name}`);
  } catch (e) {
    results.push({ name, status: 'FAIL', error: e.message });
    console.log(`FAIL ${name}: ${e.message}`);
    throw e;
  }
}
const button = (name, scope = page) =>
  scope.getByRole('button', { name, exact: true });
const dialog = () => page.getByRole('dialog');
const waitTitle = async (text) =>
  page.getByRole('heading', { name: text, exact: true }).first().waitFor();
const state = () =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
const nav = async (label) => button(label, page.locator('nav')).click();
try {
  await page.goto(url + '/teacher/dashboard');
  await page.getByRole('heading', { name: /Welcome back/ }).waitFor();
  await check('Dashboard cards and main navigation', async () => {
    await button('Active Students')
      .count()
      .then(async (n) => {
        if (n) await button('Active Students').click();
        else
          await page.getByRole('button', { name: /Active Students/ }).click();
      });
    await waitTitle('Candidate Roster');
    await nav('Dashboard');
    await page.getByRole('button', { name: /Awaiting Review/ }).click();
    await waitTitle('FIFO Application Line');
    await nav('Dashboard');
    await page.getByRole('button', { name: /Upcoming Sessions/ }).click();
    await waitTitle('Examination Schedule');
    await nav('Dashboard');
    await button('REVIEW NOW').first().click();
    await waitTitle('FIFO Application Line');
  });
  await check(
    'Approval blank signature, TYPE mode, receipt and FIFO advancement',
    async () => {
      await button('Approve & E-Sign').click();
      await dialog().waitFor();
      await button('Confirm & E-Sign', dialog()).click();
      await page.getByRole('alert').waitFor();
      await button('TYPE', dialog()).click();
      await page.getByPlaceholder('Your signature').fill('Dr. Ramesh Iyer');
      await button('Confirm & E-Sign', dialog()).click();
      await waitTitle('Application Successfully Approved');
      const dl = page.waitForEvent('download');
      await button('View Receipt').click();
      const download = await dl;
      await mkdir('test-results', { recursive: true });
      await download.saveAs('test-results/approval-receipt.pdf');
      await button('Return to Queue').click();
      await waitTitle('Ashwin Pillai');
      assert.equal((await state()).applications[0].signature.method, 'type');
    },
  );
  await check('DRAW signature, clear and resubmit', async () => {
    await button('Approve & E-Sign').click();
    const canvas = dialog().locator('canvas'),
      box = await canvas.boundingBox();
    await page.mouse.move(box.x + 40, box.y + 60);
    await page.mouse.down();
    await page.mouse.move(box.x + 180, box.y + 100, { steps: 15 });
    await page.mouse.up();
    await button('Clear signature').click();
    await button('Confirm & E-Sign', dialog()).click();
    await page.getByRole('alert').waitFor();
    await page.mouse.move(box.x + 45, box.y + 60);
    await page.mouse.down();
    await page.mouse.move(box.x + 190, box.y + 85, { steps: 15 });
    await page.mouse.up();
    await button('Confirm & E-Sign', dialog()).click();
    await waitTitle('Application Successfully Approved');
    await button('Return to Queue').click();
    assert.equal((await state()).applications[1].signature.method, 'draw');
  });
  await check(
    'Rejection validation, reason, refund and queue progression',
    async () => {
      await button('Reject').click();
      await button('Confirm Rejection').click();
      await page.getByRole('alert').waitFor();
      await page
        .getByRole('textbox', { name: 'Rejection Reason *' })
        .fill('Prerequisite certificate is incomplete.');
      await button('Confirm Rejection').click();
      await waitTitle('Application Rejected');
      await button('Return to Queue').click();
      const s = await state();
      assert.equal(s.applications[2].status, 'rejected');
      assert.equal(s.applications[2].refund, 'initiated-demo');
    },
  );
  await check(
    'Query validation, urgency, paused application and disabled review',
    async () => {
      await button('Query Application').click();
      await button('Send Query').click();
      await page.getByRole('alert').waitFor();
      await page
        .getByRole('textbox', { name: 'Specific Details' })
        .fill('Please provide the original prerequisite certificate.');
      await button('Urgent', dialog()).click();
      await button('Send Query').click();
      await waitTitle('Query Sent Successfully');
      await button('Continue').click();
      assert.equal(await button('Approve & E-Sign').isDisabled(), true);
      assert.equal((await state()).applications[3].query.urgency, 'Urgent');
    },
  );
  await check('Roster search, filter, pagination and PDF', async () => {
    await nav('My Student List');
    await page
      .getByRole('textbox', { name: 'Search candidates' })
      .fill('Kavya');
    assert.ok((await page.locator('tbody tr').count()) > 0);
    assert.ok((await page.locator('tbody').innerText()).includes('Kavya'));
    await page.getByRole('textbox', { name: 'Search candidates' }).fill('');
    await button('Filter').click();
    await page
      .getByRole('combobox', { name: 'Status' })
      .selectOption('Pending');
    assert.ok((await page.locator('tbody tr').count()) > 0);
    await page.getByRole('combobox', { name: 'Status' }).selectOption('All');
    await button('Next page').click();
    assert.ok(
      (await page.locator('.pagination').innerText()).includes('Showing 5'),
    );
    await button('Previous page').click();
    const dl = page.waitForEvent('download');
    await button('Export PDF').click();
    await (await dl).saveAs('test-results/roster.pdf');
  });
  await check('Assign candidate slot and update shared state', async () => {
    await page
      .getByRole('button', { name: /Assign slot for Kavya/ })
      .first()
      .click();
    await dialog().waitFor();
    await page
      .getByRole('combobox', { name: 'Examination venue' })
      .selectOption({ index: 1 });
    await button('Confirm Assignment').click();
    await dialog().waitFor({ state: 'hidden' });
    assert.equal((await state()).students[1].status, 'Slot Assigned');
  });
  await check(
    'Calendar selection, session creation, conflict validation and candidates',
    async () => {
      await nav('Exam Slots');
      await page.getByRole('button', { name: 'Select 20 Dec 2026' }).click();
      await page.getByRole('button', { name: /ADD SESSION FOR/ }).click();
      await page.getByRole('spinbutton', { name: 'Max Candidates' }).fill('0');
      await button('Schedule Session').click();
      await page.getByRole('alert').waitFor();
      await page.getByRole('spinbutton', { name: 'Max Candidates' }).fill('8');
      await button('Schedule Session').click();
      await dialog().waitFor({ state: 'hidden' });
      await button('VIEW CANDIDATES').click();
      await page
        .getByText('No candidates are assigned to this session yet.')
        .waitFor();
      await button('Close dialog').click();
      await page.getByRole('button', { name: /ADD SESSION FOR/ }).click();
      await button('Schedule Session').click();
      await page.getByRole('alert').waitFor();
      await page.keyboard.press('Escape');
      await button('Next month').click();
      await waitTitle('January 2027');
    },
  );
  await check(
    'Profile validation and Profile → Security → success',
    async () => {
      await button('Account settings').click();
      await page
        .getByRole('textbox', { name: 'EMAIL ADDRESS' })
        .fill('invalid');
      await button('Save Changes').click();
      await page.getByRole('alert').waitFor();
      await page
        .getByRole('textbox', { name: 'EMAIL ADDRESS' })
        .fill('ramesh@example.com');
      await page
        .getByRole('textbox', { name: 'FIRST NAME' })
        .fill('Dr. Ramesh');
      await button('Save Changes').click();
      await waitTitle('Change Password');
      await page
        .getByLabel('NEW PASSWORD', { exact: true })
        .fill('LongDemoPassword123');
      await button('Save Changes').click();
      await page.getByRole('alert').waitFor();
      await page
        .getByLabel('CURRENT PASSWORD', { exact: true })
        .fill('DemoCurrentPassword');
      await page
        .getByLabel('CONFIRM NEW PASSWORD', { exact: true })
        .fill('mismatch');
      await button('Save Changes').click();
      await page.getByRole('alert').waitFor();
      await page
        .getByLabel('CONFIRM NEW PASSWORD', { exact: true })
        .fill('LongDemoPassword123');
      await page.getByRole('switch').click();
      await button('Save Changes').click();
      await waitTitle('Changes Saved Successfully');
      await button('Continue').click();
      assert.equal((await state()).security.twoFactor, true);
    },
  );
  await check('Photo type and size validation', async () => {
    await button('Profile Information').click();
    const input = page.getByLabel('Upload profile photo');
    await input.setInputFiles({
      name: 'bad.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an image'),
    });
    await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').innerText(), /JPG or PNG/);
    await input.setInputFiles({
      name: 'large.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
    });
    assert.match(await page.getByRole('alert').innerText(), /2 MB/);
  });
  await check('Notifications mark-read and unique load-more', async () => {
    await button('Notifications').click();
    const count = await page.locator('.notification-row').count();
    await button('Load More Notifications').click();
    assert.ok((await page.locator('.notification-row').count()) > count);
    await button('Mark all as read').click();
    assert.ok((await state()).notifications.every((n) => n.read));
  });
  await check(
    'Activity dropdown toggle, outside click, Escape and navigation',
    async () => {
      await button('Recent activity').click();
      await page.locator('.activity-dropdown').waitFor();
      await button('Recent activity').click();
      await page.locator('.activity-dropdown').waitFor({ state: 'hidden' });
      await button('Recent activity').click();
      await page.keyboard.press('Escape');
      await page.locator('.activity-dropdown').waitFor({ state: 'hidden' });
      await button('Recent activity').click();
      await page
        .getByRole('heading', { name: 'Notifications', exact: true })
        .click();
      await page.locator('.activity-dropdown').waitFor({ state: 'hidden' });
      await button('Recent activity').click();
      await nav('Dashboard');
      await page.locator('.activity-dropdown').waitFor({ state: 'hidden' });
    },
  );
  await check('Direct routes and refresh preserve state', async () => {
    for (const path of [
      'dashboard',
      'application-line',
      'students',
      'exam-slots',
      'settings',
      'settings/security',
      'notifications',
    ]) {
      await page.goto(url + '/teacher/' + path);
      await page.locator('.sidebar').waitFor();
    }
    await page.reload();
    await page.locator('.sidebar').waitFor();
    assert.equal((await state()).applications[0].status, 'approved');
  });
  await check('Mobile navigation and viewport overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url + '/teacher/dashboard');
    await button('Open navigation').click();
    await nav('My Student List');
    await waitTitle('Candidate Roster');
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    await button('Open navigation').click();
    await nav('Application Line');
    await button('Open navigation').click();
    await nav('Dashboard');
  });
  await check(
    'Logout protects teacher routes until explicit demo entry',
    async () => {
      await button('Open navigation').click();
      await button('Logout').click();
      await button('Enter Teacher Demo').waitFor();
      await page.goto(url + '/teacher/students');
      await button('Enter Teacher Demo').waitFor();
      assert.equal(
        await page.getByRole('heading', { name: 'Candidate Roster' }).count(),
        0,
      );
      await button('Enter Teacher Demo').click();
      await page.getByRole('heading', { name: /Welcome back/ }).waitFor();
    },
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.evaluate((key) => localStorage.removeItem(key), key);
  await page.goto(url + '/teacher/dashboard');
  await page.getByRole('heading', { name: /Welcome back/ }).waitFor();
  await page.screenshot({
    path: 'test-results/dashboard-desktop.png',
    fullPage: true,
  });
  await check('No browser runtime or console errors', async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await mkdir('test-results', { recursive: true });
  await writeFile(
    'test-results/browser-report.json',
    JSON.stringify({ results, errors }, null, 2),
  );
  await browser.close();
}
