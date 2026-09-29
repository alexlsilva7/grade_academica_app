import React from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import { Discipline, CurriculumSubject, DayOfWeek } from '../../types';

export interface ReviewTableTabProps {
  activeMode: 'curriculum' | 'schedule';
  activeProfiles: string[];
  filterProfile: string;
  setFilterProfile: (profile: string) => void;
  curriculumSubjects: CurriculumSubject[];
  filteredCurriculum: CurriculumSubject[];
  disciplines: Discipline[];
  filteredSchedule: Discipline[];
  days: { id: DayOfWeek; name: string }[];
  onStartEditCurriculum: (index: number, sub: CurriculumSubject) => void;
  onDeleteCurriculumItem: (index: number) => void;
  onStartEditSchedule: (index: number, disc: Discipline) => void;
  onDeleteScheduleItem: (index: number) => void;
}

export function ReviewTableTab({
  activeMode,
  activeProfiles,
  filterProfile,
  setFilterProfile,
  curriculumSubjects,
  filteredCurriculum,
  disciplines,
  filteredSchedule,
  days,
  onStartEditCurriculum,
  onDeleteCurriculumItem,
  onStartEditSchedule,
  onDeleteScheduleItem
}: ReviewTableTabProps) {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Profile Quick Pill Filter Bar */}
      {activeProfiles.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase px-1">
            Filtrar Perfil:
          </span>
          <button
            type="button"
            onClick={() => setFilterProfile('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterProfile === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Todos ({activeMode === 'curriculum' ? curriculumSubjects.length : disciplines.length})
          </button>
          {activeProfiles.map(p => {
            const count = (activeMode === 'curriculum' ? curriculumSubjects : disciplines).filter(x => x.profile === p).length;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setFilterProfile(p)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterProfile === p
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>Perfil {p}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filterProfile === p ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* CURRICULUM SUBJECTS TABLE */}
      {activeMode === 'curriculum' ? (
        <div className="overflow-x-auto">
          {filteredCurriculum.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs sm:text-sm">
              Nenhuma disciplina encontrada no catálogo curricular. Use a extração com IA ou adicione manualmente.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Disciplina</th>
                  <th className="py-2.5 px-3">Período</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">C.H. / Créditos</th>
                  <th className="py-2.5 px-3">Pré-requisitos</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredCurriculum.map((sub, idx) => {
                  const realIndex = curriculumSubjects.indexOf(sub);
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {sub.code || '-'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{sub.name}</div>
                          {sub.profile && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded font-semibold text-[10px] shrink-0 font-mono">
                              {sub.profile}
                            </span>
                          )}
                        </div>
                        {sub.ementa && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {sub.ementa}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium text-[10px]">
                          {sub.period == null ? 'Não informado' : sub.period === 'Optativa' || sub.period === 0 ? 'Optativa' : `${sub.period}º Período`}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          sub.type?.toLowerCase().includes('obrigat')
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                        }`}>
                          {sub.type || 'Obrigatório'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {sub.workload?.total ?? '—'}h ({sub.credits ?? '—'} cr)
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {sub.prerequisites && sub.prerequisites.length > 0 ? (
                          <span className="text-[11px]">
                            {sub.prerequisites.map(p => p.code).join(', ')}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onStartEditCurriculum(realIndex, sub)}
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded transition-colors cursor-pointer"
                            title="Editar disciplina"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteCurriculumItem(realIndex)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors cursor-pointer"
                            title="Excluir disciplina"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* SCHEDULE DISCIPLINES TABLE */
        <div className="overflow-x-auto">
          {filteredSchedule.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs sm:text-sm">
              Nenhuma turma encontrada no quadro de horários. Use a extração com IA ou adicione manualmente.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Disciplina / Turma</th>
                  <th className="py-2.5 px-3">Período</th>
                  <th className="py-2.5 px-3">Professor(a)</th>
                  <th className="py-2.5 px-3">Horários Semanais</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredSchedule.map((disc, idx) => {
                  const realIndex = disciplines.indexOf(disc);
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {disc.code || '-'}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{disc.name}</span>
                          {disc.profile && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded font-semibold text-[10px] shrink-0 font-mono">
                              {disc.profile}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium text-[10px]">
                          {disc.period == null ? 'Não informado' : disc.period === 0 ? 'Optativa' : `${disc.period}º Período`}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {disc.professor || '-'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {disc.sessions.map((s, sidx) => (
                            <span 
                              key={sidx} 
                              className="inline-block text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded"
                            >
                              {days.find(d => d.id === s.day)?.name}: {s.time}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onStartEditSchedule(realIndex, disc)}
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded transition-colors cursor-pointer"
                            title="Editar horários da turma"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteScheduleItem(realIndex)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors cursor-pointer"
                            title="Excluir turma"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
