import React from 'react';
import { Tag, X, Check } from 'lucide-react';
import { CurriculumProfile } from '../../types';

export interface ProfileMetaEditModalProps {
  editProfileMeta: CurriculumProfile;
  setEditProfileMeta: React.Dispatch<React.SetStateAction<CurriculumProfile | null>>;
  onSave: () => void;
  onClose: () => void;
}

export function ProfileMetaEditModal({
  editProfileMeta,
  setEditProfileMeta,
  onSave,
  onClose
}: ProfileMetaEditModalProps) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Editar Metadados do Perfil Curricular
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cargas horárias totais, extensão e atividades complementares
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">ID do Perfil</label>
              <input
                type="text"
                value={editProfileMeta.id}
                onChange={(e) => setEditProfileMeta({ ...editProfileMeta, id: e.target.value.toUpperCase() })}
                placeholder="Ex: BCC03"
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono font-bold focus:outline-none uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Semestre Vigência</label>
              <input
                type="text"
                value={editProfileMeta.validFromSemester || ''}
                onChange={(e) => setEditProfileMeta({ ...editProfileMeta, validFromSemester: e.target.value })}
                placeholder="Ex: 2024.2"
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nome Descritivo do Perfil</label>
            <input
              type="text"
              value={editProfileMeta.name}
              onChange={(e) => setEditProfileMeta({ ...editProfileMeta, name: e.target.value })}
              placeholder="Ex: Grade Nova 2024.2"
              className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">C.H. Total Curso (horas)</label>
              <input
                type="number"
                min={0}
                value={editProfileMeta.totalHours ?? ''}
                onChange={(e) => setEditProfileMeta({ ...editProfileMeta, totalHours: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">C.H. Extensão (horas)</label>
              <input
                type="number"
                min={0}
                value={editProfileMeta.acexHours ?? ''}
                onChange={(e) => setEditProfileMeta({ ...editProfileMeta, acexHours: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">ACC Complementar (horas)</label>
              <input
                type="number"
                min={0}
                value={editProfileMeta.accHours ?? ''}
                onChange={(e) => setEditProfileMeta({ ...editProfileMeta, accHours: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Optativas (horas)</label>
              <input
                type="number"
                min={0}
                value={editProfileMeta.optativeHours ?? ''}
                onChange={(e) => setEditProfileMeta({ ...editProfileMeta, optativeHours: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono focus:outline-none"
              />
            </div>
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
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Metadados</span>
          </button>
        </div>
      </div>
    </div>
  );
}
