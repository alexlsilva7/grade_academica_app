import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { Type } from '@google/genai';
import { assertSchema, extractAcademicData, mergeRecords, readSources, slicePdf } from '../extractionPipeline';
import { treeToCurriculum, validateExtraction } from '../src/utils/extraction';

const record = (extra: any = {}) => ({ id: 'a', code: 'ABC-001', name: 'Álgebra', courseName: 'Curso',
  profile: 'P1', semester: '2026.1', classGroup: 'A', period: 1, ...extra });
const evidence = (fields: string[], file = 'Texto colado', page: number | null = null) => fields.map(field => ({ field, file, page, excerpt: 'Álgebra' }));

test('unknown academic fields survive tree conversion without invented defaults', () => {
  const [flat] = treeToCurriculum([{ ...record({ code: null, period: null }), hours: 60,
    type: 'outros', prereqs: null, workload: { teorica: null, pratica: null, extensao: null, total: 60 } }], null);
  assert.equal(flat.code, null);
  assert.equal(flat.period, null);
  assert.equal(flat.credits, null);
  assert.equal(flat.workload.teorica, null);
  assert.equal(flat.workload.total, 60);
  assert.equal(flat.prerequisites, null);
  assert.equal(flat.profile, 'P1');
});

test('tree IDs resolve to official prerequisite code and name', () => {
  const nodes = [ { ...record(), hours: 60, type: 'outros', prereqs: [] },
    { ...record({ id: 'b', code: 'XYZ00022', name: 'Álgebra II' }), hours: 60, type: 'outros', prereqs: ['a'] } ];
  assert.deepEqual(treeToCurriculum(nodes, null)[1].prerequisites, [{ code: 'ABC-001', name: 'Álgebra', id: 'a' }]);
});

test('session validation detects bad days, times and duplicate sessions', () => {
  const issues = validateExtraction([record({ sessions: [{ day: 7, time: '25:00 - 09:00' },
    { day: 1, time: '08:00 - 10:00' }, { day: 1, time: '08:00 - 10:00' }] })], 'schedule');
  assert.ok(issues.some(i => i.message.includes('Dia')));
  assert.ok(issues.some(i => i.message.includes('Horário')));
  assert.ok(issues.some(i => i.message.includes('repetida')));
});

test('graph validation finds cycles and missing references', () => {
  const issues = validateExtraction([record({ prereqs: ['b'], hours: 60 }), record({ id: 'b', prereqs: ['a', 'absent'], hours: 60 })], 'tree');
  assert.ok(issues.some(i => i.message.includes('Ciclo')));
  assert.ok(issues.some(i => i.message.includes('inexistente')));
});

test('workload validation includes the EAD component', () => {
  const valid = record({ workload: { teorica: 30, pratica: 15, extensao: 0, semipresencialEad: 15, total: 60 }, prerequisites: [] });
  const invalid = record({ id: 'b', workload: { teorica: 30, pratica: 15, extensao: 0, semipresencialEad: 0, total: 60 }, prerequisites: [] });
  assert.ok(!validateExtraction([valid], 'linear').some(i => i.field === 'workload' && i.message.includes('Soma')));
  assert.ok(validateExtraction([invalid], 'linear').some(i => i.field === 'workload' && i.message.includes('Soma')));
});

test('prerequisite matching normalizes accents, case, and self references', () => {
  const records = [
    record({ code: 'A1', name: 'Matérias-Primas de Origem Animal', prerequisites: [] }),
    record({ id: 'b', code: 'A2', name: 'Tecnologia', prerequisites: [{ code: null, name: 'materias primas de origem animal' }] }),
    record({ id: 'c', code: 'A3', name: 'Inglês Instrumental I', prerequisites: [{ code: null, name: 'ingles instrumental i' }] })
  ];
  const issues = validateExtraction(records, 'linear');
  assert.ok(!issues.some(i => i.record === 'b' && i.message.includes('não localizado')));
  assert.ok(issues.some(i => i.record === 'c' && i.message.includes('dela mesma')));
});

