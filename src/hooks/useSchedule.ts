import React, { useState, useRef, useEffect } from 'react';
import { bcc2026_1, eal2026_1 } from '../data';
import { Discipline, TimeSlot } from '../types';
import { TIMESLOTS } from '../constants';
import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface SavedGrade {
  id: string;
  title: string;
  disciplines: Discipline[];
}

export type ThemeMode = 'light' | 'dark' | 'system';

export function useSchedule() {
  const [view, setView] = useState<'home' | 'schedule' | 'matriz' | 'disciplines'>(() => {
    try {
      const stored = localStorage.getItem('view_preference');
      return (stored === 'home' || stored === 'schedule' || stored === 'matriz' || stored === 'disciplines') ? stored : 'home';
    } catch {
      return 'home';
    }
  });

  const [gradeTitle, setGradeTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('saved_gradeTitle') || '';
    } catch {
      return '';
    }
  });

  const [selectedPeriod, setSelectedPeriod] = useState<number>(() => {
    try {
      const p = localStorage.getItem('saved_selectedPeriod');
      return p ? Number(p) : 1;
    } catch {
      return 1;
    }
  });

  const [schedule, setSchedule] = useState<Discipline[]>(() => {
    try {
      const course = localStorage.getItem('selectedCourse');
      if (course) {
        const stored = localStorage.getItem(`schedule_${course}`);
        return stored ? JSON.parse(stored) : [];
      }
    } catch (e) {
      console.error('Failed to load schedule', e);
    }
    return [];
  });

  const [disciplinesList, setDisciplinesList] = useState<Discipline[]>(() => {
    try {
      const stored = localStorage.getItem('saved_disciplinesList');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [themePreference, setThemePreference] = useState<ThemeMode>(() => {
    try {
      const storedTheme = localStorage.getItem('themePreference') as ThemeMode;
      return (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') ? storedTheme : 'light';
    } catch {
      return 'light';
    }
  });

  const [isSystemDark, setIsSystemDark] = useState<boolean>(() => {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsSystemDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const darkMode = themePreference === 'system' ? isSystemDark : themePreference === 'dark';

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('themePreference', themePreference);
  }, [darkMode, themePreference]);

  const cycleTheme = () => {
    setThemePreference(prev => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  };

  const [mobileTab, setMobileTab] = useState<'disciplines' | 'schedule'>('disciplines');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailsDiscipline, setDetailsDiscipline] = useState<Discipline | null>(null);

  const [savedGrades, setSavedGrades] = useState<SavedGrade[]>([]);
  const [completedDisciplines, setCompletedDisciplines] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(() => {
    try {
      return localStorage.getItem('selectedCourse') || null;
    } catch {
      return null;
    }
  });

  const changeCourse = (course: string | null) => {
    setSelectedCourse(course);
    if (course) {
      localStorage.setItem('selectedCourse', course);
    } else {
      localStorage.removeItem('selectedCourse');
    }
  };

  // State triggers to persist variables
  useEffect(() => {
    localStorage.setItem('view_preference', view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem('saved_gradeTitle', gradeTitle);
  }, [gradeTitle]);

  useEffect(() => {
    localStorage.setItem('saved_selectedPeriod', selectedPeriod.toString());
  }, [selectedPeriod]);

  useEffect(() => {
    localStorage.setItem('saved_disciplinesList', JSON.stringify(disciplinesList));
  }, [disciplinesList]);

  useEffect(() => {
    if (selectedCourse) {
      try {
        localStorage.setItem(`schedule_${selectedCourse}`, JSON.stringify(schedule));
      } catch (e) {
        console.error('Failed to save schedule to localStorage', e);
      }
    }
  }, [schedule, selectedCourse]);

  // Synchronize completed disciplines back when navigating to scheduling
  useEffect(() => {
    if (view === 'schedule') {
      try {
        const storedCompleted = localStorage.getItem('completedDisciplines');
        if (storedCompleted) {
          setCompletedDisciplines(JSON.parse(storedCompleted));
        }
      } catch (e) {
        console.error('Failed to reload completedDisciplines on view change', e);
      }
    }
  }, [view]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('savedGrades');
      if (stored) {
        setSavedGrades(JSON.parse(stored));
      }
      const storedCompleted = localStorage.getItem('completedDisciplines');
      if (storedCompleted) {
        setCompletedDisciplines(JSON.parse(storedCompleted));
      }
    } catch (e) {
      console.error('Failed to load from localStorage', e);
    }
  }, []);

  const toggleCompleted = (disciplineId: string) => {
    setCompletedDisciplines(prev => {
      const isCompleted = prev.includes(disciplineId);
      const updated = isCompleted ? prev.filter(id => id !== disciplineId) : [...prev, disciplineId];
      localStorage.setItem('completedDisciplines', JSON.stringify(updated));

      // Se estiver marcando como concluída, remove da grade de horários automaticamente
      if (!isCompleted) {
        setSchedule(prevSchedule => prevSchedule.filter(d => d.id !== disciplineId && d.code !== disciplineId));
      }

      // Synchronize with Matrix Curriculum Progress
      try {
        const matrixSaved = localStorage.getItem('bcc_matriz_progress');
        if (matrixSaved) {
          const matrixSubjects = JSON.parse(matrixSaved);
          const updatedMatrix = matrixSubjects.map((s: any) => {
            const matchesCode = s.code && s.code === disciplineId;
            const matchesId = s.id === disciplineId;
            if (matchesCode || matchesId) {
              return { 
                ...s, 
                status: isCompleted ? 'pendente' : 'concluido',
                grade: isCompleted ? '' : s.grade
              };
            }
            return s;
          });
          localStorage.setItem('bcc_matriz_progress', JSON.stringify(updatedMatrix));
        }
      } catch (e) {
        console.error('Failed to sync completed discipline with matrix progress', e);
      }

      return updated;
    });
  };

  const saveGradeToLocal = (title: string, disciplines: Discipline[]) => {
    try {
      const newGrade: SavedGrade = {
        id: Date.now().toString(),
        title,
        disciplines
      };
      setSavedGrades(prev => {
        const updated = [...prev, newGrade];
        localStorage.setItem('savedGrades', JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error('Failed to save grade to localStorage', e);
    }
  };

  const removeSavedGrade = (id: string) => {
    try {
      setSavedGrades(prev => {
        const updated = prev.filter(g => g.id !== id);
        localStorage.setItem('savedGrades', JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error('Failed to remove grade from localStorage', e);
    }
  };

  const loadSavedGrade = (grade: SavedGrade) => {
    setDisciplinesList(grade.disciplines);
    setGradeTitle(grade.title);
    setSchedule([]);
    setSelectedPeriod(1);
    setSearchQuery('');
    setView('schedule');
  };

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

  const loadPredefinedGrade = (type: 'bcc' | 'eal') => {
    if (type === 'eal') {
      setDisciplinesList(eal2026_1);
      setGradeTitle('EAL - Engenharia de Alimentos - Período 2026.1');
    } else {
      setDisciplinesList(bcc2026_1);
      setGradeTitle('BCC - Bacharelado em Ciência da Computação - Período 2026.1');
    }
    
    // Restore the saved schedule for this course instead of resetting to empty
    try {
      const stored = localStorage.getItem(`schedule_${type}`);
      if (stored) {
        setSchedule(JSON.parse(stored));
      } else {
        setSchedule([]);
      }
    } catch {
      setSchedule([]);
    }

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
            text: "Extraia todas as disciplinas deste PDF. Para cada disciplina, encontre o nome, o professor, o período e os horários das aulas. Mapeie os dias para 1 (Segunda) até 6 (Sábado). Mapeie os horários no formato HH:MM - HH:MM, por exemplo: '07:30 - 08:30', '13:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:30 - 20:10' ou '20:10 - 21:50'. Se um horário não bater exatamente, adapte para a opção mais próxima. Gere um ID único para cada disciplina. Se o período não estiver claro, use 0."
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
                      day: { type: Type.INTEGER, description: "1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday" },
                      time: { type: Type.STRING, description: "Format: HH:MM - HH:MM" }
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
        let textResponse = response.text;
        // Strip out markdown code blocks if the response includes them
        if (textResponse.startsWith('```')) {
          textResponse = textResponse.replace(/^```(json)?\n?/i, '').replace(/\n?```$/i, '');
        }
        
        try {
          const newDisciplines = JSON.parse(textResponse) as Discipline[];
          if (!Array.isArray(newDisciplines) || newDisciplines.length === 0) {
            throw new Error("Formato inválido ou nenhuma disciplina encontrada.");
          }

          const sanitizedDisciplines = newDisciplines.map(d => ({
            ...d,
            period: (d.period === null || d.period === undefined || d.period < 0) ? 0 : d.period,
            sessions: d.sessions ? d.sessions.filter(s => 
              [1, 2, 3, 4, 5, 6].includes(s.day)
            ) : []
          }));
          
          setDisciplinesList(sanitizedDisciplines);
          const newTitle = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
          setGradeTitle(newTitle);
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
          saveGradeToLocal(newTitle, sanitizedDisciplines);
        } catch (parseError) {
          console.error("Parse error:", parseError, textResponse);
          setConflictMsg("O PDF não contém uma grade válida ou o formato não foi reconhecido.");
          setTimeout(() => setConflictMsg(null), 5000);
        }
      } else {
        setConflictMsg("Não foi possível extrair conteúdo do PDF.");
        setTimeout(() => setConflictMsg(null), 5000);
      }
    } catch (e) {
      console.error("Generation error:", e);
      setConflictMsg("Erro ao processar o PDF. Certifique-se de que é um documento válido.");
      setTimeout(() => setConflictMsg(null), 5000);
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const parseTimeToMinutes = (timeStr: string): { start: number; end: number } | null => {
    const parts = timeStr.split('-');
    if (parts.length !== 2) return null;
    const parseSingle = (s: string) => {
      const t = s.trim().split(':');
      if (t.length !== 2) return 0;
      return parseInt(t[0], 10) * 60 + parseInt(t[1], 10);
    };
    return {
      start: parseSingle(parts[0]),
      end: parseSingle(parts[1])
    };
  };

  const hasConflict = (newDisc: Discipline) => {
    for (const session of newDisc.sessions) {
      for (const scheduledDisc of schedule) {
        if (scheduledDisc.id === newDisc.id) continue;
        for (const scheduledSession of scheduledDisc.sessions) {
          if (session.day === scheduledSession.day) {
            const r1 = parseTimeToMinutes(session.time);
            const r2 = parseTimeToMinutes(scheduledSession.time);
            let overlapping = false;
            if (r1 && r2) {
              overlapping = r1.start < r2.end && r2.start < r1.end;
            } else {
              overlapping = session.time.trim() === scheduledSession.time.trim();
            }
            if (overlapping) {
              return { conflict: true, withName: scheduledDisc.name };
            }
          }
        }
      }
    }
    return { conflict: false };
  };

  const getDisciplineConflictInstance = (disc: Discipline) => {
    const discIdentifier = disc.code || disc.id;
    const isCompleted = completedDisciplines.includes(discIdentifier) || completedDisciplines.includes(disc.id);
    if (isCompleted) return null;

    if (schedule.some(d => d.id === disc.id)) return null;
    const conflictCheck = hasConflict(disc);
    if (conflictCheck.conflict) {
      return { withName: conflictCheck.withName };
    }
    return null;
  };

  const toggleDiscipline = (disc: Discipline) => {
    const discIdentifier = disc.code || disc.id;
    const isCompleted = completedDisciplines.includes(discIdentifier) || completedDisciplines.includes(disc.id);
    if (isCompleted) return;

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

  const exportData = () => {
    const data = {
      savedGrades,
      completedDisciplines,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "grade_academica_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importDataFileInputRef = useRef<HTMLInputElement>(null);

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (data.savedGrades && Array.isArray(data.savedGrades)) {
          setSavedGrades(data.savedGrades);
          localStorage.setItem('savedGrades', JSON.stringify(data.savedGrades));
        }
        if (data.completedDisciplines && Array.isArray(data.completedDisciplines)) {
          setCompletedDisciplines(data.completedDisciplines);
          localStorage.setItem('completedDisciplines', JSON.stringify(data.completedDisciplines));
        }
        alert("Dados importados com sucesso!");
      } catch (error) {
        console.error("Erro ao importar dados", error);
        alert("Arquivo de backup inválido.");
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

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
    savedGrades,
    loadSavedGrade,
    removeSavedGrade,
    completedDisciplines,
    toggleCompleted,
    getDisciplineConflictInstance,
    darkMode,
    themePreference,
    cycleTheme,
    exportData,
    importDataFileInputRef,
    importData,
    selectedCourse,
    changeCourse,
  };
}
