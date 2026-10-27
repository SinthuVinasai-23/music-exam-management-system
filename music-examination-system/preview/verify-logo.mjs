import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 const supplied=await readFile('C:/Users/amera/Music/Restored Tamil Cultural Arts Logo.png');const copy=await readFile('public/icfa-logo.png');assert.equal(createHash('sha256').update(supplied).digest('hex'),createHash('sha256').update(copy).digest('hex'));
 for(const route of ['/','/register','/login']){await page.goto('http://127.0.0.1:5173'+route);await page.waitForLoadState('networkidle');const logos=page.locator('img[src="/icfa-logo.png"]');assert.ok(await logos.count()>0);assert.ok(await logos.first().evaluate(i=>i.complete&&i.naturalWidth>0));}
 await page.goto('http://127.0.0.1:5173/register');await page.waitForLoadState('networkidle');await page.screenshot({path:'preview/icfa-registration-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'preview/icfa-registration-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual(errors,[]);await writeFile('preview/logo-checks.json',JSON.stringify({logoUnchanged:true,routes:['/','/register','/login'],mobileOverflow:false,pageErrors:errors},null,2));console.log('PASS supplied image preserved, home/register/login logos, desktop/mobile preview, no page errors');
}finally{await browser.close()}
