import test from 'node:test';
import assert from 'node:assert/strict';
import { createAcademicAIClient } from '../aiProvider';

test('provider routing is exact; Moonshot needs no OpenRouter key and all adapters receive schema', async () => {
  const names = ['NVIDIA_API_KEY', 'MOONSHOT_API_KEY', 'OPENROUTER_API_KEY', 'GEMINI_API_KEY', 'MOONSHOT_MODEL'];
  const saved = names.map(name => process.env[name]);
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; body: any }> = [];
  try {
    names.forEach(name => delete process.env[name]);
    process.env.MOONSHOT_API_KEY = 'test-not-a-real-key';
    process.env.MOONSHOT_MODEL = 'kimi-k2.6';
    globalThis.fetch = async (input, options) => {
      const request = new Request(input, options);
      if (request.url.includes('/files')) {
        requests.push({ url: request.url, body: null });
        if (request.url.endsWith('/content')) return new Response('Texto extraído do PDF');
        return new Response(JSON.stringify({ id: 'test-file', object: 'file', deleted: true, purpose: 'file-extract' }), { headers: { 'content-type': 'application/json' } });
      }
      requests.push({ url: request.url, body: JSON.parse(await request.text()) });
      return new Response(JSON.stringify({ id: 'test', object: 'chat.completion', created: 0, model: 'kimi-k2.6',
        choices: [{ index: 0, message: { role: 'assistant', content: '{"units":[]}' }, finish_reason: 'stop' }] }),
      { headers: { 'content-type': 'application/json' } });
    };
    const client = createAcademicAIClient();
    assert.equal(client.defaultModel, 'moonshot/kimi-k2.6');
    assert.equal(client.defaultFileModel, 'moonshot/kimi-k2.6');
    const args = { model: client.defaultModel!, contents: [{ text: 'source' }], config: {
      systemInstruction: 'Extract JSON', responseSchema: { type: 'OBJECT', required: ['units'], properties: { units: { type: 'ARRAY', items: { type: 'STRING' } } } }
    } };
    await client.models.generateContent(args);
    assert.equal(requests[0].url, 'https://api.moonshot.ai/v1/chat/completions');
    assert.equal(requests[0].body.model, 'kimi-k2.6');
    assert.match(requests[0].body.messages[0].content, /"required":\["units"\]/);
    assert.equal(requests[0].body.response_format.type, 'json_object');
    await assert.rejects(async () => client.models.generateContent({ ...args, model: 'openrouter/z-ai/glm-5.2:free' }), /OPENROUTER_API_KEY/);
    await assert.rejects(async () => client.models.generateContent({ ...args, model: 'z-ai/glm-5.3' }), /NVIDIA_API_KEY/);
    await assert.rejects(async () => client.models.generateContent({ ...args, model: 'gemini-3.6-flash' }), /GEMINI_API_KEY/);
    assert.equal(requests.length, 1);
    process.env.NVIDIA_API_KEY = 'test-not-a-real-key';
    const nvidia = createAcademicAIClient();
    assert.equal(nvidia.defaultFileModel, 'moonshot/kimi-k2.6');
    await nvidia.models.generateContent({ ...args, model: 'z-ai/glm-5.3' });
    assert.equal(requests[1].url, 'https://integrate.api.nvidia.com/v1/chat/completions');
    assert.match(requests[1].body.messages[0].content, /"required":\["units"\]/);
    const events: string[] = [];
    await client.models.generateContent({ ...args,
      config: { ...args.config, onProgress: (stage: string) => events.push(stage) },
      contents: [{ inlineData: { mimeType: 'application/pdf', data: 'YQ==' } }] });
    assert.deepEqual(events, ['preparation', 'preparation', 'extraction']);
    assert.ok(requests.some(request => request.url === 'https://api.moonshot.ai/v1/files/test-file/content'));
    const pdfChat = requests.filter(request => request.body?.messages).at(-1)!;
    assert.equal(pdfChat.url, 'https://api.moonshot.ai/v1/chat/completions');
    assert.ok(pdfChat.body.messages[1].content.some((part: any) => part.text?.includes('Texto extraído do PDF')));
    assert.ok(requests.every(request => !request.url.includes('openrouter')));
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, i) => { if (saved[i] === undefined) delete process.env[name]; else process.env[name] = saved[i]; });
  }
});
