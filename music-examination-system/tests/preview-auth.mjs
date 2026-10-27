import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createAuthServer } from '../auth-server/server.mjs';
const {server}=await createAuthServer({database:':memory:'});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage();
 const api=[]; page.on('request',r=>{if(r.url().includes('/api/auth/'))api.push(r.url());});
 for(const role of ['Student','Parent','Student']) {
  await page.goto(`${base}/register`);
  await page.getByRole('button',{name:`Register as ${role}`}).click();
  await page.locator('input[name=name]').fill('Test Applicant');
  await page.locator('input[name=email]').fill('any-email-text');
  await page.locator('input[name=password]').fill('Music1234');
  await page.getByRole('button',{name:'Register',exact:true}).click();
  await page.waitForURL('**/verify-email'); await page.reload();
  await page.getByLabel('Verification Code',{exact:true}).fill('123456');
  await page.getByRole('button',{name:'VERIFY',exact:true}).click();
  await page.waitForURL(`**/${role.toLowerCase()}/dashboard`);
  assert.equal(await page.getByRole('alert').count(),0);
 }
 assert.equal(api.length,0);
 console.log('PASS: any email, duplicate email, refresh, 123456 and both dashboard redirects; no SMTP/API dependency.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
