export type MatrixStatus = 'pendente' | 'cursando' | 'concluido';

export type MatrixProgressSubject = {
  id: string;
  code?: string | null;
  status?: MatrixStatus;
  grade?: string;
};

export function matrixProgressKey(course: string | null | undefined, profile: string): string {
  return `${course?.trim().toLowerCase() || 'bcc'}_matriz_progress_${profile.trim() || 'default'}`;
}

export function completedDisciplinesKey(course: string | null | undefined, profile: string): string {
  return `completedDisciplines_${course?.trim().toLowerCase() || 'bcc'}_${profile.trim() || 'all'}`;
}

function parseSavedSubjects(saved: string | null | undefined): MatrixProgressSubject[] {
  if (!saved) return [];
  try {
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((item): item is MatrixProgressSubject =>
      !!item && typeof item === 'object' && typeof (item as MatrixProgressSubject).id === 'string'
    ) : [];
  } catch {
    return [];
  }
}

export function restoreMatrixSubjects<T extends MatrixProgressSubject>(catalog: T[], saved: string | null | undefined): Array<T & { status: MatrixStatus; grade: string }> {
  const savedById = new Map<string, MatrixProgressSubject>();
  const savedByCode = new Map<string, MatrixProgressSubject>();
  for (const subject of parseSavedSubjects(saved)) {
    savedById.set(subject.id, subject);
    if (subject.code) savedByCode.set(subject.code, subject);
  }
  return catalog.map(subject => {
    const existing = savedById.get(subject.id) || (subject.code ? savedByCode.get(subject.code) : undefined);
    const status = existing?.status;
    return {
      ...subject,
      status: status === 'pendente' || status === 'cursando' || status === 'concluido' ? status : 'pendente',
      grade: typeof existing?.grade === 'string' ? existing.grade : ''
    };
  });
}

export function readStoredHours(storage: Pick<Storage, 'getItem'>, key: string, legacyKey?: string): number {
  const value = storage.getItem(key) ?? (legacyKey ? storage.getItem(legacyKey) : null);
  if (value == null || value.trim() === '') return 0;
  const hours = Number(value);
  return Number.isFinite(hours) && hours >= 0 ? hours : 0;
}

export function applyMatrixProgressImport<T extends MatrixProgressSubject>(
  parsed: unknown,
  course: string,
  profileId: string,
  catalog: T[]
): { subjects: Array<T & { status: MatrixStatus; grade: string }>; acexHours?: number; accHours?: number } | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data.subjects)) return null;
  if (typeof data.course !== 'string' || data.course.trim().toLowerCase() !== course.trim().toLowerCase()) return null;
  if (typeof data.profileId !== 'string' || data.profileId.trim().toLowerCase() !== profileId.trim().toLowerCase()) return null;
  const hours = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
  return {
    subjects: restoreMatrixSubjects(catalog, JSON.stringify(data.subjects)),
    acexHours: hours(data.acexHours),
    accHours: hours(data.accHours)
  };
}

export function setMatrixSubjectCompletion(saved: string | null, disciplineId: string, completed: boolean): string | null {
  const subjects = parseSavedSubjects(saved);
  if (!subjects.length) return null;
  const next = subjects.map(subject => {
    if (subject.id !== disciplineId && subject.code !== disciplineId) return subject;
    return { ...subject, status: completed ? 'concluido' : 'pendente', grade: completed ? subject.grade || '' : '' };
  });
  return JSON.stringify(next);
}
