import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChartNoAxesColumnIncreasing, Clock3, GraduationCap, Plus, Search, Menu, ChevronLeft, X } from "lucide-react";
import { MonthlyCalendar } from "../components/calendar/MonthlyCalendar";
import { formatCalendarDate } from "../components/calendar/calendar-model.mjs";
import { agendaEvents, followupOriginDate, summaryFor } from "./smart-agenda-model.mjs";
import { localDate } from "./model.mjs";
import "./smart-agenda.css";

const amount = (value, compact = false) => new Intl.NumberFormat("en-US", { notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 1 : 2 }).format(value).replace("K", "k");
const dayTitle = (date) => `${formatCalendarDate(date, "es-MX", { weekday: "long" })}, ${Number(date.slice(-2))} ${formatCalendarDate(date, "es-MX", { month: "short" }).replace(/\.$/, "")}`;

function EntryCard({ event }) {
  if (!event) return <div className="sa-detail-card sa-empty-day"><p>Sin registros para este día.</p></div>;
  const followup = event.kind === "followup";
  return <article className="sa-detail-card">
    <header className="sa-detail-title"><span className={`sa-detail-dot ${followup ? "is-followup" : ""}`} /><strong>{followup ? event.entryDate ? <a href={`#goalsheet/${event.entryDate}`}>Seguimiento</a> : "Seguimiento" : event.kind === "sale" ? "Venta registrada" : event.title}</strong><span className="sa-detail-amount">{event.amount === null ? "—" : `USD ${amount(event.amount)}`}</span></header>
    {!followup && <div className="sa-detail-fields"><div><span>Enganche</span><strong>—</strong></div><div><span>Spiff de Cierre</span><strong className="sa-spiff">⭐ —</strong></div></div>}
    <footer className="sa-detail-note"><span>Nota: <em>{event.note || (followup ? event.title : "Sin notas")}</em></span><time dateTime={event.date}>{Number(event.date.slice(-2))} {formatCalendarDate(event.date, "es-MX", { month: "short" }).replace(/\.$/, "")}</time></footer>
  </article>;
}

