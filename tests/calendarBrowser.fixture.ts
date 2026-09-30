// Loopback-only browser fixture. Never imported by the production server.
import express from 'express';
import { createServer } from 'vite';
import type { CalendarAdminState } from '../src/calendarTypes';
import { createCalendarRouter } from '../src/server/calendarRoutes';
import { RepositoryError } from '../src/server/academicRepository';
import { publishCalendarDraft } from '../src/utils/academicCalendar';

let state: CalendarAdminState = { draft: null, calendar: null, revision: 0, publishedAt: null };
const app = express();
app.use(express.json({ limit: '5mb' }));
app.get('/api/admin/config', (_req, res) => res.json({ authRequired: false, authConfigured: false, dataSource: 'files' }));
app.get('/api/courses', (_req, res) => res.json({ courses: [{ id: 'bcc', name: 'Curso de teste', shortName: 'TEST', semesters: ['2026.2'], visibleSemesters: ['2026.2'], hasCurriculum: true }] }));
app.get('/api/courses/:id', (req, res) => res.json({ course: { id: req.params.id, name: 'Curso de teste', shortName: 'TEST', semesters: ['2026.2'], visibleSemesters: ['2026.2'] }, curriculum: null, schedule: [], contents: [], resolvedSemester: '2026.2' }));
app.use('/api', createCalendarRouter(() => ({
  async getPublished() { return structuredClone(state.calendar); },
  async getAdmin() { return structuredClone(state); },
  async saveDraft(draft, revision) {
    if (revision !== state.revision) throw new RepositoryError('Outra sessão alterou o calendário.', 409);
    state = { ...state, draft: structuredClone(draft), revision: revision + 1 };
    return structuredClone(state);
  },
  async publish(revision) {
    if (revision !== state.revision) throw new RepositoryError('Outra sessão alterou o calendário.', 409);
    const publishedAt = new Date().toISOString();
    state = { ...state, publishedAt, revision: revision + 1, calendar: publishCalendarDraft(state.draft!, publishedAt) };
    return structuredClone(state);
  }
}), (req, _res, next) => { req.adminUserId = '00000000-0000-0000-0000-000000000001'; next(); }));
const vite = await createServer({ server: { middlewareMode: true, hmr: { port: 24679 } }, appType: 'spa' });
app.use(vite.middlewares);
const server = app.listen(3016, '127.0.0.1', () => console.log('Calendar browser fixture: http://127.0.0.1:3016'));
process.on('SIGINT', () => { server.close(); void vite.close().then(() => process.exit(0)); });
