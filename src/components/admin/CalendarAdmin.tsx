import { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, Loader2, Plus, Save, Upload } from 'lucide-react';
import { CalendarEventEditor } from './CalendarEventEditor';
import { DAY_CLASSIFICATIONS, type CalendarAdminState, type CalendarDraft, type CalendarEvent, type CalendarValidationIssue } from '../../calendarTypes';
import { calendarRange, calendarSourcePage, consolidateCalendarDays, safeCalendarUrl, validateCalendarDraft } from '../../utils/academicCalendar';
import { apiFetch } from '../../utils/api';

type Preview = { draft: CalendarDraft; revision: number; issues: CalendarValidationIssue[];
  summary: { events: number; days: number; pendingEvents: number; problems: number; added: number; changed: number; removed: number } };

function ReviewDecision({ label, note, onChange }: { label: string; note: string; onChange: (note: string) => void }) {
  const [input, setInput] = useState(note);
  useEffect(() => setInput(note), [note]);
  return <div className="mt-3 flex flex-wrap gap-2"><input aria-label={label} className="admin-input flex-1 min-w-40" placeholder="Justificativa após conferir a fonte" value={input} onChange={e => setInput(e.target.value)} />
    <button className="admin-secondary" disabled={!input.trim()} onClick={() => onChange(input.trim())}>Registrar revisão</button>
    {note && <button className="text-xs underline" onClick={() => { setInput(''); onChange(''); }}>Reabrir pendência</button>}</div>;
}

