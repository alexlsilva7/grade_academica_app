import { CurriculumData, CurriculumProfile, CurriculumSubject, TreeSubjectNode } from '../types';

/** Catalog fields own subject content; graph fields own prerequisite links. */
export function syncCatalog(subjects: CurriculumSubject[], previousNodes: TreeSubjectNode[]) {
  const used = new Set<string>();
  const pairs = subjects.map((subject, index) => {
    const matches = previousNodes.filter(node => subject.id
      ? node.id === subject.id
      : !!subject.code && node.code === subject.code && (node.profile || '') === (subject.profile || ''));
    if (matches.length > 1) throw new Error(`Correspondência ambígua para ${subject.code || subject.name}. Revise os identificadores.`);
    const previous = matches[0];
    const baseId = subject.id || previous?.id || `subject_${encodeURIComponent(subject.profile || 'default')}_${encodeURIComponent(subject.code || String(index))}`;
    if (used.has(baseId)) throw new Error(`Identificador duplicado: ${baseId}. Revise os perfis e códigos.`);
    used.add(baseId);
    const normalized = { ...subject, id: baseId };
    const node: TreeSubjectNode = {
      ...previous, id: baseId, code: subject.code, name: subject.name,
      profile: subject.profile, period: subject.period == null || subject.period === '' ? null : subject.period === 'Optativa' ? 0 : Number(subject.period),
      hours: subject.workload?.total ?? null, workload: subject.workload,
      academicType: subject.type, type: previous?.type || (subject.type?.toLowerCase().includes('optativa') ? 'optativa' : 'outros'),
      credits: subject.credits, desc: subject.ementa, prereqs: previous?.prereqs ?? null,
      corequisites: subject.corequisites, evidence: subject.evidence,
    };
    return { subject: normalized, node, previous };
  });
  for (const pair of pairs) {
    if (pair.previous && pair.previous.prereqs != null) continue;
    pair.node.prereqs = pair.subject.prerequisites?.map(ref => {
      if (ref.id) return ref.id;
      const matches = pairs.filter(candidate => candidate.subject.profile === pair.subject.profile && !!ref.code && candidate.subject.code === ref.code);
      return matches.length === 1 ? matches[0].node.id : ref.code || ref.name || '';
    }) ?? null;
  }
  return { subjects: pairs.map(pair => ({ ...pair.subject, prerequisites: pair.node.prereqs?.map(id => {
    const target = pairs.find(candidate => candidate.node.id === id)?.node;
    return { id, code: target?.code || null, name: target?.name || null };
  }) ?? null })), nodes: pairs.map(pair => pair.node) };
}

export function hydrateCurriculum(data?: CurriculumData | CurriculumSubject[] | null) {
  const curriculum = Array.isArray(data) ? { subjects: data } : data;
  const profiles = curriculum?.profiles || [];
  const nodes = curriculum?.treeSubjects?.length ? curriculum.treeSubjects : profiles.flatMap(profile =>
    (profile.subjects || []).map(node => ({ ...node, profile: node.profile || profile.id })));
  const subjects = [...(curriculum?.subjects || [])];
  for (const node of nodes) {
    if (!subjects.some(subject => subject.id === node.id || (!subject.id && subject.code === node.code && subject.profile === node.profile))) {
      subjects.push({ id: node.id, code: node.code || null, name: node.name, profile: node.profile,
        period: node.period, type: node.academicType || (node.type === 'optativa' ? 'Optativa' : null),
        credits: node.credits, workload: node.workload || { teorica: null, pratica: null, extensao: null, total: node.hours },
        ementa: node.desc || null, prerequisites: node.prereqs?.map(id => {
          const target = nodes.find(candidate => candidate.id === id);
          return { id, code: target?.code || null, name: target?.name || null };
        }) ?? null,
      });
    }
  }
  return { ...syncCatalog(subjects, nodes), profiles };
}

export function serializeCurriculum(subjects: CurriculumSubject[], nodes: TreeSubjectNode[], profiles: CurriculumProfile[]) {
  return { subjects, treeSubjects: nodes, profiles: profiles.map(profile => ({ ...profile, subjects: nodes.filter(node => node.profile === profile.id) })) };
}

export function dependentNodes(nodes: TreeSubjectNode[], removedIds: Set<string>) {
  return nodes.filter(node => !removedIds.has(node.id) && node.prereqs?.some(id => removedIds.has(id)));
}
