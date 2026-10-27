import assert from 'node:assert/strict';
import { PgDialect } from 'drizzle-orm/pg-core';
process.env.DATABASE_URL='postgres://test@127.0.0.1:1/test';
const {db,pool}=await import('../server/db');
const {completeRoleSelection}=await import('../server/auth/role-selection');
let eligible=true;let saved:any;let condition:any;let fail=false;
(db as any).transaction=async(fn:any)=>fn({update:()=>({set:()=>({where:(where:any)=>{condition=new PgDialect().sqlToQuery(where);return {returning:async()=>eligible?[{id:'mine'}]:[]}}})}),insert:()=>({values:(v:any)=>({onConflictDoUpdate:async()=>{if(fail)throw new Error('synthetic');saved=v}})})});
async function call(body:any){let status=200;let json:any;await completeRoleSelection({body,user:{claims:{sub:'mine'}}} as any,{status(n:number){status=n;return this},json(v:any){json=v;return this}} as any);return {status,json};}
for(const [role,path]of [['client','/client'],['owner','/owner'],['solo_master','/solo-master/onboarding']]){assert.deepEqual(await call({role}),{status:200,json:{redirect:path}});assert.equal(saved.userId,'mine');assert.equal(saved.role,role);assert(condition.sql.includes('role_selection_required'));assert(condition.sql.includes('is_blocked'));assert(condition.params.includes('mine'));}
for(const body of [{role:'admin'},{role:'master'},{role:'client',userId:'other'},{}])assert.equal((await call(body)).status,400);
eligible=false;saved=undefined;assert.equal((await call({role:'owner'})).status,409);assert.equal(saved,undefined);
eligible=true;fail=true;assert.equal((await call({role:'client'})).status,500);
await pool.end();console.log('PASS role selection: allowed roles, own account only, one-time guarded update, destinations, invalid/admin/staff roles rejected, failures surfaced');
