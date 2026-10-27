import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const base=process.env.BASE_URL||'http://127.0.0.1:5174';await mkdir('test-results/registration-design',{recursive:true});
try {
 for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[1024,768],[768,1024],[390,844],[375,667]]){
  await page.setViewportSize({width,height});await page.goto(base+'/register');await page.getByRole('heading',{name:'Join the Ensemble'}).waitFor();
  for(const mode of ['landing','student','parent']){
   if(mode!=='landing')await page.getByRole('button',{name:'Register as '+(mode==='student'?'Student':'Parent'),exact:true}).click();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${mode}: overflow`);
   assert.ok(await page.locator('.ensemble-image img').evaluate(img=>img.complete&&img.naturalWidth>0));
   const inputs=page.locator('.ensemble-form input');assert.equal(await inputs.count(),mode==='landing'?0:mode==='student'?7:11);
   if(mode!=='landing'){
    for(const input of await inputs.all()){const box=await input.boundingBox();assert.ok(box.width>=130&&box.height>=40,`${width}: cramped input`);assert.ok(box.x>=0&&box.x+box.width<=width,`${width}: clipped input`);}
    await page.getByLabel('Password',{exact:true}).fill('Music1234');await page.getByRole('button',{name:'Show Password',exact:true}).click();assert.equal(await page.getByLabel('Password',{exact:true}).getAttribute('type'),'text');await page.getByRole('button',{name:'Hide Password',exact:true}).click();assert.equal(await page.getByLabel('Password',{exact:true}).getAttribute('type'),'password');
    assert.equal(await page.getByLabel('Date of Birth',{exact:true}).getAttribute('type'),'date');
   }
   await page.screenshot({path:`test-results/registration-design/${width}-${mode}.png`,fullPage:true});
  }
 }
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/register');await page.getByRole('button',{name:'Toggle website navigation'}).click();await page.getByRole('link',{name:'Resources',exact:true}).click();await page.waitForURL('**/faq');
 await page.goto(base+'/register');await page.getByRole('button',{name:'Register as Student',exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await page.getByRole('button',{name:'Register as Student',exact:true}).getAttribute('aria-pressed'),'true');await page.getByLabel('Date of Birth',{exact:true}).fill('2013-05-10');await page.getByRole('alert').filter({hasText:'under 16'}).waitFor();assert.equal(await page.getByLabel('Date of Birth',{exact:true}).getAttribute('aria-invalid'),'true');
 assert.deepEqual(errors,[]);console.log('PASS: 21 viewport/state combinations, all fields, image, password visibility, date inputs, keyboard selector, mobile navigation and inline age validation.');
}finally{await browser.close()}
