import { useEffect, useRef } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { CalendarCategoryBadge } from './CalendarCategoryBadge';
import { type CalendarEvent } from '../calendarTypes';
import { calendarRange, calendarSourcePage } from '../utils/academicCalendar';

export function CalendarEventDialog({ event, sourceUrl, onClose }: {
  event: CalendarEvent; sourceUrl: string; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} aria-labelledby="calendar-event-title" onCancel={onClose}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    className="m-auto w-[calc(100%-2rem)] max-w-xl max-h-[85dvh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-6 shadow-2xl backdrop:bg-slate-950/60">
    <div className="flex items-start gap-4 justify-between"><h2 id="calendar-event-title" className="font-bold text-xl">{event.titulo}</h2>
      <button type="button" onClick={onClose} aria-label="Fechar detalhes" className="shrink-0 rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} /></button></div>
    <p className="mt-3 font-medium text-indigo-600 dark:text-indigo-300">{calendarRange(event)}</p>
    <div className="mt-3 flex flex-wrap items-center gap-2"><CalendarCategoryBadge category={event.categoria} /><span className="text-sm text-slate-500">{event.semestres.join(' / ') || 'Semestre a conferir'}</span></div>
    <p className="mt-5 whitespace-pre-wrap leading-relaxed">{event.descricaoOriginal}</p>
    {event.horarioOriginal && <p className="mt-3 text-sm">Horário: {event.horarioOriginal}</p>}
    {event.publico.length > 0 && <p className="mt-3 text-sm">Público: {event.publico.join(', ')}</p>}
    <div className="mt-6 flex flex-col items-start gap-3">
      {event.links.map(link => <a key={link} href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 dark:text-indigo-300 underline break-all">{link}</a>)}
      {(event.origens.length ? event.origens : [null]).map((origin, i) => <a key={i} href={calendarSourcePage(sourceUrl, origin?.pagina)} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-300 hover:underline"><ExternalLink size={15} />{origin ? `Ver PDF oficial · página ${origin.pagina}` : 'Ver PDF oficial'}</a>)}
    </div>
  </dialog>;
}
