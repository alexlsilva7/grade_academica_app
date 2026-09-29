import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FileAcademicRepository } from '../src/server/academicRepository';
import { createMigrationRun, discoverMigrationInventory, previewMigration, type MigrationInventory } from '../src/server/academicMigration';
import { requireAdmin } from '../src/server/adminAuth';

function previewClient(destinationRows: Record<string, any>): SupabaseClient {
  return {
    from(table: string) {
      let rowId = '';
      return {
        select() { return this; },
        eq(_column: string, value: string) { rowId = value; return this; },
        async maybeSingle() { return { data: destinationRows[`${table}:${rowId}`] || null, error: null }; }
      };
    }
  } as unknown as SupabaseClient;
}

test('migration inventory covers the current My UFAPE files without inventing missing data', async t => {
  const actual = discoverMigrationInventory(new FileAcademicRepository(path.join(process.cwd(), '.backup', 'src', 'data')));
  assert.equal(actual.items.filter(item => item.kind === 'course').length, 5);
  assert.equal(actual.items.filter(item => item.kind === 'curriculum').length, 5);
  const schedules = actual.items.filter(item => item.kind === 'schedule');
  assert.equal(schedules.length, 5);
  assert.equal(new Set(schedules.map(item => item.courseId)).size, 4);
  assert.equal(actual.items.filter(item => item.kind === 'contents').length, 1);
  assert.equal(actual.missing.length, 0);
  const realPreview = await previewMigration(actual, previewClient({}), actual.items.map(item => item.key), []);
  assert.equal(realPreview.ready, true, JSON.stringify(realPreview.items.filter(item => item.status === 'invalid')));

  const dataRoot = path.join(process.cwd(), '.backup', 'src', 'data');
  const extractionFiles = fs.readdirSync(dataRoot, { recursive: true }).filter(file => path.basename(String(file)).startsWith('extracao_'));
  assert.equal(extractionFiles.length, 0);

  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'my-ufape-missing-'));
  t.after(() => fsp.rm(directory, { recursive: true, force: true }));
  const repo = new FileAcademicRepository(directory);
  await fsp.writeFile(repo.registryPath, JSON.stringify([
    { id: 'x', name: 'Curso X', shortName: 'X', hasCurriculum: true, hasSchedule: true, semesters: ['2025.2'] }
  ]));
  const inventory = discoverMigrationInventory(repo);
  assert.deepEqual(inventory.items.map(item => item.kind), ['course']);
  assert.deepEqual(inventory.missing.map(item => item.kind), ['curriculum', 'schedule']);
  assert.equal(inventory.items.some(item => item.kind === 'curriculum' && Array.isArray(item.data) && item.data.length === 0), false);
});

test('migration preview distinguishes new, identical and conflicting destination data', async () => {
  const course = { id: 'bcc', name: 'Ciência da Computação', shortName: 'BCC' };
  const item = {
    key: 'course:bcc', courseId: 'bcc', courseName: course.name, kind: 'course' as const,
    sourceFile: 'courses_registry.json', checksum: 'abc', data: course, records: 1
  };
  const inventory: MigrationInventory = { items: [item], missing: [], ignoredFiles: [], sourceDirectory: 'src/data' };
  const selected = ['course:bcc'];

  const fresh = await previewMigration(inventory, previewClient({}), selected, []);
  assert.equal(fresh.items[0].status, 'new');
  assert.equal(fresh.ready, true);

  const identical = await previewMigration(inventory, previewClient({ 'courses:bcc': { data: course } }), selected, []);
  assert.equal(identical.items[0].status, 'identical');
  assert.equal(identical.ready, true);

  const different = await previewMigration(inventory, previewClient({ 'courses:bcc': { data: { ...course, name: 'Nome diferente' } } }), selected, []);
  assert.equal(different.items[0].status, 'different');
  assert.equal(different.ready, false);
  assert.notEqual(fresh.fingerprint, different.fingerprint, 'A prévia deve mudar quando o destino muda.');
  const overwritten = await previewMigration(inventory, previewClient({ 'courses:bcc': { data: { ...course, name: 'Nome diferente' } } }), selected, ['course:bcc']);
  assert.equal(overwritten.items[0].overwrite, true);
  assert.equal(overwritten.ready, true);

  await assert.rejects(createMigrationRun(
    previewClient({ 'courses:bcc': { data: { ...course, name: 'Destino atualizado' } } }),
    'local', inventory, selected, [], fresh.fingerprint
  ), (error: any) => error.code === 'STALE_PREVIEW');
  const changedSource = { ...inventory, items: [{ ...item, checksum: 'changed-source-checksum' }] };
  await assert.rejects(createMigrationRun(
    previewClient({}), 'local', changedSource, selected, [], fresh.fingerprint
  ), (error: any) => error.code === 'STALE_PREVIEW');
});

