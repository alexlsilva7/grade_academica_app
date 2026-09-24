import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Sun, Moon, Monitor, Download, Upload, MoreVertical, Camera } from 'lucide-react';
import { exportAllUserData, importAllUserData } from '../utils/backupHelper';
import { ThemeMode } from '../hooks/useSchedule';

interface NavbarProps {
  setView: (view: 'home' | 'schedule' | 'matriz' | 'disciplines') => void;
  title: string;
  course: string | null;
  courseName?: string;
  darkMode: boolean;
  themePreference: ThemeMode;
  cycleTheme: () => void;
  showAcademicPeriod?: boolean;
  semesters?: string[];
  selectedSemester?: string;
  onSemesterChange?: (sem: string) => void;
  onExportImage?: () => void;
}

export function Navbar({
  setView,
  title,
  course,
  courseName,
  darkMode,
  themePreference,
  cycleTheme,
  showAcademicPeriod,
  semesters,
  selectedSemester,
  onSemesterChange,
  onExportImage
}: NavbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      importAllUserData(e.target.files[0], () => {
        alert("Dados importados com sucesso! Recarregando a aplicação...");
        window.location.reload();
      });
    }
  };

  const getCourseName = () => {
    if (courseName && courseName.trim().length > 0) return courseName;
    if (!course) return '';
    const c = course.toLowerCase();
    if (c === 'bcc' || c.includes('computacao') || c.includes('computação')) return 'Ciência da Computação';
    if (c === 'eal' || c === 'engenharia-de-alimentos' || c.includes('alimento')) return 'Engenharia de Alimentos';
    if (c === 'adm' || c === 'administracao' || c.includes('administra')) return 'Administração';
    if (c === 'mvet' || c === 'vet' || c === 'medicina-veterinaria' || c.includes('veterin')) return 'Medicina Veterinária';
    return course;
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
            <h1 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
              {title}
            </h1>
            {getCourseName() && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {getCourseName()}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          
          {showAcademicPeriod && (
            <select 
              value={selectedSemester || "2026.1"}
              onChange={(e) => onSemesterChange?.(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 cursor-pointer transition-colors outline-none font-bold h-9"
            >
              {(semesters && semesters.length > 0 ? semesters : ["2026.1", "2026.2"]).map(s => (
                <option key={s} value={s} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {s}
                </option>
              ))}
            </select>
          )}
          
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

          {/* Menu Mais Opções (Exportar / Importar) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(prev => !prev)}
              className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 rounded-lg transition-all cursor-pointer"
              title="Mais opções"
              aria-label="Mais opções"
              aria-expanded={isMenuOpen}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {onExportImage && (
                  <>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onExportImage();
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Camera className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Salvar como Imagem</span>
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                  </>
                )}

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    exportAllUserData();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Exportar Dados</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Upload className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span>Importar Dados</span>
                </button>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportChange}
              className="hidden"
            />
          </div>

        </div>

      </div>
    </header>
  );
}