export function CalendarAdmin({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const [state, setState] = useState<CalendarAdminState | null>(null);
  const [draft, setDraft] = useState<CalendarDraft | null>(null);
  const [baseline, setBaseline] = useState('null');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [section, setSection] = useState<'events' | 'issues' | 'days'>('events');
  const [search, setSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [limit, setLimit] = useState(30);
  const dirty = JSON.stringify(draft) !== baseline;
  const checks = useMemo(() => draft ? validateCalendarDraft(draft) : [], [draft]);
  const days = useMemo(() => draft ? consolidateCalendarDays(draft.source, draft.dayReviews) : [], [draft]);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  useEffect(() => { setLimit(30); }, [search, pendingOnly, section]);
  function accept(next: CalendarAdminState) { setState(next); setDraft(next.draft); setBaseline(JSON.stringify(next.draft)); }
  async function request(url: string, init?: RequestInit) {
    const response = await apiFetch(url, init);
    const body = await response.json();
    if (!response.ok) throw new Error([body.error || 'Não foi possível completar a operação.', ...(body.issues || []).filter((issue: CalendarValidationIssue) => issue.severity === 'error').slice(0, 5).map((issue: CalendarValidationIssue) => `${issue.path}: ${issue.message}`)].join(' '));
    return body;
  }
  useEffect(() => {
    let cancelled = false;
    request('/api/admin/calendar').then(next => { if (!cancelled) accept(next); }).catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  async function reload() {
    if (dirty && !window.confirm('Descartar as alterações locais e carregar o rascunho salvo?')) return;
    setBusy(true); setError('');
    try { accept(await request('/api/admin/calendar')); setPreview(null); setNotice('Rascunho recarregado.'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('O JSON deve ter até 5 MB.'); return; }
    setBusy(true); setError(''); setNotice(''); setPreview(null);
    try {
      const data = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
      setPreview(await request('/api/admin/calendar/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, sourceUrl: draft?.sourceUrl || '' }) }));
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function save(publish = false) {
    if (!draft || !state) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const next = await request(`/api/admin/calendar/${publish ? 'publish' : 'draft'}`, { method: publish ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(publish ? { revision: state.revision } : { draft, revision: state.revision }) });
      accept(next); setNotice(publish ? 'Calendário publicado. A página pública já pode consultar esta versão.' : 'Rascunho salvo. A publicação pública continua como estava.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function exportDraft() {
    if (!draft) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'calendario-ufape-rascunho.json'; link.click(); URL.revokeObjectURL(url);
  }
  function reviewEvent(event: CalendarEvent, note: string) {
    setDraft(current => {
      if (!current) return current;
      const eventReviews = { ...current.eventReviews }; const issueReviews = { ...current.issueReviews };
      if (note) eventReviews[event.id] = note; else delete eventReviews[event.id];
      current.source.problemas.forEach((issue, i) => { if (issue.eventoId === event.id) { if (note) issueReviews[String(i)] = note; else delete issueReviews[String(i)]; } });
      const exists = current.events.some(e => e.id === event.id);
      return { ...current, eventReviews, issueReviews, events: exists ? current.events.map(e => e.id === event.id ? event : e) : [...current.events, event] };
    });
    setEditing(null);
  }
  const eventPending = (event: CalendarEvent) => !!draft && ((!draft.eventReviews[event.id] && event.precisaRevisao)
    || draft.source.problemas.some((issue, i) => issue.eventoId === event.id && !draft.issueReviews[String(i)]));
  const visibleEvents = draft?.events.filter(event => (!pendingOnly || eventPending(event)) && `${event.titulo} ${event.descricaoOriginal} ${event.inicio}`.toLowerCase().includes(search.toLowerCase())) || [];
  const visibleDays = days.filter(day => (!pendingOnly || day.needsReview) && `${day.date} ${day.classifications.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  const visibleIssues = draft?.source.problemas.map((issue, index) => ({ issue, index })).filter(({ issue, index }) => (!pendingOnly || !draft.issueReviews[String(index)]) && issue.descricao.toLowerCase().includes(search.toLowerCase())) || [];
  const publishErrors = draft ? validateCalendarDraft(draft, true).some(issue => issue.severity === 'error') : true;
  const sourceUrl = safeCalendarUrl(draft?.sourceUrl, true);
  return <div className="space-y-6">
    <div className="flex flex-wrap gap-3 items-center justify-between">
      <p role="status" className="text-sm text-slate-500">{loading ? 'Carregando calendário…' : busy ? 'Aguarde…' : dirty ? 'Alterações locais não salvas' : state?.publishedAt ? 'Há um calendário publicado' : 'Nenhum calendário publicado'}</p>
      <div className="flex flex-wrap gap-2"><button disabled={busy || loading} className="admin-secondary" onClick={() => void reload()}>Recarregar</button>
        <button disabled={busy || !draft} className="admin-secondary inline-flex gap-2 items-center" onClick={exportDraft}><Download size={16} />Exportar rascunho</button>
        <button disabled={busy || !draft || !dirty || checks.some(issue => issue.severity === 'error')} className="admin-secondary inline-flex gap-2 items-center" onClick={() => void save()}><Save size={16} />Salvar rascunho</button>
        <button disabled={busy || !draft || dirty || publishErrors} className="admin-primary" onClick={() => void save(true)}>Publicar calendário</button></div>
    </div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm text-emerald-800 dark:text-emerald-300">{notice}</p>}
    <fieldset disabled={busy || loading} className="space-y-6 min-w-0 disabled:opacity-70">
    <section className="admin-panel"><h2 className="font-semibold mb-2">Importar calendário</h2><p className="text-sm text-slate-500 mb-4">Selecione a extração em JSON ou um backup de rascunho. Confira a prévia antes de substituir o rascunho; a publicação é uma ação separada.</p>
      <label className="admin-secondary inline-flex gap-2 items-center cursor-pointer"><Upload size={16} />Selecionar JSON<input aria-label="Importar JSON do calendário" type="file" accept=".json,application/json" className="sr-only" disabled={busy || loading || !state} onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} /></label>
      {busy && <Loader2 className="inline ml-3 animate-spin" size={18} />}
      {preview && <div className="mt-5 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4 space-y-3"><h3 className="font-semibold">Prévia da importação</h3>
        <p className="text-sm">{preview.summary.events} eventos · {preview.summary.days} datas · {preview.summary.problems} problemas registrados · {preview.summary.pendingEvents} eventos a conferir.</p>
        <p className="text-sm text-slate-500">Comparação por ID com a publicação: {preview.summary.added} novos, {preview.summary.changed} alterados, {preview.summary.removed} removidos.</p>
        <p className="text-sm text-slate-500">Páginas analisadas: {preview.draft.source.cobertura.paginasAnalisadas.length} / {preview.draft.source.documento.totalPaginas || 'não informado'}.</p>
        {preview.issues.map((issue, i) => <p key={i} className="text-sm text-amber-700">{issue.path}: {issue.message}</p>)}
        <div className="flex gap-3"><button className="admin-primary" onClick={() => { if (dirty && !window.confirm('Substituir todas as alterações locais por esta importação?')) return; setDraft(preview.draft); setPreview(null); setNotice('Importação aplicada ao rascunho local. Confira, salve e publique quando estiver pronto.'); }}>Substituir rascunho pela importação</button><button className="admin-secondary" onClick={() => setPreview(null)}>Cancelar</button></div>
      </div>}
    </section>
    {draft && <>
      <section className="admin-panel space-y-4"><h2 className="font-semibold">Fonte e publicação</h2><p className="text-sm">{draft.source.documento.titulo}</p>
        <label className="block text-sm font-medium">URL HTTPS do PDF oficial<input type="url" className="admin-input mt-2" placeholder="https://ufape.edu.br/...pdf" value={draft.sourceUrl} onChange={e => setDraft({ ...draft, sourceUrl: e.target.value })} /></label>
        {sourceUrl && <a className="inline-flex gap-2 items-center text-sm text-indigo-600 dark:text-indigo-300 underline" href={sourceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />Abrir documento original</a>}
        <p className="text-xs text-slate-500">Salvar mantém um rascunho privado. Publicar permite consultar os eventos com os avisos de revisão ainda pendentes.</p>
        {checks.filter(issue => issue.severity === 'error').slice(0, 8).map((issue, i) => <p key={i} className="text-sm text-rose-600">{issue.path}: {issue.message}</p>)}
      </section>
      <section className="admin-panel space-y-4">
        <div className="flex flex-wrap gap-2">{([['events', 'Eventos'], ['issues', 'Pendências'], ['days', 'Marcações dos dias']] as const).map(([key, label]) => <button key={key} aria-pressed={section === key} className={section === key ? 'admin-primary' : 'admin-secondary'} onClick={() => setSection(key)}>{label}</button>)}</div>
        <div className="flex flex-wrap gap-3 items-center"><input aria-label="Buscar no calendário administrativo" placeholder="Buscar…" className="admin-input flex-1 min-w-44" value={search} onChange={e => setSearch(e.target.value)} /><label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={pendingOnly} onChange={e => setPendingOnly(e.target.checked)} />Somente pendentes</label>
          {section === 'events' && <button className="admin-secondary inline-flex items-center gap-2" onClick={() => setEditing({ id: `manual-${crypto.randomUUID()}`, titulo: '', descricaoOriginal: '', dataOriginal: '', inicio: null, fimInclusivo: null, diaInteiro: true, horarioOriginal: null, semestres: [], categoria: 'outro', publico: [], links: [], origens: [], precisaRevisao: false, motivosRevisao: [] })}><Plus size={16} />Novo evento</button>}</div>
        {section === 'events' && <div className="space-y-3">{visibleEvents.slice(0, limit).map(event => <div key={event.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap items-start gap-3"><div className="flex-1 min-w-40"><p className="text-xs text-slate-500">{calendarRange(event)} · {event.semestres.join(' / ')}</p><p className="font-medium mt-1">{event.titulo}</p>{eventPending(event) && <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Informação a conferir</p>}{draft.eventReviews[event.id] && <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">Revisado: {draft.eventReviews[event.id]}</p>}</div><button className="admin-secondary" onClick={() => setEditing(event)}>Editar / revisar</button><button className="text-sm text-rose-600 p-2" onClick={() => { if (window.confirm(`Excluir “${event.titulo}” do rascunho?`)) setDraft({ ...draft, events: draft.events.filter(e => e.id !== event.id) }); }}>Excluir</button></div>)}</div>}
        {section === 'issues' && visibleIssues.slice(0, limit).map(({ issue, index }) => <div key={index} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-sm"><p className="text-xs text-slate-500 mb-2">{issue.tipo} · {issue.pagina ? `página ${issue.pagina}` : 'página não informada'} · {draft.issueReviews[String(index)] ? 'Revisado' : 'Pendente'}</p><p>{issue.descricao}</p>
          {sourceUrl && <a href={calendarSourcePage(sourceUrl, issue.pagina || undefined)} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-300 underline inline-block mt-2">Conferir no PDF</a>}
          <ReviewDecision label={`Justificativa do problema ${index + 1}`} note={draft.issueReviews[String(index)] || ''} onChange={note => setDraft(current => { if (!current) return current; const issueReviews = { ...current.issueReviews }; if (note) issueReviews[String(index)] = note; else delete issueReviews[String(index)]; return { ...current, issueReviews }; })} />
        </div>)}
        {section === 'days' && visibleDays.slice(0, limit).map(day => <div key={day.date} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-sm"><p className="font-medium">{day.date} · {day.needsReview ? 'Informação a conferir' : day.classification}</p><p className="text-slate-500 mt-1">Marcações originais: {day.classifications.join(' / ')} · páginas {day.pages.join(', ')}</p>
          {sourceUrl && <div className="flex flex-wrap gap-3 mt-2">{day.pages.map(page => <a key={page} href={calendarSourcePage(sourceUrl, page)} target="_blank" rel="noopener noreferrer" className="underline text-indigo-600 dark:text-indigo-300">Conferir página {page}</a>)}</div>}
          <DayReview date={day.date} classification={draft.dayReviews[day.date]?.classification || day.classification || ''} note={draft.dayReviews[day.date]?.note || ''} onChange={review => setDraft(current => { if (!current) return current; const dayReviews = { ...current.dayReviews }; if (review) dayReviews[day.date] = review; else delete dayReviews[day.date]; return { ...current, dayReviews }; })} />
        </div>)}
        {(section === 'events' ? visibleEvents.length : section === 'issues' ? visibleIssues.length : visibleDays.length) === 0 && <p className="text-sm text-slate-500 py-4">Nenhum resultado para estes filtros.</p>}
        {(section === 'events' ? visibleEvents.length : section === 'issues' ? visibleIssues.length : visibleDays.length) > limit && <button className="admin-secondary w-full" onClick={() => setLimit(n => n + 30)}>Mostrar mais</button>}
      </section>
      {editing && <CalendarEventEditor sourceUrl={draft.sourceUrl} event={editing} review={draft.eventReviews[editing.id] || ''} onSave={reviewEvent} onClose={() => setEditing(null)} />}
    </>}
    </fieldset>
  </div>;
}

function DayReview({ date, classification, note, onChange }: { date: string; classification: string; note: string;
  onChange: (review: { classification: string; note: string } | null) => void }) {
  const [chosen, setChosen] = useState(classification);
  useEffect(() => setChosen(classification), [classification]);
  return <div className="mt-3"><label className="block text-xs">Classificação após conferência<select aria-label={`Classificação de ${date}`} className="admin-input mt-1" value={chosen} onChange={e => setChosen(e.target.value)}><option value="">Escolha após conferir</option>{DAY_CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}</select></label>
    {chosen && <ReviewDecision label={`Justificativa de ${date}`} note={note} onChange={value => onChange(value ? { classification: chosen, note: value } : null)} />}</div>;
}