test('malformed curriculum JSON is blocked instead of imported as an empty list', async t => {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'my-ufape-invalid-'));
  t.after(() => fsp.rm(directory, { recursive: true, force: true }));
  const repository = new FileAcademicRepository(directory);
  await fsp.writeFile(repository.registryPath, JSON.stringify([
    { id: 'broken', name: 'Curso quebrado', shortName: 'BRK', hasCurriculum: true, hasSchedule: false }
  ]));
  const courseDirectory = path.join(directory, 'broken');
  await fsp.mkdir(courseDirectory);
  await fsp.writeFile(path.join(courseDirectory, 'curriculo_broken.json'), '{ invalid json');
  const inventory = discoverMigrationInventory(repository);
  const preview = await previewMigration(inventory, previewClient({}), ['curriculum:broken'], []);
  const curriculum = preview.items.find(item => item.kind === 'curriculum');
  assert.equal(curriculum?.status, 'invalid');
  assert.equal(preview.ready, false);
});

test('administrative API rejects sessions without an allowed Supabase user', async t => {
  const keys = ['NODE_ENV', 'ACADEMIC_DATA_SOURCE', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'ADMIN_USER_IDS'] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(() => { for (const key of keys) previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key]!; });
  process.env.NODE_ENV = 'production';
  process.env.ACADEMIC_DATA_SOURCE = 'files';
  process.env.VITE_SUPABASE_URL = 'https://my-ufape-test.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_key';
  process.env.ADMIN_USER_IDS = '11111111-1111-4111-8111-111111111111';

  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let authenticatedUserId = '22222222-2222-4222-8222-222222222222';
  globalThis.fetch = async () => new Response(JSON.stringify({ id: authenticatedUserId }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });

  async function invoke(token?: string, local = false) {
    let status = 200;
    let payload: any;
    let continued = false;
    const req: any = {
      socket: { remoteAddress: local ? '127.0.0.1' : '203.0.113.10' }, ip: local ? '127.0.0.1' : '203.0.113.10',
      header: (name: string) => name.toLowerCase() === 'authorization' && token ? `Bearer ${token}` : undefined
    };
    const res: any = { status(code: number) { status = code; return this; }, json(value: any) { payload = value; return this; } };
    await requireAdmin(req, res, () => { continued = true; });
    return { status, payload, continued, userId: req.adminUserId };
  }

  assert.equal((await invoke()).status, 401);
  process.env.NODE_ENV = 'test';
  assert.equal((await invoke(undefined, true)).status, 401, 'localhost also requires an administrator session');
  const denied = await invoke('valid-session-token');
  assert.equal(denied.status, 403);
  assert.equal(denied.continued, false);
  authenticatedUserId = '11111111-1111-4111-8111-111111111111';
  const allowed = await invoke('valid-admin-token');
  assert.equal(allowed.status, 200);
  assert.equal(allowed.continued, true);
  assert.equal(allowed.userId, authenticatedUserId);
});
