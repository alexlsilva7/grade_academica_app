import React, { useState } from 'react';
import { 
  X, Eye, EyeOff, CalendarDays, BookOpen, Layers, 
  Check, Loader2, Sliders, ArrowUp, ArrowDown, Star, AlertTriangle 
} from 'lucide-react';
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

  // Atualizar visibilidade de campos booleanos simples
  const handleToggleModule = async (
    courseId: string,
    field: 'hidden' | 'showSchedule' | 'showDisciplines' | 'showMatriz',
    currentValue: boolean | undefined
  ) => {
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
        onCourseUpdated(courses.map(c => c.id === courseId ? { ...c, ...data.course } : c));
      }
    } catch {
      alert("Falha ao salvar alteração.");
    } finally {
      setUpdatingCourseId(null);
    }
  };

  // Gerenciar semestres (ativar/desativar e ordenar)
  const handleUpdateSemesters = async (course: CourseMeta, newVisibleList: string[]) => {
    setUpdatingCourseId(course.id);
    try {
      const res = await fetch(`/api/courses/${course.id}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibleSemesters: newVisibleList })
      });

      if (res.ok) {
        const data = await res.json();
        onCourseUpdated(courses.map(c => c.id === course.id ? { ...c, ...data.course } : c));
      }
    } catch {
      alert("Erro ao atualizar semestres.");
    } finally {
      setUpdatingCourseId(null);
    }
  };

  // Mover semestre para cima ou para baixo na ordenação
  const handleMoveSemester = (course: CourseMeta, index: number, direction: 'up' | 'down') => {
    const currentList = getActiveVisibleSemesters(course);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const updated = [...currentList];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    handleUpdateSemesters(course, updated);
  };

  // Definir diretamente como o primeiro (Padrão)
  const handleSetDefaultSemester = (course: CourseMeta, semester: string) => {
    const currentList = getActiveVisibleSemesters(course);
    const filtered = currentList.filter(s => s !== semester);
    handleUpdateSemesters(course, [semester, ...filtered]);
  };

  // Alternar se o semestre está visível ou não
  const handleToggleSemesterVisibility = (course: CourseMeta, semester: string) => {
    const currentList = getActiveVisibleSemesters(course);
    const isVisible = currentList.includes(semester);

    let updated: string[];
    if (isVisible) {
      // Remove da lista de visíveis
      updated = currentList.filter(s => s !== semester);
    } else {
      // Adiciona no final da lista
      updated = [...currentList, semester];
    }
    handleUpdateSemesters(course, updated);
  };

  const getActiveVisibleSemesters = (course: CourseMeta): string[] => {
    if (Array.isArray(course.visibleSemesters)) {
      return course.visibleSemesters;
    }
    // Se ainda não configurado, pega todos os semestres disponíveis do curso (mais novos primeiro)
    return course.semesters ? [...course.semesters].reverse() : ['2026.1'];
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
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
                Gerenciar Cursos, Módulos e Semestres
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Escolha quais cursos, módulos e semestres aparecem no app e defina qual abre por padrão.
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
        <div className="p-6 overflow-y-auto space-y-5">
          {courses.map(course => {
            const isHidden = Boolean(course.hidden);
            const showSchedule = course.showSchedule !== false;
            const showDisciplines = course.showDisciplines !== false;
            const showMatriz = course.showMatriz !== false;
            const isProcessing = updatingCourseId === course.id;

            // Todos os semestres que o curso tem no disco
            const allAvailableSemesters = Array.from(new Set([
              ...(course.semesters || ['2026.1']),
              ...(course.visibleSemesters || [])
            ]));

            const visibleSemesters = getActiveVisibleSemesters(course);

            return (
              <div 
                key={course.id}
                className={`p-4 rounded-xl border transition-all ${
                  isHidden
                    ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 shadow-xs'
                }`}
              >
                {/* Linha do Curso */}
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

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleToggleModule(course.id, 'hidden', course.hidden)}
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
                <div className="pt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Botão Horário */}
                    <button
                      type="button"
                      disabled={isProcessing || isHidden}
                      onClick={() => handleToggleModule(course.id, 'showSchedule', course.showSchedule)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                        showSchedule
                          ? 'border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/40 text-slate-400 line-through'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Módulo Horário</span>
                      </div>
                      {showSchedule ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                    </button>

                    {/* Botão Disciplinas */}
                    <button
                      type="button"
                      disabled={isProcessing || isHidden}
                      onClick={() => handleToggleModule(course.id, 'showDisciplines', course.showDisciplines)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
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

                    {/* Botão Matriz */}
                    <button
                      type="button"
                      disabled={isProcessing || isHidden}
                      onClick={() => handleToggleModule(course.id, 'showMatriz', course.showMatriz)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
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

                  {/* Gerenciamento Específico dos Semestres (Quando o Horário está ativo) */}
                  {showSchedule && !isHidden && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Horários Letivos deste Curso:</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          O 1º da lista é o <strong>Padrão</strong>
                        </span>
                      </div>

                      {allAvailableSemesters.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Nenhum semestre cadastrado ainda.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {/* 1. Semestres Visíveis Ordenados */}
                          {visibleSemesters.map((sem, index) => {
                            const isDefault = index === 0;
                            return (
                              <div
                                key={sem}
                                className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSemesterVisibility(course, sem)}
                                    className="p-1 text-emerald-600 hover:text-rose-500 rounded cursor-pointer"
                                    title="Clique para ocultar este semestre"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {sem}
                                  </span>
                                  {isDefault ? (
                                    <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                      <span>Padrão (Abre 1º)</span>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleSetDefaultSemester(course, sem)}
                                      className="text-[10px] text-slate-400 hover:text-amber-500 hover:underline cursor-pointer"
                                    >
                                      Definir como padrão
                                    </button>
                                  )}
                                </div>

                                {/* Botões de Ordenação */}
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => handleMoveSemester(course, index, 'up')}
                                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 cursor-pointer"
                                    title="Mover para cima (prioridade maior)"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={index === visibleSemesters.length - 1}
                                    onClick={() => handleMoveSemester(course, index, 'down')}
                                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 cursor-pointer"
                                    title="Mover para baixo"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* 2. Semestres que existem no disco mas estão Ocultos */}
                          {allAvailableSemesters.filter(s => !visibleSemesters.includes(s)).map(sem => (
                            <div
                              key={sem}
                              className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs opacity-60"
                            >
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSemesterVisibility(course, sem)}
                                  className="p-1 text-slate-400 hover:text-emerald-600 rounded cursor-pointer"
                                  title="Clique para ativar este semestre"
                                >
                                  <EyeOff className="w-4 h-4" />
                                </button>
                                <span className="font-mono text-slate-500 line-through">
                                  {sem}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  (Oculto no app)
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleSemesterVisibility(course, sem)}
                                className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                              >
                                + Exibir
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {visibleSemesters.length === 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Nenhum semestre ativo. O horário não será exibido aos alunos.</span>
                        </div>
                      )}
                    </div>
                  )}
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
