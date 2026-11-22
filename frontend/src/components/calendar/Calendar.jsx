import React, { useEffect, useId, useMemo, useRef } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import {
  addDays,
  formatCalendarDate,
  groupEvents,
  isDateKey,
  nearbyEventDate,
  weekDates,
} from "./calendar-model.mjs";
import "./calendar.css";

const defaultLabels = {
  previousWeek: "Semana anterior",
  nextWeek: "Semana siguiente",
  today: "Hoy",
  week: "Tu semana",
  day: "En este día",
  singular: "evento",
  plural: "eventos",
  empty: "Sin eventos para este día",
  emptyHint: "Selecciona otra fecha para consultar tu actividad.",
  nextEvent: "Ir al próximo evento",
  previousEvent: "Ver evento anterior",
};

/** Controlled weekly calendar. Events carry civil dates; fetching and actions belong to the caller. */
export function Calendar({
  events = [],
  selectedDate,
  onSelectDate,
  today,
  locale = "es-MX",
  ariaLabel = "Calendario",
  labels: customLabels = {},
  renderEvent,
  emptyState,
}) {
  const labels = { ...defaultLabels, ...customLabels };
  const activeDate = isDateKey(selectedDate) ? selectedDate : today;
  const days = weekDates(activeDate);
  const grouped = useMemo(() => groupEvents(events), [events]);
  const dayEvents = grouped.get(activeDate) || [];
  const weekCount = days.reduce((count, date) => count + (grouped.get(date)?.length || 0), 0);
  const nearbyDate = nearbyEventDate(events, activeDate);
  const headingId = useId();
  const datesId = useId();
  const buttons = useRef(new Map());
  const focusDate = useRef(null);
  const countLabel = (count) => `${count} ${count === 1 ? labels.singular : labels.plural}`;

  useEffect(() => {
    if (focusDate.current === activeDate) {
      buttons.current.get(activeDate)?.focus();
      focusDate.current = null;
    }
  }, [activeDate]);

  function onDateKeyDown(event, date) {
    const keys = {
      ArrowLeft: () => addDays(date, -1),
      ArrowRight: () => addDays(date, 1),
      ArrowUp: () => addDays(date, -7),
      ArrowDown: () => addDays(date, 7),
      Home: () => days[0],
      End: () => days.at(-1),
      PageUp: () => addDays(date, -7),
      PageDown: () => addDays(date, 7),
    };
    if (!keys[event.key]) return;
    event.preventDefault();
    const nextDate = keys[event.key]();
    if (!nextDate || nextDate === activeDate) return;
    focusDate.current = nextDate;
    onSelectDate(nextDate);
  }

  return (
    <section className="sv-calendar" aria-label={ariaLabel}>
      <div className="sv-calendar-week-panel">
        <div className="sv-calendar-eyebrow"><CalendarDays size={17} aria-hidden="true" /> {labels.week}</div>
        <div className="sv-calendar-toolbar">
          <h2>{formatCalendarDate(activeDate, locale, { month: "long", year: "numeric" })}</h2>
          <div className="sv-calendar-controls">
            <button type="button" className="sv-calendar-today" onClick={() => onSelectDate(today)} disabled={!isDateKey(today)}>{labels.today}</button>
            <button type="button" className="sv-calendar-arrow" aria-label={labels.previousWeek} disabled={!addDays(activeDate, -7)} onClick={() => onSelectDate(addDays(activeDate, -7))}><ChevronLeft size={20} aria-hidden="true" /></button>
            <button type="button" className="sv-calendar-arrow" aria-label={labels.nextWeek} disabled={!addDays(activeDate, 7)} onClick={() => onSelectDate(addDays(activeDate, 7))}><ChevronRight size={20} aria-hidden="true" /></button>
          </div>
        </div>
        <p className="sv-calendar-range" id={datesId}>
          {formatCalendarDate(days[0], locale, { day: "numeric", month: "short" })}
          {" — "}
          {formatCalendarDate(days.at(-1), locale, { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <div className="sv-calendar-days" role="group" aria-labelledby={datesId}>
          {days.map((date) => {
            const count = grouped.get(date)?.length || 0;
            const selected = date === activeDate;
            return (
              <button
                key={date}
                ref={(node) => { if (node) buttons.current.set(date, node); else buttons.current.delete(date); }}
                type="button"
                className="sv-calendar-date"
                aria-label={`${formatCalendarDate(date, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${countLabel(count)}`}
                aria-pressed={selected}
                aria-current={date === today ? "date" : undefined}
                tabIndex={selected ? 0 : -1}
                onClick={() => onSelectDate(date)}
                onKeyDown={(event) => onDateKeyDown(event, date)}
              >
                <span className="sv-calendar-weekday">{formatCalendarDate(date, locale, { weekday: "short" }).replace(/\.$/, "")}</span>
                <strong>{Number(date.slice(-2))}</strong>
                <span className={`sv-calendar-count${count ? " has-events" : ""}`} aria-hidden="true">{count ? (count > 99 ? "99+" : count) : "·"}</span>
                <span className="sv-calendar-current" aria-hidden="true">{date === today ? labels.today : ""}</span>
              </button>
            );
          })}
        </div>
        <p className="sv-calendar-week-summary"><span>{labels.week}</span><strong>{countLabel(weekCount)}</strong></p>
        {!dayEvents.length && nearbyDate && (
          <button className="sv-calendar-jump" type="button" onClick={() => { focusDate.current = nearbyDate; onSelectDate(nearbyDate); }}>
            <span><strong>{nearbyDate > activeDate ? labels.nextEvent : labels.previousEvent}</strong><small>{formatCalendarDate(nearbyDate, locale)}</small></span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="sv-calendar-day-panel">
        <header className="sv-calendar-day-heading" aria-live="polite" aria-atomic="true">
          <p>{labels.day}</p>
          <h2 id={headingId}>{formatCalendarDate(activeDate, locale)}</h2>
          <span>{countLabel(dayEvents.length)}</span>
        </header>
        {dayEvents.length ? (
          <ul className="sv-calendar-events" aria-labelledby={headingId}>
            {dayEvents.map((event) => <li key={event.id}>{renderEvent ? renderEvent(event) : <article className="sv-calendar-default-event"><h3>{event.title}</h3></article>}</li>)}
          </ul>
        ) : emptyState || (
          <div className="sv-calendar-empty"><CalendarDays size={26} aria-hidden="true" /><h3>{labels.empty}</h3><p>{labels.emptyHint}</p></div>
        )}
      </div>
    </section>
  );
}
