import React, { useState, useEffect, useMemo } from 'react';
import { Discipline, Session, DayOfWeek } from '../types';
import { validateExtraction } from '../utils/extraction';
import { TIMESLOTS } from '../constants';

export interface UseScheduleEditorParams {
  disciplines: Discipline[];
  setDisciplines: React.Dispatch<React.SetStateAction<Discipline[]>>;
  filterProfile: string;
  setView: (view: string) => void;
  setDisciplinesList: (disciplines: Discipline[]) => void;
  setGradeTitle: (title: string) => void;
  setErrorMsg: React.Dispatch<React.SetStateAction<string | null>>;
  courseName: string;
  selectedCourseId: string;
  scheduleTitle: string;
}

export interface UseScheduleEditorReturn {
  editingSchedIndex: number | null;
  setEditingSchedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  editSchedCode: string;
  setEditSchedCode: React.Dispatch<React.SetStateAction<string>>;
  editSchedName: string;
  setEditSchedName: React.Dispatch<React.SetStateAction<string>>;
  editSchedProfessor: string;
  setEditSchedProfessor: React.Dispatch<React.SetStateAction<string>>;
  editSchedPeriod: number | '';
  setEditSchedPeriod: React.Dispatch<React.SetStateAction<number | ''>>;
  editSchedProfile: string;
  setEditSchedProfile: React.Dispatch<React.SetStateAction<string>>;
  editSchedSessions: Session[];
  setEditSchedSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  newSessionDay: DayOfWeek;
  setNewSessionDay: React.Dispatch<React.SetStateAction<DayOfWeek>>;
  newSessionTime: string;
  setNewSessionTime: React.Dispatch<React.SetStateAction<string>>;
  isCustomTimeInput: boolean;
  setIsCustomTimeInput: React.Dispatch<React.SetStateAction<boolean>>;
  customTimeValue: string;
  setCustomTimeValue: React.Dispatch<React.SetStateAction<string>>;
  availableTimeSlots: string[];
  parseTimeMinutes: (timeStr: string) => number;
  handleLoadIntoActiveApp: () => void;
  handleStartEditSchedule: (index: number, disc: Discipline) => void;
  handleSaveScheduleEdit: () => void;
  handleAddSessionToScheduleEdit: () => void;
  handleRemoveSessionFromScheduleEdit: (day: DayOfWeek, time: string) => void;
  handleDeleteScheduleItem: (index: number) => void;
  handleAddBlankScheduleDiscipline: () => void;
}

