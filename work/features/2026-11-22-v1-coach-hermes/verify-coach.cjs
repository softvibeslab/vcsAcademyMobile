// Real local app/API; only the external Hermes transport is simulated.
const { chromium, webkit, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const baseURL = 'http://127.0.0.1:4198/v1.html';
const directory = path.join(__dirname, 'evidence', 'browser');
const report = { passed: false, checks: [], screenshots: [] };
const runId = Date.now().toString(36);
const record = (name, details = {}) => report.checks.push({ name, passed: true, ...details });
async function observations() { return (await (await fetch('http://127.0.0.1:18927/observations')).json()).calls; }
async function login(page, theme) {
  await page.goto(baseURL);
  await page.getByRole('button', { name: 'Ya tengo una cuenta', exact: true }).click();
  await page.getByLabel('Correo electrónico', { exact: true }).fill('rep@vcsa.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('demo123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await page.getByRole('button', { name: 'Omitir guía', exact: true }).click();
  if (await page.locator('html').getAttribute('data-theme') !== theme) await page.getByRole('button', { name: 'Cambiar tema', exact: true }).filter({ visible: true }).click();
  await page.getByRole('link', { name: 'AI Coach', exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('region', { name: 'AI Coach', exact: true })).toBeVisible();
}
async function snapshot(page, name) {
  const filename = name + '.png';
  await page.screenshot({ path: path.join(directory, filename), fullPage: true });
  report.screenshots.push(filename);
}
async function geometry(page) {
  return page.evaluate(() => {
    const box = element => { const r = element.getBoundingClientRect(); return { top:r.top, bottom:r.bottom, left:r.left, right:r.right, width:r.width, height:r.height }; };
    const input = document.querySelector('.coach-page textarea');
    const log = document.querySelector('.coach-page [role=log]');
    const nav = document.querySelector('.bottom-nav');
    const targets = [...document.querySelectorAll('.coach-page button')].filter(el => el.getClientRects().length && !el.disabled).map(el => ({ name:el.getAttribute('aria-label') || el.textContent.trim(), ...box(el) }));
    return { width:innerWidth, height:innerHeight, pageWidth:document.documentElement.scrollWidth, pageHeight:document.documentElement.scrollHeight, input:box(input), inputFont:getComputedStyle(input).fontSize, nav:box(nav), log:box(log), targets };
  });
}
function assertFits(value) {
  assert(value.pageWidth <= value.width + 1, 'No horizontal overflow');
  assert(value.pageHeight <= value.height + 1, 'Normal Coach fits viewport without page scrolling');
  assert(value.input.top >= 0 && value.input.bottom <= value.nav.top + 1, 'Composer stays visible above navigation');
  assert(value.nav.bottom <= value.height + 1, 'Navigation stays visible');
  assert(Number.parseFloat(value.inputFont) >= 16, 'Input avoids iPhone auto zoom');
  assert(value.log.top < 245, 'Compact headers leave the conversation near the top');
  assert(value.targets.every(t => t.width >= 43.9 && t.height >= 43.9), 'Buttons retain 44px touch targets');
}
async function contrast(page) {
  const pairs = await page.locator('.coach-page .message.user').first().evaluate(element => {
    const canvas=document.createElement('canvas'); canvas.width=canvas.height=1; const c=canvas.getContext('2d');
    c.fillStyle='#fff';c.fillRect(0,0,1,1);
    const chain=[];for(let n=element;n;n=n.parentElement)chain.unshift(n);
    for(const n of chain){c.fillStyle=getComputedStyle(n).backgroundColor;c.fillRect(0,0,1,1);}
    const background=[...c.getImageData(0,0,1,1).data].slice(0,3);
    c.fillStyle=getComputedStyle(element).color;c.fillRect(0,0,1,1);
    return {foreground:[...c.getImageData(0,0,1,1).data].slice(0,3),background};
  });
  const luminance = color => color.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
  const a=luminance(pairs.foreground), b=luminance(pairs.background), ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  assert(ratio>=4.5, 'User message contrast must reach 4.5:1'); return {...pairs,ratio};
}
async function send(page, text) {
  await page.getByLabel('Tu mensaje', { exact:true }).fill(text);
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/smart-agent/chat' && r.request().method() === 'POST');
  await page.getByRole('button', { name:'Enviar mensaje', exact:true }).click();
  const result=await response; assert.equal(result.status(),200); await expect(page.getByText('Coach está respondiendo…',{exact:true})).toBeHidden();
  await expect(page.getByRole('log')).toContainText('Primero reconoce');
}
async function interactions(page, name) {
  const log=page.getByRole('log', {name:'Conversación con el Coach'});
  const original=(await observations()).length;
  const failure=`[fallo] Quiero practicar Step 5 ${name} ${runId}`;
  await page.getByLabel('Tu mensaje',{exact:true}).fill(failure);
  const failed=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/smart-agent/chat' && r.status()===503);
  await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();
  await expect(log.getByText(failure,{exact:true})).toBeVisible();
  await expect(page.getByText('Coach está respondiendo…',{exact:true})).toBeVisible();
  await failed;
  await expect(page.getByRole('button',{name:'Reintentar',exact:true})).toBeVisible();
  assert.equal((await observations()).length,original+1);
  const retry=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/smart-agent/chat' && r.status()===200);
  await page.getByRole('button',{name:'Reintentar',exact:true}).click();
  await retry;await expect(page.getByRole('button',{name:'Reintentar',exact:true})).toHaveCount(0);
  await expect(log.getByText(failure,{exact:true})).toHaveCount(1);
  const calls=await observations();assert.equal(calls.length,original+2);
  const repeated=calls.at(-1).messages.filter(m=>m.content===failure);assert.equal(repeated.length,1,'Retry includes failed user turn once');
  record(`${name}: pending state, recoverable503 and retry without duplicates`);

  const modeText=`Cambio de modo ${name}`;
  await page.getByLabel('Tu mensaje',{exact:true}).fill(modeText);
  const modeResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/smart-agent/chat'&&r.status()===200);
  await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();
  await page.getByRole('button',{name:'Roleplay',exact:true}).click();
  await expect(page.getByLabel('Escenario',{exact:true})).toBeVisible();
  await modeResponse;
  await page.getByRole('button',{name:'Conversar',exact:true}).click();
  await expect(log.getByText(modeText,{exact:true})).toHaveCount(1);
  const previousTurns=(await observations()).at(-1).messages;
  assert(previousTurns.some(m=>m.role==='user'&&m.content===failure),'Prior conversation reaches Hermes');
  record(`${name}: in-flight answer returns to original chat and retains context`);

  await page.getByLabel('Tu mensaje',{exact:true}).fill('Borrador conversacional sin enviar');
  await page.getByRole('button',{name:'Roleplay',exact:true}).click();
  await page.getByLabel('Escenario',{exact:true}).selectOption({index:1});
  await page.getByRole('button',{name:'Iniciar práctica',exact:true}).click();
  await expect(page.getByLabel('Tu mensaje',{exact:true})).toHaveValue('');
  await page.getByLabel('Tu mensaje',{exact:true}).fill('Borrador de práctica');
  await page.getByRole('button',{name:'Conversar',exact:true}).click();
  await expect(page.getByLabel('Tu mensaje',{exact:true})).toHaveValue('Borrador conversacional sin enviar');
  await page.getByRole('button',{name:'Roleplay',exact:true}).click();
  await expect(page.getByLabel('Tu mensaje',{exact:true})).toHaveValue('Borrador de práctica');
  await page.getByLabel('Tu mensaje',{exact:true}).fill('Si la propuesta tiene sentido, ¿qué te gustaría aclarar antes de decidir?');
  await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();
  await expect(page.getByRole('button',{name:'Terminar práctica',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Terminar práctica',exact:true}).click();
  await page.getByRole('button',{name:'Enviar a evaluación',exact:true}).click();
  await expect(page.getByRole('button',{name:'Enviada',exact:true})).toBeDisabled();
  record(`${name}: separate drafts and full Roleplay/evaluation with real temporary API`);
  await page.getByRole('button',{name:'Conversar',exact:true}).click();

  const detail=`[detalle] Explica una objeción ${name}`;
  await page.getByLabel('Tu mensaje',{exact:true}).fill(detail);
  const longResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/smart-agent/chat'&&r.status()===200);
  await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();await longResponse;
  const expand=page.getByText('Ver respuesta completa',{exact:true});
  await expect(expand).toBeVisible();await expand.click();
  await expect(log).toContainText('FINAL DEL CONTENIDO COMPLETO.');
  assertFits(await geometry(page));
  await snapshot(page,name+'-long-response');
  record(`${name}: full long answer accessible without clipping page or composer`);

  const doubleText=`Una sola petición ${name} ${runId}`;
  const callsBefore=(await observations()).length;
  await page.getByLabel('Tu mensaje',{exact:true}).fill(doubleText);
  const singleResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/smart-agent/chat'&&r.status()===200);
  await page.getByRole('button',{name:'Enviar mensaje',exact:true}).evaluate(button=>{button.click();button.click();});
  await expect(page.getByText('Coach está respondiendo…',{exact:true})).toBeVisible();
  await log.evaluate(element=>{element.scrollTop=0;element.dispatchEvent(new Event('scroll'));});
  await singleResponse;
  await expect(page.getByRole('button',{name:'Ir al último mensaje',exact:true})).toBeVisible();
  assert.equal(await log.evaluate(element=>element.scrollTop),0,'Receiving response preserves reading position');
  assert.equal((await observations()).length,callsBefore+1,'Synchronous double click sends once');
  await page.getByRole('button',{name:'Ir al último mensaje',exact:true}).click();
  await expect(page.getByRole('button',{name:'Ir al último mensaje',exact:true})).toHaveCount(0);
  await expect.poll(()=>log.evaluate(element=>element.scrollHeight-element.clientHeight-element.scrollTop)).toBeLessThan(2);
  record(`${name}: synchronous double click sends once; reader position preserved until latest action`);
  await page.setViewportSize({width:360,height:460});
  await page.getByLabel('Tu mensaje',{exact:true}).focus();
  assertFits(await geometry(page));
  await snapshot(page,name+'-reduced-height');
  record(`${name}: reduced-height viewport keeps composer accessible (keyboard approximation)`);
}
async function runCase(browser,name,viewport,theme,full) {
  const context=await browser.newContext({viewport,deviceScaleFactor:viewport.width<500?2:1,isMobile:viewport.width<500,hasTouch:viewport.width<500,locale:'es-MX',timezoneId:'America/Cancun',reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try {
    const before=(await observations()).length;await login(page,theme);
    assert.equal((await observations()).length,before,'Opening Coach does not trigger inference');
    await snapshot(page,name+'-empty');assertFits(await geometry(page));
    await page.getByRole('button',{name:'Objeción',exact:true}).click();await expect(page.getByLabel('Tu mensaje',{exact:true})).not.toHaveValue('');
    assert.equal((await observations()).length,before,'Suggestion fills editable draft without inference');
    await send(page,`Quiero practicar Step 5 [qa-${name}]`);
    assertFits(await geometry(page));const colors=await contrast(page);
    await snapshot(page,name+'-chat');record(name+': viewport, theme, suggestions and accessible message contrast',{viewport,theme,colors,geometry:await geometry(page)});
    if(full)await interactions(page,name);
    await page.getByRole('button',{name:'Cambiar tema',exact:true}).filter({visible:true}).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme',theme==='dark'?'light':'dark');
    assert.deepEqual(errors,[]);record(name+': theme control remains reachable and no JS errors');
  } catch(error) {await snapshot(page,name+'-failure').catch(()=>{});report.failure={name,message:error.message,errors,geometry:await geometry(page).catch(()=>null)};throw error;}
  finally{await context.close();}
}
(async()=>{
  await fs.mkdir(directory,{recursive:true});const browsers=[];
  try{
    const c=await chromium.launch(),w=await webkit.launch();browsers.push(c,w);
    for(const theme of ['dark','light']){
      await runCase(c,'android-'+theme,{width:360,height:800},theme,theme==='dark');
      await runCase(w,'iphone-'+theme,{width:390,height:844},theme,theme==='light');
      await runCase(c,'desktop-'+theme,{width:1440,height:900},theme,false);
    }
    report.passed=true;
  }finally{await fs.writeFile(path.join(directory,'results.json'),JSON.stringify(report,null,2));await Promise.all(browsers.map(b=>b.close()));}
  console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,screenshots:report.screenshots.length}));
})().catch(error=>{console.error(error);process.exitCode=1;});
