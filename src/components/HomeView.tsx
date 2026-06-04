import React, { useRef } from 'react';
import { BookOpen, Sun, Moon, Monitor, Download, Upload, BrainCircuit, CalendarDays, Layers, ArrowRight } from 'lucide-react';
import { exportAllUserData, importAllUserData } from '../utils/backupHelper';
import { isProduction } from '../utils/domain';

interface HomeViewProps {
  loadPredefinedGrade: (type: 'bcc' | 'eal' | 'adm') => void;
  setView: (view: 'home' | 'schedule' | 'matriz' | 'disciplines' | 'admin') => void;
  themePreference: 'light' | 'dark' | 'system';
  cycleTheme: () => void;
  darkMode: boolean;
  selectedCourse: string | null;
  changeCourse: (course: string | null) => void;
}

export function HomeView({ 
  loadPredefinedGrade, 
  setView,
  themePreference,
  cycleTheme,
  darkMode,
  selectedCourse,
  changeCourse
}: HomeViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      importAllUserData(e.target.files[0], () => {
        alert("Dados importados com sucesso! Recarregando a aplicação...");
        window.location.reload();
      });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex flex-col items-center p-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] overflow-y-auto duration-300 transition-colors">
      
      {/* Top right actions */}
      <div className="absolute top-6 right-6 flex items-center gap-2 z-10 animate-in fade-in duration-500">
        
        {/* Export Button */}
        <button
          onClick={exportAllUserData}
          className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all cursor-pointer"
          title="Exportar backup completo"
        >
          <Download className="w-5 h-5" />
        </button>

        {/* Import Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all cursor-pointer"
          title="Importar backup completo"
        >
          <Upload className="w-5 h-5" />
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleImportChange}
            className="hidden"
          />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={cycleTheme}
          className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all"
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
      </div>

      <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 py-12">
        <div className="text-center space-y-4">
          <img 
            src={darkMode ? "/my_ufape_logo_azul.png" : "/my_ufape_logo.png"} 
            alt="My UFAPE Logo" 
            className="w-24 h-24 mx-auto object-contain drop-shadow-md" 
          />
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-50">My UFAPE</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">Seu assistente acadêmico para o planejamento e acompanhamento curricular</p>
        </div>

        <div className="flex flex-col gap-8 mt-12 w-full mx-auto max-w-4xl">
          {!selectedCourse ? (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-start w-full transition-all animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Selecione seu curso</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Escolha seu curso para ver o horário letivo e matriz.</p>
                </div>
              </div>
              
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <button 
                  onClick={() => changeCourse('adm')}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl transition-all text-left shadow-sm group"
                >
                  <div className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 text-sm">
                    Administração
                  </div>
                </button>
                
                <button disabled className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-left opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50">
                  <div className="font-medium text-slate-700 dark:text-slate-200 text-sm">Agronomia</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Em breve</div>
                </button>
                
                <button disabled className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-left opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50">
                  <div className="font-medium text-slate-700 dark:text-slate-200 text-sm">Ciências Contábeis</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Em breve</div>
                </button>

                <button 
                  onClick={() => changeCourse('bcc')}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl transition-all text-left shadow-sm group"
                >
                  <div className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 text-sm">
                    Ciência da Computação
                  </div>
                </button>
                
                <button 
                  onClick={() => changeCourse('eal')}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl transition-all text-left shadow-sm group"
                >
                  <div className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 text-sm">
                    Engenharia de Alimentos
                  </div>
                </button>

                <button disabled className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-left opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50">
                  <div className="font-medium text-slate-700 dark:text-slate-200 text-sm">Letras</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Em breve</div>
                </button>

                <button disabled className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-left opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50">
                  <div className="font-medium text-slate-700 dark:text-slate-200 text-sm">Medicina Veterinária</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Em breve</div>
                </button>

                <button disabled className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-left opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50">
                  <div className="font-medium text-slate-700 dark:text-slate-200 text-sm">Pedagogia</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Em breve</div>
                </button>

                <button disabled className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-left opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50">
                  <div className="font-medium text-slate-700 dark:text-slate-200 text-sm">Zootecnia</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Em breve</div>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-start w-full transition-all animate-in fade-in zoom-in-95">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between w-full mb-8 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {selectedCourse === 'bcc' 
                        ? 'Ciência da Computação' 
                        : selectedCourse === 'eal' 
                          ? 'Engenharia de Alimentos' 
                          : selectedCourse === 'adm'
                            ? 'Administração'
                            : 'Curso Selecionado'}
                    </h2>
                    <button onClick={() => changeCourse(null)} className="text-sm text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 mt-1 hover:underline text-left">
                      Alterar curso
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Card: Horário Letivo */}
                <button 
                  onClick={() => loadPredefinedGrade(selectedCourse as 'bcc' | 'eal' | 'adm')}
                  className="w-full p-6 text-left border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between h-full bg-white dark:bg-slate-900 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between w-full mb-5">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                        <CalendarDays className="w-6 h-6" />
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 text-lg tracking-tight transition-colors">
                      Horário Letivo
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      Monte sua grade horária personalizada com as turmas ofertadas este semestre.
                    </p>
                  </div>
                  
                  <div className="mt-5 flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 gap-1 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                    <span>Montar Grade</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
                
                {/* Card: Disciplinas */}
                <button 
                  onClick={() => setView('disciplines')}
                  className="w-full p-6 text-left border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between h-full bg-white dark:bg-slate-900 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between w-full mb-5">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                        <BookOpen className="w-6 h-6" />
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 text-lg tracking-tight transition-colors">
                      Disciplinas
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      Consulte a lista completa de disciplinas, ementas e pré-requisitos do curso.
                    </p>
                  </div>
                  
                  <div className="mt-5 flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 gap-1 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                    <span>Consultar Catálogo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>

                {/* Card: Matriz */}
                <button 
                  onClick={() => selectedCourse === 'bcc' ? setView('matriz') : alert('Matriz ainda não disponível para este curso.')}
                  disabled={selectedCourse !== 'bcc'}
                  className={`w-full p-6 text-left border rounded-2xl flex flex-col justify-between h-full transition-all duration-300 ${
                    selectedCourse === 'bcc' 
                      ? 'border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-800 hover:bg-violet-50/20 dark:hover:bg-violet-950/10 shadow-sm hover:shadow-md hover:-translate-y-1 group bg-white dark:bg-slate-900 cursor-pointer'
                      : 'border-slate-200 dark:border-slate-900 opacity-60 bg-slate-50/60 dark:bg-slate-905/30 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between w-full mb-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        selectedCourse === 'bcc'
                          ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 group-hover:scale-110'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        <Layers className="w-6 h-6" />
                      </div>
                    </div>
                    <h3 className={`font-bold text-lg tracking-tight transition-colors ${
                      selectedCourse === 'bcc' 
                        ? 'text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400' 
                        : 'text-slate-400 dark:text-slate-600'
                    }`}>
                      Matriz Curricular
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {selectedCourse === 'bcc' 
                        ? 'Visualize a estrutura curricular de forma organizada por períodos letivos.'
                        : 'A matriz curricular interativa para este curso estará disponível em breve.'}
                    </p>
                  </div>
                  
                  {selectedCourse === 'bcc' ? (
                    <div className="mt-5 flex items-center text-xs font-semibold text-violet-600 dark:text-violet-400 gap-1 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                      <span>Visualizar Grade</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="mt-5 text-xs text-slate-450 dark:text-slate-500">
                      Indisponível
                    </div>
                  )}
                </button>

                {!isProduction() && (
                  <button 
                    onClick={() => setView('admin')}
                    className="w-full p-6 border border-dashed border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl transition-all text-left shadow-sm group flex flex-col gap-2 md:col-span-3 cursor-pointer"
                  >
                    <h3 className="font-semibold text-indigo-700 dark:text-indigo-400 text-lg flex items-center gap-2">
                      <BrainCircuit className="w-5 h-5 text-indigo-500 shrink-0 animate-pulse" />
                      <span>Painel do Administrador (IA Extração)</span>
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Cole ementas ou PPCs brutos de qualquer curso. Extraia o currículo completo de disciplinas e horários com Inteligência Artificial, edite e guarde permanentemente no servidor.
                    </p>
                  </button>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
