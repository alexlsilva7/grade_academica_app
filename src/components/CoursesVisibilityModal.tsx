import React, { useState } from 'react';
import { X, Eye, EyeOff, CalendarDays, BookOpen, Layers, Check, Loader2, Sliders } from 'lucide-react';
import { CourseMeta } from '../types';

interface CoursesVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: CourseMeta[];
  onCourseUpdated: (updatedCourses: CourseMeta[]) => void;
}

export function CoursesVisibilityModal({
  isOpen,
  onClose,
  courses,
  onCourseUpdated
}: CoursesVisibilityModalProps) {
  const [updatingCourseId, setUpdatingCourseId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggle = async (
    courseId: string,
    field: 'hidden' | 'showSchedule' | 'showDisciplines' | 'showMatriz',
    currentValue: boolean | undefined
  ) => {
    // Para 'hidden', padrão é false se indefinido. Para os módulos, padrão é true se indefinido.
    const defaultVal = field === 'hidden' ? false : true;
    const actualCurrent = currentValue !== undefined ? currentValue : defaultVal;
    const newValue = !actualCurrent;

    setUpdatingCourseId(courseId);

    try {
      const res = await fetch(`/api/courses/${courseId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue })
      });

      if (res.ok) {
        const data = await res.json();
        const updatedList = courses.map(c => c.id === courseId ? { ...c, ...data.course } : c);
        onCourseUpdated(updatedList);
      } else {
        alert("Erro ao salvar alteração.");
      }
    } catch {
      alert("Falha de conexão com o servidor local.");
    } finally {
      setUpdatingCourseId(null);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Gerenciar Visibilidade dos Cursos e Módulos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Oculte cursos da tela inicial ou desative módulos específicos (Horário, Disciplinas, Matriz).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Cursos */}
        <div className="p-6 overflow-y-auto space-y-4">
          {courses.map(course => {
            const isHidden = Boolean(course.hidden);
            const showSchedule = course.showSchedule !== false;
            const showDisciplines = course.showDisciplines !== false;
            const showMatriz = course.showMatriz !== false;
            const isProcessing = updatingCourseId === course.id;

            return (
              <div 
                key={course.id}
                className={`p-4 rounded-xl border transition-all ${
                  isHidden
                    ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 shadow-xs'
                }`}
              >
                {/* Linha Principal do Curso */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {course.shortName}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {course.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        ID: <code className="font-mono">{course.id}</code>
                      </p>
                    </div>
                  </div>

                  {/* Toggle Geral: Curso Ativo / Oculto */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleToggle(course.id, 'hidden', course.hidden)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isHidden
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                    }`}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isHidden ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    <span>{isHidden ? 'Curso Oculto' : 'Curso Visível'}</span>
                  </button>
                </div>

                {/* Sub-itens: Horário, Disciplinas, Matriz */}
                <div className="pt-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Módulos visíveis para este curso:
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Módulo Horário */}
                    <button
                      type="button"
                      disabled={isProcessing || isHidden}
                      onClick={() => handleToggle(course.id, 'showSchedule', course.showSchedule)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                        showSchedule
                          ? 'border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/40 text-slate-400 line-through'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Horário</span>
                      </div>
                      {showSchedule ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                    </button>

                    {/* Módulo Disciplinas */}
                    <button
                      type="button"
                      disabled={isProcessing || isHidden}
                      onClick={() => handleToggle(course.id, 'showDisciplines', course.showDisciplines)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                        showDisciplines
                          ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/40 text-slate-400 line-through'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Disciplinas</span>
                      </div>
                      {showDisciplines ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                    </button>

                    {/* Módulo Matriz */}
                    <button
                      type="button"
                      disabled={isProcessing || isHidden}
                      onClick={() => handleToggle(course.id, 'showMatriz', course.showMatriz)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                        showMatriz
                          ? 'border-violet-200 dark:border-violet-800/80 bg-violet-50/60 dark:bg-violet-950/30 text-violet-900 dark:text-violet-200'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/40 text-slate-400 line-through'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-violet-500" />
                        <span>Matriz</span>
                      </div>
                      {showMatriz ? <Check className="w-3.5 h-3.5 text-violet-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl transition-all cursor-pointer hover:opacity-90"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
