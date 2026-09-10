import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext();
const page = await context.newPage();
await mkdir('qa/examiner/reference-comparison', { recursive: true });
const comparisons = [];
async function open(route, height) {
  await page.setViewportSize({ width: 1440, height });
  await page.goto(`http://localhost:5173/examiner/${route}`);
  await page.evaluate(() => document.fonts.ready);
}
async function measure(name, selector, reference) {
  const box = await page.locator(selector).first().boundingBox();
  comparisons.push({ name, reference, actual: box, difference: Object.fromEntries(Object.keys(reference).map(k => [k, Math.round((box[k] - reference[k]) * 10) / 10])) });
}
try {
  await open('dashboard', 1345);
  await measure('Dashboard sidebar', '.examiner-sidebar', { x: 0, y: 0, width: 280, height: 1345 });
  await measure('Dashboard first statistic', '.examiner-stat', { x: 358, y: 302, width: 324, height: 202 });
  await measure('Dashboard first session', '.examiner-session-card', { x: 358, y: 651, width: 498, height: 312 });
  await page.screenshot({ path: 'qa/examiner/reference-comparison/dashboard.png', fullPage: true });
  await open('settings', 1227);
  await measure('Settings card', '.examiner-settings-card', { x: 312, y: 318, width: 1071, height: 575 });
  await measure('Settings first-name input', '#examiner-firstName', { x: 345, y: 430, width: 281, height: 44 });
  await page.screenshot({ path: 'qa/examiner/reference-comparison/settings.png', fullPage: true });
  await open('examinations?session=EX-2024-0019', 1368);
  await measure('Examination table', '.examiner-table-scroll', { x: 324, y: 298, width: 1084, height: 492 });
  await measure('Venue image', '.examiner-venue', { x: 324, y: 1008, width: 716, height: 321 });
  await page.screenshot({ path: 'qa/examiner/reference-comparison/examinations.png', fullPage: true });
  await page.getByRole('button', { name: 'Edit evaluation for Sanjay Krishnan', exact: true }).click();
  await page.locator('.examiner-candidate-dialog').screenshot({ path: 'qa/examiner/reference-comparison/candidate-dialog.png' });
  await page.getByRole('button', { name: 'Close evaluation', exact: true }).click();
  await page.getByRole('button', { name: 'SUBMIT RESULTS TO ADMIN', exact: true }).click();
  await page.locator('.examiner-confirm').screenshot({ path: 'qa/examiner/reference-comparison/confirmation-dialog.png' });
  await page.getByRole('button', { name: 'Return to Edit', exact: true }).click();
  await open('examinations?session=EX-2024-0017', 1000);
  await page.getByRole('textbox', { name: 'Marks for Ashwin Pillai', exact: true }).fill('72');
  await page.getByRole('button', { name: 'SUBMIT RESULTS TO ADMIN', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm & Submit', exact: true }).click();
  await page.locator('.examiner-success').screenshot({ path: 'qa/examiner/reference-comparison/success-dialog.png' });
  await writeFile('qa/examiner/reference-comparison/geometry.json', JSON.stringify(comparisons, null, 2));
  console.log(JSON.stringify(comparisons, null, 2));
} finally { await browser.close(); }
