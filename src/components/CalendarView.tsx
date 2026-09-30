import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, ExternalLink, List, Loader2, Search, Sparkles } from 'lucide-react';
import { Navbar } from './Navbar';
import { CalendarEventDialog } from './CalendarEventDialog';
import { CALENDAR_CATEGORIES, type CalendarEvent, type CalendarPublication } from '../calendarTypes';
import { calendarAvailableMonths, calendarEventStatus, calendarIntersects, calendarMonthDays, calendarRange,
  calendarToday, calendarUpcoming, closestCalendarMonth, formatCalendarDate, shiftCalendarDate, shiftCalendarMonth, sortCalendarEvents } from '../utils/academicCalendar';
import { apiFetch } from '../utils/api';
import type { AppView } from '../utils/appLocation';
import type { ThemeMode } from '../hooks/useSchedule';

type Presentation = 'upcoming' | 'list' | 'month';
const dayStyles: Record<string, string> = {
  'Dias letivos': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  'Provas finais': 'bg-slate-800 text-white dark:bg-slate-600',
  'Aulas extras acessibilidade': 'bg-white text-slate-700 border border-slate-300 dark:bg-slate-900 dark:text-slate-200',
  'Feriados': 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
  'Recesso': 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200'
};
const temporalLabels = { today: 'Hoje', ending: 'Termina hoje', ongoing: 'Em andamento', future: '', past: '', undated: 'Data a conferir' };

function EventCard({ event, today, onOpen }: { event: CalendarEvent; today: string; onOpen: (e: CalendarEvent) => void }) {
  const label = temporalLabels[calendarEventStatus(event, today)];
  return <button onClick={() => onOpen(event)} className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors group">
    <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
      <span className="font-semibold text-indigo-600 dark:text-indigo-300">{calendarRange(event)}</span>
      {label && <span className={`rounded-full px-2 py-1 font-semibold ${label === 'Termina hoje' ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'}`}>{label}</span>}
    </div>
    <div className="flex gap-3 items-start"><h3 className="font-semibold flex-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">{event.titulo}</h3><ArrowRight size={16} className="shrink-0 text-slate-400 mt-1" /></div>
    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{CALENDAR_CATEGORIES[event.categoria]} · {event.semestres.join(' / ') || 'Semestre a conferir'}</p>
  </button>;
}

