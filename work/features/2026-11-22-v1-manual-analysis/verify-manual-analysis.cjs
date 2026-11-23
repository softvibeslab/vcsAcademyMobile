// Own API stays real. Only external inference is simulated during local QA.
const { chromium, webkit, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {login,navigate,apiCall,cleanup,dateParts}=require('../2026-11-22-v1-tour-learning/verify-tours.cjs');
const phase=process.env.MANUAL_QA_PHASE||'green',live=process.env.TOUR_QA_LIVE==='1';
const directory=path.join(__dirname,'evidence',phase);
const report={passed:false,live,cases:[]};
const observations=async()=> (await(await fetch('http://127.0.0.1:18937/observations')).json()).calls.filter(c=>c.analysis);
async function run(browser,name,viewport,theme){
 const context=await browser.newContext({viewport,isMobile:viewport.width<500,hasTouch:viewport.width<500,locale:'es-MX',timezoneId:'America/Cancun',reducedMotion:'reduce'});
 const page=await context.newPage();page.setDefaultTimeout(18000);
 const created=[],calls=[],errors=[],result={name,viewport,theme,passed:false};
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',r=>{if(/\/api\/tour-visits\/[^/]+\/analysis$/.test(new URL(r.url()).pathname))calls.push(r.postDataJSON())});
 try{
  await login(page,theme);
  const metrics=await apiCall(page,'/api/goalsheet/metrics');assert.equal(metrics.status,200);
  const originalInference=live?null:(await observations()).length;
  await page.getByRole('button',{name:'Registrar visita',exact:true}).click();
  await page.getByRole('button',{name:'Registrar cómo me fue',exact:true}).click();
  const form=page.getByRole('dialog',{name:'Registrar visita',exact:true});
  await form.getByLabel('Referencia · opcional',{exact:true}).fill('QA manual · '+name);
  const ago=dateParts(new Date(Date.now()-10*60000));
  await form.getByLabel('Fecha de la visita',{exact:true}).fill(ago.date);
  await form.getByLabel('Hora de la visita',{exact:true}).fill(ago.time);
  await form.getByLabel('Contexto de la visita',{exact:true}).fill('Escenario ficticio: expliqué la propuesta antes de confirmar prioridades.');
  await form.getByLabel('¿Qué pasó?',{exact:true}).fill('Práctica ficticia de una bienvenida; faltó preguntar por sus vacaciones.');
  await form.getByLabel('¿Qué funcionó?',{exact:true}).fill('Escuché con calma.');
  await form.getByLabel('¿Qué mejorarías o harías después?',{exact:true}).fill('Confirmar expectativas antes de presentar.');
  const posted=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/tour-visits'&&r.request().method()==='POST');
  await form.getByRole('button',{name:'Guardar feedback',exact:true}).click();
  const response=await posted;assert.equal(response.status(),201);
  const visit=(await response.json()).data.visit;created.push(visit.id);
  await expect(form).toBeHidden({timeout:50000});
  assert.equal(calls.length,0,'Saving feedback must not request analysis');
  await page.getByRole('link',{name:'Ver en Agenda',exact:true}).click();
  const modal=page.getByRole('dialog',{name:'Detalle de visita',exact:true});
  const learning=modal.getByRole('region',{name:'Aprendizaje con IA',exact:true});
  await expect(learning).toBeVisible();
  await page.reload();await expect(learning).toBeVisible();
  assert.equal(calls.length,0,'Opening and reloading must not request analysis');
  const stored=await apiCall(page,'/api/tour-visits/'+visit.id);
  assert.equal(stored.body.data.visit.analysis,null);
  const contribution='Quiero practicar una pregunta abierta sobre sus vacaciones.';
  const input=learning.getByLabel('¿Algo más que quieras aportar?',{exact:true});
  await input.fill(contribution);assert.equal(calls.length,0,'Typing must not infer');
  await expect(learning).toContainText(/se guardar[aá].*contexto/i);
  await page.screenshot({path:path.join(directory,name+'-before.png')});
  if(!live)await fetch('http://127.0.0.1:18937/control',{method:'POST',body:JSON.stringify({fail_analysis:true})});
  const analyzed=page.waitForResponse(r=>/\/api\/tour-visits\/[^/]+\/analysis$/.test(new URL(r.url()).pathname),{timeout:55000});
  await learning.getByRole('button',{name:'Analizar',exact:true}).evaluate(button=>{button.click();button.click()});
  const first=await analyzed;
  assert.equal(first.status(),live?200:503);
  assert.equal(calls.length,1,'Double click must request one inference');
  let current=(await apiCall(page,'/api/tour-visits/'+visit.id)).body.data.visit;
  assert.equal(current.revision,visit.revision+1);
  assert.equal(current.context.split(contribution).length-1,1);
  assert.equal(current.expires_at,visit.expires_at,'Contribution must not renew retention');
  await expect(input).toHaveValue('');
  if(!live){
   await expect(learning.getByRole('button',{name:'Reintentar análisis',exact:true})).toBeEnabled();
   await expect(learning).toContainText(/guardad/i);
   const retry=page.waitForResponse(r=>/\/api\/tour-visits\/[^/]+\/analysis$/.test(new URL(r.url()).pathname));
   await learning.getByRole('button',{name:'Reintentar análisis',exact:true}).click();
   assert.equal((await retry).status(),200);
   assert.equal(calls.length,2);assert.equal(calls[0].request_id,calls[1].request_id,'Retry must preserve inference UUID');
  }
  await expect(learning.getByText('Generado por IA',{exact:false})).toBeVisible({timeout:55000});
  await expect(learning.getByRole('heading',{name:'Pasos a seguir',exact:true})).toBeVisible();
  await expect(learning.getByRole('list').getByRole('listitem')).toHaveCount(3);
  current=(await apiCall(page,'/api/tour-visits/'+visit.id)).body.data.visit;
  assert.equal(current.context.split(contribution).length-1,1);assert.equal(current.revision,visit.revision+1);
  for(const field of ['strengths','improvement','next_practice'])assert(current.analysis[field].length<=180);
  assert(current.analysis.summary.length<=240);
  let count=calls.length;
  await page.reload();await expect(learning.getByRole('heading',{name:'Pasos a seguir',exact:true})).toBeVisible();
  await expect(learning.getByRole('button',{name:'Analizar',exact:true})).toBeDisabled();
  assert.equal(calls.length,count,'Ready revision should not regenerate on reload');
  if(name==='android-dark'){
   const secondContribution='También quiero confirmar el tiempo disponible al comenzar.';
   await input.fill(secondContribution);
   await expect(learning.getByRole('button',{name:'Analizar',exact:true})).toBeEnabled();
   const next=page.waitForResponse(r=>/\/api\/tour-visits\/[^/]+\/analysis$/.test(new URL(r.url()).pathname),{timeout:55000});
   await learning.getByRole('button',{name:'Analizar',exact:true}).click();
   assert.equal((await next).status(),200);
   await expect(learning.getByRole('button',{name:'Analizar',exact:true})).toBeDisabled();
   current=(await apiCall(page,'/api/tour-visits/'+visit.id)).body.data.visit;
   assert.equal(current.revision,visit.revision+2);assert.equal(current.analysis.context_revision,current.revision);
   assert.equal(current.context.split(contribution).length-1,1);assert.equal(current.context.split(secondContribution).length-1,1);
   assert.equal(calls.length,count+1);count=calls.length;
  }
  await learning.getByRole('list').scrollIntoViewIfNeeded();
  await expect(learning.getByRole('list')).toBeInViewport();
  await expect(modal.getByRole('button',{name:'Cerrar detalle de visita',exact:true})).toBeInViewport();
  const geometry=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight}));
  assert(geometry.scrollWidth<=geometry.width+1&&geometry.scrollHeight<=geometry.height+1,'Only modal content scrolls');
  await page.screenshot({path:path.join(directory,name+'-steps.png')});
  if(!live){const inferred=await observations();assert.equal(inferred.length-originalInference,count);assert(inferred.at(-1).messages.some(m=>m.content.includes(contribution)),'Contribution reaches Hermes');}
  assert.deepEqual((await apiCall(page,'/api/goalsheet/metrics')).body.data,metrics.body.data);assert.deepEqual(errors,[]);
  result.passed=true;result.analysisRequests=count;result.geometry=geometry;result.summary=current.analysis.summary;result.steps=['strengths','improvement','next_practice'].map(f=>current.analysis[f]);
 }catch(error){result.error=error.message;await page.screenshot({path:path.join(directory,name+'-failure.png')});throw error}
 finally{await cleanup(page,created);await apiCall(page,'/api/auth/logout','POST',{});await context.close();report.cases.push(result)}
}
async function main(){
 await fs.mkdir(directory,{recursive:true});const chromiumBrowser=await chromium.launch(),webkitBrowser=await webkit.launch();
 try{
  const matrix=[['android-dark',chromiumBrowser,{width:360,height:800},'dark'],['iphone-light',webkitBrowser,{width:390,height:844},'light'],['desktop-dark',chromiumBrowser,{width:1440,height:900},'dark']];
  for(const [name,browser,viewport,theme] of matrix){if(process.env.MANUAL_QA_CASE&&process.env.MANUAL_QA_CASE!==name)continue;await run(browser,name,viewport,theme)}
  report.passed=true;
 }finally{await chromiumBrowser.close();await webkitBrowser.close();await fs.writeFile(path.join(directory,'results.json'),JSON.stringify(report,null,2)+'\n')}
 console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,phase,live}));
}
main().catch(error=>{console.error(error);process.exitCode=1});
