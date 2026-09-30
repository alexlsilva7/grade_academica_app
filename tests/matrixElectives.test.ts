import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countedMatrixSubjects, electiveAlreadyAssigned, getElectiveCatalog, isGenericElective,
  matrixSubjectHours, matrixSubjectName, parseElectiveSelection, releaseElectiveSelection
} from '../src/utils/matrixElectives';
import type { ElectiveSelection } from '../src/utils/matrixElectives';
import { applyMatrixProgressImport, matrixProgressKey, restoreMatrixProgress, setMatrixSubjectCompletion } from '../src/utils/matrixProgress';
import type { MatrixSubject } from '../src/utils/matrixProgress';
import { applySubjectCompletions, completionIdentity, migrateCompletedDisciplines, replaceProfileCompletions, setDisciplineCompletion } from '../src/utils/disciplineCompletion';
import { collectBackupData, restoreBackupData } from '../src/utils/backupHelper';

class MemoryStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const slot = (id = 'opt1', period = 7): MatrixSubject => ({
  id, name: 'Optativa I', code: null, period, hours: 60, type: 'optativa', prereqs: ['intro'],
  desc: 'Descrição da matriz', status: 'pendente', grade: ''
});
const lastSubject: MatrixSubject = { ...slot('last', 9), name: 'Estágio', type: 'estagio' };
const selection: ElectiveSelection = { source: 'catalog', subjectId: 'libras', code: 'OPT030', name: 'Libras', hours: 30, desc: 'Ementa de Libras' };
const extra = (choice: ElectiveSelection, id = 'personal_opt_test'): MatrixSubject => ({
  ...slot(id, 9), name: 'Optativa adicional', additionalElective: true, hours: null, prereqs: null, electiveSelection: choice
});
const completedHours = (subjects: MatrixSubject[]) => countedMatrixSubjects(subjects)
  .filter(subject => subject.status === 'concluido').reduce((sum, subject) => sum + (matrixSubjectHours(subject) || 0), 0);

test('catalog includes shared electives and active profile, recognizes academic types and excludes generic slots', () => {
  const catalog = getElectiveCatalog({
    subjects: [
      { name: 'Libras', code: 'OPT030', type: 'Optativo', workload: { total: 30 } },
      { name: 'Outro perfil', code: 'OTHER', type: 'Optativa', profile: 'P2', workload: { total: 60 } },
      { name: 'Obrigatória', code: 'REQ', type: 'Obrigatória', period: 0 }
    ],
    profiles: [
      { id: 'P1', subjects: [slot(), { id: 'libras', name: 'Libras', code: 'opt030', academicType: 'Optativa', hours: 30 }, { id: 'own', name: 'Álgebra', type: 'optativa', hours: 45 }] },
      { id: 'P2', subjects: [{ id: 'hidden', name: 'Não pertence', type: 'optativa', hours: 60 }] }
    ]
  }, 'P1');
  assert.deepEqual(catalog.map(item => item.name), ['Álgebra', 'Libras']);
  assert.equal(catalog[1].hours, 30);
  assert.equal(catalog[1].subjectId, 'libras');
  assert.equal(isGenericElective({ name: 'Disciplina Optativa 2', type: 'Optativo' }), true);
  assert.equal(isGenericElective({ name: 'Optativa VIII', type: 'optativa' }), true);
  assert.equal(isGenericElective({ name: 'Libras', type: 'optativa', code: null }), false);
  assert.equal(getElectiveCatalog([{ name: 'Legada', type: 'Optativo', profile: 'P1', workload: { total: 45 } }], 'course')[0].hours, 45);
});

test('restoration retains elective snapshot and status without overwriting official identity, hours or prerequisites', () => {
  const official = slot();
  const saved = JSON.stringify([{ ...official, name: 'Conteúdo adulterado', period: 99, hours: 900, prereqs: [], status: 'cursando', grade: '8', electiveSelection: selection }]);
  const [restored] = restoreMatrixProgress([official], saved);
  assert.equal(restored.id, official.id);
  assert.equal(restored.name, 'Optativa I');
  assert.equal(restored.hours, 60);
  assert.equal(restored.period, 7);
  assert.deepEqual(restored.prereqs, ['intro']);
  assert.equal(restored.status, 'cursando');
  assert.equal(restored.grade, '8');
  assert.equal(matrixSubjectName(restored), 'Libras');
  assert.equal(matrixSubjectHours(restored), 30);
  assert.equal(restored.electiveSelection?.desc, 'Ementa de Libras');
});

