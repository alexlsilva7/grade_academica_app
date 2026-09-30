export const CALENDAR_CATEGORIES = {
  matricula: 'Matrícula', reajuste: 'Reajuste', trancamento: 'Trancamento', aulas: 'Aulas',
  avaliacao: 'Avaliação', feriado: 'Feriado', recesso: 'Recesso', estagio: 'Estágio',
  tcc: 'TCC / ESO', colacao: 'Colação de grau', administrativo: 'Administrativo', outro: 'Outros'
} as const;
export type CalendarCategory = keyof typeof CALENDAR_CATEGORIES;
export const DAY_CLASSIFICATIONS = ['Dias letivos', 'Provas finais', 'Aulas extras acessibilidade', 'Feriados', 'Recesso'] as const;
export interface CalendarOrigin { pagina: number; cabecalhoOriginal: string; trechoOriginal: string }
export interface CalendarEvent {
  id: string; titulo: string; descricaoOriginal: string; dataOriginal: string;
  inicio: string | null; fimInclusivo: string | null; diaInteiro: boolean; horarioOriginal: string | null;
  semestres: string[]; categoria: CalendarCategory; publico: string[]; links: string[];
  origens: CalendarOrigin[]; precisaRevisao: boolean; motivosRevisao: string[];
}
export interface CalendarMark {
  data: string; classificacaoOriginal: string; corOuSimboloOriginal: string;
  semestres: string[]; pagina: number; precisaRevisao: boolean;
}
export interface CalendarIssue { pagina: number | null; eventoId: string | null; tipo: string; descricao: string }
export interface CalendarExtraction {
  documento: { instituicao: string; titulo: string | null; arquivo: string | null; versao: string | null;
    dataPublicacao: string | null; semestres: string[]; totalPaginas: number | null };
  eventos: CalendarEvent[]; diasMarcados: CalendarMark[]; observacoesDocumento: string[];
  problemas: CalendarIssue[];
  cobertura: { paginasAnalisadas: number[]; paginasNaoProcessadas: number[]; extracaoCompleta: boolean };
}
export interface CalendarDraft {
  schemaVersion: 1; source: CalendarExtraction; sourceUrl: string;
  events: CalendarEvent[];
  eventReviews: Record<string, string>;
  issueReviews: Record<string, string>;
  dayReviews: Record<string, { classification: string; note: string }>;
}
export interface CalendarDay {
  date: string; classification: string | null; classifications: string[];
  semesters: string[]; pages: number[]; needsReview: boolean;
}
export interface CalendarPublication {
  document: Omit<CalendarExtraction['documento'], 'arquivo'>; sourceUrl: string;
  events: CalendarEvent[]; days: CalendarDay[]; unresolvedIssues: CalendarIssue[];
  publishedAt: string;
}
export interface CalendarAdminState {
  draft: CalendarDraft | null; revision: number; publishedAt: string | null;
  calendar: CalendarPublication | null;
}
export interface CalendarValidationIssue { path: string; message: string; severity: 'error' | 'warning' }
