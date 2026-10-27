import assert from 'node:assert/strict';
import { PgDialect } from 'drizzle-orm/pg-core';
process.env.DATABASE_URL='postgres://messenger_test@127.0.0.1:55439/postgres';
const {db}=await import('../server/db');
const {userProfiles,masters}=await import('../shared/schema');
const {default:router}=await import('../server/routes/masters.routes');
const dialect=new PgDialect();let role='master';let allowed=true;let change:any;
(db as any).select=()=>({from:(table:any)=>({where:async()=>table===userProfiles?[{role}]:[{id:'my-master',userId:'me'}]})});
(db as any).update=()=>({set:(data:any)=>({where:(condition:any)=>{change={data,query:dialect.sqlToQuery(condition)};return {returning:async()=>allowed?[{id:'review',...data}]:[]};}})});
const handler=(router as any).stack.find((s:any)=>s.route?.path==='/reviews/:id/respond').route.stack.at(-1).handle;
async function request(response:any){let status=200;let data;await handler({user:{claims:{sub:'me'}},params:{id:'review'},body:{response}},{status:(n:number)=>{status=n;return {json:(v:any)=>data=v}},json:(v:any)=>data=v});return status;}
assert.equal(await request(' Спасибо '),200);assert.deepEqual(change.data,{masterResponse:'Спасибо'});assert(change.query.params.includes('my-master'));assert(change.query.params.includes('review'));assert(change.query.sql.includes('is_hidden'));
allowed=false;assert.equal(await request('Чужой отзыв'),404);assert.equal(await request(' '),400);assert.equal(await request('x'.repeat(3001)),400);role='client';assert.equal(await request('Ответ'),403);
console.log('PASS master response ownership, hidden review exclusion, input validation and separate owner response');process.exit(0);
