const groups=window.CATALOG.groups, screens=groups.flatMap(g=>g.screens.map(s=>({...s,group:g}))), byId=Object.fromEntries(screens.map(s=>[s.id,s]));
const $=s=>document.querySelector(s), nav=$('#navigation'), frame=$('#screen-frame');
let current=null, trail=[], journey=null, toastTimer;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500)}
function go(id){if(!byId[id])return;location.hash=id}
function closeMenu(){$('#sidebar').classList.remove('open');$('#menu').setAttribute('aria-expanded','false')}
nav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});
function renderNav(query=''){nav.innerHTML=groups.map(g=>{const found=g.screens.filter(s=>(s.id+' '+s.title).toLowerCase().includes(query.toLowerCase()));return found.length?`<details ${query||current?.[0]===g.id?'open':''}><summary>${g.id} &nbsp; ${g.title}</summary>${found.map(s=>`<a href="#${s.id}" class="${s.id===current?'active':''}" ${s.id===current?'aria-current="page"':''}><span>${s.id}</span>${s.title}</a>`).join('')}</details>`:''}).join('')}
function renderMap(){
 $('#journeys').innerHTML=FLOWS.map((f,i)=>`<button class="journey-card" data-start="${i}"><small>RECORRIDO ${String(i+1).padStart(2,'0')}</small><strong>${f.name} ↗</strong><span>${f.ids.length} pasos · ${f.ids[0]} → ${f.ids.at(-1)}</span></button>`).join('');
 $('#modules').innerHTML=groups.map(g=>`<article class="module"><div class="module-head"><span class="module-code">${g.id}</span><div><h3>${g.title}</h3><small>${g.screens.length} pantallas · ${g.id==='H'?'Escritorio':'Móvil'}</small></div></div><div class="module-screens">${g.screens.map(s=>`<a href="#${s.id}"><span>${s.id}</span>${s.title}<i>↗</i></a>`).join('')}</div></article>`).join('');
}
function renderJourney(){const bar=$('#journey-bar');bar.hidden=!journey;if(!journey)return;const f=FLOWS[journey.index];bar.innerHTML=`<strong>${f.name}</strong><span>Paso ${journey.step+1} de ${f.ids.length}</span><button id="step-prev" ${journey.step===0?'disabled':''}>← Anterior</button><button id="step-next">${journey.step===f.ids.length-1?'Terminar recorrido ✓':'Siguiente paso →'}</button><button id="exit-journey" aria-label="Salir del recorrido">Salir ×</button>`;$('#step-prev').onclick=()=>{journey.step--;go(f.ids[journey.step])};$('#step-next').onclick=()=>{if(journey.step===f.ids.length-1){journey=null;location.hash='map';toast('Recorrido completado. Puedes explorar otro flujo.')}else{journey.step++;go(f.ids[journey.step])}};$('#exit-journey').onclick=()=>{journey=null;renderJourney()}}
function configure(){if(current)frame.contentWindow.postMessage({type:'configure-wireframe',id:current,links:LINKS[current],validIds:screens.map(s=>s.id)},'*')}
frame.addEventListener('load',configure);
function render(){
 const id=decodeURIComponent(location.hash.slice(1)||'map');closeMenu();
 if(id==='map'||!byId[id]){current=null;$('#map-view').hidden=false;$('#player-view').hidden=true;$('#breadcrumb').textContent='Vista general / Mapa de la app';document.title='Sales Academy · Prototipo navegable';renderNav($('#search').value);window.scrollTo(0,0);return}
 if(current&&current!==id)trail.push(current);current=id;const s=byId[id];
 if(journey&&FLOWS[journey.index].ids[journey.step]!==id){const index=FLOWS[journey.index].ids.indexOf(id,journey.step);if(index>=0)journey.step=index;else journey=null}
 $('#map-view').hidden=true;$('#player-view').hidden=false;$('#breadcrumb').textContent=s.group.title+' / '+s.id;
 $('#screen-id').textContent=s.id;$('#screen-title').textContent=s.title;$('#description').textContent=s.description;
 $('#device').classList.toggle('desktop',s.group.id==='H');$('#device-label').textContent=s.group.id==='H'?'VISTA DE ESCRITORIO · desplaza horizontalmente en móvil':'VISTA MÓVIL';
 frame.title=s.id+' · '+s.title;frame.src='screens/'+id+'.html';
 $('#actions').innerHTML=LINKS[id].map(([label,target])=>`<button data-go="${target}"><span>${label}</span><small>${target} ↗</small></button>`).join('');
 $('#board-link').href='reference/'+s.group.id+'.png';
 document.title=s.title+' · Sales Academy';renderNav($('#search').value);renderJourney();window.scrollTo(0,0);
}
document.addEventListener('click',e=>{const start=e.target.closest('[data-start]'),action=e.target.closest('[data-go]');if(start){journey={index:Number(start.dataset.start),step:0};go(FLOWS[journey.index].ids[0]);if(current===FLOWS[journey.index].ids[0])renderJourney()}if(action)go(action.dataset.go);if(e.target.closest('[data-map]')){journey=null;location.hash='map'}});
$('#back').onclick=()=>{journey=null;const last=trail.pop();if(last){current=null;go(last)}else location.hash='map'};
$('#search').addEventListener('input',e=>renderNav(e.target.value));$('#menu').onclick=()=>{$('#sidebar').classList.toggle('open');$('#menu').setAttribute('aria-expanded',String($('#sidebar').classList.contains('open')))};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu()}});
window.addEventListener('message',e=>{if(e.source!==frame.contentWindow)return;if(e.data?.type==='wireframe-go'&&byId[e.data.id])go(e.data.id);if(e.data?.type==='wireframe-notice')toast('Solo demostración visual. No se guardó ni envió información.');if(e.data?.type==='wireframe-ready')configure()});
window.addEventListener('hashchange',render);renderMap();render();
