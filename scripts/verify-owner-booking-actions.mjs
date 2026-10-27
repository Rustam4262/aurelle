import { build } from "esbuild";
import { createServer } from "node:http";
import { once } from "node:events";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const bundle = await build({ stdin: { contents: `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {QueryClientProvider} from '@tanstack/react-query';
import i18n from 'i18next'; import {initReactI18next} from 'react-i18next';
import ru from './client/src/locales/ru.json';
import {queryClient} from './client/src/lib/queryClient';
import {OwnerSalonBookings} from './client/src/components/owner/OwnerSalonBookings';
import {Toaster} from './client/src/components/ui/toaster';
await i18n.use(initReactI18next).init({lng:'ru',resources:{ru:{translation:ru}},interpolation:{escapeValue:false}});
queryClient.setDefaultOptions({queries:{...queryClient.getDefaultOptions().queries,retry:false},mutations:{retry:false}});
createRoot(document.getElementById('root')).render(<QueryClientProvider client={queryClient}><OwnerSalonBookings salonId="test"/><Toaster/></QueryClientProvider>);
`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, format: "esm", platform: "browser", jsx: "automatic", define: {"process.env.NODE_ENV": '"development"', "import.meta.env": '{"DEV":false,"PROD":false}'} });
const rows = [
  ["pending", "pending", "2020-01-01"], ["future", "confirmed", "2099-01-01"],
  ["past", "confirmed", "2020-01-01"], ["cancel", "pending", "2020-01-01"],
  ["done", "completed", "2020-01-01"], ["cancelled", "cancelled", "2020-01-01"],
  ["failure", "pending", "2020-01-01"],
].map(([id,status,bookingDate])=>({id,status,bookingDate,startTime:"10:00",endTime:"11:00",priceSnapshot:100000,masterId:null,client:{fullName:id}}));
const patches=[]; let reads=0;
const server=createServer(async(req,res)=>{
  const json=(status,body)=>{res.writeHead(status,{"Content-Type":"application/json"});res.end(JSON.stringify(body));};
  if(req.url==="/app.js"){res.writeHead(200,{"Content-Type":"text/javascript"});return res.end(bundle.outputFiles[0].text);}
  if(req.url==="/"){res.writeHead(200,{"Content-Type":"text/html","Set-Cookie":"csrf-token="+"a".repeat(64)+"; Path=/"});return res.end('<div id="root"></div><script type="module" src="/app.js"></script>');}
  if(req.url==="/api/owner/salons/test/bookings"){reads++;return json(200,rows);}
  if(req.url==="/api/owner/salons/test/masters")return json(200,[]);
  if(req.method==="PATCH"){
    let body="";for await(const chunk of req)body+=chunk;
    const id=req.url.split("/")[4],data=JSON.parse(body);patches.push({id,...data,csrf:req.headers["x-csrf-token"]});
    await new Promise(r=>setTimeout(r,100));
    if(id==="failure")return json(409,{error:"Booking changed"});
    const row=rows.find(r=>r.id===id);if(!row)return json(404,{});row.status=data.status;return json(200,row);
  }
  return json(404,{});
});
server.listen(0,"127.0.0.1");await once(server,"listening");
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage();const errors=[];page.on("pageerror",e=>{errors.push(String(e));console.error(String(e));});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const item=id=>page.getByTestId(`booking-item-${id}`);
  await expect(item("pending").getByRole("button",{name:"Подтвердить",exact:true})).toBeVisible();
  await expect(item("future").getByRole("button",{name:"Завершить",exact:true})).toBeDisabled();
  for(const id of ["done","cancelled"])await expect(page.getByTestId(`booking-actions-${id}`)).toHaveCount(0);
  await item("pending").getByRole("button",{name:"Подтвердить",exact:true}).click();
  await expect(item("pending").getByRole("button",{name:"Завершить",exact:true})).toBeEnabled();
  await item("past").getByRole("button",{name:"Завершить",exact:true}).click();
  await expect(page.getByTestId("booking-actions-past")).toHaveCount(0);
  page.once("dialog",d=>d.dismiss());await item("cancel").getByRole("button",{name:"Отменить запись",exact:true}).click();
  assert.equal(patches.filter(p=>p.id==="cancel").length,0);
  page.once("dialog",d=>d.accept());await item("cancel").getByRole("button",{name:"Отменить запись",exact:true}).click();
  await expect(page.getByTestId("booking-actions-cancel")).toHaveCount(0);
  await item("failure").getByRole("button",{name:"Подтвердить",exact:true}).click();
  await expect(page.getByText("Не удалось изменить статус",{exact:true})).toBeVisible();
  await expect(item("failure").getByRole("button",{name:"Подтвердить",exact:true})).toBeEnabled();
  assert.deepEqual(patches.map(({id,status})=>({id,status})),[{id:"pending",status:"confirmed"},{id:"past",status:"completed"},{id:"cancel",status:"cancelled"},{id:"failure",status:"confirmed"}]);
  assert.ok(patches.every(p=>p.csrf==="a".repeat(64)));assert.ok(reads>=5);assert.deepEqual(errors,[]);
  console.log("PASS: real component in Chromium, status actions, future/terminal restrictions, cancel confirmation, CSRF, refetch and server error recovery (mock API)");
} finally {await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
