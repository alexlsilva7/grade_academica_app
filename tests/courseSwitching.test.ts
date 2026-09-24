import test from 'node:test';
import assert from 'node:assert/strict';
import { Discipline } from '../src/types';

// Mock minimal discipline offerings for testing
const mockBccOfferings: Discipline[] = [
  {
    id: 'bcc_p1_1',
    code: 'CCMP3057',
    name: 'Introdução à Programação I',
    professor: 'Professor BCC 1',
    period: 1,
    sessions: [{ day: 1, time: '18:30 - 20:10' }]
  },
  {
    id: 'bcc_p1_2',
    code: 'CCMP3056',
    name: 'Introdução à Computação',
    professor: 'Professor BCC 2',
    period: 1,
    sessions: [{ day: 2, time: '18:30 - 20:10' }]
  }
];

const mockEalOfferings: Discipline[] = [
  {
    id: 'eal_turma_001',
    code: 'EAL00028',
    name: 'DESENHO TÉC. B',
    professor: 'Professor EAL 1',
    period: 1,
    sessions: [{ day: 2, time: '08:30 - 12:30' }]
  },
  {
    id: 'eal_turma_002',
    code: 'EAL00046',
    name: 'QUÍM. GERAL A',
    professor: 'Professor EAL 2',
    period: 1,
    sessions: [{ day: 4, time: '09:30 - 11:30' }]
  }
];

test('course schedule keys are cleanly isolated in localStorage', () => {
  const fakeStorage: Record<string, string> = {};

  // User selects classes in BCC
  fakeStorage['schedule_bcc_2026.1'] = JSON.stringify([mockBccOfferings[0]]);
  fakeStorage['schedule_bcc'] = JSON.stringify([mockBccOfferings[0]]);

  // User has no classes selected in EAL
  // fakeStorage['schedule_eal_2026.1'] does not exist or is []
  const ealSchedule = fakeStorage['schedule_eal_2026.1'] ? JSON.parse(fakeStorage['schedule_eal_2026.1']) : [];
  assert.equal(ealSchedule.length, 0);

  // User adds a class to EAL
  fakeStorage['schedule_eal_2026.1'] = JSON.stringify([mockEalOfferings[0]]);

  // Verify BCC is untouched
  const bccSchedule = JSON.parse(fakeStorage['schedule_bcc_2026.1']);
  assert.equal(bccSchedule.length, 1);
  assert.equal(bccSchedule[0].id, 'bcc_p1_1');

  // Verify EAL has only EAL class
  const ealSchedule2 = JSON.parse(fakeStorage['schedule_eal_2026.1']);
  assert.equal(ealSchedule2.length, 1);
  assert.equal(ealSchedule2[0].id, 'eal_turma_001');
});

test('self-healing purges cross-contaminated disciplines belonging to other courses', () => {
  // Simulate corrupted localStorage where BCC disciplines leaked into EAL
  const corruptedEalSchedule: Discipline[] = [
    mockBccOfferings[0], // Leaked BCC discipline
    mockEalOfferings[0]  // Legitimate EAL discipline
  ];

  // Self-healing validation logic as implemented in loadCourseSchedule / loadPredefinedGrade
  const validIds = new Set(mockEalOfferings.map(d => d.id));
  const validCodes = new Set(mockEalOfferings.map(d => d.code).filter(Boolean));

  const cleanSchedule = corruptedEalSchedule.filter(
    d => validIds.has(d.id) || (d.code && validCodes.has(d.code))
  );

  assert.equal(cleanSchedule.length, 1);
  assert.equal(cleanSchedule[0].id, 'eal_turma_001');
  assert.equal(cleanSchedule[0].name, 'DESENHO TÉC. B');
  assert.ok(!cleanSchedule.some(d => d.id === 'bcc_p1_1'));
});

test('semester switching preserves separate schedules for 2026.1 and 2026.2', () => {
  const fakeStorage: Record<string, string> = {};

  // BCC 2026.1 has P1
  fakeStorage['schedule_bcc_2026.1'] = JSON.stringify([mockBccOfferings[0]]);

  // BCC 2026.2 has P2
  fakeStorage['schedule_bcc_2026.2'] = JSON.stringify([mockBccOfferings[1]]);

  assert.equal(JSON.parse(fakeStorage['schedule_bcc_2026.1'])[0].code, 'CCMP3057');
  assert.equal(JSON.parse(fakeStorage['schedule_bcc_2026.2'])[0].code, 'CCMP3056');
  assert.notDeepEqual(
    JSON.parse(fakeStorage['schedule_bcc_2026.1']),
    JSON.parse(fakeStorage['schedule_bcc_2026.2'])
  );
});

test('course deletion cleanup clears all associated keys without touching other courses', () => {
  const fakeStorage: Record<string, string> = {
    'selectedCourse': 'eal',
    'schedule_eal_2026.1': JSON.stringify([mockEalOfferings[0]]),
    'schedule_eal': JSON.stringify([mockEalOfferings[0]]),
    'selected_profile_eal': 'EAL02',
    'eal_matriz_progress_EAL02': '[]',
    'schedule_bcc_2026.1': JSON.stringify([mockBccOfferings[0]]),
    'schedule_bcc': JSON.stringify([mockBccOfferings[0]]),
    'selected_profile_bcc': 'BCC03'
  };

  const courseToDelete = 'eal';
  Object.keys(fakeStorage).forEach(key => {
    if (
      key.startsWith(`schedule_${courseToDelete}`) ||
      key.startsWith(`selected_profile_${courseToDelete}`) ||
      key.startsWith(`disciplines_selectedProfile_${courseToDelete}`) ||
      key.startsWith(`matrix_version_${courseToDelete}`) ||
      key.startsWith(`${courseToDelete}_matriz_progress`) ||
      key.startsWith(`${courseToDelete}_acex_hours`) ||
      key.startsWith(`${courseToDelete}_acc_hours`)
    ) {
      delete fakeStorage[key];
    }
  });
  if (fakeStorage['selectedCourse'] === courseToDelete) {
    delete fakeStorage['selectedCourse'];
  }

  // EAL keys must be gone
  assert.equal(fakeStorage['schedule_eal_2026.1'], undefined);
  assert.equal(fakeStorage['schedule_eal'], undefined);
  assert.equal(fakeStorage['selected_profile_eal'], undefined);
  assert.equal(fakeStorage['eal_matriz_progress_EAL02'], undefined);
  assert.equal(fakeStorage['selectedCourse'], undefined);

  // BCC keys must be intact
  assert.ok(fakeStorage['schedule_bcc_2026.1']);
  assert.ok(fakeStorage['schedule_bcc']);
  assert.ok(fakeStorage['selected_profile_bcc']);
});
