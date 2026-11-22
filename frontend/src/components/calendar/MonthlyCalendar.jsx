import React, { useEffect, useRef } from "react";
import { addDays, formatCalendarDate, groupEvents } from "./calendar-model.mjs";
import { monthDates, shiftMonth } from "./month-model.mjs";

/** Date-only monthly grid. Layout and event rendering are supplied by the consuming design. */
export function MonthlyCalendar({ selectedDate, today, events, onSelectDate, renderEvent }) {
  const days = monthDates(selectedDate);
  const grouped = groupEvents(events);
  const buttons = useRef(new Map());
  const keyboardDate = useRef(null);
  useEffect(() => {
    if (keyboardDate.current === selectedDate) {
      buttons.current.get(selectedDate)?.focus();
      keyboardDate.current = null;
    }
  }, [selectedDate]);
  function onKey(event, date) {
    const index = days.indexOf(date);
    const actions = {
      ArrowLeft: () => addDays(date, -1), ArrowRight: () => addDays(date, 1),
      ArrowUp: () => addDays(date, -7), ArrowDown: () => addDays(date, 7),
      Home: () => days[index - index % 7], End: () => days[index - index % 7 + 6],
      PageUp: () => shiftMonth(date, -1), PageDown: () => shiftMonth(date, 1),
    };
    if (!actions[event.key]) return;
    event.preventDefault();
    const next = actions[event.key]();
    if (!next || next === selectedDate) return;
    keyboardDate.current = next;
    onSelectDate(next);
  }
  return (
    <div className="sa-month-matrix" role="group" aria-label="Días del mes">
      {Array.from({ length: 6 }, (_, row) => (
        <div className="sa-month-week" key={row}>
          {days.slice(row * 7, row * 7 + 7).map((date) => {
            const dayEvents = grouped.get(date) || [];
            const selected = date === selectedDate;
            return (
              <button type="button" key={date}
                ref={(node) => { if (node) buttons.current.set(date, node); else buttons.current.delete(date); }}
                className={`sa-month-day${selected ? " is-selected" : ""}${date === today ? " is-today" : ""}${date.slice(0, 7) !== selectedDate.slice(0, 7) ? " is-outside" : ""}`}
                aria-label={`${formatCalendarDate(date, "es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${dayEvents.length} ${dayEvents.length === 1 ? "registro" : "registros"}`}
                aria-pressed={selected} aria-current={date === today ? "date" : undefined}
                tabIndex={selected ? 0 : -1} onClick={() => onSelectDate(date)} onKeyDown={(event) => onKey(event, date)}>
                <span className="sa-day-number">{Number(date.slice(-2))}</span>
                <span className="sa-day-events">{dayEvents.slice(0, 3).map((item) => <React.Fragment key={item.id}>{renderEvent(item, selected)}</React.Fragment>)}
                  {dayEvents.length > 3 && <span className="sa-day-more">+{dayEvents.length - 3} más</span>}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
