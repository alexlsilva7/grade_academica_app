import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Discipline, CurriculumSubject, CurriculumProfile, TreeSubjectNode, CurriculumData } from '../types';
import { validateExtraction, ExtractionIssue } from '../utils/extraction';
import { DAYS } from '../constants';

// Custom Hooks
import { useCourseManager } from '../hooks/useCourseManager';
import { useScheduleEditor } from '../hooks/useScheduleEditor';
import { useCurriculumEditor } from '../hooks/useCurriculumEditor';
import { useTreeEditor } from '../hooks/useTreeEditor';
import { useProfileManager } from '../hooks/useProfileManager';
import { useAdminFilters } from '../hooks/useAdminFilters';
import { useJsonImportExport } from '../hooks/useJsonImportExport';

// Sub-components
import { AdminTopBar } from './admin/AdminTopBar';
import { NotificationBanners } from './admin/NotificationBanners';
import { AdminSidebar, ADMIN_SECTIONS, AdminSection, SaveDomain, readAdminSection } from './admin/AdminSidebar';
import { CourseSettings, CourseVisibility } from './admin/CourseSettings';
import { ProfileSection } from './admin/ProfileSection';
import { UnsavedChangesDialog } from './admin/UnsavedChangesDialog';
import { dependentNodes, serializeCurriculum, syncCatalog } from '../utils/adminCurriculum';
import { ImportPreview } from './admin/ImportPreview';
import { ImportSection } from './admin/ImportSection';
import { ReviewTabs, ReviewTabType } from './admin/ReviewTabs';
import { CurriculumEditModal } from './admin/CurriculumEditModal';
import { ScheduleEditModal } from './admin/ScheduleEditModal';
import { TreeNodeEditModal } from './admin/TreeNodeEditModal';
import { ProfileMetaEditModal } from './admin/ProfileMetaEditModal';
import { DeleteConfirmModal } from './admin/DeleteConfirmModal';
import { DataMigration } from './admin/DataMigration';
import { apiFetch } from '../utils/api';

interface AdminViewProps {
  setView: (view: 'home' | 'schedule' | 'matriz' | 'disciplines' | 'admin') => void;
  setDisciplinesList: (disciplines: Discipline[]) => void;
  setGradeTitle: (title: string) => void;
}

