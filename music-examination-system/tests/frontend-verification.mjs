import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 for (const role of ['Student','Parent']) {
  await page.goto('http://127.0.0.1:5000/register');
  await page.getByRole('button',{name:'Register as '+role}).click();
  await page.getByLabel('Name',{exact:true}).fill('Preview '+role);
  await page.getByLabel('Email Address',{exact:true}).fill(role.toLowerCase()+'@example.test');
  await page.getByLabel('Password',{exact:true}).fill('preview');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.getByText(/Verification sent to your email/).waitFor();
  await page.getByLabel('Verification code').fill('1111');
  await page.getByRole('button',{name:'Verify and continue'}).click();
  await page.getByRole('alert').filter({hasText:'Incorrect verification code'}).waitFor();
  await page.getByLabel('Verification code').fill('2673');
  await page.getByRole('button',{name:'Verify and continue'}).click();
  await page.getByRole('heading',{name:role==='Student'?'Welcome, Preview':'Your family, in harmony',exact:true}).waitFor();
  await page.reload();
  await page.getByRole('button',{name:'Log out',exact:true}).waitFor();
  await page.getByRole('button',{name:'Log out',exact:true}).click();
  console.log('PASS '+role+': wrong code rejected, 2673 opens dashboard, refresh retains preview session.');
 }
 await page.goto('http://127.0.0.1:5000/login');
 await page.getByLabel('Email Address',{exact:true}).fill('demo@example.test');
 await page.getByLabel('Password',{exact:true}).fill('preview');
 await page.getByRole('button',{name:'Log in',exact:true}).click();
 await page.getByLabel('Verification code').fill('2673');
 await page.getByRole('button',{name:'Verify and continue'}).click();
 await page.getByRole('heading',{name:'Welcome, demo',exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS login verification and no browser errors.');
}finally{await browser.close();}
