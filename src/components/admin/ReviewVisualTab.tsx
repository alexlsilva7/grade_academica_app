import React from 'react';
import { Discipline, DayOfWeek } from '../../types';

export interface ReviewVisualTabProps {
  disciplines: Discipline[];
  activeProfiles: string[];
  filterProfile: string;
  setFilterProfile: (profile: string) => void;
  selectedPreviewPeriod: number | 'all';
  setSelectedPreviewPeriod: (period: number | 'all') => void;
  availableTimeSlots: string[];
  days: { id: DayOfWeek; name: string }[];
  onStartEditSchedule: (index: number, disc: Discipline) => void;
}

export function ReviewVisualTab({
  disciplines,
  activeProfiles,
  filterProfile,
  setFilterProfile,
  selectedPreviewPeriod,
  setSelectedPreviewPeriod,
  availableTimeSlots,
  days,
  onStartEditSchedule
}: ReviewVisualTabProps) {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Espelho semanal das turmas para conferência visual de choques e alocação de salas antes de persistir.
        </p>
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {activeProfiles.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500">Filtrar perfil:</span>
              <select
                value={filterProfile}
                onChange={(e) => setFilterProfile(e.target.value)}
                className="p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-semibold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os Perfis ({activeProfiles.length})</option>
                {activeProfiles.map(p => (
                  <option key={p} value={p}>Perfil: {p}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Filtrar período:</span>
            <select
              value={selectedPreviewPeriod}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedPreviewPeriod(val === 'all' ? 'all' : Number(val));
              }}
              className="p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">Exibir todos</option>
              {Array.from({ length: 9 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}º Período</option>
              ))}
              <option value={0}>Optativas</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full border-collapse text-left min-w-[750px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 text-xs font-bold text-slate-500 dark:text-slate-400">
              <th className="p-3 w-32 border-r border-slate-200 dark:border-slate-800">Horário</th>
              {days.map(d => (
                <th key={d.id} className="p-3 text-center border-r last:border-r-0 border-slate-200 dark:border-slate-800">{d.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            {availableTimeSlots.map(slot => (
              <tr key={slot} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 whitespace-nowrap">
                  {slot}
                </td>
                {days.map(day => {
                  const matched = disciplines.filter(disc => {
                    if (selectedPreviewPeriod !== 'all' && disc.period !== selectedPreviewPeriod) {
                      return false;
                    }
                    if (filterProfile !== 'all') {
                      const matchProfile = disc.profile === filterProfile || (!disc.profile && filterProfile === 'Sem Perfil');
                      if (!matchProfile) return false;
                    }
                    return disc.sessions?.some(s => s.day === day.id && s.time === slot);
                  });

                  return (
                    <td key={day.id} className="p-2 align-top border-r last:border-r-0 border-slate-200 dark:border-slate-800 min-h-[80px]">
                      <div className="space-y-1.5 min-h-[60px]">
                        {matched.map((disc, dIdx) => (
                          <div 
                            key={dIdx} 
                            onClick={() => onStartEditSchedule(disciplines.indexOf(disc), disc)}
                            className="p-1.5 rounded-lg text-[10px] bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 shadow-xs cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-xs transition-all group"
                            title="Clique para editar horários e dados desta turma no modal"
                          >
                            <div className="font-bold text-indigo-900 dark:text-indigo-200 leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              {disc.name}
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-[9px] mt-0.5 truncate">
                              {disc.professor || "-"}
                            </div>
                            <div className="flex justify-between items-center mt-1 text-[8px] font-mono text-indigo-600 dark:text-indigo-400">
                              <div className="flex items-center gap-1 truncate mr-1">
                                <span>{disc.code || 'TURMA'}</span>
                                {disc.profile && (
                                  <span className="px-1 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 text-[7px] font-bold shrink-0">
                                    {disc.profile}
                                  </span>
                                )}
                              </div>
                              <span className="font-bold shrink-0">{disc.period === 0 ? 'Opt' : `${disc.period}ºP`}</span>
                            </div>
                          </div>
                        ))}
                        {matched.length === 0 && (
                          <div className="h-full flex items-center justify-center text-[10px] text-slate-300 dark:text-slate-700 font-mono">
                            -
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
