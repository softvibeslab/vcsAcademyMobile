/* Navigation only. No persistence, backend, media capture or form submission. */
let settings=null;
const notify=()=>parent.postMessage({type:'wireframe-notice'},'*');
const norm=s=>s.replace(/\s+/g,' ').trim();
function attach(){
 const dock={Home:'B01',Roadmap:'C01','AI Coach':'D01',Coach:'D01','Bóveda':'E01',Perfil:'B06'};
 for(const el of document.querySelectorAll('a,button,div,span,p')){
  if(el.dataset.bound)continue;
  const text=norm(el.textContent);if(!text||text.length>180)continue;
  const leaf=!el.querySelector('button,a,div,p');
  const looks=el.matches('a,button')||el.classList.contains('cursor-pointer')||((el.className.includes('bg-black')||el.className.includes('bg-neutral-900'))&&text.length<100);
  let target=null;
  const href=el.getAttribute('href')||'';
  if(/^#[a-h]0\d$/i.test(href))target=href.slice(1).toUpperCase();
  if(!target&&looks){const matches=text.match(/\b[A-H]0[1-7]\b/g);if(matches)target=matches.at(-1)}
  if(!target&&leaf&&dock[text])target=dock[text];
  if(!target&&settings.id==='A03'&&leaf){if(/Representante de Ventas/i.test(text))target='A04';else if(/Gerente.*Coach/i.test(text))target='G01';else if(/Direcci[oó]n/i.test(text))target='G05'}
  if(!target&&looks){for(const [label,dest] of settings.links){const core=label.split(' · ')[0].toLowerCase();if(text.toLowerCase().includes(core)){target=dest;break}}}
  if(!target&&looks&&/^(Comenzar|Continuar|Iniciar sesión|Crear cuenta|Guardar|Revisar y confirmar|Terminar|Finalizar)/i.test(text))target=settings.links[0]?.[1];
  if(!target&&looks&&/Volver|Atrás|Cancelar/i.test(text))target=settings.links.at(-1)?.[1];
  if(target&&settings.validIds.includes(target)){
   el.dataset.go=target;el.dataset.bound='1';el.style.cursor='pointer';el.setAttribute('title','Ir a '+target);if(!el.matches('button,a')){el.tabIndex=0;el.setAttribute('role','button')}
   const fn=e=>{e.preventDefault();e.stopPropagation();parent.postMessage({type:'wireframe-go',id:target},'*')};el.addEventListener('click',fn);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')fn(e)});
  }else if(el.matches('button,a')){el.dataset.bound='1';el.addEventListener('click',e=>{e.preventDefault();notify()})}
 }
}
document.addEventListener('submit',e=>{e.preventDefault();notify()});
window.addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='configure-wireframe'){settings=e.data;attach()}});
parent.postMessage({type:'wireframe-ready'},'*');
