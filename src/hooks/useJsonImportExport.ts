import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Discipline, CurriculumSubject, TreeSubjectNode, 
  CurriculumProfile, CurriculumData
} from '../types';
import { 
  mergeCurriculumList, mergeScheduleList, mergeTreeNodesList, mergeCourseHours, 
  treeToCurriculum, validateExtraction, normalizeAcademicName, normalizeAcademicType,
  ExtractionReport, ExtractionIssue, CourseHours
} from '../utils/extraction';
import { syncCatalog } from '../utils/adminCurriculum';
import { EXTRACTION_PROMPTS, ExtractionModeType, PromptSubStep } from '../utils/promptsData';

export interface UseJsonImportExportParams {
  activeMode: 'curriculum' | 'schedule';
  curriculumExtractType: 'tree' | 'linear';
  selectedSubStepId: string;
  disciplines: Discipline[];
  setDisciplines: React.Dispatch<React.SetStateAction<Discipline[]>>;
  curriculumSubjects: CurriculumSubject[];
  setCurriculumSubjects: React.Dispatch<React.SetStateAction<CurriculumSubject[]>>;
  extractedTreeSubjects: TreeSubjectNode[];
  setExtractedTreeSubjects: React.Dispatch<React.SetStateAction<TreeSubjectNode[]>>;
  courseProfiles: CurriculumProfile[];
  setCourseProfiles: React.Dispatch<React.SetStateAction<CurriculumProfile[]>>;
  courseRequirements: CurriculumData['requisitos'] | null;
  setCourseRequirements: React.Dispatch<React.SetStateAction<CurriculumData['requisitos'] | null>>;
  extractedProfile: CurriculumProfile | null;
  setExtractedProfile: React.Dispatch<React.SetStateAction<CurriculumProfile | null>>;
  courseName: string;
  setCourseName: React.Dispatch<React.SetStateAction<string>>;
  courseShortName: string;
  setCourseShortName: React.Dispatch<React.SetStateAction<string>>;
  selectedCourseId: string;
  isCreatingNewCourse: boolean;
  scheduleSemester: string;
  setScheduleSemester: React.Dispatch<React.SetStateAction<string>>;
  setScheduleTitle: React.Dispatch<React.SetStateAction<string>>;
  setDetectedDifferentCourse: React.Dispatch<React.SetStateAction<{name:string; shortName:string} | null>>;
  setErrorMsg: React.Dispatch<React.SetStateAction<string | null>>;
  setSuccessMsg: React.Dispatch<React.SetStateAction<string | null>>;
  setReviewTab: React.Dispatch<React.SetStateAction<'table' | 'visual' | 'tree' | 'json'>>;
  cleanCourseTitle: (title: string) => string;
  generateShortName: (name: string) => string;
  resolveTreePrerequisiteReferences: (nodes: TreeSubjectNode[]) => TreeSubjectNode[];
}

