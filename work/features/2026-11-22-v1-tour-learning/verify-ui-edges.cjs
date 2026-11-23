const {chromium,expect}=require('@playwright/test');
const {login,navigate,apiCall,cleanup}=require('./verify-tours.cjs');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 const report={passed:true,checks:[]},browser=await chromium.launch();
 try{for(const name of ['manual-registration-from-roleplay','open-visit-expands-agenda']){
  const context=await browser.newContext({viewport:{width:360,height:800},locale:'es-MX',timezoneId:'America/Cancun'}),page=await context.newPage(),created=[];
  try{
   await login(page,'dark');
   if(name==='manual-registration-from-roleplay'){
    await page.getByRole('button',{name:'Roleplay',exact:true}).click();await expect(page.getByLabel('Escenario',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Registrar visita',exact:true}).click();
    await expect(page.getByText('¿Qué quieres registrar de este tour?',{exact:true})).toBeVisible();
   }else{
    const result=await apiCall(page,'/api/tour-visits','POST',{request_id:crypto.randomUUID(),intent:'start',title:'QA panel contraído',context:'Prueba sintética de detalle.'});assert.equal(result.status,201);const visit=result.body.data.visit;created.push(visit.id);
    await navigate(page,'agenda');await page.getByRole('button',{name:'Contraer detalle del día',exact:true}).click();
    await navigate(page,'agenda/'+visit.id);await expect(page.getByRole('article',{name:'Detalle de visita',exact:true})).toBeVisible();
   }
   report.checks.push({name,passed:true});
  }catch(error){report.passed=false;report.checks.push({name,passed:false,error:error.message.split('\n')[0]})}
  finally{await cleanup(page,created);await apiCall(page,'/api/auth/logout','POST',{});await context.close()}
 }}finally{await browser.close()}
 const filename=process.env.TOUR_EDGE_EVIDENCE||'ui-edges.json';await fs.writeFile(path.join(__dirname,'evidence',filename),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1});
