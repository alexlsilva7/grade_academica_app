import React, { useState, useRef, useEffect, useMemo } from 'react';
import { bcc2026_1, eal2026_1, adm2026_1 } from '../data';
import { Discipline, TimeSlot } from '../types';
import { TIMESLOTS } from '../constants';
import { canAccessAdmin } from '../utils/domain';
import { validateExtraction } from '../utils/extraction';

export interface SavedGrade {
  id: string;
  title: string;
  disciplines: Discipline[];
}

export type ThemeMode = 'light' | 'dark' | 'system';

export function sanitizeDiscipline(d: Discipline): Discipline {
  if (!d) return d;
  if (d.evidence) return d;
  let cleanName = d.name || '';
  let profile = (d.profile || '').trim();

  // Pattern: "(Matriz Nova - MVET03)", "(Matriz Antiga - MVET02)", "(Perfil MVET02)", "(Perfil - MVET02)", "(MVET03)", "(Grade Nova - BCC03)"
  const profileRegex = /\s*\((?:(?:matriz|grade)\s+(?:nova|antiga)\s*[-–:]*\s*|perfil\s*[-–:]*\s*)?([A-Za-z0-9_-]+)\)/i;
  const match = cleanName.match(profileRegex);
  if (match) {
    const candidateCode = match[1]?.trim();
    if (!profile && candidateCode) {
      profile = candidateCode;
    }
    cleanName = cleanName.replace(match[0], '').trim();
  }

  // Also clean generic labels like "(Matriz Nova)" or "(Matriz Antiga)"
  cleanName = cleanName.replace(/\s*\((?:matriz|grade)\s+(?:nova|antiga)\)/gi, '').trim();

  // "Optativa" não é perfil curricular: limpa o atributo profile para optativas
  if (profile.toLowerCase() === 'optativa' || profile.toLowerCase() === 'sem perfil') {
    profile = '';
  }

  return {
    ...d,
    name: cleanName,
    profile
  };
}

