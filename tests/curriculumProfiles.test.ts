import test from 'node:test';
import assert from 'node:assert/strict';
import { getCurricularProfileIds } from '../src/utils/curriculumProfiles';

test('home selector uses declared curricular profiles, excluding timetable cohort labels', () => {
  const curriculum = {
    profiles: [{ id: 'BCC03' }, { id: 'BCC02' }],
    subjects: [{ profile: 'CC5' }, { profile: 'CC2' }]
  };
  assert.deepEqual(getCurricularProfileIds(curriculum), ['BCC02', 'BCC03']);
});

test('older flat curricula still expose their subject profiles', () => {
  assert.deepEqual(getCurricularProfileIds({ subjects: [
    { profile: 'EAL03' }, { profile: 'EAL02' }, { profile: 'EAL03' },
    { profile: 'Optativa' }, { profile: 'Sem Perfil' }
  ] }), ['EAL02', 'EAL03']);
});
