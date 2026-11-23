# Calendarios reutilizables

## Vista mensual

`MonthlyCalendar` implementa la cuadrícula mensual usada por la agenda de V1. Es controlado y no depende de API, rutas, autenticación ni guardado. Recibe fechas civiles válidas `YYYY-MM-DD` y eventos con `id`, `date` y `title`.

```jsx
<MonthlyCalendar
  selectedDate={selectedDate}
  today={today}
  events={events}
  onSelectDate={setSelectedDate}
  renderEvent={(event, selected) => (
    <span className={selected ? "selected" : ""}>{event.title}</span>
  )}
/>
```

Genera 42 días, de domingo a sábado, incluyendo los días adyacentes. `maxVisibleEvents` limita los eventos por celda (tres por defecto); el contador `+N` anuncia los registros adicionales. La agenda a pantalla completa usa uno para que las seis semanas quepan en el viewport, y conserva todos los registros en el panel del día. Las etiquetas accesibles incluyen fecha y cantidad de registros; las flechas mueven uno o siete días, Home/End el inicio/final de fila y PageUp/PageDown un mes, ajustando el día al último válido. El foco acompaña la selección por teclado.

El consumidor aporta `renderEvent` y los estilos de `.sa-month-matrix`, `.sa-month-week`, `.sa-month-day`, `.sa-day-number`, `.sa-day-events` y `.sa-day-more`. La composición `frontend/src/pilot/SmartAgenda.jsx` y su CSS reproducen el diseño adjunto; el componente de cuadrícula no contiene acciones de negocio. `smart-agenda-model.mjs` adapta Goal Sheet y recordatorios sin fabricar campos ausentes.

Pruebas: `node --test frontend/src/components/calendar/month-model.test.mjs frontend/src/pilot/smart-agenda-model.test.mjs`. Integración con API local y datos simulados: `work/features/2026-11-22-v1-monthly-agenda-design/verify-monthly.cjs`.

## Vista semanal

`Calendar` es un componente controlado, independiente de Sales Academy, rutas, API y autenticación. Recibe fechas civiles `YYYY-MM-DD`; no convierte días a horas ni mantiene datos en almacenamiento global.

```jsx
const [selectedDate, setSelectedDate] = useState(today);

<Calendar
  events={[{ id: "event-1", date: "2026-11-23", title: "Enviar propuesta" }]}
  selectedDate={selectedDate}
  onSelectDate={setSelectedDate}
  today={today}
  ariaLabel="Calendario de actividades"
  renderEvent={(event) => <article><h3>{event.title}</h3></article>}
/>
```

| Prop | Uso |
|---|---|
| events | Array de objetos con id único, date y title. Puede conservar campos adicionales para renderEvent. |
| selectedDate / onSelectDate | Estado controlado; el padre recibe la nueva fecha al seleccionar, navegar o usar teclado. |
| today | Fecha civil del contexto de la app. Mantiene la zona/semántica elegida por el consumidor. |
| locale | `es-MX` predeterminado para los nombres de fecha; se usa UTC únicamente para preservar el día civil al formatear. |
| ariaLabel | Nombre accesible de la región; usar nombres distintos si se muestran varias instancias. |
| labels | Traducciones/copy opcionales: previousWeek, nextWeek, today, week, day, singular, plural, empty, emptyHint, nextEvent, previousEvent. |
| renderEvent | Render opcional de cada evento; por defecto muestra el título. Ninguna acción de negocio se ejecuta en el calendario. |
| emptyState | Contenido React para día sin eventos; opcional. |

Semana de lunes a domingo. Botones anterior/siguiente desplazan siete días; Hoy usa la fecha del consumidor. Las flechas del teclado cambian día/semana, Home/End inicio/fin de semana, PageUp/PageDown siete días. La fecha seleccionada es el único botón de la tira en el orden de Tab; el foco acompaña cambios hechos con teclado.

El contador del día se anuncia en su etiqueta, además del indicador visual. `aria-current=date` identifica hoy y `aria-pressed` la selección. No depende del color para comunicar selección o actividad. Las fechas inválidas no entran al calendario; corresponde al consumidor decidir cómo revisar datos inválidos de su fuente.

Los estilos se limitan a `.sv-calendar`. Se pueden personalizar las variables `--calendar-bg`, `--calendar-panel`, `--calendar-raised`, `--calendar-line`, `--calendar-text`, `--calendar-muted`, `--calendar-accent` y `--calendar-ink`; por defecto heredan tokens existentes y tienen valores de respaldo.

La agenda semanal anterior normalizaba `follow_up_date` y `note`, y conservaba `entry_date` para editar el Goal Sheet correcto. La agenda mensual mantiene esa edición desde el título de cada seguimiento. No se inventan horarios, estados de tours ni asignaciones de asesores.

Pruebas: `node --test frontend/src/components/calendar/calendar-model.test.mjs`. Integración con API real: `work/features/2026-11-22-v1-agenda-calendar/verify-calendar.cjs`.

Build de la aplicación legacy: `npm run build:v1`, resultado `frontend/dist-v1/v1.html`. El build normal sigue apuntando a V5; no sustituir su entrypoint para publicar V1.
