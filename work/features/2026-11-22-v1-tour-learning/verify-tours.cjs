// Real app and API. Only the external inference service is simulated in local QA.
const {chromium,webkit,expect,request}=require('@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const base=process.env.TOUR_QA_URL||'http://127.0.0.1:4199/v1.html';
const live=process.env.TOUR_QA_LIVE==='1';
const directory=path.join(__dirname,'evidence',live?'live':'browser');
const report={passed:false,live,checks:[],screenshots:[]};
const record=(name,details={})=>report.checks.push({name,passed:true,...details});
const dateParts=date=>{
 const x=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Cancun',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
 return{date:`${x.year}-${x.month}-${x.day}`,time:`${x.hour}:${x.minute}`};
};
async function shot(page,name){await page.screenshot({path:path.join(directory,name+'.png'),fullPage:true});report.screenshots.push(name+'.png')}
async function navigate(page,hash){await page.evaluate(hash=>{location.hash=hash},hash)}
async function fits(page,kind){
 const dimensions=await page.evaluate(kind=>{
  const nav=document.querySelector(kind==='agenda'?'.sa-app-nav':'.bottom-nav'),input=document.querySelector('.coach-page textarea');
  return{width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,
   nav:nav?nav.getBoundingClientRect().toJSON():null,input:input?input.getBoundingClientRect().toJSON():null};
 },kind);
 assert(dimensions.pageWidth<=dimensions.width+1,'Page must not overflow horizontally');
 assert(dimensions.pageHeight<=dimensions.height+1,'Coach and Agenda stay within the viewport');
 if(dimensions.input&&dimensions.nav)assert(dimensions.input.bottom<=dimensions.nav.top+1,'Composer remains visible');
 return dimensions;
}
async function login(page,theme){
 await page.goto(base);
 await page.getByRole('button',{name:'Ya tengo una cuenta',exact:true}).click();
 await page.getByLabel('Correo electrónico',{exact:true}).fill('rep@vcsa.local');
 await page.getByLabel('Contraseña',{exact:true}).fill('demo123');
 await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
 await page.getByRole('button',{name:'Omitir guía',exact:true}).click();
 if(await page.locator('html').getAttribute('data-theme')!==theme)await page.getByRole('button',{name:'Cambiar tema',exact:true}).filter({visible:true}).click();
 await navigate(page,'coach');
 await expect(page.getByRole('region',{name:'AI Coach',exact:true})).toBeVisible();
}
async function apiCall(page,route,method='GET',body){
 return page.evaluate(async({route,method,body})=>{
  const response=await fetch(route,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+localStorage.getItem('sa.pilot.session')},...(body?{body:JSON.stringify(body)}:{})});
  return{status:response.status,body:await response.json()};
 },{route,method,body});
}
async function createResponse(page,action){
 const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/tour-visits'&&r.request().method()==='POST');
 await action();const response=await pending;assert.equal(response.status(),201);return(await response.json()).data.visit;
}
async function cleanup(page,ids){
 for(const id of ids){
  const current=await apiCall(page,'/api/tour-visits/'+id);
  if(current.status===404)continue;
  assert.equal(current.status,200);
  const removed=await apiCall(page,'/api/tour-visits/'+id,'DELETE',{request_id:crypto.randomUUID(),expected_revision:current.body.data.visit.revision});
  assert.equal(removed.status,200,'Remove only records created by this QA run');
 }
}
async function runCase(browser,name,viewport,theme,full){
 const context=await browser.newContext({viewport,deviceScaleFactor:viewport.width<500?2:1,isMobile:viewport.width<500,hasTouch:viewport.width<500,locale:'es-MX',timezoneId:'America/Cancun',reducedMotion:'reduce'});
 const page=await context.newPage();page.setDefaultTimeout(18000);const errors=[],created=[],writes=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',r=>{if(new URL(r.url()).pathname==='/api/tour-visits'&&r.method()==='POST')writes.push(r.postData())});
 try{
  await login(page,theme);const metricsBefore=await apiCall(page,'/api/goalsheet/metrics');assert.equal(metricsBefore.status,200);
  await fits(page,'coach');
  await page.getByRole('button',{name:'Registrar visita',exact:true}).click();
  for(const label of ['Iniciar visita','Programar tour','Registrar cómo me fue'])await expect(page.getByRole('button',{name:label,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Programar tour',exact:true}).click();
  const form=page.getByRole('dialog',{name:'Registrar visita',exact:true});await expect(form).toBeVisible();
  await form.getByLabel('Referencia · opcional',{exact:true}).fill('QA '+name+' futura');
  await form.getByLabel('Contexto de la visita',{exact:true}).fill('Prueba sintética: preparar una pregunta de bienvenida.');
  const tomorrow=dateParts(new Date(Date.now()+86400000));
  await form.getByLabel('Fecha',{exact:true}).fill(tomorrow.date);
  await expect(form.getByLabel('Hora',{exact:true})).toHaveValue('');
  await form.getByLabel('Hora',{exact:true}).fill('23:30');
  await shot(page,name+'-schedule-form');
  const visit=await createResponse(page,()=>form.getByRole('button',{name:'Guardar tour',exact:true}).click());created.push(visit.id);
  assert.equal(visit.event_date,tomorrow.date);assert.equal(visit.status,'scheduled');
  await expect(form).toBeHidden({timeout:50000});
  await expect(page.getByRole('region',{name:'Contexto de visita'})).toContainText('QA '+name+' futura');
  await page.getByRole('link',{name:'Ver en Agenda',exact:true}).click();
  const detail=page.getByRole('article',{name:'Detalle de visita',exact:true});await expect(detail).toContainText('QA '+name+' futura');
  await fits(page,'agenda');await shot(page,name+'-agenda-visit');
  await detail.getByRole('button',{name:'Cancelar visita',exact:true}).click();
  await detail.getByRole('button',{name:'Confirmar cancelación',exact:true}).click();
  await expect(detail.getByText('Cancelada',{exact:true})).toBeVisible();
  record(name+': scheduled visit keeps Cancun date, agenda fits, cancellation persists',{viewport,theme});
  if(full){
   await navigate(page,'coach');
   const message='Terminé un tour ficticio; prefieren vacaciones en montaña. Practiqué escuchar antes de presentar.';
   await page.getByLabel('Tu mensaje',{exact:true}).fill(message);
   const answer=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/smart-agent/chat',{timeout:50000});
   await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();assert.equal((await answer).status(),200);
   await page.getByRole('button',{name:'Registrar cómo me fue',exact:true}).click();await expect(form).toBeVisible();
   await form.getByLabel('Referencia · opcional',{exact:true}).fill('QA aprendizaje '+name);
   const ago=dateParts(new Date(Date.now()-10*60000));
   await form.getByLabel('Fecha de la visita',{exact:true}).fill(ago.date);await form.getByLabel('Hora de la visita',{exact:true}).fill(ago.time);
   await expect(form.getByLabel('¿Qué pasó?',{exact:true})).toHaveValue(message);
   await form.getByLabel('¿Qué funcionó?',{exact:true}).fill('Escuché su preferencia por la montaña.');
   await form.getByLabel('¿Qué mejorarías o harías después?',{exact:true}).fill('Practicar una pregunta abierta al saludar.');
   if(!live)await fetch('http://127.0.0.1:18937/control',{method:'POST',body:JSON.stringify({fail_analysis:true})});
   const postsBefore=writes.length;
   const completed=await createResponse(page,()=>form.getByRole('button',{name:'Guardar feedback',exact:true}).evaluate(button=>{button.click();button.click()}));created.push(completed.id);
   await expect(form).toBeHidden({timeout:50000});assert.equal(writes.length,postsBefore+1,'Double click saves once');
   await page.getByRole('link',{name:'Ver en Agenda',exact:true}).click();await expect(detail).toContainText('QA aprendizaje '+name);
   if(!live){await expect(detail).toContainText('Análisis no disponible');await detail.getByRole('button',{name:'Reintentar análisis',exact:true}).click()}
   await expect(detail.getByText('Generado por IA',{exact:false})).toBeVisible({timeout:50000});
   await expect(detail.getByRole('link',{name:/Abrir lección/}).first()).toBeVisible();
   await fits(page,'agenda');
   const windowScrollBefore=await page.evaluate(()=>scrollY);
   await detail.getByRole('link',{name:/Abrir lección/}).first().scrollIntoViewIfNeeded();
   await expect(detail.getByRole('link',{name:/Abrir lección/}).first()).toBeInViewport();
   await expect(page.getByRole('button',{name:'Agregar seguimiento',exact:true})).toBeInViewport();
   assert.equal(await page.evaluate(()=>scrollY),windowScrollBefore,'Learning evidence scrolls only within the day detail');
   await fits(page,'agenda');await shot(page,name+'-learning');
   await navigate(page,'roadmap');await expect(page.getByRole('heading',{name:'Recomendado por tu última visita',exact:true})).toBeVisible();
   await page.getByRole('link',{name:'Ver visita de origen',exact:false}).click();await expect(detail).toContainText('QA aprendizaje '+name);
   await detail.getByRole('link',{name:'Continuar con el Coach',exact:true}).click();await page.reload();
   await expect(page.getByRole('region',{name:'Contexto de visita'})).toContainText('QA aprendizaje '+name);
   await page.getByLabel('Tu mensaje',{exact:true}).fill('¿Qué tipo de vacaciones se mencionó en la visita guardada?');
   const contextAnswer=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/smart-agent/chat',{timeout:50000});await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();
   const reply=await contextAnswer;assert.equal(reply.status(),200);assert.match((await reply.json()).data.response,/monta/i);
   await fits(page,'coach');await shot(page,name+'-resumed-context');
   await navigate(page,'diary/'+completed.id);await expect(page.getByRole('heading',{name:'Smart Diary',exact:true}).first()).toBeVisible();await expect(detail).toContainText('Escuché su preferencia');
   await detail.getByRole('button',{name:'Editar visita',exact:true}).click();
   const edit=page.getByRole('dialog',{name:'Editar visita',exact:true});await edit.getByLabel('¿Qué mejorarías o harías después?',{exact:true}).fill('Hacer una pausa después de la pregunta.');
   await edit.getByRole('button',{name:'Guardar cambios',exact:true}).click();await expect(edit).toBeHidden();
   await expect(detail).toContainText('Análisis desactualizado');
   const afterEdit=await apiCall(page,'/api/tour-visits/'+completed.id);assert.equal(afterEdit.body.data.visit.completed_at,completed.completed_at);
   await detail.getByRole('button',{name:'Eliminar visita',exact:true}).click();await detail.getByRole('button',{name:'Eliminar definitivamente',exact:true}).click();await expect(detail).toBeHidden();
   await navigate(page,'coach/'+completed.id);await expect(page.getByRole('region',{name:'Contexto de visita'})).toContainText('ya no está disponible');
   await expect(page.getByLabel('Tu mensaje',{exact:true})).toHaveValue('');
   await page.getByLabel('Tu mensaje',{exact:true}).fill('No debe enviarse con una visita eliminada.');
   await expect(page.getByRole('button',{name:'Enviar mensaje',exact:true})).toBeDisabled();
   record(name+': full Coach→feedback→analysis→Roadmap→reload→Diary edit/delete; context survives, stale analysis invalidates, deleted context blocked',{externalInference:live?'real Hermes':'fixture with503 retry'});
  }
  const metricsAfter=await apiCall(page,'/api/goalsheet/metrics');assert.deepEqual(metricsAfter.body.data,metricsBefore.body.data);assert.deepEqual(errors,[]);
  record(name+': Goal Sheet metrics unchanged and no JavaScript errors');
 }catch(error){await shot(page,name+'-failure');throw error}
 finally{await cleanup(page,created);await apiCall(page,'/api/auth/logout','POST',{});await context.close()}
}
async function main(){
 await fs.mkdir(directory,{recursive:true});const chrome=await chromium.launch(),safari=await webkit.launch();
 try{for(const theme of ['dark','light']){
  await runCase(chrome,'android-'+theme,{width:360,height:800},theme,theme==='dark');
  await runCase(safari,'iphone-'+theme,{width:390,height:844},theme,false);
  await runCase(chrome,'desktop-'+theme,{width:1440,height:900},theme,false);
 }report.passed=true}
 finally{await chrome.close();await safari.close();await fs.writeFile(path.join(directory,'results.json'),JSON.stringify(report,null,2))}
 console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,screenshots:report.screenshots.length,live}));
}
module.exports={login,navigate,apiCall,cleanup,dateParts};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1});