test('merging preserves distinct profiles and turmas and unifies sessions', () => {
  const records: any[] = [], issues: any[] = [];
  const base = record({ sessions: [{ day: 1, time: '08:00 - 12:00' }], evidence: [] });
  mergeRecords(records, [base, { ...base, profile: 'P2' }, { ...base, classGroup: 'B' }], issues);
  mergeRecords(records, [{ ...base, sessions: [{ day: 2, time: '08:00 - 12:00' }] }], issues);
  assert.equal(records.length, 3);
  assert.equal(records[0].sessions.length, 2);
  assert.equal(records[0].sessions[0].time, '08:00 - 12:00');
});

test('conflicting fields remain unresolved and retain both source excerpts', () => {
  const records: any[] = [], issues: any[] = [];
  mergeRecords(records, [record({ workload: { total: 60 }, evidence: evidence(['workload.total'], 'PPC') })], issues);
  mergeRecords(records, [record({ workload: { total: 90 }, evidence: evidence(['workload.total'], 'Fluxo') })], issues);
  mergeRecords(records, [record({ workload: { total: 60 }, evidence: [] })], issues);
  assert.equal(records[0].workload.total, null);
  assert.deepEqual(records[0].evidence.map((e: any) => e.file), ['PPC', 'Fluxo']);
  assert.ok(issues[0].message.includes('60 / 90'));
});

test('a flowchart without codes is reconciled only with an unambiguous matching subject', () => {
  const records: any[] = [], issues: any[] = [];
  mergeRecords(records, [record({ code: null })], issues);
  mergeRecords(records, [record()], issues);
  mergeRecords(records, [record()], issues);
  assert.equal(records.length, 1);
  assert.equal(records[0].code, 'ABC-001');
  mergeRecords(records, [record({ profile: 'P2', code: null })], issues);
  assert.equal(records.length, 2);
});

test('different courses and semesters cannot be saved as one schedule', () => {
  const sessions = [{ day: 1, time: '08:00 - 10:00' }];
  const issues = validateExtraction([record({ sessions }), record({ id: 'b', courseName: 'Outro', semester: '2026.2', sessions })], 'schedule');
  assert.ok(issues.some(i => i.field === 'courseName' && i.severity === 'error'));
  assert.ok(issues.some(i => i.field === 'semester' && i.severity === 'error'));
});

test('all uploaded files and pasted text are included, with unique source IDs', () => {
  const sources = readSources({ files: [{ fileName: 'x.pdf', base64Data: 'YQ==' }, { fileName: 'x.pdf', base64Data: 'Yg==' }], textContent: 'texto' });
  assert.deepEqual(sources.map(s => s.fileName), ['1: x.pdf', '2: x.pdf', 'Texto colado']);
  assert.throws(() => readSources({ files: [{ base64Data: 'a', mimeType: 'text/html' }] }), /Formato/);
});

test('PDF slicing keeps original page mapping and exact page content geometry', async () => {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 15; i++) pdf.addPage([200 + i, 300]);
  const source = { fileName: 'PPC', mimeType: 'application/pdf', base64Data: Buffer.from(await pdf.save()).toString('base64') };
  const part = await slicePdf(source, 7, 12);
  const read = await PDFDocument.load(Buffer.from(part.base64Data!, 'base64'));
  assert.equal(read.getPageCount(), 6);
  assert.equal(read.getPage(0).getWidth(), 206);
  assert.deepEqual(part.pageNumbers, [7, 8, 9, 10, 11, 12]);
  await assert.rejects(slicePdf(source, 10, 16), /fora/);
});

test('runtime schema rejects wrong types and missing fields', () => {
  const schema = { type: Type.OBJECT, properties: { hours: { type: Type.INTEGER, nullable: true } }, required: ['hours'] };
  assert.doesNotThrow(() => assertSchema({ hours: null }, schema));
  assert.throws(() => assertSchema({ hours: '60' }, schema), /tipo inválido/);
  assert.throws(() => assertSchema({}, schema), /ausente/);
});

function defaults(schema: any): any {
  if (schema.nullable) return null;
  if (schema.type === Type.OBJECT) return Object.fromEntries(Object.entries(schema.properties).map(([k, s]) => [k, defaults(s)]));
  if (schema.type === Type.ARRAY) return [];
  if (schema.type === Type.INTEGER) return 0;
  return '';
}

function fakeAI(respond: (prompt: string, result: any, schema: any, call: number, args: any) => any) {
  let calls = 0;
  return { models: { generateContent: async (args: any) => {
    const schema = args.config.responseSchema;
    const output = await respond(args.contents.at(-1).text, defaults(schema), schema, ++calls, args);
    return { text: JSON.stringify(output), candidates: [{ finishReason: 'STOP' }] };
  } } } as any;
}

