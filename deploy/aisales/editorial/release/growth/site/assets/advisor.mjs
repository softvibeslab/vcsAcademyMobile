/** Public advisor UI. All inference and knowledge selection stay on the server. */
const roles={rep:'Representante',leader:'Líder',director:'Dirección',other:'Otro rol'};
const rooms={'1':'1 sala','2-3':'2–3 salas','4+':'4 o más salas',unknown:'Por definir'};
export function buildSummary(v){
 const lines=[v.name&&`Nombre: ${v.name}`,`Rol: ${roles[v.role]||'Por definir'}`,`Salas: ${rooms[v.roomCountBucket]||'Por definir'}`,v.teamSize&&`Equipo: ${v.teamSize}`,v.need&&`Necesidad: ${v.need}`,v.timeframe&&`Plazo: ${v.timeframe}`,v.contact&&`Contacto: ${v.contact}`];
 lines.push(v.preferredDate&&v.preferredTime?`Horario preferido: ${v.preferredDate} a las ${v.preferredTime} (${v.timezone}). Por confirmar con Chris.`:'Fecha y horario: por acordar con Chris.');
 return lines.filter(Boolean).join('\n').slice(0,1500);
}
export function buildWhatsAppUrl(summary){
 return `https://wa.me/529843163268?text=${encodeURIComponent(`Hola Chris, quiero coordinar una demo de Sales Academy.\n\n${String(summary).slice(0,1500)}\n\nSolicitud pendiente de confirmación contigo.`)}`;
}
export function safeResourceUrl(value){return typeof value==='string'&&/^\/mediahub\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(value)?value:null;}
const filmIds=new Set(['smart-agent','menos-caos','sistema-conectado','infraestructura-comercial','conocimiento-en-practica']);
export function safeVideo(value){
 if(!value||!filmIds.has(value.id))return null;
 const base='/growth-assets/films/'+value.id;
 if(value.src!==base+'.mp4'||value.poster!==base+'.webp'||value.captions!==base+'.es.vtt')return null;
 if(!Number.isFinite(value.durationSeconds)||value.durationSeconds<=0||value.durationSeconds>600)return null;
 if(!Number.isInteger(value.width)||!Number.isInteger(value.height)||value.width<1||value.height<1||value.width>4096||value.height>4096)return null;
 return value;
}
export function safeSuggestions(values){
 const seen=new Set();return (Array.isArray(values)?values:[]).filter(v=>{
  if(!v||typeof v.id!=='string'||!/^[-a-z0-9]{1,64}$/.test(v.id)||seen.has(v.id)||typeof v.label!=='string'||!v.label.trim()||v.label.length>48)return false;
  if(v.kind!=='demo'&&(v.kind!=='prompt'||typeof v.prompt!=='string'||!v.prompt.trim()||v.prompt.length>1200))return false;
  seen.add(v.id);return true;
 }).slice(0,3);
}
export function appointmentError(v,now=new Date()){
 if(Boolean(v.preferredDate)!==Boolean(v.preferredTime))return 'Indica fecha y hora juntas, o deja ambas vacías para acordarlas con Chris.';
 try{
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:v.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  const current=`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  if(v.preferredDate&&`${v.preferredDate}T${v.preferredTime}`<=current)return 'Elige una fecha y hora futuras en la zona seleccionada, o déjalas vacías para acordarlas con Chris.';
 }catch{return 'Selecciona una zona horaria válida.';}
 return '';
}

function mountAdvisor(){
 if(document.body.dataset.preview==='true'||document.querySelector('[data-advisor-open]'))return;
 const root=document.createElement('div');root.className='advisor-root';
 root.innerHTML=`
 <button class="advisor-launcher" type="button" data-advisor-open aria-haspopup="dialog" aria-controls="sa-advisor-dialog" aria-expanded="false"><span class="advisor-mark" aria-hidden="true">✦</span><span><strong>Pregunta a Sales Academy</strong><small>Tu asesor con IA</small></span><span class="advisor-launch-arrow" aria-hidden="true">↗</span></button>
 <dialog class="advisor-dialog" id="sa-advisor-dialog" aria-labelledby="sa-advisor-title">
  <div class="advisor-shell">
   <header class="advisor-header"><span class="advisor-mark" aria-hidden="true">✦</span><div><p>SALES ACADEMY · ASISTENTE IA</p><h2 id="sa-advisor-title">Tu siguiente paso, claro.</h2></div><button type="button" class="advisor-close" data-advisor-close aria-label="Cerrar asesor">×</button></header>
   <div class="advisor-tabs" role="group" aria-label="Qué quieres hacer"><button type="button" data-advisor-tab="chat" aria-pressed="true">Conversar</button><button type="button" data-advisor-tab="demo" aria-pressed="false">Coordinar demo <span aria-hidden="true">↗</span></button></div>
   <section class="advisor-chat" id="sa-advisor-chat" aria-label="Conversación con el asesor">
    <div class="advisor-messages" id="sa-advisor-messages" role="log" aria-label="Mensajes" aria-live="polite" aria-relevant="additions text"><article class="advisor-message advisor-message-assistant"><span class="advisor-sender">ASESOR IA</span><p>Soy tu asesor IA de Sales Academy. Descubre cómo los agentes pueden ayudar a tu sala y explora una demo con Chris. ¿Qué te gustaría mejorar?</p></article></div>
    <div class="advisor-chat-feedback"><p id="sa-advisor-chat-status" role="status"></p><button type="button" class="advisor-text-button" data-advisor-retry hidden>Reintentar pregunta</button><a href="https://wa.me/529843163268?text=Hola%20Chris%2C%20quiero%20conocer%20Sales%20Academy." target="_blank" rel="noopener noreferrer" data-advisor-fallback hidden>Hablar con Chris por WhatsApp ↗</a></div>
    <form class="advisor-composer" id="sa-advisor-chat-form"><label class="advisor-sr-only" for="sa-advisor-message">Tu pregunta sobre Sales Academy</label><textarea id="sa-advisor-message" name="message" rows="2" maxlength="1200" placeholder="Cuéntame qué quieres mejorar en tu sala…" required></textarea><button type="submit" aria-label="Enviar pregunta"><span aria-hidden="true">↑</span></button></form>
    <p class="advisor-disclosure">Conversación disponible durante 1 hora; borrado automático periódico. IA mediante Hermes y OpenAI. Evita datos de clientes. <a href="/descubre/privacidad/" target="_blank" rel="noopener noreferrer">Privacidad</a></p>
   </section>
   <section class="advisor-demo" id="sa-advisor-demo" aria-label="Solicitud de demo" hidden>
    <div class="advisor-demo-intro"><p class="advisor-eyebrow">CON CHRIS · POR WHATSAPP</p><h3>Una demo para tu contexto.</h3><p>Comparte lo que sea útil. Revisarás el mensaje antes de abrir WhatsApp; la fecha se acuerda con Chris.</p></div>
    <form id="sa-advisor-demo-form" class="advisor-demo-form">
     <div class="advisor-field-row"><label>Tu nombre <span>(opcional)</span><input name="name" autocomplete="given-name" maxlength="80" /></label><label>Tu rol<select name="role"><option value="other">Selecciona tu rol</option value="rep">Representante</option><option value="leader">Líder</option><option value="director">Dirección</option></select></label></div>
     <div class="advisor-field-row"><label>Salas<select name="roomCountBucket"><option value="unknown">Por definir</option><option value="1">1 sala</option><option value="2-3">2–3 salas</option><option value="4+">4 o más salas</option></select></label><label>Tamaño del equipo<input name="teamSize" maxlength="60" placeholder="Ej. 20 representantes" /></label></div>
     <label>¿Qué quieres mejorar?<textarea name="need" rows="2" maxlength="600" placeholder="Preparación, práctica, coaching, conocimiento…"></textarea></label><button type="button" class="advisor-text-button" data-advisor-use-question hidden>Usar mi última pregunta como punto de partida</button>
     <div class="advisor-field-row"><label>¿Para cuándo?<input name="timeframe" maxlength="120" placeholder="Ej. Este mes" /></label><label>Contacto <span>(opcional)</span><input name="contact" autocomplete="off" maxlength="120" placeholder="Correo o WhatsApp" /></label></div>
     <fieldset><legend>Tu horario preferido <span>(opcional)</span></legend><div class="advisor-field-row"><label>Fecha<input type="date" name="preferredDate" /></label><label>Hora<input type="time" name="preferredTime" /></label></div><label>Zona horaria<select name="timezone"><option value="America/Cancun">Cancún · Caribe mexicano</option><option value="America/Mexico_City">Ciudad de México</option><option value="America/Tijuana">Tijuana</option><option value="America/Hermosillo">Hermosillo</option><option value="America/New_York">Este de EE. UU.</option><option value="America/Los_Angeles">Pacífico de EE. UU.</option><option value="America/Bogota">Bogotá</option><option value="Europe/Madrid">Madrid</option></select></label><small>Deja fecha y hora vacías si prefieres acordarlas en la conversación.</small></fieldset>
     <p id="sa-advisor-form-status" class="advisor-form-status" role="status"></p><button type="submit" class="advisor-primary">Preparar mi solicitud <span aria-hidden="true">→</span></button>
    </form>
    <section class="advisor-review" id="sa-advisor-review" hidden><p class="advisor-eyebrow">REVISA ANTES DE COMPARTIR</p><label for="sa-advisor-summary">Tu resumen editable</label><textarea id="sa-advisor-summary" rows="7" maxlength="1500"></textarea><a class="advisor-primary" data-advisor-whatsapp target="_blank" rel="noopener noreferrer">Coordinar mi demo con Chris <span aria-hidden="true">↗</span></a><p class="advisor-pending">Pendiente de confirmación. WhatsApp abre tu mensaje; tú decides si lo envías.</p><label class="advisor-consent"><input type="checkbox" id="sa-advisor-contact-consent" /><span>También quiero guardar esta solicitud en Sales Academy para que Chris pueda darle seguimiento. <a href="/descubre/privacidad/" target="_blank" rel="noopener noreferrer">Ver privacidad</a>.</span></label><button type="button" class="advisor-secondary" data-advisor-save hidden>Guardar solicitud para seguimiento</button><p id="sa-advisor-save-status" role="status"></p></section>
   </section>
  </div>
 </dialog>`;
 document.body.append(root);
 const $=s=>root.querySelector(s),dialog=$('dialog'),launcher=$('[data-advisor-open]'),message=$('#sa-advisor-message'),feed=$('#sa-advisor-messages'),chatStatus=$('#sa-advisor-chat-status'),retry=$('[data-advisor-retry]'),fallback=$('[data-advisor-fallback]');
 const demoForm=$('#sa-advisor-demo-form'),review=$('#sa-advisor-review'),summary=$('#sa-advisor-summary'),wa=$('[data-advisor-whatsapp]'),save=$('[data-advisor-save]'),consent=$('#sa-advisor-contact-consent');
 let session=null,sessionPromise=null,busy=false,pending=null,prepared=null,pendingLead=null,restored=false,lastQuestion='',currentSuggestions=[];
 const uuid=()=>crypto.randomUUID();
 async function api(path,payload){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  try{
   const response=await fetch('/growth-api/advisor/'+path,{method:payload?'POST':'GET',credentials:'same-origin',headers:payload?{'Content-Type':'application/json','X-Advisor-CSRF':session?.csrf||''}:{},body:payload?JSON.stringify(payload):undefined,signal:controller.signal});
   const data=await response.json();if(!response.ok){const error=new Error(data.error?.message||'No se pudo completar la solicitud. Puedes reintentar.');error.status=response.status;throw error;}return data;
  }catch(error){if(error.name==='AbortError'||error.message==='Failed to fetch')throw new Error('La conexión tardó más de lo esperado. Puedes reintentar o hablar con Chris.');throw error;}finally{clearTimeout(timer);}
 }
 function pauseMedia(){root.querySelectorAll('video').forEach(v=>v.pause());}
 function clearControls(){pauseMedia();feed.querySelectorAll('[data-advisor-current]').forEach(el=>el.remove());currentSuggestions=[];}
 function addMessage(role,text,detail){
  // Old idempotent replies may predate the brief-answer contract. Preserve their wording.
  if(role==='assistant'&&text.trim().split(/\s+/).length>90){detail=typeof detail==='string'&&detail.trim()?detail:text;text='La explicación completa y sus condiciones están en «Ver detalle». Puedes revisarlas y elegir tu siguiente paso.';}
  const article=document.createElement('article');article.className='advisor-message advisor-message-'+(role==='user'?'user':'assistant');
  const sender=document.createElement('span');sender.className='advisor-sender';sender.textContent=role==='user'?'TÚ':'ASESOR IA';
  const body=document.createElement('p');body.textContent=text;article.append(sender,body);
  if(role==='assistant'&&typeof detail==='string'&&detail.trim()){
   const more=document.createElement('details'),label=document.createElement('summary'),full=document.createElement('p');more.className='advisor-detail';label.textContent='Ver detalle';full.textContent=detail.slice(0,6000);more.append(label,full);article.append(more);
  }
  feed.append(article);feed.scrollTop=feed.scrollHeight;return article;
 }
 function resourceCard(resource){
  const url=safeResourceUrl(resource?.url);if(!url||typeof resource.title!=='string'||!resource.title.trim())return null;
  const card=document.createElement('article');card.className='advisor-resource';card.dataset.advisorResource='';
  const title=document.createElement('h3');title.className='advisor-resource-title';title.textContent=resource.title.slice(0,180);
  const evidence=document.createElement('p');evidence.className='advisor-resource-evidence';evidence.textContent=typeof resource.evidenceLabel==='string'?resource.evidenceLabel.slice(0,140):'Recurso de Sales Academy';
  card.append(evidence,title);
  if(typeof resource.excerpt==='string'&&resource.excerpt.trim()){const excerpt=document.createElement('p');excerpt.className='advisor-resource-excerpt';excerpt.textContent=resource.excerpt.slice(0,220);card.append(excerpt);}
  const clip=resource.type==='video'?safeVideo(resource.video):null;
  if(clip){
   const frame=document.createElement('div'),poster=document.createElement('img'),play=document.createElement('button');frame.className='advisor-video-frame';poster.src=clip.poster;poster.alt='';poster.width=clip.width;poster.height=clip.height;poster.loading='lazy';poster.decoding='async';
   play.type='button';play.className='advisor-video-play';play.dataset.advisorVideoPlay='';play.setAttribute('aria-label','Reproducir video: '+resource.title);play.textContent='▶ Ver video · '+Math.round(clip.durationSeconds)+' s';frame.append(poster,play);card.append(frame);
   const hint=document.createElement('p');hint.className='advisor-video-hint';hint.textContent='Audio y subtítulos en español. Tú decides cuándo reproducir.';card.append(hint);
   let video;
   play.addEventListener('click',()=>{
    if(!video){
     video=document.createElement('video');video.dataset.advisorVideo='';video.controls=true;video.playsInline=true;video.preload='none';video.poster=clip.poster;video.setAttribute('aria-label',resource.title);
     const track=document.createElement('track');track.kind='captions';track.src=clip.captions;track.srclang='es';track.label='Español';track.default=true;video.append(track);video.src=clip.src;frame.append(video);
     video.addEventListener('error',()=>{hint.textContent='No se pudo reproducir aquí. Puedes abrir el recurso en MediaHub.';play.hidden=false;});
    }
    poster.hidden=true;play.hidden=true;video.play().catch(()=>{play.hidden=false;hint.textContent='Pulsa reproducir para volver a intentar. También puedes abrir el recurso.';});
   });
  }
  const link=document.createElement('a');link.href=url;link.textContent=clip?'Ver contexto y transcripción ↗':'Abrir recurso ↗';link.target='_blank';link.rel='noopener noreferrer';link.className='advisor-resource-link';card.append(link);return card;
 }
 function renderControls(suggestions,resources){
  clearControls();const group=document.createElement('div');group.className='advisor-current';group.dataset.advisorCurrent='';currentSuggestions=safeSuggestions(suggestions);
  if(currentSuggestions.length){
   const label=document.createElement('p');label.className='advisor-controls-label';label.textContent='Elige un siguiente paso';const choices=document.createElement('div');choices.className='advisor-suggestions';choices.setAttribute('role','group');choices.setAttribute('aria-label','Sugerencias para continuar');
   for(const suggestion of currentSuggestions){const button=document.createElement('button');button.type='button';button.dataset.advisorSuggestion=suggestion.id;button.dataset.kind=suggestion.kind;button.textContent=suggestion.label;button.disabled=busy;choices.append(button);}group.append(label,choices);
  }
  const cards=(Array.isArray(resources)?resources:[]).filter(r=>safeResourceUrl(r?.url)&&typeof r.title==='string'&&r.title.trim()).slice(0,2).map(resourceCard).filter(Boolean);if(cards.length){const list=document.createElement('div');list.className='advisor-resources';list.setAttribute('aria-label','Contenido recomendado');list.append(...cards);group.append(list);}feed.append(group);
 }
 feed.addEventListener('click',e=>{
  const button=e.target.closest('[data-advisor-suggestion]');if(!button||busy)return;
  const suggestion=currentSuggestions.find(v=>v.id===button.dataset.advisorSuggestion);if(!suggestion)return;
  if(suggestion.kind==='demo')tab('demo');else send(suggestion.prompt);
 });
 document.addEventListener('play',e=>{if(e.target.tagName==='VIDEO')document.querySelectorAll('video').forEach(v=>{if(v!==e.target)v.pause();});},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseMedia();});
 async function ensureSession(){
  if(session)return session;if(sessionPromise)return sessionPromise;
  sessionPromise=api('session').then(data=>{
   session=data;if(!restored&&Array.isArray(data.messages)){for(const m of data.messages)if(['user','assistant'].includes(m.role)&&typeof m.content==='string'){addMessage(m.role,m.content,m.detail);if(m.role==='user')lastQuestion=m.content;}restored=true;$('[data-advisor-use-question]').hidden=!lastQuestion;}
   renderControls(data.suggestions,data.resources);
   if(!data.enabled){chatStatus.textContent='El asesor está en pausa. Puedes preparar tu solicitud o hablar con Chris.';fallback.hidden=false;}
   return data;
  }).finally(()=>{sessionPromise=null;});return sessionPromise;
 }
 function tab(which){
  if(which!=='chat')pauseMedia();
  $('#sa-advisor-chat').hidden=which!=='chat';$('#sa-advisor-demo').hidden=which!=='demo';
  root.querySelectorAll('[data-advisor-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.advisorTab===which)));
  if(which==='chat')message.focus();else demoForm.querySelector('input').focus();
 }
 launcher.addEventListener('click',()=>{
  document.querySelectorAll('video').forEach(v=>v.pause());dialog.showModal();launcher.setAttribute('aria-expanded','true');document.documentElement.classList.add('advisor-open');
  message.focus();ensureSession().catch(e=>{chatStatus.textContent=e.message;fallback.hidden=false;});
 });
 function close(){pauseMedia();dialog.close();}
 dialog.addEventListener('cancel',pauseMedia);
 $('[data-advisor-close]').addEventListener('click',close);
 dialog.addEventListener('close',()=>{pauseMedia();launcher.setAttribute('aria-expanded','false');document.documentElement.classList.remove('advisor-open');launcher.focus();});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
 root.querySelectorAll('[data-advisor-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.advisorTab)));
 function loading(value){busy=value;$('#sa-advisor-chat-form button').disabled=value;message.disabled=value;retry.disabled=value;root.querySelectorAll('[data-advisor-suggestion]').forEach(b=>b.disabled=value);feed.setAttribute('aria-busy',String(value));}
 async function send(text,repeating=false){
  if(busy||!text.trim())return;clearControls();loading(true);retry.hidden=true;chatStatus.textContent='Preparando una respuesta breve…';
  if(!repeating){pending={message:text.trim().slice(0,1200),requestId:uuid()};lastQuestion=pending.message;$('[data-advisor-use-question]').hidden=false;addMessage('user',pending.message);message.value='';}
  try{
   const current=await ensureSession();if(!current.enabled){session=null;throw new Error('El asesor está en pausa. Puedes reintentar más tarde o hablar con Chris.');}
   const data=await api('messages',pending);if(typeof data.reply!=='string')throw new Error('La respuesta no llegó completa. Puedes reintentar.');
   const article=addMessage('assistant',data.reply,data.detail);renderControls(data.suggestions,data.resources);feed.scrollTop=Math.max(0,article.offsetTop-8);pending=null;
   chatStatus.textContent=data.remainingTurns===0?'Has llegado al límite de esta conversación. Puedes coordinar tu demo con Chris.':'';
  }catch(e){if([401,403].includes(e.status))session=null;chatStatus.textContent=e.message;retry.hidden=false;fallback.hidden=false;}finally{loading(false);}
 }
 $('#sa-advisor-chat-form').addEventListener('submit',e=>{e.preventDefault();send(message.value);});
 message.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send(message.value);}});
 retry.addEventListener('click',()=>{if(pending)send(pending.message,true);});
 const zone=demoForm.elements.timezone;
 try{const local=Intl.DateTimeFormat().resolvedOptions().timeZone;if(local){if(!Array.from(zone.options).some(o=>o.value===local)){const o=new Option(local+' · tu dispositivo',local);zone.append(o);}zone.value=local;}}catch{}
 demoForm.addEventListener('input',()=>{review.hidden=true;prepared=null;pendingLead=null;consent.checked=false;save.hidden=true;$('#sa-advisor-save-status').textContent='';});
 $('[data-advisor-use-question]').addEventListener('click',()=>{demoForm.elements.need.value=lastQuestion.slice(0,600);demoForm.elements.need.dispatchEvent(new Event('input',{bubbles:true}));demoForm.elements.need.focus();});
 demoForm.addEventListener('submit',e=>{
  e.preventDefault();const values=Object.fromEntries(new FormData(demoForm));const error=appointmentError(values);$('#sa-advisor-form-status').textContent=error;if(error)return;
  prepared=values;summary.value=buildSummary(values);wa.href=buildWhatsAppUrl(summary.value);review.hidden=false;pendingLead=null;$('#sa-advisor-save-status').textContent='';summary.focus();
 });
 summary.addEventListener('input',()=>{wa.href=buildWhatsAppUrl(summary.value);pendingLead=null;$('#sa-advisor-save-status').textContent='';});
 consent.addEventListener('change',()=>{save.hidden=!consent.checked;});
 save.addEventListener('click',async()=>{
  if(!consent.checked||!prepared)return;save.disabled=true;const status=$('#sa-advisor-save-status');status.textContent='Guardando tu solicitud…';
  try{
   await ensureSession();const payload={...prepared,summary:summary.value,contactConsent:true,privacyVersion:'2026-11-07-advisor'};
   const fingerprint=JSON.stringify(payload);if(!pendingLead||pendingLead.fingerprint!==fingerprint)pendingLead={fingerprint,requestId:uuid()};
   const data=await api('leads',{...payload,requestId:pendingLead.requestId});
   if(!data.received||!data.id||data.status!=='pending_confirmation')throw new Error('No pudimos confirmar el guardado. Puedes reintentar.');
   status.textContent=`Solicitud guardada · referencia ${data.id}. La demo sigue pendiente de confirmación con Chris.`;
  }catch(e){if([401,403].includes(e.status))session=null;status.textContent=e.message+' Puedes continuar por WhatsApp sin guardar.';}finally{save.disabled=false;}
 });
 const consentPanel=document.querySelector('#consent-panel');
 function avoidConsent(){
  let offset=20;if(consentPanel&&!consentPanel.hidden){const c=consentPanel.getBoundingClientRect(),b=launcher.getBoundingClientRect();if(b.right>c.left&&b.left<c.right)offset=Math.max(20,innerHeight-c.top+12);}
  launcher.style.bottom=`calc(${offset}px + env(safe-area-inset-bottom, 0px))`;
  const b=launcher.getBoundingClientRect();
  const overlapsPlayingFilm=[...document.querySelectorAll('video')].some(video=>{if(video.paused||video.ended)return false;const v=video.getBoundingClientRect();return b.left<v.right&&b.right>v.left&&b.top<v.bottom&&b.bottom>v.top;});
  launcher.style.visibility=overlapsPlayingFilm?'hidden':'visible';
 }
 if(consentPanel){new MutationObserver(avoidConsent).observe(consentPanel,{attributes:true,attributeFilter:['hidden']});new ResizeObserver(avoidConsent).observe(consentPanel);}
 let layoutQueued=false;
 function queueLayout(){if(layoutQueued)return;layoutQueued=true;requestAnimationFrame(()=>{layoutQueued=false;avoidConsent();});}
 addEventListener('resize',queueLayout,{passive:true});addEventListener('scroll',queueLayout,{passive:true});
 for(const event of ['play','pause','ended'])document.addEventListener(event,queueLayout,true);
 avoidConsent();
}
if(typeof document!=='undefined')mountAdvisor();