export function CalendarView({ setView, darkMode, themePreference, cycleTheme }: {
  setView: (view: AppView) => void; darkMode: boolean; themePreference: ThemeMode; cycleTheme: () => void;
}) {
  const [calendar, setCalendar] = useState<CalendarPublication | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [today, setToday] = useState(() => calendarToday());
  const [presentation, setPresentation] = useState<Presentation>('upcoming');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState('all');
  const [category, setCategory] = useState('all');
  const [futureLimit, setFutureLimit] = useState(10);
  const [detail, setDetail] = useState<CalendarEvent | null>(null);
  useEffect(() => {
    const refreshDate = () => { if (!document.hidden) setToday(calendarToday()); };
    const interval = window.setInterval(refreshDate, 60_000);
    document.addEventListener('visibilitychange', refreshDate);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', refreshDate); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setStatus('loading'); setError('');
    apiFetch('/api/calendar', retry ? { cache: 'reload' } : {}).then(async response => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar o calendário.');
      if (cancelled) return;
      const data = payload.calendar as CalendarPublication | null;
      setCalendar(data); setStatus('ready');
      if (data) setMonth(closestCalendarMonth(calendarAvailableMonths(data.events, data.days), calendarToday()));
    }).catch(reason => { if (!cancelled) { setError(reason.message || 'Não foi possível carregar o calendário.'); setStatus('error'); } });
    return () => { cancelled = true; };
  }, [retry]);
  const months = useMemo(() => calendar ? calendarAvailableMonths(calendar.events, calendar.days) : [], [calendar]);
  const semesters = useMemo(() => calendar ? [...new Set([...calendar.document.semestres, ...calendar.events.flatMap(e => e.semestres)])].sort() : [], [calendar]);
  const filtered = useMemo(() => {
    const term = search.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
    return (calendar?.events || []).filter(event => (semester === 'all' || event.semestres.includes(semester)) && (category === 'all' || event.categoria === category)
      && (!term || `${event.titulo} ${event.descricaoOriginal} ${event.publico.join(' ')}`.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().includes(term))).sort(sortCalendarEvents);
  }, [calendar, search, semester, category]);
  const upcoming = useMemo(() => calendarUpcoming(filtered, today), [filtered, today]);
  const nextMonth = shiftCalendarMonth(month, 1);
  const monthEvents = useMemo(() => filtered.filter(event => calendarIntersects(event, `${month}-01`, shiftCalendarDate(`${nextMonth}-01`, -1))), [filtered, month, nextMonth]);
  const dayLookup = useMemo(() => new Map((calendar?.days || []).filter(day => semester === 'all' || day.semesters.includes(semester)).map(day => [day.date, day])), [calendar, semester]);
  useEffect(() => { setFutureLimit(10); }, [search, semester, category, today]);
  const cards = (events: CalendarEvent[], empty: string) => events.length ? <div className="space-y-3">{events.map(event => <EventCard key={event.id} event={event} today={today} onOpen={setDetail} />)}</div> : <p className="py-6 text-sm text-slate-500 dark:text-slate-400">{empty}</p>;
  return <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
    <Navbar setView={setView} title="Calendário acadêmico" course={null} darkMode={darkMode} themePreference={themePreference} cycleTheme={cycleTheme} />
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-5 mb-7">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">UFAPE · calendário acadêmico</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Calendário acadêmico</h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Hoje, {formatCalendarDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · horário de Brasília</p></div>
        {calendar && <a href={calendar.sourceUrl} target="_blank" rel="noopener noreferrer" className="admin-secondary inline-flex items-center gap-2"><ExternalLink size={16} />Ver PDF oficial</a>}
      </div>
      {status === 'loading' && <p role="status" className="flex items-center gap-2 py-16 justify-center"><Loader2 className="animate-spin" size={20} />Carregando calendário…</p>}
      {status === 'error' && <div role="alert" className="admin-panel"><p>{error}</p><button onClick={() => setRetry(x => x + 1)} className="admin-primary mt-4">Tentar novamente</button></div>}
      {status === 'ready' && !calendar && <div className="admin-panel text-center py-16"><CalendarDays className="mx-auto text-indigo-400 mb-4" size={36} /><h2 className="text-xl font-semibold">Calendário ainda não publicado</h2><p className="mt-3 text-slate-500">Os eventos aparecerão aqui após a publicação pela administração.</p></div>}
      {status === 'ready' && calendar && <>
        <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Apresentação do calendário">
          {([['upcoming', 'Hoje e próximos', Sparkles], ['list', 'Lista', List], ['month', 'Mês', CalendarDays]] as const).map(([mode, label, Icon]) => <button key={mode} aria-pressed={presentation === mode} onClick={() => { setPresentation(mode); setSelectedDay(null); }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${presentation === mode ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'}`}><Icon size={16} />{label}</button>)}
        </div>
        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 mb-7">
          <label className="relative"><span className="sr-only">Buscar eventos</span><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar matrícula, provas, feriados…" className="admin-input pl-10" /></label>
          <label><span className="sr-only">Semestre</span><select value={semester} onChange={e => setSemester(e.target.value)} className="admin-input"><option value="all">Todos os semestres</option>{semesters.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
          <label><span className="sr-only">Categoria</span><select value={category} onChange={e => setCategory(e.target.value)} className="admin-input"><option value="all">Todas as categorias</option>{Object.entries(CALENDAR_CATEGORIES).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
        </div>
        {presentation === 'upcoming' ? <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8">
          <section aria-labelledby="calendar-ongoing"><h2 id="calendar-ongoing" className="text-lg font-bold mb-4">Hoje e em andamento <span className="text-sm font-normal text-slate-400">{upcoming.ongoing.length}</span></h2>{cards(upcoming.ongoing, 'Nenhum evento em andamento para estes filtros.')}</section>
          <section aria-labelledby="calendar-future"><h2 id="calendar-future" className="text-lg font-bold mb-4">Próximos eventos</h2>{cards(upcoming.future.slice(0, futureLimit), 'Nenhum evento futuro publicado para estes filtros.')}
            {futureLimit < upcoming.future.length && <button className="admin-secondary mt-4 w-full" onClick={() => setFutureLimit(n => n + 10)}>Ver mais eventos</button>}
            {!upcoming.ongoing.length && !upcoming.future.length && <button onClick={() => setPresentation('list')} className="admin-secondary mt-3">Consultar calendário completo</button>}
          </section>
        </div> : <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="text-xl font-bold capitalize">{formatCalendarDate(`${month}-01`, { month: 'long', year: 'numeric' })}</h2>
            <div className="flex items-center gap-2"><button onClick={() => { setMonth(shiftCalendarMonth(month, -1)); setSelectedDay(null); }} className="admin-secondary p-2" aria-label="Mês anterior"><ChevronLeft size={18} /></button>
              <button onClick={() => { setMonth(today.slice(0, 7)); setSelectedDay(today); }} className="admin-secondary">Hoje</button>
              <button onClick={() => { setMonth(shiftCalendarMonth(month, 1)); setSelectedDay(null); }} className="admin-secondary p-2" aria-label="Próximo mês"><ChevronRight size={18} /></button></div>
          </div>
          {!!months.length && !months.includes(month) && <p className="text-sm text-slate-500 mb-4">Não há dados publicados para este mês. Cobertura: {months[0]} a {months.at(-1)}.</p>}
          {presentation === 'list' ? cards(monthEvents, 'Nenhum evento neste mês para estes filtros.') : <>
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="grid grid-cols-7 bg-slate-100 dark:bg-slate-800 text-center text-xs font-semibold py-3">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <span key={d}>{d}</span>)}</div>
              <div className="grid grid-cols-7">{calendarMonthDays(month).map(date => {
                const events = filtered.filter(event => calendarIntersects(event, date, date));
                const mark = dayLookup.get(date); const inMonth = date.startsWith(month); const active = selectedDay === date;
                return <button key={date} aria-label={`${formatCalendarDate(date, { day: 'numeric', month: 'long', year: 'numeric' })}, ${events.length} evento${events.length === 1 ? '' : 's'}${mark?.classification ? `, ${mark.classification}` : ''}`}
                  aria-current={date === today ? 'date' : undefined} aria-pressed={active} onClick={() => setSelectedDay(date)}
                  className={`min-w-0 min-h-20 sm:min-h-32 text-left p-1.5 sm:p-2 border-r border-b border-slate-100 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 ${!inMonth ? 'opacity-40' : ''} ${active ? 'ring-2 ring-inset ring-indigo-500' : ''}`}>
                  <span className={`inline-flex items-center justify-center w-7 h-7 text-xs rounded-full ${date === today ? 'bg-indigo-600 text-white font-bold' : 'font-medium'}`}>{Number(date.slice(-2))}</span>
                  {mark?.classification && <span className={`block truncate text-[9px] sm:text-[10px] rounded px-1 mt-1 ${dayStyles[mark.classification] || ''}`}>{mark.classification}</span>}
                  {events.length > 0 && <span className="block sm:hidden text-[10px] text-indigo-600 dark:text-indigo-300 mt-1">{events.length} evento{events.length > 1 ? 's' : ''}</span>}
                  <span className="hidden sm:block mt-1 space-y-1">{events.slice(0, 2).map(event => <span key={event.id} className="block truncate text-[10px] text-slate-600 dark:text-slate-300">{event.titulo}</span>)}{events.length > 2 && <span className="block text-[10px] text-indigo-600 dark:text-indigo-300">+{events.length - 2} eventos</span>}</span>
                </button>;
              })}</div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 text-[11px]" aria-label="Legenda">{Object.entries(dayStyles).map(([name, styles]) => <span key={name} className={`rounded px-2 py-1 ${styles}`}>{name}</span>)}</div>
            {selectedDay && <section className="mt-6" aria-labelledby="calendar-selected-day"><h3 id="calendar-selected-day" className="font-bold mb-3">{formatCalendarDate(selectedDay, { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
              {dayLookup.get(selectedDay)?.classification && <p className="text-sm text-slate-500 mb-3">Classificação do dia: {dayLookup.get(selectedDay)!.classification}</p>}
              {cards(filtered.filter(event => calendarIntersects(event, selectedDay, selectedDay)), 'Nenhum evento nesta data para estes filtros.')}</section>}
          </>}
        </>}
        <footer className="mt-10 pt-5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
          <p>{calendar.document.titulo || 'Calendário acadêmico UFAPE'}{calendar.document.versao ? ` · ${calendar.document.versao}` : ''}</p>
          <p>Publicado no My UFAPE em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(calendar.publishedAt))}.</p>
          {calendar.document.dataPublicacao && <p>Data de publicação do documento: {formatCalendarDate(calendar.document.dataPublicacao, { day: 'numeric', month: 'long', year: 'numeric' })}.</p>}
        </footer>
      </>}
      {detail && calendar && <CalendarEventDialog event={detail} sourceUrl={calendar.sourceUrl} onClose={() => setDetail(null)} />}
    </main>
  </div>;
}
