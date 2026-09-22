import { useEffect, useRef, useState } from 'react';
import { Activity, AlertCircle, ArrowRight, Check, ChevronDown, Clock3, Download, FileJson, Loader2, PauseCircle, RotateCcw, Square, Terminal } from 'lucide-react';
import { durationLabel, extractionSteps, type ExtractionActivity } from '../utils/extractionActivity';

export function ExtractionMonitor({ activity, connectionError, lastSync, canCancel, onCancel, onRetry, onViewResult }: {
  activity: ExtractionActivity; connectionError: string | null; lastSync?: string; canCancel: boolean;
  onCancel: () => void; onRetry?: () => void; onViewResult: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [logsOpen, setLogsOpen] = useState(true);
  const [filter, setFilter] = useState<'all' | 'attention'>('all');
  const [follow, setFollow] = useState(true);
  const logArea = useRef<HTMLDivElement>(null);
  const running = activity.status === 'running';
  const complete = activity.status === 'complete';
  const failed = activity.status === 'failed';
  const stopped = ['cancelled', 'interrupted'].includes(activity.status);
  const stageIndex = complete ? extractionSteps.length : Math.max(0, extractionSteps.findIndex(step => step.id === activity.stage));
  const lastEvent = activity.events.at(-1);
  const elapsed = Math.max(0, (activity.finishedAt ? Date.parse(activity.finishedAt) : running ? now : Date.parse(activity.updatedAt)) - Date.parse(activity.startedAt));
  const attentionCount = activity.events.filter(event => event.level !== 'info').length;
  const events = activity.events.filter(event => filter === 'all' || event.level !== 'info');
  const title = complete ? 'Seu JSON está pronto' : failed ? 'Não foi possível concluir' : stopped ? 'Extração interrompida' : 'Acompanhamento da extração';
  const statusLabel = complete ? 'Concluída' : failed ? 'Falhou' : stopped ? 'Interrompida' : running ? 'Em andamento' : 'Documento recebido';
  const tint = failed ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300' : complete ?
    'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300' : 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300';
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running, activity.startedAt]);
  useEffect(() => {
    if (follow && logArea.current) logArea.current.scrollTop = logArea.current.scrollHeight;
  }, [activity.events.length, lastEvent?.id, logsOpen, follow, filter]);

  const downloadLogs = () => {
    const text = activity.events.map(event => `${event.at} [${event.level.toUpperCase()}] [${event.stage}] ${event.message}${event.model ? ' · ' + event.model : ''}${event.attempt ? ' · tentativa ' + event.attempt : ''}`).join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `extracao-${activity.startedAt.replace(/[:.]/g, '-')}.log`;
    link.click(); URL.revokeObjectURL(url);
  };

  return <section aria-label="Acompanhamento da extração" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <div className="p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className={`rounded-xl p-3 ${tint}`}>
            {complete ? <FileJson className="h-6 w-6" /> : failed ? <AlertCircle className="h-6 w-6" /> : stopped ? <PauseCircle className="h-6 w-6" /> : <Activity className="h-6 w-6" />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900 dark:text-white">{title}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tint}`}>{statusLabel}</span></div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Uma extração com IA, do documento ao JSON. Acompanhe cada fase do processamento.</p>
          </div>
        </div>
        {canCancel && <button type="button" onClick={onCancel} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:border-rose-300 hover:text-rose-600 dark:border-slate-700"><Square className="h-3 w-3" />Cancelar</button>}
      </div>

      <ol aria-label="Etapas do processamento" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {extractionSteps.map((step, index) => {
          const done = index < stageIndex;
          const current = index === stageIndex;
          return <li key={step.id} aria-current={current ? 'step' : undefined} className={`rounded-xl border p-3 ${current ? 'border-indigo-300 bg-indigo-50/70 dark:border-indigo-700 dark:bg-indigo-950/30' : done ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/10' : 'border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40'}`}>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? 'bg-emerald-600 text-white' : current ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : current && running ? <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" /> : index + 1}
              </span><span>{step.label}</span>
            </div><p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{step.description}</p>
          </li>;
        })}
      </ol>

      <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
        <p role="status" aria-live="polite" className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100">
          {activity.status === 'interrupted' ? 'A execução anterior foi interrompida. Retome usando o documento salvo.' : lastEvent?.message || 'Preparando a extração…'}
        </p>
        {running && activity.stage === 'extraction' && <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">O modelo retorna o JSON ao terminar. A duração varia com o documento; o provedor não informa um percentual de conclusão.</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 tabular-nums"><Clock3 className="h-3.5 w-3.5" />{durationLabel(elapsed)}</span>
          {activity.model && <span className="break-all">{activity.model}</span>}
          {activity.sourceCount != null && <span>{activity.sourceCount} fonte(s)</span>}
          {!!activity.pageCount && <span>{activity.pageCount} página(s)</span>}
          {!!activity.attempt && <span>Tentativa {activity.attempt}/4</span>}
        </div>
      </div>

      {connectionError && <div role="status" className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"><AlertCircle className="h-4 w-4 shrink-0" /><span>{connectionError}{lastSync && ` Última conexão: ${new Date(lastSync).toLocaleTimeString('pt-BR')}.`}</span></div>}

      {complete && <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-900 dark:text-white">{activity.recordCount ?? '—'} registros</strong> extraídos · <strong>{activity.issueCount ?? 0} pendências</strong> para conferir</p>
        <button type="button" onClick={onViewResult} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500">Ver resultado JSON<ArrowRight className="h-4 w-4" /></button>
      </div>}
      {(failed || stopped || activity.status === 'ready') && onRetry && <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{activity.stage === 'upload' ? 'Confira os arquivos e a conexão antes de tentar novamente.' : 'Retome com os documentos que já foram enviados.'}</p>
        <button type="button" onClick={onRetry} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"><RotateCcw className="h-4 w-4" />{activity.stage === 'upload' ? 'Tentar novamente' : 'Retomar extração'}</button>
      </div>}
    </div>

    <div className="border-t border-slate-200 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-5 py-3 dark:bg-slate-800/40">
        <button type="button" aria-expanded={logsOpen} onClick={() => setLogsOpen(!logsOpen)} className="flex items-center gap-2 text-xs font-semibold"><Terminal className="h-4 w-4 text-slate-500" />Logs da extração<span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] dark:bg-slate-700">{activity.events.length}</span><ChevronDown className={`h-3.5 w-3.5 transition-transform ${logsOpen ? 'rotate-180' : ''}`} /></button>
        <button type="button" onClick={downloadLogs} disabled={!activity.events.length} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 disabled:opacity-40"><Download className="h-3.5 w-3.5" />Baixar logs</button>
      </div>
      {logsOpen && <div className="bg-slate-950 text-slate-300">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-2.5 text-[11px]">
          <div className="flex gap-1" role="group" aria-label="Filtrar logs">
            <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')} className={`rounded px-2 py-1 ${filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>Todos</button>
            <button type="button" aria-pressed={filter === 'attention'} onClick={() => setFilter('attention')} className={`rounded px-2 py-1 ${filter === 'attention' ? 'bg-slate-800 text-amber-300' : 'text-slate-400'}`}>Avisos e erros ({attentionCount})</button>
          </div>
          <label className="flex items-center gap-2 text-slate-400"><input type="checkbox" checked={follow} onChange={event => setFollow(event.target.checked)} className="accent-indigo-500" />Acompanhar últimos eventos</label>
        </div>
        <div ref={logArea} tabIndex={0} aria-label="Histórico de eventos" className="max-h-64 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed focus-visible:outline-indigo-400">
          {!events.length && <p className="py-3 text-slate-500">{filter === 'attention' ? 'Nenhum aviso ou erro registrado.' : 'Aguardando o primeiro evento…'}</p>}
          {events.map(event => <div key={event.id} className="flex items-start gap-3 py-1.5">
            <time dateTime={event.at} className="shrink-0 text-slate-500">{new Date(event.at).toLocaleTimeString('pt-BR')}</time>
            <span className={`min-w-0 break-words ${event.level === 'error' ? 'text-rose-300' : event.level === 'warning' ? 'text-amber-300' : 'text-slate-300'}`}><span className="mr-2 text-[10px] font-bold opacity-70">{event.level === 'error' ? 'ERRO' : event.level === 'warning' ? 'AVISO' : 'INFO'}</span>{event.message}{event.durationMs != null && <span className="ml-2 text-slate-500">({durationLabel(event.durationMs)})</span>}</span>
          </div>)}
        </div>
        <p className="border-t border-slate-800 px-4 py-2 text-[10px] text-slate-500">Últimos 200 eventos. O conteúdo dos documentos não é incluído nos logs.</p>
      </div>}
    </div>
  </section>;
}
