import { ExternalLink, Github, MessageSquare } from 'lucide-react';
import { PROJECT_AUTHOR_NAME, PROJECT_AUTHOR_URL, PROJECT_REPOSITORY_URL } from '../utils/projectLinks';
import { useFeedback } from './FeedbackProvider';

export function ProjectFooter() {
  const openFeedback = useFeedback();
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 pt-6 text-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">Ajude a melhorar o My UFAPE</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Envie sugestões ou relate problemas. Não é necessário criar uma conta.
          </p>
        </div>
        <button type="button" onClick={openFeedback}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          aria-label="Abrir formulário de feedback">
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Enviar feedback
        </button>
      </div>
      <div className="mt-5 flex flex-col gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>Desenvolvido por{' '}
          <a href={PROJECT_AUTHOR_URL} target="_blank" rel="noopener noreferrer"
            className="font-medium text-slate-700 underline underline-offset-4 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400"
            aria-label={`${PROJECT_AUTHOR_NAME} no GitHub (abre em nova aba)`}>{PROJECT_AUTHOR_NAME}</a>
        </p>
        <a href={PROJECT_REPOSITORY_URL} target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg hover:text-indigo-600 dark:hover:text-indigo-400"
          aria-label="Ver repositório no GitHub (abre em nova aba)">
          <Github className="h-4 w-4" aria-hidden="true" />
          Repositório no GitHub
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}
