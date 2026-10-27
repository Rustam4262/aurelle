const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
(async()=>{const browser=await chromium.launch();try{
 const ctx=await browser.newContext({viewport:{width:1280,height:850},serviceWorkers:'block'});
 await ctx.addCookies([{name:'testUser',value:'alice',url:'http://127.0.0.1:55440'},{name:'csrf-token',value:'test',url:'http://127.0.0.1:55440'}]);
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:55440/api/messenger';
 async function call(user,path,method='GET',body){const r=await fetch(base+path,{method,headers:{'x-test-user':user,'Content-Type':'application/json',Cookie:'csrf-token=test','X-CSRF-Token':'test'},body:body?JSON.stringify(body):undefined});assert(r.ok,`${method} ${path}: ${r.status}`);return r.json();}
 const {id}=await call('alice','/conversations','POST',{userId:'bob'});
 await call('alice',`/conversations/${id}/block`,'PUT',{blocked:false});await call('bob',`/conversations/${id}/block`,'PUT',{blocked:false});
 await page.route('**/test-master-avatar.webp',async r=>{const data=await require('sharp')({create:{width:40,height:40,channels:3,background:'#ed2970'}}).webp().toBuffer();await r.fulfill({contentType:'image/webp',body:data});});
 for(const chat of await call('alice','/conversations')) { const history=await call('alice','/conversations/'+chat.id+'/messages');const last=history.messages.at(-1);if(last)await call('alice','/conversations/'+chat.id+'/read','POST',{messageId:last.id}); }
 await page.goto('http://127.0.0.1:55440/messenger');
 await call('bob',`/conversations/${id}/messages`,'POST',{body:'Notification regression '+Date.now(),clientId:randomUUID()});
 const notice=page.locator('aside[role="status"]');await notice.waitFor({timeout:15000});
 await notice.getByRole('button',{name:'Скрыть уведомление'}).click();await notice.waitFor({state:'hidden'});
 await call('bob',`/conversations/${id}/messages`,'POST',{body:'Second notification '+Date.now(),clientId:randomUUID()});await notice.waitFor({timeout:15000});
 await notice.getByRole('button').first().click();await page.waitForURL(`**/messenger?chat=${id}`);await notice.waitFor({state:'hidden'});
 await page.getByRole('heading',{name:'Малика',exact:true}).waitFor();assert(await page.locator('header img[alt="Малика"]').evaluate(i=>i.naturalWidth>0));
 await page.getByRole('textbox',{name:'Поиск переписок'}).fill('Нет такого имени');assert.equal(await page.locator('aside button[aria-current]').count(),0);
 await page.getByRole('textbox',{name:'Поиск переписок'}).fill('Малика');await page.locator('aside button[aria-current]').waitFor();
 await page.screenshot({path:'reports/messenger-improved-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'reports/messenger-improved-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS notification arrival, dismiss, subsequent message, chat navigation, professional avatar, search and mobile width');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