export function SmartAgenda({ data, onAddFollowup }) {
  const today = localDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [filter, setFilter] = useState("all");
  const [listView, setListView] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [monthValue, setMonthValue] = useState(today.slice(0, 7));
  const [sheetHeight, setSheetHeight] = useState(300);
  const sheet = useRef(null), scrollArea = useRef(null), monthTrigger = useRef(null), monthInput = useRef(null), searchInput = useRef(null), monthDialog = useRef(null);
  const events = useMemo(() => agendaEvents(data.entries, data.reminders), [data.entries, data.reminders]);
  const filtered = events.filter((event) => (filter === "all" || (filter === "sales" && event.kind === "sale")) && `${event.title} ${event.note || ""}`.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es")));
  const dayEvents = filtered.filter((event) => event.date === selectedDate);
  const monthEvents = filtered.filter((event) => event.date.slice(0, 7) === selectedDate.slice(0, 7)).sort((a, b) => a.date.localeCompare(b.date));
  const month = summaryFor(data.entries, selectedDate.slice(0, 7)), day = summaryFor(data.entries, selectedDate);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSheetHeight(entry.target.getBoundingClientRect().height));
    if (sheet.current) observer.observe(sheet.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { if (searchOpen) searchInput.current?.focus(); }, [searchOpen]);
  useEffect(() => { if (monthOpen) { monthDialog.current?.showModal(); monthInput.current?.focus(); } }, [monthOpen]);

  function selectDate(date) { setSelectedDate(date); }
  function goToday() { setSelectedDate(today); scrollArea.current?.scrollTo({ top: 0 }); }
  function closeMonth() {
    monthDialog.current?.close();
    setMonthOpen(false);
    monthTrigger.current?.focus();
  }
  const renderChip = (event, selected) => <span className={`sa-event-chip sa-event-${event.kind}${selected ? " selected" : ""}`} title={event.title}>
    {event.kind === "sale" ? `🟢 ${event.title}${event.amount !== null ? ` $${amount(event.amount, true)}` : ""}` : event.kind === "followup" ? `↗ ${event.title}` : event.kind === "no-sale" ? `🔴 ${event.title}` : `⚪ ${event.title}`}
  </span>;

  return <div className="smart-agenda-route">
    <section className="sa-device" aria-label="Calendario mensual" style={{ "--sa-sheet-height": `${sheetHeight}px` }}>
      <header className="sa-calendar-header" data-purpose="calendar-top-header">
        <div className="sa-top-controls">
          <button className="sa-year-button" ref={monthTrigger} type="button" aria-label="Elegir mes y año" onClick={() => { setMonthValue(selectedDate.slice(0, 7)); setMonthOpen(true); }}><ChevronLeft size={22} aria-hidden="true" /><span>{selectedDate.slice(0, 4)}</span></button>
          <div className="sa-utilities">
            <button className="sa-view-button" type="button" aria-label="Cambiar vista" aria-pressed={listView} onClick={() => setListView(!listView)}><Menu size={17} aria-hidden="true" /></button>
            <button type="button" aria-label="Buscar eventos" aria-expanded={searchOpen} onClick={() => { setSearchOpen(!searchOpen); setQuery(""); }}><Search size={22} aria-hidden="true" /></button>
            <a href={`#goalsheet/${followupOriginDate(selectedDate, today)}`} aria-label="Nuevo registro de venta o tour"><Plus size={27} aria-hidden="true" /></a>
          </div>
        </div>
        <div className="sa-month-heading"><h1>{formatCalendarDate(selectedDate, "es-MX", { month: "long" })}</h1><span className="sa-month-kpi"><i />{month.tours} {month.tours === 1 ? "tour" : "tours"} · USD {amount(month.volume, true)}</span></div>
        {searchOpen && <div className="sa-search"><input ref={searchInput} type="search" aria-label="Buscar en el mes" placeholder="Buscar eventos" value={query} onChange={(event) => setQuery(event.target.value)} /><button type="button" aria-label="Cerrar búsqueda" onClick={() => { setSearchOpen(false); setQuery(""); }}><X size={18} /></button></div>}
        <div className="sa-weekdays" aria-hidden="true">{["D", "L", "M", "M", "J", "V", "S"].map((letter, i) => <span key={i}>{letter}</span>)}</div>
      </header>
      <div className="sa-month-scroll" ref={scrollArea} data-purpose="calendar-month-grid">
        {listView ? <div className="sa-history-list" aria-label="Historial del mes">{monthEvents.length ? monthEvents.map((event) => <button key={event.id} type="button" onClick={() => { selectDate(event.date); setListView(false); }}><time>{dayTitle(event.date)}</time>{renderChip(event, event.date === selectedDate)}</button>) : <p>No hay registros en este mes.</p>}</div> : <MonthlyCalendar selectedDate={selectedDate} today={today} events={filtered} onSelectDate={selectDate} renderEvent={renderChip} />}
      </div>
      <section className="sa-day-sheet" ref={sheet} data-purpose="selected-day-preview-sheet" aria-label="Detalle del día">
        <button type="button" className="sa-sheet-handle" aria-label={collapsed ? "Expandir detalle del día" : "Contraer detalle del día"} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}><span /></button>
        <div className="sa-sheet-content">
          <header className="sa-selected-day">
            <span className="sa-selected-number">{Number(selectedDate.slice(-2))}</span>
            <div className="sa-selected-summary"><div><h2>{dayTitle(selectedDate)}</h2><span className="sa-pending" title="Estado no registrado">—</span></div><p>{day.tours} {day.tours === 1 ? "tour" : "tours"} · {day.sales} {day.sales === 1 ? "venta cerrada" : "ventas cerradas"} · USD {amount(day.volume)}</p></div>
            <div className="sa-commission"><span>Comisión</span><strong>—</strong></div>
          </header>
          {!collapsed && <div className="sa-detail-scroll">{dayEvents.length ? dayEvents.map((event) => <EntryCard key={event.id} event={event} />) : <EntryCard />}</div>}
        </div>
        <div className="sa-sheet-toolbar">
          <button type="button" className="sa-today" onClick={goToday}><i />Hoy</button>
          <div className="sa-filters" role="group" aria-label="Filtrar registros">{[["all", "Todos"], ["sales", "Ventas"], ["spiffs", "⭐ Spiffs"]].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
        </div>
      </section>
      <button type="button" className="sa-followup-fab" aria-label="Agregar seguimiento" title="Agregar seguimiento" onClick={() => onAddFollowup(selectedDate)}><Plus size={23} aria-hidden="true" /></button>
      <nav className="sa-app-nav" aria-label="Navegación de agenda" data-purpose="app-bottom-navbar">
        <a href="#home"><CalendarDays size={22} aria-hidden="true" /><span>Hoy</span></a>
        <button type="button" className={!listView ? "is-active" : ""} aria-current={!listView ? "page" : undefined} onClick={() => setListView(false)}><span className="sa-nav-icon"><ChartNoAxesColumnIncreasing size={22} aria-hidden="true" /></span><span>GoalSheet</span></button>
        <button type="button" className={listView ? "is-active" : ""} aria-current={listView ? "page" : undefined} onClick={() => setListView(true)}><span className="sa-nav-icon"><Clock3 size={22} aria-hidden="true" /></span><span>Historial</span></button>
        <a href="#coach"><GraduationCap size={23} aria-hidden="true" /><span>Coaching</span></a>
      </nav>
      <div className="sa-home-indicator" aria-hidden="true" />
      {monthOpen && <dialog className="sa-month-dialog" ref={monthDialog} aria-labelledby="sa-month-dialog-title" onCancel={(event) => { event.preventDefault(); closeMonth(); }}>
        <form onSubmit={(event) => { event.preventDefault(); if (/^\d{4}-\d{2}$/.test(monthValue)) { selectDate(`${monthValue}-01`); scrollArea.current?.scrollTo({ top: 0 }); closeMonth(); } }}>
          <h2 id="sa-month-dialog-title">Elegir mes y año</h2><label>Mes<input ref={monthInput} type="month" required min="0001-01" max="9998-12" value={monthValue} onChange={(event) => setMonthValue(event.target.value)} /></label><div><button type="button" onClick={closeMonth}>Cancelar</button><button type="submit">Ver mes</button></div>
        </form>
      </dialog>}
    </section>
  </div>;
}
