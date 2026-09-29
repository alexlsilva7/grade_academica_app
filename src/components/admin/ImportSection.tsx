import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clipboard, Copy, FileJson, FileText, GitMerge, Info, Network, RefreshCw, Sparkles, Upload, ChevronDown } from 'lucide-react';
import { PromptDefinition, PromptSubStep } from '../../utils/promptsData';
import { CourseHours, ExtractionIssue } from '../../utils/extraction';
import { CurriculumProfile } from '../../types';

export interface ImportSectionProps {
  destination: string;
  destinationReady: boolean;
  destinationControls: React.ReactNode;
  advancedContent: React.ReactNode;
  reviewContent: React.ReactNode;
  hasPreview: boolean;
  applied: boolean;
  onOpenDestination: () => void;
  activeMode: 'curriculum' | 'schedule';
  curriculumExtractType: 'tree' | 'linear';
  setCurriculumExtractType: (type: 'tree' | 'linear') => void;
  selectedSubStepId: string;
  setSelectedSubStepId: (id: string) => void;
  basePromptDef: PromptDefinition;
  activeSubStep?: PromptSubStep;
  currentPrompt: {
    badge: string;
    shortDescription: string;
    recommendedModels: string;
    promptText: string;
  };
  currentPromptText: string;
  isCourseHoursStep: boolean;
  isPromptExpanded: boolean;
  setIsPromptExpanded: (expanded: boolean) => void;
  copyFeedback: boolean;
  onCopyPrompt: () => void;
  pastedJsonText: string;
  setPastedJsonText: (text: string) => void;
  onPasteFromClipboard: () => void;
  jsonFileInputRef: React.RefObject<HTMLInputElement | null>;
  onUploadJsonFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  validationResult: {
    isValid: boolean;
    summary: string;
    issues: ExtractionIssue[];
    stats?: { count: number; sessionsCount?: number };
  } | null;
  setValidationResult: React.Dispatch<React.SetStateAction<any>>;
  onValidateAndApply: (rawInput?: string, applyMode?: 'merge' | 'replace') => void;
  disciplinesCount: number;
  curriculumCount: number;
  treeCount: number;
  displayedCourseHours: CourseHours | null;
  displayedHoursProfile: CurriculumProfile | null;
  formatCourseHours: (v: number | null) => string;
  lastMergeStats: { added: number; updated: number; total: number } | null;
  onClearData: () => void;
  onSaveToProject: () => void;
}

