import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  completionCourseKey, completionIdentity, migrateCompletedDisciplines, parseCompletionEntries,
  replaceCourseCompletions, replaceProfileCompletions, setDisciplineCompletion, subscribeToCompletions,
  type CompletionSubject
} from '../utils/disciplineCompletion';

const EMPTY_CATALOG: CompletionSubject[] = [];

export function useCompletedDisciplines(course: string | null, catalog: CompletionSubject[] = EMPTY_CATALOG) {
  const subscribe = useCallback((listener: () => void) => course ? subscribeToCompletions(course, listener) : () => {}, [course]);
  const getSnapshot = useCallback(() => course ? localStorage.getItem(completionCourseKey(course)) : null, [course]);
  const saved = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const completedDisciplines = useMemo(() => parseCompletionEntries(saved), [saved]);
  const identities = useMemo(() => new Set(completedDisciplines), [completedDisciplines]);

  useEffect(() => {
    if (course) migrateCompletedDisciplines(localStorage, course, catalog);
  }, [course, catalog, saved]);

  const isCompleted = useCallback((subject: CompletionSubject, profile?: string) => identities.has(completionIdentity(subject, profile)), [identities]);
  const setCompleted = useCallback((subject: CompletionSubject, completed: boolean, profile?: string) => {
    if (course) setDisciplineCompletion(localStorage, course, subject, completed, profile);
  }, [course]);
  const replaceProfile = useCallback((profile: string, subjects: CompletionSubject[], previousSubjects: CompletionSubject[] = []) => {
    if (course) replaceProfileCompletions(localStorage, course, profile, subjects, previousSubjects);
  }, [course]);
  const replaceAll = useCallback((entries: string[]) => {
    if (course) replaceCourseCompletions(localStorage, course, entries, catalog);
  }, [course, catalog]);

  return { completedDisciplines, ready: !!course && saved !== null, isCompleted, setCompleted, replaceProfile, replaceAll };
}
