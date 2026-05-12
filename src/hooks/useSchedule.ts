import React, { useState, useRef } from 'react';
import { bcc2026_1 } from '../data';
import { Discipline, TimeSlot } from '../types';
import { TIMESLOTS } from '../constants';
import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export function useSchedule() {
  const [view, setView] = useState<'home' | 'schedule'>('home');
  const [gradeTitle, setGradeTitle] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [schedule, setSchedule] = useState<Discipline[]>([]);
  const [disciplinesList, setDisciplinesList] = useState<Discipline[]>([]);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mobileTab, setMobileTab] = useState<'disciplines' | 'schedule'>('disciplines');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailsDiscipline, setDetailsDiscipline] = useState<Discipline | null>(null);

  const periods = Array.from(new Set(disciplinesList.map(d => d.period))).sort((a, b) => {
    const periodA = a as number;
    const periodB = b as number;
    if (periodA === 0) return 1;
    if (periodB === 0) return -1;
    return periodA - periodB;
  }) as number[];
  
  const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const normalizedSearchQuery = normalizeString(searchQuery);

  const displayedDisciplines = searchQuery 
    ? disciplinesList.filter(d => 
        normalizeString(d.name).includes(normalizedSearchQuery) || 
        normalizeString(d.professor).includes(normalizedSearchQuery)
      )
    : disciplinesList.filter(d => d.period === selectedPeriod);

  const loadPredefinedGrade = () => {
    setDisciplinesList(bcc2026_1);
    setGradeTitle('BCC - Bacharelado em Ciência da Computação - Período 2026.1');
    setSchedule([]);
    setSelectedPeriod(1);
    setSearchQuery('');
    setView('schedule');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ai) {
      setConflictMsg("API key do Gemini não está configurada.");
      setTimeout(() => setConflictMsg(null), 4000);
      return;
    }

    setIsProcessingPdf(true);
    
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      
      const base64Data = await base64Promise;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          {
            text: "Extraia todas as disciplinas deste PDF. Para cada disciplina, encontre o nome, o professor, o período e os horários das aulas. Mapeie os dias para 1 (Segunda) até 5 (Sexta). Mapeie os horários para uma das opções: 14:00 - 16:00, 16:00 - 18:00, 18:30 - 20:10 ou 20:10 - 21:50. Se um horário não bater exatamente, adapte para a opção mais próxima. Gere um ID único para cada disciplina. Se o período não estiver claro ou for uma disciplina optativa, use 0 para o campo 'period'."
          },
          {
            inlineData: {
              mimeType: file.type || "application/pdf",
              data: base64Data
            }
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                professor: { type: Type.STRING },
                period: { type: Type.INTEGER, description: "Use 0 for electives/optativas or if period is unknown." },
                sessions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      day: { type: Type.INTEGER, description: "1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday" },
                      time: { type: Type.STRING, description: "Must be exactly one of: '14:00 - 16:00', '16:00 - 18:00', '18:30 - 20:10', '20:10 - 21:50'" }
                    },
                    required: ["day", "time"]
                  }
                }
              },
              required: ["id", "name", "professor", "period", "sessions"]
            }
          }
        }
      });

      if (response.text) {
        const newDisciplines = JSON.parse(response.text) as Discipline[];
        const sanitizedDisciplines = newDisciplines.map(d => ({
          ...d,
          period: (d.period === null || d.period === undefined || d.period < 0) ? 0 : d.period,
          sessions: d.sessions.filter(s => 
            [1, 2, 3, 4, 5].includes(s.day) && 
            TIMESLOTS.includes(s.time as TimeSlot)
          )
        }));
        
        setDisciplinesList(sanitizedDisciplines);
        setGradeTitle(file.name.replace('.pdf', ''));
        setSchedule([]);
        if (sanitizedDisciplines.length > 0) {
          const availablePeriods = Array.from(new Set(sanitizedDisciplines.map(d => d.period))).sort((a, b) => {
            const pA = a as number;
            const pB = b as number;
            if (pA === 0) return 1;
            if (pB === 0) return -1;
            return pA - pB;
          });
          setSelectedPeriod(availablePeriods[0] as number);
        }
        setView('schedule');
      }
    } catch (e) {
      console.error(e);
      setConflictMsg("Erro ao processar o PDF. Tente novamente.");
      setTimeout(() => setConflictMsg(null), 4000);
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hasConflict = (newDisc: Discipline) => {
    for (const session of newDisc.sessions) {
      for (const scheduledDisc of schedule) {
        for (const scheduledSession of scheduledDisc.sessions) {
          if (session.day === scheduledSession.day && session.time === scheduledSession.time) {
            return { conflict: true, withName: scheduledDisc.name };
          }
        }
      }
    }
    return { conflict: false };
  };

  const toggleDiscipline = (disc: Discipline) => {
    const isScheduled = schedule.some(d => d.id === disc.id);
    if (isScheduled) {
      setSchedule(schedule.filter(d => d.id !== disc.id));
      setConflictMsg(null);
    } else {
      const conflictCheck = hasConflict(disc);
      if (conflictCheck.conflict) {
        setConflictMsg(`Conflito: ${disc.name} choca com ${conflictCheck.withName}.`);
        setTimeout(() => setConflictMsg(null), 4000);
      } else {
        setSchedule([...schedule, disc]);
        setConflictMsg(null);
      }
    }
  };

  const removeFromSchedule = (discId: string) => {
    setSchedule(schedule.filter(d => d.id !== discId));
  };

  const isDisciplineScheduled = (id: string) => schedule.some(d => d.id === id);

  return {
    hasApiKey: !!ai,
    view,
    setView,
    gradeTitle,
    selectedPeriod,
    setSelectedPeriod,
    schedule,
    disciplinesList,
    conflictMsg,
    isProcessingPdf,
    fileInputRef,
    mobileTab,
    setMobileTab,
    searchQuery,
    setSearchQuery,
    periods,
    displayedDisciplines,
    loadPredefinedGrade,
    handleFileUpload,
    toggleDiscipline,
    removeFromSchedule,
    isDisciplineScheduled,
    detailsDiscipline,
    setDetailsDiscipline,
  };
}
