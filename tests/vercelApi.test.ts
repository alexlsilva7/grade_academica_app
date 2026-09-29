import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

test('Vercel entry serves public course routes and protects administrative writes', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'vercel-api-test-'));
  const previousSource = process.env.ACADEMIC_DATA_SOURCE;
  const previousDirectory = process.env.ACADEMIC_DATA_DIR;
  process.env.ACADEMIC_DATA_SOURCE = 'files';
  process.env.ACADEMIC_DATA_DIR = directory;
  try {
    await fs.writeFile(path.join(directory, 'courses_registry.json'), JSON.stringify([
      { id: 'test', name: 'Curso teste', shortName: 'TST', semesters: ['2026.2'] }
    ]));
    await fs.mkdir(path.join(directory, 'test'));
    await fs.writeFile(path.join(directory, 'test', 'horario_test_2026_2.json'), '[]');
    const { default: app } = await import('../api/index');
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const health = await fetch(`${base}/api/health`);
      assert.equal(health.status, 200);
      assert.equal((await health.json()).status, 'ok');
      const courses = await fetch(`${base}/api/courses`);
      assert.equal(courses.status, 200);
      assert.equal((await courses.json()).courses[0].id, 'test');
      const detail = await fetch(`${base}/api/courses/test?semester=2026.2&strict=true&include=schedule`);
      assert.equal(detail.status, 200);
      assert.equal((await detail.json()).resolvedSemester, '2026.2');
      const write = await fetch(`${base}/api/courses`, { method: 'POST' });
      assert.equal(write.status, 401);
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  } finally {
    if (previousSource === undefined) delete process.env.ACADEMIC_DATA_SOURCE;
    else process.env.ACADEMIC_DATA_SOURCE = previousSource;
    if (previousDirectory === undefined) delete process.env.ACADEMIC_DATA_DIR;
    else process.env.ACADEMIC_DATA_DIR = previousDirectory;
    await fs.rm(directory, { recursive: true, force: true });
  }
});
