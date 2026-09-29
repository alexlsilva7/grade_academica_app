import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAcademicRepository } from '../src/server/academicRepository';

type QueryCall = { table: string; columns: string; filters: Record<string, string> };

function fixtureClient(tables: Record<string, any[]>) {
  const calls: QueryCall[] = [];
  const client = {
    from(table: string) {
      let call: QueryCall = { table, columns: '', filters: {} };
      const builder: any = {
        select(columns: string) {
          call = { table, columns, filters: {} };
          calls.push(call);
          return builder;
        },
        eq(column: string, value: string) {
          call.filters[column] = value;
          return builder;
        },
        order() { return builder; },
        maybeSingle() {
          const row = (tables[table] || []).find(candidate =>
            Object.entries(call.filters).every(([key, value]) => candidate[key] === value));
          return Promise.resolve({ data: row || null, error: null });
        },
        then(resolve: (value: any) => unknown, reject: (error: unknown) => unknown) {
          const rows = (tables[table] || []).filter(candidate =>
            Object.entries(call.filters).every(([key, value]) => candidate[key] === value));
          return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
        }
      };
      return builder;
    }
  } as unknown as SupabaseClient;
  return { client, calls };
}

const courseRow = {
  id: 'bcc',
  data: {
    id: 'bcc', name: 'Ciência da Computação', shortName: 'BCC', hasCurriculum: true,
    hasSchedule: true, profiles: ['BCC03', 'BCC02'], semesters: ['2026.1']
  }
};

test('listCourses reads only course metadata and semester identifiers', async () => {
  const { client, calls } = fixtureClient({
    courses: [courseRow],
    course_schedules: [
      { course_id: 'bcc', semester: '2026.1', data: [{ id: 'large schedule payload' }] },
      { course_id: 'bcc', semester: '2026.2', data: [{ id: 'another large payload' }] }
    ],
    course_curricula: [{ course_id: 'bcc', data: { subjects: [{ name: 'large curriculum payload' }] } }]
  });
  const courses = await new SupabaseAcademicRepository(client).listCourses();

  assert.deepEqual(courses[0].profiles, ['BCC03', 'BCC02']);
  assert.deepEqual(courses[0].semesters, ['2026.1', '2026.2']);
  assert.deepEqual(calls.map(call => [call.table, call.columns]), [
    ['courses', 'id,data'], ['course_schedules', 'course_id,semester']
  ]);
});

test('getCourse fetches only the requested schedule after resolving semester metadata', async () => {
  const { client, calls } = fixtureClient({
    courses: [courseRow],
    course_curricula: [{ course_id: 'bcc', data: { subjects: [] } }],
    course_contents: [{ course_id: 'bcc', data: { disciplinas: [] } }],
    course_schedules: [
      { course_id: 'bcc', semester: '2026.1', data: [{ id: 'first semester' }], extraction: { source: '1' } },
      { course_id: 'bcc', semester: '2026.2', data: [{ id: 'requested semester' }], extraction: { source: '2' }, updated_at: '2026-09-28T12:00:00Z' }
    ]
  });
  const details = await new SupabaseAcademicRepository(client).getCourse('BCC', '2026.2');

  assert.equal(details?.resolvedSemester, '2026.2');
  assert.equal(details?.schedule?.[0].id, 'requested semester');
  assert.equal(details?.scheduleUpdatedAt, '2026-09-28T12:00:00Z');
  const scheduleCalls = calls.filter(call => call.table === 'course_schedules');
  assert.deepEqual(scheduleCalls.map(call => call.columns), ['semester', 'semester,data,extraction,updated_at']);
  assert.deepEqual(scheduleCalls[0].filters, { course_id: 'bcc' });
  assert.deepEqual(scheduleCalls[1].filters, { course_id: 'bcc', semester: '2026.2' });
});

test('getCourse includes only the large academic sections requested by each screen', async () => {
  const tables = {
    courses: [courseRow],
    course_curricula: [{ course_id: 'bcc', data: { subjects: [{ name: 'curriculum' }] } }],
    course_contents: [{ course_id: 'bcc', data: { disciplinas: [{ nome: 'content' }] } }],
    course_schedules: [{ course_id: 'bcc', semester: '2026.1', data: [{ id: 'schedule' }], extraction: null }]
  };

  const matrixFixture = fixtureClient(tables);
  const matrix = await new SupabaseAcademicRepository(matrixFixture.client).getCourse('bcc', undefined, false, ['curriculum']);
  assert.equal(matrix?.curriculum?.subjects[0].name, 'curriculum');
  assert.equal(matrix?.contents, null);
  assert.equal(matrix?.schedule, null);
  assert.ok(!matrixFixture.calls.some(call => call.table === 'course_contents' || call.table === 'course_schedules'));

  const catalogFixture = fixtureClient(tables);
  const catalog = await new SupabaseAcademicRepository(catalogFixture.client).getCourse('bcc', undefined, false, ['curriculum', 'contents']);
  assert.equal(catalog?.contents?.disciplinas[0].nome, 'content');
  assert.ok(!catalogFixture.calls.some(call => call.table === 'course_schedules'));

  const scheduleFixture = fixtureClient(tables);
  const schedule = await new SupabaseAcademicRepository(scheduleFixture.client).getCourse('bcc', '2026.1', false, ['schedule']);
  assert.equal(schedule?.schedule?.[0].id, 'schedule');
  assert.equal(schedule?.curriculum, null);
  assert.equal(schedule?.contents, null);
  assert.ok(!scheduleFixture.calls.some(call => call.table === 'course_curricula' || call.table === 'course_contents'));
});

test('strict missing semesters return no schedule payload; non-strict requests fall back predictably', async () => {
  const tables = {
    courses: [{ ...courseRow, data: { ...courseRow.data, visibleSemesters: ['2025.1'] } }],
    course_curricula: [],
    course_contents: [],
    course_schedules: [
      { course_id: 'bcc', semester: '2026.1', data: [{ id: 'first' }], extraction: null },
      { course_id: 'bcc', semester: '2026.2', data: [{ id: 'latest' }], extraction: null }
    ]
  };
  const strictFixture = fixtureClient(tables);
  const strict = await new SupabaseAcademicRepository(strictFixture.client).getCourse('bcc', '2025.2', true);
  assert.equal(strict?.schedule, null);
  assert.equal(strict?.resolvedSemester, null);
  assert.equal(strictFixture.calls.filter(call => call.columns === 'semester,data,extraction,updated_at').length, 0);

  const fallbackFixture = fixtureClient(tables);
  const fallback = await new SupabaseAcademicRepository(fallbackFixture.client).getCourse('bcc', '2025.2');
  assert.equal(fallback?.resolvedSemester, '2026.2');
  assert.equal(fallback?.schedule?.[0].id, 'latest');
});
