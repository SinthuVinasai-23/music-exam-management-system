import {chromium} from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(10000);
for(const path of ['dashboard','application-line','students','exam-slots','settings','settings/security','notifications']) {await page.goto('http://127.0.0.1:5173/teacher/'+path);await page.locator('.sidebar').waitFor();await page.screenshot({path:'test-results/'+path.replaceAll('/','-')+'.png',fullPage:true});}
await page.goto('http://127.0.0.1:5173/staff-login');console.log(await page.locator('body').innerText());await page.screenshot({path:'test-results/staff.png'});await browser.close();
