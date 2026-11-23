// Transport fault only: execute the real PATCH, then drop its response once.
// No app response or persisted state is mocked; local synthetic database only.
const {chromium,expect}=require('@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {login,navigate,apiCall,cleanup}=require('../2026-11-22-v1-tour-learning/verify-tours.cjs');
const phase=process.env.MANUAL_QA_PHASE||'lost-response-green';
const directory=path.join(__dirname,'evidence',phase),report={passed:false,transportFault:'drop response after real PATCH commit'};
async function main(){
 assert((process.env.TOUR_QA_URL||'').startsWith('http://127.0.0.1:'),'Fault injection is local only');
 await fs.mkdir(directory,{recursive:true});const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,locale:'es-MX'}),page=await context.newPage();
 const ids=[],patches=[];let dropped=false;
 try{
  await login(page,'dark');
  const created=await apiCall(page,'/api/tour-visits','POST',{request_id:crypto.randomUUID(),intent:'reflect',scheduled_at:new Date(Date.now()-600000).toISOString(),title:'QA respuesta perdida',context:'Práctica ficticia de bienvenida.',feedback:{happened:'Escuché antes de explicar.',worked:'Escuché con calma.',improve_next:'Preguntar prioridades.'}});
  assert.equal(created.status,201);const visit=created.body.data.visit;ids.push(visit.id);
  await navigate(page,'agenda/'+visit.id);
  const region=page.getByRole('region',{name:'Aprendizaje con IA',exact:true});
  const extra='Aporte único: practicar una pregunta abierta.';
  await region.getByLabel('¿Algo más que quieras aportar?',{exact:true}).fill(extra);
  await page.route('**/api/tour-visits/'+visit.id,async route=>{
   if(route.request().method()!=='PATCH')return route.continue();
   patches.push(route.request().postDataJSON());
   if(dropped)return route.continue();
   const real=await route.fetch();assert.equal(real.status(),200);dropped=true;
   await route.abort('connectionreset');
  });
  await region.getByRole('button',{name:'Analizar',exact:true}).click();
  await expect(region.getByRole('alert')).toBeVisible();
  // Parent refresh after failure has observed the committed context/revision.
  await expect(page.getByRole('article',{name:'Detalle de visita',exact:true}).getByText('Práctica ficticia de bienvenida.\n\nAporte para el análisis:\n'+extra,{exact:true})).toBeVisible();
  const committed=(await apiCall(page,'/api/tour-visits/'+visit.id)).body.data.visit;
  assert.equal(committed.revision,2);
  const analyzed=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/tour-visits/'+visit.id+'/analysis');
  await region.getByRole('button',{name:'Reintentar análisis',exact:true}).click();
  assert.equal((await analyzed).status(),200);
  await expect(region.getByRole('heading',{name:'Pasos a seguir',exact:true})).toBeVisible();
  const current=(await apiCall(page,'/api/tour-visits/'+visit.id)).body.data.visit;
  report.savedRevision=current.revision;report.contributionOccurrences=current.context.split(extra).length-1;report.patchRequestIds=patches.map(p=>p.request_id);
  assert.equal(current.context.split(extra).length-1,1,'Retry after lost PATCH response must not duplicate contribution');
  assert.equal(current.revision,2,'Retry must replay PATCH rather than make another edit');
  assert.deepEqual(patches[1],patches[0],'Retry must preserve PATCH UUID and body after parent refresh');
  report.passed=true;
 }catch(error){report.error=error.message;await page.screenshot({path:path.join(directory,'failure.png')});throw error}
 finally{await cleanup(page,ids);await apiCall(page,'/api/auth/logout','POST',{});await context.close();await browser.close();await fs.writeFile(path.join(directory,'results.json'),JSON.stringify(report,null,2)+'\n')}
 console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(error);process.exitCode=1});
