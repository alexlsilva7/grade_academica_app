import React, { RefObject } from 'react';
import { ArrowLeft, Upload, Search, X, CheckCircle2, Info, CheckCircle, Circle, Square, CheckSquare } from 'lucide-react';
import { Discipline } from '../types';
import { DAYS } from '../constants';

interface SidebarProps {
  mobileTab: string;
  setView: (view: 'home' | 'schedule') => void;
  gradeTitle: string;
  fileInputRef: RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessingPdf: boolean;
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
}

export function Sidebar({
  mobileTab,
  setView,
  gradeTitle,
  fileInputRef,
  handleFileUpload,
  isProcessingPdf,
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
  toggleCompleted
}: SidebarProps) {
  return (
    <div className={`w-full md:w-80 bg-white border-r border-slate-200 flex-col h-full overflow-hidden ${mobileTab === 'disciplines' ? 'flex' : 'hidden md:flex'}`}>
      <div className="h-16 flex items-center justify-between border-b border-slate-200 px-4 md:px-6 shrink-0 w-full bg-slate-50 relative">
        <button 
          onClick={() => setView('home')} 
          className="flex items-center justify-center p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-full transition-colors mr-2 shrink-0"
          title="Voltar ao Início"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          <h1 className="text-sm font-semibold tracking-tight text-slate-800 truncate" title={gradeTitle}>
            {gradeTitle || "Grade Acadêmica"}
          </h1>
        </div>
        
        {hasApiKey && (
          <div className="ml-2 shrink-0">
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingPdf}
              className="flex items-center justify-center w-8 h-8 md:w-auto md:px-3 md:bg-indigo-50 text-indigo-700 md:hover:bg-indigo-100 disabled:opacity-50 text-sm font-medium rounded-md transition-colors"
              title="Importar outro PDF"
            >
              <Upload className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">{isProcessingPdf ? '...' : 'PDF'}</span>
            </button>
          </div>
        )}
      </div>
      <div className="p-4 border-b border-slate-100 flex flex-col gap-3 shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Períodos</h2>
        </div>
        {periods.length > 0 && (
          <div className="flex gap-1 bg-slate-100 p-1 rounded-md overflow-x-auto scrollbar-hide flex-shrink-0">
            {periods.map(period => (
              <button
                key={period}
                onClick={() => {
                  setSelectedPeriod(period);
                  setSearchQuery('');
                }}
                className={`flex-1 min-w-[36px] py-1.5 px-3 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  selectedPeriod === period && !searchQuery
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 bg-transparent hover:text-slate-700'
                }`}
              >
                {period === 0 ? 'OPTATIVAS' : `${period}º`}
              </button>
            ))}
          </div>
        )}
        
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar disciplina ou professor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 border-none rounded-md py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors placeholder:text-slate-400"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 md:pb-4">
        {disciplinesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 text-indigo-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Nenhuma disciplina</h3>
            <p className="text-xs text-slate-500 mb-4">Acesse as configurações ou volte ao Menu Iniciar para carregar as disciplinas.</p>
            {hasApiKey && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
                disabled={isProcessingPdf}
              >
                {isProcessingPdf ? 'Processando...' : 'Importar PDF'}
              </button>
            )}
          </div>
        ) : displayedDisciplines.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">Nenhuma disciplina encontrada.</p>
          </div>
        ) : (
          displayedDisciplines.map(disc => {
            const scheduled = isDisciplineScheduled(disc.id);
            const discIdentifier = disc.code || disc.id;
            const isCompleted = completedDisciplines.includes(discIdentifier);
            return (
              <div
                key={disc.id}
                onClick={() => toggleDiscipline(disc)}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  scheduled
                    ? 'bg-indigo-50 border-indigo-200'
                    : isCompleted
                      ? 'bg-emerald-50/50 border-emerald-200/50 opacity-80 hover:opacity-100 hover:border-emerald-300'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <h4 className={`text-sm ${scheduled ? 'font-semibold text-indigo-900' : isCompleted ? 'font-medium text-emerald-800 line-through decoration-emerald-300' : 'font-medium text-slate-700'}`}>
                      {disc.name}
                    </h4>
                    {isCompleted && (
                      <span className="inline-flex items-center text-[10px] uppercase font-bold text-emerald-600 mt-1">
                        <CheckCircle className="w-3 h-3 mr-1" /> Concluída
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCompleted(discIdentifier);
                      }}
                      className={`p-0.5 rounded transition-colors ${isCompleted ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-300 hover:text-emerald-500'}`}
                      title={isCompleted ? "Remover de concluídas" : "Marcar como concluída"}
                    >
                      <CheckSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowDetails(disc);
                      }}
                      className="p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                      title="Ver Detalhes"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    {scheduled ? (
                      <div className="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center shadow-sm shadow-indigo-200">
                        <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className={`w-4 h-4 rounded-full border ${isCompleted ? 'border-emerald-300 bg-emerald-100/50' : 'border-slate-300 bg-slate-50'}`} />
                    )}
                  </div>
                </div>
                <div className={`text-xs mt-1 ${scheduled ? 'text-indigo-700' : isCompleted ? 'text-emerald-700/70' : 'text-slate-500'}`}>
                  {disc.professor}
                </div>
                <div className={`mt-2 flex flex-wrap items-center gap-1.5 ${isCompleted && !scheduled ? 'opacity-70' : ''}`}>
                   <span className={`inline-flex items-center text-[9px] uppercase font-black px-1.5 py-0.5 rounded shadow-sm ${scheduled ? 'bg-indigo-600 text-white' : isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}>
                    {disc.period === 0 ? 'Opt' : `${disc.period}º`}
                  </span>
                  <div className={`h-3 w-[1px] ${isCompleted ? 'bg-emerald-200' : 'bg-slate-300'}`} />
                  {disc.sessions.map((session, i) => (
                    <span key={i} className={`inline-flex items-center text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${scheduled ? 'bg-indigo-100 text-indigo-800' : isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
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
