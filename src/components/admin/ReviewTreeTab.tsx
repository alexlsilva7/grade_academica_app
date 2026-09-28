import React from 'react';
import { GitFork, Check, Trash2, Plus, Edit3, Network, Search } from 'lucide-react';
import { CurriculumProfile, TreeSubjectNode } from '../../types';

export interface ReviewTreeTabProps {
  structureOnly?: boolean;
  courseProfiles: CurriculumProfile[];
  extractedProfile: CurriculumProfile | null;
  onSelectProfileToReview: (profileId: string) => void;
  onAddNewProfile: () => void;
  onRequestDeleteProfile: (profile: CurriculumProfile) => void;
  onStartEditProfileMeta: () => void;
  extractedTreeSubjects: TreeSubjectNode[];
  selectedTreePeriod: number | 'all';
  setSelectedTreePeriod: (period: number | 'all') => void;
  treeSearch: string;
  setTreeSearch: (search: string) => void;
  onAddBlankTreeNode: () => void;
  onOpenMatrizView: () => void;
  onStartEditTreeNode: (index: number, node: TreeSubjectNode) => void;
  onDeleteTreeNode: (index: number) => void;
}

export function ReviewTreeTab({
  structureOnly = false,
  courseProfiles,
  extractedProfile,
  onSelectProfileToReview,
  onAddNewProfile,
  onRequestDeleteProfile,
  onStartEditProfileMeta,
  extractedTreeSubjects,
  selectedTreePeriod,
  setSelectedTreePeriod,
  treeSearch,
  setTreeSearch,
  onAddBlankTreeNode,
  onOpenMatrizView,
  onStartEditTreeNode,
  onDeleteTreeNode
}: ReviewTreeTabProps) {
  const visibleNodes = structureOnly && extractedProfile ? extractedTreeSubjects.filter(node => node.profile === extractedProfile.id) : extractedTreeSubjects;
  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Profile Selector & Quick Metadata Summary Bar */}
      {!structureOnly && <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <GitFork className="w-3.5 h-3.5 text-emerald-500" />
              Perfil Curricular:
            </span>

            {courseProfiles.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {courseProfiles.map(p => {
                  const isCurrent = extractedProfile?.id === p.id;
                  return (
                    <div key={p.id} className="inline-flex items-stretch gap-1">
                      <button
                        type="button"
                        onClick={() => onSelectProfileToReview(p.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {isCurrent && <Check className="w-3.5 h-3.5" />}
                        <span>{p.id} - {p.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isCurrent ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                        }`}>
                          {p.subjects?.length || 0} mat.
                        </span>
                      </button>
                      {courseProfiles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRequestDeleteProfile(p)}
                          aria-label={`Excluir o perfil ${p.id}`}
                          title={`Excluir o perfil ${p.id}`}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {extractedProfile ? `${extractedProfile.id} - ${extractedProfile.name}` : 'Perfil Padrão'}
              </span>
            )}

            <button
              type="button"
              onClick={onAddNewProfile}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors cursor-pointer"
              title="Criar um novo perfil curricular para este curso"
            >
              <Plus className="w-3 h-3" />
              <span>Novo Perfil</span>
            </button>
          </div>

          {extractedProfile && (
            <button
              type="button"
              onClick={onStartEditProfileMeta}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Editar Metadados do Perfil</span>
            </button>
          )}
        </div>

        {/* Profile Stat Badges Grid */}
        {extractedProfile && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total do Curso</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                {extractedProfile.totalHours ?? '—'}h
              </div>
              <div className="text-[10px] text-slate-400">Vigência: {extractedProfile.validFromSemester || '2026.1'}</div>
            </div>

            <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
              <div className="text-[10px] uppercase font-bold text-indigo-500">Obrigatórias</div>
              <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                {extractedProfile.mandatoryHours ?? '—'}h
              </div>
              <div className="text-[10px] text-slate-400">Módulos compulsórios</div>
            </div>

            <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
              <div className="text-[10px] uppercase font-bold text-amber-500">Extensão (ACEx)</div>
              <div className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                {extractedProfile.acexHours ?? '—'}h
              </div>
              <div className="text-[10px] text-slate-400">Extensão universitária</div>
            </div>

            <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
              <div className="text-[10px] uppercase font-bold text-sky-500">Compl. (ACC)</div>
              <div className="text-sm font-bold text-sky-600 dark:text-sky-400 font-mono mt-0.5">
                {extractedProfile.accHours ?? '—'}h
              </div>
              <div className="text-[10px] text-slate-400">Atividades acadêmicas</div>
            </div>

            <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
              <div className="text-[10px] uppercase font-bold text-emerald-500">Optativas</div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                {extractedProfile.optativeHours ?? '—'}h
              </div>
              <div className="text-[10px] text-slate-400">Carga optativa mín.</div>
            </div>
          </div>
        )}
      </div>}

      {/* Tree Toolbar: Filter Period, Search, Add Node, Open Full Flowchart */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Period Pills Filter */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedTreePeriod('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              selectedTreePeriod === 'all'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Todos ({visibleNodes.length})
          </button>

          {Array.from({ length: 9 }, (_, i) => {
            const pNum = i + 1;
            const count = visibleNodes.filter(s => s.period === pNum).length;
            return (
              <button
                key={pNum}
                type="button"
                onClick={() => setSelectedTreePeriod(pNum)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedTreePeriod === pNum
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{pNum}ºP</span>
                {count > 0 && <span className="text-[10px] opacity-80">({count})</span>}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSelectedTreePeriod(0)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              selectedTreePeriod === 0
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Optativas
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar na árvore..."
              value={treeSearch}
              onChange={(e) => setTreeSearch(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none w-36 sm:w-48"
            />
          </div>

          <button
            type="button"
            onClick={onAddBlankTreeNode}
            className="flex items-center gap-1 px-3 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold hover:opacity-90 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Matéria</span>
          </button>

          <button
            type="button"
            onClick={onOpenMatrizView}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
            title="Ver o fluxograma interativo com linhas de conexão SVG"
          >
            <Network className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ver Fluxograma SVG</span>
          </button>
        </div>
      </div>

      {/* Tree Subjects Grouped by Period */}
      {visibleNodes.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              Nenhuma disciplina em árvore carregada para este perfil
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Use o extrator com IA anexando os arquivos da matriz (PDF do PPC e/ou imagem do fluxograma) para gerar o grafo completo com pré-requisitos automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddBlankTreeNode}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
          >
            + Adicionar Primeira Disciplina
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {[...new Set<number | null>(visibleNodes.map(s => s.period ?? null))].sort((a, b) => (a ?? 999) - (b ?? 999))
            .filter(periodNum => selectedTreePeriod === 'all' || selectedTreePeriod === periodNum)
            .map(periodNum => {
              const subjectsInPeriod = extractedTreeSubjects.filter(s => {
                if (structureOnly && extractedProfile && s.profile !== extractedProfile.id) return false;
                const matchesPeriod = (s.period ?? null) === periodNum;
                const matchesSearch = !treeSearch || 
                  (s.name || '').toLowerCase().includes(treeSearch.toLowerCase()) ||
                  (s.code && s.code.toLowerCase().includes(treeSearch.toLowerCase())) ||
                  s.id.toLowerCase().includes(treeSearch.toLowerCase());
                return matchesPeriod && matchesSearch;
              });

              if (subjectsInPeriod.length === 0 && selectedTreePeriod === 'all') {
                return null;
              }

              const periodHours = subjectsInPeriod.reduce((acc, s) => acc + (s.hours || 0), 0);

              return (
                <div key={periodNum} className="space-y-3">
                  {/* Period Section Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${periodNum === 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        {periodNum == null ? 'Período não informado' : periodNum === 0 ? 'Disciplinas Optativas' : `${periodNum}º Período`}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        ({subjectsInPeriod.length} {subjectsInPeriod.length === 1 ? 'matéria' : 'matérias'} • {periodHours} horas)
                      </span>
                    </div>
                  </div>

                  {/* Subjects Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {subjectsInPeriod.map((node) => {
                      const originalIdx = extractedTreeSubjects.indexOf(node);
                      
                      // Dependents in this tree (nodes that have this node as a prerequisite)
                      const dependents = extractedTreeSubjects.filter(other => 
                        other.prereqs && (other.prereqs.includes(node.id) || (node.code && other.prereqs.includes(node.code)))
                      );

                      // Category badge color
                      const typeColor = node.type === 'computacao'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/70'
                        : node.type === 'basico'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        : node.type === 'optativa'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70'
                        : node.type === 'estagio'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70'
                        : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/70';

                      return (
                        <div
                          key={node.id}
                          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all space-y-3 flex flex-col justify-between group"
                        >
                          <div className="space-y-2">
                            {/* Badges Bar */}
                            <div className="flex items-center justify-between gap-1 text-[10px]">
                              <div className="flex items-center gap-1.5 font-mono font-bold">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200 rounded-md">
                                  {node.code || node.id}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                                  {node.hours ?? '—'}h
                                </span>
                              </div>

                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${typeColor} uppercase tracking-wider`}>
                                {node.type || 'geral'}
                              </span>
                            </div>

                            {/* Name */}
                            <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-snug">
                              {node.name}
                            </h5>

                            {/* Prerequisites List Chips */}
                            <div className="space-y-1 pt-1">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                <span>Requer ({(node.prereqs || []).length})</span>
                                {node.prereqs != null && node.prereqs.length === 0 && (
                                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-normal">Entrada</span>
                                )}
                              </div>

                              {(node.prereqs || []).length === 0 ? (
                                <div className="text-[11px] text-slate-400 italic">
                                  {node.prereqs == null ? 'Pré-requisitos não informados' : 'Sem pré-requisitos'}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {(node.prereqs || []).map((prereqCode, pidx) => {
                                    const targetNode = extractedTreeSubjects.find(s => s.id === prereqCode || s.code === prereqCode);
                                    return (
                                      <span
                                        key={pidx}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 rounded text-[10px] font-medium"
                                        title={targetNode ? `${targetNode.code || targetNode.id} - ${targetNode.name}` : prereqCode}
                                      >
                                        <span className="font-mono font-bold">← {targetNode?.code || prereqCode}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Dependents List (Liberador de) */}
                            {dependents.length > 0 && (
                              <div className="space-y-1 pt-0.5 border-t border-slate-100 dark:border-slate-700/50">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Libera para ({dependents.length})
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {dependents.map((depNode) => (
                                    <span
                                      key={depNode.id}
                                      className="inline-flex items-center px-2 py-0.5 bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 rounded text-[10px] font-mono"
                                      title={`${depNode.code || depNode.id} - ${depNode.name} (${depNode.period}ºP)`}
                                    >
                                      → {depNode.code || depNode.id}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions Bar */}
                          <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                            <button
                              type="button"
                              onClick={() => onStartEditTreeNode(originalIdx, node)}
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-md transition-colors cursor-pointer"
                              title="Editar disciplina e pré-requisitos"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteTreeNode(originalIdx)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
                              title="Excluir disciplina da árvore"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
