import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { CALENDAR_CATEGORIES, type CalendarEvent } from '../../calendarTypes';
import { calendarSourcePage, isCalendarDate, safeCalendarUrl } from '../../utils/academicCalendar';

export function CalendarEventEditor({ event, review, sourceUrl, onSave, onClose }: {
  event: CalendarEvent; review: string; sourceUrl: string; onSave: (event: CalendarEvent, review: string) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [edited, setEdited] = useState(() => structuredClone(event));
  const [note, setNote] = useState(review);
  const [semesters, setSemesters] = useState(event.semestres.join(', '));
  const [audience, setAudience] = useState(event.publico.join(', '));
  const [links, setLinks] = useState(event.links.join('\n'));
  const [error, setError] = useState('');
  useEffect(() => { const el = dialog.current!; el.showModal(); return () => el.close(); }, []);
  const patch = (values: Partial<CalendarEvent>) => setEdited(current => ({ ...current, ...values }));
  function close() {
    const dirty = JSON.stringify(edited) !== JSON.stringify(event) || note !== review || semesters !== event.semestres.join(', ') || audience !== event.publico.join(', ') || links !== event.links.join('\n');
    if (!dirty || window.confirm('Descartar as alterações deste evento?')) onClose();
  }
  function save() {
    const semestres = semesters.split(',').map(s => s.trim()).filter(Boolean);
    const linkList = links.split('\n').map(s => s.trim()).filter(Boolean);
    if (!edited.titulo.trim()) return setError('Informe o título.');
    if ((edited.inicio && !isCalendarDate(edited.inicio)) || (edited.fimInclusivo && !isCalendarDate(edited.fimInclusivo)) || (edited.inicio && edited.fimInclusivo && edited.inicio > edited.fimInclusivo)) return setError('Confira o início e o término do evento.');
    if (semestres.some(s => !/^\d{4}\.[12]$/.test(s))) return setError('Use semestres como 2026.1, separados por vírgula.');
    if (linkList.some(link => !safeCalendarUrl(link))) return setError('Use links HTTP/HTTPS válidos.');
    onSave({ ...edited, titulo: edited.titulo.trim(), semestres, publico: audience.split(',').map(s => s.trim()).filter(Boolean), links: linkList }, note.trim());
  }
  return <dialog ref={dialog} onCancel={e => { e.preventDefault(); close(); }} aria-labelledby="calendar-edit-title" className="m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 p-6 shadow-xl backdrop:bg-slate-950/60">
    <div className="flex items-center justify-between gap-3 mb-5"><h2 id="calendar-edit-title" className="font-bold text-xl">Editar evento</h2><button onClick={close} aria-label="Fechar editor" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} /></button></div>
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); save(); }}>
      <label className="block text-sm font-medium">Título<input required className="admin-input mt-1" value={edited.titulo} onChange={e => patch({ titulo: e.target.value })} /></label>
      <label className="block text-sm font-medium">Descrição exibida<textarea rows={4} className="admin-input mt-1" value={edited.descricaoOriginal} onChange={e => patch({ descricaoOriginal: e.target.value })} /></label>
      <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm">Início<input type="date" className="admin-input mt-1" value={edited.inicio || ''} onChange={e => patch({ inicio: e.target.value || null })} /></label><label className="text-sm">Último dia (incluído)<input type="date" className="admin-input mt-1" value={edited.fimInclusivo || ''} onChange={e => patch({ fimInclusivo: e.target.value || null })} /></label></div>
      <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm">Semestres<input className="admin-input mt-1" value={semesters} placeholder="2026.1, 2026.2" onChange={e => setSemesters(e.target.value)} /></label><label className="text-sm">Categoria<select className="admin-input mt-1" value={edited.categoria} onChange={e => patch({ categoria: e.target.value as CalendarEvent['categoria'] })}>{Object.entries(CALENDAR_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
      <label className="block text-sm">Público (separado por vírgula)<input className="admin-input mt-1" value={audience} onChange={e => setAudience(e.target.value)} /></label>
      <label className="block text-sm">Horário informado no documento<input className="admin-input mt-1" value={edited.horarioOriginal || ''} onChange={e => patch({ horarioOriginal: e.target.value || null, diaInteiro: !e.target.value.trim() })} /></label>
      <label className="block text-sm">Links (um por linha)<textarea rows={2} className="admin-input mt-1" value={links} onChange={e => setLinks(e.target.value)} /></label>
      {event.motivosRevisao.length > 0 && <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4 text-sm"><p className="font-semibold mb-2">Pendências da extração</p><ul className="list-disc pl-4 space-y-2">{event.motivosRevisao.map((reason, i) => <li key={i}>{reason}</li>)}</ul></div>}
      <label className="block text-sm font-medium">Justificativa da revisão<textarea className="admin-input mt-1" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Preencha após conferir a fonte para marcar o evento como revisado." /></label>
      {event.origens.length > 0 && <details className="text-sm"><summary className="cursor-pointer font-medium">Evidências da extração</summary>{event.origens.map((origin, i) => <p key={i} className="mt-2 whitespace-pre-wrap text-slate-500">Página {origin.pagina}: {origin.trechoOriginal}{safeCalendarUrl(sourceUrl, true) && <a className="block mt-1 underline text-indigo-600 dark:text-indigo-300" href={calendarSourcePage(sourceUrl, origin.pagina)} target="_blank" rel="noopener noreferrer">Conferir no PDF</a>}</p>)}</details>}
      {error && <p role="alert" className="text-rose-600 text-sm">{error}</p>}
      <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={close} className="admin-secondary">Cancelar</button><button type="submit" className="admin-primary">Aplicar ao rascunho</button></div>
    </form>
  </dialog>;
}
