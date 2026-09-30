export interface ElectiveSelection {
  source: 'catalog' | 'manual';
  subjectId?: string;
  code?: string;
  name: string;
  hours: number;
  desc?: string;
}

export interface ElectiveCatalogItem {
  key: string;
  subjectId?: string;
  code?: string;
  name: string;
  hours: number | null;
  desc: string;
}

export interface ElectiveFields {
  id: string;
  code?: string | null;
  name?: string;
  type?: string | null;
  academicType?: string | null;
  profile?: string | null;
  period?: number | string | null;
  hours?: number | null;
  desc?: string | null;
  electiveSelection?: ElectiveSelection;
  additionalElective?: boolean;
}

export function normalizeMatrixText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function isElective(value: unknown): boolean {
  const subject = record(value);
  return [subject.type, subject.academicType, subject.profile, subject.period]
    .some(value => typeof value === 'string' && /optativ[ao]/.test(normalizeMatrixText(value)));
}

export function isGenericElective(value: unknown): boolean {
  const subject = record(value);
  return isElective(subject) && typeof subject.name === 'string'
    && /^(?:disciplina\s+)?optativ[ao](?:\s+(?:[ivxlcdm]+|\d+))?$/.test(normalizeMatrixText(subject.name));
}

export function electiveIdentity(value: { code?: string | null; name?: string }): string {
  return value.code?.trim() ? `code:${normalizeMatrixText(value.code)}` : `name:${normalizeMatrixText(value.name || '')}`;
}

export function parseElectiveSelection(value: unknown): ElectiveSelection | undefined {
  const data = record(value);
  const name = textValue(data.name);
  if ((data.source !== 'catalog' && data.source !== 'manual') || !name
    || typeof data.hours !== 'number' || !Number.isFinite(data.hours) || data.hours <= 0) return undefined;
  return {
    source: data.source,
    name,
    hours: data.hours,
    ...(data.source === 'catalog' ? { subjectId: textValue(data.subjectId), code: textValue(data.code), desc: textValue(data.desc) } : {})
  };
}

/** Includes the active profile and shared catalog entries, never generic slots. */
export function getElectiveCatalog(curriculum: unknown, profileId: string): ElectiveCatalogItem[] {
  const data = record(curriculum);
  const profiles = Array.isArray(data.profiles) ? data.profiles.map(record) : [];
  const sources: unknown[] = [
    ...(Array.isArray(curriculum) ? curriculum : []),
    ...(Array.isArray(data.subjects) ? data.subjects : []),
    ...(Array.isArray(data.treeSubjects) ? data.treeSubjects : []),
    ...profiles.flatMap(profile => Array.isArray(profile.subjects)
      ? profile.subjects.map(value => ({ ...record(value), profile: record(value).profile || profile.id })) : [])
  ];
  const catalog = new Map<string, ElectiveCatalogItem>();
  for (const value of sources) {
    const subject = record(value);
    const name = textValue(subject.name);
    const profile = normalizeMatrixText(textValue(subject.profile) || '');
    if (!name || !isElective(subject) || isGenericElective(subject)) continue;
    if (profiles.length && profile && !['optativa', 'optativo', 'sem perfil', normalizeMatrixText(profileId)].includes(profile)) continue;
    const code = textValue(subject.code);
    const key = electiveIdentity({ code, name });
    const workload = record(subject.workload);
    const rawHours = subject.hours ?? workload.total ?? workload.total_hours;
    const hours = typeof rawHours === 'number' && Number.isFinite(rawHours) && rawHours > 0 ? rawHours : null;
    const next = { key, subjectId: textValue(subject.id), code, name, hours, desc: textValue(subject.ementa) || textValue(subject.desc) || '' };
    const previous = catalog.get(key);
    catalog.set(key, previous ? {
      ...previous, subjectId: previous.subjectId || next.subjectId,
      hours: previous.hours ?? next.hours, desc: previous.desc || next.desc
    } : next);
  }
  return Array.from(catalog.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function matrixSubjectName(subject: ElectiveFields): string {
  return subject.electiveSelection?.name || subject.name || '';
}

export function matrixSubjectHours(subject: ElectiveFields): number | null {
  return subject.electiveSelection?.hours ?? subject.hours ?? null;
}

export function matrixSubjectCode(subject: ElectiveFields): string | null {
  return subject.electiveSelection?.code || subject.code || null;
}

export function lastMatrixPeriod(catalog: Array<{ period?: string | number | null }>): number {
  return Math.max(1, ...catalog.map(subject => Number(subject.period) || 0));
}

/** Personal assignments own the status and workload of their catalog discipline. */
export function countedMatrixSubjects<T extends ElectiveFields>(subjects: T[]): T[] {
  const assigned = new Set(subjects.filter(subject => subject.electiveSelection?.source === 'catalog')
    .map(subject => electiveIdentity(subject.electiveSelection!)));
  const seen = new Set<string>();
  return subjects.filter(subject => {
    const selection = subject.electiveSelection;
    const namedElective = isElective(subject) && !isGenericElective(subject) && !subject.additionalElective;
    const key = selection?.source === 'catalog' ? electiveIdentity(selection)
      : !selection && namedElective ? electiveIdentity(subject) : `slot:${subject.id}`;
    if (!selection && namedElective && assigned.has(key)) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function matchesMatrixDiscipline(subject: ElectiveFields, identifier: string): boolean {
  return [subject.id, subject.code, subject.electiveSelection?.code, subject.electiveSelection?.subjectId]
    .some(value => !!value && normalizeMatrixText(value) === normalizeMatrixText(identifier));
}

export function electiveAlreadyAssigned(subjects: ElectiveFields[], selection: ElectiveSelection, editingId?: string): boolean {
  if (selection.source !== 'catalog') return false;
  const key = electiveIdentity(selection);
  return subjects.some(subject => subject.id !== editingId && (
    subject.electiveSelection?.source === 'catalog' && electiveIdentity(subject.electiveSelection) === key
    || !subject.electiveSelection && Number(subject.period) > 0 && isElective(subject) && !isGenericElective(subject)
      && electiveIdentity(subject) === key
  ));
}

/** Release hidden catalog nodes when their personal card is removed or reassigned. */
export function releaseElectiveSelection<T extends ElectiveFields & { status?: string; grade?: string }>(subjects: T[], editingId: string): T[] {
  const selection = subjects.find(subject => subject.id === editingId)?.electiveSelection;
  if (selection?.source !== 'catalog') return subjects;
  return subjects.map(subject => subject.id !== editingId && !subject.electiveSelection && isElective(subject)
    && !isGenericElective(subject) && electiveIdentity(subject) === electiveIdentity(selection)
    ? { ...subject, status: 'pendente', grade: '' } : subject);
}
