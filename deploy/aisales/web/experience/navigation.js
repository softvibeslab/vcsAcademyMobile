(() => {
  'use strict';
  const config=document.currentScript.dataset;
  const id=config.screen||'01', app=config.mode==='app';
  const demo='https://wa.me/529843163268?text='+encodeURIComponent('Hola, quiero conocer los agentes de IA de Sales Academy y agendar una demo para mi sala de ventas.');
  const css=document.createElement('link');css.rel='stylesheet';css.href='/experience/navigation.css';document.head.append(css);
  const go=n=>{location.href='/comercial-stitch/'+n+'/'};
  const routes=[[/privacidad/,'10'],[/cerrar sesi[oó]n/,'15'],[/solicitar.*demo|agendar|whatsapp/,'14'],[/diagn[oó]stico|auditor[ií]a/,'06'],[/mediahub|biblioteca de recursos|volver.*biblioteca/,'03'],[/pel[ií]cula|reproducir|play_arrow|ver.*video/,'05'],[/galer[ií]a|momentos/,'08'],[/an[aá]lisis|implementaci[oó]n|metodolog[ií]a/,'09'],[/usuarios.*acceso/,'25'],[/publicaciones|historial/,'24'],[/solicitudes/,'22'],[/biblioteca de medios|^medios/,'20'],[/subir.*medio/,'21'],[/editar landing|^landing/,'17'],[/asesor ia/,'23'],[/asesor|conversar/,'11'],[/^recursos/,'18'],[/^inicio|sales academy|volver.*sitio/,'01']];
  const live={'01':'/','03':'/mediahub/','04':'/mediahub/','05':'/growth-assets/films/smart-agent.mp4','06':'/descubre/diagnostico/','08':'/#galeria','09':'/descubre/analisis/','10':'/descubre/privacidad/','11':'/academia/#access/start','12':'/academia/#access/start','13':'/growth-assets/films/smart-agent.mp4','14':demo,'15':'/cms/'};
  function notice(message){document.querySelector('.sa-notice')?.remove();const n=document.createElement('div');n.className='sa-notice';n.setAttribute('role','status');const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Cerrar aviso');close.onclick=()=>n.remove();n.append(close,document.createTextNode(message));const a=document.createElement('a');a.href=Number(id)>=15?'/cms/':'/academia/';a.textContent=Number(id)>=15?'Abrir CMS funcional':'Abrir academia funcional';n.append(a);document.body.append(n)}
  if(!new URLSearchParams(location.search).has('presentation')){
    const panel=document.createElement('details');panel.className='sa-switch';
    const summary=document.createElement('summary');summary.textContent=app?'Sales Academy · Explorar ↗':'Prototipo Stitch · '+id+' / 25';panel.append(summary);
    const p=document.createElement('p');p.textContent=app?'Elige tu experiencia.':'Referencia visual. Los datos y formularios de estas pantallas son ejemplos; no guardan información.';panel.append(p);
    for(const [text,href]of [['Inicio','/'],['Entrar a la academia','/academia/'],['Diagnóstico','/descubre/diagnostico/'],['MediaHub','/mediahub/'],['Estudio editorial','/cms/'],['Comparar diseños Stitch','/comercial-stitch/'],['Wireframe','/wireframe-comercial/']]){const a=document.createElement('a');a.textContent=text;a.href=href;panel.append(a)}
    if(!app){const select=document.createElement('select');select.setAttribute('aria-label','Elegir pantalla Stitch');panel.append(select);fetch('/experience/catalog.json').then(r=>r.json()).then(items=>items.forEach(s=>{const o=new Option(s.title,s.id,s.id===id,s.id===id);select.append(o)}));select.onchange=()=>go(select.value)}
    document.body.append(panel);
  }
  document.querySelectorAll('aside.cursor-pointer').forEach(el=>{el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label','Abrir asesor');el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click()}})});
  if(app){
    document.body.classList.add('sa-adapted');
    if(id==='01'&&matchMedia('(max-width: 767px)').matches){location.replace('/inicio-movil/'+location.hash);return}
    const nav=document.querySelector('header nav')||document.querySelector('header > div');
    if(nav){const a=document.createElement('a');a.className='sa-app-entry';a.textContent='Entrar a la academia ↗';a.href='/academia/';nav.append(a)}
  }
  // Reference forms are never submitted. Live functions have their own authenticated pages.
  document.addEventListener('submit',e=>{e.preventDefault();if(app){notice('Continúa en la academia para usar las funciones disponibles.');return}if(id==='15'){go('16');return}if(['11','12'].includes(id)){go('12');return}notice('Vista de diseño: no se enviaron ni guardaron datos.')});
  document.querySelectorAll('a').forEach(a=>{if(a.closest('.sa-switch')||a.classList.contains('sa-app-entry'))return;a.removeAttribute('target');const href=a.getAttribute('href')||'';const label=a.textContent.trim().toLowerCase();const target=routes.find(([re])=>re.test(label))?.[1];if(app){if(a.closest('#mediahub')&&href==='#')a.href='/mediahub/';else if(href.startsWith('https://wa.me'))a.href=demo;else if(target)a.href=live[target]||'/cms/';else if(href==='#')a.href='/academia/#access/start'}else if(target)a.href='/comercial-stitch/'+target+'/';});
  document.addEventListener('click',e=>{
    const el=e.target.closest('a,button,[role="button"]');if(!el||el.closest('.sa-switch,.sa-notice')||el.classList.contains('sa-app-entry'))return;
    const href=el.getAttribute('href')||'',label=(el.textContent+' '+(el.getAttribute('aria-label')||'')).trim().toLowerCase();
    if(el.tagName==='A'&&href.startsWith('#')&&href.length>1){const node=document.getElementById(href.slice(1));if(node){e.preventDefault();node.scrollIntoView({behavior:'smooth'});return}}
    if(el.tagName==='A'&&(/^(\/|https:\/\/wa.me\/)/.test(href)))return;
    e.preventDefault();
    if(app){if(/coach|pregunta a sales academy|abrir asesor/.test(label)){location.href='/academia/#access/start';return}if(/^(menu|menú)(?:\s|$)/.test(label)){const panel=document.querySelector('.sa-switch');if(panel)panel.open=!panel.open;return}if(el.tagName==='BUTTON'&&(!label||/play_arrow/.test(label))){location.href=live['05'];return}const t=routes.find(([re])=>re.test(label))?.[1];if(t){location.href=live[t]||'/cms/';return}if(/practicar|comenzar|preparar|roadmap|coach/.test(label)){location.href='/academia/#access/start';return}if(/play|demo/.test(label)){location.href=live['05'];return}notice('Consulta los recursos y funciones disponibles en la academia.');return}
    if(Number(id)>=15&&/guardar|publicar|eliminar|invitar|subir archivo|restaurar/.test(label)){notice('Vista de diseño: esta acción no modifica contenido real.');return}
    if(id==='15'&&/iniciar|entrar|acceder/.test(label)){go('16');return}
    if(id==='06'&&/continuar|resultado|siguiente/.test(label)){go('07');return}
    if(['11','12'].includes(id)&&/soy |comenzar|enviar|conversar/.test(label)){go('12');return}
    if(id==='18'&&/crear|nuevo|editar/.test(label)){go('19');return}
    if(id==='20'&&/subir/.test(label)){go('21');return}
    const t=routes.find(([re])=>re.test(label))?.[1];if(t&&t!==id){go(t);return}
    notice('Referencia visual: usa el selector de pantallas para continuar el recorrido.');
  });
  if(!app&&id==='06'){document.querySelectorAll('input').forEach(el=>el.addEventListener('change',()=>document.querySelectorAll('button[disabled]').forEach(b=>b.disabled=false)))}
})();
