import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleHelp, Database, Download, FileJson, History, LoaderCircle, Play, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../utils/api';

type InventoryItem = {
  key: string; courseId: string; courseName: string; kind: 'course' | 'curriculum' | 'contents' | 'schedule';
  semester?: string; sourceFile: string; checksum: string; records: number; status: string;
};
type MissingSource = { courseId: string; courseName: string; kind: string; semester?: string; expectedFile: string };
type PreviewItem = InventoryItem & {
  status: 'new' | 'identical' | 'different' | 'invalid'; destinationRecords: number; selected: boolean;
  destinationChecksum: string;
  overwrite: boolean; canImport: boolean; problems: string[]; warnings: string[];
  changes: Array<{ path: string; before: string; after: string }>;
};
type Inventory = { sourceDirectory: string; destinationConfigured: boolean; items: InventoryItem[]; missing: MissingSource[]; ignoredFiles: string[] };
type Preview = { ready: boolean; fingerprint: string; items: PreviewItem[]; missing: MissingSource[]; errors: string[]; selectedCourseIds: string[] };
type Run = { id: string; status: string; created_at: string; completed_at?: string | null; summary?: any };

const kindLabels: Record<InventoryItem['kind'], string> = {
  course: 'Metadados do curso', curriculum: 'Currículo', contents: 'Conteúdos programáticos', schedule: 'Oferta semestral'
};
const statusLabels: Record<PreviewItem['status'], string> = {
  new: 'Novo no destino', identical: 'Idêntico', different: 'Destino diferente', invalid: 'Inválido'
};

async function responseData(response: Response): Promise<any> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'A solicitação falhou.'), { data });
  return data;
}

