import React, { useRef } from 'react';
import { BookOpen, Sun, Moon, Monitor, Download, Upload } from 'lucide-react';
import { exportAllUserData, importAllUserData } from '../utils/backupHelper';

interface HomeViewProps {
  loadPredefinedGrade: (type: 'bcc' | 'eal') => void;
  setView: (view: 'home' | 'schedule' | 'matriz') => void;
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
            className="w-24 h-24 mx-auto object-contain drop-shadow-md animate-bounce" 
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
                <button disabled className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-left opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50">
                  <div className="font-medium text-slate-700 dark:text-slate-200 text-sm">Administração</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Em breve</div>
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
                      {selectedCourse === 'bcc' ? 'Ciência da Computação' : selectedCourse === 'eal' ? 'Engenharia de Alimentos' : 'Curso Selecionado'}
                    </h2>
                    <button onClick={() => changeCourse(null)} className="text-sm text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 mt-1 hover:underline text-left">
                      Alterar curso
                    </button>
                  </div>
                </div>
                
                <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:w-auto p-2.5 cursor-pointer transition-colors outline-none font-medium">
                  <option value="2026.1" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">2026.1</option>
                </select>
              </div>
              
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <button 
                  onClick={() => loadPredefinedGrade(selectedCourse as 'bcc' | 'eal')}
                  className="w-full p-6 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl transition-all text-left shadow-sm group flex flex-col gap-2"
                >
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 text-lg">
                    Horário Letivo
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Monte seu horário com as disciplinas ofertadas este semestre.</p>
                </button>
                
                <button disabled className="w-full p-6 border border-slate-200 dark:border-slate-800 rounded-xl text-left opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-2">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-lg">Disciplinas</h3>
                  <p className="text-sm text-slate-400 dark:text-slate-500">Em breve</p>
                </button>
                
                <button disabled className="w-full p-6 border border-slate-200 dark:border-slate-800 rounded-xl text-left opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-2">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-lg">Perfil curricular</h3>
                  <p className="text-sm text-slate-400 dark:text-slate-500">Em breve</p>
                </button>

                <button 
                  onClick={() => selectedCourse === 'bcc' ? setView('matriz') : alert('Matriz ainda não disponível para este curso.')}
                  className={`w-full p-6 border rounded-xl text-left flex flex-col gap-2 transition-all ${
                    selectedCourse === 'bcc' 
                      ? 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 shadow-sm group cursor-pointer'
                      : 'border-slate-200 dark:border-slate-800 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50'
                  }`}
                >
                  <h3 className={`font-semibold text-lg ${
                    selectedCourse === 'bcc' ? 'text-slate-800 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400' : 'text-slate-700 dark:text-slate-200'
                  }`}>Matriz</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedCourse === 'bcc' ? 'Explore visualmente a grelha curricular do seu curso.' : 'Em breve'}
                  </p>
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
