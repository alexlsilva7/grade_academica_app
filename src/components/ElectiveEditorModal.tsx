import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { ElectiveCatalogItem, ElectiveSelection } from '../utils/matrixElectives';
import { electiveIdentity, normalizeMatrixText } from '../utils/matrixElectives';
import type { MatrixSubject } from '../utils/matrixProgress';

interface ElectiveEditorModalProps {
  subject: MatrixSubject | null;
  catalog: ElectiveCatalogItem[];
  lastPeriod: number;
  unavailableKeys: Set<string>;
  onSave: (selection: ElectiveSelection) => string | null;
  onClose: () => void;
  onClear?: () => void;
}

export function ElectiveEditorModal({ subject, catalog, lastPeriod, unavailableKeys, onSave, onClose, onClear }: ElectiveEditorModalProps) {
  const existing = subject?.electiveSelection;
  const [source, setSource] = useState<'catalog' | 'manual'>(existing?.source || (catalog.length ? 'catalog' : 'manual'));
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState(existing?.source === 'catalog' ? electiveIdentity(existing) : '');
  const [manualName, setManualName] = useState(existing?.name || '');
  const [enteredHours, setEnteredHours] = useState(existing ? String(existing.hours) : '');
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selected = catalog.find(item => item.key === selectedKey);
  const missingSelection = existing?.source === 'catalog' && selectedKey === electiveIdentity(existing) && !selected ? existing : undefined;
  const knownHours = selected?.hours ?? missingSelection?.hours ?? null;
  const visibleCatalog = useMemo(() => {
    const needle = normalizeMatrixText(query);
    return catalog.filter(item => item.key === selectedKey || normalizeMatrixText(`${item.name} ${item.code || ''}`).includes(needle));
  }, [catalog, query, selectedKey]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>('#elective-search, #elective-name')?.focus();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  const inputClass = 'w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <dialog ref={dialogRef} aria-labelledby="elective-editor-title" aria-describedby="elective-editor-description"
      className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0 text-slate-800 dark:text-slate-100 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); } }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="flex max-h-[90dvh] flex-col" onSubmit={event => {
        event.preventDefault();
        const name = source === 'manual' ? manualName.trim() : selected?.name || missingSelection?.name;
        const hours = source === 'catalog' && knownHours != null ? knownHours : Number(enteredHours.replace(',', '.'));
        if (!name) { setError(source === 'catalog' ? 'Selecione uma disciplina do catálogo.' : 'Informe o nome da disciplina.'); return; }
        if (!Number.isFinite(hours) || hours <= 0) { setError('Informe uma carga horária maior que zero.'); return; }
        const selection: ElectiveSelection = source === 'manual' ? { source, name, hours }
          : { source, name, hours, code: selected?.code || missingSelection?.code, subjectId: selected?.subjectId || missingSelection?.subjectId, desc: selected?.desc || missingSelection?.desc };
        const saveError = onSave(selection);
        if (saveError) setError(saveError);
      }}>
        <div className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="elective-editor-title" className="text-lg font-bold">{subject ? 'Definir disciplina optativa' : 'Adicionar optativa'}</h2>
            <p id="elective-editor-description" className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {subject ? `${subject.name} • ${subject.period}º período. O status atual será mantido.` : `A disciplina ficará no ${lastPeriod}º período e começará como pendente.`}
            </p>
          </div>
          <button type="button" aria-label="Fechar editor de optativa" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>

        <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <legend className="sr-only">Como informar a optativa</legend>
          {(['catalog', 'manual'] as const).map(mode => (
            <label key={mode} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${source === mode ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700'}`}>
              <input type="radio" name="elective-source" value={mode} checked={source === mode} onChange={() => {
                setSource(mode); setError('');
                if (mode === 'manual' && selected) { setManualName(selected.name); setEnteredHours(selected.hours != null ? String(selected.hours) : enteredHours); }
              }} className="accent-indigo-600" />
              {mode === 'catalog' ? 'Escolher do catálogo' : 'Informar manualmente'}
            </label>
          ))}
        </fieldset>

        {source === 'catalog' ? (
          <div className="space-y-3">
            <label className="block text-sm font-semibold" htmlFor="elective-search">Pesquisar por nome ou código</label>
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input id="elective-search" type="search" value={query} onChange={event => setQuery(event.target.value)} className={`${inputClass} pl-9`} placeholder="Nome ou código da disciplina" />
            </div>
            <label className="block text-sm font-semibold" htmlFor="elective-catalog">Disciplina do catálogo</label>
            <select id="elective-catalog" size={6} value={selectedKey} onChange={event => { setSelectedKey(event.target.value); setEnteredHours(''); setError(''); }} className={`${inputClass} min-h-40`}>
              <option value="">Selecione uma disciplina</option>
              {missingSelection && <option value={selectedKey}>{missingSelection.name} — fora do catálogo atual</option>}
              {visibleCatalog.map(item => (
                <option key={item.key} value={item.key} disabled={unavailableKeys.has(item.key)}>
                  {item.name}{item.code ? ` • ${item.code}` : ''} — {item.hours != null ? `${item.hours}h` : 'CH a informar'}{unavailableKeys.has(item.key) ? ' (já utilizada)' : ''}
                </option>
              ))}
            </select>
            {!catalog.length && <p className="text-sm text-slate-500">Nenhuma optativa cadastrada para este perfil. Você pode informar a disciplina manualmente.</p>}
            {!!catalog.length && !visibleCatalog.length && <p className="text-sm text-slate-500">Nenhuma disciplina encontrada.</p>}
            {missingSelection && <p className="text-sm text-slate-500">O nome e as horas salvos continuam disponíveis.</p>}
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="elective-name" className="block text-sm font-semibold">Nome da disciplina</label>
            <input id="elective-name" value={manualName} onChange={event => { setManualName(event.target.value); setError(''); }} className={inputClass} placeholder="Nome da optativa que você cursou" />
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="elective-hours" className="block text-sm font-semibold">Carga horária (horas)</label>
          <input id="elective-hours" inputMode="decimal" value={source === 'catalog' && knownHours != null ? String(knownHours) : enteredHours}
            readOnly={source === 'catalog' && knownHours != null} onChange={event => { setEnteredHours(event.target.value); setError(''); }}
            className={`${inputClass} read-only:bg-slate-100 dark:read-only:bg-slate-800/50`} placeholder="Ex.: 30" />
          <p className="text-xs text-slate-500 dark:text-slate-400">As horas serão contabilizadas quando o cartão estiver concluído.</p>
        </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 dark:border-slate-700 px-5 py-4 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:px-6">
          {error && <p role="alert" className="col-span-2 text-sm font-medium text-rose-600 dark:text-rose-400 sm:w-full">{error}</p>}
          {onClear && <button type="button" onClick={onClear} className="col-span-2 min-h-11 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 sm:mr-auto">{subject?.additionalElective ? 'Remover optativa' : 'Limpar escolha'}</button>}
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold">Cancelar</button>
          <button type="submit" className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Salvar optativa</button>
        </div>
      </form>
    </dialog>
  );
}
