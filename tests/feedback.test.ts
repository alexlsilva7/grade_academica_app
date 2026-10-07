import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express, { type RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { validateFeedbackInput, sanitizeFeedbackMetadata, validateFeedbackUpdate } from '../src/utils/feedback';
import { feedbackBodyError, feedbackRequesterHash, feedbackRoutes } from '../src/server/feedbackRoutes';

const input = () => ({ submissionId: randomUUID(), category: 'suggestion', message: 'Gostaria de sugerir uma melhoria.', name: '', email: '', metadata: { course: 'bcc', view: 'home', device: 'Computador', browser: 'Chrome', viewport: '390 × 844', theme: 'Claro', version: 'test' } });

test('feedback allows optional contact and trims validated text', () => {
  const result = validateFeedbackInput({ ...input(), name: ' Alex ', email: ' alex@example.com ', message: '  Uma sugestão para o site.  ' });
  assert.equal(result.name, 'Alex'); assert.equal(result.email, 'alex@example.com'); assert.equal(result.message, 'Uma sugestão para o site.');
  assert.equal(validateFeedbackInput(input()).email, null);
  for (const change of [{ category: '__proto__' }, { category: 'constructor' }, { message: '  curto  ' }, { message: 'x'.repeat(3001) }, { email: 'invalido' }, { name: 'x'.repeat(101) }, { submissionId: 'invalid' }]) {
    assert.throws(() => validateFeedbackInput({ ...input(), ...change }));
  }
});

test('metadata is mandatory and allowlist excludes private state', () => {
  const metadata = { course: 'bcc', viewport: '390 × 844', ip: '1.2.3.4', token: 'secret', notes: 'private', userAgent: 'raw agent', schedule: [], href: '/?email=private', profile: 'x'.repeat(121) };
  assert.deepEqual(sanitizeFeedbackMetadata(metadata), { course: 'bcc', viewport: '390 × 844' });
  assert.throws(() => validateFeedbackInput({ ...input(), metadata: {} }), /contexto/);
  assert.throws(() => validateFeedbackInput({ ...input(), metadata: undefined }), /contexto/);
  for (const key of ['view', 'device', 'browser', 'viewport', 'theme', 'version']) {
    assert.throws(() => validateFeedbackInput({ ...input(), metadata: { ...input().metadata, [key]: '' } }), /contexto/);
  }
  assert.deepEqual(validateFeedbackInput({ ...input(), includeContext: false }).metadata, input().metadata);
});

test('admin updates only accept known situations and bounded internal notes', () => {
  assert.deepEqual(validateFeedbackUpdate({ status: 'planned', internal_notes: '  Revisar  ', message: 'changed' }), { status: 'planned', internal_notes: 'Revisar' });
  assert.throws(() => validateFeedbackUpdate({ status: 'constructor', internal_notes: '' }));
  assert.throws(() => validateFeedbackUpdate({ status: 'new', internal_notes: 'x'.repeat(5001) }));
});

test('anti-spam hash rotates daily and ignores forwarded headers outside Vercel', () => {
  const date = new Date('2026-10-07T12:00:00Z');
  const req = { header: () => '8.8.8.8', socket: { remoteAddress: '127.0.0.1' } } as any;
  const local = feedbackRequesterHash(req, 'test-secret', false, date);
  assert.match(local, /^[0-9a-f]{64}$/);
  assert.equal(local, feedbackRequesterHash({ ...req, header: () => '1.1.1.1' }, 'test-secret', false, date));
  assert.notEqual(local, feedbackRequesterHash(req, 'test-secret', true, date));
  assert.notEqual(local, feedbackRequesterHash(req, 'test-secret', false, new Date('2026-10-08T12:00:00Z')));
  assert.equal(local, feedbackRequesterHash({ ...req, header: () => 'spoofed' }, 'test-secret', true, date));
});

test('public feedback API validates, strips metadata, protects admin routes and handles storage failures', async () => {
  const calls: any[] = [];
  let mode = 'success';
  const client = { rpc: async (_name: string, params: any) => {
    calls.push(params);
    if (mode === 'error') return { data: null, error: { message: 'secret database detail' } };
    if (mode === 'limited') return { data: { rate_limited: true, retry_after: 42 }, error: null };
    return { data: { id: params.p_id }, error: null };
  }, from: () => { throw new Error('Unauthorized requests must not query feedback'); } } as unknown as SupabaseClient;
  const admin: RequestHandler = (_req, res) => { res.status(401).json({ error: 'Authentication required' }); };
  const app = express(); app.use(express.json({ limit: '16kb' })); app.use(feedbackBodyError); app.use('/api', feedbackRoutes(() => client, admin, () => 'test-secret'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const port = (server.address() as any).port;
  const base = `http://127.0.0.1:${port}/api`;
  const post = (body: unknown) => fetch(`${base}/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const payload = input();
    let response = await post({ ...payload, includeContext: false, metadata: { ...payload.metadata, ip: 'private' }, status: 'resolved' });
    assert.equal(response.status, 201); assert.deepEqual(await response.json(), { received: true, id: payload.submissionId });
    assert.deepEqual(calls[0].p_metadata, payload.metadata); assert.equal(calls[0].p_name, null); assert.equal(calls[0].p_status, undefined);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await post({ ...input(), message: 'short' })).status, 400);
    assert.equal((await post({ ...input(), metadata: {} })).status, 400);
    assert.equal((await post({ website: 'spam.example' })).status, 202);
    assert.equal(calls.length, 1);
    mode = 'limited'; response = await post(input());
    assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '42');
    mode = 'error'; response = await post(input());
    assert.equal(response.status, 503); assert.doesNotMatch(JSON.stringify(await response.json()), /secret database/);
    assert.equal((await fetch(`${base}/admin/feedback`)).status, 401);
    assert.equal((await fetch(`${base}/admin/feedback/${randomUUID()}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'resolved', internal_notes: '' }) })).status, 401);
    assert.equal((await post({ ...input(), message: 'x'.repeat(20000) })).status, 413);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});

