import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
const base='http://127.0.0.1:5174';
const session=await(await page.request.get(base+'/api/portal/session')).json();
assert.equal((await page.request.post(base+'/api/portal/preview-admin-login',{headers:{'X-CSRF-Token':session.csrf},data:{email:'demo',password:'demo'}})).status(),200);
await page.goto(base+'/dashboard/admin/results');
await page.getByRole('button',{name:'Review Session',exact:true}).first().click();
await page.getByRole('dialog').getByText('Class Average',{exact:true}).waitFor();
await page.screenshot({path:'preview/admin-session-review.png',fullPage:true});
await page.getByRole('button',{name:'Review Individual',exact:true}).first().click();
await page.getByRole('dialog',{name:'Review Examination Result'}).waitFor();
await page.getByRole('button',{name:'Back to Session Review',exact:true}).click();
await page.getByRole('dialog').getByText('Class Average',{exact:true}).waitFor();
assert.deepEqual(errors,[]);
console.log('PASS session and individual review navigation');
} finally {await browser.close()}
