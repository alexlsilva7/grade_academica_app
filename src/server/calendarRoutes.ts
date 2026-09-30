import { Router, type RequestHandler, type Response } from 'express';
import type { CalendarDraft, CalendarExtraction } from '../calendarTypes.js';
import { createCalendarDraft, consolidateCalendarDays, validateCalendarDraft, validateCalendarExtraction, safeCalendarUrl } from '../utils/academicCalendar.js';
import type { CalendarRepository } from './calendarRepository.js';
import { RepositoryError } from './academicRepository.js';

export function createCalendarRouter(getRepository: () => CalendarRepository | null, requireAdmin: RequestHandler): Router {
  const router = Router();
  const repository = () => {
    const result = getRepository();
    if (!result) throw new RepositoryError('Configure o Supabase no servidor para administrar o calendário.', 503);
    return result;
  };
  const fail = (res: Response, error: unknown) => res.status(error instanceof RepositoryError ? error.status : 500)
    .json({ error: error instanceof RepositoryError ? error.message : 'Não foi possível processar o calendário.' });
  router.get('/calendar', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    try { res.json({ calendar: await getRepository()?.getPublished() || null }); }
    catch (error) { fail(res, error); }
  });
  router.use('/admin/calendar', requireAdmin, (_req, res, next) => { res.set('Cache-Control', 'no-store');
    if (Buffer.byteLength(JSON.stringify(_req.body || {}), 'utf8') > 5 * 1024 * 1024) return void res.status(413).json({ error: 'O calendário deve ter até 5 MB.' });
    next(); });
  router.get('/admin/calendar', async (_req, res) => {
    try { res.json(await repository().getAdmin()); } catch (error) { fail(res, error); }
  });
  router.post('/admin/calendar/validate', async (req, res) => {
    try {
      const source: unknown = req.body?.data;
      const isBackup = !!source && typeof source === 'object' && 'schemaVersion' in source;
      const issues = isBackup ? validateCalendarDraft(source) : validateCalendarExtraction(source);
      if (issues.some(issue => issue.severity === 'error')) return res.status(422).json({ error: 'Corrija os dados inválidos antes de importar.', issues });
      const draft = isBackup ? structuredClone(source) as CalendarDraft
        : createCalendarDraft(source as CalendarExtraction, typeof req.body.sourceUrl === 'string' ? req.body.sourceUrl : '');
      const current = await repository().getAdmin();
      const old = new Map(current.calendar?.events.map(event => [event.id, event]) || []);
      const added = draft.events.filter(event => !old.has(event.id)).length;
      const comparable = (event: CalendarDraft['events'][number]) => JSON.stringify([
        event.titulo, event.descricaoOriginal, event.dataOriginal, event.inicio, event.fimInclusivo,
        event.diaInteiro, event.horarioOriginal, event.categoria, event.semestres, event.publico,
        event.links.map(link => safeCalendarUrl(link)), event.origens, event.precisaRevisao, event.motivosRevisao
      ]);
      const changed = draft.events.filter(event => old.has(event.id) && comparable(event) !== comparable(old.get(event.id)!)).length;
      const removed = [...old.keys()].filter(id => !draft.events.some(event => event.id === id)).length;
      return res.json({ draft, issues, revision: current.revision,
        summary: { events: draft.events.length, days: consolidateCalendarDays(draft.source).length,
          pendingEvents: draft.events.filter(event => event.precisaRevisao).length,
          problems: draft.source.problemas.length, coverage: draft.source.cobertura, added, changed, removed } });
    } catch (error) { return fail(res, error); }
  });
  router.put('/admin/calendar/draft', async (req, res) => {
    try {
      if (!Number.isSafeInteger(req.body?.revision) || req.body.revision < 0) return res.status(422).json({ error: 'Informe a revisão do calendário.' });
      const issues = validateCalendarDraft(req.body?.draft);
      if (issues.some(issue => issue.severity === 'error')) return res.status(422).json({ error: 'Corrija o rascunho antes de salvar.', issues });
      return res.json(await repository().saveDraft(req.body.draft as CalendarDraft, req.body.revision, req.adminUserId!));
    } catch (error) { return fail(res, error); }
  });
  router.post('/admin/calendar/publish', async (req, res) => {
    try {
      if (!Number.isSafeInteger(req.body?.revision) || req.body.revision < 0) return res.status(422).json({ error: 'Informe a revisão do calendário.' });
      const repo = repository();
      const current = await repo.getAdmin();
      if (!current.draft) return res.status(422).json({ error: 'Salve um rascunho antes de publicar.' });
      const issues = validateCalendarDraft(current.draft, true);
      if (issues.some(issue => issue.severity === 'error')) return res.status(422).json({ error: 'Corrija o rascunho e informe o link oficial antes de publicar.', issues });
      return res.json(await repo.publish(req.body.revision, req.adminUserId!));
    } catch (error) { return fail(res, error); }
  });
  return router;
}