test('admin feedback API filters and paginates, and updates only status and notes', async () => {
  const id = randomUUID();
  const row = { id, category: 'problem', message: 'Mensagem original do visitante.', name: null, email: null, metadata: { course: 'bcc' }, status: 'new', internal_notes: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  const calls: any[] = [];
  const client = { from(table: string) {
    const filters: Record<string, string> = {};
    let update: any = null;
    const query: any = {
      select() { return query; }, eq(key: string, value: string) { filters[key] = value; return query; }, order() { return query; },
      update(value: any) { update = value; return query; },
      async range(start: number, end: number) { calls.push({ table, filters, start, end }); return { data: [row], count: 1, error: null }; },
      async maybeSingle() { calls.push({ table, filters, update }); if (filters.id !== id) return { data: null, error: null }; Object.assign(row, update); return { data: { ...row }, error: null }; },
    }; return query;
  } } as unknown as SupabaseClient;
  const admin: RequestHandler = (req, res, next) => { if (req.header('authorization') === 'Bearer test-admin') next(); else res.status(401).json({ error: 'Authentication required' }); };
  const app = express(); app.use(express.json()); app.use('/api', feedbackRoutes(() => client, admin, () => 'test-secret'));
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/admin/feedback`;
  const headers = { Authorization: 'Bearer test-admin', 'Content-Type': 'application/json' };
  try {
    let response = await fetch(`${base}?status=new&category=problem&course=bcc&offset=25`, { headers });
    assert.equal(response.status, 200); assert.equal((await response.json()).total, 1);
    assert.deepEqual(calls[0], { table: 'site_feedback', filters: { status: 'new', category: 'problem', 'metadata->>course': 'bcc' }, start: 25, end: 49 });
    assert.equal((await fetch(`${base}?status=constructor`, { headers })).status, 400);
    assert.equal((await fetch(`${base}?offset=-1`, { headers })).status, 400);
    response = await fetch(`${base}/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'resolved', internal_notes: 'Correção concluída.', message: 'overwrite', metadata: { course: 'other' }, updated_at: '2000-01-01' }) });
    assert.equal(response.status, 200);
    const updated = (await response.json()).item;
    assert.equal(updated.status, 'resolved'); assert.equal(updated.internal_notes, 'Correção concluída.'); assert.equal(updated.message, row.message); assert.deepEqual(updated.metadata, { course: 'bcc' });
    assert.notEqual(updated.updated_at, '2000-01-01'); assert.deepEqual(Object.keys(calls[1].update).sort(), ['internal_notes', 'status', 'updated_at']);
    assert.equal((await fetch(`${base}/${randomUUID()}`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'new', internal_notes: '' }) })).status, 404);
    assert.equal((await fetch(`${base}/bad-id`, { method: 'PATCH', headers, body: '{}' })).status, 400);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
