import assert from 'node:assert/strict';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
process.env.DATABASE_URL='postgres://test@127.0.0.1:1/test';
process.env.NODE_ENV='production';
process.env.GOOGLE_CLIENT_ID='test.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET='test-secret-not-a-real-credential';
const {authStorage}=await import('../server/auth/storage');
const {db,pool}=await import('../server/db');
const originalUpsert=authStorage.upsertUser;
let rows:any[][]=[];let writes:any[]=[];
(db as any).select=()=>({from:()=>({where:()=>({limit:async()=>rows.shift()||[]})})});
(db as any).update=()=>({set:(v:any)=>({where:async()=>{writes.push(v)}})});
(db as any).insert=()=>({values:async(v:any)=>{writes.push(v)}});
const identity={id:'google:123',email:'test@gmail.com',firstName:'Test',emailVerified:true,allowEmailLink:true,registrationRole:'owner' as const};
rows=[[],[],[]];writes=[];
assert.deepEqual(await originalUpsert(identity),{userId:'google:123',isNew:true});
assert.equal(writes[0].provider,'google');assert.equal(writes[0].emailVerified,true);assert.equal(writes[1].role,'client');assert.equal(writes[0].roleSelectionRequired,true);
rows=[[],[{id:'local-user',profileImageUrl:'/own.jpg'}]];writes=[];
assert.deepEqual(await originalUpsert(identity),{userId:'local-user'});assert.equal(writes[0].profileImageUrl,'/own.jpg');assert.equal(writes[0].role,undefined);
rows=[[{id:'google:123',isBlocked:true}]];await assert.rejects(()=>originalUpsert(identity),/ACCOUNT_BLOCKED/);
rows=[[],[{id:'local-user'}]];await assert.rejects(()=>originalUpsert({...identity,allowEmailLink:false}),/EMAIL_LINK_REQUIRES_LOGIN/);
let calls=0;let verified=true;let isNew=false;let lastInput:any;
authStorage.upsertUser=async(input:any)=>{calls++;lastInput=input;return {userId:'local-user',isNew}};
const app=express();app.use(session({secret:'test-session-secret-long-enough-for-local-test',resave:false,saveUninitialized:false}));
const {setupGoogleAuth}=await import('../server/googleAuth');await setupGoogleAuth(app);
app.get('/test-session',(req,res)=>res.json((req.session as any).passport||{}));
const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
const base=`http://127.0.0.1:${(server.address() as any).port}`;
async function begin(query=''){const r=await fetch(base+'/api/auth/google'+query,{redirect:'manual'});assert.equal(r.status,302);const url=new URL(r.headers.get('location')!);assert.equal(url.origin,'https://accounts.google.com');assert.equal(url.searchParams.get('redirect_uri'),'https://aurelle.uz/api/auth/google/callback');assert(url.searchParams.get('state'));return {state:url.searchParams.get('state')!,cookie:r.headers.get('set-cookie')!.split(';')[0]};}
async function finish(flow:any,state=flow.state){return fetch(base+'/api/auth/google/callback?code=synthetic&state='+encodeURIComponent(state),{headers:{cookie:flow.cookie},redirect:'manual'});}
try {
 const f=await begin('?role=owner&redirect=%2Fclient');const strategy=(passport as any)._strategy('google:aurelle');
 strategy._oauth2.getOAuthAccessToken=(_code:any,_params:any,done:any)=>done(null,'access','refresh',{});
 strategy.userProfile=(_token:any,done:any)=>done(null,{id:'123',emails:[{value:'TEST@gmail.com'}],name:{givenName:'Test'},photos:[{value:'https://example.com/avatar.jpg'}],_json:{email_verified:verified}});
 const result=await finish(f);assert.equal(result.headers.get('location'),'/client');assert.equal(lastInput.registrationRole,'owner');
 const cookie=result.headers.get('set-cookie')!.split(';')[0];assert.notEqual(cookie,f.cookie);
 const state=await (await fetch(base+'/test-session',{headers:{cookie}})).json() as any;assert.equal(state.user.claims.sub,'local-user');assert.equal(state.user.access_token,undefined);assert.equal(state.user.refresh_token,undefined);
 const replay=await finish(f);assert.equal(replay.headers.get('location'),'/auth?error=google_auth_failed');assert.equal(calls,1);
 const wrong=await finish(await begin(),'wrong');assert.equal(wrong.headers.get('location'),'/auth?error=google_auth_failed');assert.equal(calls,1);
 verified=false;assert.equal((await finish(await begin())).headers.get('location'),'/auth?error=google_auth_failed');assert.equal(calls,1);verified=true;
 assert.equal((await finish(await begin('?redirect=%2F%5Cevil.example'))).headers.get('location'),'/auth');
 isNew=true;assert.equal((await finish(await begin('?role=solo_master'))).headers.get('location'),'/choose-role');
 console.log('PASS Google OAuth: registration roles, existing account/avatar, blocked accounts, authoritative email linking, fixed callback, state/replay protection, session rotation, no provider tokens, safe redirects, freelancer onboarding');
} finally {authStorage.upsertUser=originalUpsert;await new Promise<void>(r=>server.close(()=>r()));await pool.end();}
