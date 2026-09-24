import test from 'node:test';
import assert from 'node:assert/strict';
import { CourseMeta } from '../src/types';

test('Course and module visibility logic', () => {
  const sampleCourses: CourseMeta[] = [
    {
      id: 'bcc',
      name: 'Ciência da Computação',
      shortName: 'BCC',
      hasCurriculum: true,
      hasSchedule: true
    },
    {
      id: 'adm',
      name: 'Administração',
      shortName: 'ADM',
      hasCurriculum: true,
      hasSchedule: true,
      hidden: true
    },
    {
      id: 'eal',
      name: 'Engenharia de Alimentos',
      shortName: 'EAL',
      hasCurriculum: true,
      hasSchedule: true,
      showSchedule: false,
      showDisciplines: true,
      showMatriz: false
    }
  ];

  // 1. Course filtering for home view
  const visibleCourses = sampleCourses.filter(c => !c.hidden);
  assert.equal(visibleCourses.length, 2);
  assert.deepEqual(visibleCourses.map(c => c.id), ['bcc', 'eal']);

  // 2. Default module visibility evaluation (when undefined)
  const bcc = sampleCourses.find(c => c.id === 'bcc')!;
  assert.equal(bcc.hidden, undefined);
  assert.equal(!bcc.hidden, true, 'Default hidden is falsy -> course is visible');
  assert.equal(bcc.showSchedule !== false, true, 'Default showSchedule is true');
  assert.equal(bcc.showDisciplines !== false, true, 'Default showDisciplines is true');
  assert.equal(bcc.showMatriz !== false, true, 'Default showMatriz is true');

  // 3. Explicit module visibility flags
  const eal = sampleCourses.find(c => c.id === 'eal')!;
  assert.equal(eal.showSchedule !== false, false, 'showSchedule is explicitly false');
  assert.equal(eal.showDisciplines !== false, true, 'showDisciplines is explicitly true');
  assert.equal(eal.showMatriz !== false, false, 'showMatriz is explicitly false');

  // 4. Registry visibility patch atomic update simulation
  const registry = JSON.parse(JSON.stringify(sampleCourses));
  const courseIndex = registry.findIndex((c: any) => c.id === 'bcc');
  assert.notEqual(courseIndex, -1);

  const patchBody = {
    hidden: true,
    showSchedule: false
  };

  registry[courseIndex] = {
    ...registry[courseIndex],
    ...(patchBody.hidden !== undefined ? { hidden: Boolean(patchBody.hidden) } : {})
  };

  assert.equal(registry[courseIndex].hidden, true);
  assert.equal(registry[courseIndex].name, 'Ciência da Computação', 'Course name is preserved');
  assert.equal(registry[courseIndex].hasCurriculum, true, 'hasCurriculum is preserved');
});
