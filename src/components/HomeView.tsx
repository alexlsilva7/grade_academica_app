import React from 'react';
import { BookOpen, FileText, Upload, Plus, Trash2, Clock, Sun, Moon, Monitor } from 'lucide-react';
import { SavedGrade } from '../hooks/useSchedule';

interface HomeViewProps {
  loadPredefinedGrade: (type: 'bcc' | 'eal') => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessingPdf: boolean;
  hasApiKey: boolean;
  savedGrades: SavedGrade[];
  loadSavedGrade: (grade: SavedGrade) => void;
  removeSavedGrade: (id: string) => void;
  themePreference: 'light' | 'dark' | 'system';
  cycleTheme: () => void;
}

export function HomeView({ 
  loadPredefinedGrade, 
  handleFileUpload, 
  isProcessingPdf, 
  hasApiKey,
  savedGrades,
  loadSavedGrade,
  removeSavedGrade,
  themePreference,
  cycleTheme
}: HomeViewProps) {
  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex flex-col items-center p-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] overflow-y-auto duration-300 transition-colors">
      
      {/* Theme Toggle Button */}
      <button
        onClick={cycleTheme}
        className="absolute top-6 right-6 flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all z-10"
        title={`Tema atual: ${themePreference === 'system' ? 'Sistema' : themePreference === 'dark' ? 'Escuro' : 'Claro'} (clique para alterar)`}
      >
        {themePreference === 'system' ? (
          <Monitor className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        ) : themePreference === 'dark' ? (
          <Moon className="w-5 h-5 text-amber-300" />
        ) : (
          <Sun className="w-5 h-5 text-amber-500" />
        )}
      </button>

      <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 py-12">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-600 dark:bg-indigo-700 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto shadow-lg shadow-indigo-200 dark:shadow-none animate-bounce">
            G
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Grade Acadêmica</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">Monte seu horário perfeito de forma simples e visual.</p>
        </div>

        <div className="grid gap-6 mt-12 w-full mx-auto md:grid-cols-2 max-w-4xl">
          {/* Imported/Saved Grades - Only show if there are any */}
          {savedGrades.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-start text-left md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Suas Grades Importadas</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Grades que você importou e estão salvas no seu navegador.</p>
                </div>
              </div>
              
              <div className="w-full grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {savedGrades.map(grade => (
                  <div key={grade.id} className="relative group flex items-stretch">
                    <button 
                      onClick={() => loadSavedGrade(grade)}
                      className="flex-1 p-4 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 rounded-xl transition-all text-left group overflow-hidden min-w-0"
                    >
                      <div className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 text-sm truncate w-full pr-8" title={grade.title}>
                        {grade.title}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{grade.disciplines.length} disciplinas</div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSavedGrade(grade.id);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/45 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Excluir Grade"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Predefined Grades */}
          <div className={`bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-start text-left h-full ${!hasApiKey && savedGrades.length === 0 ? 'col-span-2 max-w-md mx-auto w-full' : ''}`}>
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Grades Pré-cadastradas</h2>
            <p className="text-sm text-slate-500 dark:text-slate-405 mb-6 flex-1">Comece com uma grade de disciplinas pré-cadastrada no sistema.</p>
            
            <div className="w-full space-y-3">
              <button 
                onClick={() => loadPredefinedGrade('bcc')}
                className="w-full p-4 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-550 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-all text-left group"
              >
                <div className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 text-sm">
                  BCC - Ciência da Computação
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Período 2026.1</div>
              </button>
              
              <button 
                onClick={() => loadPredefinedGrade('eal')}
                className="w-full p-4 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-550 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-all text-left group"
              >
                <div className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 text-sm">
                  EAL - Engenharia de Alimentos
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Período 2026.1</div>
              </button>
            </div>
          </div>

          {/* Import PDF */}
          {hasApiKey && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-start text-left relative overflow-hidden">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                id="home-pdf-upload"
                onChange={handleFileUpload}
              />
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Importar Nova</h2>
              <p className="text-sm text-slate-500 dark:text-slate-405 mb-6 flex-1">A IA do Gemini extrai os dados do seu PDF automaticamente.</p>
              
              <label 
                htmlFor="home-pdf-upload"
                className={`w-full p-4 border border-dashed border-slate-300 dark:border-slate-755 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-2 ${
                  isProcessingPdf 
                  ? 'bg-slate-50 dark:bg-slate-800 cursor-wait' 
                  : 'hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 cursor-pointer group'
                }`}
              >
                {isProcessingPdf ? (
                  <>
                    <Upload className="w-5 h-5 text-indigo-400 animate-bounce" />
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 animate-pulse">Processando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors animate-pulse" />
                    <span className="text-sm text-slate-600 dark:text-slate-300 font-medium group-hover:text-indigo-700 dark:group-hover:text-indigo-405">Selecionar PDF</span>
                  </>
                )}
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
