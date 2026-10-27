import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1345 } });
const page = await context.newPage();
const failures = [], passed = [], browserErrors = [];
page.on('pageerror', e => browserErrors.push(e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') browserErrors.push(m.text()); });
await mkdir('qa/examiner', { recursive: true });
const go = async route => { await page.goto(`http://localhost:5173${route}`); await page.locator('#root').waitFor(); await page.evaluate(() => document.fonts.ready); };
const shot = async name => page.screenshot({ path: `qa/examiner/${name}.png`, fullPage: true });
async function check(name, fn) { try { await fn(); passed.push(name); console.log(`PASS ${name}`); } catch (e) { failures.push({ name, error: e.message }); console.log(`FAIL ${name}: ${e.message}`); } }
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('music-examiner-v1')));
try {
  await go('/examiner/dashboard');
  await shot('dashboard-1440');
  await check('1 Continue Grading selects correct session', async () => {
    await page.getByRole('article').filter({ hasText: 'Raga Hall' }).getByRole('button', { name: 'Continue Grading' }).click();
    assert.match(page.url(), /examinations\?session=EX-2024-0017/);
    await page.getByRole('heading', { name: 'Bharatanatyam - Grade 5 Performance Evaluation', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.scrollY), 0);
  });
  await check('2 Start Grading initializes selected session', async () => {
    await go('/examiner/dashboard');
    await page.getByRole('button', { name: 'Start Grading', exact: true }).click();
    assert.match(page.url(), /EX-2024-0018/);
    assert.equal((await stored()).sessions.find(s => s.id === 'EX-2024-0018').status, 'Draft');
  });
  await go('/examiner/examinations?session=EX-2024-0017');
  await check('3 Marks validation and derived grade', async () => {
    const input = page.getByRole('textbox', { name: 'Marks for Sanjay Krishnan', exact: true });
    for (const value of ['-1', '101', 'abc']) { await input.fill(value); assert.equal(await input.inputValue(), '88'); }
    await input.fill('95');
    assert.match(await input.locator('xpath=ancestor::tr').innerText(), /Distinction/);
    assert.equal(await page.getByRole('textbox', { name: 'Marks for Shruti Iyer', exact: true }).inputValue(), '94');
  });
  await check('4 Feedback and draft survive refresh', async () => {
    await page.getByRole('button', { name: 'Edit evaluation for Sanjay Krishnan', exact: true }).click();
    await page.getByLabel('Technical Proficiency', { exact: true }).fill('Accurate intonation and phrasing.');
    await shot('candidate-feedback');
    await page.getByRole('button', { name: 'Save Feedback' }).click();
    await page.getByRole('button', { name: 'SAVE AS DRAFT', exact: true }).click();
    await page.reload();
    assert.equal(await page.getByRole('textbox', { name: 'Marks for Sanjay Krishnan', exact: true }).inputValue(), '95');
    const session = (await stored()).sessions.find(s => s.id === 'EX-2024-0017');
    assert.ok(session.lastSaved);
    assert.equal(session.candidates[0].feedback.technical, 'Accurate intonation and phrasing.');
  });
  await check('5 Submit opens confirmation; incomplete submission is blocked', async () => {
    await page.getByRole('button', { name: 'SUBMIT RESULTS TO ADMIN', exact: true }).click();
    await page.getByRole('dialog', { name: 'Submit Final Results?' }).waitFor();
    await shot('confirm-submission');
    await page.getByRole('button', { name: 'Confirm & Submit', exact: true }).click();
    assert.match(await page.getByRole('alert').innerText(), /need marks/);
  });
  await check('6 Return to Edit preserves state and route', async () => {
    await page.getByRole('button', { name: 'Return to Edit', exact: true }).click();
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.match(page.url(), /EX-2024-0017/);
    assert.equal(await page.getByRole('textbox', { name: 'Marks for Sanjay Krishnan', exact: true }).inputValue(), '95');
  });
  await check('7 Confirm submits for admin review and shows success', async () => {
    await page.getByRole('textbox', { name: 'Marks for Ashwin Pillai', exact: true }).fill('72');
    await page.getByRole('button', { name: 'SUBMIT RESULTS TO ADMIN', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm & Submit', exact: true }).click();
    await page.getByRole('dialog', { name: 'Evaluation Finalized Successfully' }).waitFor();
    const session = (await stored()).sessions.find(s => s.id === 'EX-2024-0017');
    assert.equal(session.status, 'Submitted for Admin Review');
    assert.equal(session.published, false);
    assert.ok(session.submittedAt);
    await shot('submission-success');
  });
  await check('8 Success returns to dashboard and reflects submission', async () => {
    await page.getByRole('button', { name: 'RETURN TO DASHBOARD', exact: true }).click();
    assert.match(page.url(), /examiner\/dashboard$/);
    assert.match(await page.getByRole('article').filter({ hasText: 'Raga Hall' }).innerText(), /Submitted/);
  });
  await check('9 Evaluations navigation', async () => {
    await page.getByRole('navigation', { name: 'Examiner navigation' }).getByRole('link', { name: 'Evaluations', exact: true }).click();
    await page.getByRole('heading', { name: 'Completed Evaluations', exact: true }).waitFor();
    await shot('evaluations');
  });
  await check('10 View Details opens selected read-only sheet', async () => {
    await page.locator('.examiner-record').filter({ hasText: 'Shruti Iyer' }).first().getByRole('button', { name: 'View Details' }).click();
    await page.getByRole('dialog', { name: 'Examination evaluation for Shruti Iyer' }).waitFor();
    assert.ok(await page.getByLabel('Technical Proficiency', { exact: true }).getAttribute('readonly') !== null);
    assert.match(page.url(), /evaluations$/);
  });
  await check('11 Close Details stays in evaluations', async () => {
    await page.getByRole('button', { name: 'Close evaluation', exact: true }).click();
    assert.equal(await page.getByRole('dialog').count(), 0);
  });
  for (const [n, route] of [[12, 'dashboard'], [13, 'examinations'], [14, 'evaluations']]) await check(`${n} Settings gear from ${route} opens Profile`, async () => {
    await go(`/examiner/${route}`);
    await page.getByRole('button', { name: 'Account settings', exact: true }).click();
    assert.equal(await page.getByRole('tab', { name: 'Profile Information' }).getAttribute('aria-selected'), 'true');
  });
  await shot('settings-profile');
  await check('16 Invalid profile and image are rejected', async () => {
    await page.getByLabel('EMAIL ADDRESS', { exact: true }).fill('bad-email');
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    assert.match(await page.getByRole('alert').innerText(), /valid email/i);
    await page.getByLabel('EMAIL ADDRESS', { exact: true }).fill('subramaniam@aria-academy.edu');
    await page.getByLabel('Profile image', { exact: true }).setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') });
    assert.match(await page.getByRole('alert').last().innerText(), /JPG or PNG/);
    await page.getByLabel('Profile image', { exact: true }).setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(2097153) });
    assert.match(await page.getByRole('alert').last().innerText(), /2MB/);
    await page.getByLabel('Profile image', { exact: true }).setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNuoAAAAASUVORK5CYII=', 'base64') });
    await page.waitForTimeout(250);
  });
  await check('15 Profile save updates identity and opens Security', async () => {
    await page.getByLabel('FIRST NAME', { exact: true }).fill('Dr. Test Examiner');
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await page.locator('[role=tab][aria-selected=true]').filter({ hasText: /^Security$/ }).waitFor();
    assert.equal(await page.getByRole('tab', { name: 'Security', exact: true }).getAttribute('aria-selected'), 'true');
    assert.match(await page.locator('.examiner-identity').innerText(), /Dr. Test Examiner/);
    await shot('settings-security');
  });
  await check('17 Security save shows Account Saved without persisting passwords', async () => {
    await page.getByLabel('CURRENT PASSWORD', { exact: true }).fill('OldSecret123!');
    await page.getByLabel('NEW PASSWORD', { exact: true }).fill('NewSecret456!');
    await page.getByLabel('CONFIRM NEW PASSWORD', { exact: true }).fill('NewSecret456!');
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await page.getByRole('dialog', { name: 'Account Saved', exact: true }).waitFor();
    assert.ok(!JSON.stringify(await stored()).includes('Secret'));
    assert.equal(await page.getByLabel('NEW PASSWORD', { exact: true }).inputValue(), '');
    await shot('account-saved');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Account settings', exact: true }).click();
    await page.locator('[role=tab][aria-selected=true]').filter({ hasText: /^Profile Information$/ }).waitFor();
    assert.equal(await page.getByRole('tab', { name: 'Profile Information' }).getAttribute('aria-selected'), 'true');
  });
  await check('18 Bell opens notifications from shared header routes', async () => {
    for (const route of ['dashboard', 'examinations', 'evaluations', 'settings']) {
      await go(`/examiner/${route}`);
      await page.getByRole('button', { name: 'Notifications', exact: true }).click();
      assert.match(page.url(), /notifications$/);
    }
    await shot('notifications');
  });
  await check('19 Recent tasks toggle, outside click and Escape', async () => {
    const clock = page.getByRole('button', { name: 'Recent tasks', exact: true });
    await clock.click(); assert.equal(await clock.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape'); assert.equal(await clock.getAttribute('aria-expanded'), 'false');
    await clock.click(); await page.locator('h1').click(); assert.equal(await clock.getAttribute('aria-expanded'), 'false');
    await clock.click(); await clock.click(); assert.equal(await clock.getAttribute('aria-expanded'), 'false');
  });
  await check('20 Search stays within assigned records', async () => {
    await go('/examiner/examinations?session=EX-2024-0019');
    await page.getByRole('textbox', { name: 'Search assigned applications' }).fill('PNO-3-9821');
    assert.equal(await page.locator('tbody tr').count(), 1);
    assert.match(await page.locator('tbody').innerText(), /Sanjay/);
    await page.getByRole('textbox', { name: 'Search assigned applications' }).fill('unassigned-record');
    assert.equal(await page.locator('tbody tr').count(), 0);
    await go('/examiner/examinations?session=UNASSIGNED');
    assert.match(await page.locator('h1').innerText(), /unavailable/);
  });
  await check('21 Direct routes refresh without failures', async () => {
    for (const route of ['dashboard', 'examinations', 'evaluations', 'settings', 'notifications']) { await go(`/examiner/${route}`); await page.reload(); assert.ok(await page.locator('h1').innerText()); }
  });
  await check('22 Public and student regression routes', async () => {
    for (const route of ['/', '/faq', '/contact', '/register', '/student/dashboard', '/student/application', '/student/application/selection', '/student/application/confirmation', '/student/payment', '/student/applications', '/student/status', '/student/admission', '/student/results', '/student/ceremony']) {
      await go(route); assert.ok((await page.locator('#root').innerText()).length > 50, route);
    }
  });
  await check('Pagination and saved session survive navigation', async () => {
    await go('/examiner/examinations?session=EX-2024-0019');
    await page.getByRole('button', { name: 'Page 2', exact: true }).click();
    await page.getByRole('button', { name: 'SAVE AS DRAFT', exact: true }).click();
    await page.reload();
    assert.equal(await page.getByRole('button', { name: 'Page 2', exact: true }).getAttribute('aria-current'), 'page');
    await page.getByRole('button', { name: 'Page 1', exact: true }).click();
    await shot('examinations-1440');
  });
  await check('Desktop and mobile overflow checks', async () => {
    for (const width of [1366, 1440, 1536, 1920, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      for (const route of ['dashboard', 'examinations', 'evaluations', 'settings', 'notifications']) {
        await go(`/examiner/${route}`);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} overflows at ${width}`);
        await shot(`${route}-${width}`);
      }
    }
  });
  assert.equal(browserErrors.length, 0, browserErrors.join('\n'));
} finally {
  await writeFile('qa/examiner/results.json', JSON.stringify({ passed, failures, browserErrors }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ passed: passed.length, failures, browserErrors }, null, 2));
if (failures.length || browserErrors.length) process.exitCode = 1;
