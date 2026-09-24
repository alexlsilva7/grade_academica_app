import test from 'node:test';
import assert from 'node:assert/strict';
import { DAYS } from '../src/constants';
import { Discipline } from '../src/types';

// Helper mimicking ScheduleExportCard logic for testing
function computeExportTimeslots(schedule: Discipline[], catalogList: Discipline[]) {
  const parseTime = (t: string) => {
    const parts = t.split(':');
    if (parts.length >= 2) return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    return 0;
  };

  const scheduleTimes = new Set<string>();
  schedule.forEach(d => d.sessions.forEach(s => scheduleTimes.add(s.time)));
  if (scheduleTimes.size === 0) return [];

  const catalogTimes = new Set<string>();
  catalogList.forEach(d => d.sessions.forEach(s => catalogTimes.add(s.time)));
  const sortedCatalog = Array.from(catalogTimes).sort((a, b) => parseTime(a) - parseTime(b));

  const scheduleTimesArray = Array.from(scheduleTimes).sort((a, b) => parseTime(a) - parseTime(b));
  const minStart = parseTime(scheduleTimesArray[0]);
  const maxStart = parseTime(scheduleTimesArray[scheduleTimesArray.length - 1]);

  return sortedCatalog.filter(t => {
    const pt = parseTime(t);
    return pt >= minStart && pt <= maxStart;
  });
}

function getCourseDisplayName(course: string | null, courseName?: string) {
  if (courseName && courseName.trim().length > 0) return courseName;
  if (!course) return 'Curso';
  const c = course.toLowerCase();
  if (c === 'bcc' || c.includes('computacao') || c.includes('computação')) return 'Bacharelado em Ciência da Computação';
  if (c === 'eal' || c === 'engenharia-de-alimentos' || c.includes('alimento')) return 'Engenharia de Alimentos';
  if (c === 'adm' || c === 'administracao' || c.includes('administra')) return 'Administração';
  if (c === 'mvet' || c === 'vet' || c === 'medicina-veterinaria' || c.includes('veterin')) return 'Medicina Veterinária';
  return course.toUpperCase();
}

function getExportFileName(course: string | null, semester: string) {
  const cleanCourseId = (course || 'curso').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const cleanSemester = (semester || '2026.1').replace(/\./g, '_');
  return `grade_${cleanCourseId}_${cleanSemester}.png`;
}

test('image export file naming convention', () => {
  assert.equal(getExportFileName('bcc', '2026.1'), 'grade_bcc_2026_1.png');
  assert.equal(getExportFileName('eal', '2026.2'), 'grade_eal_2026_2.png');
  assert.equal(getExportFileName('Engenharia de Alimentos', '2026.1'), 'grade_engenharia_de_alimentos_2026_1.png');
  assert.equal(getExportFileName(null, '2026.1'), 'grade_curso_2026_1.png');
});

test('course display name resolution for export header', () => {
  assert.equal(getCourseDisplayName('bcc'), 'Bacharelado em Ciência da Computação');
  assert.equal(getCourseDisplayName('eal'), 'Engenharia de Alimentos');
  assert.equal(getCourseDisplayName('adm'), 'Administração');
  assert.equal(getCourseDisplayName('mvet'), 'Medicina Veterinária');
  assert.equal(getCourseDisplayName('letras'), 'LETRAS');
  assert.equal(getCourseDisplayName('bcc', 'Custom Course Name'), 'Custom Course Name');
});

test('smart timeslot slicing trims unneeded shifts while preserving student intervals', () => {
  const catalogList: Discipline[] = [
    { id: '1', code: 'C1', name: 'M1', professor: 'P1', sessions: [{ day: 2, time: '08:00 - 10:00' }], period: 1 },
    { id: '2', code: 'C2', name: 'M2', professor: 'P2', sessions: [{ day: 2, time: '10:00 - 12:00' }], period: 1 },
    { id: '3', code: 'C3', name: 'M3', professor: 'P3', sessions: [{ day: 2, time: '14:00 - 16:00' }], period: 1 },
    { id: '4', code: 'C4', name: 'M4', professor: 'P4', sessions: [{ day: 2, time: '16:00 - 18:00' }], period: 1 },
    { id: '5', code: 'C5', name: 'M5', professor: 'P5', sessions: [{ day: 2, time: '18:30 - 20:10' }], period: 1 },
    { id: '6', code: 'C6', name: 'M6', professor: 'P6', sessions: [{ day: 2, time: '20:10 - 21:50' }], period: 1 }
  ];

  // Student only has morning classes
  const morningSchedule: Discipline[] = [
    { id: '1', code: 'C1', name: 'M1', professor: 'P1', sessions: [{ day: 2, time: '08:00 - 10:00' }], period: 1 },
    { id: '2', code: 'C2', name: 'M2', professor: 'P2', sessions: [{ day: 4, time: '10:00 - 12:00' }], period: 1 }
  ];

  const morningSlots = computeExportTimeslots(morningSchedule, catalogList);
  assert.deepEqual(morningSlots, ['08:00 - 10:00', '10:00 - 12:00']);

  // Student has morning and afternoon classes
  const mixedSchedule: Discipline[] = [
    { id: '1', code: 'C1', name: 'M1', professor: 'P1', sessions: [{ day: 2, time: '08:00 - 10:00' }], period: 1 },
    { id: '3', code: 'C3', name: 'M3', professor: 'P3', sessions: [{ day: 3, time: '14:00 - 16:00' }], period: 1 }
  ];

  const mixedSlots = computeExportTimeslots(mixedSchedule, catalogList);
  assert.deepEqual(mixedSlots, ['08:00 - 10:00', '10:00 - 12:00', '14:00 - 16:00']);

  // Student has empty schedule
  const emptySlots = computeExportTimeslots([], catalogList);
  assert.deepEqual(emptySlots, []);
});

test('Saturday column inclusion condition', () => {
  const weekdayOnly: Discipline[] = [
    { id: '1', code: 'C1', name: 'M1', professor: 'P1', sessions: [{ day: 2, time: '08:00 - 10:00' }], period: 1 },
    { id: '2', code: 'C2', name: 'M2', professor: 'P2', sessions: [{ day: 5, time: '10:00 - 12:00' }], period: 1 }
  ];

  const withSaturday: Discipline[] = [
    { id: '1', code: 'C1', name: 'M1', professor: 'P1', sessions: [{ day: 2, time: '08:00 - 10:00' }], period: 1 },
    { id: '3', code: 'C3', name: 'M3', professor: 'P3', sessions: [{ day: 6, time: '08:00 - 12:00' }], period: 1 }
  ];

  const hasSat1 = weekdayOnly.some(d => d.sessions.some(s => s.day === 6));
  const hasSat2 = withSaturday.some(d => d.sessions.some(s => s.day === 6));

  assert.equal(hasSat1, false);
  assert.equal(hasSat2, true);

  const days1 = hasSat1 ? DAYS : DAYS.slice(0, 5);
  const days2 = hasSat2 ? DAYS : DAYS.slice(0, 5);

  assert.equal(days1.length, 5);
  assert.equal(days2.length, 6);
  assert.equal(days2[5].id, 6);
});
