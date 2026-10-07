import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES, type FeedbackRecord, type FeedbackStatus } from '../../utils/feedback';
import type { CourseMeta } from '../../types';

const formatDate = (date: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(date));
const metadataLabels: Record<string, string> = { view: 'Tela', course: 'Curso', semester: 'Semestre', profile: 'Perfil', device: 'Dispositivo', browser: 'Navegador', viewport: 'Tamanho da tela', theme: 'Tema', version: 'Versão' };

export function FeedbackInbox({ courses, onStateChange }: { courses: CourseMeta[]; onStateChange: (state: { dirty: boolean; saving: boolean }) => void }) {
  const [items, setItems] = useState<FeedbackRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [course, setCourse] = useState('');
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<FeedbackRecord | null>(null);
  const [status, setStatus] = useState<FeedbackStatus>('new');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dirty = !!selected && (status !== selected.status || notes !== selected.internal_notes);
  useEffect(() => { onStateChange({ dirty, saving }); }, [dirty, saving, onStateChange]);
  useEffect(() => () => onStateChange({ dirty: false, saving: false }), [onStateChange]);

  useEffect(() => {
    setStatus(selected?.status || 'new');
    setNotes(selected?.internal_notes || '');
  }, [selected]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const params = new URLSearchParams({ category, status: statusFilter, course, offset: String(offset) });
    void apiFetch(`/api/admin/feedback?${params}`, { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao carregar feedbacks.');
      if (controller.signal.aborted) return;
      setItems(data.items); setTotal(data.total);
      setSelected(current => data.items.find((item: FeedbackRecord) => item.id === current?.id) || null);
    }).catch(cause => { if (!controller.signal.aborted) setError((cause as Error).message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [category, statusFilter, course, offset, revision]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const change = (action: () => void) => {
    if (saving || (dirty && !window.confirm('Descartar as alterações não salvas deste feedback?'))) return;
    setNotice(''); action();
  };
  const filter = (setter: (value: string) => void, value: string) => change(() => { setSelected(null); setter(value); setOffset(0); });
  const save = async () => {
    if (!selected || saving) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await apiFetch(`/api/admin/feedback/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, internal_notes: notes }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao salvar.');
      setSelected(data.item); setStatus(data.item.status); setNotes(data.item.internal_notes);
      setNotice('Situação e notas salvas.'); setRevision(value => value + 1);
    } catch (cause) { setError((cause as Error).message); }
    finally { setSaving(false); }
  };

  return <section className="space-y-5" aria-label="Caixa de entrada de feedbacks">
    <p className="text-sm text-slate-500 dark:text-slate-400">Mensagens privadas de visitantes de todos os cursos. Nome e e-mail são opcionais; o contexto técnico é coletado automaticamente no envio.</p>
    <div className="admin-panel flex flex-wrap items-end gap-4">
      <label className="text-sm" htmlFor="feedback-filter-status">Situação<select id="feedback-filter-status" className="admin-input mt-1" disabled={saving || loading} value={statusFilter} onChange={event => filter(setStatusFilter, event.target.value)}><option value="">Todas</option>{Object.entries(FEEDBACK_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm" htmlFor="feedback-filter-category">Tipo<select id="feedback-filter-category" className="admin-input mt-1" disabled={saving || loading} value={category} onChange={event => filter(setCategory, event.target.value)}><option value="">Todos</option>{Object.entries(FEEDBACK_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm" htmlFor="feedback-filter-course">Curso<select id="feedback-filter-course" className="admin-input mt-1" disabled={saving || loading} value={course} onChange={event => filter(setCourse, event.target.value)}><option value="">Todos</option>{courses.map(item => <option key={item.id} value={item.id}>{item.shortName} · {item.name}</option>)}</select></label>
      <button type="button" disabled={saving || loading} onClick={() => change(() => setRevision(value => value + 1))} className="admin-secondary ml-auto flex items-center gap-2"><RefreshCw size={16} />Atualizar</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
    {loading ? <p role="status" className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Carregando feedbacks…</p> : <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="admin-panel space-y-3">
          <p className="text-sm font-semibold">{total} feedback{total === 1 ? '' : 's'} encontrado{total === 1 ? '' : 's'}</p>
          {items.length === 0 && <p className="py-5 text-sm text-slate-500">Nenhum feedback para estes filtros.</p>}
          {items.map(item => <button type="button" key={item.id} disabled={saving} aria-pressed={selected?.id === item.id} onClick={() => change(() => setSelected(item))}
            className={`block w-full rounded-xl border p-4 text-left transition-colors ${selected?.id === item.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
            <span className="flex flex-wrap justify-between gap-2 text-xs"><span className="font-semibold">{FEEDBACK_CATEGORIES[item.category]}</span><span className="text-indigo-600 dark:text-indigo-300">{FEEDBACK_STATUSES[item.status]}</span></span>
            <span className="mt-2 block line-clamp-2 break-words text-sm">{item.message}</span>
            <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">{formatDate(item.created_at)} · {item.name || 'Sem nome informado'}{item.metadata.course ? ` · ${item.metadata.course.toUpperCase()}` : ''}</span>
          </button>)}
          <div className="flex items-center justify-between gap-2 pt-2 text-xs">
            <button className="admin-secondary" disabled={saving || offset === 0} onClick={() => change(() => setOffset(value => Math.max(0, value - 25)))}>Anterior</button>
            <span>{total ? `${offset + 1}–${Math.min(offset + 25, total)} de ${total}` : '0 registros'}</span>
            <button className="admin-secondary" disabled={saving || offset + 25 >= total} onClick={() => change(() => setOffset(value => value + 25))}>Próxima</button>
          </div>
        </div>
        {selected ? <form className="admin-panel space-y-4 self-start" onSubmit={event => { event.preventDefault(); void save(); }}>
          <h2 className="font-semibold">Detalhes do feedback</h2>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{selected.message}</p>
          <dl className="space-y-1 text-sm"><div><dt className="inline font-medium">Nome: </dt><dd className="inline">{selected.name || 'Não informado'}</dd></div><div><dt className="inline font-medium">E-mail: </dt><dd className="inline break-all">{selected.email || 'Não informado'}</dd></div><div><dt className="inline font-medium">Recebido em: </dt><dd className="inline">{formatDate(selected.created_at)}</dd></div></dl>
          <details className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><summary className="cursor-pointer text-sm font-medium">Contexto técnico</summary>
            {Object.keys(selected.metadata).length ? <dl className="mt-3 space-y-1 break-words text-xs">{Object.entries(selected.metadata).map(([key, value]) => <div key={key}><dt className="inline font-medium">{metadataLabels[key] || key}: </dt><dd className="inline">{value}</dd></div>)}</dl> : <p className="mt-2 text-xs text-slate-500">Este registro antigo não contém contexto técnico.</p>}
          </details>
          <label className="block text-sm" htmlFor="feedback-edit-status">Situação<select id="feedback-edit-status" className="admin-input mt-1" disabled={saving} value={status} onChange={event => setStatus(event.target.value as FeedbackStatus)}>{Object.entries(FEEDBACK_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="block text-sm" htmlFor="feedback-notes">Notas internas<textarea id="feedback-notes" className="admin-input mt-1" disabled={saving} maxLength={5000} rows={4} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Registre sua análise ou próximos passos…" /></label>
          <p className="text-xs text-slate-500">As notas são privadas. Salvar não envia uma resposta por e-mail.</p>
          <button type="submit" disabled={saving || !dirty} className="admin-primary flex items-center gap-2">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? 'Salvando…' : 'Salvar feedback'}</button>
        </form> : <div className="admin-panel self-start text-sm text-slate-500">Selecione uma mensagem para consultar o contato, o contexto e as notas.</div>}
      </div>
    </>}
  </section>;
}
