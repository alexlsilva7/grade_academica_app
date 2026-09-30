import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Search, 
  HelpCircle, 
  RotateCcw, 
  GraduationCap, 
  Info,
  ChevronRight,
  Eye,
  Award,
  Download,
  Upload,
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  BarChart2,
  Loader2,
  Plus,
  Pencil
} from 'lucide-react';
import { ThemeMode } from '../hooks/useSchedule';
import { Navbar } from './Navbar';
import { motion } from 'motion/react';
import { CurriculumProfile } from '../types';
import { apiFetch } from '../utils/api';
import { MatrizTour } from './MatrizTour';
import { ElectiveEditorModal } from './ElectiveEditorModal';
import { applyMatrixProgressImport, matrixProgressKey, readStoredHours, restoreMatrixProgress } from '../utils/matrixProgress';
import type { MatrixSubject as Subject } from '../utils/matrixProgress';
import { countedMatrixSubjects, electiveAlreadyAssigned, electiveIdentity, getElectiveCatalog, isElective, isGenericElective, lastMatrixPeriod, matrixSubjectCode, matrixSubjectHours, matrixSubjectName, normalizeMatrixText, releaseElectiveSelection } from '../utils/matrixElectives';
import type { ElectiveSelection } from '../utils/matrixElectives';
import { useCompletedDisciplines } from '../hooks/useCompletedDisciplines';
import { applySubjectCompletions, curriculumCompletionCatalog } from '../utils/disciplineCompletion';

function prerequisiteValues(source: any): unknown {
  if (Object.prototype.hasOwnProperty.call(source, 'prereqs')) return source.prereqs;
  if (Object.prototype.hasOwnProperty.call(source, 'prerequisites')) return source.prerequisites;
  return null;
}

function mapSubject(source: any, index: number): any {
  const requirements = prerequisiteValues(source);
  return {
    id: source.id || source.code || `subject_${index}`,
    code: source.code,
    name: source.name || source.nome || `Disciplina ${index + 1}`,
    hours: source.hours ?? source.workload?.total ?? source.workload?.total_hours ?? null,
    period: source.period == null ? 0 : source.period === 'Optativa' ? 0 : Number(source.period),
    type: isElective(source) ? 'optativa' : (source.type || 'computacao'),
    prereqs: Array.isArray(requirements) ? requirements.map((item: any) => typeof item === 'string' ? item : item.id || item.code || item.name).filter(Boolean) : null,
    desc: source.desc || source.ementa || '',
  };
}

function mapProfileSubjects(sources: any[]): any[] {
  const mapped = sources.map(mapSubject);
  const ids = new Map<string, string>();
  sources.forEach((source, index) => {
    for (const value of [source.id, source.code, source.name]) {
      if (typeof value === 'string' && value.trim()) ids.set(value.trim().toLowerCase(), mapped[index].id);
    }
  });
  return mapped.map((subject, index) => {
    const requirements = prerequisiteValues(sources[index]);
    return {
      ...subject,
      prereqs: Array.isArray(requirements) ? requirements.map((item: any) => {
        const ref = typeof item === 'string' ? item : item.id || item.code || item.name;
        return typeof ref === 'string' ? ids.get(ref.trim().toLowerCase()) || ref : null;
      }).filter(Boolean) : null
    };
  });
}

function mapCurriculumProfiles(curriculum: any, course: string | null, courseName: string): CurriculumProfile[] {
  const rawProfiles = Array.isArray(curriculum?.profiles) ? curriculum.profiles : null;
  if (rawProfiles?.length) {
    return rawProfiles.map((profile: any, index: number) => ({
      ...profile,
      id: profile.id || profile.code || `perfil_${index + 1}`,
      name: profile.name || profile.description || profile.id || `Perfil ${index + 1}`,
      subjects: mapProfileSubjects(Array.isArray(profile.subjects) ? profile.subjects : []),
    }));
  }
  const rawSubjects = Array.isArray(curriculum) ? curriculum
    : Array.isArray(curriculum?.subjects) ? curriculum.subjects
      : Array.isArray(curriculum?.treeSubjects) ? curriculum.treeSubjects : [];
  if (!rawSubjects.length) return [];
  return [{
    id: course || 'curso',
    name: courseName || curriculum?.courseName || 'Matriz curricular',
    totalHours: curriculum?.requisitos?.total ?? null,
    acexHours: curriculum?.requisitos?.acex_extensao ?? null,
    accHours: curriculum?.requisitos?.acc_complementar ?? null,
    optativeHours: null,
    subjects: mapProfileSubjects(rawSubjects),
  } as CurriculumProfile];
}
interface MatrizViewProps {
  setView: (view: 'home' | 'schedule' | 'matriz' | 'disciplines') => void;
  course: string | null;
  darkMode: boolean;
  themePreference: ThemeMode;
  cycleTheme: () => void;
  schedule?: import('../types').Discipline[];
  selectedProfile?: string;
  setSelectedProfile?: (profile: string) => void;
}

