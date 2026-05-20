import React, { RefObject } from 'react';
import { ArrowLeft, BookOpen, Search, X, CheckCircle2, Info, CheckCircle, Circle, Square, CheckSquare, AlertCircle, Sun, Moon, Monitor } from 'lucide-react';
import { Discipline } from '../types';
import { DAYS } from '../constants';
import { hasDisciplineDetails } from '../utils/detailsHelper';

interface SidebarProps {
  mobileTab: string;
  setView: (view: 'home' | 'schedule') => void;
  gradeTitle: string;
  periods: number[];
  selectedPeriod: number;
  setSelectedPeriod: (p: number) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  disciplinesList: Discipline[];
  displayedDisciplines: Discipline[];
  isDisciplineScheduled: (id: string) => boolean;
  toggleDiscipline: (disc: Discipline) => void;
  onShowDetails: (disc: Discipline) => void;
  hasApiKey: boolean;
  completedDisciplines: string[];
  toggleCompleted: (id: string) => void;
  getDisciplineConflictInstance: (disc: Discipline) => { withName: string } | null;
  darkMode: boolean;
  themePreference: 'light' | 'dark' | 'system';
  cycleTheme: () => void;
}

export function Sidebar({
  mobileTab,
  setView,
  gradeTitle,
  periods,
  selectedPeriod,
  setSelectedPeriod,
  searchQuery,
  setSearchQuery,
  disciplinesList,
  displayedDisciplines,
  isDisciplineScheduled,
  toggleDiscipline,
  onShowDetails,
  hasApiKey,
  completedDisciplines,
  toggleCompleted,
  getDisciplineConflictInstance,
  darkMode,
  themePreference,
  cycleTheme
}: SidebarProps) {
  return (
    <div className={`w-full md:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col h-full overflow-hidden ${mobileTab === 'disciplines' ? 'flex' : 'hidden md:flex'}`}>
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-col gap-3 shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Períodos</h2>
        </div>
        {periods.length > 0 && (
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-md overflow-x-auto scrollbar-hide flex-shrink-0">
            {periods.map(period => (
              <button
                key={period}
                onClick={() => {
                  setSelectedPeriod(period);
                  setSearchQuery('');
                }}
                className={`flex-1 min-w-[36px] py-1.5 px-3 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  selectedPeriod === period && !searchQuery
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 bg-transparent hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {period === 0 ? 'OPTATIVAS' : `${period}º`}
              </button>
            ))}
          </div>
        )}
        
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Pesquisar disciplina ou professor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-950/60 border-none rounded-md py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-250 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-505 dark:hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 md:pb-4 bg-slate-50/50 dark:bg-slate-900/40">
        {disciplinesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6 text-indigo-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Nenhuma disciplina</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Acesse as configurações ou volte ao Menu Início para carregar as disciplinas.</p>
            <button
              onClick={() => setView('home')}
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-705 text-white text-sm font-medium rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-605 transition-colors"
            >
              Voltar ao Início
            </button>
          </div>
        ) : displayedDisciplines.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma disciplina encontrada.</p>
          </div>
        ) : (
          displayedDisciplines.map(disc => {
            const scheduled = isDisciplineScheduled(disc.id);
            const discIdentifier = disc.code || disc.id;
            const isCompleted = completedDisciplines.includes(discIdentifier);
            const conflict = getDisciplineConflictInstance(disc);
            return (
              <div
                key={disc.id}
                onClick={() => {
                  if (!isCompleted) {
                    toggleDiscipline(disc);
                  }
                }}
                className={`p-3 border rounded-lg transition-all ${
                  scheduled
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/60 cursor-pointer'
                    : conflict
                      ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50/20 dark:bg-amber-950/15 hover:border-amber-305 cursor-pointer'
                      : isCompleted
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/40 opacity-70 cursor-default'
                        : 'border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-705 cursor-pointer'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <h4 className={`text-sm ${scheduled ? 'font-semibold text-indigo-900 dark:text-indigo-200' : isCompleted ? 'font-medium text-emerald-800 dark:text-emerald-300 line-through decoration-emerald-300 dark:decoration-emerald-505' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
                      {disc.name}
                    </h4>
                    {isCompleted && (
                      <span className="inline-flex items-center text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-450 mt-1">
                        <CheckCircle className="w-3 h-3 mr-1" /> Concluída
                      </span>
                    )}
                    {conflict && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 dark:text-amber-400 mt-1 bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/40" title={`Conflita com: ${conflict.withName}`}>
                        <AlertCircle className="w-3 h-3 mr-1 shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" /> Conflito: {conflict.withName}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCompleted(discIdentifier);
                      }}
                      className={`p-0.5 rounded transition-colors ${isCompleted ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700' : 'text-slate-300 dark:text-slate-500 hover:text-emerald-500'}`}
                      title={isCompleted ? "Remover de concluídas" : "Marcar como concluída"}
                    >
                      <CheckSquare className="w-4 h-4" />
                    </button>
                    {hasDisciplineDetails(disc) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowDetails(disc);
                        }}
                        className="p-0.5 text-slate-400 dark:text-slate-505 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
                        title="Ver Detalhes"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    )}
                    {scheduled ? (
                      <div className="w-4 h-4 bg-indigo-600 dark:bg-indigo-700 rounded-full flex items-center justify-center shadow-sm shadow-indigo-200 dark:shadow-none">
                        <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className={`w-4 h-4 rounded-full border ${isCompleted ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-100/50 dark:bg-emerald-950/30' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`} />
                    )}
                  </div>
                </div>
                <div className={`text-xs mt-1 ${scheduled ? 'text-indigo-700 dark:text-indigo-305' : isCompleted ? 'text-emerald-700/70 dark:text-emerald-400/80' : 'text-slate-500 dark:text-slate-400'}`}>
                  {disc.professor}
                </div>
                <div className={`mt-2 flex flex-wrap items-center gap-1.5 ${isCompleted && !scheduled ? 'opacity-70' : ''}`}>
                   <span className={`inline-flex items-center text-[9px] uppercase font-black px-1.5 py-0.5 rounded shadow-sm ${scheduled ? 'bg-indigo-600 dark:bg-indigo-750 text-white' : isCompleted ? 'bg-emerald-600 dark:bg-emerald-750 text-white' : 'bg-slate-800 dark:bg-slate-705 text-white'}`}>
                    {disc.period === 0 ? 'Opt' : `${disc.period}º`}
                  </span>
                  <div className={`h-3 w-[1px] ${isCompleted ? 'bg-emerald-200 dark:bg-emerald-900/50' : 'bg-slate-300 dark:bg-slate-700'}`} />
                  {disc.sessions.map((session, i) => (
                    <span key={i} className={`inline-flex items-center text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${scheduled ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300' : isCompleted ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      {DAYS.find(d => d.id === session.day)?.name.substring(0, 3)} {session.time}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
