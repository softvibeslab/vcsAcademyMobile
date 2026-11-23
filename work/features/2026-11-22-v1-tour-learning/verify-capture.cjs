const {chromium,expect}=require('@playwright/test');
const {login,navigate,apiCall,cleanup,dateParts}=require('./verify-tours.cjs');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 const report={passed:false,checks:[]},browser=await chromium.launch(),context=await browser.newContext({viewport:{width:360,height:800},locale:'es-MX',timezoneId:'America/Cancun'}),page=await context.newPage(),created=[];
 const record=name=>report.checks.push({name,passed:true});
 try{
  await login(page,'light');await page.getByRole('button',{name:'Registrar visita',exact:true}).click();await page.getByRole('button',{name:'Iniciar visita',exact:true}).click();
  const form=page.getByRole('dialog',{name:'Registrar visita',exact:true});await expect(form).toBeVisible();
  const contrast=await form.evaluate(el=>[...el.querySelectorAll('footer button')].map(button=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d'),chain=[];
   for(let n=button;n;n=n.parentElement)chain.unshift(n);ctx.fillStyle='#fff';ctx.fillRect(0,0,1,1);
   for(const n of chain){ctx.fillStyle=getComputedStyle(n).backgroundColor;ctx.fillRect(0,0,1,1)}const bg=[...ctx.getImageData(0,0,1,1).data].slice(0,3);
   ctx.fillStyle=getComputedStyle(button).color;ctx.fillRect(0,0,1,1);const fg=[...ctx.getImageData(0,0,1,1).data].slice(0,3);
   const lum=x=>x.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0),a=lum(bg),b=lum(fg);
   return{name:button.textContent.trim(),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
  }));assert(contrast.every(item=>item.ratio>=4.5));report.checks.push({name:'Light dialog primary and Cancel text meet contrast4.5',passed:true,contrast});
  await form.getByLabel('Referencia · opcional',{exact:true}).fill('QA inicio inmediato');await form.getByLabel('Contexto de la visita',{exact:true}).fill('Prueba sintética de bienvenida con escucha.');
  await page.setViewportSize({width:360,height:460});
  const fit=await form.evaluate(el=>{const r=el.getBoundingClientRect(),footer=el.querySelector('footer').getBoundingClientRect(),scroll=el.querySelector('.tour-form-scroll');return{top:r.top,bottom:r.bottom,footer:footer.bottom,height:innerHeight,scrollHeight:scroll.clientHeight,font:getComputedStyle(el.querySelector('input')).fontSize}});
  assert(fit.top>=0&&fit.bottom<=fit.height&&fit.footer<=fit.height&&fit.scrollHeight>0);assert(Number.parseFloat(fit.font)>=16);record('Registration remains usable at reduced keyboard-height viewport');
  await page.setViewportSize({width:360,height:800});
  const createdResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/tour-visits'&&r.request().method()==='POST');await form.getByRole('button',{name:'Guardar e iniciar',exact:true}).click();const response=await createdResponse;assert.equal(response.status(),201);const initial=(await response.json()).data.visit;created.push(initial.id);
  await expect(form).toBeHidden();await page.getByRole('link',{name:'Ver en Agenda',exact:true}).click();
  const detail=page.getByRole('article',{name:'Detalle de visita',exact:true});await expect(detail).toContainText('En curso');await detail.getByRole('button',{name:'Registrar cómo me fue',exact:true}).click();
  await form.getByLabel('¿Qué pasó?',{exact:true}).fill('Práctica breve de saludo. Escuché antes de explicar.');
  const finishedResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/tour-visits/'+initial.id&&r.request().method()==='PATCH');await form.getByRole('button',{name:'Guardar feedback',exact:true}).click();const finished=await finishedResponse;assert.equal(finished.status(),200);const completed=(await finished.json()).data.visit;
  assert.equal(completed.id,initial.id);assert.equal(completed.status,'completed');assert(Date.parse(completed.completed_at)>Date.parse(initial.started_at));await expect(form).toBeHidden({timeout:50000});record('Start then immediate feedback completes the same visit with valid time precision');
  const me=await apiCall(page,'/api/mobile/me');assert.equal(me.status,200);const key='sa.pilot.notes.'+me.body.data.user.id+'.diary';
  const note={id:'synthetic-local-note',title:'Escuchar primero',body:'Prueba sintética: preguntar antes de presentar.',date:'2026-11-21'};const saved=JSON.stringify([note]);
  await page.evaluate(({key,saved})=>localStorage.setItem(key,saved),{key,saved});await navigate(page,'diary');await page.getByRole('button',{name:'Notas anteriores',exact:true}).click();await expect(page.getByRole('heading',{name:'Escuchar primero',exact:true})).toBeVisible();
  let posts=0;page.on('request',r=>{if(new URL(r.url()).pathname==='/api/tour-visits'&&r.method()==='POST')posts++});
  await page.getByRole('button',{name:'Usar en registro de visita',exact:true}).click();await expect(form.getByLabel('Contexto de la visita',{exact:true})).toHaveValue(note.title+'\n\n'+note.body);assert.equal(posts,0);
  await form.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(form).toBeHidden();assert.equal(posts,0);assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),saved);record('Historical Diary stays local and unchanged when copying is cancelled');
  await page.getByRole('button',{name:'Usar en registro de visita',exact:true}).click();const copyResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/tour-visits'&&r.request().method()==='POST');await form.getByRole('button',{name:'Guardar feedback',exact:true}).click();const copied=await copyResponse;assert.equal(copied.status(),201);const value=(await copied.json()).data.visit;created.push(value.id);
  await expect(form).toBeHidden({timeout:50000});assert.equal(posts,1);assert.equal(value.context,note.title+'\n\n'+note.body);assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),saved);record('Explicit confirmation copies a local note into one linked visit without deleting its original');
  report.passed=true;
 }finally{await cleanup(page,created);await apiCall(page,'/api/auth/logout','POST',{});await context.close();await browser.close();await fs.writeFile(path.join(__dirname,'evidence/capture-results.json'),JSON.stringify(report,null,2)+'\n')}
 console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(error);process.exitCode=1});
