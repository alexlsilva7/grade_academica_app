import test from 'node:test';
import assert from 'node:assert/strict';

test('semester detection regex correctly extracts academic periods from schedule file names', () => {
  const fileNames = [
    'horario_bcc_2026_1.json',
    'horario_bcc_2026_2.json',
    'horario_engenharia-de-alimentos_2025_2.json',
    'curriculo_bcc.json',
    'extracao_horario_bcc_2026_1.json',
    'conteudos_bcc.json'
  ];

  const detectedSemesters: string[] = [];
  fileNames.forEach(f => {
    const match = f.match(/^horario_[a-z0-9_-]+_(\d{4}_\d)\.json$/);
    if (match) {
      detectedSemesters.push(match[1].replace('_', '.'));
    }
  });

  assert.deepEqual(detectedSemesters, ['2026.1', '2026.2', '2025.2']);
});

test('semester merging preserves existing semesters and accumulates new ones without duplicates', () => {
  const existingSemesters = ['2026.1'];
  const diskSemesters = ['2026.1', '2025.2'];
  const newSemesterInput = '2026.2';

  const formattedSem = newSemesterInput.replace(/_/g, '.');
  const merged = Array.from(new Set([...existingSemesters, ...diskSemesters, formattedSem])).sort();

  assert.deepEqual(merged, ['2025.2', '2026.1', '2026.2']);
});

test('schedule file resolver prioritizes requested semester and falls back to most recent', () => {
  const files = [
    'curriculo_bcc.json',
    'horario_bcc_2026_1.json',
    'horario_bcc_2026_2.json',
    'extracao_horario_bcc_2026_1.json'
  ];

  function resolveTargetFile(courseId: string, requestedSemester?: string): string | undefined {
    let target: string | undefined;
    if (requestedSemester) {
      const semClean = requestedSemester.replace(/\./g, '_');
      target = files.find(f => f === `horario_${courseId}_${semClean}.json` || (f.startsWith('horario_') && f.endsWith(`_${semClean}.json`)));
    }
    if (!target) {
      const schedFiles = files.filter(f => f.startsWith('horario_') && f.endsWith('.json')).sort().reverse();
      target = schedFiles[0];
    }
    return target;
  }

  // 1. Specific semester 2026.1 requested
  assert.equal(resolveTargetFile('bcc', '2026.1'), 'horario_bcc_2026_1.json');

  // 2. Specific semester 2026.2 requested
  assert.equal(resolveTargetFile('bcc', '2026.2'), 'horario_bcc_2026_2.json');

  // 3. Unknown semester requested -> falls back to most recent
  assert.equal(resolveTargetFile('bcc', '2099.1'), 'horario_bcc_2026_2.json');

  // 4. No semester requested -> resolves most recent
  assert.equal(resolveTargetFile('bcc'), 'horario_bcc_2026_2.json');
});
