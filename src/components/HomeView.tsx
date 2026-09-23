import React, { useRef, useState, useEffect } from 'react';
import { BookOpen, Sun, Moon, Monitor, Download, Upload, BrainCircuit, CalendarDays, Layers, ArrowRight, ChevronDown, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { exportAllUserData, importAllUserData } from '../utils/backupHelper';
import { canAccessAdmin } from '../utils/domain';
import { CourseMeta } from '../types';

interface HomeViewProps {
  loadPredefinedGrade: (type: string) => void;
  setView: (view: 'home' | 'schedule' | 'matriz' | 'disciplines' | 'admin') => void;
  themePreference: 'light' | 'dark' | 'system';
  cycleTheme: () => void;
  darkMode: boolean;
  selectedCourse: string | null;
  changeCourse: (course: string | null) => void;
  selectedProfile?: string;
  setSelectedProfile?: (p: string) => void;
}

const DEFAULT_COURSES: CourseMeta[] = [
  { id: 'adm', name: 'Administração', shortName: 'ADM', hasCurriculum: true, hasSchedule: true },
  { id: 'bcc', name: 'Ciência da Computação', shortName: 'BCC', hasCurriculum: true, hasSchedule: true, profiles: ['BCC03', 'BCC02'] },
  { id: 'eal', name: 'Engenharia de Alimentos', shortName: 'EAL', hasCurriculum: true, hasSchedule: true, profiles: ['EAL03'] },
  { id: 'medicina-veterinaria', name: 'Medicina Veterinária', shortName: 'MVET', hasCurriculum: true, hasSchedule: true, profiles: ['MVET03', 'MVET02'] },
];

const PLANNED_COURSES = [
  { id: 'agro', name: 'Agronomia' },
  { id: 'cont', name: 'Ciências Contábeis' },
  { id: 'let', name: 'Letras' },
  { id: 'vet', name: 'Medicina Veterinária' },
  { id: 'ped', name: 'Pedagogia' },
  { id: 'zoo', name: 'Zootecnia' }
];

export function HomeView({ 
  loadPredefinedGrade, 
  setView, 
  themePreference, 
  cycleTheme, 
  darkMode, 
  selectedCourse, 
  changeCourse,
  selectedProfile,
  setSelectedProfile
}: HomeViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [courses, setCourses] = useState<CourseMeta[]>(DEFAULT_COURSES);
  const [courseProfiles, setCourseProfiles] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => {
        if (data.courses && Array.isArray(data.courses) && data.courses.length > 0) {
          setCourses(data.courses);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch available profiles for the selected course
  useEffect(() => {
    if (!selectedCourse) {
      setCourseProfiles([]);
      return;
    }

    let isMounted = true;
    fetch(`/api/courses/${selectedCourse}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!isMounted) return;
        const set = new Set<string>();
        if (data) {
          if (Array.isArray(data.course?.profiles)) {
            data.course.profiles.forEach((p: string) => {
              if (p && p.trim() && p.trim().toLowerCase() !== 'optativa' && p.trim().toLowerCase() !== 'sem perfil') {
                set.add(p.trim());
              }
            });
          }
          if (Array.isArray(data.schedule)) {
            data.schedule.forEach((d: any) => {
              if (d.profile && typeof d.profile === 'string' && d.profile.trim() && d.profile.trim().toLowerCase() !== 'optativa' && d.profile.trim().toLowerCase() !== 'sem perfil') {
                set.add(d.profile.trim());
              }
            });
          }
          const curr = Array.isArray(data.curriculum) ? data.curriculum : (data.curriculum?.subjects || []);
          if (Array.isArray(curr)) {
            curr.forEach((s: any) => {
              if (s.profile && typeof s.profile === 'string' && s.profile.trim() && s.profile.trim().toLowerCase() !== 'optativa' && s.profile.trim().toLowerCase() !== 'sem perfil') {
                set.add(s.profile.trim());
              }
            });
          }
        }
        const profilesList = Array.from(set).sort();
        setCourseProfiles(profilesList);

        // Pre-select saved profile if present in localStorage
        try {
          const storedProf = localStorage.getItem(`selected_profile_${selectedCourse}`);
          if (storedProf && storedProf !== 'todos') {
            if (setSelectedProfile && (storedProf === 'all' || profilesList.includes(storedProf))) {
              setSelectedProfile(storedProf);
            }
          }
        } catch {}
      })
      .catch(() => {
        if (isMounted) setCourseProfiles([]);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCourse]);

  const handleProfileChange = (val: string) => {
    if (setSelectedProfile) {
      setSelectedProfile(val);
    }
    if (selectedCourse) {
      try {
        localStorage.setItem(`selected_profile_${selectedCourse}`, val);
        localStorage.setItem('saved_selectedProfile', val);
      } catch (e) {
        console.error('Failed to save selected profile', e);
      }
    }
  };

  const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  const handleDeleteCourseFromHome = async () => {
    if (!selectedCourse) return;
    setIsDeletingCourse(true);
    try {
      const res = await fetch(`/api/courses/${selectedCourse}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Clear saved localStorage data for this course
        try {
          localStorage.removeItem(`schedule_${selectedCourse}`);
          localStorage.removeItem(`selected_profile_${selectedCourse}`);
          localStorage.removeItem(`disciplines_selectedProfile_${selectedCourse}`);
          localStorage.removeItem(`matrix_version_${selectedCourse}`);
          localStorage.removeItem('selectedCourse');
        } catch {}

        setShowDeleteCourseModal(false);
        changeCourse(null);

        // Refresh courses list
        fetch('/api/courses')
          .then(r => r.json())
          .then(data => {
            if (data.courses && Array.isArray(data.courses)) {
              setCourses(data.courses);
            }
          })
          .catch(() => {});
      } else {
        const err = await res.json();
        alert(err.error || "Não foi possível excluir o curso.");
        setShowDeleteCourseModal(false);
      }
    } catch {
      alert("Erro de conexão ao excluir o curso.");
      setShowDeleteCourseModal(false);
    } finally {
      setIsDeletingCourse(false);
    }
  };

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      importAllUserData(e.target.files[0], () => {
        alert("Dados importados com sucesso! Recarregando a aplicação...");
        window.location.reload();
      });
    }
  };

  const currentCourseMeta = courses.find(c => 
    c.id === selectedCourse || 
    (selectedCourse === 'engenharia-de-alimentos' && c.id === 'eal') ||
    (selectedCourse === 'eal' && c.id === 'engenharia-de-alimentos') ||
    (selectedCourse === 'mvet' && c.id === 'medicina-veterinaria') ||
    (selectedCourse === 'medicina-veterinaria' && c.id === 'mvet')
  );
  const hasCurriculum = currentCourseMeta?.hasCurriculum ?? (selectedCourse === 'bcc' || selectedCourse === 'eal' || selectedCourse === 'engenharia-de-alimentos' || selectedCourse === 'medicina-veterinaria' || selectedCourse === 'adm');
  const courseDisplayName = currentCourseMeta ? currentCourseMeta.name : (
    selectedCourse === 'bcc' ? 'Ciência da Computação' :
    selectedCourse === 'adm' ? 'Administração' :
    (selectedCourse === 'eal' || selectedCourse === 'engenharia-de-alimentos') ? 'Engenharia de Alimentos' :
    (selectedCourse === 'medicina-veterinaria' || selectedCourse === 'mvet') ? 'Medicina Veterinária' :
    selectedCourse?.toUpperCase() || 'Curso Selecionado'
  );

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
                {/* Active and Registered Courses */}
                {courses.map(course => (
                  <button 
                    key={course.id}
                    onClick={() => changeCourse(course.id)}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl transition-all text-left shadow-sm group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 text-sm">
                        {course.name}
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded font-mono">
                        {course.shortName}
                      </span>
                    </div>
                  </button>
                ))}

                {/* Planned Courses that are not yet active */}
                {PLANNED_COURSES.filter(p => !courses.some(c => c.id === p.id)).map(planned => (
                  <button 
                    key={planned.id}
                    disabled 
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-left opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50"
                  >
                    <div className="font-medium text-slate-700 dark:text-slate-200 text-sm">{planned.name}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Em breve</div>
                  </button>
                ))}
              </div>

              {canAccessAdmin() && (
                <button 
                  onClick={() => setView('admin')}
                  className="w-full p-4 border border-dashed border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 rounded-xl transition-all text-left group flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <BrainCircuit className="w-5 h-5 text-indigo-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-indigo-700 dark:text-indigo-400 text-sm">
                        Gerenciador & Importador IA de Cursos
                      </div>
                      <div className="text-xs text-slate-400">
                        Importe novos cursos com Gemini, edite grades e gerencie arquivos JSON
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-start w-full transition-all animate-in fade-in zoom-in-95">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full mb-8 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {courseDisplayName}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => changeCourse(null)} className="text-sm text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline text-left cursor-pointer">
                        Alterar curso
                      </button>
                      {canAccessAdmin() && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <button
                            type="button"
                            onClick={() => setShowDeleteCourseModal(true)}
                            className="text-sm text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:underline text-left cursor-pointer flex items-center gap-1 font-medium"
                            title="Excluir este curso do sistema"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir curso</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile selection dropdown if course has more than one profile */}
                {courseProfiles.length > 1 && (
                  <div className="flex flex-col sm:items-end gap-1.5 w-full sm:w-auto bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs animate-in fade-in">
                    <label htmlFor="course-profile-select" className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Perfil Curricular:</span>
                    </label>
                    <div className="relative w-full sm:w-auto">
                      <select
                        id="course-profile-select"
                        value={selectedProfile || 'all'}
                        onChange={(e) => handleProfileChange(e.target.value)}
                        className="w-full sm:w-auto min-w-[210px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-bold text-sm rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs transition-colors appearance-none"
                      >
                        <option value="all">Todos os Perfis ({courseProfiles.length})</option>
                        {courseProfiles.map(p => (
                          <option key={p} value={p}>
                            Perfil: {p}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Card: Horário Letivo */}
                <button 
                  onClick={() => loadPredefinedGrade(selectedCourse)}
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
                  onClick={() => hasCurriculum ? setView('matriz') : alert('A matriz interativa com fluxograma e progresso está em desenvolvimento para este curso. Você pode consultar as disciplinas disponíveis na aba Disciplinas.')}
                  className={`w-full p-6 text-left border rounded-2xl flex flex-col justify-between h-full transition-all duration-300 ${
                    hasCurriculum
                      ? 'border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-800 hover:bg-violet-50/20 dark:hover:bg-violet-950/10 shadow-sm hover:shadow-md hover:-translate-y-1 group bg-white dark:bg-slate-900 cursor-pointer'
                      : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between w-full mb-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        hasCurriculum
                          ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 group-hover:scale-110'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        <Layers className="w-6 h-6" />
                      </div>
                    </div>
                    <h3 className="font-bold text-lg tracking-tight text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      Matriz Curricular
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {hasCurriculum
                        ? 'Visualize a estrutura curricular de forma organizada por períodos letivos.'
                        : 'Visualização da árvore de pré-requisitos e fluxograma curricular.'}
                    </p>
                  </div>
                  
                  <div className="mt-5 flex items-center text-xs font-semibold text-violet-600 dark:text-violet-400 gap-1 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                    <span>{hasCurriculum ? 'Visualizar Grade' : 'Ver Matriz'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>

                {canAccessAdmin() && (
                  <button 
                    onClick={() => setView('admin')}
                    className="w-full p-6 border border-dashed border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl transition-all text-left shadow-sm group flex flex-col gap-2 md:col-span-3 cursor-pointer"
                  >
                    <h3 className="font-semibold text-indigo-700 dark:text-indigo-400 text-lg flex items-center gap-2">
                      <BrainCircuit className="w-5 h-5 text-indigo-500 shrink-0 animate-pulse" />
                      <span>Painel do Administrador (Manipulação e IA)</span>
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Importe e manipule matrizes curriculares e horários com Inteligência Artificial, edite diretamente e salve no repositório.
                    </p>
                  </button>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
      {/* MODAL: CONFIRM DELETE ACTIVE COURSE IN HOME */}
      {showDeleteCourseModal && selectedCourse && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isDeletingCourse && setShowDeleteCourseModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Excluir Curso Ativo
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta ação não pode ser desfeita
                </p>
              </div>
            </div>

            <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3.5 text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
              Tem certeza que deseja excluir o curso <strong>{courseDisplayName}</strong>? Todas as disciplinas cadastradas, horários letivos e arquivos do curso serão permanentemente excluídos.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingCourse}
                onClick={() => setShowDeleteCourseModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingCourse}
                onClick={handleDeleteCourseFromHome}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingCourse ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sim, Excluir Curso</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
