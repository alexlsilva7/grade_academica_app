import React, { useState, useMemo } from 'react';
import { Navbar } from './Navbar';
import { Search, Filter, BookOpen, Clock, Info } from 'lucide-react';
import bccData from '../bcc_dados.json';
import ealData from '../eal_data.json';

interface DisciplinesViewProps {
  setView: (view: 'home' | 'schedule' | 'matriz' | 'disciplines') => void;
  course: string | null;
  darkMode: boolean;
  themePreference: 'light' | 'dark' | 'system';
  cycleTheme: () => void;
}

export function DisciplinesView({
  setView,
  course,
  darkMode,
  themePreference,
  cycleTheme
}: DisciplinesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('todos');
  const [selectedType, setSelectedType] = useState<string>('todos');
  const [selectedDiscipline, setSelectedDiscipline] = useState<any | null>(null);

  const activeData: any = course === 'eal' ? ealData : bccData;
  const subjects: any[] = Array.isArray(activeData) ? activeData : (activeData.subjects || []);

  const periods = useMemo(() => {
    const p = new Set<string>();
    subjects.forEach((s: any) => {
      if (s.period) p.add(s.period.toString());
    });
    return Array.from(p).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s: any) => {
      const matchQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPeriod = selectedPeriod === 'todos' || s.period?.toString() === selectedPeriod;
      const matchType = selectedType === 'todos' || 
                        (selectedType === 'obrigatoria' && s.type?.toLowerCase().includes('obrigat')) ||
                        (selectedType === 'optativa' && !s.type?.toLowerCase().includes('obrigat'));
      return matchQuery && matchPeriod && matchType;
    });
  }, [subjects, searchQuery, selectedPeriod, selectedType]);

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 font-sans flex flex-col items-center">
      <div className="w-full max-w-7xl flex-1 flex flex-col bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border-x border-slate-200 dark:border-slate-800 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Navbar 
          setView={setView}
          title="Catálogo de Disciplinas"
          course={course}
          darkMode={darkMode}
          themePreference={themePreference}
          cycleTheme={cycleTheme}
        />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8 bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                />
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="flex-1 md:flex-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                >
                  <option value="todos">Todos Períodos</option>
                  {periods.map(p => (
                    <option key={p} value={p}>{p}º Período</option>
                  ))}
                </select>
                
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="flex-1 md:flex-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                >
                  <option value="todos">Todos Tipos</option>
                  <option value="obrigatoria">Obrigatórias</option>
                  <option value="optativa">Optativas</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSubjects.map((subject: any) => (
                <div 
                  key={subject.code || subject.name}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 rounded">
                        {subject.code || 'S/ CÓDIGO'}
                      </span>
                      {subject.period && (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                          {subject.period}º Período
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3 line-clamp-2" title={subject.name}>
                      {subject.name}
                    </h3>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                      {subject.workload?.total && (
                        <span className="flex items-center gap-1.5" title="Carga Horária">
                          <Clock className="w-4 h-4" /> {subject.workload.total}h
                        </span>
                      )}
                      {subject.credits && (
                        <span className="flex items-center gap-1.5" title="Créditos">
                          <BookOpen className="w-4 h-4" /> {subject.credits} cr
                        </span>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => setSelectedDiscipline(subject)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
                      title="Ver Detalhes e Ementa"
                    >
                      <Info className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredSubjects.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Nenhuma disciplina encontrada com esses filtros.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedDiscipline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedDiscipline(null)}>
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 overflow-y-auto max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="inline-block text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 rounded mb-2">
                  {selectedDiscipline.code}
                </span>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  {selectedDiscipline.name}
                </h2>
                <div className="flex gap-3 mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {selectedDiscipline.type && <span>{selectedDiscipline.type}</span>}
                  {selectedDiscipline.period && <span>• {selectedDiscipline.period}º Período</span>}
                </div>
              </div>
              <button 
                onClick={() => setSelectedDiscipline(null)}
                className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                {selectedDiscipline.workload && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">CH Total</p>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{selectedDiscipline.workload.total} horas</p>
                    </div>
                  </div>
                )}
                {selectedDiscipline.credits && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Créditos</p>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{selectedDiscipline.credits}</p>
                    </div>
                  </div>
                )}
              </div>

              {selectedDiscipline.ementa && (
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-wide">Ementa</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {selectedDiscipline.ementa}
                  </p>
                </div>
              )}

              {selectedDiscipline.prerequisites?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-amber-700 dark:text-amber-500 mb-2 uppercase tracking-wide">Pré-requisitos</h4>
                  <ul className="space-y-1">
                    {selectedDiscipline.prerequisites.map((pr: any, i: number) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0"></span>
                        <span>{pr.code} - {pr.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setSelectedDiscipline(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors text-sm"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
