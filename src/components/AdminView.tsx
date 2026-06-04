import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, BrainCircuit, Sparkles, Loader2, Save, Trash2, 
  Plus, Edit3, Check, X, FileJson, ArrowRightLeft, BookOpen, AlertCircle
} from 'lucide-react';
import { Discipline } from '../types';

interface AdminViewProps {
  setView: (view: 'home' | 'schedule' | 'matriz' | 'disciplines' | 'perfil' | 'admin') => void;
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
  const [syllabusText, setSyllabusText] = useState('');
  const [promptContext, setPromptContext] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedTitle, setExtractedTitle] = useState('');
  const [extractedDisciplines, setExtractedDisciplines] = useState<Discipline[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [savedCourses, setSavedCourses] = useState<CustomCourse[]>([]);

  // Local editing states for discipline
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editProfessor, setEditProfessor] = useState('');
  const [editPeriod, setEditPeriod] = useState(0);

  // New discipline manual add state
  const [newDiscipline, setNewDiscipline] = useState({
    code: '',
    name: '',
    professor: '',
    period: 1
  });

  // Load custom courses on mount
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

  const handleSyllabusExample = () => {
    setSyllabusText(
      "CURSO: Tecnologia em Sistemas para Internet\n" +
      "1º Período:\n" +
      "- TSI-101: Fundamentos de Redes (60h) - Prof. Carlos. Conceitos de redes IP, roteamento, cabos e topologias.\n" +
      "- TSI-102: Lógica de Programação e Algoritmos (90h) - Prof. Amanda. Estruturas básicas de controle, variáveis, funções e vetores.\n\n" +
      "2º Período:\n" +
      "- TSI-201: Desenvolvimento Web Front-End (60h) - Prof. Roberto. HTML5 moderno, CSS estruturado, flexbox, grid e bases de JavaScript.\n" +
      "- TSI-202: Banco de Dados Relacionais (60h) - Prof. Carla. Modelagem lógico-conceitual, tabelas SQL, comandos SELECT, INSERT."
    );
    setPromptContext("Adicione horários noturnos padrões para as aulas (ex: 18:30 - 20:10 e 20:10 - 21:50) distribuídos entre seg e sex.");
  };

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syllabusText.trim()) {
      setErrorMsg("Por favor, cole a descrição ou ementas do curso.");
      return;
    }

    setIsExtracting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/extract-syllabus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: syllabusText,
          promptContext: promptContext
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Ocorreu um erro ao extrair com IA.");
      }

      const data = await response.json();
      setExtractedTitle(data.title || "Novo Curso Extraído com IA");
      setExtractedDisciplines(data.disciplines || []);
      setSuccessMsg(`Extração concluída com sucesso! ${data.disciplines?.length || 0} disciplinas prontas para revisão.`);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro desconhecido ao processar dados via Inteligência Artificial.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleStartEdit = (index: number, disc: Discipline) => {
    setEditingIndex(index);
    setEditName(disc.name);
    setEditCode(disc.code || '');
    setEditProfessor(disc.professor || '-');
    setEditPeriod(disc.period === undefined ? 1 : Number(disc.period));
  };

  const handleSaveEdit = (index: number) => {
    setExtractedDisciplines(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        name: editName,
        code: editCode,
        professor: editProfessor,
        period: editPeriod
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

  const handleAddManualDiscipline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscipline.name) return;

    const newDiscObj: Discipline = {
      id: newDiscipline.code.toLowerCase().replace(/\s+/g, '-') || `manual-${Date.now()}`,
      code: newDiscipline.code || `OPT-${Date.now()}`,
      name: newDiscipline.name,
      professor: newDiscipline.professor || '-',
      period: Number(newDiscipline.period),
      sessions: [
        { day: 1, time: "18:30 - 20:10" } // Default template session slot
      ]
    };

    setExtractedDisciplines(prev => [...prev, newDiscObj]);
    setNewDiscipline({ code: '', name: '', professor: '', period: 1 });
  };

  const handleSaveToActiveWorkspace = () => {
    if (extractedDisciplines.length === 0) return;
    setDisciplinesList(extractedDisciplines);
    setGradeTitle(extractedTitle);
    
    // Save to localStorage as a workspace setup
    localStorage.setItem('saved_disciplinesList', JSON.stringify(extractedDisciplines));
    localStorage.setItem('saved_gradeTitle', extractedTitle);
    
    // Propagate success
    setSuccessMsg("Grade curricular aplicada com sucesso ao seu Workspace ativo!");
    setView('schedule');
  };

  const handleSaveToServerDatabase = async () => {
    if (extractedDisciplines.length === 0) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const generatedId = extractedTitle.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: generatedId || `course-${Date.now()}`,
          title: extractedTitle,
          disciplines: extractedDisciplines
        })
      });

      if (res.ok) {
        setSuccessMsg(`A grade curricular "${extractedTitle}" foi guardada permanentemente no servidor!`);
        fetchCustomCourses();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao persistir recurso.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de conexão ao salvar grade.");
    }
  };

  const handleLoadCustomCourse = (course: CustomCourse) => {
    setDisciplinesList(course.disciplines);
    setGradeTitle(course.title);
    
    // Persist as current workspace grade in local states
    localStorage.setItem('saved_disciplinesList', JSON.stringify(course.disciplines));
    localStorage.setItem('saved_gradeTitle', course.title);
    
    setSuccessMsg(`Grade curricular "${course.title}" carregada com sucesso no Workspace ativo!`);
    setView('schedule');
  };

  const handleDeleteCustomCourseItem = async (id: string, name: string) => {
    if (!confirm(`Deseja mesmo apagar o curso "${name}" do servidor?`)) return;
    try {
      const res = await fetch(`/api/courses/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSuccessMsg("Curso removido do servidor com sucesso.");
        fetchCustomCourses();
      } else {
        alert("Erro ao remover recurso.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportJSON = () => {
    if (extractedDisciplines.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      title: extractedTitle,
      disciplines: extractedDisciplines
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${extractedTitle.replace(/\s+/g, "_")}_grade.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 shrink-0 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView('home')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-slate-800 dark:text-slate-100">Painel de Administração</h1>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Extração de Grades Curriculares com IA</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
          
          {/* Banner message */}
          {errorMsg && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 p-4 rounded-r-lg flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-sm text-rose-800 dark:text-rose-200">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 p-4 rounded-r-lg flex items-start gap-3 animate-in fade-in">
              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-800 dark:text-emerald-200">{successMsg}</div>
            </div>
          )}

          {/* Part 1: Paste details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Extrair Curso com IA</h3>
                </div>
                <button 
                  type="button" 
                  onClick={handleSyllabusExample} 
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Carregar Exemplo
                </button>
              </div>

              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                Cole o texto bruto contendo a lista de disciplinas, cargas horárias e professores de qualquer curso de graduação. Nossa IA irá parsear, sugerir períodos e estruturar a grade automaticamente.
              </p>

              <form onSubmit={handleAISubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Ementa / Texto do Curso
                  </label>
                  <textarea
                    rows={8}
                    required
                    placeholder="Cole aqui o texto da grade de disciplinas..."
                    value={syllabusText}
                    onChange={(e) => setSyllabusText(e.target.value)}
                    className="w-full text-sm font-mono p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 focus:outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Instrução / Contexto adicional
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Altere todos os professores para 'Amanda' ou 'Suporte nos horários da tarde'..."
                    value={promptContext}
                    onChange={(e) => setPromptContext(e.target.value)}
                    className="w-full text-sm p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 focus:outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="flex">
                  <button
                    type="submit"
                    disabled={isExtracting}
                    className="w-full py-3 px-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Extraindo e Estruturando com IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-amber-300" />
                        <span>Extrair Grade Curricular</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Grades Disponíveis no Servidor</h3>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  Gerencie as grades salvas de forma permanente no servidor. Qualquer aluno poderá carregar estas grades para seu planejamento pessoal.
                </p>

                {savedCourses.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 text-sm">
                    Nenhuma grade personalizada guardada ainda.
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2">
                    {savedCourses.map((c) => (
                      <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-lg flex items-center justify-between gap-3 group">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">{c.title}</h4>
                          <span className="text-[10px] sm:text-xs text-slate-400">{c.disciplines.length} disciplinas</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleLoadCustomCourse(c)}
                            title="Carregar no Workspace ativo"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-all"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomCourseItem(c.id, c.title)}
                            title="Apagar permanentemente"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 border border-indigo-100 dark:border-indigo-900/50 rounded-xl">
                <h4 className="font-bold text-xs text-indigo-800 dark:text-indigo-300 uppercase tracking-wider mb-1">Como usar</h4>
                <p className="text-[11px] sm:text-xs text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                  Insira o syllabus de cursos vizinhos (ex: Engenharia, Agronomia, etc.), clique em extrair, confira os resultados no painel abaixo, e salve permanentemente no Servidor ou use imediatamente!
                </p>
              </div>
            </div>
          </div>

          {/* Part 2: Review extracted items */}
          {extractedDisciplines.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-500">
              
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">RESULTADO DA EXTRAÇÃO</span>
                  <div className="flex items-center gap-3">
                    <input 
                      type="text" 
                      value={extractedTitle} 
                      onChange={(e) => setExtractedTitle(e.target.value)}
                      className="text-lg sm:text-xl font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none py-0.5 text-slate-800 dark:text-slate-100 w-full max-w-xl"
                      title="Clique para editar o título"
                    />
                  </div>
                  <p className="text-xs text-slate-400">Clique para renomear e revise os dados gerados abaixo.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    onClick={handleSaveToActiveWorkspace}
                    className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-white transition-all shadow-sm"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Usar no Workspace</span>
                  </button>

                  <button
                    onClick={handleSaveToServerDatabase}
                    className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white font-semibold text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar no Servidor</span>
                  </button>

                  <button
                    onClick={handleExportJSON}
                    title="Exportar arquivo JSON físico"
                    className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 transition"
                  >
                    <FileJson className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid representation */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-950/20 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-4 pl-6">Cód. / ID</th>
                      <th className="p-4">Nome da Disciplina</th>
                      <th className="p-4 w-32">Período</th>
                      <th className="p-4">Professor</th>
                      <th className="p-4 text-center w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-sm">
                    {extractedDisciplines.map((disc, idx) => {
                      const isEditing = editingIndex === idx;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors">
                          <td className="p-4 pl-6 font-mono text-xs text-slate-500">
                            {isEditing ? (
                              <input
                                type="text"
                                className="w-24 p-1 text-xs border rounded bg-slate-50 dark:bg-slate-950 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                                value={editCode}
                                onChange={(e) => setEditCode(e.target.value)}
                              />
                            ) : (
                              disc.code || "-"
                            )}
                          </td>
                          <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">
                            {isEditing ? (
                              <input
                                type="text"
                                className="w-full max-w-sm p-1 text-sm border rounded bg-slate-50 dark:bg-slate-950 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                              />
                            ) : (
                              disc.name
                            )}
                          </td>
                          <td className="p-4 pr-1 shrink-0">
                            {isEditing ? (
                              <select
                                className="p-1 text-xs border rounded bg-slate-105 dark:bg-slate-950 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                                value={editPeriod}
                                onChange={(e) => setEditPeriod(Number(e.target.value))}
                              >
                                {Array.from({ length: 11 }, (_, i) => (
                                  <option key={i} value={i}>
                                    {i === 0 ? "Optativa" : `${i}º Período`}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              disc.period === 0 ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 rounded-full">Optativa</span>
                              ) : (
                                `${disc.period}º per`
                              )
                            )}
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-300">
                            {isEditing ? (
                              <input
                                type="text"
                                className="w-full text-xs p-1 border rounded bg-slate-50 dark:bg-slate-950 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                                value={editProfessor}
                                onChange={(e) => setEditProfessor(e.target.value)}
                              />
                            ) : (
                              disc.professor || "-"
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(idx)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-500 rounded"
                                    title="Confirmar"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 rounded"
                                    title="Cancelar"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleStartEdit(idx, disc)}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded"
                                    title="Editar"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDiscipline(idx)}
                                    className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 rounded"
                                    title="Deletar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add blank discipline form */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-3">
                <span className="text-xs font-bold text-slate-400 shrink-0 uppercase tracking-wider">Adicionar Manualmente:</span>
                <form onSubmit={handleAddManualDiscipline} className="w-full flex flex-col md:flex-row items-center gap-3">
                  <input
                    type="text"
                    placeholder="Código"
                    value={newDiscipline.code}
                    onChange={(e) => setNewDiscipline(p => ({ ...p, code: e.target.value }))}
                    className="w-full md:w-28 text-xs p-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Nome da disciplina"
                    value={newDiscipline.name}
                    onChange={(e) => setNewDiscipline(p => ({ ...p, name: e.target.value }))}
                    className="w-full md:flex-1 text-xs p-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Professor"
                    value={newDiscipline.professor}
                    onChange={(e) => setNewDiscipline(p => ({ ...p, professor: e.target.value }))}
                    className="w-full md:w-36 text-xs p-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 focus:outline-none"
                  />
                  <select
                    value={newDiscipline.period}
                    onChange={(e) => setNewDiscipline(p => ({ ...p, period: Number(e.target.value) }))}
                    className="w-full md:w-28 text-xs p-2 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 focus:outline-none"
                  >
                    {Array.from({ length: 11 }, (_, i) => (
                      <option key={i} value={i}>{i === 0 ? "Optativa" : `${i}º Período`}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </form>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
