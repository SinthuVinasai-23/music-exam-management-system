import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1100}});
const page=await context.newPage(),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const base=process.env.TEST_URL||'http://127.0.0.1:5173';
const key='mems-supervisor-v1';
const btn=(name)=>page.getByRole('button',{name,exact:true});
const heading=(name)=>page.getByRole('heading',{name,exact:true});
async function visible(locator){await locator.waitFor({state:'visible',timeout:8000});}
async function test(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS '+name);}
async function go(path){await page.goto(base+path);await visible(page.locator('.sv-main'));}
async function state(){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);}
async function close(){await btn('Continue').click();}
try {
await test('Staff Login selects Supervisor and opens dashboard',async()=>{
 await page.goto(base+'/staff-login');await page.locator('input[type=email]').fill('supervisor@example.com');await page.locator('input[type=password]').fill('DemoPassword123!');await btn('LOGIN →').click();await btn('Supervisor').click();await visible(heading('Examination Center'));
});
await test('Dashboard session opens correct roster; incomplete submission blocked',async()=>{
 await page.locator('.sv-session-card').first().click();await visible(page.getByRole('heading',{name:/Attendance Roster: Mozart Hall/}));await btn('Submit Attendance & End Session').click();await visible(page.getByRole('alert'));assert.match(await page.getByRole('alert').innerText(),/incomplete/);await btn('Check Again').click();
});
await test('Manual verification candidate, document preview, missing document validation, success',async()=>{
 await page.getByRole('row').filter({hasText:'Sanjay Krishnan'}).getByRole('link',{name:'Manual Verify'}).click();await visible(heading('Manual Verification'));assert.match(await page.getByRole('dialog').innerText(),/819-MUS-24/);await btn('View ID Card').click();await visible(heading('ID Card'));await btn('Close preview').click();await page.getByRole('checkbox',{name:/ID Card/}).uncheck();await btn('Confirm Identity & Verify').click();await visible(page.getByRole('alert'));await btn('Check Again').click();await page.getByRole('checkbox',{name:/ID Card/}).check();await btn('Confirm Identity & Verify').click();await visible(heading('Candidate Verified Successfully'));await close();assert.equal((await state()).candidates[1].status,'verified');
});
await test('Sidebar Verification, invalid code denial, valid code verification and admission',async()=>{
 await page.getByRole('link',{name:'Verification',exact:true}).click();await visible(heading('Candidate Verification'));await page.locator('#admission-code').fill('invalid');await btn('Search').click();await visible(heading('Access Denied'));await btn('Check Again').click();await page.locator('#admission-code').fill('MUS-7K9P-2X4Q');await btn('Search').click();await visible(heading('Ananya Nair'));assert.equal((await state()).candidates[0].status,'verified');await btn('Verify & Admit Candidate').click();await visible(heading('Candidate Admitted Successfully'));await close();assert.equal((await state()).candidates[0].status,'admitted');assert.equal(await btn('Verify & Admit Candidate').isDisabled(),true);
});
await test('Used code and cross-session lookup denied without mutation',async()=>{
 await page.locator('#admission-code').fill('772-ART-24');await btn('Search').click();await visible(heading('Access Denied: Code Already Used'));await btn('Check Again').click();await page.locator('#admission-code').fill('630-DAN-24');await btn('Search').click();await visible(heading('Access Denied: Unauthorized Session'));await btn('Switch Session').click();await visible(heading('Select Venue'));
});
await test('View Roster preserves alternate session and candidate; search and filters',async()=>{
 await page.locator('.sv-venue').filter({hasText:'Thillana Studio'}).getByRole('link',{name:'View Roster'}).click();await visible(page.getByRole('heading',{name:/Attendance Roster: Thillana/}));await visible(page.getByRole('link',{name:'Meera Kumar'}));await page.getByRole('textbox',{name:'Search candidates',exact:true}).fill('missing');await visible(page.getByText('No candidates match your search or filter.'));await page.getByRole('textbox',{name:'Search candidates',exact:true}).fill('');await page.getByRole('link',{name:'Manual Verify'}).click();await btn('Confirm Identity & Verify').click();await visible(heading('Candidate Verified Successfully'));await close();await btn('verified').click();await visible(page.getByRole('link',{name:'Meera Kumar'}));
});
await test('Pending candidate cannot be admitted by direct candidate URL',async()=>{
 await go('/supervisor/verification/mozart?candidate=441-MUS-24');await visible(heading('Siddharth Rajan'));assert.equal(await btn('Verify & Admit Candidate').isDisabled(),true);await page.getByRole('link',{name:'Manual Verify',exact:true}).click();await btn('Cancel').click();
});
await test('Absent action and completed attendance submission persist session closure',async()=>{
 await go('/supervisor/attendance/mozart');await btn('Actions for Siddharth Rajan').click();await btn('Mark absent').click();await btn('Submit Attendance & End Session').click();await visible(heading('Attendance Submitted Successfully'));await btn('Return to Dashboard').click();await visible(heading('Examination Center'));await go('/supervisor/attendance/mozart');assert.equal(await btn('Attendance Submitted · Session Closed').isDisabled(),true);
});
for(const route of ['/supervisor','/supervisor/verification/thillana','/supervisor/attendance','/supervisor/attendance/thillana']) {
 await test('Settings and bell from '+route,async()=>{
  await go(route);await page.getByRole('link',{name:'Account settings',exact:true}).click();await visible(heading('Account Settings'));assert.match(await btn('Profile Information').getAttribute('class'),/active/);await btn('Security').click();await page.getByRole('link',{name:'Account settings',exact:true}).click();assert.match(await btn('Profile Information').getAttribute('class'),/active/);await go(route);await btn('Notifications').click();await visible(heading('Notifications'));
 });
}
await test('Profile validates, persists, then opens Security; security validates and saves',async()=>{
 await page.getByRole('link',{name:'Account settings',exact:true}).click();await page.getByLabel('FIRST NAME',{exact:true}).fill('');await btn('Save Changes').click();await visible(page.getByRole('alert'));await page.getByLabel('FIRST NAME',{exact:true}).fill('Mr. Venkat Updated');await btn('Save Changes').click();await visible(heading('Change Password'));await page.getByLabel('NEW PASSWORD',{exact:true}).fill('short');await btn('Save Changes').click();await visible(page.getByRole('alert'));await page.getByLabel('CURRENT PASSWORD',{exact:true}).fill('DemoOriginal123');await page.getByLabel('CONFIRM NEW PASSWORD',{exact:true}).fill('short');await btn('Save Changes').click();assert.match(await page.getByRole('alert').innerText(),/12 characters/);await page.getByLabel('NEW PASSWORD',{exact:true}).fill('NewDemoPassword123!');await btn('Save Changes').click();assert.match(await page.getByRole('alert').innerText(),/do not match/);await page.getByLabel('CONFIRM NEW PASSWORD',{exact:true}).fill('NewDemoPassword123!');await page.getByRole('switch').click();await btn('Save Changes').click();await visible(heading('Changes Saved Successfully'));await close();assert.equal((await state()).profile.firstName,'Mr. Venkat Updated');assert.equal(JSON.stringify(await state()).includes('NewDemoPassword123!'),false);
});
await test('Notifications mark read persists; Recent dropdown toggles/outside/Escape',async()=>{
 await btn('Notifications').click();await btn('Mark all as read').click();assert.equal(await page.locator('.sv-notification-list .unread').count(),0);await page.reload();assert.equal(await page.locator('.sv-notification-list .unread').count(),0);await btn('Activity history and sync').click();await visible(page.locator('.sv-recent'));await btn('Activity history and sync').click();assert.equal(await page.locator('.sv-recent').count(),0);await btn('Activity history and sync').click();await heading('Notifications').click();assert.equal(await page.locator('.sv-recent').count(),0);await btn('Activity history and sync').click();await page.keyboard.press('Escape');assert.equal(await page.locator('.sv-recent').count(),0);
});
await test('Direct routes refresh and browser history; unauthorized route blocked',async()=>{
 await go('/supervisor/attendance');await page.locator('.sv-venue').first().getByRole('link',{name:'View Roster'}).click();await page.goBack();await visible(heading('Select Venue'));await page.goForward();await visible(page.getByRole('heading',{name:/Attendance Roster:/}));await page.reload();await visible(page.getByRole('heading',{name:/Attendance Roster:/}));await go('/supervisor/verification/unauthorized');await visible(heading('Access Denied: Unauthorized Session'));
});
await mkdir('test-results/supervisor',{recursive:true});
await test('Desktop screenshots and mobile layout have no horizontal page overflow',async()=>{
 for(const [name,route] of [['dashboard',''],['venues','/attendance'],['roster','/attendance/mozart'],['verification','/verification/mozart?candidate=772-ART-24'],['account','/account'],['notifications','/notifications']]){await go('/supervisor'+route);await page.screenshot({path:`test-results/supervisor/${name}.png`,fullPage:true});}
 await page.setViewportSize({width:390,height:844});for(const route of ['','/attendance','/attendance/mozart','/account','/verification/mozart']){await go('/supervisor'+route);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'overflow '+route);}await page.screenshot({path:'test-results/supervisor/mobile.png',fullPage:true});
});
await test('No significant browser console errors',async()=>assert.deepEqual(errors,[]));
} finally {await mkdir('test-results/supervisor',{recursive:true});await writeFile('test-results/supervisor/results.json',JSON.stringify({results,errors},null,2));await browser.close();}
