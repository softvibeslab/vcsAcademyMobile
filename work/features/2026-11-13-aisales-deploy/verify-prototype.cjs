const fs=require('node:fs/promises');const path=require('node:path');const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'../../../../prototypes/wireframe-explorer'),url='https://aisales.softvibes.pro/prototipo/',out=__dirname;
 const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('https://aisales.softvibes.pro/'))external.push(r.url())});
 await page.goto(url);await page.waitForSelector('.module');assert.equal(await page.locator('.module-screens a').count(),43);assert.equal(await page.locator('.journey-card').count(),8);
 await page.screenshot({path:path.join(out,'map-desktop.png'),fullPage:true});
 const model=await page.evaluate(()=>({groups:CATALOG.groups,links:LINKS,flows:FLOWS}));const ids=model.groups.flatMap(g=>g.screens.map(s=>s.id));
 for(const id of ids){assert(model.links[id]?.length);for(const [,target] of model.links[id])assert(ids.includes(target),id+' invalid target '+target)}
 for(const flow of model.flows)for(const id of flow.ids)assert(ids.includes(id));
 await page.locator('[data-start="0"]').first().click();await page.waitForFunction(()=>location.hash==='#A01');
 let inner=page.frameLocator('#screen-frame');await inner.getByRole('button',{name:/Comenzar/}).click();await page.waitForFunction(()=>location.hash==='#A02');
 await page.locator('#step-next').click();await page.waitForFunction(()=>location.hash==='#A03');await page.locator('#actions [data-go="G01"]').click();await page.waitForFunction(()=>location.hash==='#G01');
 await page.locator('#back').click();await page.waitForFunction(()=>location.hash==='#A03');
 const visits=[];
 for(const id of ids){await page.goto(url+'#'+id);await page.frameLocator('#screen-frame').locator('[data-bound]').first().waitFor();const count=await page.locator('#actions button').count();assert.equal(count,model.links[id].length);visits.push(id);}
 await page.goto(url+'#B01');await page.frameLocator('#screen-frame').getByText('Sales Academy',{exact:true}).waitFor();await page.screenshot({path:path.join(out,'home-desktop.png'),fullPage:true});
 await page.locator('#actions [data-go="B03"]').click();await page.waitForFunction(()=>location.hash==='#B03');await page.locator('#actions [data-go="B05"]').click();await page.waitForFunction(()=>location.hash==='#B05');await page.locator('#actions button').first().click();await page.waitForFunction(()=>location.hash==='#B01');
 await page.goto(url+'#H01');await page.frameLocator('#screen-frame').getByText('Sales Academy · Sala Operativa',{exact:true}).first().waitFor();await page.screenshot({path:path.join(out,'operations-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.goto(url+'#A01');await page.frameLocator('#screen-frame').getByRole('button',{name:/Comenzar/}).waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('MOBILE',await page.frameLocator('#screen-frame').locator('body').evaluate(el=>({w:innerWidth,scroll:document.documentElement.scrollWidth,items:[...el.querySelectorAll('*')].filter(x=>x.getBoundingClientRect().right>innerWidth+2).slice(0,5).map(x=>({tag:x.tagName,cls:x.className,w:x.getBoundingClientRect().width,right:x.getBoundingClientRect().right}))})));await page.screenshot({path:path.join(out,'onboarding-mobile.png'),fullPage:true});
 await page.locator('#menu').click();assert(await page.locator('#sidebar').evaluate(el=>el.classList.contains('open')));await page.locator('#search').fill('Diary');assert.equal(await page.locator('#navigation a').count(),1);await page.locator('#navigation a').click();await page.waitForFunction(()=>location.hash==='#E04');assert(!(await page.locator('#sidebar').evaluate(el=>el.classList.contains('open'))));
 await page.goto(url+'#H01');await page.waitForTimeout(250);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 const result={status:'PASS',screens:visits.length,journeys:model.flows.length,destinations:'all valid',inlineNavigation:true,backNavigation:true,mobileSearch:true,noHorizontalOverflow:true,externalRequests:external,consoleErrors:errors};await fs.writeFile(path.join(out,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