export function AdminView({ setView, setDisciplinesList, setGradeTitle }: AdminViewProps) {
  const resultRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  // Core Data State
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [curriculumSubjects, setCurriculumSubjects] = useState<CurriculumSubject[]>([]);
  const [extractedTreeSubjects, setExtractedTreeSubjects] = useState<TreeSubjectNode[]>([]);
  const [courseProfiles, setCourseProfiles] = useState<CurriculumProfile[]>([]);
  const [courseRequirements, setCourseRequirements] = useState<CurriculumData['requisitos'] | null>(null);
  const [extractedProfile, setExtractedProfile] = useState<CurriculumProfile | null>(null);

  // Navigation & Mode State
  const [section, setSection] = useState<AdminSection>(() => readAdminSection('bcc'));
  const [importMode, setImportMode] = useState<'curriculum' | 'schedule'>('schedule');
  const activeMode = section === 'schedule' ? 'schedule' : section === 'import' ? importMode : 'curriculum';
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSemester, setIsLoadingSemester] = useState(false);
  const [newSemester, setNewSemester] = useState('');
  const semesterLoadVersion = useRef(0);
  const [visibility, setVisibility] = useState<CourseVisibility>({ hidden: false, showSchedule: true, showDisciplines: true, showMatriz: true, visibleSemesters: [] });
  const [baseline, setBaseline] = useState<Record<SaveDomain, string> | null>(null);
  const [loadedCourseId, setLoadedCourseId] = useState('');
  const [reports, setReports] = useState<{ curriculum: any; schedule: any }>({ curriculum: null, schedule: null });
  const [pendingNavigation, setPendingNavigation] = useState<{ action: () => void; domains: SaveDomain[] } | null>(null);
  const [curriculumExtractType, setCurriculumExtractType] = useState<'tree' | 'linear'>('tree');
  const [selectedSubStepId, setSelectedSubStepId] = useState<string>('schedule_chunk');
  const [reviewTab, setReviewTab] = useState<ReviewTabType>('table');
  const [selectedPreviewPeriod, setSelectedPreviewPeriod] = useState<number | 'all'>('all');

  // Feedback Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Course Manager Hook
  const courseManager = useCourseManager({
    setDisciplines,
    setCurriculumSubjects,
    setCourseProfiles,
    setCourseRequirements,
    setExtractedProfile,
    setExtractedTreeSubjects,
    setExtractionReport: (report) => {
      jsonImportExport.setExtractionReport(report as any);
    },
    setErrorMsg,
    setSuccessMsg,
    activeMode,
    onLoaded: data => {
      setLoadedCourseId(data.course.id);
      setVisibility({ hidden: data.course.hidden ?? false, showSchedule: data.course.showSchedule ?? true, showDisciplines: data.course.showDisciplines ?? true, showMatriz: data.course.showMatriz ?? true, visibleSemesters: data.course.visibleSemesters ?? data.course.semesters ?? [] });
      setReports({ curriculum: data.curriculum?.extraction || null, schedule: data.scheduleExtraction || null });
    }
  });

  // 2. Filters & Derived State Hook
  const adminFilters = useAdminFilters({
    disciplines,
    curriculumSubjects,
    activeMode
  });

  // 3. Schedule Editor Hook
  const scheduleEditor = useScheduleEditor({
    disciplines,
    setDisciplines,
    filterProfile: adminFilters.filterProfile,
    setView,
    setDisciplinesList,
    setGradeTitle,
    setErrorMsg,
    courseName: courseManager.courseName,
    selectedCourseId: courseManager.selectedCourseId,
    scheduleTitle: courseManager.scheduleTitle
  });

  const updateCatalog: React.Dispatch<React.SetStateAction<CurriculumSubject[]>> = update => {
    const next = typeof update === 'function' ? update(curriculumSubjects) : update;
    const normalized = syncCatalog(next, extractedTreeSubjects);
    setCurriculumSubjects(normalized.subjects);
    setExtractedTreeSubjects(normalized.nodes);
  };

  // 4. Curriculum Editor Hook
  const curriculumEditor = useCurriculumEditor({
    curriculumSubjects,
    setCurriculumSubjects: updateCatalog,
    filterProfile: adminFilters.filterProfile
  });

  // 5. Tree Editor Hook
  const treeEditor = useTreeEditor({
    extractedTreeSubjects,
    setExtractedTreeSubjects,
    curriculumSubjects,
    setCurriculumSubjects,
    extractedProfile
  });

  // 6. Profile Manager Hook
  const profileManager = useProfileManager({
    courseProfiles,
    setCourseProfiles,
    extractedProfile,
    setExtractedProfile,
    extractedTreeSubjects,
    setExtractedTreeSubjects,
    curriculumSubjects,
    setCurriculumSubjects,
    filterProfile: adminFilters.filterProfile,
    setFilterProfile: adminFilters.setFilterProfile,
    setSuccessMsg
  });

  // 7. JSON Import & Export Hook
  const jsonImportExport = useJsonImportExport({
    activeMode,
    curriculumExtractType,
    selectedSubStepId,
    disciplines,
    setDisciplines,
    curriculumSubjects,
    setCurriculumSubjects,
    extractedTreeSubjects,
    setExtractedTreeSubjects,
    courseProfiles,
    setCourseProfiles,
    courseRequirements,
    setCourseRequirements,
    extractedProfile,
    setExtractedProfile,
    courseName: courseManager.courseName,
    setCourseName: courseManager.setCourseName,
    courseShortName: courseManager.courseShortName,
    setCourseShortName: courseManager.setCourseShortName,
    selectedCourseId: courseManager.selectedCourseId,
    isCreatingNewCourse: courseManager.isCreatingNewCourse,
    scheduleSemester: courseManager.scheduleSemester,
    setScheduleSemester: courseManager.setScheduleSemester,
    setScheduleTitle: courseManager.setScheduleTitle,
    setDetectedDifferentCourse: courseManager.setDetectedDifferentCourse,
    setErrorMsg,
    setSuccessMsg,
    setReviewTab: () => {},
    cleanCourseTitle: courseManager.cleanCourseTitle,
    generateShortName: courseManager.generateShortName,
    resolveTreePrerequisiteReferences: treeEditor.resolveTreePrerequisiteReferences
  });

  // Schema Validation Check
  const schemaValidation = useMemo(() => {
    const issues: string[] = [];

    if (activeMode === 'curriculum') {
      if (curriculumSubjects.length === 0) {
        issues.push("A lista de disciplinas do currículo está vazia.");
      }
      curriculumSubjects.forEach((sub, i) => {
        if (!sub.code) issues.push(`Disciplina #${i + 1} (${sub.name || 'Sem nome'}) não possui código.`);
        if (!sub.name) issues.push(`Disciplina #${i + 1} não possui nome.`);
        if (!sub.workload || typeof sub.workload.total !== 'number') {
          issues.push(`Disciplina #${i + 1} (${sub.name}) não possui carga horária total válida.`);
        }
      });
    } else {
      if (disciplines.length === 0) {
        issues.push("A lista de horários letivos está vazia.");
      }
      disciplines.forEach((disc, i) => {
        if (!disc.name) issues.push(`Turma #${i + 1} não possui nome.`);
        if (!disc.sessions || disc.sessions.length === 0) {
          issues.push(`Turma '${disc.name}' não possui sessões de aula cadastradas.`);
        }
      });
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }, [activeMode, curriculumSubjects, disciplines]);

  // Synchronize SubStep ID when mode changes
  useEffect(() => {
    if (activeMode === 'schedule') {
      setSelectedSubStepId('schedule_chunk');
    } else if (curriculumExtractType === 'linear') {
      setSelectedSubStepId('linear_step1');
    } else {
      setSelectedSubStepId('tree_chunk');
    }
  }, [activeMode, curriculumExtractType]);

  // Keyboard shortcut: Escape closes open modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (scheduleEditor.editingSchedIndex !== null) scheduleEditor.setEditingSchedIndex(null);
        if (curriculumEditor.editingCurrIndex !== null) curriculumEditor.setEditingCurrIndex(null);
        if (treeEditor.editingTreeNodeIndex !== null) treeEditor.setEditingTreeNodeIndex(null);
        if (profileManager.isEditingProfileMeta) profileManager.setIsEditingProfileMeta(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    scheduleEditor.editingSchedIndex,
    curriculumEditor.editingCurrIndex,
    treeEditor.editingTreeNodeIndex,
    profileManager.isEditingProfileMeta
  ]);

  const curricularData = serializeCurriculum(curriculumSubjects, extractedTreeSubjects, courseProfiles);
  const snapshots: Record<SaveDomain, string> = {
    settings: JSON.stringify({ name: courseManager.courseName, shortName: courseManager.courseShortName, visibility }),
    curriculum: JSON.stringify({ ...curricularData, requisitos: courseRequirements }),
    schedule: JSON.stringify({ semester: courseManager.scheduleSemester, disciplines }),
  };
  const dirty: Record<SaveDomain, boolean> = {
    settings: courseManager.isCreatingNewCourse || !!baseline && baseline.settings !== snapshots.settings,
    curriculum: !!baseline && baseline.curriculum !== snapshots.curriculum,
    schedule: !!baseline && baseline.schedule !== snapshots.schedule,
  };
  const saveDomain: SaveDomain = section === 'settings' ? 'settings' : activeMode === 'schedule' ? 'schedule' : 'curriculum';
  const busy = isSaving || isLoadingSemester || courseManager.isLoadingCourse;
  const currentMeta = courseManager.courses.find(course => course.id === courseManager.selectedCourseId);
  const sectionInfo = ADMIN_SECTIONS.find(item => item.id === section)!;

  useEffect(() => {
    if (!courseManager.loadedVersion) return;
    setBaseline(snapshots);
    jsonImportExport.setPastedJsonText('');
    jsonImportExport.setValidationResult(null);
    setSection(courseManager.courses.length === 0 ? 'settings' : readAdminSection(courseManager.selectedCourseId));
    adminFilters.resetFilters();
  }, [courseManager.loadedVersion]);

  useEffect(() => {
    jsonImportExport.setExtractionReport(reports[activeMode]);
  }, [activeMode, reports]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (Object.values(dirty).some(Boolean)) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [snapshots.settings, snapshots.curriculum, snapshots.schedule, baseline]);

  const navigate = (next: AdminSection) => {
    setSection(next);
    if (next === 'structure') setReviewTab('tree');
    else if (next === 'import') setReviewTab('json');
    else setReviewTab('table');
    try { localStorage.setItem(`admin_section_${courseManager.selectedCourseId}`, next); } catch {}
    contentAreaRef.current?.scrollTo({ top: 0 });
    requestAnimationFrame(() => document.getElementById('admin-section-title')?.focus());
  };
  const guardNavigation = (action: () => void, domains: SaveDomain[] = ['settings', 'curriculum', 'schedule']) => {
    const pending = domains.filter(domain => dirty[domain]);
    if (pending.length) setPendingNavigation({ action, domains: pending });
    else action();
  };

  const selectCourse = (id: string) => guardNavigation(() => {
    semesterLoadVersion.current++;
    courseManager.courseLoadVersion.current++;
    setBaseline(null);
    if (id === '__new__') {
      courseManager.setIsCreatingNewCourse(true);
      courseManager.setIsLoadingCourse(false);
      courseManager.setCourseName('Novo Curso Acadêmico');
      courseManager.setCourseShortName('NOVO');
      courseManager.setScheduleSemester('');
      setCurriculumSubjects([]); setExtractedTreeSubjects([]); setCourseProfiles([]); setExtractedProfile(null); setCourseRequirements(null); setDisciplines([]);
      setVisibility({ hidden: false, showSchedule: true, showDisciplines: true, showMatriz: true, visibleSemesters: [] });
      setReports({ curriculum: null, schedule: null });
      navigate('settings');
    } else {
      courseManager.setIsCreatingNewCourse(false);
      courseManager.setSelectedCourseId(id);
      if (id === courseManager.selectedCourseId) void courseManager.loadCourseData(id);
    }
    jsonImportExport.setPastedJsonText('');
    setErrorMsg(null); setSuccessMsg(null);
  });

  const loadSemester = async (semester: string) => {
    if (!/^\d{4}\.[12]$/.test(semester)) { setErrorMsg('Use AAAA.1 ou AAAA.2 para o semestre.'); return; }
    const version = ++semesterLoadVersion.current;
    setIsLoadingSemester(true); setErrorMsg(null);
    try {
      const response = await apiFetch(`/api/courses/${courseManager.selectedCourseId}?semester=${encodeURIComponent(semester)}&strict=true`);
      if (!response.ok) throw new Error('Não foi possível carregar a oferta.');
      const data = await response.json();
      if (version !== semesterLoadVersion.current) return;
      const next: Discipline[] = data.schedule || [];
      setDisciplines(next);
      courseManager.setScheduleSemester(semester);
      courseManager.setScheduleTitle(`${courseManager.courseName} - Horário ${semester}`);
      setReports(previous => ({ ...previous, schedule: data.scheduleExtraction || null }));
      setBaseline(previous => previous && ({ ...previous, schedule: JSON.stringify({ semester, disciplines: next }) }));
      setNewSemester('');
      setSuccessMsg(data.resolvedSemester ? `Oferta de ${semester} carregada.` : `Nenhuma oferta em ${semester}. Cadastre turmas ou importe os horários.`);
    } catch (error: any) { setErrorMsg(error.message); }
    finally { if (version === semesterLoadVersion.current) setIsLoadingSemester(false); }
  };

  const handleSaveToProject = async (domain: SaveDomain = saveDomain): Promise<boolean> => {
    setErrorMsg(null); setSuccessMsg(null);
    const name = courseManager.courseName.trim();
    const shortName = courseManager.courseShortName.trim();
    if (!name || !shortName) { setErrorMsg('Informe nome e sigla do curso em Configurações.'); return false; }
    if (courseManager.isCreatingNewCourse && domain !== 'settings') { setErrorMsg('Salve as configurações do novo curso primeiro.'); return false; }
    if (domain === 'schedule' && !/^\d{4}\.[12]$/.test(courseManager.scheduleSemester)) { setErrorMsg('Selecione um semestre válido antes de salvar a oferta.'); return false; }
    const id = courseManager.isCreatingNewCourse ? name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : courseManager.selectedCourseId;
    if (!id || (courseManager.isCreatingNewCourse && courseManager.courses.some(course => course.id === id))) { setErrorMsg('Já existe um curso com este identificador ou o nome é inválido.'); return false; }
    const request = async (url: string, method: string, body: unknown) => {
      const response = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error([data.error || 'Falha ao salvar.', ...(data.issues || []).map((issue: ExtractionIssue) => `${issue.record}: ${issue.message}`)].join(' '));
      return data;
    };
    setIsSaving(true);
    try {
      if (domain === 'settings') {
        if (courseManager.isCreatingNewCourse) {
          await request('/api/courses', 'POST', { id, name, shortName });
          courseManager.skipNextCourseLoad.current = true;
          courseManager.setIsCreatingNewCourse(false); courseManager.setSelectedCourseId(id); setLoadedCourseId(id);
        } else await request(`/api/courses/${id}/metadata`, 'PATCH', { name, shortName });
        // A partial failure keeps only visibility changes pending.
        setBaseline(previous => ({ ...(previous || snapshots), settings: JSON.stringify({ name, shortName, visibility: previous ? JSON.parse(previous.settings).visibility : {} }) }));
        courseManager.setCourses(previous => previous.map(course => course.id === id ? { ...course, name, shortName } : course));
        try { await request(`/api/courses/${id}/visibility`, 'PATCH', visibility); }
        catch (error: any) { throw new Error(`Nome e sigla salvos. Visibilidade pendente: ${error.message}`); }
      } else {
        const curriculum = { ...curricularData, requisitos: courseRequirements || undefined, activeProfileId: extractedProfile?.id || courseProfiles[0]?.id, courseName: currentMeta?.name || name, courseShortName: currentMeta?.shortName || shortName, extraction: reports.curriculum };
        const schedule = disciplines.map(discipline => ({ ...discipline, semester: courseManager.scheduleSemester }));
        const issues = domain === 'curriculum' ? [...validateExtraction(curriculum.subjects, 'linear'), ...validateExtraction(curriculum.treeSubjects, 'tree')] : validateExtraction(schedule, 'schedule');
        const errors = issues.filter(issue => issue.severity === 'error');
        if (errors.length) throw new Error(errors.map(issue => `${issue.record}: ${issue.message}`).join(' | '));
        await request('/api/courses', 'POST', { id, name: currentMeta?.name || name, shortName: currentMeta?.shortName || shortName,
          ...(domain === 'curriculum' ? { curriculum } : { schedule, semester: courseManager.scheduleSemester, scheduleExtraction: reports.schedule }) });
      }
      setBaseline(previous => ({ ...(previous || snapshots), [domain]: snapshots[domain] }));
      await courseManager.fetchCoursesList();
      setSuccessMsg(domain === 'settings' ? 'Configurações salvas.' : domain === 'schedule' ? `Oferta de ${courseManager.scheduleSemester} salva.` : 'Currículo salvo: disciplinas, perfis e estrutura.');
      return true;
    } catch (error: any) { setErrorMsg(error.message || 'Falha ao salvar. O rascunho foi preservado.'); return false; }
    finally { setIsSaving(false); }
  };

  const requestDeleteSubject = (index: number) => {
    const subject = curriculumSubjects[index];
    const dependents = dependentNodes(extractedTreeSubjects, new Set([subject.id || '']));
    if (dependents.length) { setErrorMsg(`Remova primeiro os vínculos em Estrutura: ${dependents.map(node => node.name).join(', ')}.`); return; }
    if (window.confirm(`Excluir ${subject.code || ''} — ${subject.name} do currículo? Ofertas históricas serão preservadas.`)) updateCatalog(curriculumSubjects.filter((_, position) => position !== index));
  };
  const requestDeleteProfile = (profile: CurriculumProfile) => {
    const removed = new Set<string>(extractedTreeSubjects.filter(node => node.profile === profile.id).map(node => node.id));
    const dependents = dependentNodes(extractedTreeSubjects, removed);
    if (dependents.length) { setErrorMsg(`O perfil é referenciado por: ${dependents.map(node => node.name).join(', ')}. Remova esses vínculos antes de excluir.`); return; }
    profileManager.setProfilePendingDelete(profile);
  };

  const semesterControls = (<div className="admin-panel flex flex-wrap items-end gap-4">
            <label className="text-sm">Semestre letivo<select aria-label="Semestre letivo" className="admin-input mt-2" value={courseManager.scheduleSemester} onChange={e => guardNavigation(() => void loadSemester(e.target.value), ['schedule'])}><option value="" disabled>Selecione um semestre</option>{Array.from(new Set([...(currentMeta?.semesters || []), courseManager.scheduleSemester].filter(Boolean))).sort().map(semester => <option key={semester} value={semester}>{semester}</option>)}</select></label>
            <label className="text-sm">Novo semestre<input aria-label="Novo semestre" placeholder="AAAA.1 ou AAAA.2" className="admin-input mt-2 w-40" value={newSemester} onChange={e => setNewSemester(e.target.value)} /></label>
            <button className="admin-primary" disabled={courseManager.isCreatingNewCourse} onClick={() => guardNavigation(() => void loadSemester(newSemester), ['schedule'])}>Abrir semestre</button>
            <span className="text-sm text-slate-500 ml-auto">{disciplines.length} turmas · {disciplines.reduce((sum, discipline) => sum + discipline.sessions.length, 0)} encontros</span>
          </div>);

  const reviewPanel = (<ReviewTabs
            section={section as 'schedule' | 'catalog' | 'structure' | 'import'}
            resultRef={resultRef}
            reviewTab={section === 'structure' ? 'tree' : section === 'import' ? 'json' : section === 'catalog' ? 'table' : reviewTab === 'visual' ? 'visual' : 'table'}
            setReviewTab={setReviewTab}
            activeMode={activeMode}
            extractedTreeSubjects={extractedTreeSubjects}
            schemaValidation={schemaValidation}
            searchFilter={adminFilters.searchFilter}
            setSearchFilter={adminFilters.setSearchFilter}
            activeProfiles={adminFilters.activeProfiles}
            filterProfile={adminFilters.filterProfile}
            setFilterProfile={profile => { adminFilters.setFilterProfile(profile); if (activeMode === 'curriculum') setExtractedProfile(courseProfiles.find(item => item.id === profile) || null); }}
            filterPeriod={adminFilters.filterPeriod}
            setFilterPeriod={adminFilters.setFilterPeriod}
            onAddBlankItem={
              activeMode === 'curriculum'
                ? curriculumEditor.handleAddBlankCurriculumSubject
                : scheduleEditor.handleAddBlankScheduleDiscipline
            }
            curriculumSubjects={curriculumSubjects}
            filteredCurriculum={adminFilters.filteredCurriculum}
            disciplines={disciplines}
            filteredSchedule={adminFilters.filteredSchedule}
            days={DAYS}
            onStartEditCurriculum={curriculumEditor.handleStartEditCurriculum}
            onDeleteCurriculumItem={requestDeleteSubject}
            onStartEditSchedule={scheduleEditor.handleStartEditSchedule}
            onDeleteScheduleItem={scheduleEditor.handleDeleteScheduleItem}
            courseProfiles={courseProfiles}
            extractedProfile={extractedProfile}
            onSelectProfileToReview={profileManager.handleSelectProfileToReview}
            onAddNewProfile={profileManager.handleAddNewProfile}
            onRequestDeleteProfile={requestDeleteProfile}
            onStartEditProfileMeta={profileManager.handleStartEditProfileMeta}
            selectedTreePeriod={treeEditor.selectedTreePeriod}
            setSelectedTreePeriod={treeEditor.setSelectedTreePeriod}
            treeSearch={treeEditor.treeSearch}
            setTreeSearch={treeEditor.setTreeSearch}
            onAddBlankTreeNode={() => { navigate('catalog'); curriculumEditor.handleAddBlankCurriculumSubject(); }}
            onOpenMatrizView={() => guardNavigation(() => setView('matriz'))}
            onStartEditTreeNode={treeEditor.handleStartEditTreeNode}
            onDeleteTreeNode={index => { const node = extractedTreeSubjects[index]; const subjectIndex = curriculumSubjects.findIndex(subject => subject.id === node.id); if (subjectIndex >= 0) requestDeleteSubject(subjectIndex); }}
            selectedPreviewPeriod={selectedPreviewPeriod}
            setSelectedPreviewPeriod={setSelectedPreviewPeriod}
            availableTimeSlots={scheduleEditor.availableTimeSlots}
            copied={jsonImportExport.copied}
            onCopyJson={jsonImportExport.handleCopyJson}
            onApplyJsonEdit={jsonImportExport.handleApplyJsonEdit}
            jsonError={jsonImportExport.jsonError}
            jsonText={jsonImportExport.jsonText}
            setJsonText={jsonImportExport.setJsonText}
          />);

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex min-w-[1100px] overflow-hidden font-sans">
      {/* MODAL 1: EDIT CURRICULUM SUBJECT */}
      {curriculumEditor.editingCurrIndex !== null && (
        <CurriculumEditModal
          onEditStructure={() => { curriculumEditor.setEditingCurrIndex(null); navigate('structure'); }}
          editCurrCode={curriculumEditor.editCurrCode}
          setEditCurrCode={curriculumEditor.setEditCurrCode}
          editCurrName={curriculumEditor.editCurrName}
          setEditCurrName={curriculumEditor.setEditCurrName}
          editCurrPeriod={curriculumEditor.editCurrPeriod}
          setEditCurrPeriod={curriculumEditor.setEditCurrPeriod}
          editCurrProfile={curriculumEditor.editCurrProfile}
          setEditCurrProfile={curriculumEditor.setEditCurrProfile}
          editCurrType={curriculumEditor.editCurrType}
          setEditCurrType={curriculumEditor.setEditCurrType}
          editCurrCredits={curriculumEditor.editCurrCredits}
          setEditCurrCredits={curriculumEditor.setEditCurrCredits}
          editCurrTeorica={curriculumEditor.editCurrTeorica}
          setEditCurrTeorica={curriculumEditor.setEditCurrTeorica}
          editCurrPratica={curriculumEditor.editCurrPratica}
          setEditCurrPratica={curriculumEditor.setEditCurrPratica}
          editCurrExtensao={curriculumEditor.editCurrExtensao}
          setEditCurrExtensao={curriculumEditor.setEditCurrExtensao}
          editCurrTotal={curriculumEditor.editCurrTotal}
          setEditCurrTotal={curriculumEditor.setEditCurrTotal}
          editCurrEmenta={curriculumEditor.editCurrEmenta}
          setEditCurrEmenta={curriculumEditor.setEditCurrEmenta}
          editCurrPrereqs={curriculumEditor.editCurrPrereqs}
          newPrereqCode={curriculumEditor.newPrereqCode}
          setNewPrereqCode={curriculumEditor.setNewPrereqCode}
          newPrereqName={curriculumEditor.newPrereqName}
          setNewPrereqName={curriculumEditor.setNewPrereqName}
          onAddPrereq={curriculumEditor.handleAddPrereqToCurriculumEdit}
          onRemovePrereq={curriculumEditor.handleRemovePrereqFromCurriculumEdit}
          onSave={() => { try { curriculumEditor.handleSaveCurriculumEdit(); } catch (error: any) { setErrorMsg(error.message); } }}
          onClose={() => curriculumEditor.setEditingCurrIndex(null)}
        />
      )}

      {/* MODAL 2: EDIT SCHEDULE DISCIPLINE */}
      {scheduleEditor.editingSchedIndex !== null && (
        <ScheduleEditModal
          editSchedCode={scheduleEditor.editSchedCode}
          setEditSchedCode={scheduleEditor.setEditSchedCode}
          editSchedName={scheduleEditor.editSchedName}
          setEditSchedName={scheduleEditor.setEditSchedName}
          editSchedPeriod={scheduleEditor.editSchedPeriod}
          setEditSchedPeriod={scheduleEditor.setEditSchedPeriod}
          editSchedProfile={scheduleEditor.editSchedProfile}
          setEditSchedProfile={scheduleEditor.setEditSchedProfile}
          editSchedProfessor={scheduleEditor.editSchedProfessor}
          setEditSchedProfessor={scheduleEditor.setEditSchedProfessor}
          editSchedSessions={scheduleEditor.editSchedSessions}
          newSessionDay={scheduleEditor.newSessionDay}
          setNewSessionDay={scheduleEditor.setNewSessionDay}
          newSessionTime={scheduleEditor.newSessionTime}
          setNewSessionTime={scheduleEditor.setNewSessionTime}
          isCustomTimeInput={scheduleEditor.isCustomTimeInput}
          setIsCustomTimeInput={scheduleEditor.setIsCustomTimeInput}
          customTimeValue={scheduleEditor.customTimeValue}
          setCustomTimeValue={scheduleEditor.setCustomTimeValue}
          availableTimeSlots={scheduleEditor.availableTimeSlots}
          DAYS={DAYS}
          onAddSession={scheduleEditor.handleAddSessionToScheduleEdit}
          onRemoveSession={scheduleEditor.handleRemoveSessionFromScheduleEdit}
          onSave={scheduleEditor.handleSaveScheduleEdit}
          onClose={() => scheduleEditor.setEditingSchedIndex(null)}
        />
      )}

      {/* MODAL 3: EDIT TREE SUBJECT NODE */}
      {treeEditor.editingTreeNodeIndex !== null && treeEditor.editTreeNode && (
        <TreeNodeEditModal
          onEditCatalog={() => { const node = treeEditor.editTreeNode!; treeEditor.setEditingTreeNodeIndex(null); navigate('catalog'); const index = curriculumSubjects.findIndex(subject => subject.id === node.id); if (index >= 0) curriculumEditor.handleStartEditCurriculum(index, curriculumSubjects[index]); }}
          editTreeNode={treeEditor.editTreeNode}
          setEditTreeNode={treeEditor.setEditTreeNode}
          extractedTreeSubjects={extractedTreeSubjects}
          onAddPrereq={treeEditor.handleAddPrereqToTreeNode}
          onRemovePrereq={treeEditor.handleRemovePrereqFromTreeNode}
          onSave={treeEditor.handleSaveTreeNodeEdit}
          onClose={() => treeEditor.setEditingTreeNodeIndex(null)}
        />
      )}

      {/* MODAL 4: EDIT PROFILE METADATA */}
      {profileManager.isEditingProfileMeta && profileManager.editProfileMeta && (
        <ProfileMetaEditModal
          editProfileMeta={profileManager.editProfileMeta}
          setEditProfileMeta={profileManager.setEditProfileMeta}
          onSave={() => {
            const edited = profileManager.editProfileMeta!;
            const originalId = extractedProfile?.id;
            if (!edited.id.trim() || courseProfiles.some(profile => profile.id === edited.id && profile.id !== originalId)) { setErrorMsg('ID de perfil vazio ou duplicado.'); return; }
            if (edited.validFromSemester && !/^\d{4}\.[12]$/.test(edited.validFromSemester)) { setErrorMsg('Vigência inválida. Use AAAA.1 ou AAAA.2.'); return; }
            if ([edited.totalHours, edited.acexHours, edited.accHours, edited.optativeHours, edited.mandatoryHours].some(value => value != null && (!Number.isInteger(value) || value < 0))) { setErrorMsg('Cargas horárias devem ser números inteiros não negativos.'); return; }
            setCourseProfiles(previous => previous.map(profile => profile.id === originalId ? edited : profile));
            setExtractedProfile(edited);
            setCurriculumSubjects(previous => previous.map(subject => subject.profile === originalId ? { ...subject, profile: edited.id } : subject));
            setExtractedTreeSubjects(previous => previous.map(node => node.profile === originalId ? { ...node, profile: edited.id } : node));
            adminFilters.setFilterProfile(edited.id);
            profileManager.setIsEditingProfileMeta(false);
          }}
          onClose={() => profileManager.setIsEditingProfileMeta(false)}
        />
      )}

      {/* MODAL 5: CONFIRM DELETE PROFILE */}
      {profileManager.profilePendingDelete && (
        <DeleteConfirmModal
          title="Excluir Perfil Curricular"
          subtitle={`Perfil ${profileManager.profilePendingDelete.id}`}
          description={
            <>
              Tem certeza que deseja excluir o perfil <strong>{profileManager.profilePendingDelete.id} ({profileManager.profilePendingDelete.name || 'Sem nome'})</strong>? {curriculumSubjects.filter(subject => subject.profile === profileManager.profilePendingDelete?.id).length} disciplinas serão removidas do currículo. As ofertas históricas serão preservadas.
            </>
          }
          confirmLabel="Sim, Excluir Perfil"
          onConfirm={profileManager.handleConfirmDeleteProfile}
          onCancel={() => profileManager.setProfilePendingDelete(null)}
        />
      )}

      {/* MODAL 6: CONFIRM DELETE ACTIVE COURSE */}
      {courseManager.showDeleteCourseModal && (
        <DeleteConfirmModal
          title="Excluir Curso Ativo"
          subtitle="Esta ação é irreversível"
          description={
            <>
              Tem certeza que deseja excluir o curso <strong>{courseManager.courseName} ({courseManager.courseShortName})</strong>? Todas as disciplinas cadastradas, horários letivos e arquivos deste curso serão permanentemente removidos.
            </>
          }
          confirmLabel="Sim, Excluir Curso"
          isDeleting={courseManager.isDeletingCourse}
          onConfirm={courseManager.handleDeleteActiveCourse}
          onCancel={() => courseManager.setShowDeleteCourseModal(false)}
        />
      )}

      {pendingNavigation && <UnsavedChangesDialog busy={isSaving} onCancel={() => setPendingNavigation(null)} onDiscard={() => { const action = pendingNavigation.action; setPendingNavigation(null); action(); }} onSave={async () => {
        for (const domain of pendingNavigation.domains) { if (!(await handleSaveToProject(domain))) { setPendingNavigation(null); return; } }
        const action = pendingNavigation.action; setPendingNavigation(null); action();
      }} />}
      <AdminSidebar courses={courseManager.courses} courseId={courseManager.selectedCourseId} creating={courseManager.isCreatingNewCourse} section={section} dirty={dirty} disabled={busy} onCourse={selectCourse} onSection={navigate} onBack={() => guardNavigation(() => setView('home'))} />
      <div className="flex-1 min-w-0 flex flex-col">
      <AdminTopBar title={sectionInfo.label} description={sectionInfo.description} context={section === 'migration' ? 'Arquivos acadêmicos · Supabase' : `${courseManager.courseShortName} · ${courseManager.courseName}`} saveLabel={saveDomain === 'settings' ? 'Salvar configurações' : saveDomain === 'schedule' ? `Salvar oferta${courseManager.scheduleSemester ? ' de ' + courseManager.scheduleSemester : ''}` : 'Salvar currículo'} dirty={section === 'migration' ? false : dirty[saveDomain]} busy={section === 'migration' ? false : busy || (!courseManager.isCreatingNewCourse && loadedCourseId !== courseManager.selectedCourseId)} onExportJsonFile={section === 'settings' || section === 'migration' ? undefined : jsonImportExport.handleExportJsonFile} onSaveToProject={section === 'migration' ? undefined : () => void handleSaveToProject()} />
      <main ref={contentAreaRef} aria-labelledby="admin-section-title" className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Notifications and Banners */}
        {section !== 'migration' && <NotificationBanners
          extractionReport={section === 'import' ? jsonImportExport.extractionReport : null}
          activeMode={activeMode}
          disciplines={disciplines}
          curriculumSubjects={curriculumSubjects}
          scheduleSemester={courseManager.scheduleSemester}
          setScheduleSemester={courseManager.setScheduleSemester}
          errorMsg={errorMsg}
          successMsg={successMsg}
          detectedDifferentCourse={courseManager.detectedDifferentCourse}
          courseName={courseManager.courseName}
          courseShortName={courseManager.courseShortName}
          onAcceptDifferentCourse={() => selectCourse('__new__')}
          onDismissDifferentCourse={() => courseManager.setDetectedDifferentCourse(null)}
        />}

        {section !== 'migration' && courseManager.isLoadingCourse && <p role="status">Carregando curso…</p>}
        {section !== 'migration' && !courseManager.isLoadingCourse && !courseManager.isCreatingNewCourse && loadedCourseId !== courseManager.selectedCourseId && <button className="admin-primary" onClick={() => void courseManager.loadCourseData(courseManager.selectedCourseId)}>Tentar carregar novamente</button>}
        <fieldset disabled={busy} hidden={!courseManager.isCreatingNewCourse && loadedCourseId !== courseManager.selectedCourseId} className="space-y-6 min-w-0 disabled:opacity-60">
          {section === 'settings' && <CourseSettings name={courseManager.courseName} shortName={courseManager.courseShortName} visibility={visibility} semesters={currentMeta?.semesters || []} creating={courseManager.isCreatingNewCourse} onName={courseManager.setCourseName} onShortName={courseManager.setCourseShortName} onVisibility={setVisibility} onDelete={() => courseManager.setShowDeleteCourseModal(true)} />}
          {section === 'profiles' && <ProfileSection profiles={courseProfiles} nodes={extractedTreeSubjects} onAdd={profileManager.handleAddNewProfile} onEdit={profile => { setExtractedProfile(profile); profileManager.setEditProfileMeta({ ...profile }); profileManager.setIsEditingProfileMeta(true); }} onDelete={requestDeleteProfile} onStructure={id => { profileManager.handleSelectProfileToReview(id); navigate('structure'); }} />}
          {section === 'structure' && <div className="admin-panel flex items-center gap-4"><label htmlFor="admin-profile" className="text-sm font-medium">Perfil curricular</label><select id="admin-profile" className="admin-input max-w-xs" value={extractedProfile?.id || ''} onChange={e => profileManager.handleSelectProfileToReview(e.target.value)}><option value="">Todos os perfis / sem perfil</option>{courseProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.id} · {profile.name}</option>)}</select><span className="text-xs text-slate-500">Alterações fazem parte do currículo compartilhado.</span></div>}
          {section === 'schedule' && semesterControls}
          {section === 'import' && <>

          {/* SECTION 2: AI Import via Prompt & JSON */}
          <ImportSection
            destination={`${courseManager.courseShortName} · ${importMode === 'schedule' ? courseManager.scheduleSemester || 'Semestre não selecionado' : 'Currículo completo'}`}
            destinationReady={!courseManager.isCreatingNewCourse && (importMode === 'curriculum' || /^\d{4}\.[12]$/.test(courseManager.scheduleSemester))}
            destinationControls={<div className="space-y-4">
              {courseManager.isCreatingNewCourse && <p className="text-sm text-amber-700">Salve o novo curso em Configurações antes de importar.</p>}
              <label htmlFor="import-destination" className="block text-sm font-medium">O que você quer importar?</label>
              <select id="import-destination" className="admin-input" value={importMode} onChange={e => setImportMode(e.target.value as 'schedule' | 'curriculum')}><option value="schedule">Oferta semestral — turmas e horários</option><option value="curriculum">Currículo — disciplinas, estrutura e cargas horárias</option></select>
              {importMode === 'schedule' ? semesterControls : <label className="block text-sm">Perfil para registros sem perfil<select aria-label="Perfil de destino da importação" className="admin-input mt-2" value={extractedProfile?.id || ''} onChange={e => profileManager.handleSelectProfileToReview(e.target.value)}><option value="">Manter sem perfil</option>{courseProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.id} · {profile.name}</option>)}</select><span className="block text-xs text-slate-500 mt-2">Perfis informados no JSON serão respeitados. A substituição abrange o currículo completo.</span></label>}
            </div>}
            hasPreview={!!jsonImportExport.pendingImport}
            applied={successMsg?.startsWith('Importação aplicada') || false}
            onOpenDestination={() => navigate(importMode === 'schedule' ? 'schedule' : curriculumExtractType === 'tree' ? 'structure' : 'catalog')}
            advancedContent={reviewPanel}
            reviewContent={jsonImportExport.pendingImport && <ImportPreview changes={jsonImportExport.pendingImport.changes} replacing={jsonImportExport.pendingImport.mode === 'replace'} destination={`${courseManager.courseShortName} · ${importMode === 'schedule' ? courseManager.scheduleSemester : 'Currículo completo'}`} onApply={jsonImportExport.applyPendingImport} onCancel={jsonImportExport.discardPendingImport} />}
            activeMode={activeMode}
            curriculumExtractType={curriculumExtractType}
            setCurriculumExtractType={setCurriculumExtractType}
            selectedSubStepId={selectedSubStepId}
            setSelectedSubStepId={setSelectedSubStepId}
            basePromptDef={jsonImportExport.basePromptDef}
            activeSubStep={jsonImportExport.activeSubStep}
            currentPrompt={jsonImportExport.currentPrompt}
            currentPromptText={jsonImportExport.currentPromptText}
            isCourseHoursStep={jsonImportExport.isCourseHoursStep}
            isPromptExpanded={jsonImportExport.isPromptExpanded}
            setIsPromptExpanded={jsonImportExport.setIsPromptExpanded}
            copyFeedback={jsonImportExport.copyFeedback}
            onCopyPrompt={jsonImportExport.handleCopyPrompt}
            pastedJsonText={jsonImportExport.pastedJsonText}
            setPastedJsonText={jsonImportExport.setPastedJsonText}
            onPasteFromClipboard={jsonImportExport.handlePasteFromClipboard}
            jsonFileInputRef={jsonImportExport.jsonFileInputRef}
            onUploadJsonFile={jsonImportExport.handleUploadJsonFile}
            validationResult={jsonImportExport.validationResult}
            setValidationResult={jsonImportExport.setValidationResult}
            onValidateAndApply={jsonImportExport.handleValidateAndApplyJson}
            disciplinesCount={disciplines.length}
            curriculumCount={curriculumSubjects.length}
            treeCount={extractedTreeSubjects.length}
            displayedCourseHours={jsonImportExport.displayedCourseHours}
            displayedHoursProfile={jsonImportExport.displayedHoursProfile}
            formatCourseHours={jsonImportExport.formatCourseHours}
            lastMergeStats={jsonImportExport.lastMergeStats}
            onClearData={() => {}}
            onSaveToProject={() => void handleSaveToProject()}
          />

          </>}
          {(['schedule', 'catalog', 'structure'] as string[]).includes(section) && <>
          {/* SECTION 3: Review & Manipulation (Table, Tree, Visual Grid, JSON) */}
          {reviewPanel}
          </>}

        </fieldset>
        {section === 'migration' && <DataMigration />}
      </main>
      </div>
    </div>
  );
}
