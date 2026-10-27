// Local-only integration fixtures; no messages or real bookings are sent.
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {Client} = require('pg');
const bcrypt = require('bcrypt');
const {chromium} = require('@playwright/test');
require('dotenv').config({quiet:true});
const base = process.env.SEO_TEST_BASE || 'http://127.0.0.1:5098';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
assert.ok(['127.0.0.1','localhost'].includes(new URL(process.env.DATABASE_URL).hostname));
const db = new Client({connectionString:process.env.DATABASE_URL});
const owner=randomUUID(), blocked=randomUUID(), salon=randomUUID(), draft=randomUUID(), hidden=randomUUID(), service=randomUUID();
const password=randomUUID();
const hostile='SEO </script><script>window.__seoInjected=true</script> $&';
let browser;
async function get(path, status=200) {
  const response=await fetch(base+path,{redirect:'manual'});
  assert.equal(response.status,status,path);
  return {response,html:await response.text()};
}
(async()=>{
 await db.connect();
 try {
  await db.query('INSERT INTO users(id,email,is_blocked) VALUES($1,$2,false),($3,$4,true)',[owner,`seo-${owner}@example.invalid`,blocked,`seo-${blocked}@example.invalid`]);
  if (process.env.SEO_TEST_LOGIN === '1') {
    await db.query('UPDATE users SET password_hash=$2,email_verified=true WHERE id=$1',[owner,await bcrypt.hash(password,10)]);
    await db.query("INSERT INTO user_profiles(user_id,role,full_name) VALUES($1,'client','SEO test')",[owner]);
  }
  for(const [id,user,status] of [[salon,owner,'active'],[draft,owner,'draft'],[hidden,blocked,'active']])
    await db.query("INSERT INTO salons(id,owner_id,name,city,address,latitude,longitude,phone,status,is_active) VALUES($1,$2,$3,'Ташкент','SEO fixture',41,69,'+998000000000',$4,true)",[id,user,JSON.stringify({ru:hostile,uz:hostile,en:hostile}),status]);
  await db.query("INSERT INTO services(id,salon_id,name,category,audience,price_min,duration,is_active) VALUES($1,$2,$3,'manicure','unisex',76543,35,true)",[service,salon,JSON.stringify({ru:'Тестовый маникюр',uz:'Sinov manikyuri',en:'Test manicure'})]);
  const xml=(await get('/sitemap.xml')).html;
  assert.ok(!xml.includes(draft)&&!xml.includes(hidden));
  assert.ok(!xml.includes('/auth')&&!xml.includes('search?'));
  for(const lang of ['ru','uz','en']) {
    for(const path of [`/${lang}`,`/${lang}/search`,`/${lang}/tashkent/manicure`,`/${lang}/salon/${salon}`]) {
      const {html}=await get(path);
      assert.ok(html.includes(`<html lang="${lang}"`),path);
      assert.ok(html.includes('<h1'),path);
      assert.ok(html.includes('76 543'),path);
      assert.ok(html.includes(`href="https://aurelle.uz${path}"`),path);
      assert.equal((html.match(/rel="alternate"/g)||[]).length,4,path);
      assert.ok(!html.includes('<script>window.__seoInjected'),path);
      const data=JSON.parse(html.match(/<script id="public-document" type="application\/json">([\s\S]*?)<\/script>/)[1]);
      assert.ok(!JSON.stringify(data).includes(owner), 'No owner/account ID in public document');
      assert.ok(xml.includes(`https://aurelle.uz${path}`),'Sitemap localized route');
    }
  }
  for(const path of [`/en/salon/${draft}`,`/en/salon/${hidden}`,'/en/salon/nonexistent','/en/master/nonexistent','/en/tashkent/nonexistent','/en/nope/nope']) {
    const {response}=await get(path,404); assert.match(response.headers.get('x-robots-tag'),/noindex/);
  }
  const legacy=await get(`/salon/${salon}?serviceId=${service}`,301);
  assert.equal(legacy.response.headers.get('location'),`/ru/salon/${salon}?serviceId=${service}`);
  assert.ok(!(await get('/en?utm_source=test')).html.includes('content="noindex'));
  assert.match((await get('/en/search?category=manicure')).response.headers.get('x-robots-tag'),/noindex/);
  assert.match((await get('/auth')).response.headers.get('x-robots-tag'),/noindex/);
  browser=await chromium.launch({headless:true});
  const nojs=await browser.newContext({javaScriptEnabled:false});
  const pageNojs=await nojs.newPage();
  await pageNojs.goto(`${base}/en/tashkent/manicure`);
  assert.equal(await pageNojs.locator('h1').textContent(),'Manicure · Tashkent');
  assert.ok(await pageNojs.getByText('Test manicure',{exact:true}).count());
  await nojs.close();
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage(); const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/en/tashkent/manicure`);
  await page.waitForFunction(()=>document.querySelector('meta[name="robots"]')?.content==='index, follow');
  await page.getByRole('link',{name:'UZ',exact:true}).click();
  await page.waitForURL('**/uz/tashkent/manicure');
  await page.waitForFunction(()=>document.documentElement.lang==='uz');
  assert.equal(await page.locator('h1').textContent(),'Manikyur · Toshkent');
  await page.goto(`${base}/en/salon/${salon}`);
  await page.waitForFunction(()=>document.querySelector('[data-testid="tab-services"]'));
  assert.equal(await page.evaluate(()=>window.__seoInjected),undefined);
  assert.equal(await page.locator('link[rel="canonical"]').count(),1);
  assert.equal(await page.locator('link[rel="alternate"]').count(),4);
  await page.goto(`${base}/en/salon/${salon}?serviceId=${service}`);
  await page.waitForURL('**/auth');
  const saved=await page.evaluate(()=>({pending:JSON.parse(sessionStorage.getItem('pendingBooking')),redirect:sessionStorage.getItem('redirectAfterLogin')}));
  assert.equal(saved.pending.serviceId,service);
  assert.equal(saved.redirect,`/en/salon/${salon}`);
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  if (process.env.SEO_TEST_LOGIN === '1') {
    await page.getByRole('textbox',{name:'Email',exact:true}).fill(`seo-${owner}@example.invalid`);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole('button',{name:'Enter workspace',exact:true}).click();
    await page.waitForURL(`**/en/salon/${salon}`);
    await page.getByRole('dialog').waitFor();
    assert.ok((await page.getByRole('dialog').textContent()).includes('Test manicure'));
    console.log('PASS: real email login restores English salon and selected service; no booking submitted.');
  }
  assert.deepEqual(errors,[]);
  await page.goto(`${base}/en/tashkent/hair-care`);
  await page.screenshot({path:'reports/seo-en-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.goto(`${base}/uz/tashkent/hair-care`);
  await page.screenshot({path:'reports/seo-uz-mobile.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'No mobile overflow');
  console.log('PASS: RU/UZ/EN HTML, real landings, sitemap/hreflang, canonical, legacy booking redirect, private/draft/blocked exclusion, XSS escaping, no-JS browsing, language switch, guest service context and mobile layout.');
 } finally {
  if(browser) await browser.close();
  await db.query('DELETE FROM services WHERE id=$1',[service]);
  await db.query('DELETE FROM salons WHERE id=ANY($1::varchar[])',[[salon,draft,hidden]]);
  await db.query('DELETE FROM sessions WHERE sess::text LIKE $1',[`%${owner}%`]);
  await db.query('DELETE FROM user_profiles WHERE user_id=$1',[owner]);
  await db.query('DELETE FROM users WHERE id=ANY($1::varchar[])',[[owner,blocked]]);
  await db.end();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
