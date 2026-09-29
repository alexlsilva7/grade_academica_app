import React from 'react';
import { Sparkles, Trash2, Loader2, X, Calendar, BookOpen } from 'lucide-react';
import { CourseMeta } from '../../types';

export interface CourseSelectorProps {
  courses: CourseMeta[];
  selectedCourseId: string;
  courseName: string;
  courseShortName: string;
  scheduleTitle?: string;
  isCreatingNewCourse: boolean;
  isLoadingCourse: boolean;
  activeMode: 'curriculum' | 'schedule';
  disciplinesCount: number;
  curriculumCount: number;
  onSelectCourse: (courseId: string) => void;
  onStartCreateCourse: () => void;
  onCancelCreateCourse: () => void;
  onChangeCourseName: (name: string) => void;
  onChangeCourseShortName: (shortName: string) => void;
  onChangeScheduleTitle?: (title: string) => void;
  onRequestDeleteCourse: () => void;
  onSetMode: (mode: 'curriculum' | 'schedule') => void;
}

export function CourseSelector({
  courses,
  selectedCourseId,
  courseName,
  courseShortName,
  scheduleTitle,
  isCreatingNewCourse,
  isLoadingCourse,
  activeMode,
  disciplinesCount,
  curriculumCount,
  onSelectCourse,
  onStartCreateCourse,
  onCancelCreateCourse,
  onChangeCourseName,
  onChangeCourseShortName,
  onChangeScheduleTitle,
  onRequestDeleteCourse,
  onSetMode
}: CourseSelectorProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Curso Ativo:
          </span>
          
          {!isCreatingNewCourse ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    onStartCreateCourse();
                  } else {
                    onSelectCourse(e.target.value);
                  }
                }}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.shortName})
                  </option>
                ))}
                <option value="__new__">+ Cadastrar Novo Curso...</option>
              </select>

              <input
                type="text"
                aria-label="Nome do curso"
                placeholder="Nome do curso"
                value={courseName}
                onChange={(e) => onChangeCourseName(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 w-52 sm:w-64"
                title="Editar nome do curso; clique em Salvar no Projeto para gravar"
              />

              {isLoadingCourse && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}

              {selectedCourseId && (
                <button
                  type="button"
                  onClick={onRequestDeleteCourse}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  title={`Excluir o curso ${courseName}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Excluir Curso</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 px-2 py-1 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">Novo Curso</span>
              </div>

              <input
                type="text"
                placeholder="Nome Oficial do Curso (ex: Medicina Veterinária)"
                value={courseName}
                onChange={(e) => onChangeCourseName(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 w-52 sm:w-64"
                title="Nome oficial do curso"
              />
              <input
                type="text"
                placeholder="Sigla (ex: MVET)"
                value={courseShortName}
                onChange={(e) => onChangeCourseShortName(e.target.value)}
                className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 uppercase text-center"
                title="Sigla do curso"
              />
              {scheduleTitle !== undefined && onChangeScheduleTitle && (
                <input
                  type="text"
                  placeholder="Título da Grade (ex: Horário 2026.1)"
                  value={scheduleTitle}
                  onChange={(e) => onChangeScheduleTitle(e.target.value)}
                  className="hidden lg:inline-block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 w-60"
                  title="Título descritivo da grade semestral"
                />
              )}
              <button
                type="button"
                onClick={onCancelCreateCourse}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Cancelar cadastro de novo curso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start md:self-auto">
          <button
            type="button"
            onClick={() => onSetMode('schedule')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'schedule'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Horário Semestral ({disciplinesCount} turmas)</span>
          </button>

          <button
            type="button"
            onClick={() => onSetMode('curriculum')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'curriculum'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Catálogo Curricular ({curriculumCount} matérias)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
