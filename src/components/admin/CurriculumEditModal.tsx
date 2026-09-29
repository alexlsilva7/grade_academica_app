import React from 'react';
import { BookOpen, X, Check } from 'lucide-react';

export interface CurriculumEditModalProps {
  onEditStructure?: () => void;
  editCurrCode: string;
  setEditCurrCode: (v: string) => void;
  editCurrName: string;
  setEditCurrName: (v: string) => void;
  editCurrPeriod: string;
  setEditCurrPeriod: (v: string) => void;
  editCurrProfile: string;
  setEditCurrProfile: (v: string) => void;
  editCurrType: string;
  setEditCurrType: (v: string) => void;
  editCurrCredits: number | '';
  setEditCurrCredits: (v: number | '') => void;
  editCurrTeorica: number | '';
  setEditCurrTeorica: (v: number | '') => void;
  editCurrPratica: number | '';
  setEditCurrPratica: (v: number | '') => void;
  editCurrExtensao: number | '';
  setEditCurrExtensao: (v: number | '') => void;
  editCurrTotal: number | '';
  setEditCurrTotal: (v: number | '') => void;
  editCurrEmenta: string;
  setEditCurrEmenta: (v: string) => void;
  editCurrPrereqs: { code: string; name: string }[];
  newPrereqCode: string;
  setNewPrereqCode: (v: string) => void;
  newPrereqName: string;
  setNewPrereqName: (v: string) => void;
  onAddPrereq: () => void;
  onRemovePrereq: (code: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function CurriculumEditModal({
  onEditStructure,
  editCurrCode,
  setEditCurrCode,
  editCurrName,
  setEditCurrName,
  editCurrPeriod,
  setEditCurrPeriod,
  editCurrProfile,
  setEditCurrProfile,
  editCurrType,
  setEditCurrType,
  editCurrCredits,
  setEditCurrCredits,
  editCurrTeorica,
  setEditCurrTeorica,
  editCurrPratica,
  setEditCurrPratica,
  editCurrExtensao,
  setEditCurrExtensao,
  editCurrTotal,
  setEditCurrTotal,
  editCurrEmenta,
  setEditCurrEmenta,
  editCurrPrereqs,
  newPrereqCode,
  setNewPrereqCode,
  newPrereqName,
  setNewPrereqName,
  onAddPrereq,
  onRemovePrereq,
  onSave,
  onClose
}: CurriculumEditModalProps) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Editar Componente Curricular
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                {editCurrName || 'Nova Disciplina'} ({editCurrCode || 'Sem código'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Código</label>
              <input
                type="text"
                value={editCurrCode}
                onChange={(e) => setEditCurrCode(e.target.value)}
                placeholder="Ex: CCMP3057"
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nome da Disciplina</label>
              <input
                type="text"
                value={editCurrName}
                onChange={(e) => setEditCurrName(e.target.value)}
                placeholder="Ex: Algoritmos e Estruturas de Dados"
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Período</label>
              <select
                value={editCurrPeriod}
                onChange={(e) => setEditCurrPeriod(e.target.value)}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Não informado</option>
                {Array.from({ length: 11 }, (_, i) => (
                  <option key={i + 1} value={(i + 1).toString()}>{i + 1}º Período</option>
                ))}
                <option value="Optativa">Optativa</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Perfil / Matriz</label>
              <input
                type="text"
                value={editCurrProfile}
                onChange={(e) => setEditCurrProfile(e.target.value)}
                placeholder="Ex: MVET03"
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-none focus:border-indigo-500 uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tipo</label>
              <select
                value={editCurrType}
                onChange={(e) => setEditCurrType(e.target.value)}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="">Não informado</option>
                <option value="Obrigatório">Obrigatório</option>
                <option value="Optativa">Optativa</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Créditos</label>
              <input
                type="number"
                min={1}
                value={editCurrCredits}
                onChange={(e) => setEditCurrCredits(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">C.H. Teórica (h)</label>
              <input
                type="number"
                min={0}
                value={editCurrTeorica}
                onChange={(e) => setEditCurrTeorica(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">C.H. Prática (h)</label>
              <input
                type="number"
                min={0}
                value={editCurrPratica}
                onChange={(e) => setEditCurrPratica(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">C.H. Extensão (h)</label>
              <input
                type="number"
                min={0}
                value={editCurrExtensao}
                onChange={(e) => setEditCurrExtensao(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <span className="text-slate-500 font-medium">Carga Horária Total Informada:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              <input aria-label="Carga horária total informada" type="number" min={0} value={editCurrTotal}
                onChange={e => setEditCurrTotal(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-24 p-1 rounded border dark:bg-slate-800" /> horas
            </span>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase">
              Pré-requisitos ({editCurrPrereqs.length})
            </label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[44px] items-center">
              {editCurrPrereqs.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">Nenhum pré-requisito cadastrado.</span>
              ) : (
                editCurrPrereqs.map((p, pidx) => (
                  <span 
                    key={pidx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg font-medium text-[11px]"
                  >
                    <span className="font-mono font-bold">{p.code}:</span>
                    <span>{p.name}</span>

                  </span>
                ))
              )}
            </div>

            <button type="button" onClick={onEditStructure} className="text-sm text-indigo-600 dark:text-indigo-300">Editar em Estrutura e pré-requisitos →</button>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ementa Oficial / Conteúdo Programático</label>
            <textarea
              rows={4}
              value={editCurrEmenta}
              onChange={(e) => setEditCurrEmenta(e.target.value)}
              placeholder="Descreva o conteúdo e os objetivos da disciplina..."
              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-sans focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>
    </div>
  );
}