test('one curriculum call returns details and relations and ignores legacy stage models', async () => {
  let calls = 0;
  const ai = fakeAI((prompt, result, schema, call, args) => {
    calls++;
    assert.equal(args.model, 'z-ai/glm-5.3');
    assert.match(prompt, /uma única resposta/);
    result.records = [1, 2].map(n => ({ ...defaults(schema.properties.records.items),
      name: 'Álgebra ' + n, code: 'A' + n, period: n, academicType: 'Obrigatório',
      workload: { teorica: null, pratica: null, extensao: null, total: 60 }, credits: 4,
      prerequisites: n === 2 ? [{ code: 'A1', name: 'Álgebra 1' }] : [],
      evidence: evidence(['name', 'code', 'period', 'academicType', 'workload.total', 'prerequisites']) }));
    return result;
  });
  const data = await extractAcademicData(ai, { textContent: 'Álgebra', pipeline: { concurrency: 6, models: {
    reading: 'moonshot/kimi-k2.6', details: 'moonshot/kimi-k2.6', repair: 'gemini-3.6-flash'
  } } }, 'tree');
  assert.equal(calls, 1);
  assert.deepEqual(data._extraction.calls.map(call => call.stage), ['extraction']);
  assert.equal(data._extraction.stages.length, 1);
  assert.ok('subjects' in data);
  assert.equal(data.subjects![0].credits, null);
  assert.equal(data.subjects![0].hours, 60);
  assert.equal(data.subjects![0].workload.teorica, null);
  assert.deepEqual(data.subjects![1].prereqs, [data.subjects![0].id]);
  assert.ok(data._extraction.issues.some(i => i.field === 'credits' && i.message.includes('descartado')));
});

test('linear extraction requests full ementas, workload and relations in one call', async () => {
  const ai = fakeAI((prompt, result, schema, call) => {
    assert.equal(call, 1);
    assert.match(prompt, /ementa literal completa/);
    const fields = schema.properties.records.items.properties;
    assert.equal(fields.period.type, Type.STRING);
    for (const key of ['workload', 'credits', 'ementa', 'prerequisites', 'corequisites', 'equivalences']) assert.ok(fields[key]);
    result.records = [{ ...defaults(schema.properties.records.items), name: 'Álgebra', period: '1',
      ementa: 'Álgebra', workload: { teorica: 60, pratica: 0, extensao: 0, total: 60 },
      evidence: evidence(['name', 'period', 'ementa', 'workload.teorica', 'workload.pratica', 'workload.extensao', 'workload.total']) }];
    return result;
  });
  const data = await extractAcademicData(ai, { textContent: 'Álgebra' }, 'linear');
  assert.ok('subjects' in data);
  assert.equal(data.subjects![0].ementa, 'Álgebra');
  assert.equal(data.subjects![0].workload.total, 60);
  assert.equal(data.subjects![0].period, '1');
});

test('all image sources and text reach a single call and sessions are consolidated', async () => {
  const ai = fakeAI((prompt, result, schema, call, args) => {
    assert.equal(call, 1);
    assert.equal(args.contents.filter((part: any) => part.inlineData).length, 2);
    assert.ok(args.contents.some((part: any) => part.text === 'Contexto'));
    const labels = ['1: um.png', '2: dois.png'];
    result.records = labels.map((label, i) => ({ ...defaults(schema.properties.records.items), name: 'Álgebra', code: 'A1', profile: 'P1', period: 0,
      sessions: [{ day: i + 1, time: '08:00 - 12:00' }],
      evidence: evidence(['name', 'code', 'profile', 'period', 'sessions'], label, 1) }));
    return result;
  });
  const data = await extractAcademicData(ai, { model: 'gemini-3.6-flash', textContent: 'Contexto',
    files: ['um.png', 'dois.png'].map(fileName => ({ fileName, mimeType: 'image/png', base64Data: 'YQ==' })) }, 'schedule');
  assert.ok('disciplines' in data);
  assert.equal(data.disciplines!.length, 1);
  assert.equal(data.disciplines![0].sessions.length, 2);
  assert.equal(data.disciplines![0].period, 0);
});

