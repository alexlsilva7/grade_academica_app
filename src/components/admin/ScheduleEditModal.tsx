import React from 'react';
import { Calendar, X, Check } from 'lucide-react';
import { DayOfWeek } from '../../types';

export interface ScheduleSession {
  day: DayOfWeek;
  time: string;
}

export interface ScheduleEditModalProps {
  editSchedCode: string;
  setEditSchedCode: (v: string) => void;
  editSchedName: string;
  setEditSchedName: (v: string) => void;
  editSchedPeriod: number | '';
  setEditSchedPeriod: (v: number | '') => void;
  editSchedProfile: string;
  setEditSchedProfile: (v: string) => void;
  editSchedProfessor: string;
  setEditSchedProfessor: (v: string) => void;
  editSchedSessions: ScheduleSession[];
  DAYS: { id: DayOfWeek; name: string }[];
  availableTimeSlots: string[];
  onAddSession: () => void;
  onRemoveSession: (day: DayOfWeek, time: string) => void;
  newSessionDay: DayOfWeek;
  setNewSessionDay: (v: DayOfWeek) => void;
  newSessionTime: string;
  setNewSessionTime: (v: string) => void;
  isCustomTimeInput: boolean;
  setIsCustomTimeInput: (v: boolean) => void;
  customTimeValue: string;
  setCustomTimeValue: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function ScheduleEditModal({
  editSchedCode,
  setEditSchedCode,
  editSchedName,
  setEditSchedName,
  editSchedPeriod,
  setEditSchedPeriod,
  editSchedProfile,
  setEditSchedProfile,
  editSchedProfessor,
  setEditSchedProfessor,
  editSchedSessions,
  DAYS,
  availableTimeSlots,
  onAddSession,
  onRemoveSession,
  newSessionDay,
  setNewSessionDay,
  newSessionTime,
  setNewSessionTime,
  isCustomTimeInput,
  setIsCustomTimeInput,
  customTimeValue,
  setCustomTimeValue,
  onSave,
  onClose
}: ScheduleEditModalProps) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Editar Disciplina e Horários da Turma
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                {editSchedName || 'Nova Turma'} ({editSchedCode || 'Sem código'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Código</label>
              <input
                type="text"
                value={editSchedCode}
                onChange={(e) => setEditSchedCode(e.target.value)}
                placeholder="Ex: CCMP3057"
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nome da Disciplina e Turma</label>
              <input
                type="text"
                value={editSchedName}
                onChange={(e) => setEditSchedName(e.target.value)}
                placeholder="Ex: Introdução à Programação - Turma 01"
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Período</label>
              <select
                value={editSchedPeriod}
                onChange={(e) => setEditSchedPeriod(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Não informado</option>
                {Array.from({ length: 11 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? "Optativa" : `${i}º Período`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Perfil / Matriz</label>
              <input
                type="text"
                value={editSchedProfile}
                onChange={(e) => setEditSchedProfile(e.target.value)}
                placeholder="Ex: MVET03"
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-none focus:border-indigo-500 uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Professor(a) Responsável</label>
            <input
              type="text"
              value={editSchedProfessor}
              onChange={(e) => setEditSchedProfessor(e.target.value)}
              placeholder="Nome do docente ou '-'"
              className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">
                Sessões Semanais de Aulas ({editSchedSessions.length})
              </label>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/60">
                {availableTimeSlots.length} horário{availableTimeSlots.length !== 1 ? 's' : ''} extraído{availableTimeSlots.length !== 1 ? 's' : ''} do curso
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[44px] items-center">
              {editSchedSessions.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">Sem horários cadastrados para esta turma.</span>
              ) : (
                editSchedSessions.map((s, sidx) => (
                  <span 
                    key={sidx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg font-medium text-[11px]"
                  >
                    <span className="font-semibold">{DAYS.find(d => d.id === s.day)?.name}:</span>
                    <span className="font-mono font-bold">{s.time}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveSession(s.day, s.time)}
                      className="text-indigo-400 hover:text-rose-500 transition-colors ml-0.5 cursor-pointer"
                      title="Remover horário"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <select
                value={newSessionDay}
                onChange={(e) => setNewSessionDay(Number(e.target.value) as DayOfWeek)}
                className="p-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer"
              >
                {DAYS.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {!isCustomTimeInput ? (
                <select
                  value={newSessionTime}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomTimeInput(true);
                      setCustomTimeValue('');
                    } else {
                      setNewSessionTime(e.target.value);
                    }
                  }}
                  className="p-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono cursor-pointer"
                >
                  <optgroup label="🕒 Horários extraídos dos dados">
                    {availableTimeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </optgroup>
                  <option value="__custom__">➕ Outro horário personalizado...</option>
                </select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Ex: 08:00 - 10:00"
                    value={customTimeValue}
                    onChange={(e) => setCustomTimeValue(e.target.value)}
                    className="w-36 p-2 text-xs border border-indigo-300 dark:border-indigo-700 rounded-xl bg-white dark:bg-slate-800 font-mono focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomTimeInput(false);
                      if (availableTimeSlots.length > 0) setNewSessionTime(availableTimeSlots[0]);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Voltar aos horários extraídos"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onAddSession}
                className="px-3.5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition-all cursor-pointer shrink-0"
              >
                + Adicionar Horário
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>
    </div>
  );
}
