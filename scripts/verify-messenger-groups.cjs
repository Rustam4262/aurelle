const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 try{
  async function context(id,width){const c=await browser.newContext({serviceWorkers:'block',viewport:{width,height:844}});await c.addCookies([{name:'testUser',value:id,url:'http://127.0.0.1:55440'},{name:'csrf-token',value:'test',url:'http://127.0.0.1:55440'}]);return c;}
  const ca=await context('alice',390),cb=await context('bob',1280),a=await ca.newPage(),b=await cb.newPage();
  await a.goto('http://127.0.0.1:55440/messenger');await a.getByRole('button',{name:'Новая группа',exact:true}).click();
  const dialog=a.getByRole('dialog');await dialog.getByRole('textbox',{name:'Название группы'}).fill('Команда '+Date.now());
  await dialog.getByRole('checkbox',{name:'Малика',exact:true}).check();
  await dialog.getByRole('button',{name:/Создать группу/}).click();await a.waitForURL('**/messenger?chat=*');
  const url=a.url(),id=new URL(url).searchParams.get('chat');
  const text='Обсудим запись '+Date.now();await a.getByRole('textbox',{name:'Сообщение',exact:true}).fill(text);await a.getByRole('button',{name:'Отправить',exact:true}).click();
  await b.goto(url);await b.locator('article').getByText(text,{exact:true}).waitFor();await b.locator('article').getByText('Алина',{exact:true}).waitFor();
  await b.getByRole('button',{name:/Участники/}).click();assert.equal(await b.getByRole('dialog').getByRole('button',{name:'Удалить',exact:true}).count(),0);await b.keyboard.press('Escape');
  await a.getByRole('button',{name:/Участники/}).click();await dialog.getByRole('textbox',{name:'Название группы'}).fill('Команда AURELLE');await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();
  await dialog.getByRole('heading',{name:'Команда AURELLE',exact:true}).waitFor();
  await dialog.getByRole('textbox',{name:'Найти мастера или салон'}).fill('Салон');
  await dialog.getByText('Салон AURELLE',{exact:true}).locator('..').getByRole('button',{name:'Добавить',exact:true}).click();
  await dialog.getByText('Владелец',{exact:true}).waitFor();
  await a.screenshot({path:'reports/messenger-group-members.png',fullPage:true});
  await dialog.getByText('Малика',{exact:true}).locator('..').getByRole('button',{name:'Удалить',exact:true}).click();
  await dialog.getByText('Малика',{exact:true}).waitFor({state:'hidden'});
  assert.equal((await cb.request.get('http://127.0.0.1:55440/api/messenger/conversations/'+id+'/messages')).status(),404);
  assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  console.log('PASS group UI: create, two participants communicate, author names, owner-only controls, rename, add/remove and revoked access; mobile layout');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
