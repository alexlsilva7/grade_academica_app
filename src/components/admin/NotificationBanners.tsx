import React from 'react';
import { AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { ExtractionReport } from '../../utils/extraction';
import { Discipline, CurriculumSubject } from '../../types';

export interface NotificationBannersProps {
  extractionReport: ExtractionReport | null;
  activeMode: 'curriculum' | 'schedule';
  disciplines: Discipline[];
  curriculumSubjects: CurriculumSubject[];
  scheduleSemester: string;
  setScheduleSemester: (semester: string) => void;
  errorMsg: string | null;
  successMsg: string | null;
  detectedDifferentCourse: { name: string; shortName: string } | null;
  courseName: string;
  courseShortName: string;
  onAcceptDifferentCourse: () => void;
  onDismissDifferentCourse: () => void;
}

export function NotificationBanners({
  extractionReport,
  activeMode,
  disciplines,
  curriculumSubjects,
  scheduleSemester,
  setScheduleSemester,
  errorMsg,
  successMsg,
  detectedDifferentCourse,
  courseName,
  courseShortName,
  onAcceptDifferentCourse,
  onDismissDifferentCourse
}: NotificationBannersProps) {
  return (
    <>
      {extractionReport && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-slate-900 p-4 space-y-3 text-sm">
          <h3 className="font-bold">Conferência da extração</h3>
          <p>{extractionReport.sources.length} fontes · {extractionReport.issues.length} pendências. Campos não informados permanecem vazios.</p>
          {!!extractionReport.calls?.length && (
            <details className="mt-2">
              <summary className="cursor-pointer">Modelos utilizados · {extractionReport.calls.length} chamadas</summary>
              <ul className="text-xs space-y-1 mt-2">
                {extractionReport.calls.map((call, index) => (
                  <li key={index}>
                    {call.stage} · {call.model} · tentativa {call.attempt} · {(call.durationMs / 1000).toFixed(1)}s · {call.status}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <details>
            <summary className="cursor-pointer font-semibold">Pendências e divergências</summary>
            <ul className="list-disc pl-5 max-h-72 overflow-auto space-y-2 mt-2">
              {extractionReport.issues.map((issue, i) => (
                <li key={i}><strong>{issue.record} / {issue.field}:</strong> {issue.message}</li>
              ))}
            </ul>
          </details>
          <details>
            <summary className="cursor-pointer font-semibold">Evidências por disciplina</summary>
            <div className="max-h-96 overflow-auto space-y-3 mt-2">
              {(activeMode === 'schedule' ? disciplines : curriculumSubjects).map(record => (
                <div key={record.id || record.code || record.name}>
                  <strong>{record.name || 'Nome não informado'}</strong>
                  {(record.evidence || []).map((e, i) => (
                    <p key={i} className="text-xs mt-1">
                      <strong>{e.field}</strong> — {e.file}{e.page != null ? ', página ' + e.page : ''}: “{e.excerpt}”
                    </p>
                  ))}
                </div>
              ))}
              {(extractionReport.metadataEvidence || []).map((e, i) => (
                <p key={'metadata-' + i} className="text-xs">
                  <strong>Perfil / {e.field}</strong> — {e.file}{e.page != null ? ', página ' + e.page : ''}: “{e.excerpt}”
                </p>
              ))}
            </div>
          </details>
          <p className="text-xs">As referências foram indicadas pela IA e devem ser conferidas no documento original.</p>
        </section>
      )}

      {/* Notifications */}
      {errorMsg && (
        <div role="alert" className="bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 p-3.5 rounded-r-lg flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-rose-900 dark:text-rose-200 text-xs sm:text-sm">Configuração ou Execução</h4>
            <p className="text-xs text-rose-800 dark:text-rose-300">{errorMsg}</p>
            {(errorMsg.includes('NVIDIA_API_KEY') || errorMsg.includes('MOONSHOT_API_KEY') || errorMsg.includes('OPENROUTER_API_KEY') || errorMsg.includes('GEMINI_API_KEY')) && (
              <div className="mt-2 text-xs text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded border border-rose-200 dark:border-rose-900/50 space-y-1">
                <div className="font-semibold text-rose-700 dark:text-rose-400">Como resolver:</div>
                <div>1. Obtenha sua chave em: <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline font-semibold">OpenRouter</a></div>
                <div>2. Abra o arquivo <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">.env</code> na raiz do projeto e configure:</div>
                <pre className="p-1.5 bg-slate-900 text-emerald-400 rounded font-mono text-[11px]">OPENROUTER_API_KEY=sua_chave_aqui</pre>
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
              onClick={onAcceptDifferentCourse}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-colors"
            >
              Cadastrar como Novo Curso
            </button>
            <button
              type="button"
              onClick={onDismissDifferentCourse}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-medium text-xs hover:bg-slate-100 cursor-pointer transition-colors"
            >
              Manter Atual
            </button>
          </div>
        </div>
      )}
    </>
  );
}
