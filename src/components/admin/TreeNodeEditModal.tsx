import React, { useState } from 'react';
import { Network, X, Check } from 'lucide-react';
import { TreeSubjectNode } from '../../types';

export interface TreeNodeEditModalProps {
  onEditCatalog: () => void;
  editTreeNode: TreeSubjectNode;
  setEditTreeNode: React.Dispatch<React.SetStateAction<TreeSubjectNode | null>>;
  extractedTreeSubjects: TreeSubjectNode[];
  onAddPrereq: (id: string) => void;
  onRemovePrereq: (id: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function TreeNodeEditModal({
  onEditCatalog,
  editTreeNode,
  setEditTreeNode,
  extractedTreeSubjects,
  onAddPrereq,
  onRemovePrereq,
  onSave,
  onClose
}: TreeNodeEditModalProps) {
  const [newPrereqSelect, setNewPrereqSelect] = useState('');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Editar estrutura e pré-requisitos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                {editTreeNode.name || 'Nova Disciplina'} ({editTreeNode.code || editTreeNode.id})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <button type="button" onClick={onEditCatalog} className="text-indigo-600 dark:text-indigo-300 text-sm">Editar conteúdo em Disciplinas →</button>
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Código</label>
              <input
                type="text"
                readOnly
                value={editTreeNode.code || ''}
                onChange={(e) => setEditTreeNode({ ...editTreeNode, code: e.target.value.toUpperCase() })}
                placeholder="Ex: CCMP3014"
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono font-bold focus:outline-none focus:border-indigo-500 uppercase"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nome da Disciplina</label>
              <input
                type="text"
                readOnly
                value={editTreeNode.name}
                onChange={(e) => setEditTreeNode({ ...editTreeNode, name: e.target.value })}
                placeholder="Ex: Estruturas de Dados"
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Período</label>
              <select
                value={editTreeNode.period ?? ''}
                onChange={(e) => setEditTreeNode({ ...editTreeNode, period: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="">Não informado</option>
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}º Período</option>
                ))}
                <option value={0}>Optativa (Sem período fixo)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Carga Horária (h)</label>
              <input
                type="number"
                min={15}
                step={15}
                readOnly
                value={editTreeNode.hours ?? ''}
                onChange={(e) => setEditTreeNode({ ...editTreeNode, hours: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Categoria / Tipo</label>
              <select
                value={editTreeNode.type}
                onChange={(e) => setEditTreeNode({ ...editTreeNode, type: e.target.value as any })}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none cursor-pointer font-medium"
              >
                <option value="computacao">Computação / Específica</option>
                <option value="basico">Ciclo Básico / Matemática</option>
                <option value="optativa">Optativa</option>
                <option value="estagio">Estágio / TCC</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase">
              Pré-requisitos Necessários ({(editTreeNode.prereqs || []).length})
            </label>
            
            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[44px] items-center">
              {(editTreeNode.prereqs || []).length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">
                  Nenhum pré-requisito (Disciplina de fluxo de entrada).
                </span>
              ) : (
                (editTreeNode.prereqs || []).map((prereqId, pidx) => {
                  const matchedNode = extractedTreeSubjects.find(s => s.id === prereqId || s.code === prereqId);
                  const displayTitle = matchedNode ? `${matchedNode.code || matchedNode.id} - ${matchedNode.name}` : prereqId;
                  return (
                    <span 
                      key={pidx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg font-medium text-[11px]"
                      title={displayTitle}
                    >
                      <span className="font-mono font-bold">← {matchedNode?.code || prereqId}</span>
                      {matchedNode && <span className="max-w-[140px] truncate">({matchedNode.name})</span>}
                      <button
                        type="button"
                        onClick={() => onRemovePrereq(prereqId)}
                        className="text-indigo-400 hover:text-rose-500 transition-colors ml-1 cursor-pointer"
                        title="Remover pré-requisito"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })
              )}
            </div>

            <div className="flex gap-2 items-center">
              <select
                value={newPrereqSelect}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewPrereqSelect('');
                  if (val) onAddPrereq(val);
                }}
                className="flex-1 p-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer"
              >
                <option value="">+ Selecionar disciplina existente como pré-requisito...</option>
                {extractedTreeSubjects
                  .filter(s => s.id !== editTreeNode.id && s.profile === editTreeNode.profile && !(editTreeNode.prereqs || []).includes(s.id))
                  .sort((a, b) => (a.period || 0) - (b.period || 0))
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.period ? `${s.period}ºP: ` : 'Opt: '}{s.code || s.id} - {s.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Ementa / Descrição
            </label>
            <textarea
              rows={3}
              readOnly
                value={editTreeNode.desc || ''}
              onChange={(e) => setEditTreeNode({ ...editTreeNode, desc: e.target.value })}
              placeholder="Objetivos e tópicos abordados nesta disciplina..."
              className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-sans focus:outline-none focus:border-indigo-500 text-xs leading-relaxed"
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
            <span>Salvar Disciplina</span>
          </button>
        </div>
      </div>
    </div>
  );
}
