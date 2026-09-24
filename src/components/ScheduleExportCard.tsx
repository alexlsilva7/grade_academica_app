import React, { useMemo } from 'react';
import { Discipline } from '../types';
import { DAYS } from '../constants';
import {
  getDisplayBlocks,
  findSessionStartBlock,
  calculateBlockSpan
} from '../utils/scheduleBlocks';

interface ScheduleExportCardProps {
  course: string | null;
  courseName?: string;
  semester: string;
  schedule: Discipline[];
  disciplinesList: Discipline[];
}

export type ExportGridCell =
  | { type: 'session'; discipline: Discipline; sessionTime: string; rowSpan: number }
  | { type: 'covered' }
  | { type: 'empty' };

export const ScheduleExportCard = React.forwardRef<HTMLDivElement, ScheduleExportCardProps>(({
  course,
  courseName,
  semester,
  schedule,
  disciplinesList
}, ref) => {

  const getCourseDisplayName = () => {
    if (courseName && courseName.trim().length > 0) return courseName;
    if (!course) return 'Curso';
    const c = course.toLowerCase();
    if (c === 'bcc' || c.includes('computacao') || c.includes('computação')) return 'Bacharelado em Ciência da Computação';
    if (c === 'eal' || c === 'engenharia-de-alimentos' || c.includes('alimento')) return 'Engenharia de Alimentos';
    if (c === 'adm' || c === 'administracao' || c.includes('administra')) return 'Administração';
    if (c === 'mvet' || c === 'vet' || c === 'medicina-veterinaria' || c.includes('veterin')) return 'Medicina Veterinária';
    return course.toUpperCase();
  };

  // Check if Saturday has any classes in the student's schedule
  const hasSaturday = useMemo(() => {
    return schedule.some(d => d.sessions.some(s => s.day === 6));
  }, [schedule]);

  const daysToShow = hasSaturday ? DAYS : DAYS.slice(0, 5);

  const displayBlocks = useMemo(() => {
    return getDisplayBlocks(schedule, disciplinesList, 'auto');
  }, [schedule, disciplinesList]);

  const gridMatrix = useMemo(() => {
    const matrix: Record<number, Record<number, ExportGridCell>> = {};
    displayBlocks.forEach((_, idx) => {
      matrix[idx] = {};
    });

    daysToShow.forEach(day => {
      for (let bIdx = 0; bIdx < displayBlocks.length; bIdx++) {
        if (matrix[bIdx][day.id]?.type === 'covered') continue;

        const block = displayBlocks[bIdx];
        let matchedSession: any = null;
        let matchedDisc: Discipline | null = null;

        for (const disc of schedule) {
          for (const s of disc.sessions) {
            if (s.day !== day.id) continue;
            const startBlock = findSessionStartBlock(s.time, displayBlocks);
            if (startBlock?.id === block.id) {
              matchedSession = s;
              matchedDisc = disc;
              break;
            }
          }
          if (matchedSession) break;
        }

        if (matchedSession && matchedDisc) {
          const span = calculateBlockSpan(matchedSession.time, bIdx, displayBlocks);
          matrix[bIdx][day.id] = {
            type: 'session',
            discipline: matchedDisc,
            sessionTime: matchedSession.time,
            rowSpan: span
          };
          for (let k = 1; k < span; k++) {
            if (bIdx + k < displayBlocks.length) {
              matrix[bIdx + k][day.id] = { type: 'covered' };
            }
          }
        } else {
          matrix[bIdx][day.id] = { type: 'empty' };
        }
      }
    });

    return matrix;
  }, [displayBlocks, schedule, daysToShow]);

  const undeterminedDisciplines = useMemo(() => {
    return schedule.filter(d => d.sessions.length === 0);
  }, [schedule]);

  return (
    <div
      ref={ref}
      style={{ width: '1150px' }}
      className="bg-white text-slate-800 font-sans p-8 border border-slate-200 shadow-xl rounded-2xl flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4">
          <img
            src="/my_ufape_logo.png"
            alt="My UFAPE Logo"
            className="w-14 h-14 object-contain"
            crossOrigin="anonymous"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                My UFAPE
              </h1>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                Grade Horária
              </span>
            </div>
            <p className="text-base font-bold text-indigo-600 mt-0.5">
              {getCourseDisplayName()} • Período {semester}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
            {schedule.length} {schedule.length === 1 ? 'matéria matriculada' : 'matérias matriculadas'}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Horário Acadêmico Oficial
          </span>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="w-32 py-3 px-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 bg-slate-100">
                Horário
              </th>
              {daysToShow.map(day => (
                <th
                  key={day.id}
                  className="py-3 px-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 last:border-r-0 bg-slate-50"
                >
                  {day.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayBlocks.map((block, blockIdx) => (
              <tr key={block.id} className={blockIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="py-2 px-3 text-center text-xs font-mono font-bold text-slate-700 border-r border-b border-slate-200 whitespace-nowrap bg-slate-50/80 align-middle w-28">
                  <div>{block.label}</div>
                  <div className="text-[10px] text-slate-400 capitalize">{block.shift}</div>
                </td>
                {daysToShow.map(day => {
                  const cell = gridMatrix[blockIdx]?.[day.id];
                  if (!cell || cell.type === 'covered') {
                    return null;
                  }

                  if (cell.type === 'session') {
                    const scheduledDisc = cell.discipline;
                    return (
                      <td
                        key={`${day.id}-${block.id}`}
                        rowSpan={cell.rowSpan}
                        className="p-1.5 border-r border-b border-slate-200 last:border-r-0 align-top relative"
                        style={{ height: `${cell.rowSpan * 5.5}rem` }}
                      >
                        <div className="h-full p-2 bg-indigo-50/95 border-l-[3.5px] border-indigo-600 rounded-md flex flex-col justify-between ring-1 ring-inset ring-indigo-200/60 overflow-hidden shadow-xs">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {scheduledDisc.code && (
                                <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-100/90 px-1 py-0.2 rounded">
                                  {scheduledDisc.code}
                                </span>
                              )}
                              <span
                                className="text-[11px] font-bold text-indigo-950 uppercase leading-snug line-clamp-2"
                                title={scheduledDisc.name}
                              >
                                {scheduledDisc.name}
                              </span>
                            </div>
                            {scheduledDisc.professor && (
                              <div className="text-[10px] font-semibold text-indigo-700 truncate mt-0.5">
                                {scheduledDisc.professor}
                              </div>
                            )}
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[10px] font-mono font-bold text-indigo-600">
                            <span>{cell.sessionTime}</span>
                            {cell.rowSpan > 1 && (
                              <span className="text-[9px] font-sans font-semibold bg-indigo-100/90 px-1.5 py-0.2 rounded text-indigo-800">
                                {cell.rowSpan} aulas
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  }

                  // Empty cell
                  return (
                    <td
                      key={`${day.id}-${block.id}`}
                      className="p-1.5 border-r border-b border-slate-200 last:border-r-0 align-top h-20 relative"
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Undetermined Schedule Disciplines (if any) */}
      {undeterminedDisciplines.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Disciplinas Sem Horário Definido ({undeterminedDisciplines.length})
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {undeterminedDisciplines.map(d => (
              <div key={d.id} className="bg-white border border-amber-200/80 rounded-lg p-2.5 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  {d.code && (
                    <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1 py-0.5 rounded">
                      {d.code}
                    </span>
                  )}
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {d.name}
                  </span>
                </div>
                {d.professor && (
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {d.professor}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer watermark */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
        <span>Grade organizada com My UFAPE</span>
        <span>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
});

ScheduleExportCard.displayName = 'ScheduleExportCard';
