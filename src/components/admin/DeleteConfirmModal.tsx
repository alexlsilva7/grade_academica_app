import React from 'react';
import { Trash2, Loader2 } from 'lucide-react';

export interface DeleteConfirmModalProps {
  title: string;
  subtitle?: string;
  description: React.ReactNode;
  confirmLabel: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  title,
  subtitle,
  description,
  confirmLabel,
  isDeleting,
  onConfirm,
  onCancel
}: DeleteConfirmModalProps) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => !isDeleting && onCancel()}
    >
      <div 
        role="dialog"
        aria-modal="true"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3.5 text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
          {description}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Excluindo...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
