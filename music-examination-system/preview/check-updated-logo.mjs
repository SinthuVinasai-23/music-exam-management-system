import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto('http://127.0.0.1:5174/?logo=icfa');await page.waitForLoadState('networkidle');const logo=page.locator('.eh-header .eh-brand img');assert.ok(await logo.evaluate(i=>i.complete&&i.naturalWidth>0&&i.getAttribute('src')==='/icfa-official-logo.png'));assert.equal(await logo.evaluate(i=>Math.round(i.getBoundingClientRect().width)),64);await page.screenshot({path:'preview/icfa-home-logo.png',fullPage:true});console.log('PASS updated home logo loaded at 64px');}finally{await browser.close()}

