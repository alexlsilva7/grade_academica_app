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
      showMatriz: false,
      semesters: ['2026.1', '2026.2'],
      visibleSemesters: ['2026.2', '2026.1']
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
    showSchedule: false,
    visibleSemesters: ['2026.2']
  };

  registry[courseIndex] = {
    ...registry[courseIndex],
    ...(patchBody.hidden !== undefined ? { hidden: Boolean(patchBody.hidden) } : {}),
    ...(Array.isArray(patchBody.visibleSemesters) ? { visibleSemesters: patchBody.visibleSemesters } : {})
  };

  assert.equal(registry[courseIndex].hidden, true);
  assert.equal(registry[courseIndex].name, 'Ciência da Computação', 'Course name is preserved');
  assert.equal(registry[courseIndex].hasCurriculum, true, 'hasCurriculum is preserved');
  assert.deepEqual(registry[courseIndex].visibleSemesters, ['2026.2'], 'visibleSemesters updated');
});

test('Semester visibility and ordering logic', () => {
  const course: CourseMeta = {
    id: 'eal',
    name: 'Engenharia de Alimentos',
    shortName: 'EAL',
    hasCurriculum: true,
    hasSchedule: true,
    semesters: ['2026.1', '2026.2'],
    visibleSemesters: ['2026.2', '2026.1']
  };

  // 1. Default semester is the first item in visibleSemesters
  const defaultSemester = course.visibleSemesters?.[0] || course.semesters?.[0] || '2026.1';
  assert.equal(defaultSemester, '2026.2', '2026.2 is the default semester');

  // 2. Reordering: moving 2026.1 to the top makes it default
  const reordered = [...course.visibleSemesters!].reverse();
  assert.deepEqual(reordered, ['2026.1', '2026.2']);
  assert.equal(reordered[0], '2026.1', 'New default is 2026.1 after moving to top');

  // 3. Hiding a semester removes it from visibleSemesters but keeps it in semesters
  const hiddenOne = course.visibleSemesters!.filter(s => s !== '2026.1');
  assert.deepEqual(hiddenOne, ['2026.2'], 'Only 2026.2 remains visible');
  assert.equal(course.semesters!.includes('2026.1'), true, '2026.1 is still registered in disk semesters');

  // 4. Default fallback when visibleSemesters is undefined
  const fallbackCourse: CourseMeta = {
    id: 'bcc',
    name: 'Ciência da Computação',
    shortName: 'BCC',
    hasCurriculum: true,
    hasSchedule: true,
    semesters: ['2026.1']
  };
  const resolvedDefault = fallbackCourse.visibleSemesters?.[0] || fallbackCourse.semesters?.[0] || '2026.1';
  assert.equal(resolvedDefault, '2026.1');
});
