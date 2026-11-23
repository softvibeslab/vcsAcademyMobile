import test from 'node:test';
import assert from 'node:assert/strict';
import { cancunParts, buildVisitPayload, visitEvents, recommendationLinks, shouldOfferTour, promptIsValid } from './tour-model.mjs';
const now = new Date('2026-11-23T02:30:00Z');
const fields = { title:' Visita mañana ', date:'2026-11-23', time:'10:00', context:'Contexto confirmado', happened:'Expuse la propuesta', worked:'Escuchar', improve_next:'Una pregunta abierta' };

test('calendar dates use Cancun instead of UTC or device timezone',()=>{
 assert.deepEqual(cancunParts(now),{date:'2026-11-22',time:'21:30'});
});
test('schedule requires an explicit future time and normalizes the offset',()=>{
 assert.throws(()=>buildVisitPayload({...fields,time:''},'schedule',null,now),/hora/i);
 assert.throws(()=>buildVisitPayload({...fields,date:'2026-11-22',time:'10:00'},'schedule',null,now),/futur/i);
 assert.deepEqual(buildVisitPayload(fields,'schedule',null,now),{intent:'schedule',title:'Visita mañana',context:'Contexto confirmado',scheduled_at:'2026-11-23T10:00:00-05:00'});
});
test('start never submits a client timestamp and reflects preserve their own date',()=>{
 assert.deepEqual(buildVisitPayload(fields,'start',null,now),{intent:'start',title:'Visita mañana',context:'Contexto confirmado'});
 const reflected=buildVisitPayload({...fields,date:'2026-11-22',time:'14:00'},'reflect',null,now);
 assert.equal(reflected.scheduled_at,'2026-11-22T14:00:00-05:00');
 assert.equal(reflected.feedback.happened,'Expuse la propuesta');
 const edited=buildVisitPayload(fields,'edit',{status:'completed',context:'Anterior',completed_at:'2026-11-20T15:00:00Z'},now);
 assert.equal(edited.action,'edit');assert.equal(edited.completed_at,undefined);assert.equal(edited.scheduled_at,undefined);
});
test('feedback enforces meaningful narrative, retention and complete payload budget',()=>{
 assert.throws(()=>buildVisitPayload({...fields,date:'2026-11-22',happened:' '},'reflect',null,now),/pasó/i);
 assert.throws(()=>buildVisitPayload({...fields,date:'2026-10-01'},'reflect',null,now),/30 días/);
 assert.throws(()=>buildVisitPayload({...fields,context:'a'.repeat(6000),happened:'b'.repeat(4000),worked:'c'},'reflect',null,now),/10.?000/);
});
test('tour prompts never duplicate a linked or dismissed context and validate server controls',()=>{
 assert.equal(shouldOfferTour('Tengo un tour mañana',false,false),true);
 assert.equal(shouldOfferTour('Tengo un tour mañana',true,false),false);
 assert.equal(shouldOfferTour('Tengo un tour mañana',false,true),false);
 assert.equal(shouldOfferTour('El tutorial me ayuda',false,false),false);
 assert.equal(promptIsValid({kind:'tour_registration',actions:['start','schedule','reflect']}),true);
 assert.equal(promptIsValid({kind:'tour_registration',actions:['delete']}),false);
});
test('visit events keep independent identities and never look like sales/Goal Sheet entries',()=>{
 const visits=[{id:'a',event_date:'2026-11-22',status:'in_progress',title:'Visita uno',started_at:'2026-11-22T17:00:00Z'}, {id:'b',event_date:'2026-11-22',status:'scheduled',title:'Visita dos',scheduled_at:'2026-11-22T20:00:00Z'}];
 const events=visitEvents(visits);assert.equal(events.length,2);assert.notEqual(events[0].id,events[1].id);
 assert.equal(events[0].kind,'visit-in_progress');assert.equal(events[0].amount,null);assert.equal(events[0].entry,undefined);
});
test('lesson links use current catalog and preserve plan/progress restrictions',()=>{
 const analysis={status:'ready',recommended_steps:[{step_id:'step_1',title:'inventado',reason:'Saludo'},{step_id:'step_4',title:'Discovery',reason:'Preguntas'},{step_id:'bogus',title:'Inventado',reason:'nada'}]};
 const result=recommendationLinks(analysis,[{id:'step_1',title:'Meet & Greet',allowed:true,status:'completed'},{id:'step_4',title:'Discovery',allowed:false,lock:'plan',level:'premium'}]);
 assert.equal(result[0].title,'Meet & Greet');assert.equal(result[0].href,'#lesson/step_1');
 assert.equal(result[1].href,'#roadmap');assert.match(result[1].notice,/Premium/i);
 assert.equal(result[2].href,'#roadmap');assert.equal(result[2].title,'Recomendación no disponible');
 assert.deepEqual(recommendationLinks({...analysis,status:'stale'},[]),[]);
});

test('finalizing a visit in its starting minute uses the actual confirmed instant',()=>{
 const confirmedNow=new Date('2026-11-23T02:30:45.250Z');
 const visit={id:'visit',status:'in_progress',context:'Contexto',started_at:'2026-11-23T02:30:15.100Z'};
 const result=buildVisitPayload({...fields,date:'2026-11-22',time:'21:30'},'reflect',visit,confirmedNow);
 assert.equal(Date.parse(result.completed_at),confirmedNow.getTime());
 assert(Date.parse(result.completed_at)>=Date.parse(visit.started_at));
});

test('an explicitly edited completion time is not silently replaced by now',()=>{
 assert.throws(()=>buildVisitPayload({...fields,date:'2026-11-22',time:'21:30',timeEdited:true},'reflect',{status:'in_progress',context:'',started_at:'2026-11-23T02:30:15Z'},new Date('2026-11-23T02:30:45Z')),/posterior al inicio/);
});

test('finalization at the exact starting minute preserves actual elapsed seconds',()=>{
 const visit={status:'in_progress',context:'',started_at:'2026-11-23T02:30:00Z'};
 const completed=buildVisitPayload({...fields,date:'2026-11-22',time:'21:30'},'reflect',visit,new Date('2026-11-23T02:30:45Z'));
 assert.equal(completed.completed_at,'2026-11-23T02:30:45.000Z');
 assert.throws(()=>buildVisitPayload({...fields,date:'2026-11-22',time:'21:30',timeEdited:true},'reflect',visit,new Date('2026-11-23T02:30:45Z')),/posterior al inicio/);
});
