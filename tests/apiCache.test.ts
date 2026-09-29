import test from 'node:test';
import assert from 'node:assert/strict';
import { apiFetch } from '../src/utils/api';

test('academic reads share pending requests, cache successful responses and refresh after writes', async () => {
  const originalFetch = globalThis.fetch;
  let reads = 0;
  let writes = 0;
  globalThis.fetch = async (_input, init) => {
    if (init?.method === 'POST') {
      writes += 1;
      return new Response('{}', { status: 200 });
    }
    reads += 1;
    return new Response(JSON.stringify({ version: reads }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    const url = '/api/courses?cache-test=academic';
    const [first, second] = await Promise.all([apiFetch(url), apiFetch(url)]);
    assert.deepEqual(await first.json(), { version: 1 });
    assert.deepEqual(await second.json(), { version: 1 });
    assert.equal(reads, 1);

    assert.deepEqual(await (await apiFetch(url)).json(), { version: 1 });
    assert.equal(reads, 1);

    await apiFetch('/api/courses', { method: 'POST' });
    assert.equal(writes, 1);
    assert.deepEqual(await (await apiFetch(url)).json(), { version: 2 });
    assert.equal(reads, 2);

    await apiFetch(url, { cache: 'no-store' });
    assert.equal(reads, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