export function ImportSection({
  activeMode, curriculumExtractType, setCurriculumExtractType, selectedSubStepId, setSelectedSubStepId,
  basePromptDef, activeSubStep, currentPrompt, currentPromptText, isCourseHoursStep,
  copyFeedback, onCopyPrompt, pastedJsonText, setPastedJsonText, onPasteFromClipboard,
  jsonFileInputRef, onUploadJsonFile, validationResult, setValidationResult, onValidateAndApply,
  disciplinesCount, curriculumCount, displayedCourseHours, displayedHoursProfile, formatCourseHours,
  destination, destinationReady, destinationControls, advancedContent, reviewContent, hasPreview, applied, onOpenDestination,
}: ImportSectionProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [strategy, setStrategy] = useState<'merge' | 'replace'>('merge');
  const heading = useRef<HTMLHeadingElement>(null);
  const moveTo = (next: 1 | 2 | 3) => { setStep(next); requestAnimationFrame(() => heading.current?.focus()); };
  useEffect(() => { if (hasPreview || applied) moveTo(3); }, [hasPreview, applied]);
  useEffect(() => { if (!hasPreview && !applied && step === 3) setStep(2); }, [hasPreview, applied]);
  useEffect(() => { setStrategy('merge'); }, [activeMode, curriculumExtractType, selectedSubStepId]);
  const count = activeMode === 'schedule' ? disciplinesCount : curriculumCount;
  const errors = validationResult?.issues.filter(issue => issue.severity === 'error').length || 0;
  const stripEmoji = (text: string) => text.replace(/^[^\p{L}\p{N}]+/u, '');

  return <div className="max-w-[1400px] mx-auto space-y-6">
    <input ref={jsonFileInputRef} type="file" accept=".json,application/json" aria-label="Carregar arquivo JSON" onChange={onUploadJsonFile} className="hidden" />
    <div className="flex items-center justify-between gap-6">
      <ol aria-label="Etapas da importação" className="flex items-center gap-3">
        {(['Preparar importação', 'Inserir JSON', 'Revisar alterações'] as const).map((label, index) => {
          const number = (index + 1) as 1 | 2 | 3;
          return <li key={label} className="flex items-center gap-3">
            {index > 0 && <div className="w-8 h-px bg-slate-200 dark:bg-slate-700" />}
            <button onClick={() => moveTo(number)} disabled={number === 2 ? !destinationReady : number === 3 ? !hasPreview && !applied : false} aria-current={step === number ? 'step' : undefined} className={`flex items-center gap-2.5 text-sm disabled:opacity-40 ${step === number ? 'font-semibold text-indigo-700 dark:text-indigo-300' : 'text-slate-500'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === number ? 'bg-indigo-600 text-white shadow-sm' : step > number ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800'}`}>{step > number ? <Check size={14} /> : number}</span>{label}
            </button>
          </li>;
        })}
      </ol>
      <span className="text-xs font-medium text-slate-500 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1.5">Assistido por IA</span>
    </div>

    <div className="grid grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
      <div className="min-w-0 space-y-5">
        <section className="admin-panel !p-0 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 ref={heading} tabIndex={-1} className="font-semibold text-lg outline-none">{step === 1 ? 'Prepare os dados que você precisa' : step === 2 ? 'Traga a resposta da IA' : applied ? 'Importação aplicada ao rascunho' : 'Confira antes de aplicar'}</h2>
            <p className="text-sm text-slate-500 mt-1.5">{step === 1 ? 'Escolha o destino e copie um prompt adequado ao seu documento.' : step === 2 ? 'Cole o JSON gerado ou selecione um arquivo do computador.' : applied ? 'O rascunho foi atualizado. Você pode revisar os dados e salvar quando estiver pronto.' : 'Verifique os valores alterados e os registros que serão incluídos ou removidos.'}</p>
          </div>

          {step === 1 && <div className="p-6 space-y-6">
            {destinationControls}
            {activeMode === 'curriculum' && <fieldset className="space-y-3"><legend className="text-sm font-medium mb-3">Tipo de conteúdo</legend><div className="grid grid-cols-2 gap-3">{([{ id: 'tree', title: 'Estrutura curricular', description: 'Matriz, períodos e pré-requisitos', icon: Network }, { id: 'linear', title: 'Catálogo de disciplinas', description: 'Ementas, créditos e cargas horárias', icon: FileText }] as const).map(({ id, title, description, icon: Icon }) => <button key={id} type="button" aria-pressed={curriculumExtractType === id} onClick={() => setCurriculumExtractType(id)} className={`flex items-start gap-3 p-4 text-left rounded-xl border ${curriculumExtractType === id ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}><Icon size={20} className="text-indigo-500 shrink-0 mt-0.5" /><span><strong className="text-sm font-semibold block">{title}</strong><span className="text-xs text-slate-500 block mt-1">{description}</span></span></button>)}</div></fieldset>}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
              <label htmlFor="import-prompt-strategy" className="block text-sm font-medium">Recorte do documento</label>
              <select id="import-prompt-strategy" value={selectedSubStepId} onChange={e => setSelectedSubStepId(e.target.value)} className="admin-input">{basePromptDef.subSteps?.map(item => <option key={item.id} value={item.id}>{stripEmoji(item.title)}</option>)}<option value="__full__">Documento completo</option></select>
              <p className="text-xs leading-relaxed text-slate-500">{currentPrompt.shortDescription}</p>
              <div className="flex items-center justify-between p-4 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-xl gap-4"><div><p className="text-sm font-medium">Prompt pronto para copiar</p><p className="text-xs text-slate-500 mt-1">Cole na sua IA e anexe o PDF, imagem ou trecho do documento lá.</p></div><button onClick={onCopyPrompt} className="admin-primary flex items-center gap-2 shrink-0">{copyFeedback ? <Check size={15} /> : <Copy size={15} />}{copyFeedback ? 'Copiado' : 'Copiar prompt'}</button></div>
              <details className="group text-sm"><summary className="cursor-pointer text-slate-500 flex items-center gap-2"><ChevronDown size={15} className="group-open:rotate-180 transition-transform" />Ver instruções do prompt</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-950 rounded-lg p-4 text-xs leading-relaxed">{currentPromptText}</pre></details>
            </div>
          </div>}

          {step === 2 && <div className="p-6 space-y-5">
            <div className="flex items-center justify-between gap-3"><label htmlFor="import-json" className="text-sm font-semibold flex items-center gap-2"><FileJson size={17} className="text-indigo-500" />Resposta em JSON</label><div className="flex gap-3"><button onClick={onPasteFromClipboard} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"><Clipboard size={14} />Colar</button><button onClick={() => jsonFileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300"><Upload size={14} />Escolher arquivo .json</button></div></div>
            <div className="rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10">
              <textarea id="import-json" aria-describedby="import-json-help" spellCheck={false} rows={12} value={pastedJsonText} onChange={e => { setPastedJsonText(e.target.value); setValidationResult(null); }} placeholder={'Cole aqui o JSON que a IA gerou.\n\nVocê também pode escolher um arquivo .json salvo no computador.'} className="block w-full resize-y p-4 font-mono text-xs leading-relaxed bg-slate-50/50 dark:bg-slate-950/50 outline-none min-h-60" />
              <div className="flex justify-between items-center px-4 py-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500"><span>{pastedJsonText.length.toLocaleString('pt-BR')} caracteres</span>{pastedJsonText && <button onClick={() => { setPastedJsonText(''); setValidationResult(null); }}>Limpar entrada</button>}</div>
            </div>
            <p id="import-json-help" className="text-xs text-slate-500">O arquivo deve conter o resultado da extração. PDFs e imagens são anexados na ferramenta de IA, usando o prompt da etapa anterior.</p>
            <fieldset><legend className="text-sm font-medium mb-3">Como aplicar os dados</legend><div className="grid grid-cols-2 gap-3">
              <label className={`rounded-xl border p-4 flex gap-3 cursor-pointer ${strategy === 'merge' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-700'}`}><input type="radio" name="import-strategy" value="merge" checked={strategy === 'merge'} onChange={() => setStrategy('merge')} className="mt-1 accent-indigo-600" /><span><strong className="block text-sm">Mesclar <span className="ml-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-300">RECOMENDADO</span></strong><span className="block text-xs text-slate-500 mt-1">Inclui novos registros e atualiza os correspondentes.</span></span></label>
              {!isCourseHoursStep && <label className={`rounded-xl border p-4 flex gap-3 cursor-pointer ${strategy === 'replace' ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700'}`}><input type="radio" name="import-strategy" value="replace" checked={strategy === 'replace'} onChange={() => setStrategy('replace')} className="mt-1 accent-amber-600" /><span><strong className="block text-sm">Substituir</strong><span className="block text-xs text-slate-500 mt-1">Troca o conjunto selecionado. Registros ausentes podem ser removidos.</span></span></label>}
            </div></fieldset>
            {strategy === 'replace' && <p className="rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 p-3 text-xs">Destino: {destination}. A próxima etapa mostrará as remoções antes de pedir confirmação.</p>}
            {validationResult && <div role={validationResult.isValid ? 'status' : 'alert'} className={`rounded-xl border p-4 text-sm ${validationResult.isValid ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 text-rose-800 dark:text-rose-300'}`}><p className="font-semibold">{validationResult.isValid ? 'Validação concluída' : errors ? `${errors} problema(s) para corrigir` : 'Confira o JSON informado'}</p><p className="text-xs mt-1">{validationResult.summary}</p>{!!validationResult.issues.length && <details className="mt-3"><summary className="cursor-pointer text-xs">Ver detalhes ({validationResult.issues.length})</summary><ul className="mt-2 list-disc pl-4 max-h-52 overflow-auto space-y-1 text-xs">{validationResult.issues.map((issue, index) => <li key={index}><strong>{issue.record}</strong> · {issue.field}: {issue.message}</li>)}</ul></details>}</div>}
          </div>}

          {step === 3 && <div className="p-6 space-y-4">{applied ? <div className="py-8 text-center"><CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-4" /><h3 className="font-semibold">Dados prontos para conferência</h3><p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">Você pode continuar importando outros trechos ou abrir a área de destino. Use o botão de salvar no cabeçalho para gravar as alterações.</p><div className="flex justify-center gap-4 mt-6"><button className="text-sm text-slate-500" onClick={() => { setPastedJsonText(''); moveTo(2); }}>Importar outro trecho</button><button onClick={onOpenDestination} className="admin-primary">Conferir dados importados</button></div></div> : reviewContent}
            {!applied && !!validationResult?.issues.length && <details className="text-xs text-amber-700 dark:text-amber-300"><summary className="cursor-pointer">Avisos da validação ({validationResult.issues.length})</summary><ul className="list-disc pl-5 mt-3 space-y-1">{validationResult.issues.map((issue, index) => <li key={index}>{issue.record}: {issue.message}</li>)}</ul></details>}
          </div>}

          {step < 3 && <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">{step === 1 ? <p className="text-xs text-slate-500">Já tem o JSON? Avance direto para a entrada.</p> : <button className="flex items-center gap-2 text-sm text-slate-500" onClick={() => moveTo(1)}><ArrowLeft size={15} />Voltar</button>}<button disabled={!destinationReady || (step === 2 && !pastedJsonText.trim())} className="admin-primary flex items-center gap-2" onClick={() => step === 1 ? moveTo(2) : onValidateAndApply(undefined, isCourseHoursStep ? 'merge' : strategy)}>{step === 1 ? 'Continuar com o JSON' : 'Validar e revisar'}<ArrowRight size={15} /></button></div>}
        </section>
        {step === 2 && <details className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"><summary className="cursor-pointer px-5 py-4 text-sm text-slate-500 flex justify-between items-center">Avançado: editar o JSON do rascunho<ChevronDown size={16} className="group-open:rotate-180" /></summary><div className="p-4 pt-0">{advancedContent}</div></details>}
      </div>

      <aside className="space-y-4 sticky top-0" aria-label="Resumo da importação">
        <div className="admin-panel !p-5 space-y-4"><p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Destino selecionado</p><p className="font-semibold text-sm break-words">{destination}</p><div className="h-px bg-slate-100 dark:bg-slate-800" /><p className="text-xs text-slate-500">Rascunho atual</p><p className="text-2xl font-semibold">{count}<span className="text-xs font-normal text-slate-500 ml-2">{activeMode === 'schedule' ? 'turmas' : 'disciplinas'}</span></p>{displayedCourseHours && activeMode === 'curriculum' && <p className="text-xs text-slate-500">{displayedHoursProfile?.id || 'Curso'} · {formatCourseHours(displayedCourseHours.totalHours)} exigidas</p>}</div>
        <div className="rounded-xl p-5 bg-indigo-50/60 dark:bg-indigo-950/20 space-y-3"><div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300"><Sparkles size={16} /><h3 className="font-semibold text-sm">Como funciona</h3></div><ol className="text-xs text-slate-600 dark:text-slate-400 space-y-3 leading-relaxed"><li>1. Copie o prompt e use com o documento na sua ferramenta de IA.</li><li>2. Traga a resposta em JSON para este painel.</li><li>3. Confira as diferenças, aplique ao rascunho e salve.</li></ol></div>
        <p className="text-xs text-slate-500 flex items-start gap-2 leading-relaxed px-1"><Info size={15} className="shrink-0 mt-0.5" />Para documentos longos, importe um trecho por vez e use Mesclar para acumular os resultados.</p>
      </aside>
    </div>
  </div>;
}
