import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { FileAcademicRepository } from '../src/server/academicRepository';

test('Public course API preserves semester fallback and rejects unauthenticated edits', { timeout: 90000 }, async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'academic-admin-test-'));
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = (socket.address() as net.AddressInfo).port;
  await new Promise<void>(resolve => socket.close(() => resolve()));
  const meta = { id: 'test', name: 'Curso teste', shortName: 'TST', hasCurriculum: true, hasSchedule: true, semesters: ['2025.2'], visibleSemesters: ['2025.2'], showMatriz: false };
  await fs.mkdir(path.join(directory, 'test'));
  await fs.writeFile(path.join(directory, 'courses_registry.json'), JSON.stringify([meta]));
  const curriculum = JSON.stringify({ subjects: [] });
  const schedule = JSON.stringify([{ id: 'a', code: 'A', name: 'A', professor: null, period: 1, semester: '2025.2', sessions: [{ day: 1, time: '08:00 - 09:00' }] }]);
  await fs.writeFile(path.join(directory, 'test', 'curriculo_test.json'), curriculum);
  await fs.writeFile(path.join(directory, 'test', 'horario_test_2025_2.json'), schedule);
  const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), ACADEMIC_DATA_DIR: directory, ACADEMIC_DATA_SOURCE: 'files', NODE_ENV: 'test' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let logs = '';
  child.stdout.on('data', data => { logs += data; }); child.stderr.on('data', data => { logs += data; });
  const base = `http://127.0.0.1:${port}`;
  const write = (url: string, method: string, body: unknown) => fetch(`${base}${url}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 400; attempt++) {
      try { ready = (await fetch(`${base}/api/courses`)).ok; if (ready) break; } catch {}
      if (child.exitCode != null) throw new Error(logs);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, logs);
    const strict = await (await fetch(`${base}/api/courses/test?semester=2026.2&strict=true`)).json();
    assert.equal(strict.schedule, null); assert.equal(strict.resolvedSemester, null);
    const legacy = await (await fetch(`${base}/api/courses/test?semester=2026.2`)).json();
    assert.equal(legacy.schedule[0].id, 'a'); assert.equal(legacy.resolvedSemester, '2025.2');
    assert.equal((await write('/api/courses/test/metadata', 'PATCH', { name: 'Curso renomeado', shortName: 'NEW' })).status, 401);
    assert.equal((await write('/api/courses', 'POST', { id: 'test', name: 'Curso renomeado', shortName: 'NEW' })).status, 401);
    const repository = new FileAcademicRepository(directory);
    await repository.updateCourseMetadata('test', 'Curso renomeado', 'NEW');
    assert.equal(await fs.readFile(path.join(directory, 'test', 'curriculo_test.json'), 'utf8'), curriculum);
    assert.equal(await fs.readFile(path.join(directory, 'test', 'horario_test_2025_2.json'), 'utf8'), schedule);
    await repository.saveCourse({ id: 'test', name: 'Curso renomeado', shortName: 'NEW', curriculum: { subjects: [], treeSubjects: [], profiles: [] } });
    let registry = JSON.parse(await fs.readFile(path.join(directory, 'courses_registry.json'), 'utf8'));
    assert.deepEqual(registry[0].semesters, ['2025.2']); assert.equal(registry[0].showMatriz, false);
    await repository.saveCourse({ id: 'test', name: 'Curso renomeado', shortName: 'NEW', schedule: [], semester: '2026.2' });
    assert.equal(await fs.readFile(path.join(directory, 'test', 'horario_test_2025_2.json'), 'utf8'), schedule);
    const empty = await (await fetch(`${base}/api/courses/test?semester=2026.2&strict=true`)).json();
    assert.deepEqual(empty.schedule, []); assert.equal(empty.resolvedSemester, '2026.2');
    assert.equal((await write('/api/courses/test/metadata', 'PATCH', { name: '', shortName: 'BAD' })).status, 401);
    registry = JSON.parse(await fs.readFile(path.join(directory, 'courses_registry.json'), 'utf8'));
    assert.equal(registry[0].name, 'Curso renomeado');
  } finally {
    if (child.exitCode == null) { const exited = once(child, 'exit'); child.kill(); await exited; }
    // This is the dedicated mkdtemp fixture, never the project data directory.
    await fs.rm(directory, { recursive: true, force: true });
  }
});
