import React, { useState, useEffect, useRef } from 'react';
import { CourseMeta, CurriculumData, CurriculumProfile, CurriculumSubject, Discipline, TreeSubjectNode } from '../types';
import { hydrateCurriculum } from '../utils/adminCurriculum';
import { ExtractionReport } from '../utils/extraction';

export interface UseCourseManagerParams {
  setDisciplines: React.Dispatch<React.SetStateAction<Discipline[]>>;
  setCurriculumSubjects: React.Dispatch<React.SetStateAction<CurriculumSubject[]>>;
  setCourseProfiles: React.Dispatch<React.SetStateAction<CurriculumProfile[]>>;
  setCourseRequirements: React.Dispatch<React.SetStateAction<CurriculumData['requisitos'] | null>>;
  setExtractedProfile: React.Dispatch<React.SetStateAction<CurriculumProfile | null>>;
  setExtractedTreeSubjects: React.Dispatch<React.SetStateAction<TreeSubjectNode[]>>;
  setExtractionReport: React.Dispatch<React.SetStateAction<ExtractionReport | null>>;
  setErrorMsg: React.Dispatch<React.SetStateAction<string | null>>;
  setSuccessMsg: React.Dispatch<React.SetStateAction<string | null>>;
  onLoaded?: (data: any) => void;
  activeMode: 'curriculum' | 'schedule';
}

export interface UseCourseManagerReturn {
  loadedVersion: number;
  courses: CourseMeta[];
  setCourses: React.Dispatch<React.SetStateAction<CourseMeta[]>>;
  selectedCourseId: string;
  setSelectedCourseId: React.Dispatch<React.SetStateAction<string>>;
  courseName: string;
  setCourseName: React.Dispatch<React.SetStateAction<string>>;
  courseShortName: string;
  setCourseShortName: React.Dispatch<React.SetStateAction<string>>;
  isCreatingNewCourse: boolean;
  setIsCreatingNewCourse: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingCourse: boolean;
  setIsLoadingCourse: React.Dispatch<React.SetStateAction<boolean>>;
  detectedDifferentCourse: { name: string; shortName: string } | null;
  setDetectedDifferentCourse: React.Dispatch<React.SetStateAction<{ name: string; shortName: string } | null>>;
  scheduleTitle: string;
  setScheduleTitle: React.Dispatch<React.SetStateAction<string>>;
  scheduleSemester: string;
  setScheduleSemester: React.Dispatch<React.SetStateAction<string>>;
  showDeleteCourseModal: boolean;
  setShowDeleteCourseModal: React.Dispatch<React.SetStateAction<boolean>>;
  isDeletingCourse: boolean;
  setIsDeletingCourse: React.Dispatch<React.SetStateAction<boolean>>;
  fetchCoursesList: () => Promise<void>;
  loadCourseData: (courseId: string) => Promise<void>;
  handleDeleteActiveCourse: () => Promise<void>;
  cleanCourseTitle: (rawTitle: string) => string;
  generateShortName: (name: string) => string;
  courseLoadVersion: React.MutableRefObject<number>;
  skipNextCourseLoad: React.MutableRefObject<boolean>;
}

