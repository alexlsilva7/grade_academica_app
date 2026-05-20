import { useMemo } from 'react';
import { AlertCircle, X, Info } from 'lucide-react';
import { Discipline, TimeSlot } from '../types';
import { DAYS, TIMESLOTS as DEFAULT_TIMESLOTS } from '../constants';
import { hasDisciplineDetails } from '../utils/detailsHelper';

interface ScheduleGridProps {
  mobileTab: string;
  schedule: Discipline[];
  disciplinesList: Discipline[];
  removeFromSchedule: (id: string) => void;
  onShowDetails?: (disc: Discipline) => void;
}

export function ScheduleGrid({
  mobileTab,
  schedule,
  disciplinesList,
  removeFromSchedule,
  onShowDetails
}: ScheduleGridProps) {
  
  const timeSlots = useMemo(() => {
    const times = new Set<TimeSlot>();
    if (disciplinesList && disciplinesList.length > 0) {
      disciplinesList.forEach(d => {
        d.sessions.forEach(s => times.add(s.time));
      });
    } else {
      DEFAULT_TIMESLOTS.forEach(t => times.add(t));
    }
    
    // Sort logic
    const parseTime = (t: string) => {
      const parts = t.split(':');
      if (parts.length >= 2) return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      return 0;
    };
    
    return Array.from(times).sort((a, b) => parseTime(a as string) - parseTime(b as string));
  }, [disciplinesList]);

  const undeterminedDisciplines = useMemo(() => {
    return schedule.filter(d => d.sessions.length === 0);
  }, [schedule]);

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden ${mobileTab === 'schedule' ? 'flex flex-col' : 'hidden md:flex flex-col'} bg-slate-50 dark:bg-slate-950`}>
      {/* Top bar */}
      <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-6 flex items-center justify-between flex-shrink-0 animate-in fade-in duration-300">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Sua Grade</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col pb-24 md:pb-6 gap-6">
        {/* Undetermined Schedule Disciplines */}
        {undeterminedDisciplines.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 md:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">Sem Horário Definido</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {undeterminedDisciplines.map(disc => (
                <div key={disc.id} className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded-lg p-3 relative group shadow-sm flex flex-col justify-between hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight pr-10" title={disc.name}>
                      {disc.name}
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {disc.professor}
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                    {hasDisciplineDetails(disc) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onShowDetails) onShowDetails(disc);
                        }}
                        className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded text-amber-700 dark:text-amber-400 transition-all"
                        title="Detalhes"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromSchedule(disc.id);
                      }}
                      className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded text-amber-700 dark:text-amber-400 transition-all"
                      title="Remover"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Grid */}
        <div className="bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto flex-1 flex flex-col bg-slate-100 dark:bg-slate-900">
            <table className="w-full text-left border-collapse min-w-[700px] h-full">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-4 w-28 text-center font-semibold text-sm text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    Horário
                  </th>
                  {DAYS.map(day => (
                    <th key={day.id} className="px-4 py-4 text-center font-semibold text-sm text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 last:border-r-0 w-1/5 bg-slate-50 dark:bg-slate-900">
                      {day.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-slate-100 dark:bg-slate-950 gap-px">
                {timeSlots.map((time, timeIdx) => (
                  <tr key={time} className="bg-white dark:bg-slate-900">
                    <td className="px-4 py-4 text-center text-xs font-bold text-slate-400 dark:text-slate-400 border-r border-b border-slate-200 dark:border-slate-800 whitespace-nowrap align-middle">
                      {time}
                    </td>
                    {DAYS.map(day => {
                      const scheduledDisc = schedule.find(disc =>
                        disc.sessions.some(s => s.day === day.id && s.time === time)
                      );
                      
                      return (
                        <td key={`${day.id}-${time}`} className="p-2 border-r border-slate-200 dark:border-slate-800 border-b last:border-r-0 align-top relative group min-h-[5rem] h-20 transition-colors">
                          {scheduledDisc && (
                            <div className="absolute inset-1 p-2 bg-indigo-50/90 dark:bg-indigo-950/40 border-l-[3px] border-indigo-500 rounded flex flex-col justify-between hover:bg-indigo-100 hover:border-indigo-600 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer ring-1 ring-inset ring-indigo-200/50 dark:ring-indigo-800/20">
                              <div>
                                <div className="text-[10px] sm:text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase leading-tight line-clamp-2" title={scheduledDisc.name}>
                                  {scheduledDisc.name}
                                </div>
                                <div className="text-[9px] sm:text-[10px] font-medium text-indigo-700/85 dark:text-indigo-300 mt-1 truncate">
                                  {scheduledDisc.professor}
                                </div>
                              </div>
                              <div className="absolute top-1 right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                                {hasDisciplineDetails(scheduledDisc) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onShowDetails) onShowDetails(scheduledDisc);
                                    }}
                                    className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded transition-all"
                                    title="Detalhes"
                                  >
                                    <Info className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeFromSchedule(scheduledDisc.id);
                                  }}
                                  className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded transition-all"
                                  title="Remover"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          
      </div>
    </div>
  );
}
