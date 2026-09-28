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
    console.log('PASS: audience lists, unisex, unclassified catalogue, categories, validation, CSRF, owner isolation, salon and solo classification.');
  } finally {
    await db.query('DELETE FROM solo_master_services WHERE id=$1',[soloService]);
    await db.query('DELETE FROM masters WHERE id=$1',[master]);
    await db.query('DELETE FROM services WHERE id=ANY($1::varchar[])',[serviceIds]);
    await db.query('DELETE FROM salons WHERE id=ANY($1::varchar[])',[salonIds]);
    await db.query("DELETE FROM sessions WHERE sess->'passport'->'user'->'claims'->>'sub' = ANY($1::text[])",[[owner,outsider]]);
    await db.query('DELETE FROM users WHERE id=ANY($1::varchar[])',[[owner,outsider]]);
    await db.end();
    console.log('Temporary fixtures removed.');
  }
}
main().catch(error=>{ console.error(error.message); process.exitCode=1; });
