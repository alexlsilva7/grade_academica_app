export interface ImportChange { field: string; before: unknown; after: unknown }
export interface ImportDifference { label: string; kind: 'Inclusão' | 'Alteração' | 'Remoção'; before: unknown; after: unknown }
export function importDifferences(changes: ImportChange[]): ImportDifference[] {
  const labels: Record<string, string> = { disciplines: 'Turmas', curriculumSubjects: 'Disciplinas', extractedTreeSubjects: 'Estrutura', courseProfiles: 'Perfis', courseRequirements: 'Requisitos', courseName: 'Nome do curso', courseShortName: 'Sigla' };
  return changes.flatMap(({ field, before, after }) => {
    if (!Array.isArray(before) || !Array.isArray(after)) return [{ label: labels[field] || field, kind: 'Alteração' as const, before, after }];
    const key = (record: any) => record.id || `${record.profile || ''}:${record.code || record.name}`;
    const previous = new Map(before.map(record => [key(record), record]));
    const next = new Map(after.map(record => [key(record), record]));
    return [...new Set([...previous.keys(), ...next.keys()])].flatMap(id => {
      const oldRecord = previous.get(id), newRecord = next.get(id);
      if (JSON.stringify(oldRecord) === JSON.stringify(newRecord)) return [];
      return [{ label: `${labels[field] || field} · ${newRecord?.name || oldRecord?.name || id}`, kind: !oldRecord ? 'Inclusão' as const : !newRecord ? 'Remoção' as const : 'Alteração' as const, before: oldRecord, after: newRecord }];
    });
  });
}
