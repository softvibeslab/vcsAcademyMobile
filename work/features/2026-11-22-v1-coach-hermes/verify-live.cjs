// Public smoke uses demo login/logout and synthetic chat only; no business records.
const {chromium,webkit,request,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const baseURL='https://aisalesv1.softvibes.pro', v5URL='https://aisales.softvibes.pro';
const directory=path.join(__dirname,'evidence/live');
const build=path.resolve(__dirname,'../../..','frontend/dist-v1');
const report={passed:false,checks:[],screenshots:[],inferenceAvailable:false,continuityVerified:false};
const digest=value=>createHash('sha256').update(value).digest('hex');
const record=(name,detail={})=>report.checks.push({name,passed:true,...detail});
async function privateSnapshot(){
 const api=await request.newContext({baseURL:v5URL});try{
  const html=await api.get('/');assert.equal(html.status(),200);
  const ready=await api.get('/api/ready');assert.equal(ready.status(),200);const body=await ready.json();assert.equal(body.data.mode,'private_pilot');
  return{htmlSha256:digest(await html.body()),mode:body.data.mode,version:body.data.version};
 }finally{await api.dispose()}
}
async function artifacts(){
 const html=await fs.readFile(path.join(build,'v1.html'));
 const assets=[...html.toString().matchAll(/(?:src|href)="(\/assets\/[A-Za-z0-9_.-]+\.(?:js|css))"/g)].map(m=>m[1]);
 const api=await request.newContext({baseURL});try{
  const root=await api.get('/');assert.equal(root.status(),200);assert.equal(digest(await root.body()),digest(html));record('Public V1 HTML matches build',{sha256:digest(html)});
  for(const asset of assets){const remote=await api.get(asset);assert.equal(remote.status(),200);const local=await fs.readFile(path.join(build,asset.slice(1)));assert.equal(digest(await remote.body()),digest(local));record('Published asset matches build',{asset,sha256:digest(local)});}
 }finally{await api.dispose()}
}
async function capture(page,name){await page.screenshot({path:path.join(directory,name+'.png'),fullPage:true});report.screenshots.push(name+'.png')}
async function exercise(browser,name,viewport,theme,checkInference){
 const context=await browser.newContext({baseURL,viewport,isMobile:viewport.width<500,hasTouch:viewport.width<500,deviceScaleFactor:viewport.width<500?2:1,locale:'es-MX',timezoneId:'America/Cancun',reducedMotion:'reduce'});
 const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[],calls=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))calls.push({origin:u.origin,path:u.pathname,method:r.method()})});
 try{
  const initial=await page.goto('/');assert.equal(initial.status(),200);const tls=await initial.securityDetails();assert(tls.protocol.startsWith('TLS'));
  await page.getByRole('button',{name:'Ya tengo una cuenta',exact:true}).click();await page.getByLabel('Correo electrónico',{exact:true}).fill('rep@vcsa.local');await page.getByLabel('Contraseña',{exact:true}).fill('demo123');await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.getByRole('button',{name:'Omitir guía',exact:true}).click();
  if(await page.locator('html').getAttribute('data-theme')!==theme)await page.getByRole('button',{name:'Cambiar tema',exact:true}).filter({visible:true}).click();
  await page.getByRole('link',{name:'AI Coach',exact:true}).filter({visible:true}).click();await expect(page.getByRole('region',{name:'AI Coach',exact:true})).toBeVisible();
  const geometry=await page.getByLabel('Tu mensaje',{exact:true}).evaluate(el=>{const r=el.getBoundingClientRect(),nav=document.querySelector('.bottom-nav').getBoundingClientRect();return{inputTop:r.top,inputBottom:r.bottom,navTop:nav.top,navBottom:nav.bottom,height:innerHeight,pageHeight:document.documentElement.scrollHeight,pageWidth:document.documentElement.scrollWidth,width:innerWidth}});
  assert(geometry.inputTop>=0&&geometry.inputBottom<=geometry.navTop+1&&geometry.navBottom<=geometry.height+1);assert(geometry.pageHeight<=geometry.height+1&&geometry.pageWidth<=geometry.width+1);
  assert(!calls.some(call=>call.path==='/api/smart-agent/chat'),'Opening module must not invoke inference');
  await capture(page,name+'-coach');
  if(checkInference){
   const question='Prueba sintética de entrenamiento: mi objeción de práctica es «quiero pensarlo». Dame una pregunta breve y sin presión.';
   await page.getByLabel('Tu mensaje',{exact:true}).fill(question);const responsePromise=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/smart-agent/chat',{timeout:50000});await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();const response=await responsePromise;
   const body=await response.json();
   if(response.status()===200){
    assert.equal(body.data.provider,'hermes');assert(body.data.response.trim());report.inferenceAvailable=true;
    await expect(page.getByRole('log')).toContainText(body.data.response.trim());
    await page.getByLabel('Tu mensaje',{exact:true}).fill('¿Cuál era la objeción que te mencioné?');const followup=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/smart-agent/chat',{timeout:50000});await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();const second=await followup;assert.equal(second.status(),200);const next=await second.json();assert.equal(next.data.provider,'hermes');assert(/pensarl|pensar|pensando/i.test(next.data.response));report.continuityVerified=true;
    record('Two synthetic real Hermes turns verify provider and continuity');
   }else{
    assert.equal(response.status(),503);assert.equal(body.detail.code,'coach_unavailable');await expect(page.getByRole('button',{name:'Reintentar',exact:true})).toBeVisible();await expect(page.getByLabel('Tu mensaje',{exact:true})).toHaveValue(question);
    const current=await page.evaluate(async()=>{const token=localStorage.getItem('sa.pilot.session');return(await fetch('/api/mobile/me',{headers:{Authorization:'Bearer '+token}})).status});assert.equal(current,200);
    record('Hermes unavailable is explicit, draft retained and app session remains valid',{httpStatus:503,inferenceAvailable:false});
   }
   await capture(page,name+'-inference-state');
  }
  await page.getByRole('button',{name:'Roleplay',exact:true}).click();await expect(page.getByLabel('Escenario',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Conversar',exact:true}).click();
  await page.getByRole('link',{name:'Evaluaciones',exact:true}).click();await expect(page.getByRole('heading',{name:'Mis evaluaciones',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Home',exact:true}).filter({visible:true}).click();await expect(page.getByRole('heading',{name:'Mi desempeño',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Abrir agenda',exact:true}).click();const agenda=page.getByRole('region',{name:'Calendario mensual',exact:true});await expect(agenda).toBeVisible();
  const fit=await agenda.evaluate(el=>{
   const grid=el.querySelector('[data-purpose="calendar-month-grid"]'),sheet=el.querySelector('[data-purpose="selected-day-preview-sheet"]'),g=grid.getBoundingClientRect(),s=sheet.getBoundingClientRect();
   const dates=[...el.querySelectorAll('.sa-month-day')].map(day=>{const r=day.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{visible:r.top>=g.top-1&&r.bottom<=g.bottom+1&&r.bottom<=s.top+1,hit:hit===day||day.contains(hit)}});
   return{height:el.getBoundingClientRect().height,pageHeight:document.documentElement.scrollHeight,viewport:innerHeight,dates,monthScroll:grid.scrollHeight>grid.clientHeight+1};
  });assert(Math.abs(fit.height-fit.viewport)<=1&&fit.pageHeight<=fit.viewport+1);assert.equal(fit.dates.length,42);assert(fit.dates.every(day=>day.visible&&day.hit));assert.equal(fit.monthScroll,false);
  await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
  await page.goto('/#profile');await expect(page.getByRole('heading',{name:'Perfil y progreso',exact:true})).toBeVisible();await page.getByRole('main').getByRole('button',{name:'Cerrar sesión',exact:true}).click();await expect(page.getByRole('button',{name:'Ya tengo una cuenta',exact:true})).toBeVisible();
  assert.deepEqual(errors,[]);assert(calls.every(call=>call.origin===baseURL&&(['GET','HEAD'].includes(call.method)||(call.method==='POST'&&['/api/auth/login','/api/auth/logout','/api/smart-agent/chat'].includes(call.path)))));
  record(name+': HTTPS, compact Coach, themes, Roleplay selection, evaluations, Home, agenda and logout',{viewport,theme,geometry,agenda:fit,mutationPaths:calls.filter(call=>!['GET','HEAD'].includes(call.method)).map(call=>call.path),errors});
 }catch(error){report.failure={name,message:error.message,errors};await capture(page,name+'-failure').catch(()=>{});throw error}finally{await context.close()}
}
(async()=>{await fs.mkdir(directory,{recursive:true});const browsers=[];try{
 const baseline=JSON.parse(await fs.readFile(path.join(__dirname,'evidence/deployment-before.json'),'utf8'));
 const before=await privateSnapshot();assert.equal(before.htmlSha256,baseline.v5.htmlSha256);await artifacts();
 const c=await chromium.launch(),w=await webkit.launch();browsers.push(c,w);
 for(const theme of ['dark','light']){
  await exercise(c,'android-'+theme,{width:360,height:800},theme,theme==='dark');
  await exercise(w,'iphone-'+theme,{width:390,height:844},theme,false);
  await exercise(c,'desktop-'+theme,{width:1440,height:900},theme,false);
 }
 assert.deepEqual(await privateSnapshot(),before);record('Private V5 public snapshot unchanged');report.passed=true;
}finally{await fs.writeFile(path.join(directory,'results.json'),JSON.stringify(report,null,2));await Promise.all(browsers.map(b=>b.close()))}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,screenshots:report.screenshots.length,inferenceAvailable:report.inferenceAvailable,continuityVerified:report.continuityVerified}));})().catch(error=>{console.error(error);process.exitCode=1});