export function useScheduleEditor({
  disciplines,
  setDisciplines,
  filterProfile,
  setView,
  setDisciplinesList,
  setGradeTitle,
  setErrorMsg,
  courseName,
  selectedCourseId,
  scheduleTitle
}: UseScheduleEditorParams): UseScheduleEditorReturn {
  const [editingSchedIndex, setEditingSchedIndex] = useState<number | null>(null);
  const [editSchedCode, setEditSchedCode] = useState('');
  const [editSchedName, setEditSchedName] = useState('');
  const [editSchedProfessor, setEditSchedProfessor] = useState('');
  const [editSchedPeriod, setEditSchedPeriod] = useState<number | ''>('');
  const [editSchedProfile, setEditSchedProfile] = useState<string>('');
  const [editSchedSessions, setEditSchedSessions] = useState<Session[]>([]);
  const [newSessionDay, setNewSessionDay] = useState<DayOfWeek>(1);
  const [newSessionTime, setNewSessionTime] = useState<string>('18:30 - 20:10');
  const [isCustomTimeInput, setIsCustomTimeInput] = useState(false);
  const [customTimeValue, setCustomTimeValue] = useState('');

  const handleLoadIntoActiveApp = () => {
    if (disciplines.length === 0) {
      setErrorMsg("Nenhum horário de disciplina disponível para carregar.");
      return;
    }
    const errors = validateExtraction(disciplines, 'schedule').filter(issue => issue.severity === 'error');
    if (errors.length) { setErrorMsg(errors.map(issue => issue.message).join(' ')); return; }
    setDisciplinesList(disciplines);
    setGradeTitle(scheduleTitle || `${courseName} - Horário`);
    localStorage.setItem('saved_disciplinesList', JSON.stringify(disciplines));
    localStorage.setItem('saved_gradeTitle', scheduleTitle || `${courseName} - Horário`);
    localStorage.setItem('selectedCourse', selectedCourseId);
    setView('schedule');
  };

  const parseTimeMinutes = (timeStr: string): number => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    }
    return 0;
  };

  const availableTimeSlots = useMemo(() => {
    const slotsSet = new Set<string>();

    disciplines.forEach(d => {
      d.sessions?.forEach(s => {
        if (s.time && s.time.trim()) {
          slotsSet.add(s.time.trim());
        }
      });
    });

    editSchedSessions.forEach(s => {
      if (s.time && s.time.trim()) {
        slotsSet.add(s.time.trim());
      }
    });

    if (slotsSet.size === 0) {
      TIMESLOTS.forEach(t => slotsSet.add(t));
    }

    return Array.from(slotsSet).sort((a, b) => parseTimeMinutes(a) - parseTimeMinutes(b));
  }, [disciplines, editSchedSessions]);

  useEffect(() => {
    if (availableTimeSlots.length > 0 && !availableTimeSlots.includes(newSessionTime) && !isCustomTimeInput) {
      setNewSessionTime(availableTimeSlots[0]);
    }
  }, [availableTimeSlots, newSessionTime, isCustomTimeInput]);

  const handleStartEditSchedule = (index: number, disc: Discipline) => {
    setEditingSchedIndex(index);
    setEditSchedName(disc.name);
    setEditSchedCode(disc.code || '');
    setEditSchedProfessor(disc.professor || '');
    setEditSchedPeriod(disc.period ?? '');
    setEditSchedProfile(disc.profile || '');
    setEditSchedSessions(disc.sessions ? [...disc.sessions] : []);
    setIsCustomTimeInput(false);
    setCustomTimeValue('');
    if (availableTimeSlots.length > 0) {
      setNewSessionTime(availableTimeSlots[0]);
    }
  };

  const handleSaveScheduleEdit = () => {
    if (editingSchedIndex === null) return;
    setDisciplines(prev => {
      const updated = [...prev];
      updated[editingSchedIndex] = {
        ...updated[editingSchedIndex],
        code: editSchedCode,
        name: editSchedName,
        professor: editSchedProfessor || null,
        period: editSchedPeriod === '' ? null : Number(editSchedPeriod),
        profile: editSchedProfile.trim() || undefined,
        sessions: editSchedSessions
      };
      return updated;
    });
    setEditingSchedIndex(null);
  };

  const handleAddSessionToScheduleEdit = () => {
    const timeToAdd = isCustomTimeInput ? customTimeValue.trim() : newSessionTime;
    if (!timeToAdd) return;
    const exists = editSchedSessions.some(s => s.day === newSessionDay && s.time === timeToAdd);
    if (exists) return;
    setEditSchedSessions(prev => [...prev, { day: newSessionDay, time: timeToAdd }]);
    if (isCustomTimeInput) {
      setIsCustomTimeInput(false);
      setCustomTimeValue('');
      setNewSessionTime(timeToAdd);
    }
  };

  const handleRemoveSessionFromScheduleEdit = (day: DayOfWeek, time: string) => {
    setEditSchedSessions(prev => prev.filter(s => !(s.day === day && s.time === time)));
  };

  const handleDeleteScheduleItem = (index: number) => {
    setDisciplines(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddBlankScheduleDiscipline = () => {
    const defaultTime = availableTimeSlots[0] || '18:30 - 20:10';
    const newDisc: Discipline = {
      id: `turma_${Date.now()}`,
      code: 'CCMP3000',
      name: 'Nova Disciplina Ofertada',
      professor: '-',
      period: 1,
      profile: filterProfile !== 'all' ? filterProfile : undefined,
      sessions: [{ day: 1, time: defaultTime }]
    };
    setDisciplines(prev => [...prev, newDisc]);
    handleStartEditSchedule(disciplines.length, newDisc);
  };

  return {
    editingSchedIndex, setEditingSchedIndex,
    editSchedCode, setEditSchedCode,
    editSchedName, setEditSchedName,
    editSchedProfessor, setEditSchedProfessor,
    editSchedPeriod, setEditSchedPeriod,
    editSchedProfile, setEditSchedProfile,
    editSchedSessions, setEditSchedSessions,
    newSessionDay, setNewSessionDay,
    newSessionTime, setNewSessionTime,
    isCustomTimeInput, setIsCustomTimeInput,
    customTimeValue, setCustomTimeValue,
    availableTimeSlots,
    parseTimeMinutes,
    handleLoadIntoActiveApp,
    handleStartEditSchedule,
    handleSaveScheduleEdit,
    handleAddSessionToScheduleEdit,
    handleRemoveSessionFromScheduleEdit,
    handleDeleteScheduleItem,
    handleAddBlankScheduleDiscipline
  };
}
