import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import { PDFDocument } from 'pdf-lib';
import { Type } from '@google/genai';
import { extractAcademicData } from '../extractionPipeline';
import { ExtractionJobStore } from '../extractionJobs';
import { extractionRoutes } from '../extractionRoutes';
import type { AcademicAIClient } from '../aiProvider';
import { safeLogMessage } from '../src/utils/extractionActivity';

const defaults = (schema: any): any => schema.nullable ? null : schema.type === Type.OBJECT ?
  Object.fromEntries(Object.entries(schema.properties).map(([key, child]) => [key, defaults(child)])) : schema.type === Type.ARRAY ? [] : '';
const respond = (args: any) => {
  const schema = args.config.responseSchema;
  const file = args.contents[0].text.split('\n')[0].replace('FONTE: ', '');
  const result = defaults(schema);
  result.records = [{ ...defaults(schema.properties.records.items), name: 'Álgebra',
    evidence: [{ field: 'name', file, page: 1, excerpt: 'Álgebra' }] }];
  return result;
};
const response = (value: any) => ({ text: JSON.stringify(value), candidates: [{ finishReason: 'STOP' }] });
function temporaryStore(t: any) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'academic-resume-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}
async function serve(store: ExtractionJobStore, ai: AcademicAIClient) {
  const app = express(); app.use(express.json()); app.use('/api', extractionRoutes(() => ai, store));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}/api`;
  return {
    post: (endpoint: string, body: any, signal?: AbortSignal) => fetch(`${base}/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal
    }),
    get: (endpoint: string) => fetch(`${base}/${endpoint}`),
    close: () => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); })
  };
}

test('single PDF result survives a fresh store without another AI call', async t => {
  const directory = temporaryStore(t);
  const pdf = await PDFDocument.create(); pdf.addPage(); pdf.addPage();
  const input = { files: [{ fileName: 'grade.pdf', base64Data: Buffer.from(await pdf.save()).toString('base64') }], model: 'moonshot/kimi-k2.6' };
  let calls = 0;
  const ai: AcademicAIClient = { models: { generateContent: async args => { calls++; return response(respond(args)); } } };
  const store = new ExtractionJobStore(directory);
  const job = store.create('schedule', input);
  await extractAcademicData(ai, input, 'schedule', undefined, undefined, store.checkpoint(job.token));
  assert.equal(store.checkpoint(job.token).results.size, 1);
  const restarted = new ExtractionJobStore(directory);
  const recovered = restarted.get(job.token);
  const result = await extractAcademicData(ai, recovered.input, recovered.mode, undefined, undefined, restarted.checkpoint(job.token));
  assert.equal(calls, 1);
  assert.equal(result._extraction.calls[0].status, 'checkpoint');
});

test('HTTP resumes with token alone after restart and retains the completed result', async t => {
  const directory = temporaryStore(t);
  let fail = true, calls = 0;
  const ai: AcademicAIClient = { models: { generateContent: async args => {
    calls++;
    if (fail) throw new Error('simulated interruption');
    return response(respond(args));
  } } };
  let service = await serve(new ExtractionJobStore(directory), ai);
  t.after(() => service.close());
  const token = randomUUID();
  const input = { files: [{ fileName: 'a.png', mimeType: 'image/png', base64Data: 'YQ==' }],
    model: 'moonshot/kimi-k2.6' };
  assert.equal((await service.post('extraction-jobs', { token, mode: 'schedule', input })).status, 200);
  const failed = await service.post('extract-schedule', { resumeToken: token });
  assert.equal(failed.status, 422); assert.equal((await failed.json()).resumeToken, token);
  await service.close();
  service = await serve(new ExtractionJobStore(directory), ai);
  assert.equal((await (await service.get(`extraction-jobs/${token}`)).json()).completedCalls, 0);
  fail = false;
  const resumed = await service.post('extract-schedule', { resumeToken: token });
  assert.equal(resumed.status, 200);
  const result = await resumed.json(); assert.equal(result.disciplines.length, 1); assert.equal(calls, 2);
  // A lost completion response or browser reload can retrieve the saved result.
  await service.close();
  service = await serve(new ExtractionJobStore(directory), { models: { generateContent: async () => { throw new Error('Must not call AI'); } } });
  const completed = await service.post('extract-schedule', { resumeToken: token });
  assert.equal(completed.status, 200); assert.deepEqual((await completed.json()).disciplines, result.disciplines);
  // Duplicate preparation and wrong sources never reset another job's progress.
  assert.equal((await service.post('extraction-jobs', { token, mode: 'schedule', input })).status, 200);
  assert.equal((await service.post('extract-schedule', { resumeToken: token, textContent: 'changed' })).status, 409);
  assert.equal((await service.post('extract-curriculum', { resumeToken: token })).status, 409);
});

