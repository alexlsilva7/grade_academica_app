import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySubjectCompletions, completionCourseKey, completionIdentity, curriculumCompletionCatalog,
  migrateCompletedDisciplines, normalizeDisciplineCode, parseCompletionEntries, replaceProfileCompletions,
  setDisciplineCompletion, subscribeToCompletions, COMPLETION_EVENT
} from '../src/utils/disciplineCompletion';
import { collectBackupData, restoreBackupData } from '../src/utils/backupHelper';

class MemoryStorage {
  values = new Map<string, string>();
  writes = 0;
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); this.writes++; }
  removeItem(key: string) { this.values.delete(key); }
}

const current = { id: 'matrix-current', code: 'CCMP0001', profile: 'BCC03', status: 'pendente' as const, grade: '' };
const old = { id: 'matrix-old', code: ' ccmp0001 ', profile: 'BCC02', status: 'cursando' as const, grade: '' };
const offering = { id: 'offering-2026-2-A', code: 'CCMP0001', profile: 'BCC03' };
const read = (storage: MemoryStorage, course = 'bcc') => parseCompletionEntries(storage.getItem(completionCourseKey(course)));

test('identity shares normalized codes while preserving zeros and punctuation, and scopes missing codes to the profile', () => {
  assert.equal(normalizeDisciplineCode(' ccmp0001-a '), 'CCMP0001-A');
  assert.equal(completionIdentity(current), completionIdentity(old));
  assert.notEqual(completionIdentity({ id: 'same' }, 'BCC03'), completionIdentity({ id: 'same' }, 'BCC02'));
  assert.equal(completionIdentity({ id: 'same', code: ' ' }), 'id:unassigned:same');
});

test('schedule completion before the first matrix visit restores every profile by code and survives semester changes', () => {
  const storage = new MemoryStorage();
  setDisciplineCompletion(storage, 'bcc', offering, true);
  assert.deepEqual(read(storage), ['CCMP0001']);
  assert.equal(applySubjectCompletions([current], read(storage), 'BCC03')[0].status, 'concluido');
  assert.equal(applySubjectCompletions([old], read(storage), 'BCC02')[0].status, 'concluido');
  assert.equal(read(storage).includes(completionIdentity({ ...offering, id: 'offering-2027-1-B' })), true);
  assert.deepEqual(read(storage, 'eal'), []);
});

test('completion synchronizes all stored profiles, preserves individual grades, and unmarking clears only matching grades', () => {
  const storage = new MemoryStorage();
  storage.setItem('bcc_matriz_progress_BCC03', JSON.stringify([{ ...current, grade: '9' }, { id: 'other', code: 'OTHER2', status: 'cursando', grade: '' }]));
  storage.setItem('bcc_matriz_progress_BCC02', JSON.stringify([{ ...old, grade: '8' }]));
  storage.setItem('eal_matriz_progress_EAL03', JSON.stringify([{ ...current, grade: '7' }]));
  setDisciplineCompletion(storage, 'bcc', offering, true);
  assert.equal(JSON.parse(storage.getItem('bcc_matriz_progress_BCC03')!)[0].grade, '9');
  assert.equal(JSON.parse(storage.getItem('bcc_matriz_progress_BCC02')!)[0].grade, '8');
  setDisciplineCompletion(storage, 'bcc', { ...offering, profile: 'BCC02', id: 'different' }, false);
  for (const profile of ['BCC03', 'BCC02']) {
    const restored = JSON.parse(storage.getItem(`bcc_matriz_progress_${profile}`)!)[0];
    assert.equal(restored.status, 'pendente');
    assert.equal(restored.grade, '');
  }
  assert.equal(JSON.parse(storage.getItem('bcc_matriz_progress_BCC03')!)[1].status, 'cursando');
  assert.equal(JSON.parse(storage.getItem('eal_matriz_progress_EAL03')!)[0].grade, '7');
});

test('a no-code discipline with repeated IDs cannot complete a different profile or a coded discipline', () => {
  const storage = new MemoryStorage();
  setDisciplineCompletion(storage, 'bcc', { id: 'subject_0', profile: 'BCC03' }, true);
  const subject = { id: 'subject_0', status: 'pendente' as const, grade: '' };
  assert.equal(applySubjectCompletions([subject], read(storage), 'BCC03')[0].status, 'concluido');
  assert.equal(applySubjectCompletions([subject], read(storage), 'BCC02')[0].status, 'pendente');
  assert.equal(applySubjectCompletions([{ ...subject, code: 'OTHER' }], read(storage), 'BCC03')[0].status, 'pendente');
});