export function useSchedule() {
  const [view, setViewInternal] = useState<'home' | 'schedule' | 'matriz' | 'disciplines' | 'admin'>(() => {
    try {
      const stored = localStorage.getItem('view_preference');
      const validView = (stored === 'home' || stored === 'schedule' || stored === 'matriz' || stored === 'disciplines' || stored === 'admin') ? stored : 'home';
      
      // Se tentar abrir 'admin' fora do localhost, força o redirecionamento para 'home'
      if (validView === 'admin' && !canAccessAdmin()) {
        return 'home';
      }
      return validView;
    } catch {
      return 'home';
    }
  });

  const setView = (newView: 'home' | 'schedule' | 'matriz' | 'disciplines' | 'admin') => {
    // Bloqueia qualquer tentativa programática de ir para o admin fora do localhost
    if (newView === 'admin' && !canAccessAdmin()) {
      setViewInternal('home');
    } else {
      setViewInternal(newView);
    }
  };

  const [gradeTitle, setGradeTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('saved_gradeTitle') || '';
    } catch {
      return '';
    }
  });

  const initialCourse = (() => {
    try {
      return localStorage.getItem('selectedCourse') || null;
    } catch {
      return null;
    }
  })();

  const initialSemester = (() => {
    try {
      return localStorage.getItem('selectedSemester') || '2026.1';
    } catch {
      return '2026.1';
    }
  })();

  const [selectedSemester, setSelectedSemester] = useState<string>(initialSemester);
  const [availableSemesters, setAvailableSemesters] = useState<string[]>(['2026.1', '2026.2']);

  useEffect(() => {
    try {
      localStorage.setItem('selectedSemester', selectedSemester);
    } catch (e) {
      console.error('Failed to save selectedSemester', e);
    }
  }, [selectedSemester]);

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
      if (initialCourse) {
        const stored = localStorage.getItem(`schedule_${initialCourse}_${initialSemester}`) || (initialSemester === '2026.1' ? localStorage.getItem(`schedule_${initialCourse}`) : null);
        return stored ? JSON.parse(stored).map(sanitizeDiscipline) : [];
      }
    } catch (e) {
      console.error('Failed to load schedule', e);
    }
    return [];
  });

  const lastLoadedCourseRef = useRef<string | null>(initialCourse);
  const lastLoadedSemesterRef = useRef<string>(initialSemester);

  const [disciplinesList, setDisciplinesList] = useState<Discipline[]>(() => {
    try {
      const stored = localStorage.getItem('saved_disciplinesList');
      return stored ? JSON.parse(stored).map(sanitizeDiscipline) : [];
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
  const [selectedCourse, setSelectedCourse] = useState<string | null>(initialCourse);

  const changeCourse = (course: string | null) => {
    if (!course) {
      lastLoadedCourseRef.current = null;
      setSelectedCourse(null);
      setSchedule([]);
      setDisciplinesList([]);
      setGradeTitle('');
      try {
        localStorage.removeItem('selectedCourse');
      } catch {}
      return;
    }

    lastLoadedCourseRef.current = course;
    setSelectedCourse(course);
    try {
      localStorage.setItem('selectedCourse', course);
    } catch {}

    const sem = selectedSemester || '2026.1';
    lastLoadedSemesterRef.current = sem;

    // Carregar imediatamente a grade salva para este curso específico e semestre
    try {
      const stored = localStorage.getItem(`schedule_${course}_${sem}`) || (sem === '2026.1' ? localStorage.getItem(`schedule_${course}`) : null);
      setSchedule(stored ? JSON.parse(stored).map(sanitizeDiscipline) : []);
    } catch {
      setSchedule([]);
    }

    // Resetar catálogo para não mostrar disciplinas do curso anterior enquanto a API carrega
    setDisciplinesList([]);
    setGradeTitle('');

    try {
      const stored = localStorage.getItem(`selected_profile_${course}`);
      setSelectedProfile(stored && stored !== 'todos' ? stored : 'all');
    } catch {
      setSelectedProfile('all');
    }

    // Buscar os semestres disponíveis do curso
    fetch(`/api/courses/${course}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.course?.semesters && Array.isArray(data.course.semesters) && data.course.semesters.length > 0) {
          setAvailableSemesters(data.course.semesters);
          if (!data.course.semesters.includes(selectedSemester)) {
            const defaultSem = data.course.semesters[0] || '2026.1';
            setSelectedSemester(defaultSem);
            lastLoadedSemesterRef.current = defaultSem;
            try {
              const stored = localStorage.getItem(`schedule_${course}_${defaultSem}`) || (defaultSem === '2026.1' ? localStorage.getItem(`schedule_${course}`) : null);
              setSchedule(stored ? JSON.parse(stored).map(sanitizeDiscipline) : []);
            } catch {
              setSchedule([]);
            }
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (selectedCourse) {
      fetch(`/api/courses/${selectedCourse}?semester=${selectedSemester}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.course?.semesters && Array.isArray(data.course.semesters) && data.course.semesters.length > 0) {
            setAvailableSemesters(data.course.semesters);
          }
        })
        .catch(() => {});
    }
  }, [selectedCourse]);

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
      // Trava de segurança: só persiste no localStorage se a grade em memória pertencer estritamente ao curso e semestre selecionados
      if (
        lastLoadedCourseRef.current === selectedCourse &&
        lastLoadedSemesterRef.current === selectedSemester
      ) {
        try {
          const sem = selectedSemester || '2026.1';
          localStorage.setItem(`schedule_${selectedCourse}_${sem}`, JSON.stringify(schedule));
          if (sem === '2026.1') {
            localStorage.setItem(`schedule_${selectedCourse}`, JSON.stringify(schedule));
          }
        } catch (e) {
          console.error('Failed to save schedule to localStorage', e);
        }
      }
    }
  }, [schedule, selectedCourse, selectedSemester]);

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

  const availableProfiles = useMemo(() => {
    const set = new Set<string>();
    disciplinesList.forEach(d => {
      const prof = (d.profile || '').trim();
      if (prof && prof.toLowerCase() !== 'optativa' && prof.toLowerCase() !== 'sem perfil') {
        set.add(prof);
      }
    });
    return Array.from(set).sort();
  }, [disciplinesList]);

  const [selectedProfile, setSelectedProfile] = useState<string>(() => {
    try {
      const course = localStorage.getItem('selectedCourse');
      const key = course ? `selected_profile_${course}` : 'saved_selectedProfile';
      const stored = localStorage.getItem(key) || localStorage.getItem('saved_selectedProfile');
      if (stored && stored !== 'todos') {
        return stored;
      }
      return 'all';
    } catch {
      return 'all';
    }
  });

  // Persist profile selection
  useEffect(() => {
    try {
      const key = selectedCourse ? `selected_profile_${selectedCourse}` : 'saved_selectedProfile';
      localStorage.setItem(key, selectedProfile);
      localStorage.setItem('saved_selectedProfile', selectedProfile);
    } catch (e) {
      console.error('Failed to save selectedProfile', e);
    }
  }, [selectedProfile, selectedCourse]);

  // Synchronize and restore profile selection from localStorage when course or availableProfiles change
  useEffect(() => {
    if (selectedCourse) {
      try {
        const stored = localStorage.getItem(`selected_profile_${selectedCourse}`);
        if (stored && stored !== 'todos') {
          if (availableProfiles.length === 0 || availableProfiles.includes(stored) || stored === 'all') {
            if (selectedProfile !== stored) {
              setSelectedProfile(stored);
            }
            return;
          }
        }
      } catch {}
    }
    // Only fall back to 'all' if availableProfiles is populated and current selection is not in it
    if (availableProfiles.length > 0 && selectedProfile !== 'all' && !availableProfiles.includes(selectedProfile)) {
      setSelectedProfile('all');
    }
  }, [availableProfiles, selectedCourse]);

  const isDisciplineOptativaOrCommon = (d: Discipline): boolean => {
    if (d.period === 0) return true;
    const prof = (d.profile || '').trim().toLowerCase();
    if (!prof || prof === 'optativa' || prof === 'sem perfil') return true;
    return false;
  };

  const periods = useMemo(() => {
    const filteredList = (selectedProfile === 'all' || availableProfiles.length <= 1)
      ? disciplinesList
      : disciplinesList.filter(d => isDisciplineOptativaOrCommon(d) || d.profile === selectedProfile);

    const listToUse = filteredList.length > 0 ? filteredList : disciplinesList;
    return Array.from(new Set(listToUse.map(d => d.period))).sort((a, b) => {
      const periodA = a as number;
      const periodB = b as number;
      if (periodA === 0) return 1;
      if (periodB === 0) return -1;
      return periodA - periodB;
    }) as number[];
  }, [disciplinesList, selectedProfile, availableProfiles]);

  useEffect(() => {
    if (periods.length > 0 && !periods.includes(selectedPeriod)) {
      setSelectedPeriod(periods[0]);
    }
  }, [periods, selectedPeriod]);
  
  const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const normalizedSearchQuery = normalizeString(searchQuery);

  const displayedDisciplines = (searchQuery 
    ? disciplinesList.filter(d => 
        normalizeString(d.name).includes(normalizedSearchQuery) || 
        normalizeString(d.professor).includes(normalizedSearchQuery) ||
        (d.profile && normalizeString(d.profile).includes(normalizedSearchQuery))
      )
    : disciplinesList.filter(d => d.period === selectedPeriod)
  ).filter(d => {
    if (selectedProfile === 'all' || availableProfiles.length <= 1) return true;
    // Optativa não é perfil: disciplinas optativas ou comuns pertencem a todos os perfis!
    if (isDisciplineOptativaOrCommon(d)) return true;
    return d.profile === selectedProfile;
  });

  const loadCourseSchedule = async (courseId: string, semester: string) => {
    try {
      const res = await fetch(`/api/courses/${courseId}?semester=${semester}`);
      if (res.ok) {
        const data = await res.json();
        if (data.course?.semesters && Array.isArray(data.course.semesters) && data.course.semesters.length > 0) {
          setAvailableSemesters(data.course.semesters);
        }
        let availableOfferings: Discipline[] = [];
        if (Array.isArray(data.schedule)) {
          availableOfferings = data.schedule.map(sanitizeDiscipline);
          setDisciplinesList(availableOfferings);
          const name = data.course?.shortName || data.course?.name || courseId.toUpperCase();
          setGradeTitle(`${name} - Período ${semester}`);
        }
        // Restaurar turmas que o aluno já havia selecionado para esse semestre específico
        const savedUserSchedule = localStorage.getItem(`schedule_${courseId}_${semester}`) || (semester === '2026.1' ? localStorage.getItem(`schedule_${courseId}`) : null);
        let parsedSchedule: Discipline[] = savedUserSchedule ? JSON.parse(savedUserSchedule).map(sanitizeDiscipline) : [];

        // Autocorreção (self-healing): Se houver disciplinas salvas no localStorage que não pertencem
        // a este curso (ex: contaminação cruzada anterior), purgar imediatamente.
        if (availableOfferings.length > 0 && parsedSchedule.length > 0) {
          const validIds = new Set(availableOfferings.map(d => d.id));
          const validCodes = new Set(availableOfferings.map(d => d.code).filter(Boolean));
          const cleanSchedule = parsedSchedule.filter(d => validIds.has(d.id) || (d.code && validCodes.has(d.code)));
          if (cleanSchedule.length !== parsedSchedule.length) {
            parsedSchedule = cleanSchedule;
            try {
              localStorage.setItem(`schedule_${courseId}_${semester}`, JSON.stringify(cleanSchedule));
              if (semester === '2026.1') {
                localStorage.setItem(`schedule_${courseId}`, JSON.stringify(cleanSchedule));
              }
            } catch {}
          }
        }

        lastLoadedCourseRef.current = courseId;
        lastLoadedSemesterRef.current = semester;
        setSchedule(parsedSchedule);
        return true;
      }
    } catch (err) {
      console.error(`Erro ao carregar horário do curso ${courseId} para semestre ${semester}:`, err);
    }
    return false;
  };

  const loadPredefinedGrade = async (type: string, semesterToLoad?: string) => {
    const sem = semesterToLoad || selectedSemester || '2026.1';
    setSelectedSemester(sem);
    localStorage.setItem('selectedSemester', sem);

    const loaded = await loadCourseSchedule(type, sem);
    if (!loaded) {
      let fallbackList: Discipline[] = [];
      if (type === 'eal' || type === 'engenharia-de-alimentos') {
        fallbackList = eal2026_1.map(sanitizeDiscipline);
        setDisciplinesList(fallbackList);
        setGradeTitle(`EAL - Engenharia de Alimentos - Período ${sem}`);
      } else if (type === 'adm') {
        fallbackList = adm2026_1.map(sanitizeDiscipline);
        setDisciplinesList(fallbackList);
        setGradeTitle(`ADM - Administração - Período ${sem}`);
      } else if (type === 'bcc') {
        fallbackList = bcc2026_1.map(sanitizeDiscipline);
        setDisciplinesList(fallbackList);
        setGradeTitle(`BCC - Bacharelado em Ciência da Computação - Período ${sem}`);
      }
      const stored = localStorage.getItem(`schedule_${type}_${sem}`) || (sem === '2026.1' ? localStorage.getItem(`schedule_${type}`) : null);
      let parsedSchedule: Discipline[] = stored ? JSON.parse(stored).map(sanitizeDiscipline) : [];

      if (fallbackList.length > 0 && parsedSchedule.length > 0) {
        const validIds = new Set(fallbackList.map(d => d.id));
        const validCodes = new Set(fallbackList.map(d => d.code).filter(Boolean));
        const cleanSchedule = parsedSchedule.filter(d => validIds.has(d.id) || (d.code && validCodes.has(d.code)));
        if (cleanSchedule.length !== parsedSchedule.length) {
          parsedSchedule = cleanSchedule;
          try {
            localStorage.setItem(`schedule_${type}_${sem}`, JSON.stringify(cleanSchedule));
            if (sem === '2026.1') {
              localStorage.setItem(`schedule_${type}`, JSON.stringify(cleanSchedule));
            }
          } catch {}
        }
      }

      lastLoadedCourseRef.current = type;
      lastLoadedSemesterRef.current = sem;
      setSchedule(parsedSchedule);
    }
    
    setSelectedPeriod(1);
    try {
      const storedProf = localStorage.getItem(`selected_profile_${type}`);
      if (storedProf && storedProf !== 'todos') {
        setSelectedProfile(storedProf);
      } else {
        setSelectedProfile('all');
      }
    } catch {
      setSelectedProfile('all');
    }
    setSearchQuery('');
    setView('schedule');
  };

  const handleSemesterChange = async (newSemester: string) => {
    setSelectedSemester(newSemester);
    localStorage.setItem('selectedSemester', newSemester);
    if (selectedCourse) {
      lastLoadedSemesterRef.current = newSemester;
      const stored = localStorage.getItem(`schedule_${selectedCourse}_${newSemester}`) || (newSemester === '2026.1' ? localStorage.getItem(`schedule_${selectedCourse}`) : null);
      setSchedule(stored ? JSON.parse(stored).map(sanitizeDiscipline) : []);
      await loadCourseSchedule(selectedCourse, newSemester);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

      const response = await fetch("/api/extract-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Data,
          mimeType: file.type || "application/pdf",
          fileName: file.name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao processar o PDF.");
      }

      const responseData = await response.json();
      const newDisciplines = responseData.disciplines;

      if (newDisciplines && Array.isArray(newDisciplines) && newDisciplines.length > 0) {
        const errors = validateExtraction(newDisciplines, 'schedule').filter(issue => issue.severity === 'error');
        if (errors.length) throw new Error('A grade precisa de revisão no Administrador: ' + errors.map(issue => issue.message).join(' '));
        const sanitizedDisciplines = newDisciplines;
        if (responseData._extraction?.issues?.length) setConflictMsg('Extração com pendências: ' + responseData._extraction.issues.map((issue: any) => issue.message).join(' '));
        
        setDisciplinesList(sanitizedDisciplines);
        const newTitle = responseData.title || (responseData.courseName ? `${responseData.courseName} - Horário 2026.1` : file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "));
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
        setSelectedProfile('all');
        setView('schedule');
        saveGradeToLocal(newTitle, sanitizedDisciplines);
      } else {
        setConflictMsg("O PDF não contém uma grade válida ou nenhuma disciplina foi encontrada.");
        setTimeout(() => setConflictMsg(null), 5000);
      }
    } catch (e: any) {
      console.error("Generation error:", e);
      setConflictMsg(e.message || "Erro ao processar o PDF. Certifique-se de que é um documento válido.");
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
    hasApiKey: true,
    view,
    setView,
    gradeTitle,
    setGradeTitle,
    selectedPeriod,
    setSelectedPeriod,
    schedule,
    disciplinesList,
    setDisciplinesList,
    conflictMsg,
    isProcessingPdf,
    fileInputRef,
    mobileTab,
    setMobileTab,
    searchQuery,
    setSearchQuery,
    periods,
    availableProfiles,
    selectedProfile,
    setSelectedProfile,
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
    selectedSemester,
    setSelectedSemester,
    availableSemesters,
    setAvailableSemesters,
    handleSemesterChange,
    loadCourseSchedule,
  };
}
