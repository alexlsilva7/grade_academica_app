import type { Discipline } from '../types';

function subjectsFromCurriculum(curriculum: any): any[] {
  if (Array.isArray(curriculum)) return curriculum;
  if (Array.isArray(curriculum?.subjects)) return curriculum.subjects;
  if (Array.isArray(curriculum?.profiles)) return curriculum.profiles.flatMap((profile: any) => profile.subjects || []);
  return [];
}

function normalizeCode(code?: string): string {
  return code?.toUpperCase().replace(/([A-Z]+)0+([0-9]+)/, '$1$2') || '';
}

export function getDisciplineDetails(discipline: Discipline, curriculum: any, contents: any): { subjectDetails: any | null; contentDetails: any | null } {
  if (!discipline) return { subjectDetails: null, contentDetails: null };
  const subjects = subjectsFromCurriculum(curriculum);
  const subjectDetails = discipline.code
    ? subjects.find(subject => subject.code === discipline.code || subject.equivalences?.some((item: any) => item.code === discipline.code))
    : subjects.find(subject => (subject.name || '').toLowerCase() === (discipline.name || '').toLowerCase());
  const codes = [discipline.code, subjectDetails?.code, ...(subjectDetails?.equivalences || []).map((item: any) => item.code)]
    .filter((code): code is string => typeof code === 'string')
    .map(normalizeCode);
  const contentList = Array.isArray(contents?.disciplinas) ? contents.disciplinas : [];
  const contentDetails = contentList.find((item: any) => codes.includes(normalizeCode(item.codigo)))
    || contentList.find((item: any) => (item.nome || '').toLowerCase() === (discipline.name || '').toLowerCase())
    || null;
  return { subjectDetails: subjectDetails || null, contentDetails };
}

export function hasDisciplineDetails(discipline: Discipline, curriculum: any, contents: any): boolean {
  if (!discipline) return false;
  if ((discipline as any).desc || (discipline as any).ementa) return true;
  const { subjectDetails, contentDetails } = getDisciplineDetails(discipline, curriculum, contents);
  return !!(subjectDetails || contentDetails);
}
