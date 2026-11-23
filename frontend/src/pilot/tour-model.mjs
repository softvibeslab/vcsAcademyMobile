import { isDateKey } from '../components/calendar/calendar-model.mjs';
import { stepAction } from './access-model.mjs';

export const TOUR_STATUS = Object.freeze({ scheduled: 'Programado', in_progress: 'En curso', completed: 'Finalizada', cancelled: 'Cancelada' });
export const TOUR_INTENTS = Object.freeze([['start', 'Iniciar visita'], ['schedule', 'Programar tour'], ['reflect', 'Registrar cómo me fue']]);
export const isVisitId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function cancunParts(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cancun', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(now).map(p => [p.type,p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
export function shiftDate(date, days) { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10); }
export function visitInstant(visit) { return (visit?.status === 'scheduled' ? visit.scheduled_at : visit?.status === 'completed' ? visit.completed_at : visit?.started_at || visit?.scheduled_at || visit?.cancelled_at) || visit?.event_date; }
export function visitTime(visit) { const value = visitInstant(visit); return value && Number.isFinite(Date.parse(value)) ? cancunParts(new Date(value)).time : ''; }
export function visitLabel(visit) { return visit?.title?.trim() || `Visita ${visit?.event_date || ''}${visitTime(visit) ? ' · '+visitTime(visit) : ''}`; }
export function initialVisitFields(intent, context = '', visit = null, now = new Date()) {
  const current = cancunParts(now);
  const at = visitInstant(visit);
  const original = at && Number.isFinite(Date.parse(at)) ? cancunParts(new Date(at)) : current;
  const tomorrow = /\bmañana\b/i.test(context) && !/\b(?:por|en|de) la mañana\b/i.test(context);
  return { title: visit?.title || '', context: visit?.context || context, date: intent === 'schedule' ? (tomorrow ? shiftDate(current.date,1) : current.date) : intent === 'reflect' && !visit && /\bayer\b/i.test(context) ? shiftDate(current.date,-1) : intent === 'edit' ? original.date : current.date,
    time: intent === 'schedule' ? '' : intent === 'edit' ? original.time : current.time,
    happened: visit?.feedback?.happened || (intent === 'reflect' ? context : ''), worked: visit?.feedback?.worked || '', improve_next: visit?.feedback?.improve_next || '' };
}
function text(value, max, name) { const v=typeof value==='string'?value:''; if(v.length>max)throw Error(`${name}: máximo ${max} caracteres.`); return v; }
function timestamp(date,time) { if(!isDateKey(date))throw Error('Confirma una fecha válida.');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||''))throw Error('Confirma la hora de la visita.');return `${date}T${time}:00-05:00`; }
export function buildVisitPayload(fields, intent, visit = null, now = new Date()) {
  const title=text(fields.title,120,'Referencia').trim(), context=text(fields.context,6000,'Contexto');
  const feedback={happened:text(fields.happened,4000,'Qué pasó'),worked:text(fields.worked,2000,'Qué funcionó'),improve_next:text(fields.improve_next,2000,'Qué mejorarías')};
  const withFeedback=intent==='reflect'||(intent==='edit'&&visit?.status==='completed');
  if(withFeedback&&!feedback.happened.trim())throw Error('Cuéntanos qué pasó en la visita.');
  const narrative=(intent==='reflect'&&visit?visit.context||'':context)+(withFeedback?Object.values(feedback).join(''):'');
  if(narrative.length>10000)throw Error('El contexto y el feedback juntos admiten hasta 10 000 caracteres.');
  if(new TextEncoder().encode(narrative).length>24000)throw Error('El texto es demasiado largo. Reduce un poco el contexto o feedback.');
  if(intent==='start')return{intent:'start',title,context};
  if(intent==='schedule') {const at=timestamp(fields.date,fields.time);if(Date.parse(at)<=now.getTime())throw Error('Selecciona una fecha y hora futuras.');return{intent:'schedule',title,context,scheduled_at:at};}
  if(intent==='reflect') {let at=timestamp(fields.date,fields.time); const current=cancunParts(now); if(!fields.timeEdited && visit?.started_at && fields.date===current.date && fields.time===current.time && Date.parse(at)<=Date.parse(visit.started_at) && Date.parse(visit.started_at)<=now.getTime()) at=now.toISOString(); const value=Date.parse(at);if(value>now.getTime())throw Error('La visita debe haber ocurrido; confirma una hora pasada o actual.');if(value<=now.getTime()-30*86400000)throw Error('Los registros vinculados deben ser de los últimos 30 días. Puedes usar tus notas personales anteriores.');if(visit?.started_at&&value<=Date.parse(visit.started_at))throw Error('La hora de finalización debe ser posterior al inicio.');return visit?{action:'reflect',completed_at:at,feedback}:{intent:'reflect',title,context,scheduled_at:at,feedback};}
  if(intent==='edit'&&visit){const result={action:'edit',title,context};if(visit.status==='scheduled'){const at=timestamp(fields.date,fields.time);if(Date.parse(at)<=now.getTime())throw Error('Selecciona una fecha y hora futuras.');result.scheduled_at=at;}if(visit.status==='completed')result.feedback=feedback;return result;}
  throw Error('Selecciona cómo quieres registrar la visita.');
}
export function shouldOfferTour(message, linked, dismissed) { return !linked&&!dismissed&&/\b(tour|tours|visita|visitas)\b/i.test(message); }
export function promptIsValid(prompt) { return prompt?.kind==='tour_registration'&&Array.isArray(prompt.actions)&&prompt.actions.length===3&&TOUR_INTENTS.every(([intent],i)=>prompt.actions[i]===intent); }
export function visitEvents(visits) { return (Array.isArray(visits)?visits:[]).filter(v=>v&&isDateKey(v.event_date)&&Object.hasOwn(TOUR_STATUS,v.status)).map(visit=>({id:`visit:${visit.id}`,visitId:visit.id,date:visit.event_date,title:`${visitTime(visit)} ${visitLabel(visit)}`.trim(),kind:`visit-${visit.status}`,amount:null,note:TOUR_STATUS[visit.status],visit})); }
export function recommendationLinks(analysis, steps) {
  if(analysis?.status!=='ready')return[];
  return (Array.isArray(analysis.recommended_steps)?analysis.recommended_steps:[]).slice(0,3).map(rec=>{
    const step=(steps||[]).find(s=>s.id===rec.step_id);
    if(!step)return{step_id:rec.step_id,title:'Recomendación no disponible',reason:'El catálogo cambió. Consulta tus lecciones disponibles.',href:'#roadmap',notice:'Consulta el Roadmap.'};
    const action=stepAction(step);return{step_id:step.id,title:step.title,reason:typeof rec.reason==='string'?rec.reason:'',href:action.kind==='open'?`#lesson/${step.id}`:'#roadmap',notice:action.kind==='plan'?`Requiere ${action.level==='premium'?'Premium':'acceso a la lección'}.`:action.kind==='progress'?'Completa el paso anterior.':''};
  });
}
