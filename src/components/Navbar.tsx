import React, { useRef } from 'react';
import { ArrowLeft, Sun, Moon, Monitor, Download, Upload } from 'lucide-react';
import { exportAllUserData, importAllUserData } from '../utils/backupHelper';
import { ThemeMode } from '../hooks/useSchedule';

interface NavbarProps {
  setView: (view: 'home' | 'schedule' | 'matriz' | 'disciplines') => void;
  title: string;
  course: string | null;
  darkMode: boolean;
  themePreference: ThemeMode;
  cycleTheme: () => void;
}

export function Navbar({
  setView,
  title,
  course,
  darkMode,
  themePreference,
  cycleTheme
}: NavbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      importAllUserData(e.target.files[0], () => {
        alert("Dados importados com sucesso! Recarregando a aplicação...");
        window.location.reload();
      });
    }
  };

  const getCourseName = () => {
    if (course === 'bcc') return 'Bacharelado em Ciência da Computação';
    if (course === 'eal') return 'Engenharia de Alimentos';
    return '';
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 sticky top-0 z-40 shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        
        {/* Left: Back button + Logo + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setView('home')}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            title="Voltar ao Início"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <img
            src={darkMode ? "/my_ufape_logo_azul.png" : "/my_ufape_logo.png"}
            alt="My UFAPE Logo"
            className="w-8 h-8 object-contain shrink-0"
          />
          
          <div className="hidden sm:block truncate pr-2">
            <h1 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
              My UFAPE
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {title} {getCourseName() && `• ${getCourseName()}`}
            </p>
          </div>
          
          <div className="sm:hidden block truncate">
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {title}
            </h1>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          
          {/* Theme Switcher */}
          <button
            onClick={cycleTheme}
            className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 rounded-lg transition-all"
            title={`Tema atual: ${themePreference === 'system' ? 'Sistema' : themePreference === 'dark' ? 'Escuro' : 'Claro'} (clique para alterar)`}
          >
            {themePreference === 'system' ? (
              <Monitor className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            ) : themePreference === 'dark' ? (
              <Moon className="w-4 h-4 text-amber-300" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>

          {/* Export Button */}
          <button
            onClick={exportAllUserData}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold rounded-lg border border-transparent dark:border-slate-700 transition-all cursor-pointer shadow-xs"
            title="Exportar backup completo"
          >
            <Download className="h-4 w-4" />
            <span className="hidden md:inline">Exportar</span>
          </button>

          {/* Import Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-xs"
            title="Importar backup completo"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden md:inline">Importar</span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportChange}
              className="hidden"
            />
          </button>

        </div>

      </div>
    </header>
  );
}