test('disconnect preserves results and competing requests cannot release the owner lock', async t => {
  const directory = temporaryStore(t);
  const store = new ExtractionJobStore(directory);
  let enter!: () => void, exited!: () => void;
  const entered = new Promise<void>(resolve => { enter = resolve; });
  const aborted = new Promise<void>(resolve => { exited = resolve; });
  const ai: AcademicAIClient = { models: { generateContent: async args => {
    enter();
    return new Promise((_, reject) => args.config.abortSignal!.addEventListener('abort', () => {
      exited(); reject(args.config.abortSignal!.reason);
    }, { once: true }));
  } } };
  const service = await serve(store, ai); t.after(() => service.close());
  const job = store.create('schedule', { files: [{ fileName: 'a.png', mimeType: 'image/png', base64Data: 'YQ==' }],
    model: 'moonshot/kimi-k2.6' });
  const controller = new AbortController();
  const running = service.post('extract-schedule', { resumeToken: job.token }, controller.signal);
  const rejection = assert.rejects(running, /abort/i);
  await entered;
  assert.equal((await service.post('extract-schedule', { resumeToken: job.token })).status, 409);
  assert.equal((await service.post('extract-schedule', { resumeToken: job.token })).status, 409);
  const stillRunning = await (await service.get(`extraction-jobs/${job.token}`)).json();
  assert.equal(stillRunning.status, 'running');
  assert.ok(!stillRunning.activity.events.some((event: any) => event.level === 'error'));
  controller.abort(); await rejection; await aborted;
  const restarted = new ExtractionJobStore(directory);
  assert.equal(restarted.checkpoint(job.token).results.size, 0);
  assert.equal(restarted.get(job.token).input.files.length, 1);
});

test('live status exposes real events while AI is pending and persists completion after restart', async t => {
  const directory = temporaryStore(t);
  let entered!: () => void, release!: () => void;
  const ready = new Promise<void>(resolve => { entered = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  t.after(() => release());
  let calls = 0;
  const ai: AcademicAIClient = { models: { generateContent: async args => {
    calls++;
    args.config.onProgress?.('preparation', 'Preparando anexo no provedor.');
    args.config.onProgress?.('extraction', 'Aguardando resposta do modelo.');
    entered(); await gate;
    return response(respond(args));
  } } };
  const store = new ExtractionJobStore(directory);
  const service = await serve(store, ai); t.after(() => service.close());
  const job = store.create('schedule', { model: 'moonshot/kimi-k2.6', files: [{ fileName: 'a.png', mimeType: 'image/png', base64Data: 'YQ==' }] });
  const pending = service.post('extract-schedule', { resumeToken: job.token });
  await ready;
  const statusResponse = await service.get(`extraction-jobs/${job.token}`);
  assert.equal(statusResponse.headers.get('cache-control'), 'no-store');
  const running = await statusResponse.json();
  assert.equal(running.status, 'running');
  assert.equal(running.activity.stage, 'extraction');
  assert.equal(running.activity.attempt, 1);
  assert.equal(running.activity.pageCount, 1);
  assert.equal(running.activity.events.at(-1).message, 'Aguardando resposta do modelo.');
  assert.ok(!JSON.stringify(running).includes('YQ=='), 'Polling must never expose document bodies');
  assert.ok(!running.activity.events.some((event: any) => event.stage === 'validation'));
  release();
  assert.equal((await pending).status, 200);
  const completed = await (await service.get(`extraction-jobs/${job.token}`)).json();
  assert.equal(calls, 1);
  assert.equal(completed.status, 'complete');
  assert.equal(completed.activity.recordCount, 1);
  assert.ok(completed.activity.finishedAt);
  const stages = completed.activity.events.map((event: any) => event.stage);
  assert.ok(stages.indexOf('validation') > stages.indexOf('extraction'));
  assert.ok(stages.indexOf('saving') > stages.indexOf('validation'));
  assert.equal(stages.at(-1), 'complete');
  assert.deepEqual(new ExtractionJobStore(directory).describeToken(job.token).activity, completed.activity);
});

test('failed and interrupted executions are distinct and a new run resets its timing', async t => {
  const directory = temporaryStore(t);
  const store = new ExtractionJobStore(directory);
  const job = store.create('linear', { textContent: 'Álgebra' });
  const release = store.acquire(job.token);
  store.begin(job.token, 'model-a');
  store.record(job.token, 'extraction', 'Aguardando resposta.', { attempt: 2 });
  const restarted = new ExtractionJobStore(directory);
  assert.equal(restarted.describeToken(job.token).status, 'interrupted');
  store.stop(job.token, false, 'Provider failed: Bearer secret-value api_key=another-secret');
  release();
  const failed = restarted.describeToken(job.token);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.activity.stage, 'extraction');
  assert.ok(failed.activity.finishedAt);
  assert.ok(!failed.activity.events.at(-1)!.message.includes('secret'));
  const resumedRelease = restarted.acquire(job.token);
  restarted.begin(job.token, 'model-b');
  const resumed = restarted.describeToken(job.token);
  assert.equal(resumed.status, 'running');
  assert.equal(resumed.activity.finishedAt, undefined);
  assert.equal(resumed.activity.attempt, undefined);
  assert.equal(resumed.activity.model, 'model-b');
  assert.ok(resumed.activity.events.some(event => event.level === 'error'), 'Keep prior failure in the history');
  restarted.stop(job.token, true, 'Cancelada pelo usuário.');
  resumedRelease();
  assert.equal(restarted.describeToken(job.token).status, 'cancelled');
});

test('operational logs are bounded, ordered and redact credential-shaped values', async t => {
  const store = new ExtractionJobStore(temporaryStore(t));
  const job = store.create('linear', { textContent: 'Álgebra' });
  const release = store.acquire(job.token);
  store.begin(job.token);
  for (let i = 0; i < 210; i++) store.record(job.token, 'extraction', `Evento ${i}`);
  release();
  const events = store.describeToken(job.token).activity.events;
  assert.equal(events.length, 200);
  assert.equal(new Set(events.map(event => event.id)).size, 200);
  assert.equal(events.at(-1)!.message, 'Evento 209');
  assert.equal(safeLogMessage('sk-test-secret token=secret'), '[chave oculta] token=[oculto]');
});
