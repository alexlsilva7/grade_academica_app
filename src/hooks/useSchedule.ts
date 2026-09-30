import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Discipline, TimeSlot } from '../types';
import { TIMESLOTS } from '../constants';
import { canAccessAdmin } from '../utils/domain';
import { validateExtraction } from '../utils/extraction';
import { apiFetch } from '../utils/api';
import { useCompletedDisciplines } from './useCompletedDisciplines';
import { curriculumCompletionCatalog } from '../utils/disciplineCompletion';
import { buildAppLocation, parseAppLocation, writeAppLocation, type AppLocation, type AppView } from '../utils/appLocation';

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
  const initialRouteRef = useRef<AppLocation | null>(null);
  if (!initialRouteRef.current) initialRouteRef.current = parseAppLocation(window.location.pathname, window.location.search);
  const initialRoute = initialRouteRef.current;
  const routeWriteModeRef = useRef<'push' | 'replace'>('replace');
  const applyingPopStateRef = useRef(false);
  const routedProfileRef = useRef(initialRoute.invalid ? null : initialRoute.profile);

  const [view, setViewInternal] = useState<AppView>(() => {
    try {
      const validView = initialRoute.invalid ? 'home' : initialRoute.view;
      if (validView === 'admin' && !canAccessAdmin()) {
        return 'home';
      }
      return validView;
    } catch {
      return 'home';
    }
  });

  const setView = (newView: AppView) => {
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
      if (!initialRoute.invalid && initialRoute.view !== 'home' && initialRoute.view !== 'admin' && initialRoute.course) {
        return initialRoute.course;
      }
      return localStorage.getItem('selectedCourse') || null;
    } catch {
      return null;
    }
  })();

  const initialSemester = (() => {
    try {
      if (!initialRoute.invalid && initialRoute.semester) return initialRoute.semester;
      return localStorage.getItem('selectedSemester') || '2026.1';
    } catch {
      return '2026.1';
    }
  })();

  const [selectedSemester, setSelectedSemester] = useState<string>(initialSemester);
  const selectedSemesterRef = useRef(initialSemester);
  const selectedCourseRef = useRef(initialCourse);
  const scheduleRequestRef = useRef(0);
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
  const [courseCurriculum, setCourseCurriculum] = useState<any | null>(null);
  const [courseContents, setCourseContents] = useState<any | null>(null);

  const [savedGrades, setSavedGrades] = useState<SavedGrade[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(initialCourse);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [scheduleLoadError, setScheduleLoadError] = useState<string | null>(null);
  const [scheduleDataInfo, setScheduleDataInfo] = useState<{ sources: string[]; updatedAt: string | null } | null>(null);

  const changeCourse = (course: string | null) => {
    selectedCourseRef.current = course;
    routedProfileRef.current = null;
    scheduleRequestRef.current += 1;
    if (!course) {
      lastLoadedCourseRef.current = null;
      setSelectedCourse(null);
      setCourseCurriculum(null);
      setCourseContents(null);
      setSchedule([]);
      setDisciplinesList([]);
      setGradeTitle('');
      setAvailableSemesters([]);
      setScheduleDataInfo(null);
      setScheduleLoadError(null);
      setIsScheduleLoading(false);
      try {
        localStorage.removeItem('selectedCourse');
      } catch {}
      return;
    }

    lastLoadedCourseRef.current = course;
    setSelectedCourse(course);
    setCourseCurriculum(null);
    setCourseContents(null);
    try {
      localStorage.setItem('selectedCourse', course);
    } catch {}

    const sem = selectedSemesterRef.current || '2026.1';
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
    setAvailableSemesters([]);
    setScheduleLoadError(null);
    setIsScheduleLoading(false);
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

  useEffect(() => {
    try {
      const stored = localStorage.getItem('savedGrades');
      if (stored) {
        setSavedGrades(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load from localStorage', e);
    }
  }, []);

  const toggleCompleted = (discipline: Discipline) => {
    completion.setCompleted(discipline, !completion.isCompleted(discipline));
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
      if (!initialRoute.invalid && initialRoute.profile) return initialRoute.profile;
      const course = localStorage.getItem('selectedCourse');
      const key = course ? `selected_profile_${course}` : 'saved_selectedProfile';
      const stored = course ? localStorage.getItem(key) : localStorage.getItem('saved_selectedProfile');
      if (stored && stored !== 'todos') {
        return stored;
      }
      return 'all';
    } catch {
      return 'all';
    }
  });

  const completionCatalog = useMemo(() => curriculumCompletionCatalog(courseCurriculum,
    lastLoadedCourseRef.current === selectedCourse && (courseCurriculum || scheduleDataInfo) ? disciplinesList : []),
  [courseCurriculum, disciplinesList, selectedCourse, scheduleDataInfo]);
  const completion = useCompletedDisciplines(selectedCourse, completionCatalog);
  const { completedDisciplines, isCompleted: isDisciplineCompleted } = completion;

  useEffect(() => {
    if (!completion.ready || lastLoadedCourseRef.current !== selectedCourse || lastLoadedSemesterRef.current !== selectedSemester) return;
    setSchedule(previous => {
      const next = previous.filter(discipline => !isDisciplineCompleted(discipline));
      return next.length === previous.length ? previous : next;
    });
  }, [completion.ready, isDisciplineCompleted, selectedCourse, selectedSemester, schedule]);

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
    if (routedProfileRef.current) {
      if (availableProfiles.length > 0 && !availableProfiles.includes(routedProfileRef.current)) {
        routedProfileRef.current = null;
        setSelectedProfile('all');
      }
      return;
    }
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

  const routeInitializedRef = useRef(false);
  const [routeRevision, setRouteRevision] = useState(0);
  const routeHref = buildAppLocation({ view, course: selectedCourse, semester: selectedSemester, profile: selectedProfile });
  useEffect(() => {
    if (applyingPopStateRef.current) {
      applyingPopStateRef.current = false;
      routeInitializedRef.current = true;
      routeWriteModeRef.current = 'push';
      return;
    }
    const currentHref = `${window.location.pathname}${window.location.search}`;
    const mode = routeInitializedRef.current ? routeWriteModeRef.current : 'replace';
    writeAppLocation(currentHref, { view, course: selectedCourse, semester: selectedSemester, profile: selectedProfile }, window.history, mode);
    routeInitializedRef.current = true;
    routeWriteModeRef.current = 'push';
  }, [routeHref, routeRevision]);

  useEffect(() => {
    const handlePopState = () => {
      const route = parseAppLocation(window.location.pathname, window.location.search);
      const nextView = route.invalid || (route.view === 'admin' && !canAccessAdmin()) ? 'home' : route.view;
      if (route.invalid || (route.view === 'admin' && !canAccessAdmin())) window.history.replaceState({}, '', '/');
      applyingPopStateRef.current = true;
      routeWriteModeRef.current = 'replace';
      setRouteRevision(revision => revision + 1);
      if (route.course && route.course !== selectedCourseRef.current) changeCourse(route.course);
      if (route.semester) {
        selectedSemesterRef.current = route.semester;
        setSelectedSemester(route.semester);
      }
      if (route.view !== 'home' && route.view !== 'admin' && route.view !== 'calendar' && !route.invalid) {
        routedProfileRef.current = route.profile;
        setSelectedProfile(route.profile || 'all');
      } else {
        routedProfileRef.current = null;
      }
      setViewInternal(nextView);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedCourse]);

  useEffect(() => {
    if (!selectedCourse || view === 'calendar') return;
    let cancelled = false;
    apiFetch('/api/courses').then(async response => {
      if (!response.ok) return null;
      const data = await response.json();
      return Array.isArray(data.courses) ? data.courses as Array<{
        id: string; shortName?: string; semesters?: string[]; visibleSemesters?: string[];
      }> : [];
    }).then(courses => {
      if (cancelled || !courses) return;
      const matchingCourse = courses.find(course => {
        const requested = selectedCourse.toLowerCase();
        const aliases = course.id === 'eal' ? ['eal', 'engenharia-de-alimentos']
          : course.id === 'medicina-veterinaria' ? ['medicina-veterinaria', 'mvet', 'vet']
            : [course.id.toLowerCase(), course.shortName?.toLowerCase() || ''];
        return aliases.includes(requested);
      });
      if (!matchingCourse) {
        routeWriteModeRef.current = 'replace';
        changeCourse(null);
        setView('home');
        return;
      }
      const visibleSemesters = matchingCourse.visibleSemesters?.length
        ? matchingCourse.visibleSemesters
        : matchingCourse.semesters || [];
      const requestedSemester = selectedSemesterRef.current;
      if (visibleSemesters.length > 0 && !visibleSemesters.includes(requestedSemester)) {
        const fallbackSemester = visibleSemesters[0];
        routeWriteModeRef.current = 'replace';
        selectedSemesterRef.current = fallbackSemester;
        setSelectedSemester(fallbackSemester);
        try { localStorage.setItem('selectedSemester', fallbackSemester); } catch {}
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [selectedCourse, view]);

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
    const requestId = ++scheduleRequestRef.current;
    const isCurrent = () => requestId === scheduleRequestRef.current
      && selectedCourseRef.current === courseId
      && selectedSemesterRef.current === semester;
    setIsScheduleLoading(true);
    setScheduleLoadError(null);
    try {
      const res = await apiFetch(`/api/courses/${encodeURIComponent(courseId)}?semester=${encodeURIComponent(semester)}&include=curriculum,contents,schedule`);
      if (!isCurrent()) return false;
      if (!res.ok) {
        if (res.status === 404) {
          routeWriteModeRef.current = 'replace';
          changeCourse(null);
          setView('home');
          return false;
        }
        const error = await res.json().catch(() => null);
        throw new Error(error?.error || 'Não foi possível carregar o horário do curso.');
      }
      const data = await res.json();
      if (!isCurrent()) return false;
      const course = data?.course;
      if (!course) {
        routeWriteModeRef.current = 'replace';
        changeCourse(null);
        setView('home');
        return false;
      }
      const resolvedSemester = typeof data.resolvedSemester === 'string' ? data.resolvedSemester : semester;
      if (resolvedSemester !== semester) {
        routeWriteModeRef.current = 'replace';
        selectedSemesterRef.current = resolvedSemester;
        setSelectedSemester(resolvedSemester);
        try { localStorage.setItem('selectedSemester', resolvedSemester); } catch {}
        return false;
      }
      const semesters = Array.isArray(course.semesters) ? course.semesters : [];
      const visible = Array.isArray(course.visibleSemesters) && course.visibleSemesters.length > 0
        ? course.visibleSemesters
        : semesters;
      setAvailableSemesters(visible);
      if (visible.length && !visible.includes(semester)) {
        const fallback = visible[0];
        routeWriteModeRef.current = 'replace';
        selectedSemesterRef.current = fallback;
        lastLoadedSemesterRef.current = fallback;
        setSelectedSemester(fallback);
        try { localStorage.setItem('selectedSemester', fallback); } catch {}
        return false;
      }

      setCourseCurriculum(data.curriculum || null);
      setCourseContents(data.contents || null);
      const reportSources = Array.isArray(data.scheduleExtraction?.sources)
        ? data.scheduleExtraction.sources.filter((source: unknown): source is string => typeof source === 'string')
        : [];
      setScheduleDataInfo({
        sources: reportSources,
        updatedAt: typeof data.scheduleUpdatedAt === 'string' ? data.scheduleUpdatedAt : null
      });
      const availableOfferings: Discipline[] = Array.isArray(data.schedule) ? data.schedule.map(sanitizeDiscipline) : [];
      setDisciplinesList(availableOfferings);
      const name = course.shortName || course.name || courseId.toUpperCase();
      setGradeTitle(`${name} - Período ${data.resolvedSemester || semester}`);

      const savedUserSchedule = localStorage.getItem(`schedule_${courseId}_${semester}`)
        || (semester === '2026.1' ? localStorage.getItem(`schedule_${courseId}`) : null);
      let parsedSchedule: Discipline[] = savedUserSchedule ? JSON.parse(savedUserSchedule).map(sanitizeDiscipline) : [];
      if (availableOfferings.length > 0 && parsedSchedule.length > 0) {
        const validIds = new Set(availableOfferings.map(d => d.id));
        const validCodes = new Set(availableOfferings.map(d => d.code).filter(Boolean));
        const cleanSchedule = parsedSchedule.filter(d => validIds.has(d.id) || (d.code && validCodes.has(d.code)));
        if (cleanSchedule.length !== parsedSchedule.length) {
          parsedSchedule = cleanSchedule;
          try {
            localStorage.setItem(`schedule_${courseId}_${semester}`, JSON.stringify(cleanSchedule));
            if (semester === '2026.1') localStorage.setItem(`schedule_${courseId}`, JSON.stringify(cleanSchedule));
          } catch {}
        }
      }
      if (!isCurrent()) return false;
      lastLoadedCourseRef.current = courseId;
      lastLoadedSemesterRef.current = semester;
      setSchedule(parsedSchedule);
      return true;
    } catch (err) {
      if (!isCurrent()) return false;
      console.error(`Erro ao carregar horário do curso ${courseId} para semestre ${semester}:`, err);
      setSchedule([]);
      setDisciplinesList([]);
      setGradeTitle('');
      setScheduleDataInfo(null);
      setScheduleLoadError(err instanceof Error ? err.message : 'Não foi possível carregar o horário do curso.');
      return false;
    } finally {
      if (isCurrent()) setIsScheduleLoading(false);
    }
  };

  useEffect(() => {
    if (view !== 'schedule') return;
    if (!selectedCourse) {
      routeWriteModeRef.current = 'replace';
      setView('home');
      return;
    }
    void loadCourseSchedule(selectedCourse, selectedSemester);
    // The request identity is represented by these three state values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedCourse, selectedSemester]);

  const loadPredefinedGrade = async (type: string, semesterToLoad?: string) => {
    const sem = semesterToLoad || selectedSemester || '2026.1';
    selectedCourseRef.current = type;
    selectedSemesterRef.current = sem;
    scheduleRequestRef.current += 1;
    setSelectedSemester(sem);
    localStorage.setItem('selectedSemester', sem);
    setScheduleLoadError(null);

    setSelectedPeriod(1);
    try {
      const storedProf = localStorage.getItem(`selected_profile_${type}`);
      setSelectedProfile(storedProf && storedProf !== 'todos' ? storedProf : 'all');
    } catch {
      setSelectedProfile('all');
    }
    setSearchQuery('');
    setView('schedule');
  };
  const handleSemesterChange = async (newSemester: string) => {
    selectedSemesterRef.current = newSemester;
    scheduleRequestRef.current += 1;
    setSelectedSemester(newSemester);
    localStorage.setItem('selectedSemester', newSemester);
    if (selectedCourse) {
      lastLoadedSemesterRef.current = newSemester;
      const stored = localStorage.getItem(`schedule_${selectedCourse}_${newSemester}`) || (newSemester === '2026.1' ? localStorage.getItem(`schedule_${selectedCourse}`) : null);
      setSchedule(stored ? JSON.parse(stored).map(sanitizeDiscipline) : []);
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

      const response = await apiFetch("/api/extract-schedule", {
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
    const isCompleted = isDisciplineCompleted(disc);
    if (isCompleted) return null;

    if (schedule.some(d => d.id === disc.id)) return null;
    const conflictCheck = hasConflict(disc);
    if (conflictCheck.conflict) {
      return { withName: conflictCheck.withName };
    }
    return null;
  };

  const toggleDiscipline = (disc: Discipline) => {
    const isCompleted = isDisciplineCompleted(disc);
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
          completion.replaceAll(data.completedDisciplines);
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
    isScheduleLoading,
    scheduleLoadError,
    scheduleDataInfo,
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
    courseCurriculum,
    courseContents,
    savedGrades,
    loadSavedGrade,
    removeSavedGrade,
    completedDisciplines,
    isDisciplineCompleted,
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
