import React, { RefObject } from 'react';
import { ArrowLeft, BookOpen, Search, X, CheckCircle2, Info, CheckCircle, Circle, Square, CheckSquare, AlertCircle, Sun, Moon, Monitor, ChevronDown, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Discipline } from '../types';
import { DAYS } from '../constants';
import { hasDisciplineDetails } from '../utils/detailsHelper';

interface SidebarProps {
  mobileTab: string;
  setView: (view: 'home' | 'schedule' | 'matriz' | 'disciplines') => void;
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
  availableProfiles?: string[];
  selectedProfile?: string;
  setSelectedProfile?: (p: string) => void;
  completedDisciplines: string[];
  toggleCompleted: (id: string) => void;
  getDisciplineConflictInstance: (disc: Discipline) => { withName: string } | null;
  darkMode: boolean;
  themePreference: 'light' | 'dark' | 'system';
  cycleTheme: () => void;
  onOpenTour?: () => void;
}

export function Sidebar({
  mobileTab,
  setView,
  gradeTitle,
  periods,
  selectedPeriod,
  setSelectedPeriod,
  availableProfiles,
  selectedProfile = 'all',
  setSelectedProfile,
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
  cycleTheme,
  onOpenTour
}: SidebarProps) {
  const getCleanDisciplineName = (name: string) => {
    return name
      .replace(/\s*\((?:(?:matriz|grade)\s+(?:nova|antiga)\s*[-–:]*\s*|perfil\s*[-–:]*\s*)?[a-z0-9_-]+\)/gi, '')
      .replace(/\s*\((?:matriz|grade)\s+(?:nova|antiga)\)/gi, '')
      .trim();
  };

  return (
    <div className={`w-full md:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col h-full overflow-hidden ${mobileTab === 'disciplines' ? 'flex' : 'hidden md:flex'}`}>
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-col gap-3 shrink-0">
        {/* Profile / Matriz select when multiple profiles exist - DISPLAYED ON TOP */}
        {availableProfiles && availableProfiles.length > 1 && (
          <div data-tour="schedule-profiles" className="flex flex-col gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center justify-between">
              <label htmlFor="sidebar-profile-select" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Perfil / Matriz
              </label>
              {selectedProfile !== 'all' && (
                <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/40">
                  {selectedProfile}
                </span>
              )}
            </div>
            <div className="relative">
              <select
                id="sidebar-profile-select"
                value={selectedProfile}
                onChange={(e) => setSelectedProfile?.(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none shadow-xs transition-colors"
              >
                <option value="all">Todos os Perfis ({availableProfiles.length})</option>
                {availableProfiles.map(p => (
                  <option key={p} value={p}>Perfil: {p}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Períodos</h2>
          {onOpenTour && (
            <button
              onClick={onOpenTour}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
              title="Passo a passo de como montar a grade"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Como Usar</span>
            </button>
          )}
        </div>
        {periods.length > 0 && (
          <div data-tour="schedule-periods" className="flex gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-lg overflow-x-auto scrollbar-hide flex-shrink-0">
            {periods.map(period => (
              <button
                key={period}
                onClick={() => {
                  setSelectedPeriod(period);
                  setSearchQuery('');
                }}
                className={`shrink-0 ${period === 0 ? 'px-3.5' : 'min-w-[38px] px-2.5'} min-h-[38px] sm:min-h-[40px] py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap flex items-center justify-center cursor-pointer ${
                  selectedPeriod === period && !searchQuery
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm font-bold'
                    : 'text-slate-500 dark:text-slate-400 bg-transparent hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/60'
                }`}
              >
                {period === 0 ? 'Optativas' : `${period}º`}
              </button>
            ))}
          </div>
        )}
        
        <div data-tour="schedule-search" className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Pesquisar disciplina ou professor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-950/60 border-none rounded-md py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg transition-colors"
              aria-label="Limpar pesquisa"
            >
              <X className="w-4 h-4" />
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
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white text-sm font-medium rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
            >
              Voltar ao Início
            </button>
          </div>
        ) : displayedDisciplines.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma disciplina encontrada.</p>
          </div>
        ) : (
          displayedDisciplines.map((disc, idx) => {
            const scheduled = isDisciplineScheduled(disc.id);
            const discIdentifier = disc.code || disc.id;
            const isCompleted = completedDisciplines.includes(discIdentifier);
            const conflict = getDisciplineConflictInstance(disc);
            return (
              <motion.div
                key={disc.id}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.15 }}
                data-tour={idx === 0 ? "schedule-first-card" : undefined}
                onClick={() => {
                  if (!isCompleted) {
                    toggleDiscipline(disc);
                  }
                }}
                className={`p-3 border rounded-lg transition-all ${
                  scheduled
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/60 cursor-pointer'
                    : conflict
                      ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50/20 dark:bg-amber-950/15 hover:border-amber-300 cursor-pointer'
                      : isCompleted
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/40 opacity-70 cursor-default'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <h4 className={`text-sm ${scheduled ? 'font-semibold text-indigo-900 dark:text-indigo-200' : isCompleted ? 'font-medium text-emerald-800 dark:text-emerald-300 line-through decoration-emerald-300 dark:decoration-emerald-500' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
                      {getCleanDisciplineName(disc.name)}
                    </h4>
                    {isCompleted && (
                      <span className="inline-flex items-center text-[11px] uppercase font-semibold text-emerald-700 dark:text-emerald-300 mt-1">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Concluída
                      </span>
                    )}
                    {conflict && (
                      <span className="inline-flex items-center text-[11px] font-semibold text-amber-800 dark:text-amber-300 mt-1 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/40" title={`Conflita com: ${conflict.withName}`}>
                        <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" /> Conflito: {conflict.withName}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 items-center shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCompleted(discIdentifier);
                      }}
                      className={`w-10 h-10 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
                        isCompleted 
                          ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40' 
                          : 'text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={isCompleted ? "Remover de concluídas" : "Marcar como concluída"}
                      aria-label={isCompleted ? "Remover de concluídas" : "Marcar como concluída"}
                    >
                      <CheckSquare className="w-5 h-5" />
                    </button>
                    {hasDisciplineDetails(disc) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowDetails(disc);
                        }}
                        className="w-10 h-10 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                        title="Ver Detalhes"
                        aria-label="Ver Detalhes"
                      >
                        <Info className="w-5 h-5" />
                      </button>
                    )}
                    <AnimatePresence mode="wait" initial={false}>
                      {scheduled ? (
                        <motion.div
                          key="scheduled"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="w-5 h-5 bg-indigo-600 dark:bg-indigo-700 rounded-full flex items-center justify-center shadow-sm shadow-indigo-200 dark:shadow-none ml-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="unscheduled"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className={`w-5 h-5 rounded-full border ml-1 flex items-center justify-center ${isCompleted ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-100/50 dark:bg-emerald-950/30' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className={`text-xs font-medium truncate mt-1 ${scheduled ? 'text-indigo-700 dark:text-indigo-300' : isCompleted ? 'text-emerald-700/80 dark:text-emerald-300/80' : 'text-slate-600 dark:text-slate-400'}`}>
                  {disc.professor}
                </div>
                <div className={`mt-2 flex flex-wrap items-center gap-1.5 ${isCompleted && !scheduled ? 'opacity-70' : ''}`}>
                   <span className={`inline-flex items-center text-[11px] uppercase font-bold px-2 py-0.5 rounded shadow-sm ${scheduled ? 'bg-indigo-600 dark:bg-indigo-700 text-white' : isCompleted ? 'bg-emerald-600 dark:bg-emerald-700 text-white' : 'bg-slate-800 dark:bg-slate-700 text-white'}`}>
                    {disc.period === 0 ? 'Opt' : `${disc.period}º`}
                  </span>
                  {disc.profile && (
                    <span className="inline-flex items-center text-[11px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {disc.profile}
                    </span>
                  )}
                  <div className={`h-3.5 w-[1px] ${isCompleted ? 'bg-emerald-200 dark:bg-emerald-900/50' : 'bg-slate-300 dark:bg-slate-700'}`} />
                  {disc.sessions.map((session, i) => (
                    <span key={i} className={`inline-flex items-center text-[11px] uppercase font-semibold px-2 py-0.5 rounded ${scheduled ? 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200' : isCompleted ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                      {DAYS.find(d => d.id === session.day)?.name.substring(0, 3)} {session.time}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