test('complete multi-page PDF is sent once with original page references', async () => {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 15; i++) pdf.addPage();
  const base64Data = Buffer.from(await pdf.save()).toString('base64');
  const ai = fakeAI((prompt, result, schema, call, args) => {
    assert.equal(call, 1);
    const attachments = args.contents.filter((part: any) => part.inlineData);
    assert.equal(attachments.length, 1);
    assert.equal(attachments[0].inlineData.data, base64Data);
    result.records = [{ ...defaults(schema.properties.records.items), name: 'Álgebra', evidence: evidence(['name'], '1: grade.pdf', 15) }];
    return result;
  });
  const data = await extractAcademicData(ai, { model: 'moonshot/kimi-k2.6', files: [{ fileName: 'grade.pdf', base64Data }] }, 'schedule');
  assert.ok('disciplines' in data);
  assert.equal(data.disciplines![0].evidence[0].page, 15);
  assert.equal(data._extraction.coverage.totalPages, 15);
});

test('invalid JSON/schema and truncated responses fail without an extra repair call', async () => {
  for (const output of [
    { text: '{', candidates: [{ finishReason: 'STOP' }] },
    { text: '{}', candidates: [{ finishReason: 'STOP' }] },
    { text: '{}', candidates: [{ finishReason: 'MAX_TOKENS' }] },
    { text: '', candidates: [{ finishReason: 'STOP' }] }
  ]) {
    let calls = 0;
    const ai = { models: { generateContent: async () => { calls++; return output; } } } as any;
    await assert.rejects(extractAcademicData(ai, { textContent: 'Álgebra' }, 'linear'), /inválido|incompleta|vazia/);
    assert.equal(calls, 1);
  }
});

test('cancelled extraction and incompatible file models do not invoke AI', async () => {
  const ai = fakeAI(() => { assert.fail('Model must not be called'); });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(extractAcademicData(ai, { textContent: 'Álgebra' }, 'tree', controller.signal), /abort/i);
  await assert.rejects(extractAcademicData(ai, { files: [{ fileName: 'x.png', mimeType: 'image/png', base64Data: 'YQ==' }],
    pipeline: { models: { reading: 'moonshot/kimi-k2.6' } } }, 'schedule'), /modelo da extração/);
});

for (const failure of ['429', 'timeout']) test(failure + ' retries only the same extraction request', async () => {
  let calls = 0;
  const ai = fakeAI((prompt, result, schema, call, args) => {
    if (++calls < 3) throw Object.assign(new Error(failure === 'timeout' ? 'Request timed out.' : 'Rate limit'), {
      ...(failure === '429' ? { status: 429 } : {}), headers: new Headers({ 'retry-after': '0' })
    });
    result.records = [{ ...defaults(schema.properties.records.items), name: 'Álgebra', evidence: evidence(['name']) }];
    return result;
  });
  const data = await extractAcademicData(ai, { textContent: 'Álgebra', model: 'moonshot/kimi-k2.6' }, 'schedule');
  assert.equal(calls, 3);
  assert.ok(data._extraction.calls[0].status.startsWith('retry_' + failure + '_'));
  assert.deepEqual([...new Set(data._extraction.calls.map(call => call.model))], ['moonshot/kimi-k2.6']);
});

test('validated result is reused, but changing source, mode or model makes a new request', async () => {
  const checkpoint = { results: new Map<string, string>() };
  let calls = 0;
  const ai = fakeAI((prompt, result, schema) => {
    calls++;
    result.records = [{ ...defaults(schema.properties.records.items), name: 'Álgebra', evidence: evidence(['name']) }];
    return result;
  });
  const body = { textContent: 'Álgebra', model: 'moonshot/kimi-k2.6' };
  await extractAcademicData(ai, body, 'schedule', undefined, undefined, checkpoint);
  const restored = await extractAcademicData(ai, body, 'schedule', undefined, undefined, checkpoint);
  assert.equal(calls, 1);
  assert.equal(restored._extraction.calls[0].status, 'checkpoint');
  await extractAcademicData(ai, { ...body, textContent: 'Álgebra II' }, 'schedule', undefined, undefined, checkpoint);
  await extractAcademicData(ai, { ...body, model: 'gemini-3.6-flash' }, 'schedule', undefined, undefined, checkpoint);
  await extractAcademicData(ai, body, 'linear', undefined, undefined, checkpoint);
  assert.equal(calls, 4);
});
