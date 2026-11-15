import React, { useState } from "react";
import {
  Header,
  Card,
  Field,
  Button,
  Empty,
  Loading,
  ErrorBox,
  useRemote,
  useAction,
  ActionStatus,
} from "./ui";
import { money } from "./model.mjs";
import { AccessAdmin } from "./Access";
function Certification({ api, rep, done }) {
  const r = useRemote(api, "/api/certifications/readiness/" + rep.user.id),
    action = useAction();
  const [status, setStatus] = useState("needs_practice"),
    [notes, setNotes] = useState("");
  return (
    <Card>
      <h2>Certificación · {rep.user.display_name}</h2>
      {r.busy ? (
        <Loading />
      ) : r.error ? (
        <ErrorBox error={r.error} />
      ) : (
        Object.entries(r.data.requirements).map(([k, v]) => (
          <p key={k}>
            {v ? "✓" : "○"} {k.replaceAll("_", " ")}
          </p>
        ))
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () => {
            await api("/api/certifications/" + rep.user.id + "/decision", {
              method: "POST",
              body: JSON.stringify({ status, notes }),
            });
            r.retry();
            done();
          }, "Decisión registrada.");
        }}
      >
        <Field label="Decisión">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="needs_practice">Requiere práctica</option>
            <option value="approved">Aprobar certificación</option>
            <option value="denied">No aprobado</option>
          </select>
        </Field>
        <Field label="Notas de certificación">
          <textarea
            required
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <Button disabled={action.busy}>Registrar decisión</Button>
        <ActionStatus action={action} />
      </form>
    </Card>
  );
}
function Review({ api, submission, done }) {
  const action = useAction(),
    [score, setScore] = useState(80),
    [comments, setComments] = useState(""),
    [rubric, setRubric] = useState({
      step_alignment: 3,
      professional_tone: 3,
      discovery_quality: 3,
      compliance_awareness: 3,
    });
  return (
    <Card>
      <span className="chip">POR EVALUAR · {submission.user_id}</span>
      <h2>Práctica {submission.id}</h2>
      <details>
        <summary>Ver conversación</summary>
        <p className="preserve">{submission.transcript}</p>
      </details>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () => {
            await api(
              "/api/roleplay/submissions/" + submission.id + "/review",
              {
                method: "POST",
                body: JSON.stringify({
                  score: Number(score),
                  rubric_scores: rubric,
                  comments,
                  recommendation:
                    Number(score) >= 85
                      ? "ready_for_certification"
                      : "continue_practice",
                }),
              },
            );
            done();
          }, "Evaluación enviada.");
        }}
      >
        <Field
          label="Puntuación · 0 a 100"
          type="number"
          min="0"
          max="100"
          required
          value={score}
          onChange={(e) => setScore(e.target.value)}
        />
        <div className="two-col">
          {Object.entries(rubric).map(([k, v]) => (
            <Field
              key={k}
              label={k.replaceAll("_", " ") + " · 1 a 5"}
              type="number"
              min="1"
              max="5"
              required
              value={v}
              onChange={(e) =>
                setRubric({ ...rubric, [k]: Number(e.target.value) })
              }
            />
          ))}
        </div>
        <Field label="Feedback">
          <textarea
            required
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </Field>
        <Button disabled={action.busy}>Enviar evaluación</Button>
        <ActionStatus action={action} />
      </form>
    </Card>
  );
}
export function Team({ api, revision }) {
  const [version, setVersion] = useState(0),
    [selected, setSelected] = useState(null),
    [tab, setTab] = useState("team");
  const r = useRemote(api, "/api/manager/team-dashboard", revision + version),
    reload = () => setVersion((v) => v + 1);
  return (
    <>
      <Header
        eyebrow="MANAGER WORKSPACE"
        title="Crecer es un trabajo de equipo."
        subtitle="Desempeño, prácticas y certificación en un mismo espacio."
      />
      <div className="segmented tabs">
        <button
          className={tab === "team" ? "selected" : ""}
          onClick={() => setTab("team")}
        >
          Mi equipo
        </button>
        <button
          className={tab === "reviews" ? "selected" : ""}
          onClick={() => setTab("reviews")}
        >
          Evaluaciones
        </button>
      </div>
      {r.busy ? (
        <Loading />
      ) : r.error ? (
        <ErrorBox error={r.error} retry={r.retry} />
      ) : (
        <>
          {tab === "team" ? (
            <>
              <div className="metrics-grid">
                <Card>
                  <small>REPRESENTANTES</small>
                  <h2>{r.data.summary.active_reps}</h2>
                </Card>
                <Card>
                  <small>POR EVALUAR</small>
                  <h2>{r.data.summary.pending_reviews}</h2>
                </Card>
                <Card>
                  <small>VOLUMEN · USD</small>
                  <h2>{money(r.data.summary.team_metrics.volume)}</h2>
                </Card>
              </div>
              <div className="tile-grid">
                {r.data.reps.map((rep) => (
                  <Card key={rep.user.id}>
                    <span className="avatar">{rep.user.display_name[0]}</span>
                    <h2>{rep.user.display_name}</h2>
                    <p>
                      {rep.completed_steps}/11 módulos ·{" "}
                      {rep.reviewed_roleplays} evaluaciones
                    </p>
                    <div className="progress">
                      <span style={{ width: rep.blueprint_progress + "%" }} />
                    </div>
                    <p>{rep.certification_status}</p>
                    <Button secondary onClick={() => setSelected(rep)}>
                      Revisar certificación
                    </Button>
                  </Card>
                ))}
              </div>
              {selected && (
                <Certification
                  key={selected.user.id}
                  api={api}
                  rep={selected}
                  done={reload}
                />
              )}
            </>
          ) : (
            <div className="stack">
              {r.data.pending_submissions.length ? (
                r.data.pending_submissions.map((s) => (
                  <Review key={s.id} api={api} submission={s} done={reload} />
                ))
              ) : (
                <Empty title="Todas las prácticas al día">
                  Las nuevas entregas aparecerán aquí.
                </Empty>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
const blankResource = {
  title: "",
  body: "",
  resource_type: "article",
  sensitivity: "general_training",
  requires_access_grant: false,
  tags: [],
  status: "draft",
};
export function Admin({ api }) {
  const [tab, setTab] = useState("resources"),
    [version, setVersion] = useState(0),
    [resource, setResource] = useState(blankResource),
    [person, setPerson] = useState({
      email: "",
      display_name: "",
      roles: ["sales_rep"],
      team_id: "team_demo",
      permissions: [],
      status: "active",
    }),
    [invite, setInvite] = useState(null),
    [permission, setPermission] = useState("");
  const action = useAction(),
    r = useRemote(
      api,
      "/api/admin/" + (tab === "audit" ? "audit-events" : tab === "access" ? "access-items" : tab),
      version,
    );
  const reload = () => setVersion((v) => v + 1);
  return (
    <>
      <Header
        eyebrow="OPERACIONES"
        title="Administra tu academia."
        subtitle="Contenido, acceso y trazabilidad del sistema."
      />
      <div className="segmented tabs">
        {[
          ["resources", "Contenido"],
          ["access", "Acceso y planes"],
          ["users", "Usuarios"],
          ["audit", "Auditoría"],
        ].map(([v, l]) => (
          <button
            className={tab === v ? "selected" : ""}
            key={v}
            onClick={() => {
              setTab(v);
              setInvite(null);
            }}
          >
            {l}
          </button>
        ))}
      </div>
      <ActionStatus action={action} />
      {tab === "access" ? (
        <AccessAdmin api={api} />
      ) : r.busy ? (
        <Loading />
      ) : r.error ? (
        <ErrorBox error={r.error} retry={r.retry} />
      ) : tab === "resources" ? (
        <div className="two-col">
          <Card>
            <h2>{resource.id ? "Editar recurso" : "Nuevo recurso"}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                action.run(async () => {
                  await api("/api/admin/resources", {
                    method: "POST",
                    body: JSON.stringify(resource),
                  });
                  setResource(blankResource);
                  reload();
                }, "Recurso guardado.");
              }}
            >
              <Field
                label="Título del recurso"
                required
                value={resource.title}
                onChange={(e) =>
                  setResource({ ...resource, title: e.target.value })
                }
              />
              <Field label="Contenido">
                <textarea
                  required
                  rows="7"
                  value={resource.body}
                  onChange={(e) =>
                    setResource({ ...resource, body: e.target.value })
                  }
                />
              </Field>
              <Field
                label="Etiquetas · separadas por coma"
                value={resource.tags.join(",")}
                onChange={(e) =>
                  setResource({ ...resource, tags: e.target.value.split(",") })
                }
              />
              <Field label="Estado">
                <select
                  value={resource.status}
                  onChange={(e) =>
                    setResource({ ...resource, status: e.target.value })
                  }
                >
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Archivado</option>
                </select>
              </Field>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={resource.requires_access_grant}
                  onChange={(e) =>
                    setResource({
                      ...resource,
                      requires_access_grant: e.target.checked,
                    })
                  }
                />
                Requiere permiso de acceso
              </label>
              <Button disabled={action.busy}>Guardar recurso</Button>
              {resource.id && (
                <Button
                  secondary
                  type="button"
                  onClick={() => setResource(blankResource)}
                >
                  Crear otro
                </Button>
              )}
            </form>
          </Card>
          <div className="stack">
            {r.data.resources.map((item) => (
              <Card key={item.id}>
                <span className="chip">{item.status}</span>
                <h3>{item.title}</h3>
                <Button
                  secondary
                  onClick={() => setResource({ ...blankResource, ...item })}
                >
                  Editar recurso
                </Button>
              </Card>
            ))}
          </div>
        </div>
      ) : tab === "users" ? (
        <div className="two-col">
          <Card>
            <h2>{person.id ? "Editar usuario" : "Invitar usuario"}</h2>
            <p className="muted">
              Las invitaciones de este entorno son locales; el servidor no envía
              correo.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                action.run(async () => {
                  const result = await api(
                    "/api/admin/users" + (person.id ? "" : "/invite"),
                    { method: "POST", body: JSON.stringify(person) },
                  );
                  setInvite(result.temporary_password ? result : null);
                  reload();
                }, "Usuario guardado.");
              }}
            >
              <Field
                label="Nombre"
                required
                value={person.display_name}
                onChange={(e) =>
                  setPerson({ ...person, display_name: e.target.value })
                }
              />
              <Field
                label="Correo del usuario"
                type="email"
                required
                value={person.email}
                onChange={(e) =>
                  setPerson({ ...person, email: e.target.value })
                }
              />
              <Field
                label="Equipo"
                required
                value={person.team_id}
                onChange={(e) =>
                  setPerson({ ...person, team_id: e.target.value })
                }
              />
              <Field label="Rol principal">
                <select
                  value={person.roles[0]}
                  onChange={(e) =>
                    setPerson({ ...person, roles: [e.target.value] })
                  }
                >
                  {[
                    "sales_rep",
                    "manager",
                    "trainer",
                    "coach",
                    "to_manager",
                    "admin",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Button disabled={action.busy}>
                {person.id ? "Guardar usuario" : "Crear invitación local"}
              </Button>
            </form>
            {invite && (
              <div className="notice">
                Contraseña temporal: <code>{invite.temporary_password}</code>
                <p>Vence: {invite.expires_at}</p>
              </div>
            )}
            {person.id && (
              <>
                <h3>Permisos de acceso</h3>
                <p>
                  {person.permissions.join(", ") || "Sin permisos adicionales"}
                </p>
                <Field
                  label="Permiso"
                  value={permission}
                  onChange={(e) => setPermission(e.target.value)}
                  placeholder="Identificador del permiso"
                />
                <div className="action-row">
                  {[
                    ["grant", "Conceder"],
                    ["revoke", "Revocar"],
                  ].map(([value, label]) => (
                    <Button
                      secondary
                      key={value}
                      disabled={action.busy || !permission.trim()}
                      onClick={() =>
                        action.run(async () => {
                          const result = await api(
                            "/api/admin/users/" + person.id + "/permissions",
                            {
                              method: "POST",
                              body: JSON.stringify({
                                permission: permission.trim(),
                                action: value,
                              }),
                            },
                          );
                          setPerson(result.user);
                          reload();
                        }, "Permiso actualizado.")
                      }
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <Button
                  secondary
                  onClick={() => {
                    setPerson({
                      email: "",
                      display_name: "",
                      roles: ["sales_rep"],
                      team_id: "team_demo",
                      permissions: [],
                      status: "active",
                    });
                    setInvite(null);
                  }}
                >
                  Nuevo usuario
                </Button>
              </>
            )}
          </Card>
          <div className="stack">
            {r.data.users.map((u) => (
              <Card key={u.id}>
                <h3>{u.display_name}</h3>
                <p>{u.email}</p>
                <small>
                  {u.roles.join(", ")} · {u.status}
                </small>
                <div className="action-row">
                  <Button
                    secondary
                    onClick={() => {
                      setPerson(u);
                      setInvite(null);
                    }}
                  >
                    Editar usuario
                  </Button>
                  <Button
                    secondary
                    disabled={action.busy}
                    onClick={() =>
                      action.run(async () => {
                        await api("/api/admin/users/" + u.id + "/status", {
                          method: "PATCH",
                          body: JSON.stringify({
                            status:
                              u.status === "active" ? "inactive" : "active",
                          }),
                        });
                        reload();
                      }, "Estado actualizado.")
                    }
                  >
                    {u.status === "active" ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          {r.data.events.length ? (
            r.data.events.map((event, i) => (
              <div className="list-row" key={event.id || i}>
                <div>
                  <strong>{event.action}</strong>
                  <small>
                    {event.created_at} · {event.actor_user_id || event.user_id}
                  </small>
                </div>
                <span className="chip">{event.outcome || event.status}</span>
              </div>
            ))
          ) : (
            <Empty title="No hay eventos" />
          )}
        </Card>
      )}
    </>
  );
}
