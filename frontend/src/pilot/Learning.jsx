import React, { useState } from "react";
import {
  BookOpen,
  NotebookPen,
  CalendarDays,
  Calculator,
  Target,
  Folder,
  Check,
  ArrowRight,
  Lock,
} from "lucide-react";
import {
  Header,
  Card,
  Tile,
  Back,
  Field,
  Button,
  Empty,
  Loading,
  ErrorBox,
  useRemote,
  useAction,
  ActionStatus,
} from "./ui";
import { noteKey, localDate } from "./model.mjs";
import { LevelTag } from "./Access";
import { stepAction, premiumLockedCount } from "./access-model.mjs";
import { LatestVisitLearning } from "./TourVisits";

/** Panel cuando el servidor responde «requiere plan»: explica y ofrece desbloquear. */
export function LockedPanel({ level, onLocked, back = "roadmap", backLabel = "Roadmap" }) {
  return (
    <>
      <Back to={back}>{backLabel}</Back>
      <Card className="pilot-locked-panel">
        <LevelTag level={level} allowed={false} />
        <h2>{level === "gratis" ? "Este módulo es gratis con tu cuenta." : "Este módulo es Premium."}</h2>
        <p>{level === "gratis" ? "Crea tu cuenta gratis para abrirlo." : "Activa Premium con el código de tu academia para abrirlo."}</p>
        {onLocked && <Button onClick={() => onLocked(level)}>{level === "gratis" ? "Crear cuenta gratis" : "Desbloquear premium"}</Button>}
      </Card>
    </>
  );
}
export function Roadmap({ api, data, revision, onLocked }) {
  const completed=data.steps.filter(s=>s.status==='completed').length;
  const next=data.steps.find(s=>s.status!=='completed'&&stepAction(s).kind==='open')||data.steps.find(s=>s.status!=='completed')||data.steps[0];
  const lockedCount=premiumLockedCount(data.steps);
  const percent=data.steps.length?Math.round(completed/data.steps.length*100):0;
  return <div className="pilot-roadmap-page">
    <Header title="Top Producer Roadmap" subtitle="Domina el blueprint de 11 pasos para la venta consultiva de alto rendimiento."/>
    <section className="pilot-roadmap-summary">
      <div className="pilot-roadmap-overview"><div className="pilot-progress-ring" style={{'--progress':percent+'%'}}><strong>{percent}%</strong><small>{percent===100?'COMPLETADO':'AVANZANDO'}</small></div><div><span className="pilot-tag">TU PROGRESO EN EL MÉTODO</span><h2>{next?.title||'Tu camino a Top Producer.'}</h2><p>{completed===data.steps.length?'Completaste todos los módulos. Puedes volver a practicarlos.':'Tu siguiente lección está lista para comenzar.'}</p></div></div>
      <div className="pilot-roadmap-summary-footer"><div><div className="progress"><span style={{width:percent+'%'}}/></div><small>{completed} de {data.steps.length} módulos completados</small></div><a className="button" href={next?'#lesson/'+next.id:'#home'}>{completed?'Continuar':'Comenzar Lección 1'} <ArrowRight size={16}/></a></div>
    </section>
    <LatestVisitLearning api={api} data={data} revision={revision} />
    <div className="pilot-list-heading"><h2>TU BLUEPRINT DE {data.steps.length} MÓDULOS</h2><span>{completed} / {data.steps.length} listos</span></div>
    <div className="roadmap">{data.steps.map((step,i)=>{const act=stepAction(step);const cls='roadmap-step '+(step.status==='completed'?'completed':'')+(step===next?' current':'')+(act.kind!=='open'?' locked lock-'+act.kind:'');const inner=<><span className="step-number">{step.status==='completed'?<Check size={18}/>:act.kind==='plan'?<Lock size={16}/>:i+1}</span><div><h2>{i+1}. {step.title}</h2><small>{step.status==='completed'?'COMPLETADO':act.kind==='progress'?'COMPLETA EL PASO ANTERIOR':act.kind==='plan'?'BLOQUEADO':'DISPONIBLE'} <LevelTag level={step.level} allowed={act.kind!=='plan'}/></small><p>{step.description}</p></div><span className="pilot-step-action">{act.label}</span></>;return act.kind==='open'?<a className={cls} href={'#lesson/'+step.id} key={step.id}>{inner}</a>:act.kind==='plan'?<button type="button" className={cls} key={step.id} onClick={()=>onLocked?.(act.level)}>{inner}</button>:<div className={cls} key={step.id} aria-disabled="true">{inner}</div>})}</div>
    {lockedCount>0&&<section className="pilot-unlock-cta"><div><strong>{lockedCount} {lockedCount===1?'paso más':'pasos más'} con Premium</strong><small>Activa tu licencia con el código de tu academia.</small></div><button className="button" onClick={()=>onLocked?.('premium')}>Desbloquear premium</button></section>}
  </div>;
}
export function Lesson({ api, id, refresh, onLocked }) {
  const r = useRemote(api, "/api/blueprint/steps/" + encodeURIComponent(id)),
    action = useAction();
  if (r.busy) return <Loading />;
  if (r.requires) return <LockedPanel level={r.requires} onLocked={onLocked} />;
  if (r.error) return <ErrorBox error={r.error} retry={r.retry} />;
  const { step } = r.data;
  const { media = [], scripts = [], checklist = [] } = step;
  return (
    <>
      <Back to="roadmap">Roadmap</Back>
      <Header
        eyebrow={"PASO " + step.step_number}
        title={step.title}
        subtitle={step.description}
      />
      <Card>
        <p className="lead">{step.purpose}</p>
        {media.map((m, i) => (
          <div className="notice" key={i}>
            {m.title} · {m.duration} · Material audiovisual pendiente de
            publicación.
          </div>
        ))}
        {scripts.map((s) => (
          <article className="script" key={s.id}>
            <small>{s.script_type}</small>
            <h2>{s.title}</h2>
            <p className="preserve">{s.body}</p>
            <p className="fine-print">{s.compliance_note}</p>
          </article>
        ))}
        <h2>Antes de avanzar</h2>
        {checklist.map((c, i) => (
          <label className="check-row" key={i}>
            <input type="checkbox" />
            {c}
          </label>
        ))}
        <div className="action-row">
          <Button
            disabled={action.busy || step.status === "completed"}
            onClick={() =>
              action.run(async () => {
                await api("/api/blueprint/steps/" + id + "/complete", {
                  method: "POST",
                });
                refresh();
                r.retry();
              }, "Paso completado.")
            }
          >
            {step.status === "completed"
              ? "Completado"
              : "Marcar como completado"}
          </Button>
          <a className="button secondary" href="#roleplay">
            Practicar con el coach
          </a>
        </div>
        <ActionStatus action={action} />
      </Card>
    </>
  );
}
export function Vault() {
  const [query,setQuery]=useState('');
  const matches=text=>text.toLocaleLowerCase().includes(query.toLocaleLowerCase());
  const cards=[['Smart Goal Sheet','Completa tus cuestionarios. Consulta tus métricas en Home.','Abrir Smart Goal Sheet','goalsheet',Target],['Smart Calculadoras','Haz tus cálculos y prepara tu próxima venta.','Explorar calculadoras','calculators',Calculator],['Guías comerciales','Manuales, estándares del método y estrategias clave de cierre.','Ver guías comerciales','resources/guides',BookOpen],['Guiones','Pitches, respuestas a objeciones y encuadres de valor.','Explorar guiones','resources/scripts',NotebookPen],['Audio vault','Consulta los materiales de audio publicados por tu academia.','Explorar biblioteca de audio','resources/audio',Folder]];
  function card(c){const [title,copy,cta,to,Icon]=c;if(!matches(title+' '+copy))return null;return <section className="pilot-vault-card" key={to}><div className="pilot-vault-heading"><span className="tile-icon"><Icon size={22}/></span><div><h2>{title}</h2><p>{copy}</p></div></div><a className={'button '+(to==='goalsheet'?'':'secondary')} href={'#'+to}>{cta}<ArrowRight size={16}/></a></section>}
  return <div className="pilot-vault-page"><Header title="Bóveda de recursos" subtitle="Tus herramientas para avanzar cada día"/><Field label="Buscar en bóveda" type="search" placeholder="Buscar en bóveda…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="pilot-vault-grid">{cards.slice(0,2).map(card)}{matches('Smart Notebook Smart Diary notas feedback diario')&&<section className="pilot-vault-card pilot-notebook-card"><div className="pilot-vault-heading"><span className="tile-icon"><NotebookPen size={22}/></span><div><h2>Smart Notebook <span className="pilot-tag">DESTACADO</span></h2><p>Captura tus ideas, aprendizajes y notas de cada reunión.</p></div></div><a className="button" href="#notebook">Escribir nota <ArrowRight size={16}/></a><section className="pilot-diary-inset"><span className="pilot-tag cyan">DESTACADO POST-TOUR</span><h3>Smart Diary · Registro de Feedback</h3><p>Captura el feedback clave inmediatamente después de cada tour o presentación.</p><div className="pilot-diary-points">3 preguntas clave · Reflexión sobre tu práctica</div><a className="button secondary" href="#diary">Registrar feedback del tour <ArrowRight size={16}/></a></section><a href="#notebook" className="pilot-vault-link">Abrir Notebook <ArrowRight size={16}/></a></section>}{cards.slice(2).map(card)}</div>{!cards.some(c=>matches(c[0]+' '+c[1]))&&!matches('Smart Notebook Smart Diary notas feedback diario')&&<Empty title="Sin resultados">Prueba con otro término.</Empty>}<a href="#agenda" className="pilot-vault-link">Consultar agenda de seguimientos <ArrowRight size={16}/></a></div>
}
export function Resources({ data, kind }) {
  const [query, setQuery] = useState("");
  const items = data.resources.filter(r => !kind || (kind === "audio" ? /audio/i.test(r.resource_type) : kind === "scripts" ? /script|guion/i.test(r.resource_type) : /guide|pdf|document|checklist/i.test(r.resource_type))).filter((r) =>
    (r.title + " " + (r.tags || []).join(" "))
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <Back to="vault">Bóveda</Back>
      <Header eyebrow="BIBLIOTECA" title="El conocimiento a mano." />
      <Field
        label="Buscar recursos"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="tile-grid">
        {items.map((r) => (
          <Tile
            key={r.id}
            icon={Folder}
            title={r.title}
            description={(r.tags || []).join(" · ")}
            badge={r.has_access ? "DISPONIBLE" : r.level === "premium" || r.level === "gratis" ? (r.level === "premium" ? "PREMIUM" : "GRATIS") + " · BLOQUEADO" : "ACCESO RESTRINGIDO"}
            to={"resource/" + r.id}
          />
        ))}
      </div>
      {!items.length && (
        <Empty title="No encontramos recursos">Prueba con otro término.</Empty>
      )}
    </>
  );
}
export function ResourceDetail({ api, id, onLocked }) {
  const r = useRemote(api, "/api/resources/" + encodeURIComponent(id));
  return (
    <>
      <Back to="resources">Recursos</Back>
      {r.busy ? (
        <Loading />
      ) : r.requires ? (
        <LockedPanel level={r.requires} onLocked={onLocked} back="resources" backLabel="Recursos" />
      ) : r.error ? (
        <ErrorBox error={r.error} retry={r.retry} />
      ) : (
        <>
          <Header
            eyebrow={r.data.resource.resource_type}
            title={r.data.resource.title}
          />
          <Card>
            <p className="preserve">{r.data.resource.body}</p>
          </Card>
        </>
      )}
    </>
  );
}
export function Notebook({ user, diary, onCopyNote }) {
  const key = noteKey(user.id) + (diary ? ".diary" : "");
  const [notes, setNotes] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem(key) || "[]");
      } catch {
        return [];
      }
    }),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [selected, setSelected] = useState(null);
  const action = useAction();
  function save(e) {
    e.preventDefault();
    action.run(async () => {
      const next = [
        {
          id: selected || crypto.randomUUID(),
          title: title.trim(),
          body,
          date: localDate(),
        },
        ...notes.filter((n) => n.id !== selected),
      ];
      localStorage.setItem(key, JSON.stringify(next));
      setNotes(next);
      setTitle("");
      setBody("");
      setSelected(null);
    }, "Guardado en este navegador.");
  }
  function exportNotes() {
    const a = document.createElement("a"),
      url = URL.createObjectURL(
        new Blob([JSON.stringify(notes, null, 2)], {
          type: "application/json",
        }),
      );
    a.href = url;
    a.download = diary ? "diario.json" : "notebook.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <Back to="vault">Bóveda</Back>
      <Header
        eyebrow="TU ESPACIO PERSONAL"
        title={diary ? "Diario de aprendizaje" : "Notebook"}
        subtitle="Guardado local por cuenta en este navegador. Exporta una copia para conservar tus notas."
        action={
          <Button secondary onClick={exportNotes}>
            Exportar notas
          </Button>
        }
      />
      <div className="two-col">
        <Card>
          <h2>{selected ? "Editar nota" : "Una nueva idea"}</h2>
          <form onSubmit={save}>
            <Field
              label="Título"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Field label={diary ? "¿Qué aprendiste hoy?" : "Tu nota"}>
              <textarea
                required
                rows="9"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </Field>
            <Button disabled={action.busy}>Guardar nota</Button>
            {selected && (
              <Button
                secondary
                type="button"
                onClick={() => {
                  setSelected(null);
                  setTitle("");
                  setBody("");
                }}
              >
                Cancelar edición
              </Button>
            )}
            <ActionStatus action={action} />
          </form>
        </Card>
        <div className="stack">
          {notes.length ? (
            notes.map((n) => (
              <Card key={n.id}>
                <small>{n.date}</small>
                <h2>{n.title}</h2>
                <p className="preserve">{n.body}</p>
                {onCopyNote && <Button secondary onClick={() => onCopyNote(`${n.title}\n\n${n.body}`)}>Usar en registro de visita</Button>}
                <Button
                  secondary
                  onClick={() => {
                    setSelected(n.id);
                    setTitle(n.title);
                    setBody(n.body);
                  }}
                >
                  Editar
                </Button>
                <Button
                  secondary
                  onClick={() => {
                    if (
                      window.confirm("¿Eliminar esta nota de este navegador?")
                    )
                      action.run(async () => {
                        const next = notes.filter((item) => item.id !== n.id);
                        localStorage.setItem(key, JSON.stringify(next));
                        setNotes(next);
                        if (selected === n.id) {
                          setSelected(null);
                          setTitle("");
                          setBody("");
                        }
                      }, "Nota eliminada.");
                  }}
                >
                  Eliminar
                </Button>
              </Card>
            ))
          ) : (
            <Card>
              <Empty title="Aquí empieza tu colección">
                Escribe algo que quieras recordar.
              </Empty>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
