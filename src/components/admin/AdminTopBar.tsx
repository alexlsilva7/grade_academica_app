import { Download, Save } from 'lucide-react';

export function AdminTopBar({ title, description, context, saveLabel, dirty, busy, onExportJsonFile, onSaveToProject }: {
  title: string; description: string; context: string; saveLabel: string; dirty: boolean; busy: boolean;
  onExportJsonFile?: () => void; onSaveToProject?: () => void;
}) {
  return <header className="shrink-0 flex items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-5">
    <div><p className="text-xs text-slate-500 mb-1">{context}</p><h1 id="admin-section-title" tabIndex={-1} className="font-bold text-xl outline-none">{title}</h1><p className="text-sm text-slate-500 mt-1">{description}</p></div>
    <div className="flex items-center gap-3 shrink-0"><span role="status" className={`text-xs ${dirty ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500'}`}>{busy ? 'Aguarde…' : dirty ? 'Alterações pendentes' : 'Sem alterações pendentes'}</span>
      {onExportJsonFile && <button disabled={busy} onClick={onExportJsonFile} title="Exportar rascunho em JSON" aria-label="Exportar rascunho em JSON" className="p-2 rounded-lg border border-slate-200 dark:border-slate-700"><Download size={18} /></button>}
      {onSaveToProject && <button disabled={busy} onClick={onSaveToProject} className="admin-primary flex items-center gap-2"><Save size={16} />{saveLabel}</button>}
    </div>
  </header>;
}