test('first migration unions legacy lists and matrix progress, translates IDs, and normalizes profile aliases', () => {
  const storage = new MemoryStorage();
  storage.setItem('completedDisciplines', '["matrix-current"]');
  storage.setItem('completedDisciplines_bcc_all', '["CCMP0001"]');
  storage.setItem('completedDisciplines_bcc_antiga', '["extra"]');
  storage.setItem('bcc_matriz_progress_BCC02', JSON.stringify([{ ...old, status: 'concluido' }]));
  storage.setItem('completedDisciplines_eal_EAL03', '["EAL999"]');
  const catalog = [current, old, { id: 'extra', code: 'EXTRA0002', profile: 'BCC02' }];
  assert.deepEqual(migrateCompletedDisciplines(storage, 'bcc', catalog), ['CCMP0001', 'EXTRA0002']);
  assert.equal(storage.getItem('completedDisciplines_eal'), null);
  const writes = storage.writes;
  migrateCompletedDisciplines(storage, 'bcc', catalog);
  assert.equal(storage.writes, writes);
});

test('a known no-code ID that looks like another profile code stays scoped after migration', () => {
  const storage = new MemoryStorage();
  const uncoded = { id: 'CCMP0001', profile: 'BCC02' };
  setDisciplineCompletion(storage, 'bcc', uncoded, true);
  assert.deepEqual(migrateCompletedDisciplines(storage, 'bcc', [uncoded, current]), ['id:BCC02:CCMP0001']);
});

test('no-code identity safely retains profile names and IDs containing separators', () => {
  const storage = new MemoryStorage();
  const subject = { id: 'node:1', profile: 'Perfil: 4/2024' };
  setDisciplineCompletion(storage, 'letras', subject, true);
  assert.deepEqual(migrateCompletedDisciplines(storage, 'letras', [subject]), [completionIdentity(subject)]);
  assert.notEqual(completionIdentity(subject), completionIdentity({ id: '4/2024:node:1', profile: 'Perfil' }));
});

test('late catalog loading resolves unknown legacy IDs without reimporting stale conclusions', () => {
  const storage = new MemoryStorage();
  storage.setItem('completedDisciplines_bcc_BCC03', '["matrix-current"]');
  assert.deepEqual(migrateCompletedDisciplines(storage, 'bcc'), ['id:BCC03:matrix-current']);
  assert.deepEqual(migrateCompletedDisciplines(storage, 'bcc', [current]), ['CCMP0001']);
  setDisciplineCompletion(storage, 'bcc', current, false);
  assert.deepEqual(migrateCompletedDisciplines(storage, 'bcc', [current]), []);
});

test('an explicit empty list remains authoritative over completed legacy progress', () => {
  const storage = new MemoryStorage();
  storage.setItem('completedDisciplines_bcc', '[]');
  storage.setItem('completedDisciplines', '["CCMP0001"]');
  storage.setItem('bcc_matriz_progress', JSON.stringify([{ ...current, status: 'concluido', grade: '9' }]));
  assert.deepEqual(migrateCompletedDisciplines(storage, 'bcc', [current]), []);
  assert.equal(JSON.parse(storage.getItem('bcc_matriz_progress')!)[0].status, 'pendente');
});

test('late ID-to-code migration preserves a concluded grade when the saved node had no code', () => {
  const storage = new MemoryStorage();
  storage.setItem('bcc_matriz_progress_BCC03', JSON.stringify([{ id: current.id, status: 'concluido', grade: '9.5' }]));
  migrateCompletedDisciplines(storage, 'bcc');
  assert.deepEqual(migrateCompletedDisciplines(storage, 'bcc', [current]), ['CCMP0001']);
  const saved = JSON.parse(storage.getItem('bcc_matriz_progress_BCC03')!)[0];
  assert.equal(saved.code, 'CCMP0001');
  assert.equal(saved.status, 'concluido');
  assert.equal(saved.grade, '9.5');
  migrateCompletedDisciplines(storage, 'bcc');
  assert.equal(JSON.parse(storage.getItem('bcc_matriz_progress_BCC03')!)[0].grade, '9.5');
  const firstVisit = new MemoryStorage();
  firstVisit.setItem('bcc_matriz_progress_BCC03', JSON.stringify([{ id: current.id, status: 'concluido', grade: '8' }]));
  assert.deepEqual(migrateCompletedDisciplines(firstVisit, 'bcc', [current]), ['CCMP0001']);
  assert.equal(JSON.parse(firstVisit.getItem('bcc_matriz_progress_BCC03')!)[0].grade, '8');
});

test('reset and import replace only the active profile codes, including shared codes', () => {
  const storage = new MemoryStorage();
  const exclusive = { id: 'exclusive', code: 'EXCLUSIVE2', profile: 'BCC02' };
  setDisciplineCompletion(storage, 'bcc', exclusive, true);
  setDisciplineCompletion(storage, 'bcc', current, true);
  replaceProfileCompletions(storage, 'bcc', 'BCC03', [current]);
  assert.deepEqual(read(storage), ['EXCLUSIVE2']);
  assert.equal(applySubjectCompletions([{ ...old, status: 'concluido' as const, grade: '8' }], read(storage), 'BCC02')[0].status, 'pendente');
  replaceProfileCompletions(storage, 'bcc', 'BCC03', [{ ...current, status: 'concluido' }]);
  assert.deepEqual(read(storage), ['CCMP0001', 'EXCLUSIVE2']);
});

