import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, BrainCircuit, Sparkles, Loader2, Save, Trash2, 
  Plus, Edit3, Check, X, FileJson, ArrowRightLeft, BookOpen, AlertCircle,
  Copy, Download, Calendar, UploadCloud, FileText, CheckCircle,
  Code, Search, RefreshCw, Network, GitFork, Image as ImageIcon, Layers, Tag
} from 'lucide-react';
import { Discipline, Session, DayOfWeek, CurriculumSubject, CourseMeta, CurriculumProfile, TreeSubjectNode } from '../types';
import { DAYS, TIMESLOTS } from '../constants';

interface AdminViewProps {
  setView: (view: 'home' | 'schedule' | 'matriz' | 'disciplines' | 'admin') => void;
  setDisciplinesList: (disciplines: Discipline[]) => void;
  setGradeTitle: (title: string) => void;
}

type Mode = 'curriculum' | 'schedule';
type InputMode = 'pdf' | 'text';
type ReviewTab = 'table' | 'visual' | 'tree' | 'json';

function formatAiErrorMessage(rawError: string, currentModel: string): string {
  if (!rawError) return "Erro desconhecido ao processar com IA.";
  let msg = rawError;
  try {
    if (typeof msg === 'string' && msg.trim().startsWith('{')) {
      const parsed = JSON.parse(msg);
      if (parsed.error) {
        msg = typeof parsed.error === 'object' ? (parsed.error.message || JSON.stringify(parsed.error)) : parsed.error;
      }
    }
  } catch {}

  const lower = msg.toLowerCase();
  if (lower.includes('503') || lower.includes('high demand') || lower.includes('unavailable')) {
    return `O modelo ${currentModel} está enfrentando alta demanda temporária nos servidores do Google (Erro 503 - High Demand). Recomendamos usar o Gemini 3.6 Flash, que está disponível e responde com rapidez.`;
  }
  if (lower.includes('429') || lower.includes('quota') || lower.includes('resource_exhausted')) {
    return `Limite de cota atingido na sua chave do Gemini para o modelo ${currentModel} (Erro 429). Experimente o Gemini 3.6 Flash ou aguarde um momento.`;
  }
  if (lower.includes('404') || lower.includes('not found')) {
    return `O modelo ${currentModel} não está disponível ou foi descontinuado pelo Google. Selecione o Gemini 3.6 Flash.`;
  }
  return msg;
}

