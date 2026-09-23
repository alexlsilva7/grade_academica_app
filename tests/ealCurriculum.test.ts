import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

test('EAL data files and registry consistency', () => {
  const dataDir = path.join(process.cwd(), 'src', 'data');
  const registryPath = path.join(dataDir, 'courses_registry.json');
  
  assert.ok(fs.existsSync(registryPath), 'courses_registry.json exists');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  
  const ealCourse = registry.find((c: any) => c.id === 'eal');
  assert.ok(ealCourse, 'Course eal is registered');
  assert.equal(ealCourse.name, 'Engenharia de Alimentos');
  assert.equal(ealCourse.shortName, 'EAL');
  assert.equal(ealCourse.hasCurriculum, true);
  assert.deepEqual(ealCourse.profiles, ['EAL03']);

  const ealDir = path.join(dataDir, 'eal');
  assert.ok(fs.existsSync(ealDir), 'src/data/eal exists');

  const currPath = path.join(ealDir, 'curriculo_eal.json');
  assert.ok(fs.existsSync(currPath), 'src/data/eal/curriculo_eal.json exists');

  const curriculum = JSON.parse(fs.readFileSync(currPath, 'utf-8'));
  assert.ok(Array.isArray(curriculum.profiles), 'profiles is an array');
  assert.equal(curriculum.profiles.length, 1, 'EAL must have only 1 profile');
  assert.equal(curriculum.profiles[0].id, 'EAL03', 'EAL profile ID is EAL03');
  assert.equal(curriculum.profiles[0].subjects.length > 50, true, 'EAL has subjects');

  // Verify first period subject
  const calc1 = curriculum.profiles[0].subjects.find((s: any) => s.code === 'EAL00024');
  assert.ok(calc1, 'Calculo I A exists in EAL03');
  assert.equal(calc1.name, 'Cálculo I A');
  assert.equal(calc1.period, 1);

  // Verify requirements for EAL03
  const profile = curriculum.profiles[0];
  assert.equal(curriculum.institution, 'UFAPE');
  assert.equal(profile.totalHours, 3900, 'Total hours should be 3900');
  assert.equal(profile.acexHours, 390, 'Extensao (ACEX) hours should be 390');
  assert.equal(profile.accHours, 120, 'Complementar (ACC) hours should be 120');
  assert.equal(profile.optativeHours, 180, 'Optativas hours should be 180');
  assert.equal(profile.mandatoryHours, 3210, 'Obrigatorias hours should be 3210');
  assert.deepEqual(profile.requisitos, {
    total: 3900,
    acex_extensao: 390,
    acc_complementar: 120,
    optativas: 180,
    obrigatorias: 3210
  });

  // Verify sum of mandatory subjects workload
  const mandatorySubjects = profile.subjects.filter((s: any) => s.type !== 'optativa' && s.academicType !== 'Optativa');
  const mandatoryHoursSum = mandatorySubjects.reduce((sum: number, s: any) => sum + (s.hours || 0), 0);
  assert.equal(mandatoryHoursSum, 3210, 'Sum of mandatory subjects hours must match 3210');
});
