// Read-only layout QA: existing synthetic demo, real API, no tour mutations.
const {chromium,webkit,expect}=require('@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {login,navigate,apiCall}=require('../2026-11-22-v1-tour-learning/verify-tours.cjs');
const fixture=require('../2026-11-22-v1-tour-demo/evidence/demo-result.json');
const phase=process.env.RESPONSIVE_QA_PHASE||'green';
const directory=path.join(__dirname,'evidence',phase),report={passed:false,cases:[]};
async function dimensions(page){return page.evaluate(()=>{
 const rect=s=>document.querySelector(s)?.getBoundingClientRect().toJSON();
 return{viewport:{width:innerWidth,height:innerHeight},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},device:rect('.sa-device'),header:rect('.sa-calendar-header'),calendar:rect('.sa-month-scroll'),day:rect('.sa-day-sheet'),records:rect('.sa-detail-scroll'),nav:rect('.sa-app-nav'),toolbar:rect('.sa-sheet-toolbar'),card:rect('.sa-detail-card'),dayFont:parseFloat(getComputedStyle(document.querySelector('.sa-day-number')).fontSize)};
})}
async function fits(page){const d=await dimensions(page);assert(d.document.width<=d.viewport.width+1,'No horizontal page overflow');assert(d.document.height<=d.viewport.height+1,'Agenda stays within page viewport');assert(d.nav.bottom<=d.viewport.height+1&&d.nav.top>=0,'Navigation remains visible');assert(d.calendar.height>=70,'Calendar has a usable scroll viewport');assert(d.records.height>=64,'Day records have a usable scroll viewport');assert(d.toolbar.top>=0&&d.toolbar.bottom<=d.nav.top+1,'Day controls fit above navigation');return d}
async function run(browser,name,width,height,theme,sideBySide){
 const context=await browser.newContext({viewport:{width,height},isMobile:width<1024,hasTouch:width<1024,locale:'es-MX',timezoneId:'America/Cancun',reducedMotion:'reduce'}),page=await context.newPage();
 page.setDefaultTimeout(20000);const item={name,width,height,theme,passed:false},writes=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/tour-visits')&&r.method()!=='GET')writes.push(r.method())});
 try{
  await login(page,theme);
  const before=await apiCall(page,'/api/tour-visits/'+fixture.visitId);assert.equal(before.status,200);
  await navigate(page,'agenda/'+fixture.visitId);
  const dialog=page.getByRole('dialog',{name:'Detalle de visita',exact:true});
  await expect(dialog.getByRole('article',{name:'Detalle de visita',exact:true})).toContainText(fixture.title);
  await dialog.getByRole('button',{name:'Cerrar detalle de visita',exact:true}).click();await expect(dialog).toBeHidden();
  const visitButton=page.getByRole('button',{name:'Ver visita '+fixture.title,exact:true});
  await expect(visitButton).toBeVisible();
  item.layout=await fits(page);
  if(sideBySide){
   assert(item.layout.day.x>=item.layout.calendar.right-1,'Wide screens place day details beside the calendar');
   assert(item.layout.day.y<item.layout.calendar.bottom-1,'Wide screens share vertical space');
   assert(item.layout.day.width>=300&&item.layout.day.width<=460,'Day panel has readable line length');
   assert(item.layout.device.width<=1440,'Wide content has a maximum width');
   assert(item.layout.dayFont>=14,'Wide calendar dates are legible');
  }else assert(item.layout.day.y>=item.layout.calendar.bottom-1,'Portrait mobile/tablet keep stacked layout');
  await page.screenshot({path:path.join(directory,name+'-agenda.png')});
  await visitButton.scrollIntoViewIfNeeded();await expect(visitButton).toBeInViewport();
  await visitButton.click();await expect(dialog).toBeVisible();
  const contribution=dialog.getByLabel('¿Algo más que quieras aportar?',{exact:true});
  await contribution.scrollIntoViewIfNeeded();await expect(contribution).toBeInViewport();
  assert.equal(await contribution.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)),16);
  await expect(dialog.getByRole('button',{name:'Cerrar detalle de visita',exact:true})).toBeInViewport();
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
  await expect(visitButton).toBeFocused();
  await page.getByRole('button',{name:'Buscar eventos',exact:true}).click();
  const search=page.getByRole('searchbox',{name:'Buscar en el mes',exact:true});
  await expect(search).toBeVisible();item.openSearchLayout=await fits(page);
  await search.fill('DEMO');await expect(visitButton).toBeVisible();
  item.searchLayout=await fits(page);
  await expect(search).toBeInViewport();
  await page.screenshot({path:path.join(directory,name+'-search.png')});
  await page.getByRole('button',{name:'Cerrar búsqueda',exact:true}).click();
  await page.getByRole('button',{name:'Contraer detalle del día',exact:true}).click();
  await expect(page.getByRole('button',{name:'Expandir detalle del día',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Agregar seguimiento',exact:true})).toBeInViewport();
  await page.getByRole('button',{name:'Expandir detalle del día',exact:true}).click();
  await page.getByRole('button',{name:'Historial',exact:true}).click();
  await expect(page.getByRole('region',{name:'Historial del mes',exact:true}).or(page.locator('[aria-label="Historial del mes"]'))).toBeVisible();
  await page.getByRole('button',{name:'GoalSheet',exact:true}).click();
  const lastDay=page.locator('.sa-month-day').last();await lastDay.scrollIntoViewIfNeeded();await expect(lastDay).toBeInViewport();
  const selected=page.locator('.sa-month-day.is-selected');await selected.scrollIntoViewIfNeeded();await expect(selected).toBeInViewport();
  const followup=page.getByRole('button',{name:'Agregar seguimiento',exact:true});await expect(followup).toBeInViewport();
  assert((await followup.boundingBox()).height>=44);
  const after=await apiCall(page,'/api/tour-visits/'+fixture.visitId);assert.deepEqual(after.body.data.visit,before.body.data.visit);assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  item.passed=true;
 }catch(error){item.error=error.message;item.failureLayout=await dimensions(page);await page.screenshot({path:path.join(directory,name+'-failure.png')});throw error}
 finally{report.cases.push(item);await apiCall(page,'/api/auth/logout','POST',{});await context.close()}
}
async function main(){
 await fs.mkdir(directory,{recursive:true});
 const cases=[['desktop-dark',chromium,1512,840,'dark',true],['desktop-light',chromium,1280,720,'light',true],['wide-dark',chromium,1920,1080,'dark',true],['tablet-wide',webkit,1024,768,'light',true],['tablet-portrait',webkit,768,1024,'dark',false],['iphone-light',webkit,390,844,'light',false],['android-dark',chromium,360,800,'dark',false],['phone-small',chromium,320,568,'light',false],['landscape',webkit,844,390,'dark',true],['tablet-compact',chromium,600,601,'light',false],['tablet-short',chromium,760,610,'dark',false],['wide-short',chromium,1920,500,'light',true]];
 // Run engines sequentially to limit temporary profiles on the local disk.
 try{for(const row of cases){if(process.env.RESPONSIVE_QA_CASES&&!process.env.RESPONSIVE_QA_CASES.split(',').includes(row[0]))continue;const[name,engine,...args]=row;const browser=await engine.launch();try{await run(browser,name,...args)}finally{await browser.close()}}report.passed=true}
 finally{if(!report.passed)console.error(JSON.stringify({passed:false,cases:report.cases.map(({name,error,failureLayout})=>({name,error,failureLayout}))}));await fs.writeFile(path.join(directory,'results.json'),JSON.stringify(report,null,2)+'\n')}
 console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,phase}));
}
main().catch(error=>{console.error(error);process.exitCode=1});