export function useCourseManager({
  setDisciplines,
  setCurriculumSubjects,
  setCourseProfiles,
  setCourseRequirements,
  setExtractedProfile,
  setExtractedTreeSubjects,
  setExtractionReport,
  setErrorMsg,
  setSuccessMsg,
  activeMode, onLoaded
}: UseCourseManagerParams): UseCourseManagerReturn {
  const [courses, setCourses] = useState<CourseMeta[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('bcc');
  const [courseName, setCourseName] = useState<string>('Ciência da Computação');
  const [courseShortName, setCourseShortName] = useState<string>('BCC');
  const [isCreatingNewCourse, setIsCreatingNewCourse] = useState(false);
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);
  const [detectedDifferentCourse, setDetectedDifferentCourse] = useState<{ name: string; shortName: string } | null>(null);

  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleSemester, setScheduleSemester] = useState('');

  const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  const courseLoadVersion = useRef(0);
  const [loadedVersion, setLoadedVersion] = useState(0);
  const skipNextCourseLoad = useRef(false);

  const fetchCoursesList = async () => {
    try {
      const res = await apiFetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
      }
    } catch (err) {
      console.error('Failed to load courses', err);
    }
  };

  useEffect(() => {
    fetchCoursesList();
  }, []);

  const loadCourseData = async (courseId: string) => {
    const version = ++courseLoadVersion.current;
    setIsLoadingCourse(true);
    setExtractionReport(null);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiFetch(`/api/courses/${courseId}`);
      if (res.ok) {
        const data = await res.json();
        if (version !== courseLoadVersion.current) return;
        const meta = data.course;
        setCourseName(meta.name || courseId.toUpperCase());
        setCourseShortName(meta.shortName || courseId.toUpperCase());
        
        const normalized = hydrateCurriculum(data.curriculum);
        setCourseRequirements(data.curriculum?.requisitos || null);
        setCourseProfiles(normalized.profiles);
        setExtractedProfile(normalized.profiles.find(profile => profile.id === data.curriculum?.activeProfileId) || normalized.profiles[0] || null);
        setExtractedTreeSubjects(normalized.nodes);
        setCurriculumSubjects(normalized.subjects);
        setExtractionReport(activeMode === 'schedule' ? data.scheduleExtraction || null : data.curriculum?.extraction || null);
        onLoaded?.(data);
        setLoadedVersion(version);

        // Schedule
        if (Array.isArray(data.schedule)) {
          setDisciplines(data.schedule);
          const currentSemester = data.resolvedSemester || data.schedule.find((d: Discipline) => d.semester)?.semester || meta.visibleSemesters?.[0] || meta.semesters?.at(-1) || '';
          setScheduleSemester(currentSemester);
          if (activeMode === 'schedule') setExtractionReport(data.scheduleExtraction || null);
          setScheduleTitle(`${meta.name} - Horário ${currentSemester}`);
        } else {
          setDisciplines([]);
          setScheduleTitle('');
          setScheduleSemester('');
        }
      } else { throw new Error('Falha ao carregar curso.'); }
    } catch (err: any) {
      console.error('Error loading course details', err);
      if (version === courseLoadVersion.current) setErrorMsg(`Não foi possível carregar os dados do curso ${courseId}.`);
    } finally {
      if (version === courseLoadVersion.current) setIsLoadingCourse(false);
    }
  };

  const handleDeleteActiveCourse = async () => {
    if (!selectedCourseId || isCreatingNewCourse) return;
    setIsDeletingCourse(true);
    try {
      const res = await apiFetch(`/api/courses/${selectedCourseId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Clean up localStorage for this course
        try {
          Object.keys(localStorage).forEach(key => {
            if (
              key.startsWith(`schedule_${selectedCourseId}`) ||
              key.startsWith(`selected_profile_${selectedCourseId}`) ||
              key.startsWith(`disciplines_selectedProfile_${selectedCourseId}`) ||
              key.startsWith(`matrix_version_${selectedCourseId}`) ||
              key.startsWith(`${selectedCourseId}_matriz_progress`) ||
              key.startsWith(`${selectedCourseId}_acex_hours`) ||
              key.startsWith(`${selectedCourseId}_acc_hours`)
            ) {
              localStorage.removeItem(key);
            }
          });
          if (localStorage.getItem('selectedCourse') === selectedCourseId) {
            localStorage.removeItem('selectedCourse');
          }
        } catch {}

        setSuccessMsg(`Curso '${courseName}' excluído com sucesso!`);
        setShowDeleteCourseModal(false);

        // Reload courses registry
        const listRes = await apiFetch('/api/courses');
        if (listRes.ok) {
          const listData = await listRes.json();
          const remainingCourses: CourseMeta[] = listData.courses || [];
          setCourses(remainingCourses);
          if (remainingCourses.length > 0) {
            setSelectedCourseId(remainingCourses[0].id);
          } else {
            setIsCreatingNewCourse(true);
            setCourseName('Novo Curso Acadêmico');
            setCourseShortName('NOVO');
            setCurriculumSubjects([]);
            setDisciplines([]);
            setCourseRequirements(null);
          }
        }
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Erro ao excluir o curso.");
        setShowDeleteCourseModal(false);
      }
    } catch (e: any) {
      setErrorMsg("Erro de conexão ao excluir o curso.");
      setShowDeleteCourseModal(false);
    } finally {
      setIsDeletingCourse(false);
    }
  };

  useEffect(() => {
    if (skipNextCourseLoad.current) { skipNextCourseLoad.current = false; return; }
    if (selectedCourseId && !isCreatingNewCourse) {
      loadCourseData(selectedCourseId);
    }
  }, [selectedCourseId, isCreatingNewCourse]);

  const cleanCourseTitle = (rawTitle: string): string => {
    if (!rawTitle) return '';
    return rawTitle
      .replace(/[-–—]\s*(hor[aá]rio|matriz|grade|semestre|per[ií]odo|letivo|ppc|projeto).*$/i, '')
      .replace(/\b(hor[aá]rio\s+letivo|202[0-9](\.[0-9])?)\b/gi, '')
      .replace(/[-–—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const generateShortName = (name: string): string => {
    if (!name) return 'NOVO';
    const lower = name.toLowerCase();
    if (lower.includes('veterin')) return 'MVET';
    if (lower.includes('computa')) return 'BCC';
    if (lower.includes('alimento')) return 'EAL';
    if (lower.includes('agronom')) return 'AGRO';
    if (lower.includes('zootec')) return 'ZOO';
    if (lower.includes('administra')) return 'ADM';
    if (lower.includes('letras')) return 'LET';
    if (lower.includes('pedagog')) return 'PED';

    const stopWords = ['de', 'da', 'do', 'das', 'dos', 'em', 'para', 'com', 'e', 'bacharelado', 'licenciatura'];
    const words = name
      .split(/[\s-]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0 && !stopWords.includes(w.toLowerCase()));
    if (words.length >= 2) {
      return words.map(w => w[0]).join('').toUpperCase().slice(0, 5);
    }
    return name.slice(0, 4).toUpperCase();
  };

  return {
    loadedVersion, courses, setCourses,
    selectedCourseId, setSelectedCourseId,
    courseName, setCourseName,
    courseShortName, setCourseShortName,
    isCreatingNewCourse, setIsCreatingNewCourse,
    isLoadingCourse, setIsLoadingCourse,
    detectedDifferentCourse, setDetectedDifferentCourse,
    scheduleTitle, setScheduleTitle,
    scheduleSemester, setScheduleSemester,
    showDeleteCourseModal, setShowDeleteCourseModal,
    isDeletingCourse, setIsDeletingCourse,
    fetchCoursesList,
    loadCourseData,
    handleDeleteActiveCourse,
    cleanCourseTitle,
    generateShortName,
    courseLoadVersion,
    skipNextCourseLoad
  };
}
import { apiFetch } from '../utils/api';
