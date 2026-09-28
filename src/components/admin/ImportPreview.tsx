import { importDifferences, ImportChange } from '../../utils/adminImportDiff';

export function ImportPreview({ changes, replacing, destination, onApply, onCancel }: { changes: ImportChange[]; replacing: boolean; destination: string; onApply: () => void; onCancel: () => void }) {
  const differences = importDifferences(changes);
  return <section className="admin-panel space-y-4 border-indigo-300 dark:border-indigo-700" aria-label="Comparação da importação">
    <h2 className="font-semibold">Revisar {replacing ? 'substituição' : 'mesclagem'} · {destination}</h2>
    <p className="text-sm text-slate-500">{differences.filter(item => item.kind === 'Inclusão').length} inclusões · {differences.filter(item => item.kind === 'Alteração').length} alterações · {differences.filter(item => item.kind === 'Remoção').length} remoções. Confira especialmente os campos alterados: eles podem substituir valores já cadastrados.</p>
    <div className="max-h-96 overflow-auto divide-y divide-slate-200 dark:divide-slate-700">{differences.map((item, index) => <details key={index} className="py-3"><summary className="cursor-pointer text-sm"><strong className={item.kind === 'Remoção' ? 'text-rose-600' : 'text-indigo-600 dark:text-indigo-300'}>{item.kind}</strong> · {item.label}</summary><div className="grid grid-cols-2 gap-4 mt-3 text-xs"><div><p className="font-semibold mb-2">Antes</p><pre className="whitespace-pre-wrap break-all bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">{JSON.stringify(item.before, null, 2) || 'Ausente'}</pre></div><div><p className="font-semibold mb-2">Depois</p><pre className="whitespace-pre-wrap break-all bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">{JSON.stringify(item.after, null, 2) || 'Removido'}</pre></div></div></details>)}</div>
    <div className="flex items-center justify-between"><p className="text-xs text-slate-500">Aplicar altera apenas o rascunho. O salvamento é uma ação separada.</p><div className="flex gap-4 text-sm"><button onClick={onCancel}>Cancelar prévia</button><button className="admin-primary" onClick={onApply}>Aplicar ao rascunho</button></div></div>
  </section>;
}
