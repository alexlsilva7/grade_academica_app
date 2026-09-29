import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { cleanupExpiredExtractions } from '../extractionJobs';

test('extraction retention defaults to a dry run and preserves active or recent jobs', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'academic-retention-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const now = Date.now();
  const createJob = (ageDays: number, active = false) => {
    const token = randomUUID();
    const folder = path.join(directory, token);
    fs.mkdirSync(folder);
    const updatedAt = new Date(now - ageDays * 24 * 60 * 60 * 1000).toISOString();
    fs.writeFileSync(path.join(folder, 'job.json'), JSON.stringify({ createdAt: updatedAt, updatedAt }));
    fs.writeFileSync(path.join(folder, 'progress.json'), JSON.stringify({ updatedAt }));
    if (active) fs.writeFileSync(path.join(folder, 'worker.lock'), JSON.stringify({ pid: process.pid, host: os.hostname() }));
    return folder;
  };
  const expired = createJob(45);
  const recent = createJob(4);
  const active = createJob(90, true);

  assert.deepEqual(cleanupExpiredExtractions(directory, 30, false, now), {
    examined: 3, expired: 1, deleted: 0, skippedActive: 1
  });
  assert.ok(fs.existsSync(path.join(expired, 'job.json')), 'dry run must preserve expired job data');
  assert.deepEqual(cleanupExpiredExtractions(directory, 30, true, now), {
    examined: 3, expired: 1, deleted: 1, skippedActive: 1
  });
  assert.ok(!fs.existsSync(expired));
  assert.ok(fs.existsSync(path.join(recent, 'job.json')));
  assert.ok(fs.existsSync(path.join(active, 'job.json')));
});