export function MatrizView({ 
  setView, 
  course, 
  darkMode, 
  themePreference, 
  cycleTheme, 
  schedule, 
  selectedProfile, 
  setSelectedProfile 
}: MatrizViewProps) {
  const [availableProfiles, setAvailableProfiles] = useState<CurriculumProfile[]>([]);
  const [loadedCurriculum, setLoadedCurriculum] = useState<unknown>(null);
  const [loadedCourseName, setLoadedCourseName] = useState<string>('');
  const [dataSources, setDataSources] = useState<string[]>([]);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    if (selectedProfile && selectedProfile !== 'all') return selectedProfile;
    const key = course ? `selected_profile_${course}` : 'saved_selectedProfile';
    const stored = localStorage.getItem(key);
    return stored && stored !== 'all' && stored !== 'todos' ? stored : '';
  });

  useEffect(() => {
    let isCancelled = false;
    setAvailableProfiles([]);
    setLoadedCurriculum(null);
    setLoadedCourseName('');
    setDataSources([]);
    setDataUpdatedAt(null);
    setLoadStatus('loading');
    async function loadCourseData() {
      try {
        const res = await apiFetch(`/api/courses/${course || 'bcc'}?include=curriculum`);
        if (!res.ok) throw new Error('Não foi possível carregar o currículo do curso.');
        const data = await res.json();
        if (isCancelled) return;
        const courseName = data.course?.name || data.curriculum?.courseName || '';
        setLoadedCourseName(courseName);
        const sources = data.curriculum?.extraction?.sources;
        setDataSources(Array.isArray(sources) ? sources.filter((source: unknown): source is string => typeof source === 'string') : []);
        setDataUpdatedAt(typeof data.curriculum?.export_date === 'string' ? data.curriculum.export_date : null);
        const profiles = mapCurriculumProfiles(data.curriculum, course, courseName);
        setLoadedCurriculum(data.curriculum);
        setAvailableProfiles(profiles);
        setLoadStatus('ready');
        const key = course ? `selected_profile_${course}` : 'saved_selectedProfile';
        const stored = localStorage.getItem(key);
        const preferred = selectedProfile && selectedProfile !== 'all' ? selectedProfile : stored;
        const legacyVersion = localStorage.getItem(course ? `matrix_version_${course}` : 'bcc_matrix_version');
        const legacyProfile = legacyVersion === 'antiga' ? 'BCC02' : legacyVersion ? 'BCC03' : '';
        const selected = profiles.find(profile => profile.id === preferred)?.id
          || profiles.find(profile => profile.id === legacyProfile)?.id
          || profiles.find(profile => profile.id === data.curriculum?.activeProfileId)?.id
          || profiles[0]?.id
          || '';
        setActiveProfileId(selected);
        if (selectedProfile === 'all' && selected) setSelectedProfile?.(selected);
      } catch (error) {
        if (!isCancelled) {
          setAvailableProfiles([]);
          setActiveProfileId('');
          setDataSources([]);
          setDataUpdatedAt(null);
          setLoadStatus('error');
          console.error('Erro ao carregar currículo para MatrizView:', error);
        }
      }
    }
    void loadCourseData();
    return () => { isCancelled = true; };
  }, [course]);

  useEffect(() => {
    if (selectedProfile && selectedProfile !== 'all' && availableProfiles.some(profile => profile.id === selectedProfile)) {
      setActiveProfileId(selectedProfile);
    }
  }, [selectedProfile, availableProfiles]);

  const activeProfile = useMemo<CurriculumProfile>(() => {
    return availableProfiles.find(profile => profile.id === activeProfileId) || availableProfiles[0] || {
      id: activeProfileId || 'curriculum', name: loadedCourseName || 'Currículo', subjects: [],
      totalHours: null, acexHours: null, accHours: null, optativeHours: null
    };
  }, [availableProfiles, activeProfileId, loadedCourseName]);
  // Carregar disciplinas com estado a partir do perfil ativo e localStorage
  const [matrixSubjects, setSubjects] = useState<Subject[]>([]);
  const [electiveEditor, setElectiveEditor] = useState<{ subjectId: string | null; progressKey: string } | null>(null);
  const currentProgressKey = matrixProgressKey(course, activeProfile.id);
  const progressKeyRef = useRef(currentProgressKey);
  progressKeyRef.current = currentProgressKey;
  const [hydratedProgressKey, setHydratedProgressKey] = useState('');
  const completionCatalog = useMemo(() => curriculumCompletionCatalog({ profiles: availableProfiles }), [availableProfiles]);
  const completion = useCompletedDisciplines(course || 'bcc', completionCatalog);
  const subjects = useMemo(() => completion.ready
    ? applySubjectCompletions(matrixSubjects, completion.completedDisciplines, activeProfile.id)
    : matrixSubjects, [matrixSubjects, completion.ready, completion.completedDisciplines, activeProfile.id]);
  const electiveCatalog = useMemo(() => getElectiveCatalog(loadedCurriculum, activeProfile.id), [loadedCurriculum, activeProfile.id]);
  const countedSubjects = useMemo(() => countedMatrixSubjects(subjects), [subjects]);

  useEffect(() => {
    if (completion.ready && hydratedProgressKey === currentProgressKey) {
      setSubjects(previous => applySubjectCompletions(previous, completion.completedDisciplines, activeProfile.id));
    }
  }, [completion.ready, completion.completedDisciplines, activeProfile.id, hydratedProgressKey, currentProgressKey]);

  // Recarregar disciplinas e progresso quando perfil ativo mudar
  useEffect(() => {
    if (!availableProfiles.some(profile => profile.id === activeProfile.id) || !activeProfile.subjects) return;
    const key = matrixProgressKey(course, activeProfile.id);
    const legacyKey = activeProfile.id === 'BCC02' || activeProfile.id === 'antiga' ? 'bcc_matriz_progress_antiga' : 'bcc_matriz_progress';
    const saved = localStorage.getItem(key) || ((course === 'bcc' || !course) ? localStorage.getItem(legacyKey) : null);
    setSubjects(restoreMatrixProgress(activeProfile.subjects as Subject[], saved));
    setHydratedProgressKey(key);
  }, [activeProfile, availableProfiles, course]);

  // Persistir progresso do perfil ativo no localStorage
  useEffect(() => {
    if (!availableProfiles.some(profile => profile.id === activeProfile.id)) return;
    const key = currentProgressKey;
    if (hydratedProgressKey !== key || !completion.ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(subjects));
      if ((course === 'bcc' || !course) && (activeProfile.id === 'BCC03' || activeProfile.id === 'nova')) {
        localStorage.setItem('bcc_matriz_progress', JSON.stringify(subjects));
      } else if ((course === 'bcc' || !course) && (activeProfile.id === 'BCC02' || activeProfile.id === 'antiga')) {
        localStorage.setItem('bcc_matriz_progress_antiga', JSON.stringify(subjects));
      }
    } catch (e) {
      console.error('Falha ao salvar progresso da matriz', e);
    }
  }, [subjects, activeProfile, availableProfiles, course, hydratedProgressKey, completion.ready]);

  const [acexHours, setAcexHours] = useState(0);
  const [accHours, setAccHours] = useState(0);
  const [hydratedHoursKey, setHydratedHoursKey] = useState('');

  useEffect(() => {
    if (!availableProfiles.some(profile => profile.id === activeProfile.id)) return;
    const key = `${course || 'bcc'}_${activeProfile.id}`;
    const legacyAcex = (course === 'bcc' || !course) && (activeProfile.id === 'BCC03' || activeProfile.id === 'nova') ? 'bcc_acex_hours' : undefined;
    const legacyAcc = (course === 'bcc' || !course) && (activeProfile.id === 'BCC03' || activeProfile.id === 'nova') ? 'bcc_acc_hours' : undefined;
    setAcexHours(readStoredHours(localStorage, `${course || 'bcc'}_acex_hours_${activeProfile.id}`, legacyAcex));
    setAccHours(readStoredHours(localStorage, `${course || 'bcc'}_acc_hours_${activeProfile.id}`, legacyAcc));
    setHydratedHoursKey(key);
  }, [course, activeProfile.id, availableProfiles]);

  useEffect(() => {
    if (!availableProfiles.some(profile => profile.id === activeProfile.id)) return;
    if (hydratedHoursKey !== `${course || 'bcc'}_${activeProfile.id}`) return;
    localStorage.setItem(`${course || 'bcc'}_acex_hours_${activeProfile.id}`, acexHours.toString());
    if ((course === 'bcc' || !course) && (activeProfile.id === 'BCC03' || activeProfile.id === 'nova')) localStorage.setItem('bcc_acex_hours', acexHours.toString());
  }, [acexHours, activeProfile, availableProfiles, course, hydratedHoursKey]);

  useEffect(() => {
    if (!availableProfiles.some(profile => profile.id === activeProfile.id)) return;
    if (hydratedHoursKey !== `${course || 'bcc'}_${activeProfile.id}`) return;
    localStorage.setItem(`${course || 'bcc'}_acc_hours_${activeProfile.id}`, accHours.toString());
    if ((course === 'bcc' || !course) && (activeProfile.id === 'BCC03' || activeProfile.id === 'nova')) localStorage.setItem('bcc_acc_hours', accHours.toString());
  }, [accHours, activeProfile, availableProfiles, course, hydratedHoursKey]);

  const handleSelectProfile = (profileId: string) => {
    setActiveProfileId(profileId);
    if (setSelectedProfile) {
      setSelectedProfile(profileId);
    }
    const key = course ? `selected_profile_${course}` : 'saved_selectedProfile';
    localStorage.setItem(key, profileId);
    localStorage.setItem('saved_selectedProfile', profileId);
    if (course === 'bcc' || !course) {
      localStorage.setItem(`matrix_version_${course || 'bcc'}`, profileId === 'BCC02' ? 'antiga' : 'nova');
    }
  };


  const [hoveredSubject, setHoveredSubject] = useState<Subject | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const selectedSubject = subjects.find(subject => subject.id === selectedSubjectId) || null;
  const setSelectedSubject = (subject: Subject | null) => setSelectedSubjectId(subject?.id || null);
  useEffect(() => {
    setElectiveEditor(null);
    setSelectedSubjectId(null);
    setHoveredSubject(null);
  }, [currentProgressKey]);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const [arrows, setArrows] = useState<{ id: string; type: 'prereq' | 'dependent'; path: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('todos');
  const [isMobileGrid, setIsMobileGrid] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Abrir tutorial automaticamente na primeira visita
  useEffect(() => {
    const seen = localStorage.getItem('matriz_tutorial_seen');
    if (!seen) {
      const timer = setTimeout(() => {
        setIsTourOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  // --- CÁLCULO DE RELAÇÕES ---
  const dependentsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    subjects.forEach(s => {
      (s.prereqs || []).forEach(pre => {
        if (!map[pre]) map[pre] = [];
        map[pre].push(s.id);
      });
    });
    return map;
  }, [subjects]);

  const isUnlocked = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return false;
    if (subject.prereqs == null) return false;
    if (subject.prereqs.length === 0) return true;
    return subject.prereqs.every(preId => {
      const pre = subjects.find(s => s.id === preId);
      return pre && pre.status === 'concluido';
    });
  };

  // --- CÁLCULO DAS COORDENADAS DOS CONECTORES (SETAS DE PRÉ-REQUISITOS / LIBERAÇÕES) ---
  const getConnectorPoints = (sourceId: string, targetId: string, containerEl: HTMLElement) => {
    const sourceEl = document.getElementById(`subject-card-${sourceId}`);
    const targetEl = document.getElementById(`subject-card-${targetId}`);
    if (!sourceEl || !targetEl || sourceEl.offsetParent === null || targetEl.offsetParent === null) return null;

    const containerRect = containerEl.getBoundingClientRect();
    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    const srcLeft = sourceRect.left - containerRect.left + containerEl.scrollLeft;
    const srcTop = sourceRect.top - containerRect.top + containerEl.scrollTop;
    const srcRight = srcLeft + sourceRect.width;
    const srcHeight = sourceRect.height;

    const tgtLeft = targetRect.left - containerRect.left + containerEl.scrollLeft;
    const tgtTop = targetRect.top - containerRect.top + containerEl.scrollTop;
    const tgtRight = tgtLeft + targetRect.width;
    const tgtHeight = targetRect.height;

    let startX = srcRight;
    let startY = srcTop + srcHeight / 2;
    let endX = tgtLeft;
    let endY = tgtTop + tgtHeight / 2;

    if (tgtLeft + 5 < srcLeft) {
      startX = srcLeft;
      endX = tgtRight;
    } else if (Math.abs(srcLeft - tgtLeft) < 15) {
      startX = srcLeft + sourceRect.width / 2;
      endX = tgtLeft + targetRect.width / 2;
      if (tgtTop > srcTop) {
        startY = srcTop + srcHeight;
        endY = tgtTop;
      } else {
        startY = srcTop;
        endY = tgtTop + tgtHeight;
      }
    }

    return { startX, startY, endX, endY };
  };

  const getCurvePath = (startX: number, startY: number, endX: number, endY: number) => {
    const dx = endX - startX;
    const dy = endY - startY;

    const angle = Math.atan2(dy, dx);
    const offset = 8;
    const targetX = endX - Math.cos(angle) * offset;
    const targetY = endY - Math.sin(angle) * offset;

    const controlOffset = Math.max(30, Math.abs(dx) * 0.4);

    let cp1x = startX;
    let cp1y = startY;
    let cp2x = targetX;
    let cp2y = targetY;

    if (Math.abs(dx) > 20) {
      cp1x = startX + (dx > 0 ? controlOffset : -controlOffset);
      cp2x = targetX - (dx > 0 ? controlOffset : -controlOffset);
    } else {
      const verticalControlOffset = Math.max(20, Math.abs(dy) * 0.3);
      cp1y = startY + (dy > 0 ? verticalControlOffset : -verticalControlOffset);
      cp2y = targetY - (dy > 0 ? verticalControlOffset : -verticalControlOffset);
    }

    return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${targetY}`;
  };

  const updateArrowCoordinates = () => {
    const container = document.getElementById('matriz-scroll-container');
    const active = hoveredSubject || selectedSubject;

    if (!container || !active || isMobileGrid) {
      setArrows([]);
      setSvgSize({ width: 0, height: 0 });
      return;
    }

    setSvgSize({
      width: container.scrollWidth,
      height: container.scrollHeight
    });

    const newArrows: typeof arrows = [];

    (active.prereqs || []).forEach(preId => {
      const points = getConnectorPoints(preId, active.id, container);
      if (points) {
        const path = getCurvePath(points.startX, points.startY, points.endX, points.endY);
        newArrows.push({
          id: `${preId}-${active.id}`,
          type: 'prereq',
          path
        });
      }
    });

    const deps = dependentsMap[active.id] || [];
    deps.forEach(depId => {
      const points = getConnectorPoints(active.id, depId, container);
      if (points) {
        const path = getCurvePath(points.startX, points.startY, points.endX, points.endY);
        newArrows.push({
          id: `${active.id}-${depId}`,
          type: 'dependent',
          path
        });
      }
    });

    setArrows(newArrows);
  };

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      updateArrowCoordinates();
    });

    window.addEventListener('resize', updateArrowCoordinates);

    return () => {
      cancelAnimationFrame(handle);
      window.removeEventListener('resize', updateArrowCoordinates);
    };
  }, [hoveredSubject, selectedSubject, isMobileGrid, searchQuery, filterStatus, subjects, dependentsMap]);

  // --- ACÇÕES ---
  const toggleSubjectStatus = (id: string) => {
    const subject = subjects.find(item => item.id === id);
    if (!subject) return;
    setSubjectStatus(id, subject.status === 'pendente' ? 'cursando' : subject.status === 'cursando' ? 'concluido' : 'pendente');
  };

  const setSubjectStatus = (id: string, status: 'pendente' | 'cursando' | 'concluido') => {
    const subject = subjects.find(item => item.id === id);
    if (!subject) return;
    completion.setCompleted(subject, status === 'concluido', activeProfile.id);
    setSubjects(subjects.map(s => {
      if (s.id === id) {
        return { ...s, status, grade: status === 'concluido' ? s.grade : '' };
      }
      return s;
    }));
  };

  const handleGradeChange = (id: string, gradeVal: string) => {
    let val = gradeVal.replace(',', '.');
    if (val === '' || (!isNaN(Number(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 10)) {
      setSubjects(prev => prev.map(s => {
        if (s.id === id) {
          return { ...s, grade: val };
        }
        return s;
      }));
    }
  };

  const resetProgress = () => {
    const resetSubjects = restoreMatrixProgress(activeProfile.subjects as Subject[], null);
    completion.replaceProfile(activeProfile.id, resetSubjects, subjects);
    setSubjects(resetSubjects);
    setAcexHours(0);
    setAccHours(0);
    setSelectedSubject(null);
    setElectiveEditor(null);
    setShowResetConfirm(false);
  };

  const exportData = () => {
    const fileName = `${course || 'bcc'}_${activeProfile.id || 'matriz'}_progresso.json`;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ 
      course: course || 'bcc',
      profileId: activeProfile.id,
      profileName: activeProfile.name,
      subjects, 
      acexHours, 
      accHours 
    }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = (file: File) => {
    const fileReader = new FileReader();
    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = (event) => {
      if (progressKeyRef.current !== currentProgressKey) return;
      try {
        const parsed: unknown = JSON.parse(event.target?.result as string);
        const restored = applyMatrixProgressImport(parsed, course || 'bcc', activeProfile.id, activeProfile.subjects as Subject[]);
        if (!restored) {
          alert("Este arquivo não corresponde ao curso e perfil abertos, ou tem um formato inválido.");
          return;
        }
        const importedSubjects = [...restored.subjects, ...restored.additionalElectives];
        completion.replaceProfile(activeProfile.id, countedMatrixSubjects(importedSubjects), subjects);
        setSubjects(importedSubjects);
        setSelectedSubject(null);
        setElectiveEditor(null);
        if (restored.acexHours !== undefined) setAcexHours(restored.acexHours);
        if (restored.accHours !== undefined) setAccHours(restored.accHours);
        alert("Progresso importado com sucesso!");
      } catch (err) {
        alert("Erro ao ler o ficheiro.");
      }
    };
  };

  // --- CÁLCULO DE ESTATÍSTICAS ---
  const stats = useMemo(() => {
    let completedRegularHours = 0;
    let completedOptativeHours = 0;

    countedSubjects.forEach(s => {
      if (s.status === 'concluido') {
        if (s.type === 'optativa') {
          completedOptativeHours += matrixSubjectHours(s) ?? 0;
        } else {
          completedRegularHours += matrixSubjectHours(s) ?? 0;
        }
      }
    });

    const completedAcademicHours = completedRegularHours + completedOptativeHours;
    const isEal = course === 'eal' || course === 'engenharia-de-alimentos' || activeProfile.id?.startsWith('EAL');
    const maxAcex = activeProfile.acexHours ?? (isEal ? 390 : null);
    const maxAcc = activeProfile.accHours ?? (isEal ? 120 : null);
    const currentAcex = maxAcex > 0 ? Math.min(maxAcex, acexHours) : 0;
    const currentAcc = maxAcc > 0 ? Math.min(maxAcc, accHours) : 0;
    const totalCompletedPlusExtracurricular = completedAcademicHours + currentAcex + currentAcc;
    const totalCourseHours = activeProfile.totalHours;
    const progressPercent = totalCourseHours > 0 ? Math.min(100, (totalCompletedPlusExtracurricular / totalCourseHours) * 100) : 0;

    return {
      completedAcademicHours,
      totalCompletedPlusExtracurricular,
      progressPercent,
      completedRegularHours,
      completedOptativeHours,
      maxAcex,
      maxAcc,
      totalCourseHours,
      optativeTarget: activeProfile.optativeHours,
      mandatoryTarget: activeProfile.mandatoryHours
    };
  }, [countedSubjects, acexHours, accHours, activeProfile, course]);

  // Função para normalizar texto removendo acentos
  // --- DISCIPLINAS FILTRADAS ---
  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => {
      const matchesSearch = normalizeMatrixText(`${matrixSubjectName(s)} ${s.name} ${matrixSubjectCode(s) || ''}`).includes(normalizeMatrixText(searchQuery));

      
      let matchesStatus = true;
      const status = getSubjectStatus(s);
      if (filterStatus === 'concluido') matchesStatus = status === 'concluido';
      else if (filterStatus === 'cursando') matchesStatus = status === 'cursando';
      else if (filterStatus === 'pendente') matchesStatus = status === 'pendente';
      else if (filterStatus === 'disponivel') matchesStatus = status === 'pendente' && isUnlocked(s.id);

      return matchesSearch && matchesStatus;
    });
  }, [subjects, searchQuery, filterStatus, schedule]);

  // Alvos para o tour interativo
  const firstSubjectId = useMemo(() => {
    return filteredSubjects[0]?.id || subjects[0]?.id || '';
  }, [filteredSubjects, subjects]);

  const samplePrereqSubject = useMemo(() => {
    return subjects.find(s => (s.prereqs || []).length > 0) || null;
  }, [subjects]);

  const handleHoverSamplePrereq = (active: boolean) => {
    if (active && samplePrereqSubject) {
      setHoveredSubject(samplePrereqSubject);
    } else {
      setHoveredSubject(null);
    }
  };

  const maxPeriod = useMemo(() => lastMatrixPeriod(activeProfile.subjects), [activeProfile]);

  const unavailableElectiveKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const subject of subjects) {
      if (subject.id === electiveEditor?.subjectId) continue;
      if (subject.electiveSelection?.source === 'catalog') keys.add(electiveIdentity(subject.electiveSelection));
      else if (!subject.electiveSelection && subject.period > 0 && isElective(subject) && !isGenericElective(subject)) keys.add(electiveIdentity(subject));
    }
    return keys;
  }, [subjects, electiveEditor?.subjectId]);

  const saveElective = (selection: ElectiveSelection): string | null => {
    if (!electiveEditor || electiveEditor.progressKey !== currentProgressKey) return 'Abra novamente o editor para este perfil.';
    if (electiveAlreadyAssigned(subjects, selection, electiveEditor.subjectId || undefined)) return 'Esta disciplina já está utilizada em outro cartão da matriz.';
    const releasedSubjects = electiveEditor.subjectId ? releaseElectiveSelection(subjects, electiveEditor.subjectId) : subjects;
    const next: Subject[] = electiveEditor.subjectId
      ? releasedSubjects.map(subject => subject.id === electiveEditor.subjectId ? { ...subject, electiveSelection: selection } : subject)
      : [...subjects, {
        id: `personal_opt_${crypto.randomUUID()}`, name: 'Optativa adicional', hours: null, period: maxPeriod,
        type: 'optativa', prereqs: null, desc: '', status: 'pendente', grade: '', additionalElective: true, electiveSelection: selection
      }];
    completion.replaceProfile(activeProfile.id, countedMatrixSubjects(next), subjects);
    setSubjects(next);
    setHoveredSubject(null);
    setElectiveEditor(null);
    return null;
  };

  const clearElective = () => {
    const editing = subjects.find(subject => subject.id === electiveEditor?.subjectId);
    if (!editing) return;
    const releasedSubjects = releaseElectiveSelection(subjects, editing.id);
    const next = editing.additionalElective ? releasedSubjects.filter(subject => subject.id !== editing.id)
      : releasedSubjects.map(subject => subject.id === editing.id ? { ...subject, electiveSelection: undefined, status: 'pendente' as const, grade: '' } : subject);
    completion.replaceProfile(activeProfile.id, countedMatrixSubjects(next), subjects);
    setSubjects(next);
    setSelectedSubject(null);
    setHoveredSubject(null);
    setElectiveEditor(null);
  };

  const periods = useMemo(() => {
    const list = Array.from({ length: maxPeriod }, (_, i) => i + 1);
    return list.map(pNum => {
      const periodSubjects = subjects.filter(s => Number(s.period) === pNum);
      const countedPeriodSubjects = countedSubjects.filter(s => Number(s.period) === pNum);
      const totalPeriodHours = countedPeriodSubjects.reduce((acc, s) => acc + (matrixSubjectHours(s) ?? 0), 0);
      const completedPeriodHours = countedPeriodSubjects
        .filter(s => s.status === 'concluido')
        .reduce((acc, s) => acc + (matrixSubjectHours(s) ?? 0), 0);

      return {
        number: pNum,
        subjects: periodSubjects,
        totalHours: totalPeriodHours,
        completedHours: completedPeriodHours
      };
    });
  }, [subjects, countedSubjects, maxPeriod]);

  // --- MAPAS DE CORES ---
  const typeLabels: Record<string, { name: string, bg: string, border: string, text: string }> = {
    basico: { name: 'Núcleo Básico', bg: 'bg-orange-100 dark:bg-orange-950/40', border: 'border-orange-400 dark:border-orange-800', text: 'text-orange-900 dark:text-orange-200' },
    computacao: { name: 'Núcleo de Computação', bg: 'bg-slate-100 dark:bg-slate-800/40', border: 'border-slate-400 dark:border-slate-700', text: 'text-slate-800 dark:text-slate-200' },
    profissionalizante: { name: 'Profissionalizante', bg: 'bg-lime-100 dark:bg-lime-950/40', border: 'border-lime-500 dark:border-lime-800', text: 'text-lime-950 dark:text-lime-200' },
    especifica: { name: 'Específica', bg: 'bg-yellow-100 dark:bg-yellow-950/40', border: 'border-yellow-500 dark:border-yellow-800', text: 'text-yellow-950 dark:text-yellow-200' },
    optativa: { name: 'Optativa', bg: 'bg-blue-100 dark:bg-blue-950/40', border: 'border-blue-400 dark:border-blue-800', text: 'text-blue-900 dark:text-blue-200' },
    estagio: { name: 'Estágio', bg: 'bg-amber-100 dark:bg-amber-950/40', border: 'border-amber-400 dark:border-amber-800', text: 'text-amber-900 dark:text-amber-200' },
    outros: { name: 'Outros/Metodologia', bg: 'bg-slate-100 dark:bg-slate-800/40', border: 'border-slate-400 dark:border-slate-700', text: 'text-slate-800 dark:text-slate-200' }
  };

  const getSubjectRelationship = (subjectId: string) => {
    const active = hoveredSubject || selectedSubject;
    if (!active) return 'none';
    if (active.id === subjectId) return 'self';
    if ((active.prereqs || []).includes(subjectId)) return 'prereq';
    if (dependentsMap[active.id]?.includes(subjectId)) return 'dependent';
    return 'unrelated';
  };

  function getSubjectStatus(s: Subject) {
    const code = matrixSubjectCode(s);
    if (schedule && code) {
      const inSchedule = schedule.some(d => d.code && normalizeMatrixText(d.code) === normalizeMatrixText(code));
      if (inSchedule && s.status === 'pendente') {
        return 'cursando';
      }
    }
    return s.status;
  }

  const isRestoringProgress = loadStatus === 'ready' && availableProfiles.length > 0
    && hydratedProgressKey !== currentProgressKey;
  if (loadStatus !== 'ready' || availableProfiles.length === 0 || isRestoringProgress) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <Navbar setView={setView} title="Matriz Curricular" course={course} courseName={loadedCourseName}
          darkMode={darkMode} themePreference={themePreference} cycleTheme={cycleTheme} />
        <div role={loadStatus === 'loading' || isRestoringProgress ? 'status' : loadStatus === 'error' ? 'alert' : undefined}
          className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {(loadStatus === 'loading' || isRestoringProgress) && <Loader2 className="h-9 w-9 animate-spin text-indigo-500" />}
          <p>{loadStatus === 'loading' || isRestoringProgress ? 'Carregando matriz curricular…'
            : loadStatus === 'error' ? 'Não foi possível carregar a matriz curricular. Atualize a página para tentar novamente.'
              : 'Nenhuma matriz curricular disponível para este curso.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col antialiased transition-colors duration-300">
      {/* HEADER */}
      <Navbar
        setView={setView}
        title="Matriz Curricular"
        course={course}
        courseName={loadedCourseName}
        darkMode={darkMode}
        themePreference={themePreference}
        cycleTheme={cycleTheme}
        dataSources={dataSources}
        dataUpdatedAt={dataUpdatedAt}
        dataSemester={activeProfile.validFromSemester}
        onExportMatrixProgress={exportData}
        onImportMatrixProgress={handleImport}
      />


      {/* AJUDA / LEGENDA COMPACTA (Removido e renderizado como Modal) */}

      {/* FILTROS E PESQUISA */}
      <section className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 py-3 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-3">
          {/* Caixa de Pesquisa e Filtro de Estado */}
          <div data-tour="search-filters" className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por nome de disciplina..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 w-full sm:w-auto shrink-0 h-[34px]">
              <CheckCircle className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-slate-500 hidden sm:inline">Estado:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="focus:outline-none bg-transparent cursor-pointer font-medium text-slate-700 dark:text-slate-300 text-xs w-full"
              >
                <option value="todos" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Todos os Estados</option>
                <option value="concluido" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Concluídas</option>
                <option value="cursando" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Acursando</option>
                <option value="pendente" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Pendentes</option>
                <option value="disponivel" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Desbloqueadas para Cursar</option>
              </select>
            </div>
          </div>

          {/* Ações da Direita */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Seletor Dinâmico de Perfil Curricular */}
            {availableProfiles.length > 1 && (
              <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700 p-1 w-full sm:w-auto min-h-[40px]">
                {availableProfiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProfile(p.id)}
                    className={`flex-1 sm:flex-none px-3 py-1.5 min-h-[36px] sm:min-h-[40px] text-xs font-semibold rounded-md transition-colors flex items-center justify-center ${
                      activeProfile.id === p.id 
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                    title={p.description || p.name}
                  >
                    {(p.name || '').includes('(') ? (p.name || '').split('(')[0].trim() : (p.id || p.name)}
                  </button>
                ))}
              </div>
            )}

            {/* Alternar Vista para Mobile */}
            <button
              onClick={() => setIsMobileGrid(!isMobileGrid)}
              className="md:hidden flex items-center gap-1.5 text-xs font-semibold bg-white dark:bg-slate-900 px-3 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto justify-center"
            >
              <Eye className="h-4 w-4" />
              <span>{isMobileGrid ? "Ver Grade Larga" : "Ver Lista Compacta"}</span>
            </button>

            {/* Botão Permanente de Tutorial / Como Usar */}
            <button
              data-tour="help-button"
              onClick={() => setIsTourOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg font-semibold transition-colors shadow-xs cursor-pointer w-full sm:w-auto justify-center shrink-0 h-[34px]"
              title="Passo a passo de como utilizar a matriz"
            >
              <HelpCircle className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Como Usar</span>
            </button>

            {/* Limpar Progresso */}
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 text-xs bg-rose-50 dark:bg-rose-950/20 px-3 py-2 min-h-[40px] rounded-lg border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 w-full sm:w-auto justify-center shrink-0 cursor-pointer font-semibold shadow-xs"
              title="Limpar progresso completo da matriz"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Limpar Progresso</span>
            </button>
          </div>
        </div>
      </section>

      {/* ÁREA PRINCIPAL: CONTEÚDO DA MATRIZ */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 flex flex-col gap-6 pb-12 pt-6 items-center">
        
        {/* LADO ESQUERDO: A MATRIZ CURRICULAR */}
        <div className="w-full min-w-0">
          <div 
            id="matriz-scroll-container"
            style={!isMobileGrid ? {
              display: 'grid',
              gridTemplateColumns: `repeat(${maxPeriod}, minmax(112px, 1fr))`,
              gap: '0.75rem'
            } : undefined}
            className={`
              relative
              ${isMobileGrid ? 'grid grid-cols-1 gap-4' : 'flex overflow-x-auto pb-4 max-w-full px-1'}
              scroll-smooth md:scroll-auto
            `}
          >
            {/* SVG Connector Overlay */}
            {!isMobileGrid && (hoveredSubject || selectedSubject) && arrows.length > 0 && (
              <svg 
                className={`absolute top-0 left-0 pointer-events-none overflow-visible ${isTourOpen ? 'z-[103]' : 'z-20'}`} 
                style={{ 
                  width: `${svgSize.width}px`, 
                  height: `${svgSize.height}px` 
                }}
              >
                <defs>
                  {/* Arrowhead marker for prerequisites (rose-500) */}
                  <marker
                    id="arrow-prereq"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" className="fill-rose-500 dark:fill-rose-400" />
                  </marker>
                  {/* Arrowhead marker for dependents (teal-500) */}
                  <marker
                    id="arrow-dependent"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" className="fill-teal-500 dark:fill-teal-400" />
                  </marker>
                </defs>
                {arrows.map(arrow => (
                  <path
                    key={arrow.id}
                    d={arrow.path}
                    className={`
                      fill-none stroke-[2] stroke-linecap-round
                      ${arrow.type === 'prereq' 
                        ? 'stroke-rose-500/80 dark:stroke-rose-400/80 [stroke-dasharray:4,4] animate-dash-flow' 
                        : 'stroke-teal-500/80 dark:stroke-teal-400/80 [stroke-dasharray:4,4] animate-dash-flow'
                      }
                    `}
                    markerEnd={`url(#arrow-${arrow.type})`}
                  />
                ))}
              </svg>
            )}

            {periods.map(p => (
              <div 
                key={p.number} 
                className={`
                  flex-shrink-0 flex flex-col gap-3
                  ${isMobileGrid ? 'w-full bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm' : 'w-full min-w-0'}
                `}
              >
                {/* Cabeçalho do Período */}
                <div className="bg-slate-800 dark:bg-slate-800 text-white p-2.5 text-center rounded-lg shadow-sm relative overflow-hidden">
                  <div className="text-xs font-bold uppercase tracking-wider">{p.number}º Período</div>
                  <div className="text-[11px] text-slate-300 dark:text-slate-200 mt-0.5 font-medium">
                    {p.completedHours}h / {p.totalHours}h
                  </div>
                  <div className="absolute top-0 bottom-0 left-0 bg-indigo-500/80 -z-10 transition-all duration-300" style={{ width: `${p.totalHours > 0 ? Math.min(100, (p.completedHours / p.totalHours) * 100) : 0}%` }}></div>
                </div>

                {/* Lista de Disciplinas do Período */}
                <div className={`flex flex-col gap-3 ${isMobileGrid ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 mt-2' : ''}`}>
                  {p.subjects.map(s => {
                    const typeColor = typeLabels[s.type] || typeLabels.basico;
                    const relationship = getSubjectRelationship(s.id);
                    const unlocked = isUnlocked(s.id);
                    const isFiltered = filteredSubjects.some(f => f.id === s.id);
                    const effectiveStatus = getSubjectStatus(s);

                    let highlightClass = 'scale-100 opacity-100 shadow-sm';
                    let baseStyles = effectiveStatus === 'concluido' 
                      ? 'border-emerald-500 dark:border-emerald-600 bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 shadow-sm' 
                      : effectiveStatus === 'cursando'
                      ? 'border-amber-400 dark:border-amber-500 bg-amber-100/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 ring-1 ring-amber-200 dark:ring-amber-900'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                          
                    let styles = baseStyles;

                    if (hoveredSubject || selectedSubject) {
                      if (relationship === 'self') {
                        styles = `${baseStyles} shadow-md scale-[1.03] ${isTourOpen ? 'z-[103]' : 'z-30'}`;
                      } else if (relationship === 'prereq') {
                        styles = `${baseStyles} ring-2 ring-rose-200 dark:ring-rose-900 shadow-md scale-[1.02] ${isTourOpen ? 'z-[103]' : 'z-30'} border-rose-400`;
                      } else if (relationship === 'dependent') {
                        styles = `${baseStyles} ring-2 ring-teal-200 dark:ring-teal-900 shadow-md scale-[1.02] ${isTourOpen ? 'z-[103]' : 'z-30'} border-teal-400`;
                      } else if (relationship === 'unrelated') {
                        highlightClass = 'opacity-30 scale-95 saturate-50 grayscale-[0.5]';
                      }
                    }

                    return (
                      <div
                        key={s.id}
                        id={`subject-card-${s.id}`}
                        data-tour={s.id === firstSubjectId ? 'first-subject' : s.id === samplePrereqSubject?.id ? 'prereq-subject' : undefined}
                        onMouseEnter={() => setHoveredSubject(s)}
                        onMouseLeave={() => setHoveredSubject(null)}
                        onClick={() => toggleSubjectStatus(s.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedSubject(s);
                        }}
                        className={`
                          cursor-pointer transition-all duration-300 relative rounded-lg p-3 border flex flex-col justify-between select-none
                          ${styles} ${highlightClass}
                          ${s.id === 'estagio' && !isMobileGrid ? 'h-[250px]' : 'min-h-[96px] xl:min-h-[105px]'}
                          ${!isFiltered ? 'hidden' : ''}
                        `}
                      >
                        <button type="button" aria-label={`Alternar status de ${matrixSubjectName(s)}: ${effectiveStatus}`}
                          className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                          onClick={event => { event.stopPropagation(); toggleSubjectStatus(s.id); }} />
                        {/* Indicadores de Estado no Canto */}
                        <div className="absolute top-1.5 right-1.5 flex gap-1 items-center z-20 pointer-events-none">
                          {!unlocked && effectiveStatus === 'pendente' && (
                            <span className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 rounded-full p-0.5" title="Pré-requisitos pendentes">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </span>
                          )}
                          {effectiveStatus === 'concluido' && (
                            <span className="text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm border border-emerald-200 dark:border-emerald-800">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          {effectiveStatus === 'cursando' && (
                            <span className="w-3 h-3 bg-amber-400 dark:bg-amber-500 border border-amber-600 dark:border-amber-700 rounded-full animate-pulse shadow-sm" title="Acursando"></span>
                          )}
                        </div>

                        {/* Nome da Disciplina */}
                        <div className="text-xs font-bold leading-snug break-words pr-5 select-none pointer-events-none">
                          {matrixSubjectName(s)}
                          {s.electiveSelection && <span className="mt-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400">{s.name}</span>}
                        </div>

                        {/* Labels de Relação on Hover */}
                        {(hoveredSubject || selectedSubject) && relationship === 'prereq' && (
                          <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                            Pré-requisito
                          </div>
                        )}
                        {(hoveredSubject || selectedSubject) && relationship === 'dependent' && (
                          <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                            Libera
                          </div>
                        )}

                        {/* Informações Inferiores */}
                        <div className="mt-2 flex items-center justify-between pointer-events-none">
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-black/30 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700/50">
                            {matrixSubjectHours(s) != null ? `${matrixSubjectHours(s)}h` : 'CH a confirmar'}
                          </span>
                        </div>
                        {(isGenericElective(s) || s.additionalElective) && (
                          <button type="button" className="relative z-20 mt-2 flex min-h-9 items-center justify-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900"
                            onClick={event => { event.stopPropagation(); setElectiveEditor({ subjectId: s.id, progressKey: currentProgressKey }); }}>
                            <Pencil aria-hidden="true" className="h-3 w-3 shrink-0" />
                            {s.electiveSelection ? 'Editar optativa' : 'Definir optativa'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {p.number === maxPeriod && (
                    <button type="button" onClick={() => setElectiveEditor({ subjectId: null, progressKey: currentProgressKey })}
                      className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/60 p-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-950/60">
                      <Plus aria-hidden="true" className="h-4 w-4 shrink-0" /> Adicionar optativa
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* BARRAS E PAINÉIS DE RESUMO DE CARGA HORÁRIA E REQUISITOS (ACEX/ACC) EM BAIXO */}
          <div id="tour-stats-summary" data-tour="stats-summary" className="mt-8 max-w-[1400px] w-full mx-auto">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 px-1 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-500" /> Resumo de Requisitos e Carga Horária
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card de Progresso Geral */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Carga Horária Total</span>
                    <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.totalCompletedPlusExtracurricular}h</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">/ {stats.totalCourseHours ?? '—'}h</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    <span>Concluído</span>
                    <span>{stats.progressPercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-200/45 dark:border-slate-700/50">
                    <motion.div 
                      className="bg-indigo-500 dark:bg-indigo-400 h-2.5 rounded-full" 
                      animate={{ width: `${stats.progressPercent}%` }} 
                      transition={{ duration: 0.6, ease: "easeOut" }} 
                    />
                  </div>
                </div>
              </div>

              {/* Gestão Extracurricular ACEX */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Horas ACEX (Extensão)</span>
                    <span className="text-xs text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded">
                      Meta: {stats.maxAcex ?? '—'}h
                    </span>
                  </div>
                  {stats.maxAcex > 0 ? (
                    <div className="flex items-center gap-2 mt-4">
                      <input 
                        type="range" 
                        min="0" 
                        max={stats.maxAcex} 
                        step="10"
                        value={acexHours} 
                        onChange={(e) => setAcexHours(Number(e.target.value))}
                        className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none" 
                      />
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        value={acexHours}
                        onChange={(e) => setAcexHours(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-16 px-1.5 py-1 text-center font-bold text-slate-850 dark:text-slate-100 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400">h</span>
                    </div>
                  ) : (
                    <div className="mt-4 text-xs text-slate-400 italic">{stats.maxAcex == null ? 'Carga não informada no documento.' : 'Não exigido neste perfil curricular.'}</div>
                  )}
                </div>
                {stats.maxAcex > 0 && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-2 flex justify-between">
                    <span>Restantes:</span>
                    <span className="font-semibold text-indigo-650 dark:text-indigo-400">{Math.max(0, stats.maxAcex - acexHours)}h</span>
                  </div>
                )}
              </div>

              {/* Gestão Extracurricular ACC */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Horas ACC (Comp.)</span>
                    <span className="text-xs text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded">
                      Meta: {stats.maxAcc ?? '—'}h
                    </span>
                  </div>
                  {stats.maxAcc > 0 ? (
                    <div className="flex items-center gap-2 mt-4">
                      <input 
                        type="range" 
                        min="0" 
                        max={stats.maxAcc} 
                        step="5"
                        value={accHours} 
                        onChange={(e) => setAccHours(Number(e.target.value))}
                        className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none" 
                      />
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={accHours}
                        onChange={(e) => setAccHours(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-16 px-1.5 py-1 text-center font-bold text-slate-800 dark:text-slate-100 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400">h</span>
                    </div>
                  ) : (
                    <div className="mt-4 text-xs text-slate-400 italic">{stats.maxAcc == null ? 'Carga não informada no documento.' : 'Não exigido neste perfil curricular.'}</div>
                  )}
                </div>
                {stats.maxAcc > 0 && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-2 flex justify-between">
                    <span>Restantes:</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{Math.max(0, stats.maxAcc - accHours)}h</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Bloco de matérias obrigatórias e optativas concluídas */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500">Horas Obrigatórias Concluídas:</span>
                <span className="text-indigo-600 dark:text-indigo-400">{stats.completedRegularHours}h <span className="text-slate-400">/ {stats.mandatoryTarget ?? '—'}h</span></span>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500">Horas Optativas Concluídas:</span>
                <span className="text-indigo-600 dark:text-indigo-400">{stats.completedOptativeHours}h <span className="text-slate-400">/ {stats.optativeTarget ?? '—'}h</span></span>
              </div>
            </div>
          </div>
        </div>



      </main>

      {/* Modal da Disciplina */}
      {selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedSubject(null)}>
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${typeLabels[selectedSubject.type]?.text || 'text-slate-500'}`}>
                  {selectedSubject.period}º Período • {typeLabels[selectedSubject.type]?.name}
                </span>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">{matrixSubjectName(selectedSubject)}</h3>
                {selectedSubject.electiveSelection && <p className="mt-1 text-xs text-slate-500">{selectedSubject.name}{matrixSubjectCode(selectedSubject) ? ` • ${matrixSubjectCode(selectedSubject)}` : ''}</p>}
              </div>
              <button 
                onClick={() => setSelectedSubject(null)} 
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Fechar"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Info className="w-4 h-4" /> Ementa
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
                {(selectedSubject.electiveSelection ? selectedSubject.electiveSelection.desc : selectedSubject.desc) || "Ementa não detalhada."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-5">
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Carga Horária</h4>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 block w-full text-center">
                    {matrixSubjectHours(selectedSubject) != null ? `${matrixSubjectHours(selectedSubject)}h` : 'CH a confirmar'}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Estado Atual</h4>
                <select
                  value={getSubjectStatus(selectedSubject)}
                  onChange={(e) => setSubjectStatus(selectedSubject.id, e.target.value as 'pendente' | 'cursando' | 'concluido')}
                  className="text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow appearance-none"
                >
                  <option value="pendente" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Pendente</option>
                  <option value="cursando" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Acursando</option>
                  <option value="concluido" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Concluído</option>
                </select>
              </div>
            </div>

            {/* Pré-requisitos e Dependências */}
            {(isGenericElective(selectedSubject) || selectedSubject.additionalElective) && (
              <button type="button" onClick={() => setElectiveEditor({ subjectId: selectedSubject.id, progressKey: currentProgressKey })}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 p-3 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                <Pencil aria-hidden="true" className="h-4 w-4" /> {selectedSubject.electiveSelection ? 'Editar optativa' : 'Definir optativa'}
              </button>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
              <div>
                <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  Pré-requisitos 
                  <span className="bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full text-[11px] font-bold">{(selectedSubject.prereqs || []).length}</span>
                </h4>
                {(selectedSubject.prereqs || []).length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {(selectedSubject.prereqs || []).map(preId => {
                      const pre = subjects.find(s => s.id === preId);
                      return (
                        <div 
                          key={preId} 
                          onClick={() => pre && setSelectedSubject(pre)}
                          className="cursor-pointer text-xs min-h-[40px] p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 rounded-lg hover:border-rose-400 dark:hover:border-rose-500 transition-colors flex justify-between items-center group"
                        >
                          <span className="font-medium truncate pr-2" title={pre ? matrixSubjectName(pre) : undefined}>{pre ? matrixSubjectName(pre) : preId}</span>
                          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-rose-500 flex-shrink-0 transition-colors" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 dark:text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">{selectedSubject.prereqs == null ? 'Não informado no documento.' : 'Não exige.'}</div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  Libera 
                  <span className="bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full text-[11px] font-bold">{dependentsMap[selectedSubject.id]?.length || 0}</span>
                </h4>
                {dependentsMap[selectedSubject.id]?.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {dependentsMap[selectedSubject.id].map(depId => {
                      const dep = subjects.find(s => s.id === depId);
                      return (
                        <div 
                          key={depId} 
                          onClick={() => dep && setSelectedSubject(dep)}
                          className="cursor-pointer text-xs min-h-[40px] p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 rounded-lg hover:border-teal-400 dark:hover:border-teal-500 transition-colors flex justify-between items-center group"
                        >
                          <span className="font-medium truncate pr-2" title={dep ? matrixSubjectName(dep) : undefined}>{dep ? matrixSubjectName(dep) : depId}</span>
                          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-teal-500 flex-shrink-0 transition-colors" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 dark:text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">Não liberta outras matérias.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {electiveEditor?.progressKey === currentProgressKey && (
        <ElectiveEditorModal key={`${currentProgressKey}:${electiveEditor.subjectId || 'new'}`}
          subject={subjects.find(subject => subject.id === electiveEditor.subjectId) || null}
          catalog={electiveCatalog} lastPeriod={maxPeriod} unavailableKeys={unavailableElectiveKeys}
          onSave={saveElective} onClose={() => setElectiveEditor(null)}
          onClear={electiveEditor.subjectId && subjects.some(subject => subject.id === electiveEditor.subjectId && subject.electiveSelection) ? clearElective : undefined} />
      )}

      {/* Modal de Confirmação para Limpar Progresso */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowResetConfirm(false)}>
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/40 rounded-full flex items-center justify-center mb-4">
                <RotateCcw className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Limpar Todo o Progresso?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Esta ação irá repor todo o progresso das disciplinas, limpar as escolhas de optativas, remover as optativas adicionais e zerar as horas extracurriculares (ACEX e ACC). Esta operação não pode ser desfeita.
              </p>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2.5 min-h-[40px] sm:min-h-[44px] flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-transparent dark:border-slate-700 cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={resetProgress}
                  className="px-4 py-2.5 min-h-[40px] sm:min-h-[44px] flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Confirmar Limpar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    

      {/* Tutorial Passo a Passo Interativo (Spotlight Walkthrough) */}
      <MatrizTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onHoverSamplePrereq={handleHoverSamplePrereq}
      />

    </div>
  );
}
