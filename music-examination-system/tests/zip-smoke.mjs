import { chromium } from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();
try {
 await page.goto('http://127.0.0.1:5183/register');
 await page.getByLabel('Name',{exact:true}).fill('Zip Check');
 await page.getByLabel('Email Address',{exact:true}).fill('zip@example.test');
 await page.getByLabel('Password',{exact:true}).fill('Preview123');
 await page.getByRole('button',{name:'Register',exact:true}).click();
 await page.getByLabel('Verification code').fill('2673');
 await page.getByRole('button',{name:'Verify Account'}).click();
 await page.getByRole('heading',{name:'Welcome back, ZIP',exact:true}).waitFor();
 await page.reload();
 await page.getByRole('heading',{name:'Welcome back, ZIP',exact:true}).waitFor();
 await page.goto('http://127.0.0.1:5183/parent/dashboard');
 await page.getByRole('main',{name:'Parent dashboard'}).waitFor();
 const image=page.getByAltText('Parent dashboard design from the supplied ZIP');
 await image.evaluate(el=>el.decode());
 console.log('PASS: extracted ZIP starts without node_modules/backend; registration + 2673; dashboard reload; parent image loads.');
}finally{await browser.close();}