test('manual selections validate positive finite hours and cannot personalize mandatory subjects', () => {
  for (const hours of [0, -1, Infinity, NaN, '30']) assert.equal(parseElectiveSelection({ source: 'manual', name: 'Matéria', hours }), undefined);
  assert.equal(parseElectiveSelection({ source: 'manual', name: '   ', hours: 30 }), undefined);
  assert.equal(parseElectiveSelection({ source: 'invented', name: 'Matéria', hours: 30 }), undefined);
  const manual = parseElectiveSelection({ source: 'manual', name: '  Minha optativa  ', hours: 45, code: 'FAKE', desc: 'FAKE' })!;
  assert.deepEqual(manual, { source: 'manual', name: 'Minha optativa', hours: 45 });
  const required = { ...slot(), name: 'Algoritmos', type: 'computacao' };
  assert.equal(restoreMatrixProgress([required], JSON.stringify([{ ...required, electiveSelection: manual }]))[0].electiveSelection, undefined);
});

test('additional electives restore only valid personal cards into the last official period', () => {
  const saved = JSON.stringify([
    { ...extra({ source: 'manual', name: 'Outra', hours: 45 }), period: 100, code: 'FAKE', prereqs: ['FAKE'] },
    extra(selection, 'not-a-personal-card'),
    { ...extra(selection, 'personal_opt_bad'), electiveSelection: { ...selection, hours: -30 } },
    { ...extra(selection, 'opt1'), name: 'Collision' }
  ]);
  const restored = restoreMatrixProgress([slot(), lastSubject], saved);
  assert.equal(restored.length, 3);
  assert.equal(restored[2].period, 9);
  assert.equal(restored[2].status, 'pendente');
  assert.equal(restored[2].code, undefined);
  assert.equal(restored[2].prereqs, null);
  assert.equal(matrixSubjectHours(restored[2]), 45);
});

test('only concluded cards count and a catalog discipline never counts twice', () => {
  const assigned = { ...slot(), electiveSelection: selection, status: 'concluido' as const };
  const catalogNode = { ...slot('libras', 0), name: 'Libras', code: 'OPT030', hours: 30, status: 'concluido' as const };
  assert.equal(completedHours([assigned, catalogNode]), 30);
  assert.equal(completedHours([{ ...assigned, status: 'pendente' }, catalogNode]), 0);
  assert.equal(completedHours([assigned, catalogNode, { ...extra({ source: 'manual', name: 'Outra', hours: 45 }), status: 'concluido' }]), 75);
  assert.equal(electiveAlreadyAssigned([assigned], { ...selection, code: 'opt030' }), true);
  assert.equal(electiveAlreadyAssigned([assigned], selection, assigned.id), false);
  const restored = restoreMatrixProgress([slot(), slot('opt2')], JSON.stringify([assigned, { ...slot('opt2'), electiveSelection: selection }, extra(selection)]));
  assert.equal(restored.length, 2);
  assert.equal(restored[1].electiveSelection, undefined);
});

test('backup and matrix import round trip choices and extras while old imports clear personalizations', () => {
  const original = [slot(), lastSubject];
  const personalized = [{ ...slot(), electiveSelection: selection, status: 'concluido' as const }, lastSubject, extra({ source: 'manual', name: 'Minha disciplina', hours: 45 })];
  const storage = new MemoryStorage();
  storage.setItem(matrixProgressKey('bcc', 'BCC03'), JSON.stringify(personalized));
  const target = new MemoryStorage();
  assert.equal(restoreBackupData(target, collectBackupData(storage)), true);
  assert.equal(restoreMatrixProgress(original, target.getItem(matrixProgressKey('bcc', 'BCC03'))).length, 3);
  const imported = applyMatrixProgressImport({ course: 'bcc', profileId: 'BCC03', subjects: personalized }, 'bcc', 'BCC03', original)!;
  assert.equal(imported.subjects[0].electiveSelection?.name, 'Libras');
  assert.equal(imported.additionalElectives[0].electiveSelection?.hours, 45);
  assert.equal(applyMatrixProgressImport({ course: 'bcc', profileId: 'BCC02', subjects: personalized }, 'bcc', 'BCC03', original), null);
  const legacy = applyMatrixProgressImport({ course: 'bcc', profileId: 'BCC03', subjects: [{ id: 'opt1', status: 'concluido' }] }, 'bcc', 'BCC03', original)!;
  assert.equal(legacy.subjects[0].electiveSelection, undefined);
  assert.equal(legacy.subjects[0].status, 'concluido');
  assert.equal(legacy.additionalElectives.length, 0);
  assert.equal(restoreMatrixProgress(original, null).some(subject => subject.electiveSelection || subject.additionalElective), false);
});