test('canonical backups round trip and legacy restore replaces an existing canonical list using only imported data', () => {
  const storage = new MemoryStorage();
  setDisciplineCompletion(storage, 'bcc', current, true);
  const backup = collectBackupData(storage);
  assert.equal(backup.completedDisciplines_bcc, '["CCMP0001"]');
  const restored = new MemoryStorage();
  assert.equal(restoreBackupData(restored, backup), true);
  assert.deepEqual(read(restored), ['CCMP0001']);
  restored.setItem('bcc_matriz_progress_BCC02', JSON.stringify([{ id: 'stale', code: 'STALE', status: 'concluido' }]));
  restored.setItem('completedDisciplines_eal', '["EAL999"]');
  assert.equal(restoreBackupData(restored, {
    bcc_matriz_progress_BCC03: JSON.stringify([{ id: 'new', code: 'NEW0001', status: 'concluido', grade: '7' }]),
    completedDisciplines_bcc_BCC03: '["new"]'
  }), true);
  assert.deepEqual(read(restored), ['NEW0001']);
  assert.deepEqual(read(restored, 'eal'), ['EAL999']);
  assert.deepEqual(migrateCompletedDisciplines(restored, 'bcc'), ['NEW0001']);
});

test('invalid JSON does not throw or resurrect stale progress', () => {
  const storage = new MemoryStorage();
  storage.setItem('completedDisciplines_bcc', '{invalid');
  storage.setItem('completedDisciplines', '["CCMP0001"]');
  assert.deepEqual(migrateCompletedDisciplines(storage, 'bcc'), []);
  assert.deepEqual(parseCompletionEntries('[false,null,1,""," ccmp0001 ","CCMP0001"]'), ['CCMP0001']);
});

test('backups retain legacy keys with human-readable profile names', () => {
  const storage = new MemoryStorage();
  const key = 'completedDisciplines_letras_Perfil 4/2024';
  storage.setItem(key, '["node:1"]');
  storage.setItem('selected_profile_letras', 'Perfil 4/2024');
  const backup = collectBackupData(storage);
  assert.equal(backup[key], '["node:1"]');
  const restored = new MemoryStorage();
  assert.equal(restoreBackupData(restored, backup), true);
  assert.deepEqual(read(restored, 'letras'), [completionIdentity({ id: 'node:1', profile: 'Perfil 4/2024' })]);
});

test('a failed completion write restores previously saved matrix status and grade', () => {
  const storage = new MemoryStorage();
  const saved = JSON.stringify([{ ...current, status: 'concluido', grade: '9' }]);
  storage.setItem('bcc_matriz_progress_BCC03', saved);
  storage.setItem('completedDisciplines_bcc', '["CCMP0001"]');
  const setItem = storage.setItem.bind(storage);
  storage.setItem = (key, value) => {
    if (key === 'completedDisciplines_bcc' && value === '[]') throw new Error('quota');
    setItem(key, value);
  };
  assert.throws(() => setDisciplineCompletion(storage, 'bcc', current, false), /quota/);
  assert.equal(storage.getItem('bcc_matriz_progress_BCC03'), saved);
  assert.deepEqual(read(storage), ['CCMP0001']);
});

test('catalog includes all profiles and offerings without using names or equivalences as identity', () => {
  const catalog = curriculumCompletionCatalog({ profiles: [
    { id: 'BCC03', subjects: [{ id: 'a', code: 'A1', name: 'Same name', equivalences: [{ code: 'B1' }] }] },
    { id: 'BCC02', subjects: [{ id: 'b', code: 'B1', name: 'Same name' }] }
  ] }, [offering]);
  assert.deepEqual(catalog.map(subject => subject.profile), ['BCC03', 'BCC02', 'BCC03']);
  const storage = new MemoryStorage();
  setDisciplineCompletion(storage, 'bcc', catalog[0], true);
  assert.equal(read(storage).includes(completionIdentity(catalog[1])), false);
});

test('subscriptions react to same-page updates and other-tab storage events only for their course and clean up listeners', t => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const events = new EventTarget();
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: Object.assign(events, { localStorage: storage }) });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  t.after(() => {
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor); else delete (globalThis as any).window;
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor); else delete (globalThis as any).localStorage;
  });
  let calls = 0;
  const unsubscribe = subscribeToCompletions('bcc', () => calls++);
  setDisciplineCompletion(storage, 'bcc', current, true);
  const afterLocalWrite = calls;
  assert.ok(afterLocalWrite > 0);
  const emitStorage = (key: string | null) => {
    const event = new Event('storage');
    Object.assign(event, { key, storageArea: storage });
    events.dispatchEvent(event);
  };
  emitStorage('completedDisciplines_eal');
  assert.equal(calls, afterLocalWrite);
  emitStorage('completedDisciplines_bcc');
  assert.equal(calls, afterLocalWrite + 1);
  emitStorage(null);
  assert.equal(calls, afterLocalWrite + 2);
  unsubscribe();
  events.dispatchEvent(new CustomEvent(COMPLETION_EVENT, { detail: 'completedDisciplines_bcc' }));
  emitStorage('completedDisciplines_bcc');
  assert.equal(calls, afterLocalWrite + 2);
});
