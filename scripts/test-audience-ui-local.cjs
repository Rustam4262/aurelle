// Opt-in integration check: local DB and local HTTP only. Own fixtures are removed in finally.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ quiet: true });

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'Local database required');
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const owner = randomUUID(), outsider = randomUUID(), master = randomUUID();
  const salonIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const serviceIds = salonIds.map(() => randomUUID());
  const soloService = randomUUID();
  const password = randomUUID();
  const email = `audience-test-${owner}@example.invalid`;
  const jar = new Map();
  async function request(path, method = 'GET', body, csrf = true) {
    const headers = { Cookie: [...jar].map(([k,v])=>`${k}=${v}`).join('; ') };
    if (body) headers['Content-Type'] = 'application/json';
    if (csrf && jar.has('csrf-token')) headers['X-CSRF-Token'] = decodeURIComponent(jar.get('csrf-token'));
    const response = await fetch(`http://127.0.0.1:5000${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    for (const cookie of response.headers.getSetCookie()) { const part=cookie.split(';')[0]; const i=part.indexOf('='); jar.set(part.slice(0,i),part.slice(i+1)); }
    const data = await response.json();
    return { status: response.status, data };
  }
  try {
    await db.query('INSERT INTO users (id,email,password_hash,email_verified) VALUES ($1,$2,$3,true),($4,$5,$3,true)', [owner,email,await bcrypt.hash(password,10),outsider,`audience-test-${outsider}@example.invalid`]);
    await db.query("INSERT INTO user_profiles (user_id,role,full_name) VALUES ($1,'owner','Release test'),($2,'client','Release outsider')",[owner,outsider]);
    for (let i=0;i<salonIds.length;i++) {
      await db.query("INSERT INTO salons (id,owner_id,name,address,city,latitude,longitude,phone,is_active,status) VALUES ($1,$2,$3,'Test only','Tashkent',41.3,69.2,'+998000000000',true,'active')",[salonIds[i],i===3?outsider:owner,JSON.stringify({ru:'Audience integration test',en:'Audience integration test',uz:'Audience integration test'})]);
      await db.query("INSERT INTO services (id,salon_id,name,category,price_min,duration,audience,is_active) VALUES ($1,$2,$3,'manicure',50000,30,$4,true)",[serviceIds[i],salonIds[i],JSON.stringify({ru:'Маникюр',en:'Manicure',uz:'Manikyur'}),['women','men','unisex',null][i]]);
    }
    await db.query("INSERT INTO masters (id,user_id,name,is_solo_master,is_active,status,slug) VALUES ($1,$2,'Audience test',true,true,'active',$3)",[master,owner,`audience-${master}`]);
    await db.query("INSERT INTO solo_master_services (id,master_id,name,category,price_min,duration,audience,is_active) VALUES ($1,$2,$3,'haircut',50000,30,'men',true)",[soloService,master,JSON.stringify({ru:'Стрижка',en:'Haircut',uz:'Soch turmagi'})]);
    for(const audience of ['women','men','all']) {
      const r=await request(`/api/salons?audience=${audience}`); assert.equal(r.status,200);
      const actual=r.data.filter(s=>salonIds.includes(s.id)).map(s=>s.id).sort();
      const expected=(audience==='all'?salonIds:audience==='women'?[salonIds[0],salonIds[2]]:[salonIds[1],salonIds[2]]).slice().sort();
      assert.deepEqual(actual,expected);
      assert.ok(r.data.find(s=>s.id===salonIds[2]).serviceCategories.includes('manicure'));
    }
    assert.equal((await request('/api/salons?audience=invalid')).status,400);
    assert.ok((await request('/api/masters?audience=men&limit=100')).data.some(s=>s.id===master));
    assert.ok(!(await request('/api/masters?audience=women&limit=100')).data.some(s=>s.id===master));
    const login=await request('/api/auth/login','POST',{email,password}); assert.equal(login.status,200, 'Test login');
    const path=`/api/owner/salons/${salonIds[0]}/services/${serviceIds[0]}/audience`;
    assert.equal((await request(path,'PATCH',{audience:'men'},false)).status,403);
    assert.equal((await request(path,'PATCH',{audience:'invalid'})).status,400);
    assert.equal((await request(`/api/owner/salons/${salonIds[3]}/services/${serviceIds[3]}/audience`,'PATCH',{audience:'men'})).status,404);
    assert.equal((await request(path,'PATCH',{audience:'men'})).status,200);
    assert.ok((await request('/api/salons?audience=men')).data.some(s=>s.id===salonIds[0]));
    assert.equal((await request(`/api/solo-master/services/${soloService}/audience`,'PATCH',{audience:'unisex'})).status,200);
    assert.ok((await request('/api/masters?audience=women&limit=100')).data.some(s=>s.id===master));
    

    const {chromium}=require('@playwright/test');
    const browser=await chromium.launch();
    try {
      const context=await browser.newContext();
      await context.addCookies([...jar].map(([name,value])=>({name,value,domain:'127.0.0.1',path:'/'})));
      const page=await context.newPage();
      await page.goto('http://127.0.0.1:5000/owner/salon/'+salonIds[0]+'?tab=services');
      await page.getByTestId('service-item-'+serviceIds[0]).getByRole('radio',{name:'Для женщин',exact:true}).waitFor();
      console.log('Owner audience buttons visible');
      const [response]=await Promise.all([
        page.waitForResponse(r=>r.url().endsWith('/audience')&&r.request().method()==='PATCH'),
        page.getByTestId('service-item-'+serviceIds[0]).locator('label').filter({has:page.locator('input[value="women"]')}).click()
      ]);
      assert.equal(response.status(),200);
      await page.reload();
      await page.getByTestId('service-item-'+serviceIds[0]).getByRole('radio',{name:'Для женщин',exact:true}).waitFor();
      assert(await page.getByTestId('service-item-'+serviceIds[0]).getByRole('radio',{name:'Для женщин',exact:true}).isChecked());
      console.log('Owner: saved and restored after reload');
      await db.query("UPDATE user_profiles SET role='solo_master' WHERE user_id=$1",[owner]);
      await page.goto('http://127.0.0.1:5000/solo-master?tab=services');
      await page.getByRole('button',{name:'Перейти к услугам',exact:true}).click();
      
      await page.getByRole('radio',{name:'Для всех',exact:true}).first().waitFor();
      console.log('Solo audience buttons visible');
      const [saved]=await Promise.all([
        page.waitForResponse(r=>r.url().endsWith('/audience')&&r.request().method()==='PATCH'),
        page.locator('label').filter({has:page.locator('input[value="women"]')}).first().click()
      ]);
      assert.equal(saved.status(),200);
      assert.ok((await request('/api/masters?audience=women&limit=100')).data.some(m=>m.id===master));
      assert.ok(!(await request('/api/masters?audience=men&limit=100')).data.some(m=>m.id===master));
      console.log('Solo saved; women included, men excluded');
      await db.query("UPDATE user_profiles SET role='owner' WHERE user_id=$1",[owner]);
    } finally { await browser.close(); }
    await db.query("INSERT INTO salon_working_hours (salon_id,day_of_week,open_time,close_time,is_closed) SELECT $1,day,'09:00','18:00',false FROM generate_series(0,6) day", [salonIds[0]]);
    const bookingDate = new Date(Date.now()+7*86400000).toISOString().slice(0,10);
    const body={salonId:salonIds[0],serviceId:serviceIds[0],bookingDate,startTime:'10:00',endTime:'99:99',priceSnapshot:1};
    const booked=await request('/api/bookings','POST',body);
    assert.equal(booked.status,201,JSON.stringify(booked.data));
    assert.equal(booked.data.endTime,'10:30'); assert.equal(booked.data.priceSnapshot,50000);
    assert.equal((await request('/api/bookings','POST',body)).status,409,'overlap rejected');
    assert.equal((await request('/api/bookings','POST',{...body,startTime:'17:45'})).status,409,'closing hours');
    const bookingId=booked.data.id;
    assert.ok((await request('/api/bookings')).data.some(b=>b.id===bookingId));
    assert.equal((await request('/api/owner/salons')).status,200);
    assert.ok((await request('/api/owner/salons/'+salonIds[0]+'/bookings')).data.some(b=>b.id===bookingId));
    for(const [i,newStartTime] of ['11:00','12:00'].entries()) {
      const moved=await request('/api/bookings/'+bookingId+'/reschedule','PATCH',{newBookingDate:bookingDate,newStartTime});
      assert.equal(moved.status,200,JSON.stringify(moved.data));
      assert.equal(moved.data.notificationVersion,i+1);
      const pending=await db.query("SELECT version FROM scheduled_notifications WHERE booking_id=$1 AND status='pending'",[bookingId]);
      assert.ok(pending.rowCount>0);assert.ok(pending.rows.every(r=>r.version===i+1));
    }
    assert.equal((await request('/api/bookings/'+bookingId+'/cancel','PATCH',{})).status,200);
    await new Promise(r=>setTimeout(r,500));
    assert.equal((await db.query("SELECT id FROM scheduled_notifications WHERE booking_id=$1 AND status='pending'",[bookingId])).rowCount,0);
    console.log('PASS: local login, owner/client booking lists, create, authoritative price/duration, overlap, hours, two reschedules with reminders, cancel, audience and authorization.');

  } finally {
    await db.query('DELETE FROM scheduled_notifications WHERE booking_id IN (SELECT id FROM bookings WHERE salon_id=ANY($1::varchar[]))',[salonIds]);
    await db.query('DELETE FROM bookings WHERE salon_id=ANY($1::varchar[])',[salonIds]);
    await db.query('DELETE FROM salon_working_hours WHERE salon_id=ANY($1::varchar[])',[salonIds]);
    await db.query('DELETE FROM solo_master_services WHERE id=$1',[soloService]);
    await db.query('DELETE FROM masters WHERE id=$1',[master]);
    await db.query('DELETE FROM services WHERE id=ANY($1::varchar[])',[serviceIds]);
    await db.query('DELETE FROM salons WHERE id=ANY($1::varchar[])',[salonIds]);
    await db.query("DELETE FROM sessions WHERE sess->'passport'->'user'->'claims'->>'sub' = ANY($1::text[])",[[owner,outsider]]);
    await db.query('DELETE FROM user_profiles WHERE user_id=ANY($1::varchar[])',[[owner,outsider]]);
    await db.query('DELETE FROM users WHERE id=ANY($1::varchar[])',[[owner,outsider]]);
    await db.end();
    console.log('Temporary fixtures removed.');
  }
}
main().catch(error=>{ console.error(error.message); process.exitCode=1; });
