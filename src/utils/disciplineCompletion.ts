import type { MatrixProgressSubject } from './matrixProgress';

export type CompletionSubject = Pick<MatrixProgressSubject, 'id' | 'code' | 'status'> & {
  profile?: string | null;
  electiveSelection?: { source: 'catalog' | 'manual'; code?: string; subjectId?: string };
};
export type CompletionStorage = Pick<Storage, 'getItem' | 'setItem' | 'length' | 'key'>;
export const COMPLETION_EVENT = 'discipline-completion-changed';

export function completionCourseKey(course: string): string {
  return `completedDisciplines_${course.trim().toLowerCase()}`;
}

export function normalizeDisciplineCode(code?: string | null): string {
  return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

function scopedIdentity(id: string, profile: string): string {
  return `id:${encodeURIComponent(profile)}:${encodeURIComponent(id)}`;
}

export function completionIdentity(subject: Pick<CompletionSubject, 'id' | 'code' | 'profile' | 'electiveSelection'>, profile?: string): string {
  const selection = subject.electiveSelection;
  const code = selection?.source === 'catalog' ? selection.code : subject.code;
  const id = selection?.source === 'catalog' ? selection.subjectId || subject.id : subject.id;
  return normalizeDisciplineCode(code) || scopedIdentity(id, profile?.trim() || subject.profile?.trim() || 'unassigned');
}

function parseArray(saved: string | null): unknown[] {
  try {
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function parseCompletionEntries(saved: string | null): string[] {
  return [...new Set(parseArray(saved).filter((value): value is string => typeof value === 'string' && !!value.trim())
    .map(value => value.startsWith('id:') ? value : normalizeDisciplineCode(value)))];
}

function storageKeys(storage: Pick<Storage, 'length' | 'key'>): string[] {
  return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => !!key);
}

function progressProfile(key: string, course: string): string | null {
  const prefix = `${course}_matriz_progress_`;
  if (key.startsWith(prefix)) {
    const profile = key.slice(prefix.length);
    return course === 'bcc' && profile === 'nova' ? 'BCC03' : course === 'bcc' && profile === 'antiga' ? 'BCC02' : profile;
  }
  if (course === 'bcc' && key === 'bcc_matriz_progress') return 'BCC03';
  if (course === 'bcc' && key === 'bcc_matriz_progress_antiga') return 'BCC02';
  return null;
}

function savedSubjects(saved: string | null): CompletionSubject[] {
  return parseArray(saved).filter((value): value is CompletionSubject =>
    !!value && typeof value === 'object' && typeof (value as CompletionSubject).id === 'string');
}

export function curriculumCompletionCatalog(curriculum: any, offerings: CompletionSubject[] = []): CompletionSubject[] {
  const profiles = Array.isArray(curriculum?.profiles) ? curriculum.profiles : [];
  const flat = Array.isArray(curriculum) ? curriculum
    : Array.isArray(curriculum?.subjects) ? curriculum.subjects
      : Array.isArray(curriculum?.treeSubjects) ? curriculum.treeSubjects : [];
  return [
    ...flat.map((subject: any) => ({ ...subject, id: subject.id || subject.code, profile: subject.profile || curriculum?.activeProfileId })),
    ...profiles.flatMap((profile: any) => (profile.subjects || []).map((subject: any) => ({ ...subject, id: subject.id || subject.code, profile: profile.id }))),
    ...offerings
  ].filter(subject => typeof subject.id === 'string');
}

function resolveLegacyEntry(entry: string, profile: string, catalog: CompletionSubject[]): string {
  const matches = catalog.filter(subject => subject.id === entry &&
    (profile === 'all' || profile === 'unassigned' || subject.profile === profile));
  const identities = [...new Set(matches.map(subject => completionIdentity(subject, subject.profile || profile)))];
  if (identities.length === 1) return identities[0];
  // A known no-code ID must not turn into an unrelated code from another profile.
  if (identities.length > 1) return scopedIdentity(entry, profile);
  const code = normalizeDisciplineCode(entry);
  return catalog.some(subject => normalizeDisciplineCode(subject.code) === code) ? code : scopedIdentity(entry, profile);
}

function resolveScopedEntry(entry: string, catalog: CompletionSubject[]): string {
  if (!entry.startsWith('id:')) return entry;
  const separator = entry.indexOf(':', 3);
  if (separator < 0) return entry;
  try {
    return resolveLegacyEntry(decodeURIComponent(entry.slice(separator + 1)), decodeURIComponent(entry.slice(3, separator)), catalog);
  } catch { return entry; }
}

export function applySubjectCompletions<T extends MatrixProgressSubject>(subjects: T[], completed: readonly string[], profile: string): T[] {
  const identities = new Set(completed);
  let changed = false;
  const next = subjects.map(subject => {
    const isCompleted = identities.has(completionIdentity(subject, profile));
    if (isCompleted && subject.status !== 'concluido') {
      changed = true;
      return { ...subject, status: 'concluido' as const, grade: subject.grade || '' };
    }
    if (!isCompleted && subject.status === 'concluido') {
      changed = true;
      return { ...subject, status: 'pendente' as const, grade: '' };
    }
    return subject;
  });
  return changed ? next : subjects;
}

function storedProgressUpdates(storage: CompletionStorage, course: string, completed: string[], catalog: CompletionSubject[]): Array<[string, string]> {
  const updates: Array<[string, string]> = [];
  for (const key of storageKeys(storage)) {
    const profile = progressProfile(key, course);
    if (!profile) continue;
    const subjects = savedSubjects(storage.getItem(key));
    let resolvedCode = false;
    const resolved = subjects.map(subject => {
      if (normalizeDisciplineCode(subject.code) || subject.electiveSelection) return subject;
      const current = catalog.find(item => item.id === subject.id && item.profile === profile && normalizeDisciplineCode(item.code));
      if (!current) return subject;
      resolvedCode = true;
      return { ...subject, code: current.code };
    });
    const next = applySubjectCompletions(resolved, completed, profile);
    if (resolvedCode || next !== resolved) updates.push([key, JSON.stringify(next)]);
  }
  return updates;
}

function notifyCompletionChange(storage: CompletionStorage, key: string): void {
  if (typeof window !== 'undefined' && storage === window.localStorage) {
    window.dispatchEvent(new CustomEvent(COMPLETION_EVENT, { detail: key }));
  }
}

function writeCompletions(storage: CompletionStorage, course: string, completed: string[], catalog: CompletionSubject[] = []): string[] {
  course = course.trim().toLowerCase();
  const key = completionCourseKey(course);
  const next = [...new Set(completed)].sort();
  const saved = JSON.stringify(next);
  const canonicalChanged = storage.getItem(key) !== saved;
  const updates = storedProgressUpdates(storage, course, next, catalog);
  if (canonicalChanged) updates.push([key, saved]);
  const previous = new Map(updates.map(([storageKey]) => [storageKey, storage.getItem(storageKey)]));
  try {
    for (const [storageKey, value] of updates) storage.setItem(storageKey, value);
  } catch (error) {
    for (const [storageKey, value] of previous) {
      // A failed first migration must not leave a partial canonical list behind.
      try {
        if (value !== null) storage.setItem(storageKey, value);
      } catch {}
    }
    throw error;
  }
  // Notify only after every write, so subscribers never see partially updated progress.
  if (canonicalChanged) notifyCompletionChange(storage, key);
  return next;
}

export function migrateCompletedDisciplines(storage: CompletionStorage, courseId: string, catalog: CompletionSubject[] = []): string[] {
  const course = courseId.trim().toLowerCase();
  const keys = storageKeys(storage);
  const progress = keys.flatMap(key => {
    const profile = progressProfile(key, course);
    return profile ? savedSubjects(storage.getItem(key)).map(subject => ({ ...subject, profile })) : [];
  });
  const referencesById = new Map<string, CompletionSubject>();
  for (const subject of [...catalog, ...progress]) {
    const key = JSON.stringify([subject.profile || 'unassigned', subject.id]);
    if (!referencesById.has(key)) referencesById.set(key, subject);
  }
  const references = [...referencesById.values()];
  const canonical = storage.getItem(completionCourseKey(course));
  if (canonical !== null) {
    // An existing empty list is authoritative. Only resolve previously unknown IDs.
    return writeCompletions(storage, course, parseCompletionEntries(canonical).map(entry => resolveScopedEntry(entry, references)), catalog);
  }
  const completed = progress.filter(subject => subject.status === 'concluido')
    .map(subject => resolveScopedEntry(completionIdentity(subject), references));
  const prefix = `completedDisciplines_${course}_`;
  for (const key of keys) {
    const legacyProfile = key.startsWith(prefix) ? key.slice(prefix.length)
      : course === 'bcc' && key === 'completedDisciplines' ? 'BCC03' : null;
    if (!legacyProfile) continue;
    const profile = course === 'bcc' && legacyProfile === 'nova' ? 'BCC03'
      : course === 'bcc' && legacyProfile === 'antiga' ? 'BCC02' : legacyProfile;
    for (const entry of parseArray(storage.getItem(key))) {
      if (typeof entry === 'string' && entry.trim()) completed.push(entry.startsWith('id:') ? resolveScopedEntry(entry, references) : resolveLegacyEntry(entry, profile, references));
    }
  }
  return writeCompletions(storage, course, completed, catalog);
}

export function setDisciplineCompletion(storage: CompletionStorage, course: string, subject: CompletionSubject, completed: boolean, profile?: string): void {
  const current = migrateCompletedDisciplines(storage, course, [{ ...subject, profile: profile || subject.profile }]);
  const identity = completionIdentity(subject, profile);
  writeCompletions(storage, course, completed ? [...current, identity] : current.filter(entry => entry !== identity));
}

export function replaceProfileCompletions(storage: CompletionStorage, course: string, profile: string, subjects: CompletionSubject[], previousSubjects: CompletionSubject[] = []): void {
  const current = migrateCompletedDisciplines(storage, course, subjects.map(subject => ({ ...subject, profile })));
  const identities = new Set([...subjects, ...previousSubjects].map(subject => completionIdentity(subject, profile)));
  writeCompletions(storage, course, [
    ...current.filter(entry => !identities.has(entry)),
    ...subjects.filter(subject => subject.status === 'concluido').map(subject => completionIdentity(subject, profile))
  ]);
}

export function replaceCourseCompletions(storage: CompletionStorage, course: string, entries: string[], catalog: CompletionSubject[]): void {
  writeCompletions(storage, course, entries.filter(entry => typeof entry === 'string' && !!entry.trim())
    .map(entry => entry.startsWith('id:') ? resolveScopedEntry(entry, catalog) : resolveLegacyEntry(entry, 'all', catalog)));
}

export function subscribeToCompletions(course: string, listener: () => void): () => void {
  const key = completionCourseKey(course);
  const localListener = (event: Event) => { if ((event as CustomEvent<string>).detail === key) listener(); };
  const storageListener = (event: StorageEvent) => {
    if ((event.key === key || event.key === null) && (!event.storageArea || event.storageArea === localStorage)) listener();
  };
  window.addEventListener(COMPLETION_EVENT, localListener);
  window.addEventListener('storage', storageListener);
  return () => {
    window.removeEventListener(COMPLETION_EVENT, localListener);
    window.removeEventListener('storage', storageListener);
  };
}
