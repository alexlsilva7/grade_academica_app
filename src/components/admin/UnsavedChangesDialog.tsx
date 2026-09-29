import { useEffect, useRef } from 'react';

export function UnsavedChangesDialog({ busy, onSave, onDiscard, onCancel }: { busy: boolean; onSave: () => void; onDiscard: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  return <dialog ref={ref} onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }} aria-labelledby="unsaved-title" className="m-auto max-w-lg w-full rounded-2xl p-6 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 backdrop:bg-slate-950/60">
    <h2 id="unsaved-title" className="font-bold text-lg">Alterações não salvas</h2>
    <p className="my-4 text-sm text-slate-500">Salve as alterações antes de continuar ou descarte o rascunho. Se o salvamento falhar, você continuará nesta tela.</p>
    <div className="flex justify-end gap-3 text-sm"><button disabled={busy} onClick={onCancel}>Cancelar</button><button disabled={busy} onClick={onDiscard} className="text-rose-600 px-3 py-2">Descartar</button><button disabled={busy} onClick={onSave} className="admin-primary">{busy ? 'Salvando…' : 'Salvar e continuar'}</button></div>
  </dialog>;
}
