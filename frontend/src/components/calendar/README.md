# Calendario semanal reutilizable

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

El contador del día se anuncia en su etiqueta, además del indicador visual. `aria-current=date` identifica hoy y `aria-pressed` la selección. No depende del color para comunicar selección o actividad. Las fechas inválidas no entran al calendario; el adaptador debe conservarlas en una lista de revisión si corresponden a registros editables, como hace Agenda.

Los estilos se limitan a `.sv-calendar`. Se pueden personalizar las variables `--calendar-bg`, `--calendar-panel`, `--calendar-raised`, `--calendar-line`, `--calendar-text`, `--calendar-muted`, `--calendar-accent` y `--calendar-ink`; por defecto heredan tokens existentes y tienen valores de respaldo.

En Sales Academy, `Agenda` normaliza `follow_up_date` y `note`, y conserva `entry_date` para editar el Goal Sheet correcto. No se inventan horarios, estados de tours ni asignaciones de asesores.

Pruebas: `node --test frontend/src/components/calendar/calendar-model.test.mjs`. Integración con API real: `work/features/2026-11-22-v1-agenda-calendar/verify-calendar.cjs`.

Build de la aplicación legacy: `npm run build:v1`, resultado `frontend/dist-v1/v1.html`. El build normal sigue apuntando a V5; no sustituir su entrypoint para publicar V1.