test('schedule completion uses selected code in both legacy and canonical progress', () => {
  const assigned = { ...slot(), electiveSelection: selection };
  const storage = new MemoryStorage();
  storage.setItem('bcc_matriz_progress_BCC03', JSON.stringify([assigned]));
  setDisciplineCompletion(storage, 'bcc', { id: 'offering', code: 'opt030' }, true);
  const restored = restoreMatrixProgress([slot()], storage.getItem('bcc_matriz_progress_BCC03'));
  assert.equal(restored[0].status, 'concluido');
  assert.equal(restored[0].electiveSelection?.hours, 30);
  assert.equal(completionIdentity(assigned, 'BCC03'), 'OPT030');
  assert.equal(JSON.parse(setMatrixSubjectCompletion(JSON.stringify([assigned]), 'OPT030', true)!)[0].status, 'concluido');
  assert.equal(applySubjectCompletions([assigned], ['OPT030'], 'BCC03')[0].status, 'concluido');
  setDisciplineCompletion(storage, 'bcc', { id: 'offering', code: 'OPT030' }, false);
  assert.equal(JSON.parse(storage.getItem('bcc_matriz_progress_BCC03')!)[0].status, 'pendente');
});

test('reassigning or removing an elective releases previous completion without leaving hidden hours', () => {
  const assigned = { ...slot(), electiveSelection: selection, status: 'concluido' as const };
  const hidden = { ...slot('libras', 0), name: 'Libras', code: 'OPT030', status: 'concluido' as const, hours: 30 };
  const previous = [assigned, hidden];
  const changed = releaseElectiveSelection(previous, 'opt1').map(subject => subject.id === 'opt1'
    ? { ...subject, electiveSelection: { ...selection, code: 'OPT045', name: 'Outra optativa', hours: 45 } } : subject);
  assert.equal(changed[1].status, 'pendente');
  assert.equal(completedHours(changed), 45);
  const storage = new MemoryStorage();
  storage.setItem('bcc_matriz_progress_BCC03', JSON.stringify(previous));
  migrateCompletedDisciplines(storage, 'bcc');
  replaceProfileCompletions(storage, 'bcc', 'BCC03', changed, previous);
  assert.deepEqual(JSON.parse(storage.getItem('completedDisciplines_bcc')!), ['OPT045']);
  const removed = releaseElectiveSelection([extra(selection), hidden], 'personal_opt_test').filter(subject => !subject.additionalElective);
  assert.equal(completedHours(removed), 0);
  const manual = { ...extra({ source: 'manual', name: 'Sem código', hours: 30 }), status: 'concluido' as const };
  replaceProfileCompletions(storage, 'bcc', 'BCC03', [manual], changed);
  replaceProfileCompletions(storage, 'bcc', 'BCC03', [], [manual]);
  assert.deepEqual(JSON.parse(storage.getItem('completedDisciplines_bcc')!), []);
});

test('a new pending personal card owns completion even when the hidden catalog node was completed', () => {
  const storage = new MemoryStorage();
  const hidden = { ...slot('libras', 0), name: 'Libras', code: 'OPT030', hours: 30, status: 'concluido' as const };
  storage.setItem('bcc_matriz_progress_BCC03', JSON.stringify([hidden]));
  migrateCompletedDisciplines(storage, 'bcc');
  const next = [hidden, extra(selection)];
  replaceProfileCompletions(storage, 'bcc', 'BCC03', countedMatrixSubjects(next), [hidden]);
  const completed = JSON.parse(storage.getItem('completedDisciplines_bcc')!);
  assert.deepEqual(completed, []);
  assert.equal(completedHours(applySubjectCompletions(next, completed, 'BCC03')), 0);
});

test('catalog choices without codes use their source ID and remain scoped to the profile', () => {
  const choice: ElectiveSelection = { source: 'catalog', subjectId: 'catalog-without-code', name: 'Sem código oficial', hours: 45 };
  const assigned = { ...slot(), electiveSelection: choice };
  const storage = new MemoryStorage();
  storage.setItem('bcc_matriz_progress_BCC03', JSON.stringify([assigned]));
  setDisciplineCompletion(storage, 'bcc', { id: 'catalog-without-code' }, true, 'BCC03');
  assert.equal(JSON.parse(storage.getItem('bcc_matriz_progress_BCC03')!)[0].status, 'concluido');
  assert.equal(completionIdentity(assigned, 'BCC03'), 'id:BCC03:catalog-without-code');
  assert.equal(applySubjectCompletions([assigned], ['id:BCC03:catalog-without-code'], 'BCC02')[0].status, 'pendente');
});
