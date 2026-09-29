const isProfileId = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  !['optativa', 'sem perfil'].includes(value.trim().toLowerCase());

export function getCurricularProfileIds(curriculum: any): string[] {
  if (!curriculum) return [];

  const declared = Array.isArray(curriculum.profiles)
    ? curriculum.profiles.map((profile: any) => profile?.id || profile?.name)
    : [];
  const subjects = Array.isArray(curriculum)
    ? curriculum
    : Array.isArray(curriculum.subjects) ? curriculum.subjects : [];
  const values: unknown[] = declared.some(isProfileId)
    ? declared
    : subjects.map((subject: any) => subject?.profile);

  return Array.from(new Set(values.filter(isProfileId).map(value => value.trim()))).sort();
}