export function AdminView({ setView, setDisciplinesList, setGradeTitle }: AdminViewProps) {
  // Course Selector State
  const [courses, setCourses] = useState<CourseMeta[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('bcc');
  const [courseName, setCourseName] = useState<string>('Ciência da Computação');
  const [courseShortName, setCourseShortName] = useState<string>('BCC');
  const [isCreatingNewCourse, setIsCreatingNewCourse] = useState(false);
  const [isLoadingCourse, setIsLoadingCourse] = useState(false);
  const [detectedDifferentCourse, setDetectedDifferentCourse] = useState<{ name: string; shortName: string } | null>(null);

  // Mode: Curricular structure or Semester schedule
  const [activeMode, setActiveMode] = useState<Mode>('schedule');
  const [reviewTab, setReviewTab] = useState<ReviewTab>('table');
  const [selectedPreviewPeriod, setSelectedPreviewPeriod] = useState<number | 'all'>('all');

  // AI Extraction Configuration
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [inputMode, setInputMode] = useState<InputMode>('pdf');
  const [rawTextInput, setRawTextInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractingStep, setExtractingStep] = useState<string>('');
  const [extractingSeconds, setExtractingSeconds] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const [aiErrorModal, setAiErrorModal] = useState<{ title: string; message: string; canRetryWith36: boolean } | null>(null);
  const lastExtractionPayloadRef = useRef<{ file?: File; files?: File[]; text?: string } | null>(null);

  // Tree & Profile states
  const [curriculumExtractType, setCurriculumExtractType] = useState<'tree' | 'linear'>('tree');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [courseProfiles, setCourseProfiles] = useState<CurriculumProfile[]>([]);
  const [extractedProfile, setExtractedProfile] = useState<CurriculumProfile | null>(null);
  const [extractedTreeSubjects, setExtractedTreeSubjects] = useState<TreeSubjectNode[]>([]);
  const [selectedTreePeriod, setSelectedTreePeriod] = useState<number | 'all'>('all');
  const [editingTreeNodeIndex, setEditingTreeNodeIndex] = useState<number | null>(null);
  const [editTreeNode, setEditTreeNode] = useState<TreeSubjectNode | null>(null);
  const [isEditingProfileMeta, setIsEditingProfileMeta] = useState(false);
  const [editProfileMeta, setEditProfileMeta] = useState<CurriculumProfile | null>(null);
  const [treeSearch, setTreeSearch] = useState('');
  const [newPrereqSelect, setNewPrereqSelect] = useState('');

  // Data State: Schedule
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);

  // Data State: Curriculum (PPC)
  const [curriculumSubjects, setCurriculumSubjects] = useState<CurriculumSubject[]>([]);

  // Editing Discipline (Schedule)
  const [editingSchedIndex, setEditingSchedIndex] = useState<number | null>(null);
  const [editSchedCode, setEditSchedCode] = useState('');
  const [editSchedName, setEditSchedName] = useState('');
  const [editSchedProfessor, setEditSchedProfessor] = useState('');
  const [editSchedPeriod, setEditSchedPeriod] = useState(1);
  const [editSchedProfile, setEditSchedProfile] = useState<string>('');
  const [editSchedSessions, setEditSchedSessions] = useState<Session[]>([]);
  const [newSessionDay, setNewSessionDay] = useState<DayOfWeek>(1);
  const [newSessionTime, setNewSessionTime] = useState<string>('18:30 - 20:10');
  const [isCustomTimeInput, setIsCustomTimeInput] = useState(false);
  const [customTimeValue, setCustomTimeValue] = useState('');

  // Editing Subject (Curriculum)
  const [editingCurrIndex, setEditingCurrIndex] = useState<number | null>(null);
  const [editCurrCode, setEditCurrCode] = useState('');
  const [editCurrName, setEditCurrName] = useState('');
  const [editCurrType, setEditCurrType] = useState('Obrigatório');
  const [editCurrPeriod, setEditCurrPeriod] = useState('1');
  const [editCurrProfile, setEditCurrProfile] = useState<string>('');
  const [editCurrCredits, setEditCurrCredits] = useState(4);
  const [editCurrTeorica, setEditCurrTeorica] = useState(60);
  const [editCurrPratica, setEditCurrPratica] = useState(0);
  const [editCurrExtensao, setEditCurrExtensao] = useState(0);
  const [editCurrEmenta, setEditCurrEmenta] = useState('');
  const [editCurrPrereqs, setEditCurrPrereqs] = useState<{ code: string; name: string }[]>([]);
  const [newPrereqCode, setNewPrereqCode] = useState('');
  const [newPrereqName, setNewPrereqName] = useState('');

  // Filters & Search
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterProfile, setFilterProfile] = useState<string>(() => {
    try {
      return localStorage.getItem('admin_filterProfile') || 'all';
    } catch {
      return 'all';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('admin_filterProfile', filterProfile);
    } catch (e) {
      console.error('Failed to save admin_filterProfile', e);
    }
  }, [filterProfile]);
  const [searchFilter, setSearchFilter] = useState('');

  // JSON direct editing
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Status feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Fetch courses list
  const fetchCoursesList = async () => {
    try {
      const res = await fetch('/api/courses');
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

  // 2. Load course data on change
  const loadCourseData = async (courseId: string) => {
    setIsLoadingCourse(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setEditingSchedIndex(null);
    setEditingCurrIndex(null);

    try {
      const res = await fetch(`/api/courses/${courseId}`);
      if (res.ok) {
        const data = await res.json();
        const meta = data.course;
        setCourseName(meta.name || courseId.toUpperCase());
        setCourseShortName(meta.shortName || courseId.toUpperCase());
        
        // Curriculum
        if (data.curriculum) {
          if (Array.isArray(data.curriculum.profiles) && data.curriculum.profiles.length > 0) {
            setCourseProfiles(data.curriculum.profiles);
            const defaultProf = data.curriculum.profiles.find((p: any) => p.id === data.curriculum.activeProfileId) || data.curriculum.profiles[0];
            setExtractedProfile(defaultProf);
            setExtractedTreeSubjects(defaultProf.subjects || []);
          } else {
            setCourseProfiles([]);
            setExtractedProfile(null);
            setExtractedTreeSubjects([]);
          }

          if (data.curriculum.subjects && Array.isArray(data.curriculum.subjects)) {
            setCurriculumSubjects(data.curriculum.subjects);
          } else if (Array.isArray(data.curriculum)) {
            setCurriculumSubjects(data.curriculum);
          } else {
            setCurriculumSubjects([]);
          }
        } else {
          setCourseProfiles([]);
          setExtractedProfile(null);
          setExtractedTreeSubjects([]);
          setCurriculumSubjects([]);
        }

        // Schedule
        if (Array.isArray(data.schedule)) {
          setDisciplines(data.schedule);
          setScheduleTitle(`${meta.name} - Horário 2026.1`);
        } else {
          setDisciplines([]);
          setScheduleTitle('');
        }
      }
    } catch (err: any) {
      console.error('Error loading course details', err);
      setErrorMsg(`Não foi possível carregar os dados do curso ${courseId}.`);
    } finally {
      setIsLoadingCourse(false);
    }
  };

  const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  const handleDeleteActiveCourse = async () => {
    if (!selectedCourseId || isCreatingNewCourse) return;
    setIsDeletingCourse(true);
    try {
      const res = await fetch(`/api/courses/${selectedCourseId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Clean up localStorage for this course
        try {
          localStorage.removeItem(`schedule_${selectedCourseId}`);
          localStorage.removeItem(`selected_profile_${selectedCourseId}`);
          localStorage.removeItem(`disciplines_selectedProfile_${selectedCourseId}`);
          localStorage.removeItem(`matrix_version_${selectedCourseId}`);
          if (localStorage.getItem('selectedCourse') === selectedCourseId) {
            localStorage.removeItem('selectedCourse');
          }
        } catch {}

        setSuccessMsg(`Curso '${courseName}' excluído com sucesso!`);
        setShowDeleteCourseModal(false);

        // Reload courses registry
        const listRes = await fetch('/api/courses');
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
    if (selectedCourseId && !isCreatingNewCourse) {
      loadCourseData(selectedCourseId);
    }
  }, [selectedCourseId, isCreatingNewCourse]);

  // Keep JSON view synced with active data
  useEffect(() => {
    if (reviewTab === 'json') {
      if (activeMode === 'curriculum') {
        setJsonText(JSON.stringify({
          export_date: new Date().toISOString(),
          subjects: curriculumSubjects
        }, null, 2));
      } else {
        setJsonText(JSON.stringify(disciplines, null, 2));
      }
      setJsonError(null);
    }
  }, [activeMode, reviewTab, curriculumSubjects, disciplines]);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isExtracting) handleCancelExtraction();
        if (aiErrorModal) setAiErrorModal(null);
        if (editingSchedIndex !== null) setEditingSchedIndex(null);
        if (editingCurrIndex !== null) setEditingCurrIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingSchedIndex, editingCurrIndex, isExtracting, aiErrorModal]);

  // Stopwatch timer & progressive feedback for active AI extraction
  useEffect(() => {
    let interval: any = null;
    if (isExtracting) {
      interval = setInterval(() => {
        setExtractingSeconds(sec => {
          const next = sec + 1;
          if (next === 4) {
            setExtractingStep(`O modelo ${selectedModel} está analisando o documento...`);
          } else if (next === 10) {
            setExtractingStep('Identificando disciplinas, turmas e horários...');
          } else if (next === 20) {
            setExtractingStep('Aguardando resposta do Gemini e estruturando dados...');
          } else if (next === 35) {
            setExtractingStep('Processamento aprofundado em andamento (documento longo)...');
          }
          return next;
        });
      }, 1000);
    } else {
      setExtractingSeconds(0);
      setExtractingStep('');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isExtracting, selectedModel]);

  const handleCancelExtraction = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsExtracting(false);
    setExtractingStep('');
    setErrorMsg("Extração cancelada pelo usuário.");
  };

  // Apply JSON edits back to state
  const handleApplyJsonEdit = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (activeMode === 'curriculum') {
        const subjects = Array.isArray(parsed) ? parsed : (parsed.subjects || []);
        setCurriculumSubjects(subjects);
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

  // --- AI EXTRACTION HANDLERS ---

  const addFiles = (incomingFiles: FileList | File[]) => {
    const list = Array.from(incomingFiles);
    if (list.length === 0) return;
    setSelectedFiles(prev => {
      const updated = [...prev];
      for (const file of list) {
        if (!updated.some(f => f.name === file.name && f.size === file.size)) {
          updated.push(file);
        }
      }
      return updated;
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveSelectedFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleClearSelectedFiles = () => {
    setSelectedFiles([]);
  };

  // Safe file reader converting to clean base64 string
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.size === 0) {
        return reject(new Error("O arquivo selecionado está vazio (0 bytes). Selecione um PDF válido."));
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const commaIndex = result.indexOf(',');
          const base64 = commaIndex !== -1 ? result.slice(commaIndex + 1) : result;
          if (base64 && base64.trim().length > 0) {
            resolve(base64.trim());
          } else {
            reject(new Error("O conteúdo do PDF lido está vazio."));
          }
        } else {
          reject(new Error("Falha ao ler o formato binário do arquivo."));
        }
      };
      reader.onerror = () => reject(new Error("Erro ao acessar o arquivo localmente."));
      reader.onabort = () => reject(new Error("A leitura do arquivo foi cancelada."));
      reader.readAsDataURL(file);
    });
  };

  // Helper to clean course title from strings like "Medicina Veterinária 2026.1 - Horário Letivo"
  const cleanCourseTitle = (rawTitle: string): string => {
    if (!rawTitle) return '';
    return rawTitle
      .replace(/[-–—]\s*(hor[aá]rio|matriz|grade|semestre|per[ií]odo|letivo|ppc|projeto).*$/i, '')
      .replace(/\b(hor[aá]rio\s+letivo|202[0-9](\.[0-9])?)\b/gi, '')
      .replace(/[-–—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Helper to deduce a sensible acronym (e.g., "Medicina Veterinária" -> "MVET")
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

  const executeAiExtraction = async ({ 
    file, 
    files, 
    text, 
    overrideModel 
  }: { 
    file?: File; 
    files?: File[]; 
    text?: string; 
    overrideModel?: string 
  }) => {
    const modelToUse = overrideModel || selectedModel;
    setIsExtracting(true);
    setExtractingSeconds(0);
    setExtractingStep('Iniciando pipeline de extração...');
    setErrorMsg(null);
    setSuccessMsg(null);
    setAiErrorModal(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const filesToUse = files && files.length > 0 
      ? files 
      : (selectedFiles.length > 0 ? selectedFiles : (file ? [file] : []));

    lastExtractionPayloadRef.current = { file: filesToUse[0], files: filesToUse, text };

    const effectiveText = (text !== undefined ? text : (inputMode === 'text' ? rawTextInput : '')).trim();

    if (filesToUse.length === 0 && !effectiveText) {
      setIsExtracting(false);
      setExtractingStep('');
      abortControllerRef.current = null;
      setErrorMsg(
        inputMode === 'pdf'
          ? "Nenhum arquivo selecionado. Por favor, anexe ou arraste os arquivos (PDF e/ou Imagem)."
          : "O campo de texto está vazio. Cole os dados antes de solicitar a extração."
      );
      return;
    }

    try {
      let processedFiles: Array<{ base64Data: string; mimeType: string; fileName: string }> = [];

      if (filesToUse.length > 0) {
        setExtractingStep(`Lendo ${filesToUse.length > 1 ? `${filesToUse.length} arquivos` : 'arquivo'} para processamento seguro...`);
        processedFiles = await Promise.all(
          filesToUse.map(async f => ({
            base64Data: await readFileAsBase64(f),
            mimeType: f.type || (f.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
            fileName: f.name
          }))
        );
      }

      setExtractingStep(`Enviando dados multimodais para o modelo Gemini (${modelToUse})...`);

      if (activeMode === 'curriculum') {
        const isTreeExtraction = curriculumExtractType === 'tree' || filesToUse.some(f => f.type.startsWith('image/'));

        if (isTreeExtraction) {
          setExtractingStep(`Correlacionando documentos e extraindo matriz em árvore com Gemini (${modelToUse})...`);
          const response = await fetch('/api/extract-curriculum-tree', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              files: processedFiles,
              textContent: effectiveText || undefined,
              model: modelToUse
            }),
            signal: controller.signal
          });

          if (!response.ok) {
            let errorDetail = "Erro ao processar matriz em árvore com IA.";
            try {
              const errJson = await response.json();
              errorDetail = errJson.error || errJson.details || errorDetail;
            } catch {
              const errText = await response.text();
              if (errText) errorDetail = errText.slice(0, 300);
            }
            throw new Error(errorDetail);
          }

          setExtractingStep('Construindo nós de disciplinas e grafo de pré-requisitos...');
          const data = await response.json();
          const extractedCourseName = data.courseName || '';
          const extractedShortName = data.courseShortName || (extractedCourseName ? generateShortName(extractedCourseName) : '');

          if (isCreatingNewCourse || courseName === 'Novo Curso Acadêmico') {
            if (extractedCourseName) setCourseName(extractedCourseName);
            if (extractedShortName) setCourseShortName(extractedShortName);
          } else if (extractedCourseName && extractedCourseName.toLowerCase() !== courseName.toLowerCase()) {
            setDetectedDifferentCourse({ name: extractedCourseName, shortName: extractedShortName });
          }

          if (data.profile) {
            setExtractedProfile(data.profile);
          }
          if (data.subjects && Array.isArray(data.subjects)) {
            setExtractedTreeSubjects(data.subjects);

            // Mapeamento compatível para a tabela tradicional
            const flatMapped: CurriculumSubject[] = data.subjects.map((s: TreeSubjectNode) => ({
              id: s.id,
              code: s.code || s.id.toUpperCase(),
              name: s.name,
              type: s.type === 'optativa' ? 'Optativa' : 'Obrigatório',
              period: s.period > 0 ? String(s.period) : 'Optativa',
              profile: data.profile?.id || '',
              credits: Math.round(s.hours / 15),
              workload: {
                teorica: s.hours,
                pratica: 0,
                extensao: 0,
                total: s.hours
              },
              prerequisites: (s.prereqs || []).map(p => ({ code: p, name: p })),
              ementa: s.desc || ''
            }));
            setCurriculumSubjects(flatMapped);
            setReviewTab('tree');
          }

          const fallbackNote = data._modelUsed && data._modelUsed !== modelToUse ? ` (via fallback para ${data._modelUsed})` : '';
          const profileNote = data.profile ? ` [Perfil: ${data.profile.id} - ${data.profile.name}]` : '';
          setSuccessMsg(`Extração da Matriz em Árvore concluída com sucesso${fallbackNote}! ${data.subjects?.length || 0} disciplinas com pré-requisitos mapeadas.${profileNote}`);
          return;
        }

        // Extração linear tradicional
        const response = await fetch('/api/extract-curriculum', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data: processedFiles[0]?.base64Data,
            textContent: effectiveText || undefined,
            mimeType: processedFiles[0]?.mimeType,
            model: modelToUse
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          let errorDetail = "Erro ao processar currículo com IA.";
          try {
            const errJson = await response.json();
            errorDetail = errJson.error || errJson.details || errorDetail;
          } catch {
            const errText = await response.text();
            if (errText) errorDetail = errText.slice(0, 300);
          }
          throw new Error(errorDetail);
        }

        setExtractingStep('Estruturando disciplinas e matriz curricular...');
        const data = await response.json();
        const extractedCourseName = data.courseName || (data.title ? cleanCourseTitle(data.title) : '');
        const extractedShortName = data.courseShortName || (extractedCourseName ? generateShortName(extractedCourseName) : '');
        const extractedTitle = data.title || (extractedCourseName ? `${extractedCourseName} - Catálogo Curricular` : '');

        if (isCreatingNewCourse || courseName === 'Novo Curso Acadêmico') {
          if (extractedCourseName) setCourseName(extractedCourseName);
          if (extractedShortName) setCourseShortName(extractedShortName);
        } else if (extractedCourseName && extractedCourseName.toLowerCase() !== courseName.toLowerCase()) {
          setDetectedDifferentCourse({ name: extractedCourseName, shortName: extractedShortName });
        }

        if (extractedTitle) setScheduleTitle(extractedTitle);

        if (data.subjects && Array.isArray(data.subjects)) {
          setCurriculumSubjects(data.subjects);
          const fallbackNote = data._modelUsed && data._modelUsed !== modelToUse ? ` (via fallback para ${data._modelUsed})` : '';
          const nameNote = (isCreatingNewCourse && extractedCourseName) ? ` Curso identificado: "${extractedCourseName} (${extractedShortName})".` : '';
          setSuccessMsg(`Extração Curricular concluída${fallbackNote}! ${data.subjects.length} disciplinas mapeadas.${nameNote}`);
        }
      } else {
        const response = await fetch('/api/extract-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data: processedFiles[0]?.base64Data,
            textContent: effectiveText || undefined,
            mimeType: processedFiles[0]?.mimeType,
            model: modelToUse
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          let errorDetail = "Erro ao processar horário com IA.";
          try {
            const errJson = await response.json();
            errorDetail = errJson.error || errJson.details || errorDetail;
          } catch {
            const errText = await response.text();
            if (errText) errorDetail = errText.slice(0, 300);
          }
          throw new Error(errorDetail);
        }

        setExtractingStep('Estruturando turmas e horários de aula...');
        const data = await response.json();
        const extractedCourseName = data.courseName || (data.title ? cleanCourseTitle(data.title) : '');
        const extractedShortName = data.courseShortName || (extractedCourseName ? generateShortName(extractedCourseName) : '');
        const extractedTitle = data.title || (extractedCourseName ? `${extractedCourseName} - Horário 2026.1` : '');

        if (extractedTitle) setScheduleTitle(extractedTitle);

        if (isCreatingNewCourse || courseName === 'Novo Curso Acadêmico') {
          if (extractedCourseName) setCourseName(extractedCourseName);
          if (extractedShortName) setCourseShortName(extractedShortName);
        } else if (extractedCourseName && extractedCourseName.toLowerCase() !== courseName.toLowerCase()) {
          setDetectedDifferentCourse({ name: extractedCourseName, shortName: extractedShortName });
        }

        if (data.disciplines && Array.isArray(data.disciplines)) {
          const sanitizedDisciplines = data.disciplines.map((d: any) => {
            let cleanName = (d.name || "").trim();
            let profile = (d.profile || "").trim();
            const profileRegex = /\s*\((?:(?:matriz|grade)\s+(?:nova|antiga)\s*[-–:]*\s*|perfil\s*[-–:]*\s*)?([A-Za-z0-9_-]+)\)/i;
            const match = cleanName.match(profileRegex);
            if (match) {
              if (!profile && match[1]) profile = match[1].trim();
              cleanName = cleanName.replace(match[0], "").trim();
            }
            cleanName = cleanName.replace(/\s*\((?:matriz|grade)\s+(?:nova|antiga)\)/gi, "").trim();
            if (profile.toLowerCase() === 'optativa' || profile.toLowerCase() === 'sem perfil' || d.period === 0) {
              profile = '';
            }
            return { ...d, name: cleanName, profile };
          });
          setDisciplines(sanitizedDisciplines);
          const fallbackNote = data._modelUsed && data._modelUsed !== modelToUse ? ` (via fallback para ${data._modelUsed})` : '';
          const nameNote = (isCreatingNewCourse && extractedCourseName) ? ` Curso identificado: "${extractedCourseName} (${extractedShortName})".` : '';
          setSuccessMsg(`Extração de Horários concluída${fallbackNote}! ${sanitizedDisciplines.length} turmas estruturadas.${nameNote}`);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setErrorMsg("Requisição cancelada.");
      } else {
        console.error(err);
        const formatted = formatAiErrorMessage(err.message || "Erro na extração com IA.", modelToUse);
        setErrorMsg(formatted);
        const isDemandOrQuota = formatted.includes('503') || formatted.includes('alta demanda') || formatted.includes('429') || formatted.includes('cota');
        setAiErrorModal({
          title: isDemandOrQuota ? "Alta Demanda no Modelo Google Gemini" : "Erro na Extração com IA",
          message: formatted,
          canRetryWith36: modelToUse !== 'gemini-3.6-flash'
        });
      }
      contentAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsExtracting(false);
      setExtractingStep('');
      abortControllerRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save to project disk
  const handleSaveToProject = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetId = isCreatingNewCourse 
      ? courseName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      : selectedCourseId;

    if (!targetId) {
      setErrorMsg("Identificador de curso inválido.");
      return;
    }

    try {
      const payload: any = {
        id: targetId,
        name: courseName,
        shortName: courseShortName || targetId.toUpperCase(),
        semester: "2026.1"
      };

      if (activeMode === 'curriculum' || curriculumSubjects.length > 0 || extractedTreeSubjects.length > 0) {
        let profilesToSave: CurriculumProfile[] = [...courseProfiles];
        
        if (extractedProfile && extractedTreeSubjects.length > 0) {
          const profileToSave: CurriculumProfile = {
            ...extractedProfile,
            subjects: extractedTreeSubjects
          };
          const existingIdx = profilesToSave.findIndex(p => p.id === extractedProfile.id);
          if (existingIdx > -1) {
            profilesToSave[existingIdx] = profileToSave;
          } else {
            profilesToSave.push(profileToSave);
          }
        }

        payload.curriculum = {
          export_date: new Date().toISOString(),
          courseName: courseName,
          courseShortName: courseShortName,
          activeProfileId: extractedProfile?.id || (profilesToSave.length > 0 ? profilesToSave[0].id : undefined),
          profiles: profilesToSave.length > 0 ? profilesToSave : undefined,
          subjects: curriculumSubjects
        };
      }

      if (activeMode === 'schedule' || disciplines.length > 0) {
        payload.schedule = disciplines;
      }

      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao salvar curso.");
      }

      setSuccessMsg(`Curso "${courseName}" salvo com sucesso no projeto (em src/data/${targetId}/)!`);
      
      await fetchCoursesList();
      if (isCreatingNewCourse) {
        setIsCreatingNewCourse(false);
        setSelectedCourseId(targetId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao persistir alterações.");
    }
  };

  const handleExportJsonFile = () => {
    const isCurr = activeMode === 'curriculum';
    const content = isCurr
      ? JSON.stringify({ export_date: new Date().toISOString(), subjects: curriculumSubjects }, null, 2)
      : JSON.stringify(disciplines, null, 2);

    const filename = isCurr 
      ? `curriculo_${selectedCourseId || 'curso'}.json`
      : `horario_${selectedCourseId || 'curso'}_2026_1.json`;

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
    const isCurr = activeMode === 'curriculum';
    const content = isCurr
      ? JSON.stringify({ export_date: new Date().toISOString(), subjects: curriculumSubjects }, null, 2)
      : JSON.stringify(disciplines, null, 2);

    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadIntoActiveApp = () => {
    if (disciplines.length === 0) {
      setErrorMsg("Nenhum horário de disciplina disponível para carregar.");
      return;
    }
    setDisciplinesList(disciplines);
    setGradeTitle(scheduleTitle || `${courseName} - Horário`);
    localStorage.setItem('saved_disciplinesList', JSON.stringify(disciplines));
    localStorage.setItem('saved_gradeTitle', scheduleTitle || `${courseName} - Horário`);
    localStorage.setItem('selectedCourse', selectedCourseId);
    setView('schedule');
  };

  // Helper to sort time strings chronologically (e.g. "07:30 - 09:10", "14:00 - 16:00", "18:30 - 20:10")
  const parseTimeMinutes = (timeStr: string): number => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    }
    return 0;
  };

  // Horários dinamicamente extraídos dos dados das turmas carregadas
  const availableTimeSlots = useMemo(() => {
    const slotsSet = new Set<string>();

    disciplines.forEach(d => {
      d.sessions?.forEach(s => {
        if (s.time && s.time.trim()) {
          slotsSet.add(s.time.trim());
        }
      });
    });

    // Inclui sessões da turma atualmente em edição
    editSchedSessions.forEach(s => {
      if (s.time && s.time.trim()) {
        slotsSet.add(s.time.trim());
      }
    });

    // Se o dataset não possui nenhuma sessão ainda, usa os padrões
    if (slotsSet.size === 0) {
      TIMESLOTS.forEach(t => slotsSet.add(t));
    }

    return Array.from(slotsSet).sort((a, b) => parseTimeMinutes(a) - parseTimeMinutes(b));
  }, [disciplines, editSchedSessions]);

  // Manter newSessionTime sincronizado com os horários disponíveis
  useEffect(() => {
    if (availableTimeSlots.length > 0 && !availableTimeSlots.includes(newSessionTime) && !isCustomTimeInput) {
      setNewSessionTime(availableTimeSlots[0]);
    }
  }, [availableTimeSlots, newSessionTime, isCustomTimeInput]);

  // Schedule editing
  const handleStartEditSchedule = (index: number, disc: Discipline) => {
    setEditingSchedIndex(index);
    setEditSchedName(disc.name);
    setEditSchedCode(disc.code || '');
    setEditSchedProfessor(disc.professor || '-');
    setEditSchedPeriod(disc.period === undefined ? 1 : Number(disc.period));
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
        professor: editSchedProfessor,
        period: Number(editSchedPeriod),
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

  // Curriculum editing
  const handleStartEditCurriculum = (index: number, sub: CurriculumSubject) => {
    setEditingCurrIndex(index);
    setEditCurrCode(sub.code);
    setEditCurrName(sub.name);
    setEditCurrType(sub.type || 'Obrigatório');
    setEditCurrPeriod(sub.period ? sub.period.toString() : '1');
    setEditCurrProfile(sub.profile || '');
    setEditCurrCredits(sub.credits || 4);
    setEditCurrTeorica(sub.workload?.teorica || 60);
    setEditCurrPratica(sub.workload?.pratica || 0);
    setEditCurrExtensao(sub.workload?.extensao || 0);
    setEditCurrEmenta(sub.ementa || '');
    setEditCurrPrereqs(sub.prerequisites ? [...sub.prerequisites] : []);
  };

  const handleSaveCurriculumEdit = () => {
    if (editingCurrIndex === null) return;
    setCurriculumSubjects(prev => {
      const updated = [...prev];
      const total = Number(editCurrTeorica) + Number(editCurrPratica) + Number(editCurrExtensao);
      updated[editingCurrIndex] = {
        ...updated[editingCurrIndex],
        code: editCurrCode,
        name: editCurrName,
        type: editCurrType,
        period: editCurrPeriod,
        profile: editCurrProfile.trim() || undefined,
        credits: Number(editCurrCredits),
        workload: {
          teorica: Number(editCurrTeorica),
          pratica: Number(editCurrPratica),
          extensao: Number(editCurrExtensao),
          total
        },
        prerequisites: editCurrPrereqs,
        ementa: editCurrEmenta
      };
      return updated;
    });
    setEditingCurrIndex(null);
  };

  const handleAddPrereqToCurriculumEdit = () => {
    if (!newPrereqCode || !newPrereqName) return;
    setEditCurrPrereqs(prev => [...prev, { code: newPrereqCode.trim(), name: newPrereqName.trim() }]);
    setNewPrereqCode('');
    setNewPrereqName('');
  };

  const handleRemovePrereqFromCurriculumEdit = (code: string) => {
    setEditCurrPrereqs(prev => prev.filter(p => p.code !== code));
  };

  const handleDeleteCurriculumItem = (index: number) => {
    setCurriculumSubjects(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddBlankCurriculumSubject = () => {
    const newSub: CurriculumSubject = {
      code: 'NOVA0001',
      name: 'Nova Disciplina da Matriz',
      type: 'Obrigatório',
      period: '1',
      profile: filterProfile !== 'all' ? filterProfile : undefined,
      credits: 4,
      workload: { teorica: 60, pratica: 0, extensao: 0, total: 60 },
      prerequisites: [],
      ementa: 'Descrição dos conteúdos programáticos.'
    };
    setCurriculumSubjects(prev => [...prev, newSub]);
    handleStartEditCurriculum(curriculumSubjects.length, newSub);
  };

  // Tree Subject Node Editing
  const handleStartEditTreeNode = (index: number, node: TreeSubjectNode) => {
    setEditingTreeNodeIndex(index);
    setEditTreeNode({ ...node, prereqs: [...(node.prereqs || [])] });
    setNewPrereqSelect('');
  };

  const handleSaveTreeNodeEdit = () => {
    if (editingTreeNodeIndex === null || !editTreeNode) return;
    setExtractedTreeSubjects(prev => {
      const updated = [...prev];
      updated[editingTreeNodeIndex] = editTreeNode;
      return updated;
    });

    // Also sync with flat curriculum subjects
    setCurriculumSubjects(prev => {
      const idx = prev.findIndex(s => s.code === editTreeNode.code || s.name === editTreeNode.name || s.id === editTreeNode.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          id: editTreeNode.id,
          code: editTreeNode.code || editTreeNode.id.toUpperCase(),
          name: editTreeNode.name,
          period: editTreeNode.period > 0 ? String(editTreeNode.period) : 'Optativa',
          type: editTreeNode.type === 'optativa' ? 'Optativa' : 'Obrigatório',
          credits: Math.round(editTreeNode.hours / 15),
          workload: {
            teorica: editTreeNode.hours,
            pratica: 0,
            extensao: 0,
            total: editTreeNode.hours
          },
          prerequisites: editTreeNode.prereqs.map(p => ({ code: p, name: p })),
          ementa: editTreeNode.desc || ''
        };
        return updated;
      }
      return prev;
    });

    setEditingTreeNodeIndex(null);
    setEditTreeNode(null);
  };

  const handleDeleteTreeNode = (index: number) => {
    const nodeToDelete = extractedTreeSubjects[index];
    setExtractedTreeSubjects(prev => prev.filter((_, i) => i !== index));
    if (nodeToDelete) {
      setCurriculumSubjects(prev => prev.filter(s => s.code !== nodeToDelete.code && s.name !== nodeToDelete.name && s.id !== nodeToDelete.id));
    }
  };

  const handleAddBlankTreeNode = () => {
    const id = `NODE_${Date.now()}`;
    const newNode: TreeSubjectNode = {
      id,
      code: 'DISC' + Math.floor(1000 + Math.random() * 9000),
      name: 'Nova Disciplina da Matriz',
      period: selectedTreePeriod !== 'all' ? Number(selectedTreePeriod) : 1,
      hours: 60,
      type: 'computacao',
      prereqs: [],
      desc: ''
    };
    setExtractedTreeSubjects(prev => [...prev, newNode]);
    handleStartEditTreeNode(extractedTreeSubjects.length, newNode);
  };

  const handleAddPrereqToTreeNode = (targetCodeOrId: string) => {
    if (!editTreeNode || !targetCodeOrId || editTreeNode.prereqs.includes(targetCodeOrId)) return;
    setEditTreeNode({
      ...editTreeNode,
      prereqs: [...editTreeNode.prereqs, targetCodeOrId]
    });
    setNewPrereqSelect('');
  };

  const handleRemovePrereqFromTreeNode = (targetCodeOrId: string) => {
    if (!editTreeNode) return;
    setEditTreeNode({
      ...editTreeNode,
      prereqs: editTreeNode.prereqs.filter(p => p !== targetCodeOrId)
    });
  };

  // Profile Switching & Profile Metadata Editing
  const handleSelectProfileToReview = (profileId: string) => {
    if (extractedProfile) {
      const updatedProfile: CurriculumProfile = {
        ...extractedProfile,
        subjects: extractedTreeSubjects
      };
      setCourseProfiles(prev => {
        const idx = prev.findIndex(p => p.id === extractedProfile.id);
        if (idx > -1) {
          const list = [...prev];
          list[idx] = updatedProfile;
          return list;
        }
        return [...prev, updatedProfile];
      });
    }

    const target = courseProfiles.find(p => p.id === profileId);
    if (target) {
      setExtractedProfile(target);
      setExtractedTreeSubjects(target.subjects || []);
    }
  };

  const handleAddNewProfile = () => {
    const newId = `PERFIL_${courseProfiles.length + 1}`;
    const newProf: CurriculumProfile = {
      id: newId,
      name: `Grade Curricular ${newId}`,
      validFromSemester: '2026.1',
      totalHours: 3200,
      acexHours: 320,
      accHours: 90,
      optativeHours: 480,
      mandatoryHours: 2310,
      subjects: []
    };
    setCourseProfiles(prev => [...prev, newProf]);
    setExtractedProfile(newProf);
    setExtractedTreeSubjects([]);
  };

  const handleStartEditProfileMeta = () => {
    if (!extractedProfile) return;
    setEditProfileMeta({ ...extractedProfile });
    setIsEditingProfileMeta(true);
  };

  const handleSaveProfileMeta = () => {
    if (!editProfileMeta) return;
    setExtractedProfile(editProfileMeta);
    setCourseProfiles(prev => {
      const idx = prev.findIndex(p => p.id === editProfileMeta.id);
      if (idx > -1) {
        const list = [...prev];
        list[idx] = { ...editProfileMeta, subjects: extractedTreeSubjects };
        return list;
      }
      return [...prev, { ...editProfileMeta, subjects: extractedTreeSubjects }];
    });
    setIsEditingProfileMeta(false);
    setEditProfileMeta(null);
  };

  // Profiles detected from loaded data
  const availableScheduleProfiles = useMemo(() => {
    const set = new Set<string>();
    disciplines.forEach(d => {
      if (d.profile && d.profile.trim()) set.add(d.profile.trim());
    });
    return Array.from(set).sort();
  }, [disciplines]);

  const availableCurriculumProfiles = useMemo(() => {
    const set = new Set<string>();
    curriculumSubjects.forEach(s => {
      if (s.profile && s.profile.trim()) set.add(s.profile.trim());
    });
    return Array.from(set).sort();
  }, [curriculumSubjects]);

  const activeProfiles = activeMode === 'curriculum' ? availableCurriculumProfiles : availableScheduleProfiles;

  // Filtered lists
  const filteredCurriculum = useMemo(() => {
    return curriculumSubjects.filter(sub => {
      const matchPeriod = filterPeriod === 'all' || sub.period?.toString() === filterPeriod;
      const matchProfile = filterProfile === 'all' || sub.profile === filterProfile || (!sub.profile && filterProfile === 'Sem Perfil');
      const matchSearch = !searchFilter || 
        sub.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
        sub.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (sub.profile && sub.profile.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchPeriod && matchProfile && matchSearch;
    });
  }, [curriculumSubjects, filterPeriod, filterProfile, searchFilter]);

  const filteredSchedule = useMemo(() => {
    return disciplines.filter(disc => {
      const matchPeriod = filterPeriod === 'all' || disc.period?.toString() === filterPeriod;
      const matchProfile = filterProfile === 'all' || disc.profile === filterProfile || (!disc.profile && filterProfile === 'Sem Perfil');
      const matchSearch = !searchFilter || 
        disc.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
        (disc.code && disc.code.toLowerCase().includes(searchFilter.toLowerCase())) ||
        disc.professor.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (disc.profile && disc.profile.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchPeriod && matchProfile && matchSearch;
    });
  }, [disciplines, filterPeriod, filterProfile, searchFilter]);

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col overflow-hidden font-sans">
      
      {/* Hidden file input strictly outside clickable containers */}
      <input 
        ref={fileInputRef}
        type="file" 
        multiple
        accept={activeMode === 'curriculum' ? ".pdf,image/png,image/jpeg,image/webp,application/pdf" : ".pdf,application/pdf"}
        onChange={handleFileSelect}
        onClick={(e) => e.stopPropagation()}
        className="hidden" 
      />

      {/* MODAL 0: ACTIVE AI EXTRACTION PROGRESS OVERLAY */}
      {isExtracting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 flex flex-col items-center text-center space-y-5 animate-in zoom-in-95 duration-150">
            {/* Pulsing Icon */}
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <BrainCircuit className="w-8 h-8 animate-pulse" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-indigo-600 items-center justify-center text-[10px] text-white font-bold">
                  ⚡
                </span>
              </span>
            </div>

            {/* Title & Status */}
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Processando Documento com IA
              </h3>
              <p className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 font-medium min-h-[20px] animate-pulse">
                {extractingStep || `Conectando ao modelo ${selectedModel}...`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                {activeMode === 'curriculum' 
                  ? 'Mapeando catálogo de matérias, ementas e cargas horárias.'
                  : 'Analisando turmas, professores, salas e alocações de horários.'}
              </p>
            </div>

            {/* Stopwatch & Info */}
            <div className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-mono">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>⏱️ {extractingSeconds}s decorridos</span>
              </div>
              <span className="font-mono text-[11px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-200">
                {selectedModel}
              </span>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={handleCancelExtraction}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 dark:hover:border-rose-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              <span>Cancelar Requisição</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: AI EXTRACTION ERROR DIALOG */}
      {aiErrorModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setAiErrorModal(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-7 flex flex-col space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {aiErrorModal.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Modelo solicitado: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{selectedModel}</span>
                </p>
              </div>
            </div>

            {/* Error Body */}
            <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 text-xs text-rose-900 dark:text-rose-200 leading-relaxed space-y-2">
              <p>{aiErrorModal.message}</p>
              {aiErrorModal.canRetryWith36 && (
                <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Dica: O <strong>Gemini 3.6 Flash</strong> está 100% operacional sem fila de espera.</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAiErrorModal(null)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Fechar
              </button>

              {aiErrorModal.canRetryWith36 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModel('gemini-3.6-flash');
                    setAiErrorModal(null);
                    if (lastExtractionPayloadRef.current) {
                      executeAiExtraction({
                        ...lastExtractionPayloadRef.current,
                        overrideModel: 'gemini-3.6-flash'
                      });
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Trocar para Gemini 3.6 Flash e Tentar Novamente</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT CURRICULUM SUBJECT */}
      {editingCurrIndex !== null && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingCurrIndex(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    Editar Componente Curricular
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                    {editCurrName || 'Nova Disciplina'} ({editCurrCode || 'Sem código'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCurrIndex(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Row 1: Code, Name, Period, Profile */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Código</label>
                  <input
                    type="text"
                    value={editCurrCode}
                    onChange={(e) => setEditCurrCode(e.target.value)}
                    placeholder="Ex: CCMP3057"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nome da Disciplina</label>
                  <input
                    type="text"
                    value={editCurrName}
                    onChange={(e) => setEditCurrName(e.target.value)}
                    placeholder="Ex: Algoritmos e Estruturas de Dados"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Período</label>
                  <select
                    value={editCurrPeriod}
                    onChange={(e) => setEditCurrPeriod(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {Array.from({ length: 11 }, (_, i) => (
                      <option key={i + 1} value={(i + 1).toString()}>{i + 1}º Período</option>
                    ))}
                    <option value="Optativa">Optativa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Perfil / Matriz</label>
                  <input
                    type="text"
                    value={editCurrProfile}
                    onChange={(e) => setEditCurrProfile(e.target.value)}
                    placeholder="Ex: MVET03"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>
              </div>

              {/* Row 2: Type, Credits, CH Teórica, CH Prática, CH Extensão */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tipo</label>
                  <select
                    value={editCurrType}
                    onChange={(e) => setEditCurrType(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="Obrigatório">Obrigatório</option>
                    <option value="Optativa">Optativa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Créditos</label>
                  <input
                    type="number"
                    min={1}
                    value={editCurrCredits}
                    onChange={(e) => setEditCurrCredits(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">C.H. Teórica (h)</label>
                  <input
                    type="number"
                    min={0}
                    value={editCurrTeorica}
                    onChange={(e) => setEditCurrTeorica(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">C.H. Prática (h)</label>
                  <input
                    type="number"
                    min={0}
                    value={editCurrPratica}
                    onChange={(e) => setEditCurrPratica(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">C.H. Extensão (h)</label>
                  <input
                    type="number"
                    min={0}
                    value={editCurrExtensao}
                    onChange={(e) => setEditCurrExtensao(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Total C.H. Badge */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <span className="text-slate-500 font-medium">Carga Horária Total Calculada:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {Number(editCurrTeorica) + Number(editCurrPratica) + Number(editCurrExtensao)} horas
                </span>
              </div>

              {/* Prerequisites */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">
                  Pré-requisitos ({editCurrPrereqs.length})
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[44px] items-center">
                  {editCurrPrereqs.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">Nenhum pré-requisito cadastrado.</span>
                  ) : (
                    editCurrPrereqs.map((p, pidx) => (
                      <span 
                        key={pidx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg font-medium text-[11px]"
                      >
                        <span className="font-mono font-bold">{p.code}:</span>
                        <span>{p.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePrereqFromCurriculumEdit(p.code)}
                          className="text-emerald-400 hover:text-rose-500 transition-colors ml-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Código (ex: MATM3008)"
                    value={newPrereqCode}
                    onChange={(e) => setNewPrereqCode(e.target.value)}
                    className="w-36 p-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Nome da disciplina pré-requisito"
                    value={newPrereqName}
                    onChange={(e) => setNewPrereqName(e.target.value)}
                    className="flex-1 p-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddPrereqToCurriculumEdit}
                    className="px-3.5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition-all cursor-pointer shrink-0"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>

              {/* Ementa */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ementa Oficial / Conteúdo Programático</label>
                <textarea
                  rows={4}
                  value={editCurrEmenta}
                  onChange={(e) => setEditCurrEmenta(e.target.value)}
                  placeholder="Descreva o conteúdo e os objetivos da disciplina..."
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-sans focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setEditingCurrIndex(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCurriculumEdit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SCHEDULE DISCIPLINE / TURMA */}
      {editingSchedIndex !== null && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingSchedIndex(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
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
                onClick={() => setEditingSchedIndex(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Row 1: Code, Name, Period, Profile */}
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
                    onChange={(e) => setEditSchedPeriod(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
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

              {/* Row 2: Professor */}
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

              {/* Row 3: Sessions List & Add */}
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
                          onClick={() => handleRemoveSessionFromScheduleEdit(s.day, s.time)}
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
                  {/* Dia da semana */}
                  <select
                    value={newSessionDay}
                    onChange={(e) => setNewSessionDay(Number(e.target.value) as DayOfWeek)}
                    className="p-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer"
                  >
                    {DAYS.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>

                  {/* Seletor dinâmico com horários extraídos dos dados */}
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
                    onClick={handleAddSessionToScheduleEdit}
                    className="px-3.5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition-all cursor-pointer shrink-0"
                  >
                    + Adicionar Horário
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setEditingSchedIndex(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveScheduleEdit}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT TREE SUBJECT NODE */}
      {editingTreeNodeIndex !== null && editTreeNode && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingTreeNodeIndex(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Editar Disciplina da Árvore Curricular
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                    {editTreeNode.name || 'Nova Disciplina'} ({editTreeNode.code || editTreeNode.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTreeNodeIndex(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Row 1: Code, Name, Period, Hours, Type */}
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Código</label>
                  <input
                    type="text"
                    value={editTreeNode.code || ''}
                    onChange={(e) => setEditTreeNode({ ...editTreeNode, code: e.target.value.toUpperCase() })}
                    placeholder="Ex: CCMP3014"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono font-bold focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nome da Disciplina</label>
                  <input
                    type="text"
                    value={editTreeNode.name}
                    onChange={(e) => setEditTreeNode({ ...editTreeNode, name: e.target.value })}
                    placeholder="Ex: Estruturas de Dados"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Período</label>
                  <select
                    value={editTreeNode.period}
                    onChange={(e) => setEditTreeNode({ ...editTreeNode, period: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}º Período</option>
                    ))}
                    <option value={0}>Optativa (Sem período fixo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Carga Horária (h)</label>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={editTreeNode.hours}
                    onChange={(e) => setEditTreeNode({ ...editTreeNode, hours: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Categoria / Tipo</label>
                  <select
                    value={editTreeNode.type}
                    onChange={(e) => setEditTreeNode({ ...editTreeNode, type: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="computacao">Computação / Específica</option>
                    <option value="basico">Ciclo Básico / Matemática</option>
                    <option value="optativa">Optativa</option>
                    <option value="estagio">Estágio / TCC</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
              </div>

              {/* Prerequisites Manager */}
              <div className="space-y-2 pt-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">
                  Pré-requisitos Necessários ({editTreeNode.prereqs.length})
                </label>
                
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[44px] items-center">
                  {editTreeNode.prereqs.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">
                      Nenhum pré-requisito (Disciplina de fluxo de entrada).
                    </span>
                  ) : (
                    editTreeNode.prereqs.map((prereqId, pidx) => {
                      const matchedNode = extractedTreeSubjects.find(s => s.id === prereqId || s.code === prereqId);
                      const displayTitle = matchedNode ? `${matchedNode.code || matchedNode.id} - ${matchedNode.name}` : prereqId;
                      return (
                        <span 
                          key={pidx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg font-medium text-[11px]"
                          title={displayTitle}
                        >
                          <span className="font-mono font-bold">← {matchedNode?.code || prereqId}</span>
                          {matchedNode && <span className="max-w-[140px] truncate">({matchedNode.name})</span>}
                          <button
                            type="button"
                            onClick={() => handleRemovePrereqFromTreeNode(prereqId)}
                            className="text-indigo-400 hover:text-rose-500 transition-colors ml-1 cursor-pointer"
                            title="Remover pré-requisito"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })
                  )}
                </div>

                {/* Add Prereq from existing tree subjects */}
                <div className="flex gap-2 items-center">
                  <select
                    value={newPrereqSelect}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) handleAddPrereqToTreeNode(val);
                    }}
                    className="flex-1 p-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer"
                  >
                    <option value="">+ Selecionar disciplina existente como pré-requisito...</option>
                    {extractedTreeSubjects
                      .filter(s => s.id !== editTreeNode.id && s.code !== editTreeNode.code && !editTreeNode.prereqs.includes(s.code || s.id))
                      .sort((a, b) => (a.period || 0) - (b.period || 0))
                      .map(s => (
                        <option key={s.id} value={s.code || s.id}>
                          {s.period ? `${s.period}ºP: ` : 'Opt: '}{s.code || s.id} - {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Description / Ementa */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Ementa / Descrição
                </label>
                <textarea
                  rows={3}
                  value={editTreeNode.desc || ''}
                  onChange={(e) => setEditTreeNode({ ...editTreeNode, desc: e.target.value })}
                  placeholder="Objetivos e tópicos abordados nesta disciplina..."
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-sans focus:outline-none focus:border-indigo-500 text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setEditingTreeNodeIndex(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTreeNodeEdit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Disciplina</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT PROFILE METADATA */}
      {isEditingProfileMeta && editProfileMeta && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsEditingProfileMeta(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Editar Metadados do Perfil Curricular
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cargas horárias totais, extensão e atividades complementares
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingProfileMeta(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">ID do Perfil</label>
                  <input
                    type="text"
                    value={editProfileMeta.id}
                    onChange={(e) => setEditProfileMeta({ ...editProfileMeta, id: e.target.value.toUpperCase() })}
                    placeholder="Ex: BCC03"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono font-bold focus:outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Semestre Vigência</label>
                  <input
                    type="text"
                    value={editProfileMeta.validFromSemester || ''}
                    onChange={(e) => setEditProfileMeta({ ...editProfileMeta, validFromSemester: e.target.value })}
                    placeholder="Ex: 2024.2"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nome Descritivo do Perfil</label>
                <input
                  type="text"
                  value={editProfileMeta.name}
                  onChange={(e) => setEditProfileMeta({ ...editProfileMeta, name: e.target.value })}
                  placeholder="Ex: Grade Nova 2024.2"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">C.H. Total (horas)</label>
                  <input
                    type="number"
                    min={0}
                    value={editProfileMeta.totalHours}
                    onChange={(e) => setEditProfileMeta({ ...editProfileMeta, totalHours: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">ACEx Extensão (horas)</label>
                  <input
                    type="number"
                    min={0}
                    value={editProfileMeta.acexHours}
                    onChange={(e) => setEditProfileMeta({ ...editProfileMeta, acexHours: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">ACC Complementar (horas)</label>
                  <input
                    type="number"
                    min={0}
                    value={editProfileMeta.accHours}
                    onChange={(e) => setEditProfileMeta({ ...editProfileMeta, accHours: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Optativas (horas)</label>
                  <input
                    type="number"
                    min={0}
                    value={editProfileMeta.optativeHours}
                    onChange={(e) => setEditProfileMeta({ ...editProfileMeta, optativeHours: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setIsEditingProfileMeta(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveProfileMeta}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Metadados</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE ACTIVE COURSE */}
      {showDeleteCourseModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isDeletingCourse && setShowDeleteCourseModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Excluir Curso Ativo
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta ação é irreversível
                </p>
              </div>
            </div>

            <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3.5 text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
              Tem certeza que deseja excluir o curso <strong>{courseName} ({courseShortName})</strong>? Todas as disciplinas cadastradas, horários letivos e arquivos deste curso serão permanentemente removidos.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingCourse}
                onClick={() => setShowDeleteCourseModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingCourse}
                onClick={handleDeleteActiveCourse}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingCourse ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sim, Excluir Curso</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shrink-0 flex items-center justify-between shadow-xs z-10">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setView('home')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400 cursor-pointer"
            title="Voltar ao início"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <span>Painel de Administração Acadêmica</span>
              <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded font-mono">
                JSON & IA Engine
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Importação inteligente de qualquer PDF, manipulação de matrizes e horários letivos
            </p>
          </div>
        </div>

        {/* Persistence and Action Buttons */}
        <div className="flex items-center gap-2">
          {activeMode === 'schedule' && disciplines.length > 0 && (
            <button
              type="button"
              onClick={handleLoadIntoActiveApp}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              title="Carregar esta grade no seu workspace de aluno"
            >
              <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
              <span>Ver no App</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportJsonFile}
            className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Baixar arquivo JSON físico"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleSaveToProject}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar no Projeto</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div ref={contentAreaRef} className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6 pb-24">

        {/* Notifications */}
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 p-3.5 rounded-r-lg flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-rose-900 dark:text-rose-200 text-xs sm:text-sm">Configuração ou Execução</h4>
              <p className="text-xs text-rose-800 dark:text-rose-300">{errorMsg}</p>
              {errorMsg.includes('GEMINI_API_KEY') && (
                <div className="mt-2 text-xs text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded border border-rose-200 dark:border-rose-900/50 space-y-1">
                  <div className="font-semibold text-rose-700 dark:text-rose-400">Como resolver:</div>
                  <div>1. Obtenha sua chave gratuita em: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline font-semibold">Google AI Studio</a></div>
                  <div>2. Abra o arquivo <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">.env</code> na raiz do projeto e configure:</div>
                  <pre className="p-1.5 bg-slate-900 text-emerald-400 rounded font-mono text-[11px]">GEMINI_API_KEY=sua_chave_aqui</pre>
                  <div>3. Reinicie o servidor com <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">npm run dev</code>.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 p-3.5 rounded-r-lg flex items-start gap-3 shadow-xs">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm">Sucesso</h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Banner if document has a different course from current active */}
        {detectedDifferentCourse && (
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <span className="font-bold text-indigo-950 dark:text-indigo-100">
                  Novo curso detectado no documento: "{detectedDifferentCourse.name} ({detectedDifferentCourse.shortName})"
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  O curso selecionado atualmente é "{courseName} ({courseShortName})". Deseja cadastrar o documento como um novo curso?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNewCourse(true);
                  setCourseName(detectedDifferentCourse.name);
                  setCourseShortName(detectedDifferentCourse.shortName);
                  setDetectedDifferentCourse(null);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-colors"
              >
                Cadastrar como Novo Curso
              </button>
              <button
                type="button"
                onClick={() => setDetectedDifferentCourse(null)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-medium text-xs hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Manter Atual
              </button>
            </div>
          </div>
        )}

        {/* SECTION 1: Course Selection & Workspace Definition */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Curso Ativo:
              </span>
              
              {!isCreatingNewCourse ? (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCourseId}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setIsCreatingNewCourse(true);
                        setCourseName('Novo Curso Acadêmico');
                        setCourseShortName('NOVO');
                        setCurriculumSubjects([]);
                        setDisciplines([]);
                      } else {
                        setSelectedCourseId(e.target.value);
                      }
                    }}
                    className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.shortName})
                      </option>
                    ))}
                    <option value="__new__">+ Cadastrar Novo Curso com IA...</option>
                  </select>

                  {isLoadingCourse && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}

                  {selectedCourseId && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteCourseModal(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg transition-colors cursor-pointer shadow-2xs"
                      title={`Excluir o curso ${courseName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Excluir Curso</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 px-2 py-1 rounded-lg">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">Novo Curso</span>
                  </div>

                  <input
                    type="text"
                    placeholder="Nome Oficial do Curso (ex: Medicina Veterinária)"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 w-52 sm:w-64"
                    title="Nome oficial do curso"
                  />
                  <input
                    type="text"
                    placeholder="Sigla (ex: MVET)"
                    value={courseShortName}
                    onChange={(e) => setCourseShortName(e.target.value)}
                    className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 uppercase text-center"
                    title="Sigla do curso"
                  />
                  {scheduleTitle && (
                    <input
                      type="text"
                      placeholder="Título da Grade (ex: Horário 2026.1)"
                      value={scheduleTitle}
                      onChange={(e) => setScheduleTitle(e.target.value)}
                      className="hidden lg:inline-block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 w-60"
                      title="Título descritivo da grade semestral"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewCourse(false);
                      if (courses.length > 0) setSelectedCourseId(courses[0].id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Cancelar cadastro de novo curso"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start md:self-auto">
              <button
                type="button"
                onClick={() => setActiveMode('schedule')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'schedule'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Horário Semestral ({disciplines.length} turmas)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('curriculum')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'curriculum'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Catálogo Curricular ({curriculumSubjects.length} matérias)</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: AI Extraction Ingestion Pipeline */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-50">
                  Importador com Inteligência Artificial (Google Gemini)
                </h3>
                <p className="text-xs text-slate-400">
                  {activeMode === 'curriculum' 
                    ? 'Extração do Projeto Pedagógico do Curso (PPC), matriz de disciplinas e ementas'
                    : 'Extração de qualquer PDF de horário com turmas, dias da semana e fatias de aula'}
                </p>
              </div>
            </div>

            {/* Gemini Model Selector with verified stable options */}
            <div className="flex items-center gap-2 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1 px-2 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
              >
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (Padrão)</option>
                <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                <option value="gemini-3.6-flash">Gemini 3.6 Flash (Mais Rápido & Estável)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              </select>
            </div>
          </div>

          {/* Curriculum Extraction Type Selector (Tree vs Linear) */}
          {activeMode === 'curriculum' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div 
                onClick={() => setCurriculumExtractType('tree')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  curriculumExtractType === 'tree'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500/80 shadow-xs'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  curriculumExtractType === 'tree'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  <Network className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                      🌳 Matriz em Árvore & Pré-Requisitos
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                      Multimodal
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Grafo 1º-9º período, setas de dependência, ACEx, ACC, optativas e suporte a perfis curriculares (PDF + Imagem).
                  </p>
                </div>
              </div>

              <div 
                onClick={() => setCurriculumExtractType('linear')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  curriculumExtractType === 'linear'
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-500/80 shadow-xs'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  curriculumExtractType === 'linear'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                      📄 Catálogo Linear (Ementas)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Extração direta tabular de disciplinas com ementas completas e cargas horárias sem montagem de árvore.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Toggle between Upload Files and Raw Text Input */}
          <div className="flex items-center gap-4 text-xs font-semibold pt-1">
            <button
              type="button"
              onClick={() => setInputMode('pdf')}
              className={`pb-1 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                inputMode === 'pdf' 
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>
                Upload de Arquivos (PDF / Imagens)
                {selectedFiles.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                    {selectedFiles.length}
                  </span>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`pb-1 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                inputMode === 'text' 
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Colar Texto / Ementas / Tabelas</span>
            </button>
          </div>

          {/* Multi-file Upload / Drag & Drop Area */}
          {inputMode === 'pdf' ? (
            <div className="space-y-3">
              {selectedFiles.length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <Layers className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                        Arquivos Anexados para Análise ({selectedFiles.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isExtracting}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Mais</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClearSelectedFiles}
                        disabled={isExtracting}
                        className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  {/* Files Grid Chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {selectedFiles.map((file, idx) => {
                      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
                      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
                      const sizeKb = Math.round(file.size / 1024);
                      const displaySize = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

                      return (
                        <div 
                          key={idx}
                          className="flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-2 rounded-lg shrink-0 ${
                              isPdf 
                                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400' 
                                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {isPdf ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate" title={file.name}>
                                {file.name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <span>{displaySize}</span>
                                <span>•</span>
                                <span className={`font-semibold uppercase ${isPdf ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                  {isPdf ? 'PDF PPC' : 'Imagem Fluxo'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedFile(idx)}
                            disabled={isExtracting}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition-colors cursor-pointer shrink-0"
                            title="Remover este arquivo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Multimodal Hint */}
                  {activeMode === 'curriculum' && curriculumExtractType === 'tree' && (
                    <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-3 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold">Ingestão Multimodal Inteligente:</span>
                        <p className="text-[11px] text-indigo-800 dark:text-indigo-400 leading-relaxed">
                          Ao anexar o PDF do Projeto Pedagógico (PPC) com a tabela de códigos e a Imagem do Fluxograma (com as setas visuais), o modelo Google Gemini correlacionará ambos os arquivos para mapear o fluxo 1º ao 9º período e todas as dependências com máxima precisão.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Extraction Trigger Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <span className="text-xs text-slate-400">
                      Modelo ativo: <strong className="text-slate-600 dark:text-slate-300">{selectedModel}</strong>
                    </span>

                    <button
                      type="button"
                      disabled={isExtracting}
                      onClick={() => executeAiExtraction({ files: selectedFiles })}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processando Documentos...</span>
                        </>
                      ) : (
                        <>
                          <BrainCircuit className="w-4 h-4" />
                          <span>
                            {activeMode === 'curriculum' 
                              ? (curriculumExtractType === 'tree'
                                  ? `Extrair Matriz em Árvore com IA (${selectedFiles.length} ${selectedFiles.length === 1 ? 'arquivo' : 'arquivos'})`
                                  : `Extrair Catálogo Linear com IA (${selectedFiles.length} ${selectedFiles.length === 1 ? 'arquivo' : 'arquivos'})`)
                              : `Extrair Horários com IA (${selectedFiles.length} ${selectedFiles.length === 1 ? 'arquivo' : 'arquivos'})`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (!isExtracting) fileInputRef.current?.click();
                  }}
                  className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                    dragActive 
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' 
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100/50 dark:bg-slate-950 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2 p-3 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                      {activeMode === 'curriculum'
                        ? (curriculumExtractType === 'tree'
                            ? 'Solte aqui os arquivos da Matriz (PDF do PPC e/ou Imagem do Fluxograma)'
                            : 'Solte o PDF do PPC / Catálogo de Disciplinas aqui')
                        : 'Solte o PDF de Horário Letivo Semestral aqui'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ou clique aqui para selecionar arquivos do computador (permite anexar múltiplos)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Selecionar Arquivos (PDF / Imagens)
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span>Formatos suportados: <strong>PDF, PNG, JPG, WEBP</strong></span>
                    <span>•</span>
                    <span>Multi-arquivo habilitado</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                rows={5}
                placeholder={
                  activeMode === 'curriculum'
                    ? "Cole aqui as ementas, nomes de disciplinas, cargas horárias e pré-requisitos copiados do documento..."
                    : "Cole aqui as linhas ou tabelas de horários, turmas, professores e salas..."
                }
                value={rawTextInput}
                onChange={(e) => setRawTextInput(e.target.value)}
                className="w-full text-xs font-mono p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isExtracting || !rawTextInput.trim()}
                  onClick={() => executeAiExtraction({ text: rawTextInput })}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Extrair com Inteligência Artificial</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Review & Manipulation (Table, Visual Grid, JSON) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          
          <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReviewTab('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reviewTab === 'table'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                📋 Lista / Tabela
              </button>

              {activeMode === 'curriculum' && (
                <button
                  type="button"
                  onClick={() => setReviewTab('tree')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    reviewTab === 'tree'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-700'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>🌳 Árvore & Pré-Requisitos</span>
                  {extractedTreeSubjects.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                      {extractedTreeSubjects.length}
                    </span>
                  )}
                </button>
              )}

              {activeMode === 'schedule' && (
                <button
                  type="button"
                  onClick={() => setReviewTab('visual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    reviewTab === 'visual'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  📅 Grade Semanal (Visual)
                </button>
              )}

              <button
                type="button"
                onClick={() => setReviewTab('json')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reviewTab === 'json'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Editor JSON</span>
                {schemaValidation.isValid ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Schema Válido" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-500" title="Pendências no Schema" />
                )}
              </button>
            </div>

            {/* Search and Period filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por nome ou código..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 pr-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none w-44 sm:w-56"
                />
              </div>

              {/* Profile selector if activeProfiles.length > 0 */}
              {activeProfiles.length > 0 && (
                <select
                  value={filterProfile}
                  onChange={(e) => setFilterProfile(e.target.value)}
                  className="py-1 px-2 text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800 rounded-lg focus:outline-none cursor-pointer"
                  title="Filtrar por Perfil Curricular / Matriz"
                >
                  <option value="all">Todos Perfis ({activeProfiles.length})</option>
                  {activeProfiles.map(p => (
                    <option key={p} value={p}>Perfil: {p}</option>
                  ))}
                </select>
              )}

              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="py-1 px-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Todos Períodos</option>
                {Array.from({ length: 9 }, (_, i) => (
                  <option key={i + 1} value={(i + 1).toString()}>
                    {i + 1}º Período
                  </option>
                ))}
                <option value="Optativa">Optativas</option>
              </select>

              <button
                type="button"
                onClick={activeMode === 'curriculum' ? handleAddBlankCurriculumSubject : handleAddBlankScheduleDiscipline}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold hover:opacity-90 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nova Disciplina</span>
              </button>
            </div>
          </div>

          {/* TAB 1: TABLE */}
          {reviewTab === 'table' && (
            <div className="p-4 sm:p-6 space-y-4">
              {/* Profile Quick Pill Filter Bar */}
              {activeProfiles.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase px-1">
                    Filtrar Perfil:
                  </span>
                  <button
                    type="button"
                    onClick={() => setFilterProfile('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterProfile === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Todos ({activeMode === 'curriculum' ? curriculumSubjects.length : disciplines.length})
                  </button>
                  {activeProfiles.map(p => {
                    const count = (activeMode === 'curriculum' ? curriculumSubjects : disciplines).filter(x => x.profile === p).length;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFilterProfile(p)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          filterProfile === p
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span>Perfil {p}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filterProfile === p ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {/* CURRICULUM SUBJECTS TABLE */}
              {activeMode === 'curriculum' ? (
                <div className="overflow-x-auto">
                  {filteredCurriculum.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs sm:text-sm">
                      Nenhuma disciplina encontrada no catálogo curricular. Use a extração com IA ou adicione manualmente.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-3">Código</th>
                          <th className="py-2.5 px-3">Disciplina</th>
                          <th className="py-2.5 px-3">Período</th>
                          <th className="py-2.5 px-3">Tipo</th>
                          <th className="py-2.5 px-3">C.H. / Créditos</th>
                          <th className="py-2.5 px-3">Pré-requisitos</th>
                          <th className="py-2.5 px-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredCurriculum.map((sub, idx) => {
                          const realIndex = curriculumSubjects.indexOf(sub);
                          return (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-3 font-mono font-semibold text-slate-600 dark:text-slate-300">
                                {sub.code || '-'}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="font-bold text-slate-900 dark:text-slate-100">{sub.name}</div>
                                  {sub.profile && (
                                    <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded font-semibold text-[10px] shrink-0 font-mono">
                                      {sub.profile}
                                    </span>
                                  )}
                                </div>
                                {sub.ementa && (
                                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                    {sub.ementa}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium text-[10px]">
                                  {sub.period ? `${sub.period}º Período` : 'Optativa'}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                  sub.type?.toLowerCase().includes('obrigat')
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                                }`}>
                                  {sub.type || 'Obrigatório'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                                {sub.workload?.total || 60}h ({sub.credits || 4} cr)
                              </td>
                              <td className="py-3 px-3 text-slate-500">
                                {sub.prerequisites && sub.prerequisites.length > 0 ? (
                                  <span className="text-[11px]">
                                    {sub.prerequisites.map(p => p.code).join(', ')}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">-</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditCurriculum(realIndex, sub)}
                                    className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded transition-colors cursor-pointer"
                                    title="Editar disciplina"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCurriculumItem(realIndex)}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors cursor-pointer"
                                    title="Excluir disciplina"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                /* SCHEDULE DISCIPLINES TABLE */
                <div className="overflow-x-auto">
                  {filteredSchedule.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs sm:text-sm">
                      Nenhuma turma encontrada no quadro de horários. Use a extração com IA ou adicione manualmente.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-3">Código</th>
                          <th className="py-2.5 px-3">Disciplina / Turma</th>
                          <th className="py-2.5 px-3">Período</th>
                          <th className="py-2.5 px-3">Professor(a)</th>
                          <th className="py-2.5 px-3">Horários Semanais</th>
                          <th className="py-2.5 px-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredSchedule.map((disc, idx) => {
                          const realIndex = disciplines.indexOf(disc);
                          return (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-3 font-mono font-semibold text-slate-600 dark:text-slate-300">
                                {disc.code || '-'}
                              </td>
                              <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>{disc.name}</span>
                                  {disc.profile && (
                                    <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded font-semibold text-[10px] shrink-0 font-mono">
                                      {disc.profile}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium text-[10px]">
                                  {disc.period === 0 ? 'Optativa' : `${disc.period}º Período`}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                                {disc.professor || '-'}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex flex-wrap gap-1">
                                  {disc.sessions.map((s, sidx) => (
                                    <span 
                                      key={sidx} 
                                      className="inline-block text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded"
                                    >
                                      {DAYS.find(d => d.id === s.day)?.name}: {s.time}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditSchedule(realIndex, disc)}
                                    className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded transition-colors cursor-pointer"
                                    title="Editar horários da turma"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteScheduleItem(realIndex)}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors cursor-pointer"
                                    title="Excluir turma"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: TREE MATRIX REVIEW & DEPENDENCY GRAPH */}
          {reviewTab === 'tree' && activeMode === 'curriculum' && (
            <div className="p-4 sm:p-6 space-y-5">
              {/* Profile Selector & Quick Metadata Summary Bar */}
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 dark:border-slate-800 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <GitFork className="w-3.5 h-3.5 text-emerald-500" />
                      Perfil Curricular:
                    </span>

                    {courseProfiles.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {courseProfiles.map(p => {
                          const isCurrent = extractedProfile?.id === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectProfileToReview(p.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isCurrent
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              {isCurrent && <Check className="w-3.5 h-3.5" />}
                              <span>{p.id} - {p.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                isCurrent ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                              }`}>
                                {p.subjects?.length || 0} mat.
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {extractedProfile ? `${extractedProfile.id} - ${extractedProfile.name}` : 'Perfil Padrão'}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleAddNewProfile}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors cursor-pointer"
                      title="Criar um novo perfil curricular para este curso"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Novo Perfil</span>
                    </button>
                  </div>

                  {extractedProfile && (
                    <button
                      type="button"
                      onClick={handleStartEditProfileMeta}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Editar Metadados do Perfil</span>
                    </button>
                  )}
                </div>

                {/* Profile Stat Badges Grid */}
                {extractedProfile && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                    <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Total do Curso</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                        {extractedProfile.totalHours}h
                      </div>
                      <div className="text-[10px] text-slate-400">Vigência: {extractedProfile.validFromSemester || '2026.1'}</div>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                      <div className="text-[10px] uppercase font-bold text-indigo-500">Obrigatórias</div>
                      <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                        {extractedProfile.mandatoryHours || (extractedProfile.totalHours - (extractedProfile.acexHours + extractedProfile.accHours + extractedProfile.optativeHours))}h
                      </div>
                      <div className="text-[10px] text-slate-400">Módulos compulsórios</div>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                      <div className="text-[10px] uppercase font-bold text-amber-500">Extensão (ACEx)</div>
                      <div className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                        {extractedProfile.acexHours}h
                      </div>
                      <div className="text-[10px] text-slate-400">Extensão universitária</div>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                      <div className="text-[10px] uppercase font-bold text-sky-500">Compl. (ACC)</div>
                      <div className="text-sm font-bold text-sky-600 dark:text-sky-400 font-mono mt-0.5">
                        {extractedProfile.accHours}h
                      </div>
                      <div className="text-[10px] text-slate-400">Atividades acadêmicas</div>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                      <div className="text-[10px] uppercase font-bold text-emerald-500">Optativas</div>
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                        {extractedProfile.optativeHours}h
                      </div>
                      <div className="text-[10px] text-slate-400">Carga optativa mín.</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tree Toolbar: Filter Period, Search, Add Node, Open Full Flowchart */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Period Pills Filter */}
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedTreePeriod('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      selectedTreePeriod === 'all'
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    Todos ({extractedTreeSubjects.length})
                  </button>

                  {Array.from({ length: 9 }, (_, i) => {
                    const pNum = i + 1;
                    const count = extractedTreeSubjects.filter(s => s.period === pNum).length;
                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => setSelectedTreePeriod(pNum)}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                          selectedTreePeriod === pNum
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{pNum}ºP</span>
                        {count > 0 && <span className="text-[10px] opacity-80">({count})</span>}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setSelectedTreePeriod(0)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      selectedTreePeriod === 0
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    Optativas
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar na árvore..."
                      value={treeSearch}
                      onChange={(e) => setTreeSearch(e.target.value)}
                      className="pl-8 pr-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none w-36 sm:w-48"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBlankTreeNode}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold hover:opacity-90 transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova Matéria</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setView('matriz')}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
                    title="Ver o fluxograma interativo com linhas de conexão SVG"
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Ver Fluxograma SVG</span>
                  </button>
                </div>
              </div>

              {/* Tree Subjects Grouped by Period */}
              {extractedTreeSubjects.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                    <Network className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      Nenhuma disciplina em árvore carregada para este perfil
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Use o extrator com IA anexando os arquivos da matriz (PDF do PPC e/ou imagem do fluxograma) para gerar o grafo completo com pré-requisitos automaticamente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBlankTreeNode}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    + Adicionar Primeira Disciplina
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Array.from({ length: 10 }, (_, i) => i)
                    .filter(periodNum => selectedTreePeriod === 'all' || selectedTreePeriod === periodNum)
                    .map(periodNum => {
                      const subjectsInPeriod = extractedTreeSubjects.filter(s => {
                        const matchesPeriod = s.period === periodNum;
                        const matchesSearch = !treeSearch || 
                          s.name.toLowerCase().includes(treeSearch.toLowerCase()) || 
                          (s.code && s.code.toLowerCase().includes(treeSearch.toLowerCase())) ||
                          s.id.toLowerCase().includes(treeSearch.toLowerCase());
                        return matchesPeriod && matchesSearch;
                      });

                      if (subjectsInPeriod.length === 0 && selectedTreePeriod === 'all') {
                        return null;
                      }

                      const periodHours = subjectsInPeriod.reduce((acc, s) => acc + (s.hours || 0), 0);

                      return (
                        <div key={periodNum} className="space-y-3">
                          {/* Period Section Header */}
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${periodNum === 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                {periodNum === 0 ? 'Disciplinas Optativas' : `${periodNum}º Período`}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                ({subjectsInPeriod.length} {subjectsInPeriod.length === 1 ? 'matéria' : 'matérias'} • {periodHours} horas)
                              </span>
                            </div>
                          </div>

                          {/* Subjects Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                            {subjectsInPeriod.map((node) => {
                              const originalIdx = extractedTreeSubjects.indexOf(node);
                              
                              // Dependents in this tree (nodes that have this node as a prerequisite)
                              const dependents = extractedTreeSubjects.filter(other => 
                                other.prereqs && (other.prereqs.includes(node.id) || (node.code && other.prereqs.includes(node.code)))
                              );

                              // Category badge color
                              const typeColor = node.type === 'computacao'
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/70'
                                : node.type === 'basico'
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                : node.type === 'optativa'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70'
                                : node.type === 'estagio'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70'
                                : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/70';

                              return (
                                <div
                                  key={node.id}
                                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all space-y-3 flex flex-col justify-between group"
                                >
                                  <div className="space-y-2">
                                    {/* Badges Bar */}
                                    <div className="flex items-center justify-between gap-1 text-[10px]">
                                      <div className="flex items-center gap-1.5 font-mono font-bold">
                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200 rounded-md">
                                          {node.code || node.id}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                                          {node.hours}h
                                        </span>
                                      </div>

                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${typeColor} uppercase tracking-wider`}>
                                        {node.type || 'geral'}
                                      </span>
                                    </div>

                                    {/* Name */}
                                    <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-snug">
                                      {node.name}
                                    </h5>

                                    {/* Prerequisites List Chips */}
                                    <div className="space-y-1 pt-1">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                        <span>Pré-requisitos ({node.prereqs.length})</span>
                                        {node.prereqs.length === 0 && (
                                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-normal">Entrada</span>
                                        )}
                                      </div>

                                      {node.prereqs.length === 0 ? (
                                        <div className="text-[11px] text-slate-400 italic">
                                          Sem pré-requisitos
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap gap-1">
                                          {node.prereqs.map((prereqCode, pidx) => {
                                            const targetNode = extractedTreeSubjects.find(s => s.id === prereqCode || s.code === prereqCode);
                                            return (
                                              <span
                                                key={pidx}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 rounded text-[10px] font-medium"
                                                title={targetNode ? `${targetNode.code || targetNode.id} - ${targetNode.name}` : prereqCode}
                                              >
                                                <span className="font-mono font-bold">← {targetNode?.code || prereqCode}</span>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>

                                    {/* Dependents List (Liberador de) */}
                                    {dependents.length > 0 && (
                                      <div className="space-y-1 pt-0.5 border-t border-slate-100 dark:border-slate-700/50">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                          Libera para ({dependents.length})
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                          {dependents.map((depNode) => (
                                            <span
                                              key={depNode.id}
                                              className="inline-flex items-center px-2 py-0.5 bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 rounded text-[10px] font-mono"
                                              title={`${depNode.code || depNode.id} - ${depNode.name} (${depNode.period}ºP)`}
                                            >
                                              → {depNode.code || depNode.id}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions Bar */}
                                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditTreeNode(originalIdx, node)}
                                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-md transition-colors cursor-pointer"
                                      title="Editar disciplina e pré-requisitos"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>Editar</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTreeNode(originalIdx)}
                                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
                                      title="Excluir disciplina da árvore"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VISUAL SCHEDULE GRID (Restored) */}
          {reviewTab === 'visual' && activeMode === 'schedule' && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Espelho semanal das turmas para conferência visual de choques e alocação de salas antes de persistir.
                </p>
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  {activeProfiles.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-500">Filtrar perfil:</span>
                      <select
                        value={filterProfile}
                        onChange={(e) => setFilterProfile(e.target.value)}
                        className="p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-semibold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
                      >
                        <option value="all">Todos os Perfis ({activeProfiles.length})</option>
                        {activeProfiles.map(p => (
                          <option key={p} value={p}>Perfil: {p}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-500">Filtrar período:</span>
                    <select
                      value={selectedPreviewPeriod}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedPreviewPeriod(val === 'all' ? 'all' : Number(val));
                      }}
                      className="p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-medium focus:outline-none cursor-pointer"
                    >
                      <option value="all">Exibir todos</option>
                      {Array.from({ length: 9 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}º Período</option>
                      ))}
                      <option value={0}>Optativas</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full border-collapse text-left min-w-[750px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <th className="p-3 w-32 border-r border-slate-200 dark:border-slate-800">Horário</th>
                      {DAYS.map(d => (
                        <th key={d.id} className="p-3 text-center border-r last:border-r-0 border-slate-200 dark:border-slate-800">{d.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {availableTimeSlots.map(slot => (
                      <tr key={slot} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10">
                        <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 whitespace-nowrap">
                          {slot}
                        </td>
                        {DAYS.map(day => {
                          const matched = disciplines.filter(disc => {
                            if (selectedPreviewPeriod !== 'all' && disc.period !== selectedPreviewPeriod) {
                              return false;
                            }
                            if (filterProfile !== 'all') {
                              const matchProfile = disc.profile === filterProfile || (!disc.profile && filterProfile === 'Sem Perfil');
                              if (!matchProfile) return false;
                            }
                            return disc.sessions?.some(s => s.day === day.id && s.time === slot);
                          });

                          return (
                            <td key={day.id} className="p-2 align-top border-r last:border-r-0 border-slate-200 dark:border-slate-800 min-h-[80px]">
                              <div className="space-y-1.5 min-h-[60px]">
                                {matched.map((disc, dIdx) => (
                                  <div 
                                    key={dIdx} 
                                    onClick={() => handleStartEditSchedule(disciplines.indexOf(disc), disc)}
                                    className="p-1.5 rounded-lg text-[10px] bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 shadow-xs cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-xs transition-all group"
                                    title="Clique para editar horários e dados desta turma no modal"
                                  >
                                    <div className="font-bold text-indigo-900 dark:text-indigo-200 leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                      {disc.name}
                                    </div>
                                    <div className="text-slate-500 dark:text-slate-400 text-[9px] mt-0.5 truncate">
                                      {disc.professor || "-"}
                                    </div>
                                    <div className="flex justify-between items-center mt-1 text-[8px] font-mono text-indigo-600 dark:text-indigo-400">
                                      <div className="flex items-center gap-1 truncate mr-1">
                                        <span>{disc.code || 'TURMA'}</span>
                                        {disc.profile && (
                                          <span className="px-1 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 text-[7px] font-bold shrink-0">
                                            {disc.profile}
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-bold shrink-0">{disc.period === 0 ? 'Opt' : `${disc.period}ºP`}</span>
                                    </div>
                                  </div>
                                ))}
                                {matched.length === 0 && (
                                  <div className="h-full flex items-center justify-center text-[10px] text-slate-300 dark:text-slate-700 font-mono">
                                    -
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: JSON CODE EDITOR */}
          {reviewTab === 'json' && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                schemaValidation.isValid
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300'
              }`}>
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    {schemaValidation.isValid ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>JSON Conforme com o Schema Oficial</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Avisos no Schema ({schemaValidation.issues.length})</span>
                      </>
                    )}
                  </div>
                  {!schemaValidation.isValid && (
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90 pl-1">
                      {schemaValidation.issues.slice(0, 3).map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyJsonEdit}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Aplicar do JSON</span>
                  </button>
                </div>
              </div>

              {jsonError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300 font-mono">
                  {jsonError}
                </div>
              )}

              <div className="relative">
                <textarea
                  rows={18}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="w-full font-mono text-xs p-4 bg-slate-900 text-emerald-400 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
                  spellCheck={false}
                />
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
