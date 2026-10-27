import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fixture = JSON.parse(await readFile('qa/portal/fixture.json','utf8'));
const browser = await chromium.launch({channel:'chrome',headless:true});
const context = await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage(); const errors=[]; const passed=[];
page.on('pageerror',e=>errors.push(e.message));
const go=path=>page.goto('http://127.0.0.1:5000'+path);
async function check(name,fn){await fn();passed.push(name);console.log('PASS '+name);}
async function login(email){await go('/login');await page.getByLabel('Email Address',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(fixture.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await page.getByRole('button',{name:'Log out'}).waitFor();}
try {
 await check('Registration has exactly Name, Email and Password for Student and Parent',async()=>{await go('/register');assert.deepEqual(await page.locator('form input').evaluateAll(es=>es.map(e=>e.name)),['name','email','password']);await page.getByRole('button',{name:'Register as Parent'}).click();assert.deepEqual(await page.locator('form input').evaluateAll(es=>es.map(e=>e.name)),['name','email','password']);await page.screenshot({path:'qa/portal/registration.png',fullPage:true});});
 await login(fixture.student);
 await check('Empty current-year dashboard',async()=>{await page.getByText(/You have no exams for the current year/).waitFor();await page.screenshot({path:'qa/portal/student-empty.png',fullPage:true});});
 await page.getByRole('button',{name:'Candidate / application'}).click();
 await page.getByLabel('Date of Birth (dd/mm/yyyy)',{exact:true}).fill('01/01/2000');
 await page.getByLabel('Student Photo (required)').setInputFiles('qa/portal/candidate.png');
 await page.getByAltText('Candidate photograph',{exact:true}).waitFor();
 await page.getByLabel('Candidate Signature (required)').setInputFiles('qa/portal/signature.png');
 await page.getByAltText('Uploaded signature').waitFor();
 await page.getByRole('button',{name:'Continue →',exact:true}).click();
 for(let i=0;i<3;i++){await page.getByRole('button',{name:'+ Add subject'}).click();const row=page.locator('.p-subject-row').nth(i);await row.getByLabel('Subject',{exact:true}).selectOption(fixture.subjects[i].subject_id);await row.getByLabel('Level',{exact:true}).selectOption(fixture.subjects[i].level_id);await row.getByLabel('Registered Teacher',{exact:true}).selectOption(fixture.subjects[i].teacher_id);}
 await page.getByRole('button',{name:'Review application →'}).click();
 await check('Complete confirmation, editable signature and Back preserve input',async()=>{await page.getByRole('heading',{name:'Review & confirm'}).waitFor();for(const name of ['Mridangam','Vocal','Violin'])await page.getByRole('cell',{name,exact:true}).waitFor();await page.getByText('Total payment: $300.00').waitFor();await page.getByRole('button',{name:'Edit Signature'}).click();assert.equal(await page.getByLabel('Date of Birth (dd/mm/yyyy)',{exact:true}).inputValue(),'01/01/2000');await page.getByRole('button',{name:'Continue →',exact:true}).click();await page.locator('.p-subject-row').nth(2).waitFor();assert.equal(await page.locator('.p-subject-row').count(),3);await page.getByRole('button',{name:'Review application →'}).click();await page.getByRole('button',{name:'← Back',exact:true}).click();await page.locator('.p-subject-row').nth(2).waitFor();assert.equal(await page.locator('.p-subject-row').count(),3);await page.getByRole('button',{name:'Review application →'}).click();await page.screenshot({path:'qa/portal/confirmation.png',fullPage:true});});
 await page.getByRole('button',{name:'Confirm and Pay',exact:true}).click();
 await check('Three methods, teacher allocation and split balances',async()=>{await page.getByRole('heading',{name:'Confirm and Pay',exact:true}).waitFor();assert.deepEqual(await page.getByLabel('Payment method').locator('option').allTextContents(),['Card Payment','E-transfer','Hand over to Teacher']);await page.getByText('All payment methods are encrypted.',{exact:true}).waitFor();await page.getByLabel('Payment method').selectOption('teacher');await page.getByLabel('Teacher receiving this payment').selectOption(fixture.subjects[0].teacher_id);await page.getByLabel('Amount (CAD)').fill('40');await page.getByRole('button',{name:'Allocate payment',exact:true}).click();await page.getByText('$260.00',{exact:true}).waitFor();await page.screenshot({path:'qa/portal/split-payment.png',fullPage:true});});
 await check('Responsive dashboard at 390px',async()=>{await go('/portal/dashboard');await page.setViewportSize({width:390,height:844});await page.getByRole('heading',{name:/Welcome,/}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'qa/portal/student-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});});
 await page.getByRole('button',{name:'Log out'}).click();await login(fixture.teachers[0]);
 await check('Teacher sees one assigned subject with payment pending',async()=>{await page.getByRole('heading',{name:'Teacher confirmation requests'}).waitFor();assert.equal(await page.locator('.p-card').filter({hasText:'Subject Index Number:'}).count(),1);await page.getByText('Awaiting confirmed payment',{exact:true}).waitFor();await page.screenshot({path:'qa/portal/teacher.png',fullPage:true});});
 await page.getByRole('button',{name:'Log out'}).click();await login(fixture.admin);await page.getByRole('link',{name:'Accounts & approvals',exact:true}).click();
 await check('Admin approval controls',async()=>{await page.getByRole('heading',{name:'Accounts & approvals',exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'Approve',exact:true}).count()>0);await page.screenshot({path:'qa/portal/admin-approvals.png',fullPage:true});});
 await page.getByRole('link',{name:'Applications',exact:true}).click();
 await check('Admin candidate PDF print link',async()=>{const link=page.getByRole('link',{name:'Print candidate card / QR'});await link.waitFor();const res=await context.request.get('http://127.0.0.1:5000'+await link.getAttribute('href'));assert.equal(res.status(),200);await writeFile('qa/portal/candidate-card.pdf',await res.body());});
 assert.deepEqual(errors,[]);await writeFile('qa/portal/browser-results.json',JSON.stringify({passed,errors},null,2));
}finally{await browser.close();}




