import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSavedExtraction, prepareExtraction, resumeExtraction, type SavedExtraction } from '../src/utils/savedExtraction';

test('browser restores original mode/settings and token even when a response is lost', async t => {
  const values = new Map<string, string>();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => values.set(key, value)
  } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete (globalThis as any).localStorage; });
  const saved: SavedExtraction = { token: '19da8eb3-d759-481a-85a5-ddad7ab1335d', mode: 'tree',
    model: 'z-ai/glm-5.3', pipeline: { concurrency: 2, models: { reading: 'moonshot/kimi-k2.6' } },
    courseId: 'eal', courseName: 'Engenharia de Alimentos', courseShortName: 'EAL', newCourse: false };
  t.mock.method(globalThis, 'fetch', async () => {
    assert.deepEqual(loadSavedExtraction(), saved, 'Token must exist before the first HTTP request');
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(prepareExtraction(saved, { textContent: 'original source' }, new AbortController().signal));
  const afterReload = loadSavedExtraction()!;
  assert.equal(afterReload.courseId, 'eal');
  t.mock.method(globalThis, 'fetch', async (url: any, options: any) => {
    assert.equal(url, '/api/extract-curriculum-tree');
    const body = JSON.parse(options.body);
    assert.equal(body.resumeToken, saved.token);
    assert.equal(body.files, undefined); assert.equal(body.textContent, undefined);
    assert.equal(body.pipeline, undefined, 'Legacy stage settings must not be sent');
    return new Response(JSON.stringify({ subjects: [] }), { headers: { 'Content-Type': 'application/json' } });
  });
  await resumeExtraction(afterReload, new AbortController().signal);
});
