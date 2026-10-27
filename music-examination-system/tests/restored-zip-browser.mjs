import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5000/register');
 assert.equal(await page.locator('.register-page').count(),1);
 assert.deepEqual(await page.locator('.register-panel form input').evaluateAll(es=>es.map(e=>e.name)),['name','email','password']);
 await page.getByLabel('Name',{exact:true}).fill('Original Design');
 await page.getByLabel('Email Address',{exact:true}).fill('original@example.test');
 await page.getByLabel('Password',{exact:true}).fill('Preview123');
 await page.getByRole('button',{name:'Register',exact:true}).click();
 await page.getByRole('dialog').waitFor();
 await page.getByText(/Verification sent to your email/).waitFor();
 await page.getByLabel('Verification code',{exact:true}).fill('1111');
 await page.getByRole('button',{name:'Verify Account',exact:true}).click();
 await page.getByRole('alert').waitFor();
 await page.getByLabel('Verification code',{exact:true}).fill('2673');
 await page.screenshot({path:'qa/portal/original-verification.png',fullPage:true});
 await page.getByRole('button',{name:'Verify Account',exact:true}).click();
 await page.getByRole('heading',{name:'Welcome back, ORIGINAL',exact:true}).waitFor();
 assert.equal(await page.locator('.dashboard-grid').count(),1);
 assert.equal(await page.locator('.p-app').count(),0);
 await page.screenshot({path:'qa/portal/restored-student-dashboard.png',fullPage:true});
 await page.getByRole('button',{name:'New Application',exact:true}).click();
 assert.ok(page.url().includes('/student/application'));
 await page.goto('http://127.0.0.1:5000/login');
 await page.getByLabel('Email Address',{exact:true}).fill('returning@example.test');
 await page.getByLabel('Password',{exact:true}).fill('Preview123');
 await page.getByRole('button',{name:'Log in',exact:true}).click();
 await page.getByLabel('Verification code').fill('2673');
 await page.getByRole('button',{name:'Verify Account'}).click();
 await page.locator('.dashboard-grid').waitFor();
 assert.deepEqual(errors,[]);
 assert.equal(await readFile('src/styles/global.css','utf8'),await readFile('../original-student/music-examination-system/src/styles/global.css','utf8'));

 console.log('PASS: original ZIP CSS/layout retained; three-field registration; existing popup rejects wrong code and accepts 2673; original dashboard and application route; login flow; no browser errors.');
}finally{await browser.close();}

