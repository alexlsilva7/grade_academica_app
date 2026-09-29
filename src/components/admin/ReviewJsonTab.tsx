import React from 'react';
import { CheckCircle, AlertCircle, Check, Copy, RefreshCw } from 'lucide-react';

export interface ReviewJsonTabProps {
  schemaValidation: {
    isValid: boolean;
    issues: string[];
  };
  copied: boolean;
  onCopyJson: () => void;
  onApplyJsonEdit: () => void;
  jsonError: string | null;
  jsonText: string;
  setJsonText: (text: string) => void;
}

export function ReviewJsonTab({
  schemaValidation,
  copied,
  onCopyJson,
  onApplyJsonEdit,
  jsonError,
  jsonText,
  setJsonText
}: ReviewJsonTabProps) {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs ${
        schemaValidation.isValid
          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
          : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300'
      }`}>
        <div className="space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            {schemaValidation.isValid ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>JSON Conforme com o Schema Oficial</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Avisos no Schema ({schemaValidation.issues.length})</span>
              </>
            )}
          </div>
          {!schemaValidation.isValid && (
            <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90 pl-1">
              {schemaValidation.issues.slice(0, 3).map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onCopyJson}
            className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>

          <button
            type="button"
            onClick={onApplyJsonEdit}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Comparar JSON</span>
          </button>
        </div>
      </div>

      {jsonError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300 font-mono">
          {jsonError}
        </div>
      )}

      <div className="relative">
        <textarea
          rows={18}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          className="w-full font-mono text-xs p-4 bg-slate-900 text-emerald-400 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
