import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_BLOCKS,
  findSessionStartBlock,
  calculateBlockSpan,
  getActiveShifts,
  getDisplayBlocks,
  parseMinutes,
  parseSessionInterval
} from '../src/utils/scheduleBlocks';
import { Discipline } from '../src/types';

test('parseMinutes and parseSessionInterval helper functions', () => {
  assert.equal(parseMinutes('07:30'), 450);
  assert.equal(parseMinutes('12:30'), 750);
  assert.equal(parseMinutes('18:30'), 1110);
  assert.equal(parseMinutes('21:50'), 1310);

  const interval = parseSessionInterval('07:30 - 09:30');
  assert.deepEqual(interval, { start: 450, end: 570 });
});

test('findSessionStartBlock maps sessions to correct canonical block', () => {
  const m1 = findSessionStartBlock('07:30 - 09:30', CANONICAL_BLOCKS);
  assert.equal(m1?.id, 'M1');
  assert.equal(m1?.label, '07:30 - 08:30');

  const m2 = findSessionStartBlock('08:30 - 12:30', CANONICAL_BLOCKS);
  assert.equal(m2?.id, 'M2');
  assert.equal(m2?.label, '08:30 - 09:30');

  const m3 = findSessionStartBlock('09:30 - 11:30', CANONICAL_BLOCKS);
  assert.equal(m3?.id, 'M3');

  const t2 = findSessionStartBlock('14:00 - 16:00', CANONICAL_BLOCKS);
  assert.equal(t2?.id, 'T2');

  const n1 = findSessionStartBlock('18:30 - 20:10', CANONICAL_BLOCKS);
  assert.equal(n1?.id, 'N1');

  const n2 = findSessionStartBlock('20:10 - 21:50', CANONICAL_BLOCKS);
  assert.equal(n2?.id, 'N2');
});

test('calculateBlockSpan computes correct rowSpan for 1h, 2h, 3h, 4h and night sessions', () => {
  // Morning 1h class
  assert.equal(calculateBlockSpan('07:30 - 08:30', 0, CANONICAL_BLOCKS), 1);

  // Morning 2h class (07:30 - 09:30) starts at index 0 (M1)
  assert.equal(calculateBlockSpan('07:30 - 09:30', 0, CANONICAL_BLOCKS), 2);

  // Morning 4h class (08:30 - 12:30) starts at index 1 (M2)
  assert.equal(calculateBlockSpan('08:30 - 12:30', 1, CANONICAL_BLOCKS), 4);

  // Afternoon 2h class (14:00 - 16:00) starts at index 6 (T2)
  const t2Idx = CANONICAL_BLOCKS.findIndex(b => b.id === 'T2');
  assert.equal(calculateBlockSpan('14:00 - 16:00', t2Idx, CANONICAL_BLOCKS), 2);

  // Afternoon 3h class (13:00 - 16:00) starts at index 5 (T1)
  const t1Idx = CANONICAL_BLOCKS.findIndex(b => b.id === 'T1');
  assert.equal(calculateBlockSpan('13:00 - 16:00', t1Idx, CANONICAL_BLOCKS), 3);

  // Night 100min class (18:30 - 20:10) starts at index 10 (N1)
  const n1Idx = CANONICAL_BLOCKS.findIndex(b => b.id === 'N1');
  assert.equal(calculateBlockSpan('18:30 - 20:10', n1Idx, CANONICAL_BLOCKS), 1);

  // Night 200min class (18:30 - 21:50) spans N1 + N2
  assert.equal(calculateBlockSpan('18:30 - 21:50', n1Idx, CANONICAL_BLOCKS), 2);
});

test('getActiveShifts and getDisplayBlocks detects shifts and prunes dead rows', () => {
  const morningOnlyDiscipline: Discipline = {
    id: 'd1',
    code: 'EAL001',
    name: 'Cálculo I',
    professor: 'ISIS',
    period: 1,
    sessions: [
      { day: 1, time: '07:30 - 09:30' },
      { day: 3, time: '09:30 - 11:30' }
    ]
  };

  const nightDiscipline: Discipline = {
    id: 'd2',
    code: 'BCC001',
    name: 'Algoritmos',
    professor: 'JEAN',
    period: 1,
    sessions: [
      { day: 1, time: '18:30 - 20:10' },
      { day: 3, time: '20:10 - 21:50' }
    ]
  };

  // Morning only schedule
  const morningShifts = getActiveShifts([morningOnlyDiscipline], []);
  assert.equal(morningShifts.has('manha'), true);
  assert.equal(morningShifts.has('tarde'), false);
  assert.equal(morningShifts.has('noite'), false);

  const morningBlocks = getDisplayBlocks([morningOnlyDiscipline], [], 'auto');
  assert.equal(morningBlocks.length, 5); // Only 5 morning blocks, 0 afternoon, 0 night!
  assert.deepEqual(morningBlocks.map(b => b.id), ['M1', 'M2', 'M3', 'M4', 'M5']);

  // Night only schedule
  const nightShifts = getActiveShifts([nightDiscipline], []);
  assert.equal(nightShifts.has('noite'), true);
  assert.equal(nightShifts.has('manha'), false);

  const nightBlocks = getDisplayBlocks([nightDiscipline], [], 'auto');
  assert.equal(nightBlocks.length, 2); // Only 2 night blocks!
  assert.deepEqual(nightBlocks.map(b => b.id), ['N1', 'N2']);

  // Explicit 'all' filter
  const allBlocks = getDisplayBlocks([morningOnlyDiscipline], [], 'all');
  assert.equal(allBlocks.length, 12);
});
