import { useMemo } from 'react';
import { AlertCircle, X, Info, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Discipline, TimeSlot } from '../types';
import { DAYS, TIMESLOTS as DEFAULT_TIMESLOTS } from '../constants';
import { hasDisciplineDetails } from '../utils/detailsHelper';

interface ScheduleGridProps {
  mobileTab: string;
  schedule: Discipline[];
  disciplinesList: Discipline[];
  removeFromSchedule: (id: string) => void;
  onShowDetails?: (disc: Discipline) => void;
  onOpenTour?: () => void;
}

export function ScheduleGrid({
  mobileTab,
  schedule,
  disciplinesList,
  removeFromSchedule,
  onShowDetails,
  onOpenTour
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
      <div data-tour="schedule-header" className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-6 flex items-center justify-between flex-shrink-0 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Sua Grade</h2>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {schedule.length} {schedule.length === 1 ? 'matéria' : 'matérias'}
          </span>
        </div>

        {onOpenTour && (
          <button
            data-tour="schedule-help-button"
            onClick={onOpenTour}
            className="flex items-center gap-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg font-semibold transition-colors shadow-xs cursor-pointer"
            title="Passo a passo de como montar a grade"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Como Usar</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col pb-24 md:pb-6 gap-6">
        {/* Undetermined Schedule Disciplines */}
        <AnimatePresence>
          {undeterminedDisciplines.length > 0 && (
            <motion.div
              key="undetermined-section"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 md:p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">Sem Horário Definido</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {undeterminedDisciplines.map(disc => (
                    <motion.div
                      key={disc.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded-lg p-3 relative group shadow-sm flex flex-col justify-between hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight pr-16 line-clamp-2" title={disc.name}>
                          {disc.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {disc.code && (
                            <span className="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                              {disc.code}
                            </span>
                          )}
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                            {disc.professor}
                          </span>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 flex items-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity gap-1">
                        {hasDisciplineDetails(disc) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onShowDetails) onShowDetails(disc);
                            }}
                            className="w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-lg text-amber-700 dark:text-amber-300 transition-all"
                            title="Detalhes"
                            aria-label="Detalhes"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromSchedule(disc.id);
                          }}
                          className="w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-lg text-amber-700 dark:text-amber-300 transition-all"
                          title="Remover"
                          aria-label="Remover"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Schedule Grid */}
        <div data-tour="schedule-grid" className="bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto flex-1 flex flex-col bg-slate-100 dark:bg-slate-900">
            <table className="w-full text-left border-collapse min-w-[700px] h-full">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 w-28 text-center font-semibold text-xs text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    Horário
                  </th>
                  {DAYS.map(day => (
                    <th key={day.id} className="px-3 py-3 text-center font-semibold text-xs text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 last:border-r-0 w-1/5 bg-slate-50 dark:bg-slate-900">
                      {day.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-slate-100 dark:bg-slate-950 gap-px">
                {timeSlots.map((time, timeIdx) => (
                  <tr key={time} className="bg-white dark:bg-slate-900">
                    <td className="px-3 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-800 whitespace-nowrap align-middle">
                      {time}
                    </td>
                    {DAYS.map(day => {
                      const scheduledDisc = schedule.find(disc =>
                        disc.sessions.some(s => s.day === day.id && s.time === time)
                      );
                      
                      return (
                        <td key={`${day.id}-${time}`} className="p-1 sm:p-1.5 border-r border-slate-200 dark:border-slate-800 border-b last:border-r-0 align-top relative group min-h-[5.5rem] h-24 transition-colors">
                          <AnimatePresence>
                            {scheduledDisc && (
                              <motion.div
                                key={scheduledDisc.id}
                                layoutId={scheduledDisc.id}
                                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="absolute inset-1 p-2 bg-indigo-50/95 dark:bg-indigo-950/60 border-l-[3px] border-indigo-500 rounded-lg flex flex-col justify-between hover:bg-indigo-100 hover:border-indigo-600 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer ring-1 ring-inset ring-indigo-200/50 dark:ring-indigo-800/30 overflow-hidden"
                              >
                                <div className="min-w-0 pr-8">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {scheduledDisc.code && (
                                      <span className="text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-200 bg-indigo-100/80 dark:bg-indigo-900/60 px-1 py-0.2 rounded">
                                        {scheduledDisc.code}
                                      </span>
                                    )}
                                    <span className="text-xs font-bold text-indigo-950 dark:text-indigo-100 uppercase leading-snug line-clamp-1" title={scheduledDisc.name}>
                                      {scheduledDisc.name}
                                    </span>
                                  </div>
                                  <div className="text-[11px] sm:text-xs font-medium text-indigo-800 dark:text-indigo-300 mt-1 truncate" title={scheduledDisc.professor}>
                                    {scheduledDisc.professor}
                                  </div>
                                </div>
                                <div className="absolute top-1 right-1 flex items-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity gap-0.5">
                                  {hasDisciplineDetails(scheduledDisc) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onShowDetails) onShowDetails(scheduledDisc);
                                      }}
                                      className="w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center hover:bg-indigo-200/80 dark:hover:bg-indigo-800 text-indigo-800 dark:text-indigo-200 rounded-lg transition-all"
                                      title="Detalhes"
                                      aria-label="Detalhes"
                                    >
                                      <Info className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFromSchedule(scheduledDisc.id);
                                    }}
                                    className="w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center hover:bg-indigo-200/80 dark:hover:bg-indigo-800 text-indigo-800 dark:text-indigo-200 rounded-lg transition-all"
                                    title="Remover"
                                    aria-label="Remover"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
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
