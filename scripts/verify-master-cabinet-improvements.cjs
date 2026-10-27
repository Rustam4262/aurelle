const {chromium}=require('@playwright/test');const express=require('express');const assert=require('node:assert/strict');const sharp=require('sharp');
(async()=>{const app=express();app.use(express.static('dist/public'));app.get('*',(req,res)=>res.sendFile('index.html',{root:'dist/public'}));const server=app.listen(55441,'127.0.0.1');const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));let uploaded=false;let saved=false;let response=null;let portfolio=[];
 let master={id:'test-master',name:'Malika',photo:'/uploads/masters/test.jpg',bio:{ru:'Мастер салона, стрижки и укладки'},experience:3,averageRating:'5.0',reviewCount:1,phone:''};
 const png=await sharp({create:{width:120,height:120,channels:3,background:'#e52e70'}}).png().toBuffer();await page.route('**/uploads/**',r=>r.fulfill({contentType:'image/png',body:png}));
 await page.route('**/api/**',async r=>{const path=new URL(r.request().url()).pathname;let json=[];
 if(path==='/api/auth/user')json={id:'test-user',role:'master'};
 if(path==='/api/master/me')json={master,salon:{id:'salon',name:{ru:'Тестовый салон'},photos:['/uploads/salons/test.jpg'],city:'Ташкент'},bookings:[],reviews:[{id:'review',rating:5,comment:'Спасибо мастеру',createdAt:'2026-10-01',masterResponse:response}]};
 if(path==='/api/master/portfolio'){if(r.request().method()==='POST'){assert.equal(r.request().postDataJSON().imageUrl,'/uploads/portfolio/new.jpg');portfolio.push({id:'photo',imageUrl:'/uploads/portfolio/new.jpg'});}json=portfolio;}
 if(path==='/api/upload/portfolio'){assert.match(r.request().headers()['content-type'],/multipart\/form-data/);uploaded=true;json={url:'/uploads/portfolio/new.jpg'};}
 if(path==='/api/master/profile'){master={...master,...r.request().postDataJSON()};saved=true;json=master;}
 if(path==='/api/master/reviews/review/respond'){response=r.request().postDataJSON().response;json={masterResponse:response};}
 return r.fulfill({json});});
 await page.goto('http://127.0.0.1:55441/master');await page.getByRole('heading',{name:'Malika',exact:true}).waitFor();assert(await page.locator('img[alt="Тестовый салон"]').evaluate(i=>i.naturalWidth>0));assert(await page.locator('img[alt="Malika"]').first().evaluate(i=>i.naturalWidth>0));
 await page.getByRole('tab',{name:'Портфолио',exact:true}).click();await page.locator('input[type=file]').setInputFiles({name:'work.png',mimeType:'image/png',buffer:png});await page.getByRole('button',{name:'Загрузить все',exact:true}).click();await page.locator('img[src="/uploads/portfolio/new.jpg"]').first().waitFor();assert(uploaded);
 await page.getByRole('tab',{name:'Отзывы и оценки'}).click();await page.getByRole('textbox',{name:'Ответить на отзыв'}).fill('Спасибо за отзыв!');await Promise.all([page.waitForResponse('**/api/master/me'),page.getByRole('button',{name:'Сохранить ответ'}).click()]);assert.equal(response,'Спасибо за отзыв!');
 await page.getByRole('tab',{name:'Настройки профиля'}).click();await page.getByLabel('Имя и фамилия').fill('Malika Updated');await page.getByRole('button',{name:'Сохранить профиль'}).click();await page.getByText('Профиль успешно обновлён',{exact:true}).waitFor();assert(saved);
 await page.getByRole('tab',{name:'Обзор',exact:true}).click();await page.getByRole('heading',{name:'Malika Updated',exact:true}).waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.waitForTimeout(500);await page.screenshot({path:'reports/master-improved-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS portfolio multipart/save/refresh, master and salon avatars, reply save, profile update, mobile tabs');
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exit(1)});