export function DataMigration() {
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [overwriteKeys, setOverwriteKeys] = useState<string[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [activeRun, setActiveRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; course?: string } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { void analyze(); }, []);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, InventoryItem[]>();
    for (const item of inventory?.items || []) {
      const current = groups.get(item.courseId) || [];
      current.push(item);
      groups.set(item.courseId, current);
    }
    return Array.from(groups.entries());
  }, [inventory]);

  async function analyze() {
    setBusy(true); setError(''); setNotice(''); setPreview(null);
    try {
      const result = await responseData(await apiFetch('/api/admin/migrations/inventory')) as Inventory;
      setInventory(result);
      setSelectedKeys(current => current.filter(key => result.items.some(item => item.key === key)));
      setOverwriteKeys([]);
      setNotice(`${result.items.length} conjuntos encontrados.`);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  function toggleSelection(key: string) {
    const removing = selectedKeys.includes(key);
    setSelectedKeys(current => removing ? current.filter(item => item !== key) : [...current, key]);
    if (removing) setOverwriteKeys(current => current.filter(item => item !== key));
    setPreview(null);
  }

  function toggleOverwrite(key: string) {
    setOverwriteKeys(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
    setPreview(null);
  }

  function selectCourse(courseId: string) {
    const keys = inventory?.items.filter(item => item.courseId === courseId).map(item => item.key) || [];
    setSelectedKeys(current => Array.from(new Set([...current, ...keys])));
    setPreview(null);
  }

  async function validateSelection() {
    setBusy(true); setError(''); setNotice(''); setPreview(null);
    try {
      const result = await responseData(await apiFetch('/api/admin/migrations/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedKeys, overwriteKeys })
      })) as Preview;
      setPreview(result);
      setSelectedKeys(result.items.map(item => item.key));
      if (result.ready) setNotice('A seleção está pronta para migrar.');
      else setError(result.errors[0] || 'Resolva os itens inválidos e confirme as substituições antes de migrar.');
    } catch (cause) {
      const errorData = (cause as any).data;
      if (errorData?.code === 'STALE_PREVIEW') {
        setOverwriteKeys([]);
        setPreview(current => current && ({ ...current, ready: false, items: current.items.map(item => ({
          ...item, overwrite: false, canImport: item.status === 'new' || item.status === 'identical'
        })) }));
        setError('Os arquivos ou o destino mudaram desde a prévia. Revise novamente antes de migrar.');
        return;
      }
      if (errorData?.preview) setPreview(errorData.preview);
      setError((cause as Error).message);
    } finally { setBusy(false); }
  }

  async function loadHistory() {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await responseData(await apiFetch('/api/admin/migrations/runs'));
      setRuns(result.runs || []);
      setNotice(`${result.runs?.length || 0} execuções no histórico.`);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function executeMigration() {
    if (!preview?.ready) return;
    setBusy(true); setError(''); setNotice(''); setProgress({ done: 0, total: preview.selectedCourseIds.length });
    try {
      const created = await responseData(await apiFetch('/api/admin/migrations/runs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedKeys, overwriteKeys, fingerprint: preview.fingerprint })
      }));
      const run: Run = { id: created.id, status: 'running', created_at: new Date().toISOString() };
      setActiveRun(run);
      const failures: string[] = [];
      for (let index = 0; index < preview.selectedCourseIds.length; index++) {
        const courseId = preview.selectedCourseIds[index];
        setProgress({ done: index, total: preview.selectedCourseIds.length, course: courseId });
        try {
          await responseData(await apiFetch(`/api/admin/migrations/runs/${run.id}/courses/${encodeURIComponent(courseId)}`, { method: 'POST' }));
        } catch (cause) { failures.push(`${courseId}: ${(cause as Error).message}`); }
        setProgress({ done: index + 1, total: preview.selectedCourseIds.length, course: courseId });
      }
      const latest = await responseData(await apiFetch(`/api/admin/migrations/runs/${run.id}`));
      setActiveRun(latest.run);
      setRuns(current => [latest.run, ...current.filter(item => item.id !== latest.run.id)]);
      setPreview(null);
      if (failures.length) setError(`A execução foi registrada. Revise os cursos com falha: ${failures.join(' · ')}`);
      else setNotice('Migração concluída. Confira o relatório antes de ativar o Supabase como fonte do site.');
    } catch (cause) {
      const errorData = (cause as any).data;
      if (errorData?.code === 'STALE_PREVIEW') {
        setProgress(null);
        setOverwriteKeys([]);
        setPreview(current => current && ({ ...current, ready: false, items: current.items.map(item => ({
          ...item, overwrite: false, canImport: item.status === 'new' || item.status === 'identical'
        })) }));
        setError('Os arquivos ou o destino mudaram desde a prévia. Revise novamente antes de migrar.');
      } else setError((cause as Error).message);
    }
    finally { setBusy(false); }
  }

  async function downloadReport(runId: string) {
    setBusy(true); setError('');
    try {
      const response = await apiFetch(`/api/admin/migrations/runs/${runId}/report`);
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Não foi possível baixar o relatório.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `my-ufape-migration-${runId}.json`; link.click();
      URL.revokeObjectURL(url);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  return <section className="space-y-6">
    <div className="admin-panel flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <Database className="mt-1 text-indigo-600 dark:text-indigo-400" />
        <div><h2 className="font-semibold">Origem e destino</h2><p className="mt-1 text-sm text-slate-500">Origem: {inventory?.sourceDirectory || 'servidor do app'} · Destino: Supabase</p><p className="mt-1 text-xs text-slate-500">Faça primeiro o piloto do BCC, confira o relatório e depois migre os demais cursos.</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="admin-secondary flex items-center gap-2" onClick={() => void analyze()} disabled={busy}><RefreshCw size={16} />Analisar arquivos</button>
        <button className="admin-secondary flex items-center gap-2" onClick={() => void loadHistory()} disabled={busy || !inventory?.destinationConfigured}><History size={16} />Consultar histórico</button>
      </div>
    </div>

    {inventory && !inventory.destinationConfigured && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">O destino Supabase ainda não está configurado no servidor. Preencha as variáveis de ambiente e reinicie o app para validar ou migrar.</div>}
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</div>}

    {inventory && <>
      {inventory.missing.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/20">
        <h3 className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200"><AlertTriangle size={17} />Arquivos esperados ausentes ({inventory.missing.length})</h3>
        <ul className="mt-3 space-y-1 text-sm text-amber-900 dark:text-amber-100">{inventory.missing.map(item => <li key={`${item.courseId}:${item.kind}:${item.semester || ''}`}>{item.courseName} · {item.kind === 'schedule' ? `oferta ${item.semester}` : 'currículo'} · <code>{item.expectedFile}</code></li>)}</ul>
      </div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Seleção e prévia</h2><p className="text-sm text-slate-500">Marque os conjuntos; o registro do curso será incluído como dependência.</p></div>
        <button className="admin-secondary text-sm" disabled={busy} onClick={() => { setSelectedKeys([]); setOverwriteKeys([]); setPreview(null); }}>Limpar seleção</button>
      </div>

      {groupedItems.map(([courseId, items]) => <div key={courseId} className="admin-panel space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{items[0]?.courseName}</h3><button onClick={() => selectCourse(courseId)} className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400" disabled={busy}>Selecionar curso completo</button></div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map(item => {
            const row = preview?.items.find(candidate => candidate.key === item.key);
            const checked = selectedKeys.includes(item.key);
            return <div key={item.key} className="py-3">
              <div className="flex flex-wrap items-center gap-3">
                <input aria-label={`Selecionar ${kindLabels[item.kind]} ${item.semester || ''}`} type="checkbox" checked={checked} disabled={busy} onChange={() => toggleSelection(item.key)} className="h-4 w-4 accent-indigo-600" />
                <FileJson size={17} className="text-slate-400" />
                <span className="min-w-48 flex-1 text-sm font-medium">{kindLabels[item.kind]}{item.semester ? ` · ${item.semester}` : ''}</span>
                <span className="text-xs text-slate-500">{item.records} registros</span>
                {row && <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.status === 'different' ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : row.status === 'invalid' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' : row.status === 'identical' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'}`}>{statusLabels[row.status]}</span>}
                {item.status === 'invalid' && <span className="text-xs text-red-700 dark:text-red-300">JSON inválido</span>}
              </div>
              <p className="ml-10 mt-1 truncate text-xs text-slate-500" title={item.sourceFile}>{item.sourceFile}</p>
              {row && row.status === 'different' && <div className="ml-10 mt-2 space-y-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20">
                <p className="text-xs font-semibold">Destino: {row.destinationRecords} registros · Origem: {row.records} registros</p>
                {row.changes.length > 0 && <ul className="space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">{row.changes.map(change => <li key={change.path} className="break-all">{change.path}: <span className="text-red-700 dark:text-red-300">{change.before}</span> → <span className="text-emerald-700 dark:text-emerald-300">{change.after}</span></li>)}</ul>}
                <label className="flex items-center gap-2 text-xs font-semibold text-amber-950 dark:text-amber-100"><input type="checkbox" checked={overwriteKeys.includes(item.key)} disabled={busy} onChange={() => toggleOverwrite(item.key)} />Confirmo substituir este conjunto no destino</label>
              </div>}
              {row?.problems.map(problem => <p key={problem} className="ml-10 mt-2 text-xs text-red-700 dark:text-red-300">{problem}</p>)}
              {row?.warnings.map((warning, index) => <p key={`${index}:${warning}`} className="ml-10 mt-2 flex gap-1 text-xs text-amber-800 dark:text-amber-200"><CircleHelp size={14} className="shrink-0" />{warning}</p>)}
            </div>;
          })}
        </div>
      </div>)}

      {inventory.ignoredFiles.length > 0 && <details className="text-sm text-slate-500"><summary className="cursor-pointer">Arquivos fora do inventário ({inventory.ignoredFiles.length})</summary><ul className="mt-2 list-disc pl-5">{inventory.ignoredFiles.map(file => <li key={file}>{file}</li>)}</ul></details>}

      <div className="flex flex-wrap gap-3">
        <button onClick={() => void validateSelection()} disabled={busy || !inventory.destinationConfigured || selectedKeys.length === 0} className="admin-secondary flex items-center gap-2"><CheckCircle2 size={16} />Validar seleção</button>
        <button onClick={() => void executeMigration()} disabled={busy || !preview?.ready} className="admin-primary flex items-center gap-2"><Play size={16} />Migrar selecionados</button>
      </div>
    </>}

    {preview && <div className="text-xs text-slate-500">{preview.items.filter(item => item.status === 'new').length} novos · {preview.items.filter(item => item.status === 'identical').length} idênticos · {preview.items.filter(item => item.status === 'different').length} diferentes · {preview.items.filter(item => item.status === 'invalid').length} inválidos</div>}

    {progress && <div className="admin-panel" role="status"><div className="flex items-center gap-2 font-semibold"><LoaderCircle size={17} className={busy ? 'animate-spin' : ''} />{busy ? `Importando ${progress.course || 'curso'}…` : 'Execução finalizada'}</div><p className="mt-2 text-sm text-slate-500">{progress.done} de {progress.total} cursos processados</p><progress className="mt-3 h-2 w-full accent-indigo-600" value={progress.done} max={Math.max(1, progress.total)} /></div>}

    {activeRun && <div className="admin-panel flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Última execução · {activeRun.status}</h3><p className="mt-1 text-xs text-slate-500">{activeRun.id}</p></div><button className="admin-secondary flex items-center gap-2" disabled={busy} onClick={() => void downloadReport(activeRun.id)}><Download size={16} />Baixar relatório JSON</button></div>}

    {runs.length > 0 && <div className="admin-panel space-y-3"><h3 className="font-semibold">Histórico de migrações</h3>{runs.map(run => <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800"><div><p className="text-sm font-medium">{run.status}</p><p className="text-xs text-slate-500">{new Date(run.created_at).toLocaleString()} · {run.id}</p></div><button className="admin-secondary flex items-center gap-2" disabled={busy} onClick={() => void downloadReport(run.id)}><Download size={15} />Relatório</button></div>)}</div>}
  </section>;
}
