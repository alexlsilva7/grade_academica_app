import { CALENDAR_CATEGORIES, DAY_CLASSIFICATIONS, type CalendarDay, type CalendarDraft, type CalendarEvent,
  type CalendarExtraction, type CalendarPublication, type CalendarValidationIssue } from '../calendarTypes.js';

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function calendarToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function shiftCalendarDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function calendarMonthDays(month: string): string[] {
  const first = `${month}-01`;
  const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
  const start = shiftCalendarDate(first, -weekday);
  return Array.from({ length: 42 }, (_, index) => shiftCalendarDate(start, index));
}
export function shiftCalendarMonth(month: string, amount: number): string {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}
export function formatCalendarDate(date: string, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }): string {
  return new Intl.DateTimeFormat('pt-BR', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}
export function calendarRange(event: CalendarEvent): string {
  if (!event.inicio || !event.fimInclusivo) return 'Data a conferir';
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return event.inicio === event.fimInclusivo ? formatCalendarDate(event.inicio, options)
    : `${formatCalendarDate(event.inicio, options)} a ${formatCalendarDate(event.fimInclusivo, options)}`;
}
export function calendarEventStatus(event: CalendarEvent, today: string): 'today' | 'ending' | 'ongoing' | 'future' | 'past' | 'undated' {
  if (!event.inicio || !event.fimInclusivo) return 'undated';
  if (event.fimInclusivo < today) return 'past';
  if (event.inicio > today) return 'future';
  if (event.inicio === today && event.fimInclusivo === today) return 'today';
  return event.fimInclusivo === today ? 'ending' : 'ongoing';
}
export function sortCalendarEvents(a: CalendarEvent, b: CalendarEvent): number {
  return (a.inicio || '9999').localeCompare(b.inicio || '9999') || (a.fimInclusivo || '').localeCompare(b.fimInclusivo || '') || a.titulo.localeCompare(b.titulo, 'pt-BR');
}
export function calendarUpcoming(events: CalendarEvent[], today: string) {
  const ongoing = events.filter(event => ['today', 'ending', 'ongoing'].includes(calendarEventStatus(event, today)))
    .sort((a, b) => a.fimInclusivo!.localeCompare(b.fimInclusivo!) || sortCalendarEvents(a, b));
  return { ongoing, future: events.filter(event => calendarEventStatus(event, today) === 'future').sort(sortCalendarEvents) };
}
export function calendarIntersects(event: CalendarEvent, start: string, end: string): boolean {
  return !!event.inicio && !!event.fimInclusivo && event.inicio <= end && event.fimInclusivo >= start;
}
export function calendarAvailableMonths(events: CalendarEvent[], days: CalendarDay[]): string[] {
  const dates = [...events.flatMap(event => [event.inicio, event.fimInclusivo]), ...days.map(day => day.date)].filter(isCalendarDate).sort();
  if (!dates.length) return [];
  const months = [];
  for (let month = dates[0].slice(0, 7); month <= dates.at(-1)!.slice(0, 7); month = shiftCalendarMonth(month, 1)) months.push(month);
  return months;
}
export function closestCalendarMonth(months: string[], today: string): string {
  const current = today.slice(0, 7);
  return !months.length ? current : current < months[0] ? months[0] : current > months.at(-1)! ? months.at(-1)! : current;
}
export function safeCalendarUrl(value: unknown, httpsOnly = false): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  const candidate = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed;
  try {
    const url = new URL(candidate);
    return (httpsOnly ? url.protocol === 'https:' : ['http:', 'https:'].includes(url.protocol)) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function calendarSourcePage(sourceUrl: string, page?: number): string {
  const url = new URL(sourceUrl);
  if (page) url.hash = `page=${page}`;
  return url.href;
}
function isObject(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function strings(value: unknown): value is string[] { return Array.isArray(value) && value.every(item => typeof item === 'string'); }

export function validateCalendarExtraction(value: unknown): CalendarValidationIssue[] {
  const issues: CalendarValidationIssue[] = [];
  const error = (path: string, message: string) => issues.push({ path, message, severity: 'error' });
  if (!isObject(value)) return [{ path: '', message: 'O calendário deve ser um objeto JSON.', severity: 'error' }];
  if (!isObject(value.documento)) error('documento', 'Informe os metadados do documento.');
  else {
    for (const key of ['instituicao', 'titulo', 'arquivo', 'versao', 'dataPublicacao']) {
      if (typeof value.documento[key] !== 'string' && !(key !== 'instituicao' && value.documento[key] === null)) error(`documento.${key}`, 'Use texto ou null nos campos opcionais.');
    }
    if (!strings(value.documento.semestres) || value.documento.semestres.some((s: string) => !/^\d{4}\.[12]$/.test(s))) error('documento.semestres', 'Use uma lista de semestres AAAA.1 ou AAAA.2.');
    const pages = value.documento.totalPaginas;
    if (pages !== null && (!Number.isInteger(pages) || pages < 1 || pages > 1000)) error('documento.totalPaginas', 'Informe um total de páginas válido ou null.');
    if (value.documento.dataPublicacao !== null && !isCalendarDate(value.documento.dataPublicacao)) error('documento.dataPublicacao', 'Use uma data real YYYY-MM-DD ou null.');
  }
  const pageValid = (page: unknown) => Number.isInteger(page) && (page as number) >= 1 && (page as number) <= (value.documento?.totalPaginas || 1000);
  if (!Array.isArray(value.eventos) || value.eventos.length > 5000) error('eventos', 'Informe uma lista de até 5.000 eventos.');
  else {
    const ids = new Set<string>();
    value.eventos.forEach((event: unknown, index: number) => {
      const path = `eventos[${index}]`;
      if (!isObject(event)) { error(path, 'Evento inválido.'); return; }
      for (const key of ['id', 'titulo', 'descricaoOriginal', 'dataOriginal']) {
        if (typeof event[key] !== 'string' || (['id', 'titulo'].includes(key) && !event[key].trim())) error(`${path}.${key}`, 'Informe um texto válido.');
      }
      if (typeof event.id === 'string' && (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(event.id) || Object.hasOwn(Object.prototype, event.id))) error(`${path}.id`, 'Use um ID alfanumérico com hífen ou sublinhado.');
      if (ids.has(event.id)) error(`${path}.id`, 'ID repetido.');
      ids.add(event.id);
      for (const key of ['inicio', 'fimInclusivo']) if (event[key] !== null && !isCalendarDate(event[key])) error(`${path}.${key}`, 'Use uma data real YYYY-MM-DD ou null.');
      if (event.inicio && event.fimInclusivo && event.inicio > event.fimInclusivo) error(path, 'O término não pode anteceder o início.');
      if (!event.inicio || !event.fimInclusivo) issues.push({ path, message: 'Evento sem intervalo completo: ficará na revisão administrativa.', severity: 'warning' });
      if (typeof event.diaInteiro !== 'boolean' || typeof event.precisaRevisao !== 'boolean') error(path, 'diaInteiro e precisaRevisao devem ser booleanos.');
      if (event.horarioOriginal !== null && typeof event.horarioOriginal !== 'string') error(`${path}.horarioOriginal`, 'Use texto ou null.');
      for (const key of ['semestres', 'publico', 'links', 'motivosRevisao']) if (!strings(event[key])) error(`${path}.${key}`, 'Informe uma lista de textos.');
      if (strings(event.semestres) && event.semestres.some(s => !/^\d{4}\.[12]$/.test(s))) error(`${path}.semestres`, 'Semestre inválido.');
      if (strings(event.links) && event.links.some(link => !safeCalendarUrl(link))) error(`${path}.links`, 'Use links HTTP/HTTPS válidos.');
      if (typeof event.categoria !== 'string' || !Object.hasOwn(CALENDAR_CATEGORIES, event.categoria)) error(`${path}.categoria`, 'Categoria desconhecida.');
      if (!Array.isArray(event.origens) || event.origens.some((origin: any) => !isObject(origin) || !pageValid(origin.pagina) || typeof origin.cabecalhoOriginal !== 'string' || typeof origin.trechoOriginal !== 'string')) error(`${path}.origens`, 'Informe páginas e trechos de origem válidos.');
    });
  }
  if (!Array.isArray(value.diasMarcados) || value.diasMarcados.length > 10000) error('diasMarcados', 'Informe uma lista de até 10.000 marcações.');
  else value.diasMarcados.forEach((day: any, index: number) => {
    if (!isObject(day) || !isCalendarDate(day.data) || !DAY_CLASSIFICATIONS.includes(day.classificacaoOriginal) || typeof day.corOuSimboloOriginal !== 'string' || typeof day.precisaRevisao !== 'boolean' || !strings(day.semestres) || day.semestres.some((s: string) => !/^\d{4}\.[12]$/.test(s)) || !pageValid(day.pagina)) error(`diasMarcados[${index}]`, 'Marcação de dia inválida.');
  });
  if (!strings(value.observacoesDocumento)) error('observacoesDocumento', 'Informe uma lista de observações.');
  if (!Array.isArray(value.problemas) || value.problemas.some((issue: any) => !isObject(issue) || typeof issue.descricao !== 'string' || typeof issue.tipo !== 'string' || !(issue.pagina === null || pageValid(issue.pagina)) || !(issue.eventoId === null || typeof issue.eventoId === 'string'))) error('problemas', 'Informe uma lista de problemas válida.');
  const coverage = value.cobertura;
  if (!isObject(coverage) || typeof coverage.extracaoCompleta !== 'boolean' || !Array.isArray(coverage.paginasAnalisadas) || !Array.isArray(coverage.paginasNaoProcessadas) || [...coverage.paginasAnalisadas, ...coverage.paginasNaoProcessadas].some(p => !pageValid(p))) error('cobertura', 'Informe a cobertura das páginas.');
  if (!issues.some(issue => issue.severity === 'error')) {
    const events = value.eventos as CalendarEvent[];
    const dates = [...events.flatMap(e => [e.inicio, e.fimInclusivo]), ...value.diasMarcados.map((day: any) => day.data)].filter(isCalendarDate).sort();
    if (dates.length && Number(dates.at(-1)!.slice(0, 4)) - Number(dates[0].slice(0, 4)) > 10) error('eventos', 'A cobertura deve ter no máximo dez anos.');
  }
  return issues;
}

export function createCalendarDraft(source: CalendarExtraction, sourceUrl = ''): CalendarDraft {
  return { schemaVersion: 1, source: structuredClone(source), sourceUrl,
    events: structuredClone(source.eventos), eventReviews: {}, issueReviews: {}, dayReviews: {} };
}
export function validateCalendarDraft(value: unknown, publishing = false): CalendarValidationIssue[] {
  if (!isObject(value) || value.schemaVersion !== 1 || !isObject(value.source)) return [{ path: '', message: 'Rascunho inválido.', severity: 'error' }];
  const issues = validateCalendarExtraction(value.source);
  issues.push(...validateCalendarExtraction({ ...value.source, eventos: value.events }).map(issue => ({ ...issue, path: `rascunho.${issue.path}` })));
  const error = (path: string, message: string) => issues.push({ path, message, severity: 'error' as const });
  if (typeof value.sourceUrl !== 'string' || (value.sourceUrl && !safeCalendarUrl(value.sourceUrl, true)) || (publishing && !value.sourceUrl)) error('sourceUrl', 'Informe a URL HTTPS do PDF oficial antes de publicar.');
  for (const key of ['eventReviews', 'issueReviews']) if (!isObject(value[key]) || Object.values(value[key]).some(note => typeof note !== 'string' || !note.trim())) error(key, 'Cada resolução deve ter uma justificativa.');
  if (!isObject(value.dayReviews) || Object.entries(value.dayReviews).some(([date, review]) => !isCalendarDate(date) || !isObject(review) || !DAY_CLASSIFICATIONS.includes(review.classification) || typeof review.note !== 'string' || !review.note.trim())) error('dayReviews', 'Escolha uma classificação válida e justifique a revisão.');
  return issues;
}
export function consolidateCalendarDays(source: CalendarExtraction, reviews: CalendarDraft['dayReviews'] = {}): CalendarDay[] {
  const groups = new Map<string, CalendarExtraction['diasMarcados']>();
  for (const mark of source.diasMarcados) groups.set(mark.data, [...(groups.get(mark.data) || []), mark]);
  return [...groups.entries()].map(([date, marks]) => {
    const classifications = [...new Set(marks.map(mark => mark.classificacaoOriginal))];
    const decision = reviews[date];
    return { date, classifications, classification: decision?.classification || (classifications.length === 1 ? classifications[0] : null),
      semesters: [...new Set(marks.flatMap(mark => mark.semestres))].sort(), pages: [...new Set(marks.map(mark => mark.pagina))].sort((a, b) => a - b),
      needsReview: !decision && (classifications.length > 1 || marks.some(mark => mark.precisaRevisao)) };
  }).sort((a, b) => a.date.localeCompare(b.date));
}
export function publishCalendarDraft(draft: CalendarDraft, publishedAt: string): CalendarPublication {
  const { instituicao, titulo, versao, dataPublicacao, semestres, totalPaginas } = draft.source.documento;
  const document = { instituicao, titulo, versao, dataPublicacao, semestres: [...semestres], totalPaginas };
  const unresolvedIssues = draft.source.problemas.filter((_, index) => !draft.issueReviews[String(index)]);
  const events = draft.events.filter(e => isCalendarDate(e.inicio) && isCalendarDate(e.fimInclusivo)).map(event => {
    const problems = unresolvedIssues.filter(issue => issue.eventoId === event.id).map(issue => issue.descricao);
    const reasons = [...new Set([...(draft.eventReviews[event.id] ? [] : event.motivosRevisao), ...problems])];
    const { id, titulo, descricaoOriginal, dataOriginal, inicio, fimInclusivo, diaInteiro, horarioOriginal, semestres, categoria, publico } = event;
    return { id, titulo, descricaoOriginal, dataOriginal, inicio, fimInclusivo, diaInteiro, horarioOriginal, semestres: [...semestres], categoria, publico: [...publico],
      origens: event.origens.map(({ pagina, cabecalhoOriginal, trechoOriginal }) => ({ pagina, cabecalhoOriginal, trechoOriginal })), links: event.links.map(link => safeCalendarUrl(link)!).filter(Boolean),
      precisaRevisao: (!draft.eventReviews[event.id] && event.precisaRevisao) || problems.length > 0, motivosRevisao: reasons };
  }).sort(sortCalendarEvents);
  return { document, sourceUrl: safeCalendarUrl(draft.sourceUrl, true)!, events,
    days: consolidateCalendarDays(draft.source, draft.dayReviews), unresolvedIssues: unresolvedIssues.map(({ pagina, eventoId, tipo, descricao }) => ({ pagina, eventoId, tipo, descricao })), publishedAt };
}