export function useJsonImportExport({
  activeMode,
  curriculumExtractType,
  selectedSubStepId,
  disciplines,
  setDisciplines: commitDisciplines,
  curriculumSubjects,
  setCurriculumSubjects: commitCurriculumSubjects,
  extractedTreeSubjects,
  setExtractedTreeSubjects: commitExtractedTreeSubjects,
  courseProfiles,
  setCourseProfiles: commitCourseProfiles,
  courseRequirements,
  setCourseRequirements: commitCourseRequirements,
  extractedProfile,
  setExtractedProfile: commitExtractedProfile,
  courseName,
  setCourseName: commitCourseName,
  courseShortName,
  setCourseShortName: commitCourseShortName,
  selectedCourseId,
  isCreatingNewCourse,
  scheduleSemester,
  setScheduleSemester: commitScheduleSemester,
  setScheduleTitle: commitScheduleTitle,
  setDetectedDifferentCourse: commitDetectedDifferentCourse,
  setErrorMsg,
  setSuccessMsg: commitSuccessMsg,
  setReviewTab: commitReviewTab,
  cleanCourseTitle,
  generateShortName,
  resolveTreePrerequisiteReferences
}: UseJsonImportExportParams) {

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  
  const [extractionReport, setExtractionReport] = useState<ExtractionReport | null>(null);
  const [pastedJsonText, setPastedJsonText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    summary: string;
    issues: ExtractionIssue[];
    stats?: { count: number; sessionsCount?: number };
  } | null>(null);
  const [lastMergeStats, setLastMergeStats] = useState<{ added: number; updated: number; total: number } | null>(null);
  
  const [jsonEditors, setJsonEditors] = useState({ curriculum: '', schedule: '' });
  const jsonText = jsonEditors[activeMode];
  const setJsonText = (text: string) => setJsonEditors(previous => ({ ...previous, [activeMode]: text }));
  const lastEditorData = useRef({ curriculum: '', schedule: '' });
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  type ImportPatch = Record<string, unknown>;
  const stageRef = useRef<ImportPatch | null>(null);
  const [pendingImport, setPendingImport] = useState<{ patch: ImportPatch; mode: 'merge' | 'replace'; changes: Array<{ field: string; before: unknown; after: unknown }> } | null>(null);
  const base: ImportPatch = { disciplines, curriculumSubjects, extractedTreeSubjects, courseProfiles, courseRequirements, extractedProfile, courseName, courseShortName, scheduleSemester, scheduleTitle: '', detectedDifferentCourse: null, successMsg: null, reviewTab: 'table' };
  const capture = <T,>(key: string, commit: React.Dispatch<React.SetStateAction<T>>) => (update: React.SetStateAction<T>) => {
    if (stageRef.current) {
      const previous = Object.prototype.hasOwnProperty.call(stageRef.current, key) ? stageRef.current[key] : base[key];
      stageRef.current[key] = typeof update === 'function' ? (update as (value: T) => T)(previous as T) : update;
    } else commit(update);
  };
  const setDisciplines = capture('disciplines', commitDisciplines);
  const setCurriculumSubjects = capture('curriculumSubjects', commitCurriculumSubjects);
  const setExtractedTreeSubjects = capture('extractedTreeSubjects', commitExtractedTreeSubjects);
  const setCourseProfiles = capture('courseProfiles', commitCourseProfiles);
  const setCourseRequirements = capture('courseRequirements', commitCourseRequirements);
  const setExtractedProfile = capture('extractedProfile', commitExtractedProfile);
  const setCourseName = capture('courseName', commitCourseName);
  const setCourseShortName = capture('courseShortName', commitCourseShortName);
  const setScheduleSemester = capture('scheduleSemester', commitScheduleSemester);
  const setScheduleTitle = capture('scheduleTitle', commitScheduleTitle);
  const setDetectedDifferentCourse = capture('detectedDifferentCourse', commitDetectedDifferentCourse);
  const setSuccessMsg = capture('successMsg', commitSuccessMsg);
  const setReviewTab = capture('reviewTab', commitReviewTab);
  const commits: Record<string, (value: any) => void> = {
    disciplines: commitDisciplines,
    curriculumSubjects: commitCurriculumSubjects,
    extractedTreeSubjects: commitExtractedTreeSubjects,
    courseProfiles: commitCourseProfiles,
    courseRequirements: commitCourseRequirements,
    extractedProfile: commitExtractedProfile,
    courseName: commitCourseName,
    courseShortName: commitCourseShortName,
    scheduleSemester: commitScheduleSemester,
    scheduleTitle: commitScheduleTitle,
    detectedDifferentCourse: commitDetectedDifferentCourse,
    successMsg: commitSuccessMsg,
    reviewTab: commitReviewTab,
  };
  const prepareImport = (run: () => void, mode: 'merge' | 'replace') => {
    stageRef.current = {};
    setPendingImport(null);
    try {
      run();
      const patch = stageRef.current;
      const changes = Object.entries(patch).filter(([key, value]) =>
        !['reviewTab', 'successMsg', 'detectedDifferentCourse', 'scheduleTitle', 'extractedProfile'].includes(key) && JSON.stringify(base[key]) !== JSON.stringify(value)
      ).map(([field, after]) => ({ field, before: base[field], after }));
      if (changes.length) setPendingImport({ patch, mode, changes });
      else if (Object.prototype.hasOwnProperty.call(patch, 'successMsg') && patch.successMsg) setValidationResult({ isValid: true, summary: 'Nenhuma alteração encontrada: os dados já correspondem ao rascunho.', issues: [] });
    } catch (error: any) {
      setValidationResult({ isValid: false, summary: error.message, issues: [] });
    } finally { stageRef.current = null; }
  };
  const applyPendingImport = () => {
    if (!pendingImport) return;
    if (pendingImport.mode === 'replace' && !window.confirm(`Substituir os dados de ${activeMode === 'schedule' ? `oferta de ${scheduleSemester}` : 'currículo deste curso'} conforme a comparação? Os registros removidos estão listados na prévia.`)) return;
    for (const [key, value] of Object.entries(pendingImport.patch)) {
      if (key !== 'reviewTab' && key !== 'successMsg' && key !== 'detectedDifferentCourse') commits[key]?.(value);
    }
    commitSuccessMsg('Importação aplicada ao rascunho. Confira a seção correspondente e salve para gravar.');
    setPendingImport(null);
  };
  useEffect(() => { setPendingImport(null); setValidationResult(null); }, [activeMode, curriculumExtractType, selectedSubStepId, selectedCourseId, scheduleSemester, extractedProfile?.id, pastedJsonText, jsonText, disciplines, curriculumSubjects, extractedTreeSubjects, courseProfiles, courseRequirements]);

  useEffect(() => { commitSuccessMsg(null); }, [pastedJsonText]);

  const jsonData = useMemo(() => ({
    courseName, courseShortName,
    ...(activeMode === 'curriculum' ? {
      subjects: curriculumSubjects,
      ...(courseRequirements ? { requisitos: courseRequirements } : {}),
      ...(extractedTreeSubjects.length ? { treeSubjects: extractedTreeSubjects } : {}),
      ...(courseProfiles.length ? { profiles: courseProfiles.map(profile => ({ ...profile, subjects: extractedTreeSubjects.filter(node => node.profile === profile.id) })) } : {})
    } : { disciplines }),
    ...(extractionReport ? { _extraction: extractionReport } : {})
  }), [activeMode, courseName, courseShortName, curriculumSubjects, extractedTreeSubjects, courseProfiles, courseRequirements, disciplines, extractionReport]);

  const currentExtractMode: ExtractionModeType = activeMode === 'schedule' ? 'schedule' : curriculumExtractType;
  const basePromptDef = EXTRACTION_PROMPTS[currentExtractMode];
  const activeSubStep: PromptSubStep | undefined = selectedSubStepId === '__full__'
    ? undefined
    : basePromptDef.subSteps?.find(step => step.id === selectedSubStepId);
  const currentPrompt = activeSubStep ? {
    ...basePromptDef,
    badge: activeSubStep.badge,
    shortDescription: activeSubStep.shortDescription,
    recommendedModels: activeSubStep.recommendedModels,
    promptText: activeSubStep.promptText
  } : basePromptDef;
  const isCourseHoursStep = activeSubStep?.id === 'course_hours';
  const displayedHoursProfile = extractedProfile || (courseProfiles.length === 1 ? courseProfiles[0] : null);
  const displayedCourseHours: CourseHours | null = displayedHoursProfile
    ? displayedHoursProfile
    : courseRequirements ? {
      totalHours: courseRequirements.total ?? null,
      acexHours: courseRequirements.acex_extensao ?? null,
      accHours: courseRequirements.acc_complementar ?? null
    } : null;
  const formatCourseHours = (value: number | null) => value == null ? '—' : `${value}h`;
  const currentPromptText = isCourseHoursStep
    ? `${currentPrompt.promptText}\n\nCurso selecionado no aplicativo: ${courseName}. Perfis já cadastrados: ${courseProfiles.map(profile => profile.id).join(', ') || 'nenhum'}. Use profileId apenas se corresponder a um desses perfis; caso contrário, use null.`
    : currentPrompt.promptText;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(currentPromptText);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    } catch (e) {
      console.error('Falha ao copiar prompt', e);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedJsonText(text);

      }
    } catch (e) {
      console.error('Falha ao ler da área de transferência', e);
    }
  };

  const handleUploadJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPastedJsonText(reader.result);

      }
    };
    reader.readAsText(file);
    if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
  };

  const handleExportJsonFile = () => {
    const isCurr = activeMode === 'curriculum';
    const content = JSON.stringify(jsonData, null, 2);

    const filename = isCurr 
      ? `curriculo_${selectedCourseId || 'curso'}.json`
      : `horario_${selectedCourseId || 'curso'}_${(scheduleSemester || '2026.1').replace(/\./g, '_')}.json`;

    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    const content = JSON.stringify(jsonData, null, 2);
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buildJsonEdit = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const list = Array.isArray(parsed) ? parsed : activeMode === 'curriculum' ? parsed.subjects : parsed.disciplines;
      if (!Array.isArray(list)) throw new Error('O JSON deve conter uma lista de disciplinas.');
      const errors = [...validateExtraction(list, activeMode === 'curriculum' ? 'linear' : 'schedule'), ...(activeMode === 'curriculum' && Array.isArray(parsed.treeSubjects) ? validateExtraction(parsed.treeSubjects, 'tree') : [])].filter(issue => issue.severity === 'error');
      if (errors.length) throw new Error(errors.map(issue => `${issue.record}: ${issue.message}`).join(' | '));
      if (activeMode === 'curriculum') {
        const subjects = Array.isArray(parsed) ? parsed : (parsed.subjects || []);
        const normalized = syncCatalog(subjects, Array.isArray(parsed.treeSubjects) ? parsed.treeSubjects : []);
        setCurriculumSubjects(normalized.subjects);
        setExtractedTreeSubjects(normalized.nodes);
        setCourseProfiles(Array.isArray(parsed.profiles) ? parsed.profiles : []);
        setCourseRequirements(parsed.requisitos && typeof parsed.requisitos === 'object' ? parsed.requisitos : null);
        setExtractedProfile(null);
        setSuccessMsg(`JSON Curricular validado e aplicado! (${subjects.length} disciplinas)`);
      } else {
        const list = Array.isArray(parsed) ? parsed : (parsed.disciplines || []);
        setDisciplines(list);
        setSuccessMsg(`JSON de Horários validado e aplicado! (${list.length} disciplinas)`);
      }
      setJsonError(null);
    } catch (e: any) {
      setJsonError(`Erro de Sintaxe JSON: ${e.message}`);
    }
  };

  const buildImport = (rawInput?: string, applyMode: 'merge' | 'replace' = 'merge') => {
    const textToParse = (rawInput !== undefined ? rawInput : pastedJsonText).trim();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLastMergeStats(null);

    if (!textToParse) {
      setValidationResult({
        isValid: false,
        summary: 'O campo de texto do JSON está vazio. Cole o JSON antes de validar.',
        issues: []
      });
      return;
    }

    let parsed: any;
    try {
      const cleaned = textToParse
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (e: any) {
      setValidationResult({
        isValid: false,
        summary: `Erro de sintaxe no JSON: ${e.message}`,
        issues: [{ severity: 'error', record: 'JSON', field: 'syntax', message: e.message }]
      });
      return;
    }

    const hourFields = ['totalHours', 'acexHours', 'accHours'] as const;
    const hasHourFields = parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
      hourFields.some(field => Object.prototype.hasOwnProperty.call(parsed, field));
    if (isCourseHoursStep || (hasHourFields && !parsed.subjects && !parsed.disciplines && !parsed.nodes)) {
      const rejectHours = (field: string, message: string) => {
        setValidationResult({
          isValid: false,
          summary: message,
          issues: [{ severity: 'error', record: 'Horas do curso', field, message }]
        });
      };
      if (activeMode !== 'curriculum') {
        rejectHours('mode', 'Selecione Catálogo Curricular para mesclar as horas do curso.');
        return;
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
        Array.isArray(parsed.subjects) || Array.isArray(parsed.profiles)) {
        rejectHours('json', 'Esperado um objeto JSON só com as horas do curso, sem disciplinas ou perfis.');
        return;
      }
      if (parsed.courseName != null && (typeof parsed.courseName !== 'string' || !parsed.courseName.trim())) {
        rejectHours('courseName', 'courseName deve ser um nome de curso ou null.');
        return;
      }
      if (parsed.profileId != null && (typeof parsed.profileId !== 'string' || !parsed.profileId.trim())) {
        rejectHours('profileId', 'profileId deve conter um ID de perfil cadastrado ou null.');
        return;
      }

      const incomingHours: Partial<CourseHours> = {};
      for (const field of hourFields) {
        const value = parsed[field];
        if (value == null) continue;
        if (!Number.isInteger(value) || value < 0) {
          rejectHours(field, `${field} deve ser um número inteiro de horas maior ou igual a zero, ou null.`);
          return;
        }
        incomingHours[field] = value;
      }
      if (Object.keys(incomingHours).length === 0) {
        rejectHours('hours', 'Nenhuma das três cargas horárias foi encontrada no JSON.');
        return;
      }

      const profileId = parsed.profileId?.trim();
      const targetProfile = profileId
        ? courseProfiles.find(profile => profile.id.toLowerCase() === profileId.toLowerCase())
        : extractedProfile || (courseProfiles.length === 1 ? courseProfiles[0] : null);
      if (profileId && !targetProfile) {
        rejectHours('profileId', `O perfil “${profileId}” não está cadastrado neste curso. Confira o ID antes de mesclar.`);
        return;
      }
      if (!profileId && courseProfiles.length > 1 && !targetProfile) {
        rejectHours('profileId', `Há vários perfis neste curso (${courseProfiles.map(profile => profile.id).join(', ')}). Informe profileId no JSON.`);
        return;
      }

      let mergedHours: CourseHours;
      if (targetProfile) {
        const mergedProfile = mergeCourseHours(targetProfile, incomingHours);
        mergedHours = mergedProfile;
        setCourseProfiles(previous => previous.map(profile => profile.id === targetProfile.id ? mergedProfile : profile));
        if (extractedProfile?.id === targetProfile.id || courseProfiles.length === 1) setExtractedProfile(mergedProfile);
        setReviewTab('tree');
      } else {
        mergedHours = mergeCourseHours({
          totalHours: courseRequirements?.total ?? null,
          acexHours: courseRequirements?.acex_extensao ?? null,
          accHours: courseRequirements?.acc_complementar ?? null
        }, incomingHours);
        setCourseRequirements(previous => ({
          ...(previous || {}),
          ...(mergedHours.totalHours != null ? { total: mergedHours.totalHours } : {}),
          ...(mergedHours.acexHours != null ? { acex_extensao: mergedHours.acexHours } : {}),
          ...(mergedHours.accHours != null ? { acc_complementar: mergedHours.accHours } : {})
        }));
      }
      const importedCourseName = typeof parsed.courseName === 'string' ? parsed.courseName.trim() : '';
      const normalizedImportedCourseName = normalizeAcademicName(importedCourseName);
      const hasUsableImportedCourseName = importedCourseName !== '' &&
        normalizedImportedCourseName !== 'nome do curso' &&
        normalizedImportedCourseName !== 'nome oficial do curso';
      const courseNameChanged = hasUsableImportedCourseName &&
        normalizedImportedCourseName !== normalizeAcademicName(courseName);
      if (hasUsableImportedCourseName && isCreatingNewCourse) setCourseName(importedCourseName);
      const destination = targetProfile ? `perfil ${targetProfile.id}` : 'curso';
      setValidationResult({
        isValid: true,
        summary: `Horas mescladas ao ${destination}: total ${formatCourseHours(mergedHours.totalHours)}, ACEX ${formatCourseHours(mergedHours.acexHours)}, ACC ${formatCourseHours(mergedHours.accHours)}.${courseNameChanged ? ` Nome atualizado para “${importedCourseName}”.` : ''} Disciplinas preservadas.`,
        issues: []
      });
      setSuccessMsg(`Horas ACEX, ACC e total atualizadas no ${destination}.${courseNameChanged ? ` Nome do curso atualizado para “${importedCourseName}”.` : ''}`);
      return;
    }

    if (currentExtractMode === 'schedule') {
      if (!/^\d{4}\.[12]$/.test(scheduleSemester)) throw new Error('Selecione o semestre de destino antes de importar.');
      const incomingRecords = Array.isArray(parsed) ? parsed : parsed.disciplines || parsed.records || [];
      if ((parsed.semester && parsed.semester !== scheduleSemester) || (Array.isArray(incomingRecords) && incomingRecords.some((item: any) => item.semester && item.semester !== scheduleSemester))) throw new Error('O semestre informado no JSON difere do destino selecionado. Abra o semestre correto antes de importar.');

      const rawList = Array.isArray(parsed) ? parsed : (parsed.disciplines || parsed.records || []);
      if (!Array.isArray(rawList) || rawList.length === 0) {
        setValidationResult({
          isValid: false,
          summary: 'Nenhuma turma/disciplina encontrada no JSON de horários. Esperado array ou objeto com a chave "disciplines".',
          issues: [{ severity: 'error', record: 'Raiz', field: 'disciplines', message: 'Lista vazia ou ausente.' }]
        });
        return;
      }

      const sanitized = rawList.map((item: any, idx: number) => ({
        id: String(item.id || `turma_${idx + 1}`),
        code: item.code ? String(item.code).trim() : null,
        name: String(item.name || `Turma ${idx + 1}`).trim(),
        professor: item.professor ? String(item.professor).trim() : '-',
        period: item.period !== null && item.period !== undefined && item.period !== '' ? Number(item.period) : null,
        profile: item.profile ? String(item.profile).trim() : (activeMode === 'curriculum' ? extractedProfile?.id : undefined),
        semester: item.semester ? String(item.semester).trim() : undefined,
        courseName: item.courseName ? String(item.courseName).trim() : undefined,
        classGroup: item.classGroup ? String(item.classGroup).trim() : undefined,
        sessions: Array.isArray(item.sessions) ? item.sessions.map((s: any) => ({
          day: Number(s.day),
          time: String(s.time || '').trim()
        })) : []
      }));

      const shouldMerge = applyMode === 'merge';
      const { result: nextDisciplines, added, updated } = shouldMerge
        ? mergeScheduleList(disciplines, sanitized)
        : { result: sanitized, added: sanitized.length, updated: 0 };
      const issues = validateExtraction(nextDisciplines, 'schedule');
      const errors = issues.filter(i => i.severity === 'error');

      if (errors.length > 0) {
        setValidationResult({
          isValid: false,
          summary: `Encontrado(s) ${errors.length} erro(s) crítico(s) de validação ${shouldMerge ? 'após a mesclagem' : 'nos horários'}.`,
          issues
        });
        return;
      }

      setDisciplines(nextDisciplines);
      if (applyMode === 'merge') setLastMergeStats({ added, updated, total: nextDisciplines.length });

      let extractedCourseName = parsed.courseName || (parsed.title ? cleanCourseTitle(parsed.title) : '');
      let extractedShortName = parsed.courseShortName || (extractedCourseName ? generateShortName(extractedCourseName) : '');

      if (!extractedCourseName) {
        const codes = sanitized.map((d: any) => d.code).filter(Boolean);
        const prefixes = codes.map((c: string) => c.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4)).filter(Boolean);
        const counts: Record<string, number> = {};
        prefixes.forEach((p: string) => counts[p] = (counts[p] || 0) + 1);
        const topPrefix = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
        if (topPrefix === 'EAL') {
          extractedCourseName = 'Engenharia de Alimentos';
          extractedShortName = 'EAL';
        } else if (topPrefix === 'BCC' || topPrefix === 'CCMP') {
          extractedCourseName = 'Ciência da Computação';
          extractedShortName = 'BCC';
        } else if (topPrefix === 'ADM') {
          extractedCourseName = 'Administração';
          extractedShortName = 'ADM';
        } else if (topPrefix === 'MVET') {
          extractedCourseName = 'Medicina Veterinária';
          extractedShortName = 'MVET';
        } else if (topPrefix) {
          extractedShortName = topPrefix;
          extractedCourseName = `Curso ${topPrefix}`;
        }
      }

      if (isCreatingNewCourse || courseName === 'Novo Curso Acadêmico') {
        if (extractedCourseName) setCourseName(extractedCourseName);
        if (extractedShortName) setCourseShortName(extractedShortName);
      } else if (extractedShortName && selectedCourseId && selectedCourseId !== extractedShortName.toLowerCase()) {
        setDetectedDifferentCourse({ name: extractedCourseName, shortName: extractedShortName });
      }

      if (parsed.title) setScheduleTitle(parsed.title);
      else if (extractedCourseName) setScheduleTitle(`${extractedCourseName} - Horário 2026.1`);

      const semesterFound = sanitized.find((d: any) => d.semester)?.semester || parsed.semester;
      if (semesterFound && /^\d{4}\.[12]$/.test(semesterFound)) {
        setScheduleSemester(semesterFound);
      } else if (!scheduleSemester || !/^\d{4}\.[12]$/.test(scheduleSemester)) {
        setScheduleSemester('2026.1');
      }

      const totalSessions = nextDisciplines.reduce((acc: number, d: any) => acc + (d.sessions?.length || 0), 0);
      setValidationResult({
        isValid: true,
        summary: shouldMerge
          ? `Lote mesclado: +${added} turma(s), ${updated} atualizada(s). Total de ${nextDisciplines.length} turma(s) e ${totalSessions} sessão(ões).`
          : `Sucesso! ${nextDisciplines.length} turma(s) e ${totalSessions} sessão(ões) de aula validadas e carregadas.`,
        issues,
        stats: { count: nextDisciplines.length, sessionsCount: totalSessions }
      });
      setSuccessMsg(shouldMerge
        ? `Lote de horários mesclado. Total atual: ${nextDisciplines.length} turmas.`
        : `Horário carregado com sucesso! ${nextDisciplines.length} turmas estruturadas.`);
      setReviewTab('table');
      return;
    }

    if (currentExtractMode === 'linear') {
      const rawList = Array.isArray(parsed) ? parsed : (parsed.subjects || parsed.disciplines || parsed.records || []);
      if (!Array.isArray(rawList) || rawList.length === 0) {
        setValidationResult({
          isValid: false,
          summary: 'Nenhuma disciplina encontrada no JSON do catálogo curricular. Esperado array ou objeto com a chave "subjects".',
          issues: [{ severity: 'error', record: 'Raiz', field: 'subjects', message: 'Lista vazia ou ausente.' }]
        });
        return;
      }

      const sanitized: CurriculumSubject[] = rawList.map((item: any, idx: number) => {
        const rawType = item.type ? String(item.type).trim() : (item.academicType || null);
        const normType = normalizeAcademicType(rawType);
        return {
          id: String(item.id || `disciplina_${idx + 1}`),
          code: item.code ? String(item.code).trim() : null,
          name: String(item.name || `Disciplina ${idx + 1}`).trim(),
          type: normType || rawType,
          period: item.period !== null && item.period !== undefined ? String(item.period) : null,
          credits: item.credits !== null && item.credits !== undefined && item.credits !== '' ? Number(item.credits) : null,
          profile: item.profile ? String(item.profile).trim() : (activeMode === 'curriculum' ? extractedProfile?.id : undefined),
          workload: {
            teorica: item.workload?.teorica !== null && item.workload?.teorica !== undefined && item.workload?.teorica !== '' ? Number(item.workload.teorica) : null,
            pratica: item.workload?.pratica !== null && item.workload?.pratica !== undefined && item.workload?.pratica !== '' ? Number(item.workload.pratica) : null,
            extensao: item.workload?.extensao !== null && item.workload?.extensao !== undefined && item.workload?.extensao !== '' ? Number(item.workload.extensao) : null,
            semipresencialEad: item.workload?.semipresencialEad !== null && item.workload?.semipresencialEad !== undefined && item.workload?.semipresencialEad !== '' ? Number(item.workload.semipresencialEad) : null,
            total: item.workload?.total !== null && item.workload?.total !== undefined && item.workload?.total !== '' ? Number(item.workload.total) : (item.hours ? Number(item.hours) : null)
          },
          prerequisites: Array.isArray(item.prerequisites) ? item.prerequisites : [],
          corequisites: Array.isArray(item.corequisites) ? item.corequisites : [],
          equivalences: Array.isArray(item.equivalences) ? item.equivalences : [],
          ementa: item.ementa ? String(item.ementa).trim() : (item.desc ? String(item.desc).trim() : null)
        };
      });

      const shouldMerge = applyMode === 'merge';
      const { result: nextSubjects, added, updated } = shouldMerge
        ? mergeCurriculumList(curriculumSubjects, sanitized)
        : { result: sanitized, added: sanitized.length, updated: 0 };
      const issues = validateExtraction(nextSubjects, 'linear');
      const errors = issues.filter(i => i.severity === 'error');

      if (errors.length > 0) {
        setValidationResult({
          isValid: false,
          summary: `Encontrado(s) ${errors.length} erro(s) crítico(s) de validação ${shouldMerge ? 'após a mesclagem curricular' : 'no catálogo curricular'}.`,
          issues
        });
        return;
      }

      const normalized = syncCatalog(nextSubjects, extractedTreeSubjects);
      const graphErrors = validateExtraction(normalized.nodes, 'tree').filter(issue => issue.severity === 'error');
      if (graphErrors.length) throw new Error(graphErrors.map(issue => issue.message).join(' | '));
      setCurriculumSubjects(normalized.subjects);
      setExtractedTreeSubjects(normalized.nodes);

      const extractedCourseName = parsed.courseName || (parsed.title ? cleanCourseTitle(parsed.title) : '');
      const extractedShortName = parsed.courseShortName || (extractedCourseName ? generateShortName(extractedCourseName) : '');
      if (isCreatingNewCourse || courseName === 'Novo Curso Acadêmico') {
        if (extractedCourseName) setCourseName(extractedCourseName);
        if (extractedShortName) setCourseShortName(extractedShortName);
      }

      setValidationResult({
        isValid: true,
        summary: shouldMerge
          ? `Lote curricular mesclado: +${added} nova(s) matéria(s), ${updated} atualizada(s). Total: ${nextSubjects.length} disciplinas.`
          : `Sucesso! ${nextSubjects.length} disciplina(s) do catálogo curricular carregadas.`,
        issues,
        stats: { count: nextSubjects.length }
      });
      if (shouldMerge) setLastMergeStats({ added, updated, total: nextSubjects.length });
      setSuccessMsg(shouldMerge
        ? `Catálogo curricular mesclado. Total atual: ${nextSubjects.length} matérias.`
        : `Catálogo Curricular carregado com sucesso! ${nextSubjects.length} disciplinas mapeadas.`);
      setReviewTab('table');
      return;
    }

    if (currentExtractMode === 'tree') {
      const rawList = Array.isArray(parsed) ? parsed : (parsed.subjects || parsed.nodes || parsed.records || []);
      if (!Array.isArray(rawList) || rawList.length === 0) {
        setValidationResult({
          isValid: false,
          summary: 'Nenhum nó/disciplina encontrado para a matriz em árvore. Esperado array ou objeto com a chave "subjects".',
          issues: [{ severity: 'error', record: 'Raiz', field: 'subjects', message: 'Lista vazia ou ausente.' }]
        });
        return;
      }

      const sanitizedNodes: TreeSubjectNode[] = rawList.map((item: any, idx: number) => {
        const normAcadType = normalizeAcademicType(item.academicType);
        return {
          id: String(item.id || `no_${idx + 1}`),
          code: item.code ? String(item.code).trim() : null,
          name: String(item.name || `Disciplina ${idx + 1}`).trim(),
          period: item.period !== null && item.period !== undefined && item.period !== '' ? Number(item.period) : null,
          hours: item.hours !== null && item.hours !== undefined && item.hours !== ''
            ? Number(item.hours)
            : item.workload?.total !== null && item.workload?.total !== undefined && item.workload?.total !== ''
              ? Number(item.workload.total) : null,
          credits: item.credits !== null && item.credits !== undefined && item.credits !== '' ? Number(item.credits) : undefined,
          type: item.type ? String(item.type).trim() : '',
          academicType: normAcadType || (item.type === 'optativa' ? 'Optativa' : null),
          profile: item.profile ? String(item.profile).trim() : (activeMode === 'curriculum' ? extractedProfile?.id : undefined),
          prereqs: Array.isArray(item.prereqs)
            ? item.prereqs.map(String)
            : (Array.isArray(item.prerequisites)
              ? item.prerequisites.map((p: any) => typeof p === 'string' ? p : (p.id || p.code || ''))
              : []),
          workload: item.workload ? {
            teorica: item.workload.teorica == null || item.workload.teorica === '' ? null : Number(item.workload.teorica),
            pratica: item.workload.pratica == null || item.workload.pratica === '' ? null : Number(item.workload.pratica),
            extensao: item.workload.extensao == null || item.workload.extensao === '' ? null : Number(item.workload.extensao),
            semipresencialEad: item.workload.semipresencialEad == null || item.workload.semipresencialEad === '' ? null : Number(item.workload.semipresencialEad),
            total: item.workload.total == null || item.workload.total === '' ? null : Number(item.workload.total)
          } : undefined,
          corequisites: Array.isArray(item.corequisites) ? item.corequisites : [],
          equivalences: Array.isArray(item.equivalences) ? item.equivalences : [],
          desc: item.desc ? String(item.desc).trim() : (item.ementa ? String(item.ementa).trim() : null),
          evidence: Array.isArray(item.evidence) ? item.evidence : undefined
        };
      });

      const shouldMerge = applyMode === 'merge';
      const { result: nextNodes, added, updated } = shouldMerge
        ? mergeTreeNodesList(extractedTreeSubjects, sanitizedNodes)
        : { result: resolveTreePrerequisiteReferences(sanitizedNodes), added: sanitizedNodes.length, updated: 0 };
      const issues = validateExtraction(nextNodes, 'tree');
      const errors = issues.filter(i => i.severity === 'error');

      if (errors.length > 0) {
        setValidationResult({
          isValid: false,
          summary: `Encontrado(s) ${errors.length} erro(s) crítico(s) no grafo (ex: ciclos ou nós de pré-requisitos inexistentes).`,
          issues
        });
        return;
      }

      const rawProfiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];
      const importedProfiles: CurriculumProfile[] = rawProfiles.map((p: any) => ({
        ...p,
        totalHours: Number.isInteger(p.totalHours) ? p.totalHours : null,
        acexHours: Number.isInteger(p.acexHours) ? p.acexHours : null,
        accHours: Number.isInteger(p.accHours) ? p.accHours : null,
        optativeHours: Number.isInteger(p.optativeHours) ? p.optativeHours : null,
        subjects: []
      }));
      const profileMap = new Map<string, CurriculumProfile>();
      if (shouldMerge) courseProfiles.forEach(profile => profileMap.set(profile.id, profile));
      importedProfiles.forEach(profile => {
        const previous = profileMap.get(profile.id);
        if (!previous) {
          profileMap.set(profile.id, profile);
          return;
        }
        const suppliedMetadata = Object.fromEntries(Object.entries(profile).filter(([key, value]) =>
          !['subjects', 'totalHours', 'acexHours', 'accHours', 'requisitos'].includes(key) && value != null && value !== ''));
        profileMap.set(profile.id, mergeCourseHours({ ...previous, ...suppliedMetadata }, profile));
      });
      const nextProfiles = [...profileMap.values()].map(profile => ({
        ...profile,
        subjects: nextNodes.filter(subject => subject.profile === profile.id)
      }));
      const nextExtractedProfile = nextProfiles.find(profile => profile.id === extractedProfile?.id)
        || nextProfiles[0]
        || (shouldMerge ? extractedProfile : null);

      setCourseProfiles(nextProfiles);
      setExtractedProfile(nextExtractedProfile);
      setExtractedTreeSubjects(nextNodes);

      const flatMapped = treeToCurriculum(nextNodes, nextExtractedProfile?.id ?? null);
      const mergedCurriculum = shouldMerge && curriculumSubjects.length > 0
        ? mergeCurriculumList(curriculumSubjects, flatMapped).result
        : flatMapped;
      setCurriculumSubjects(mergedCurriculum);
      if (shouldMerge) setLastMergeStats({ added, updated, total: nextNodes.length });

      const extractedCourseName = parsed.courseName || '';
      const extractedShortName = parsed.courseShortName || (extractedCourseName ? generateShortName(extractedCourseName) : '');
      if (isCreatingNewCourse || courseName === 'Novo Curso Acadêmico') {
        if (extractedCourseName) setCourseName(extractedCourseName);
        if (extractedShortName) setCourseShortName(extractedShortName);
      }

      setValidationResult({
        isValid: true,
        summary: shouldMerge
          ? `Árvore mesclada: +${added} nó(s) novo(s), ${updated} atualizado(s). Total: ${nextNodes.length} matérias.`
          : `Sucesso! ${nextNodes.length} disciplina(s) em árvore mapeadas com suas dependências.`,
        issues,
        stats: { count: nextNodes.length }
      });
      setSuccessMsg(shouldMerge
        ? `Matriz em Árvore mesclada. Total atual: ${nextNodes.length} matérias.`
        : `Matriz em Árvore carregada com sucesso! ${nextNodes.length} disciplinas mapeadas.`);
      setReviewTab('tree');
      return;
    }
  };

  const handleValidateAndApplyJson = (rawInput?: string, applyMode: 'merge' | 'replace' = 'merge') => prepareImport(() => buildImport(rawInput, applyMode), applyMode);
  const handleApplyJsonEdit = () => prepareImport(buildJsonEdit, 'replace');
  useEffect(() => {
    const text = JSON.stringify(jsonData, null, 2);
    if (lastEditorData.current[activeMode] !== text) {
      lastEditorData.current[activeMode] = text;
      setJsonText(text); setJsonError(null);
    }
  }, [jsonData]);

  return {
    pendingImport, applyPendingImport, discardPendingImport: () => setPendingImport(null),
    extractionReport, setExtractionReport,
    pastedJsonText, setPastedJsonText,
    copyFeedback, setCopyFeedback,
    isPromptExpanded, setIsPromptExpanded,
    validationResult, setValidationResult,
    lastMergeStats, setLastMergeStats,
    jsonText, setJsonText,
    jsonError, setJsonError,
    copied, setCopied,
    jsonFileInputRef,
    jsonData,
    basePromptDef,
    activeSubStep,
    currentPrompt,
    currentPromptText,
    isCourseHoursStep,
    displayedCourseHours,
    displayedHoursProfile,
    formatCourseHours,
    handleCopyPrompt,
    handlePasteFromClipboard,
    handleUploadJsonFile,
    handleValidateAndApplyJson,
    handleExportJsonFile,
    handleCopyJson,
    handleApplyJsonEdit
  };
}
