import test from 'node:test';
import assert from 'node:assert/strict';
import { collectBackupData, restoreBackupData } from '../src/utils/backupHelper';
import { applyMatrixProgressImport, completedDisciplinesKey, matrixProgressKey, readStoredHours, restoreMatrixSubjects, setMatrixSubjectCompletion } from '../src/utils/matrixProgress';

class MemoryStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  entries() { return Object.fromEntries(this.values); }
}

test('matrix progress and completed discipline storage keys isolate courses and profiles', () => {
  assert.equal(matrixProgressKey('bcc', 'BCC03'), 'bcc_matriz_progress_BCC03');
  assert.equal(matrixProgressKey('eal', 'EAL03'), 'eal_matriz_progress_EAL03');
  assert.notEqual(completedDisciplinesKey('bcc', 'BCC03'), completedDisciplinesKey('bcc', 'BCC02'));
  assert.notEqual(completedDisciplinesKey('bcc', 'BCC03'), completedDisciplinesKey('eal', 'BCC03'));
});

test('restoring matrix state retains catalog prerequisites, including unknown values', () => {
  const catalog = [
    { id: 'one', code: 'A1', name: 'A', prereqs: null },
    { id: 'two', code: 'A2', name: 'B', prereqs: ['one'] }
  ];
  const restored = restoreMatrixSubjects(catalog, JSON.stringify([
    { id: 'one', code: 'A1', status: 'concluido', grade: '9.5', prereqs: [] },
    { id: 'two', code: 'A2', status: 'invented', grade: 8, prereqs: null }
  ]));
  assert.equal(restored[0].prereqs, null);
  assert.equal(restored[0].status, 'concluido');
  assert.equal(restored[0].grade, '9.5');
  assert.deepEqual(restored[1].prereqs, ['one']);
  assert.equal(restored[1].status, 'pendente');
  assert.equal(restored[1].grade, '');
});

test('profile hours distinguish a saved zero from a missing legacy value', () => {
  const storage = new MemoryStorage();
  storage.setItem('bcc_acex_hours_BCC03', '0');
  storage.setItem('bcc_acex_hours', '40');
  storage.setItem('bcc_acc_hours_BCC03', '12');
  assert.equal(readStoredHours(storage, 'bcc_acex_hours_BCC03', 'bcc_acex_hours'), 0);
  assert.equal(readStoredHours(storage, 'bcc_acc_hours_BCC03', 'bcc_acc_hours'), 12);
  assert.equal(readStoredHours(storage, 'eal_acc_hours_EAL03', 'bcc_acc_hours'), 0);
});

test('matrix progress import rejects another course or profile and overlays only progress fields', () => {
  const catalog = [{ id: 'node-a', code: 'A1', prereqs: null, status: 'pendente' as const, grade: '' }];
  const wrongCourse = applyMatrixProgressImport({ course: 'eal', profileId: 'BCC03', subjects: [] }, 'bcc', 'BCC03', catalog);
  const wrongProfile = applyMatrixProgressImport({ course: 'bcc', profileId: 'BCC02', subjects: [] }, 'bcc', 'BCC03', catalog);
  assert.equal(wrongCourse, null);
  assert.equal(wrongProfile, null);

  const valid = applyMatrixProgressImport({
    course: 'bcc', profileId: 'BCC03', acexHours: 20, accHours: 10,
    subjects: [{ id: 'node-a', code: 'A1', status: 'concluido', grade: '8', prereqs: [] }]
  }, 'bcc', 'BCC03', catalog);
  assert.equal(valid?.subjects[0].status, 'concluido');
  assert.equal(valid?.subjects[0].prereqs, null);
  assert.equal(valid?.acexHours, 20);
  assert.equal(valid?.accHours, 10);
});

test('schedule completion sync changes only the matching stored matrix node', () => {
  const saved = JSON.stringify([
    { id: 'node-a', code: 'A1', status: 'pendente', grade: '' },
    { id: 'node-b', code: 'A2', status: 'cursando', grade: '7' }
  ]);
  const next = JSON.parse(setMatrixSubjectCompletion(saved, 'A1', true)!);
  assert.equal(next[0].status, 'concluido');
  assert.equal(next[1].status, 'cursando');
});

test('full backup includes namespaced course/profile progress and restore ignores unrelated keys', () => {
  const source = new MemoryStorage();
  source.setItem('bcc_matriz_progress_BCC03', JSON.stringify([{ id: 'a', status: 'concluido' }]));
  source.setItem('eal_matriz_progress_EAL03', JSON.stringify([{ id: 'b', status: 'cursando' }]));
  source.setItem('eal_acex_hours_EAL03', '0');
  source.setItem('completedDisciplines_eal_EAL03', '["EAL001"]');
  source.setItem('supabase.auth.token', 'do-not-export');
  const backup = collectBackupData(source);
  assert.equal(backup['bcc_matriz_progress_BCC03'], source.getItem('bcc_matriz_progress_BCC03'));
  assert.equal(backup['eal_matriz_progress_EAL03'], source.getItem('eal_matriz_progress_EAL03'));
  assert.equal(backup['eal_acex_hours_EAL03'], '0');
  assert.equal(backup['completedDisciplines_eal_EAL03'], '["EAL001"]');
  assert.equal(Object.hasOwn(backup, 'supabase.auth.token'), false);

  const target = new MemoryStorage();
  target.setItem('supabase.auth.token', 'existing-token');
  target.setItem('unrelated', 'keep');
  assert.equal(restoreBackupData(target, { ...backup, unrelated: 'overwrite', 'supabase.auth.token': 'replace-token' }), true);
  assert.equal(target.getItem('eal_acex_hours_EAL03'), '0');
  assert.equal(target.getItem('bcc_matriz_progress_BCC03'), source.getItem('bcc_matriz_progress_BCC03'));
  assert.equal(target.getItem('supabase.auth.token'), 'existing-token');
  assert.equal(target.getItem('unrelated'), 'keep');
});

test('backup restore rejects malformed records without changing storage', () => {
  const storage = new MemoryStorage();
  storage.setItem('selectedCourse', 'bcc');
  assert.equal(restoreBackupData(storage, { selectedCourse: 3 }), false);
  assert.equal(restoreBackupData(storage, { anything: 'value' }), false);
  assert.equal(storage.getItem('selectedCourse'), 'bcc');
});
