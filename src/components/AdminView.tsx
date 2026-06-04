import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, BrainCircuit, Sparkles, Loader2, Save, Trash2, 
  Plus, Edit3, Check, X, FileJson, ArrowRightLeft, BookOpen, AlertCircle,
  Copy, Download, Calendar, UploadCloud, FileText, CheckCircle, HelpCircle
} from 'lucide-react';
import { Discipline, Session, DayOfWeek } from '../types';

interface AdminViewProps {
  setView: (view: 'home' | 'schedule' | 'matriz' | 'disciplines' | 'admin') => void;
  setDisciplinesList: (disciplines: Discipline[]) => void;
  setGradeTitle: (title: string) => void;
}

interface CustomCourse {
  id: string;
  title: string;
  disciplines: Discipline[];
  updated_at: string;
}

export function AdminView({ setView, setDisciplinesList, setGradeTitle }: AdminViewProps) {
  // Input states
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [isExtracting, setIsExtracting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extracted target states
  const [extractedTitle, setExtractedTitle] = useState('');
  const [extractedDisciplines, setExtractedDisciplines] = useState<Discipline[]>([]);
  const [reviewTab, setReviewTab] = useState<'table' | 'visual' | 'json'>('table');
  const [selectedPreviewPeriod, setSelectedPreviewPeriod] = useState<number | 'all'>('all');

  // Editing discipline states
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editProfessor, setEditProfessor] = useState('');
  const [editPeriod, setEditPeriod] = useState(0);
  const [editSessions, setEditSessions] = useState<Session[]>([]);

  // Session adder helper (inside the edit card)
  const [newSessionDay, setNewSessionDay] = useState<DayOfWeek>(1);
  const [newSessionTime, setNewSessionTime] = useState<string>('18:30 - 20:10');

  // Manual new discipline creation helper
  const [newDiscipline, setNewDiscipline] = useState({
    code: '',
    name: '',
    professor: '',
    period: 1
  });

  // Communication messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [savedCourses, setSavedCourses] = useState<CustomCourse[]>([]);

  // UI state
  const [copied, setCopied] = useState(false);

  // Standard schedules configured in the app constants
  const daysOfWeek = [
    { id: 1, name: 'Segunda' },
    { id: 2, name: 'Terça' },
    { id: 3, name: 'Quarta' },
    { id: 4, name: 'Quinta' },
    { id: 5, name: 'Sexta' },
    { id: 6, name: 'Sábado' }
  ];

  const standardSlots = [
    '14:00 - 16:00',
    '16:00 - 18:00',
    '18:30 - 20:10',
    '20:10 - 21:50'
  ];

  // Fetch custom courses persisted on the server
  const fetchCustomCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        setSavedCourses(data.courses || []);
      }
    } catch (err) {
      console.error('Failed to load custom courses', err);
    }
  };

  useEffect(() => {
    fetchCustomCourses();
  }, []);

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith('.pdf')) {
        await processPdfFile(file);
      } else {
        setErrorMsg("Por favor, selecione apenas arquivos em formato PDF.");
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processPdfFile(e.target.files[0]);
    }
  };

  // Core processing for PDF scheduling sheets
  const processPdfFile = async (file: File) => {
    setIsExtracting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      
      const base64Data = await base64Promise;

      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          mimeType: file.type || "application/pdf",
          fileName: file.name,
          model: selectedModel
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Falha ao extrair PDF.");
      }

      const data = await response.json();
      setExtractedTitle(data.title || file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "));
      setExtractedDisciplines(data.disciplines || []);
      setSuccessMsg(`Extração do PDF realizada com sucesso! ${data.disciplines?.length || 0} disciplinas estruturadas e prontas no padrão.`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro de conexão ao enviar o PDF para a inteligência artificial.");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Edit discipline methods
  const handleStartEdit = (index: number, disc: Discipline) => {
    setEditingIndex(index);
    setEditName(disc.name);
    setEditCode(disc.code || '');
    setEditProfessor(disc.professor || '-');
    setEditPeriod(disc.period === undefined ? 1 : Number(disc.period));
    setEditSessions(disc.sessions ? [...disc.sessions] : []);
  };

  const handleAddSessionToEdit = () => {
    // Check if session already added
    const alreadyExists = editSessions.some(s => s.day === newSessionDay && s.time === newSessionTime);
    if (alreadyExists) return;

    setEditSessions(prev => [...prev, { day: newSessionDay, time: newSessionTime }]);
  };

  const handleRemoveSessionFromEdit = (day: DayOfWeek, time: string) => {
    setEditSessions(prev => prev.filter(s => !(s.day === day && s.time === time)));
  };

  const handleSaveEdit = (index: number) => {
    setExtractedDisciplines(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        name: editName,
        code: editCode,
        professor: editProfessor,
        period: Number(editPeriod),
        sessions: editSessions
      };
      return updated;
    });
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  const handleDeleteDiscipline = (index: number) => {
    setExtractedDisciplines(prev => prev.filter((_, i) => i !== index));
  };

  // Add a fully customized blank/manual discipline
  const handleAddManualDiscipline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscipline.name) return;

    const newDiscObj: Discipline = {
      id: newDiscipline.code.toLowerCase().replace(/\s+/g, '-') || `man-${Date.now()}`,
      code: newDiscipline.code || 'CCMP-OP',
      name: newDiscipline.name,
      professor: newDiscipline.professor || '-',
      period: Number(newDiscipline.period),
      sessions: [
        { day: 1, time: "18:30 - 20:10" } // Appends single session template
      ]
    };

    setExtractedDisciplines(prev => [...prev, newDiscObj]);
    setNewDiscipline({ code: '', name: '', professor: '', period: 1 });
    setSuccessMsg("Nova disciplina anexada! Customize seus horários clicando em Editar.");
  };

  // Loading course into active timetable workspace
  const handleSaveToActiveWorkspace = () => {
    if (extractedDisciplines.length === 0) return;
    setDisciplinesList(extractedDisciplines);
    setGradeTitle(extractedTitle);
    
    localStorage.setItem('saved_disciplinesList', JSON.stringify(extractedDisciplines));
    localStorage.setItem('saved_gradeTitle', extractedTitle);
    
    setSuccessMsg("Timetable sincronizada no seu Workspace! Visualizando a grade.");
    setView('schedule');
  };

  // Persisting custom course permanently to the server
  const handleSaveToServerDatabase = async () => {
    if (extractedDisciplines.length === 0) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const generatedId = extractedTitle
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: generatedId || `curso-${Date.now()}`,
          title: extractedTitle,
          disciplines: extractedDisciplines
        })
      });

      if (res.ok) {
        setSuccessMsg(`A grade "${extractedTitle}" foi salva de forma permanente no servidor com sucesso!`);
        fetchCustomCourses();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao registrar recurso.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao salvar no banco de dados do servidor.");
    }
  };

  const handleLoadCustomCourse = (course: CustomCourse) => {
    setDisciplinesList(course.disciplines);
    setGradeTitle(course.title);
    
    localStorage.setItem('saved_disciplinesList', JSON.stringify(course.disciplines));
    localStorage.setItem('saved_gradeTitle', course.title);
    
    setSuccessMsg(`Grade curricular carregada: "${course.title}"`);
    setView('schedule');
  };

  const handleDeleteCustomCourseItem = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que gostaria de excluir permanentemente "${name}" do servidor?`)) return;
    try {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg("Grade curricular removida com sucesso do servidor.");
        fetchCustomCourses();
      } else {
        setErrorMsg("Erro técnico de permissão ao tentar excluir.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export physical JSON file
  const handleExportJSON = () => {
    if (extractedDisciplines.length === 0) return;
    const jsonOutput = JSON.stringify({
      title: extractedTitle,
      disciplines: extractedDisciplines
    }, null, 2);
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonOutput);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${extractedTitle.replace(/\s+/g, "_")}_grade.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Copy JSON code block to clipboard
  const handleCopyClipboard = () => {
    if (extractedDisciplines.length === 0) return;
    const jsonOutput = JSON.stringify(extractedDisciplines, null, 2);
    navigator.clipboard.writeText(jsonOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Returns CSS color for a period visual map identification
  const getPeriodBadgeColor = (period: number) => {
    switch(period) {
      case 1: return 'bg-sky-50 dark:bg-sky-950/20 text-sky-700 border border-sky-200 dark:border-sky-800';
      case 2: return 'bg-violet-50 dark:bg-violet-950/20 text-violet-700 border border-violet-200 dark:border-violet-800';
      case 3: return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border border-emerald-200 dark:border-emerald-800';
      case 4: return 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 border border-indigo-200 dark:border-indigo-800';
      case 5: return 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 border border-amber-200 dark:border-amber-800';
      case 6: return 'bg-teal-50 dark:bg-teal-950/20 text-teal-700 border border-teal-200 dark:border-teal-800';
      case 7: return 'bg-fuchsia-50 dark:bg-fuchsia-950/20 text-fuchsia-700 border border-fuchsia-200 dark:border-fuchsia-800';
      case 8: return 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 border border-rose-200 dark:border-rose-800';
      default: return 'bg-slate-50 dark:bg-slate-900 text-slate-700 border border-slate-200 dark:border-slate-800';
    }
  };

  // Generate complete system database format preview (for data.ts / json exports)
  const getOutputSystemJson = () => {
    return JSON.stringify(extractedDisciplines, null, 2);
  };

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col overflow-hidden font-sans">
      
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 shrink-0 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setView('home')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
            title="Voltar ao início"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-slate-900 dark:text-slate-50">Painel de Administração</h1>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold tracking-wide">
              PIPELINE INTELIGENTE DE PROCESSAMENTO E CONVERSÃO DE HORÁRIOS LETIVOS
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area (scrolling) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-8 pb-24">
          
          {/* Notification Messages */}
          {errorMsg && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 p-4 rounded-r-lg flex items-start gap-3 shadow-sm animate-in fade-in duration-300">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm">Houve um problema</h4>
                <p className="text-xs sm:text-sm text-rose-800 dark:text-rose-300">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 p-4 rounded-r-lg flex items-start gap-3 shadow-sm animate-in fade-in duration-300 border">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-emerald-950 dark:text-emerald-300 text-sm">Operação Concluída</h4>
                <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-200">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Section 1: Extraction Pipelines */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: Pipelines (PDF & TEXT) */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-50 text-base">Injetor de Dados Acadêmicos</h3>
                </div>
              </div>

              {/* Gemini Model Configuration Picker */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Inteligência Artificial (Modelo Gemini)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Escolha qual modelo do Gemini irá processar a extração acadêmica de suas tabelas de horários.
                  </p>
                </div>
                <select
                  id="gemini-model-selector"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-3 focus:outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                >
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (Padrão e Rápido)</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Ultra Rápido)</option>
                </select>
              </div>

              {/* PDF Extraction Pipeline */}
              <div className="space-y-4 animate-in fade-in duration-200">
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Arraste ou selecione a folha original de horários (em formato PDF). Nosso pipeline lê as células, divide os blocos de aulas longos de forma congruente e monta um JSON 100% calibrado para o gradeador.
                </p>

                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                    dragActive 
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' 
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100/50 dark:bg-slate-950 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="application/pdf"
                    onChange={handleFileSelect}
                    className="hidden" 
                  />
                  
                  {isExtracting ? (
                    <div className="space-y-3 py-4">
                      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto animate-pulse" />
                      <div className="text-center font-bold text-sm text-indigo-700 dark:text-indigo-400">
                        Processando PDF com IA Gemini...
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Aguarde. Estamos dividindo fatias de horários, agrupando as sessões por professor de forma unificada.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full">
                        <UploadCloud className="w-6 h-6 animate-bounce" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                          Solte o PDF de horário letivo aqui
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          ou clique para selecionar de seus arquivos locais
                        </p>
                      </div>
                      <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400 font-bold tracking-wider uppercase border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full">
                        Padrão UFAPE / BCC Aceito
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: persistent database resource viewer */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-50 text-base">Grades Curriculares de Servidor</h3>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  Estas coleções estão guardadas no banco de dados e estão imediatamente visíveis e disponíveis de forma nativa para qualquer usuário no painel do aplicativo.
                </p>

                {savedCourses.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 text-xs">
                    Nenhuma grade persistida no servidor até o momento.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {savedCourses.map((course) => (
                      <div 
                        key={course.id} 
                        className="p-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100/50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-lg flex items-center justify-between gap-3 group transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                            {course.title}
                          </h4>
                          <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium sm:text-xs">
                            {course.disciplines.length} disciplinas
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleLoadCustomCourse(course)}
                            title="Carregar esta grade no Workspace ativo"
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded transition-all"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomCourseItem(course.id, course.title)}
                            title="Excluir do servidor permanentemente"
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tips block */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg text-[11px] sm:text-xs space-y-1">
                <span className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> Dica de Exportação
                </span>
                <p className="text-slate-500 leading-normal">
                  Uma vez extraída a grade letiva do PDF, use a aba <strong>Código JSON Gerado</strong> para visualizar a estrutura limpa e copiar para colar como dado estático em <code>src/data.ts</code> se necessário.
                </p>
              </div>

            </div>
          </div>

          {/* Section 2: Extracted review tabs (Only shown when active) */}
          {extractedDisciplines.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs space-y-0 animate-in slide-in-from-bottom-3 duration-500">
              
              {/* Header Box */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                    PAINEL REVISOR DO PIPELINE
                  </span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={extractedTitle} 
                      onChange={(e) => setExtractedTitle(e.target.value)}
                      className="text-base sm:text-lg font-bold bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 focus:border-indigo-500 focus:outline-none py-0.5 text-slate-950 dark:text-slate-50 w-full max-w-md"
                      title="Clique para editar o título"
                    />
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-normal">
                    Fidelidade garantida: unificado ({extractedDisciplines.length} disciplinas). Edite nomes de turmas e use o painel visualizador para conferir.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={handleSaveToActiveWorkspace}
                    className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-50 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Carregar no App</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToServerDatabase}
                    className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar no Servidor</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportJSON}
                    title="Exportar arquivo JSON físico"
                    className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 transition shadow-sm bg-white dark:bg-slate-900"
                  >
                    <FileJson className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Navigation tabs within review panel */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 gap-6 bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setReviewTab('table')}
                  className={`py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all relative ${reviewTab === 'table' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'}`}
                >
                  📋 Lista de Disciplinas (Tabela)
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTab('visual')}
                  className={`py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all relative ${reviewTab === 'visual' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'}`}
                >
                  📅 Grade de Horários (Visualização)
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTab('json')}
                  className={`py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all relative ${reviewTab === 'json' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'}`}
                >
                  💻 Código JSON Gerado (Padrão)
                </button>
              </div>

              {/* Tab 1 Content: Editable Table List */}
              {reviewTab === 'table' && (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 animate-in fade-in duration-200">
                  
                  {/* Discipline Editing Card Panel */}
                  {editingIndex !== null && (
                    <div className="p-6 bg-slate-100/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/80 space-y-4 animate-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                          <Edit3 className="w-4 h-4" /> Editando: {editName || "Disciplina"}
                        </h4>
                        <button 
                          type="button"
                          onClick={handleCancelEdit}
                          className="p-1 text-slate-400 hover:bg-slate-250 dark:hover:bg-slate-800 rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Código</label>
                          <input 
                            type="text" 
                            className="w-full text-xs p-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 focus:outline-none"
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Nome Limpo da Disciplina e Turma</label>
                          <input 
                            type="text" 
                            className="w-full text-xs p-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 focus:outline-none"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Período</label>
                          <select 
                            className="w-full text-xs p-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 focus:outline-none"
                            value={editPeriod}
                            onChange={(e) => setEditPeriod(Number(e.target.value))}
                          >
                            {Array.from({ length: 11 }, (_, i) => (
                              <option key={i} value={i}>{i === 0 ? "Optativa / Eletiva" : `${i}º Período`}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-1">
                          <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Professor</label>
                          <input 
                            type="text" 
                            className="w-full text-xs p-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 focus:outline-none"
                            value={editProfessor}
                            onChange={(e) => setEditProfessor(e.target.value)}
                          />
                        </div>
                        
                        {/* Nested Class Session Manager */}
                        <div className="md:col-span-3 space-y-2">
                          <label className="block text-[11px] font-bold text-slate-400 uppercase">
                            Aulas e Horários Congruentes ({editSessions.length})
                          </label>
                          
                          <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg min-h-[38px] items-center">
                            {editSessions.length === 0 ? (
                              <span className="text-[10px] text-slate-400 pl-1">Sem aulas registradas para esta disciplina. Adicione abaixo.</span>
                            ) : (
                              editSessions.map((session, sidx) => (
                                <span 
                                  key={sidx} 
                                  className="inline-flex items-center gap-1 text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md"
                                >
                                  {daysOfWeek.find(d => d.id === session.day)?.name || 'Sem.'}: {session.time}
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveSessionFromEdit(session.day, session.time)}
                                    className="p-0.5 text-indigo-400 hover:text-rose-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full shrink-0"
                                    title="Excluir horário"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))
                            )}
                          </div>

                          {/* Quick session adder control */}
                          <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
                            <select 
                              className="text-[11px] p-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 focus:outline-none"
                              value={newSessionDay}
                              onChange={(e) => setNewSessionDay(Number(e.target.value) as DayOfWeek)}
                            >
                              {daysOfWeek.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>

                            <select 
                              className="text-[11px] p-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 focus:outline-none flex-1"
                              value={newSessionTime}
                              onChange={(e) => setNewSessionTime(e.target.value)}
                            >
                              {standardSlots.map(slot => (
                                <option key={slot} value={slot}>{slot}</option>
                              ))}
                            </select>

                            <button 
                              type="button"
                              onClick={handleAddSessionToEdit}
                              className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 font-bold rounded text-white text-[11px] flex items-center justify-center gap-1 hover:opacity-90 shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Acoplar Horário</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(editingIndex)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 flex items-center gap-1"
                        >
                          <Check className="w-4 h-4" />
                          <span>Salvar Modificações</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Standard table representation */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[750px]">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/20 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="p-4 pl-6">Código acadêmico</th>
                          <th className="p-4">Nome da Disciplina (Turma)</th>
                          <th className="p-4">Período</th>
                          <th className="p-4">Professor</th>
                          <th className="p-4">Horários Letivos Extrapolados</th>
                          <th className="p-4 text-center w-24">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs sm:text-sm">
                        {extractedDisciplines.map((disc, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors">
                            <td className="p-4 pl-6 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                              {disc.code || "CCMP-OP"}
                            </td>
                            <td className="p-4 font-bold text-slate-900 dark:text-slate-50">
                              {disc.name}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              {disc.period === 0 ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-450 border border-amber-200/50 rounded-full">Optativa</span>
                              ) : (
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getPeriodBadgeColor(disc.period)}`}>
                                  {disc.period}ª Período
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-slate-600 dark:text-slate-300 font-semibold">
                              {disc.professor || "-"}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {disc.sessions && disc.sessions.length > 0 ? (
                                  disc.sessions.map((sess, sidx) => (
                                    <span key={sidx} className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                                      {daysOfWeek.find(d => d.id === sess.day)?.name.substring(0,3)}: {sess.time}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-rose-500 font-semibold">Sem horários!</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(idx, disc)}
                                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                                  title="Editar disciplina e horários"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDiscipline(idx)}
                                  className="p-1.5 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition"
                                  title="Remover do roster"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Manual fast insert form */}
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-3">
                    <span className="text-[11px] font-bold text-slate-400 shrink-0 uppercase tracking-wider flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5 text-indigo-500" /> Inclusão Manual Rápida:
                    </span>
                    <form onSubmit={handleAddManualDiscipline} className="w-full flex flex-col md:flex-row items-center gap-3">
                      <input
                        type="text"
                        placeholder="Cód (ex: CCMP1111)"
                        value={newDiscipline.code}
                        onChange={(e) => setNewDiscipline(p => ({ ...p, code: e.target.value }))}
                        className="w-full md:w-32 text-xs p-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 focus:outline-none text-slate-800 dark:text-slate-100 font-mono"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Nome da disciplina (ex: Engenharia de Software II)"
                        value={newDiscipline.name}
                        onChange={(e) => setNewDiscipline(p => ({ ...p, name: e.target.value }))}
                        className="w-full md:flex-1 text-xs p-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 focus:outline-none text-slate-800 dark:text-slate-100"
                      />
                      <input
                        type="text"
                        placeholder="Professor"
                        value={newDiscipline.professor}
                        onChange={(e) => setNewDiscipline(p => ({ ...p, professor: e.target.value }))}
                        className="w-full md:w-40 text-xs p-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 focus:outline-none text-slate-800 dark:text-slate-100"
                      />
                      <select
                        value={newDiscipline.period}
                        onChange={(e) => setNewDiscipline(p => ({ ...p, period: Number(e.target.value) }))}
                        className="w-full md:w-32 text-xs p-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 focus:outline-none text-slate-800 dark:text-slate-100"
                      >
                        {Array.from({ length: 11 }, (_, i) => (
                          <option key={i} value={i}>{i === 0 ? "Optativa" : `${i}º Período`}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="w-full md:w-auto px-4 py-2 bg-slate-900 border border-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-95 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Anexar</span>
                      </button>
                    </form>
                  </div>

                </div>
              )}

              {/* Tab 2 Content: Interactive Timetable Preview Map */}
              {reviewTab === 'visual' && (
                <div className="p-6 space-y-6 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        Espelho de Grade Inteira (Visual)
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Use este espelho para conferir se as aulas extraídas do PDF batem com os devidos dias antes de exportar.
                      </p>
                    </div>

                    {/* Filter class by period on the visual map */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400">FILTRAR PERÍODO:</span>
                      <select
                        value={selectedPreviewPeriod}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedPreviewPeriod(val === 'all' ? 'all' : Number(val));
                        }}
                        className="text-xs p-1.5 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none"
                      >
                        <option value="all">Sinalizar todos</option>
                        {Array.from({ length: 9 }, (_, i) => (
                          <option key={i+1} value={i+1}>{i+1}º Período</option>
                        ))}
                        <option value={0}>Optativas</option>
                      </select>
                    </div>
                  </div>

                  {/* Grid layout */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-820 bg-slate-50/50 dark:bg-slate-950/20">
                    <table className="w-full border-collapse text-left min-w-[800px]">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 text-xs font-bold text-slate-500 dark:text-slate-400">
                          <th className="p-4 w-32 border-r border-slate-200 dark:border-slate-800">HORÁRIO</th>
                          {daysOfWeek.map(d => (
                            <th key={d.id} className="p-4 text-center">{d.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                        {standardSlots.map(slot => (
                          <tr key={slot} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/5">
                            <td className="p-4 font-mono font-bold text-indigo-650 dark:text-indigo-400 border-r border-slate-200 dark:border-slate-800 bg-slate-100/20 dark:bg-slate-900/10">
                              {slot}
                            </td>
                            {daysOfWeek.map(day => {
                              // Filter disciplines having class on this day & timeslot
                              const matchedDisciplines = extractedDisciplines.filter(disc => {
                                // Match period if filter active
                                if (selectedPreviewPeriod !== 'all' && disc.period !== selectedPreviewPeriod) {
                                  return false;
                                }
                                return disc.sessions?.some(s => s.day === day.id && s.time === slot);
                              });

                              return (
                                <td key={day.id} className="p-3 align-top min-h-[100px] border-r last:border-r-0 border-slate-200 dark:border-slate-800">
                                  <div className="space-y-2 min-h-[70px]">
                                    {matchedDisciplines.map((disc, dIndex) => (
                                      <div 
                                        key={dIndex} 
                                        className={`p-2 rounded-lg text-[10px] sm:text-[11px] leading-relaxed shadow-xs border relative group ${
                                          disc.period === 0 
                                            ? 'bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/15 dark:border-amber-900/40 dark:text-amber-200' 
                                            : disc.period % 2 === 0
                                              ? 'bg-violet-50/70 border-violet-200 text-violet-900 dark:bg-violet-950/15 dark:border-violet-900/40 dark:text-violet-200'
                                              : 'bg-sky-50/70 border-sky-200 text-sky-900 dark:bg-sky-950/15 dark:border-sky-900/40 dark:text-sky-200'
                                        }`}
                                      >
                                        <div className="font-bold line-clamp-2" title={disc.name}>
                                          {disc.name}
                                        </div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold flex items-center justify-between">
                                          <span>👤 {disc.professor || "-"}</span>
                                          <span className="font-mono text-[9px] uppercase opacity-75">{disc.code || "CCMP"}</span>
                                        </div>
                                        
                                        <div className="absolute top-1 right-1">
                                          <span className={`text-[8px] font-bold px-1 rounded ${
                                            disc.period === 0 
                                              ? 'bg-amber-250 text-amber-900' 
                                              : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                                          }`}>
                                            {disc.period === 0 ? "Opt." : `${disc.period}º P`}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                    {matchedDisciplines.length === 0 && (
                                      <div className="h-full flex items-center justify-center text-[10px] text-slate-350 dark:text-slate-600 font-mono italic">
                                        --
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

              {/* Tab 3 Content: Raw Compatibility JSON box */}
              {reviewTab === 'json' && (
                <div className="p-6 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        Código Roster JSON (Padrão do Sistema)
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Este código gerado segue estritamente a modelagem <code>Discipline[]</code> do projeto. Cole em <code>src/data.ts</code> ou adicione via API.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCopyClipboard}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold text-xs flex items-center gap-1 transition"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500">Copiável: Ok!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Roster JSON</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleExportJSON}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs flex items-center gap-1 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar JSON</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 p-4">
                    <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[400px]">
                      {getOutputSystemJson()}
                    </pre>
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* Directives / Blueprint Tutorial Block */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-xs text-center max-w-2xl mx-auto space-y-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                <BrainCircuit className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Pronto para Injetar Horários</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                Você pode carregar a ementa de um curso vizinho ou arrastar o PDF original de horários letivos (ex: <code>BCC</code> ou <code>Zootecnia</code>) utilizando o widget acima. A IA estruturará tudo no padrão congruente da universidade imediatamente.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
