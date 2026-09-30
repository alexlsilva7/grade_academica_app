import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import express from 'express';
import fs from 'node:fs';
import type { CalendarAdminState, CalendarDraft, CalendarExtraction } from '../src/calendarTypes';
import { createCalendarRouter } from '../src/server/calendarRoutes';
import { RepositoryError } from '../src/server/academicRepository';
import { SupabaseCalendarRepository, type CalendarRepository } from '../src/server/calendarRepository';
import { createCalendarDraft, publishCalendarDraft } from '../src/utils/academicCalendar';
import type { SupabaseClient } from '@supabase/supabase-js';

const source = JSON.parse(fs.readFileSync(new URL('./fixtures/calendario-academico-ufape.json', import.meta.url), 'utf8')) as CalendarExtraction;

test('calendar API protects writes, keeps preview and drafts private, publishes explicitly and rejects stale revisions', async () => {
  let stored: CalendarAdminState = { draft: null, calendar: null, revision: 0, publishedAt: null };
  const repository: CalendarRepository = {
    async getPublished() { return stored.calendar; },
    async getAdmin() { return structuredClone(stored); },
    async saveDraft(draft, revision) {
      if (revision !== stored.revision) throw new RepositoryError('Revisão mudou.', 409);
      stored = { ...stored, draft: structuredClone(draft), revision: revision + 1 };
      return structuredClone(stored);
    },
    async publish(revision) {
      if (revision !== stored.revision) throw new RepositoryError('Revisão mudou.', 409);
      const publishedAt = '2026-09-30T12:00:00Z';
      stored = { ...stored, publishedAt, revision: revision + 1, calendar: publishCalendarDraft(stored.draft!, publishedAt) };
      return structuredClone(stored);
    }
  };
  const app = express(); app.use(express.json({ limit: '5mb' }));
  app.use('/api', createCalendarRouter(() => repository, (req, res, next) => {
    if (!req.header('authorization')) return void res.status(401).json({ error: 'Sessão necessária.' });
    if (req.header('authorization') !== 'Bearer fixture-admin') return void res.status(403).json({ error: 'Sem acesso.' });
    req.adminUserId = '00000000-0000-0000-0000-000000000001'; next();
  }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const write = (path: string, method: string, body: unknown, token = 'fixture-admin') => fetch(`${base}${path}`, { method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  try {
    assert.deepEqual(await (await fetch(`${base}/calendar`)).json(), { calendar: null });
    assert.equal((await fetch(`${base}/admin/calendar`)).status, 401);
    assert.equal((await write('/admin/calendar/draft', 'PUT', {}, '')).status, 401);
    assert.equal((await write('/admin/calendar/publish', 'POST', {}, 'ordinary-user')).status, 403);
    assert.equal((await write('/admin/calendar/validate', 'POST', { data: { eventos: [null] } })).status, 422);
    const previewResponse = await write('/admin/calendar/validate', 'POST', { data: source, sourceUrl: 'https://ufape.edu.br/calendario.pdf' });
    assert.equal(previewResponse.status, 200);
    const preview = await previewResponse.json();
    assert.equal(preview.summary.events, 134);
    assert.equal(stored.draft, null, 'preview must not write');
    const draft: CalendarDraft = preview.draft;
    const save = await write('/admin/calendar/draft', 'PUT', { draft, revision: 0 });
    assert.equal(save.status, 200);
    assert.equal((await save.json()).revision, 1);
    assert.deepEqual(await (await fetch(`${base}/calendar`)).json(), { calendar: null });
    assert.equal((await write('/admin/calendar/draft', 'PUT', { draft, revision: 0 })).status, 409);
    assert.equal((await write('/admin/calendar/publish', 'POST', { revision: 1 })).status, 200);
    const published = await (await fetch(`${base}/calendar`)).json();
    assert.equal(published.calendar.events.length, 134);
    assert.equal('arquivo' in published.calendar.document, false);
    draft.events[0].titulo = 'Alteração ainda privada';
    assert.equal((await write('/admin/calendar/draft', 'PUT', { draft, revision: 2 })).status, 200);
    assert.notEqual((await (await fetch(`${base}/calendar`)).json()).calendar.events[0].titulo, draft.events[0].titulo);
    const restore = await write('/admin/calendar/validate', 'POST', { data: draft });
    assert.equal((await restore.json()).draft.events[0].titulo, 'Alteração ainda privada');
    assert.equal((await write('/admin/calendar/publish', 'POST', { revision: 2 })).status, 409);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});

test('Supabase repository updates use compare-and-swap and public reads select only the publication', async () => {
  let row: Record<string, any> = { draft: null, published: null, revision: 0, published_at: null };
  const columns: string[] = [];
  const client = { from(table: string) {
    assert.equal(table, 'academic_calendars');
    const filters: Record<string, unknown> = {}; let changes: Record<string, unknown> | null = null;
    const query = {
      select(value: string) { columns.push(value); return query; },
      eq(key: string, value: unknown) { filters[key] = value; return query; },
      update(value: Record<string, unknown>) { changes = value; return query; },
      async maybeSingle() {
        assert.equal(filters.id, 'ufape');
        if (changes && filters.revision !== row.revision) return { data: null, error: null };
        if (changes) row = { ...row, ...structuredClone(changes) };
        return { data: structuredClone(row), error: null };
      }
    }; return query;
  } } as unknown as SupabaseClient;
  const repo = new SupabaseCalendarRepository(client);
  assert.equal(await repo.getPublished(), null);
  assert.equal(columns[0], 'published');
  const draft = createCalendarDraft(source, 'https://ufape.edu.br/calendario.pdf');
  await repo.saveDraft(draft, 0, 'actor');
  await assert.rejects(repo.saveDraft(draft, 0, 'actor'), error => error instanceof RepositoryError && error.status === 409);
  assert.equal(row.published, null);
  const next = await repo.publish(1, 'actor');
  assert.equal(next.revision, 2);
  assert.equal(next.calendar!.events.length, 134);
  assert.ok(row.published_at);
});
