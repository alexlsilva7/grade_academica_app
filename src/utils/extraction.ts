import type { CurriculumSubject, Discipline, Prerequisite, TreeSubjectNode } from '../types.js';
import type { PipelineConfig, PipelineStage } from './pipelineConfig.js';

export interface Evidence {
  field: string;
  file: string;
  page: number | null;
  excerpt: string;
  /** True only when the excerpt was matched against source text locally. */
  verified?: boolean;
  verificationScore?: number;
}
export interface ExtractionIssue {
  severity: 'error' | 'warning';
  record: string;
  field: string;
  message: string;
}
export interface ExtractionReport {
  issues: ExtractionIssue[];
  sources: string[];
  stages: string[];
  pipeline?: PipelineConfig;
  calls?: Array<{ stage: PipelineStage | 'extraction'; model: string; attempt: number; durationMs: number; status: string }>;
  metadataEvidence?: Evidence[];
  coverage?: ExtractionCoverage;
}

export interface ExtractionCoverage {
  totalPages: number;
  inspectedPages: number[];
  relevantPages: number[];
  extractedPages: number[];
  unprocessedPages: number[];
}

export function normalizeAcademicName(value: string | null | undefined): string {
  return (value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[‐-‒–—-]/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ').trim();
}

export function relationKey(relation: { code?: string | null; name?: string | null }): string {
  return relation.code ? `code:${relation.code.trim().toLowerCase()}` : `name:${normalizeAcademicName(relation.name)}`;
}

export function normalizeAcademicType(value: string | null | undefined): string | null {
  const normalized = normalizeAcademicName(value);
  if (normalized === 'obrigatoria' || normalized === 'obrigatorio') return 'Obrigatória';
  if (normalized === 'optativa' || normalized === 'optativo') return 'Optativa';
  return value || null;
}

// IDs are application identifiers, never substitutes for official academic codes.
export function treeToCurriculum(nodes: TreeSubjectNode[], profile: string | null): CurriculumSubject[] {
  return nodes.map(node => ({
    id: node.id, code: node.code ?? null, name: node.name,
    type: node.academicType ?? (node.type === 'optativa' ? 'Optativa' : null),
    period: node.period == null ? null : node.period === 0 ? 'Optativa' : String(node.period),
    profile: node.profile ?? profile, credits: node.credits ?? null,
    courseName: node.courseName, semester: node.semester, classGroup: node.classGroup,
    workload: { teorica: node.workload?.teorica ?? null, pratica: node.workload?.pratica ?? null,
      extensao: node.workload?.extensao ?? null, semipresencialEad: node.workload?.semipresencialEad ?? null, total: node.hours ?? null },
    prerequisites: node.prereqs === null ? null : (node.prereqs || []).map(id => {
      const target = nodes.find(n => n.id === id);
      return { code: target?.code ?? null, name: target?.name ?? null, id };
    }),
    corequisites: node.corequisites ?? null, equivalences: node.equivalences ?? null, ementa: node.desc ?? null,
    evidence: node.evidence,
  }));
}

export interface MergeResult<T> {
  result: T[];
  added: number;
  updated: number;
}

export interface CourseHours {
  totalHours: number | null;
  acexHours: number | null;
  accHours: number | null;
}

export function mergeCourseHours<T extends CourseHours & { requisitos?: {
  total?: number;
  acex_extensao?: number;
  acc_complementar?: number;
  [key: string]: unknown;
} }>(existing: T, incoming: Partial<CourseHours>): T {
  return {
    ...existing,
    totalHours: incoming.totalHours ?? existing.totalHours,
    acexHours: incoming.acexHours ?? existing.acexHours,
    accHours: incoming.accHours ?? existing.accHours,
    ...(existing.requisitos ? { requisitos: {
      ...existing.requisitos,
      ...(incoming.totalHours != null ? { total: incoming.totalHours } : {}),
      ...(incoming.acexHours != null ? { acex_extensao: incoming.acexHours } : {}),
      ...(incoming.accHours != null ? { acc_complementar: incoming.accHours } : {})
    } } : {})
  };
}

function cloneEvidence<T extends { evidence?: Evidence[] }>(item: T): T {
  return { ...item, evidence: item.evidence?.map(evidence => ({ ...evidence })) };
}

function mergeEvidence<T extends { evidence?: Evidence[] }>(target: T, incoming: T): Evidence[] | undefined {
  const evidence = [...(target.evidence || []), ...(incoming.evidence || [])];
  const unique = new Map<string, Evidence>();
  for (const item of evidence) {
    const key = JSON.stringify([item.field, item.file, item.page, item.excerpt, item.verified, item.verificationScore]);
    if (!unique.has(key)) unique.set(key, item);
  }
  return unique.size ? [...unique.values()] : undefined;
}

function nextAvailableId(prefix: string, requestedId: string | undefined, usedIds: Set<string>): string {
  if (requestedId && !requestedId.startsWith(prefix) && !usedIds.has(requestedId)) {
    usedIds.add(requestedId);
    return requestedId;
  }
  let index = 1;
  while (usedIds.has(`${prefix}${index}`)) index++;
  const id = `${prefix}${index}`;
  usedIds.add(id);
  return id;
}

function mergePrerequisiteLists<T extends { code?: string | null; name?: string | null; id?: string; targetProfile?: string }>(
  existing: T[] | null | undefined,
  incoming: T[] | null | undefined
): T[] | null | undefined {
  if (incoming == null || incoming.length === 0) return existing;
  if (existing == null) return incoming.map(item => ({ ...item }));
  const merged = new Map<string, T>();
  for (const item of [...existing, ...incoming]) {
    const baseKey = item.code?.trim()
      ? `code:${item.code.trim().toLowerCase()}`
      : item.name?.trim()
        ? `name:${normalizeAcademicName(item.name)}`
        : item.id ? `id:${item.id}` : JSON.stringify(item);
    const key = item.targetProfile ? `${baseKey}|profile:${item.targetProfile.trim().toLowerCase()}` : baseKey;
    const previous = merged.get(key);
    merged.set(key, previous ? {
      ...previous,
      code: previous.code || item.code,
      name: previous.name || item.name,
      id: previous.id || item.id,
      targetProfile: previous.targetProfile || item.targetProfile
    } as T : { ...item });
  }
  return [...merged.values()];
}

function sameOptionalIdentity(left: string | null | undefined, right: string | null | undefined): boolean {
  return !left || !right || left.trim().toLowerCase() === right.trim().toLowerCase();
}

function findUniqueMatch<T>(items: T[], predicate: (item: T) => boolean): number {
  const matches: number[] = [];
  items.forEach((item, index) => { if (predicate(item)) matches.push(index); });
  return matches.length === 1 ? matches[0] : -1;
}

export function mergeCurriculumList(
  existing: CurriculumSubject[],
  incoming: CurriculumSubject[]
): MergeResult<CurriculumSubject> {
  const result: CurriculumSubject[] = existing.map(item => ({
    ...cloneEvidence(item),
    workload: { ...item.workload },
    prerequisites: item.prerequisites?.map(relation => ({ ...relation })) ?? item.prerequisites,
    corequisites: item.corequisites?.map(relation => ({ ...relation })) ?? item.corequisites,
    equivalences: item.equivalences?.map(relation => ({ ...relation })) ?? item.equivalences
  }));
  const usedIds = new Set(result.map(item => item.id).filter((id): id is string => Boolean(id)));
  let added = 0;
  let updated = 0;

  for (const item of incoming) {
    const code = item.code?.trim().toLowerCase();
    const profile = item.profile?.trim().toLowerCase();
    const normalizedName = normalizeAcademicName(item.name);
    let matchIdx = -1;
    if (item.id && !item.id.startsWith('disciplina_')) {
      matchIdx = result.findIndex(target => target.id === item.id);
    }
    if (matchIdx < 0 && code) {
      matchIdx = result.findIndex(target =>
        target.code?.trim().toLowerCase() === code && sameOptionalIdentity(target.profile, profile));
    }
    if (matchIdx < 0 && normalizedName) {
      matchIdx = result.findIndex(target => normalizeAcademicName(target.name) === normalizedName &&
        sameOptionalIdentity(target.profile, profile));
    }

    if (matchIdx < 0) {
      const id = nextAvailableId('disciplina_', item.id, usedIds);
      result.push({
        ...cloneEvidence(item),
        id,
        workload: { ...item.workload },
        prerequisites: item.prerequisites?.map(relation => ({ ...relation })) ?? item.prerequisites,
        corequisites: item.corequisites?.map(relation => ({ ...relation })) ?? item.corequisites,
        equivalences: item.equivalences?.map(relation => ({ ...relation })) ?? item.equivalences
      });
      added++;
      continue;
    }

    const target = result[matchIdx];
    result[matchIdx] = {
      ...target,
      id: target.id || nextAvailableId('disciplina_', item.id, usedIds),
      code: item.code?.trim() || target.code,
      name: item.name?.trim() && item.name.trim().length > 2 && !/^disciplina\s/i.test(item.name.trim()) ? item.name.trim() : target.name,
      type: item.type?.trim() || target.type,
      period: item.period !== null && item.period !== undefined && String(item.period).trim() ? item.period : target.period,
      profile: item.profile?.trim() || target.profile,
      courseName: item.courseName || target.courseName,
      semester: item.semester || target.semester,
      classGroup: item.classGroup || target.classGroup,
      credits: typeof item.credits === 'number' && item.credits > 0 ? item.credits : target.credits,
      workload: {
        teorica: item.workload?.teorica ?? target.workload?.teorica ?? null,
        pratica: item.workload?.pratica ?? target.workload?.pratica ?? null,
        extensao: item.workload?.extensao ?? target.workload?.extensao ?? null,
        semipresencialEad: item.workload?.semipresencialEad ?? target.workload?.semipresencialEad ?? null,
        total: item.workload?.total ?? target.workload?.total ?? null
      },
      prerequisites: mergePrerequisiteLists(target.prerequisites, item.prerequisites),
      corequisites: mergePrerequisiteLists(target.corequisites, item.corequisites),
      equivalences: mergePrerequisiteLists(target.equivalences, item.equivalences),
      ementa: item.ementa?.trim() || target.ementa,
      evidence: mergeEvidence(target, item)
    };
    updated++;
  }

  return { result, added, updated };
}

export function mergeScheduleList(
  existing: Discipline[],
  incoming: Discipline[]
): MergeResult<Discipline> {
  const result: Discipline[] = existing.map(item => ({ ...cloneEvidence(item), sessions: item.sessions.map(session => ({ ...session })) }));
  const usedIds = new Set(result.map(item => item.id));
  let added = 0;
  let updated = 0;

  for (const item of incoming) {
    const code = item.code?.trim().toLowerCase();
    const classGroup = item.classGroup?.trim().toLowerCase();
    const profile = item.profile?.trim().toLowerCase();
    const normalizedName = normalizeAcademicName(item.name);
    const sameScheduleContext = (target: Discipline) =>
      sameOptionalIdentity(target.profile, profile) &&
      sameOptionalIdentity(target.semester, item.semester) &&
      sameOptionalIdentity(target.courseName, item.courseName);
    let matchIdx = -1;
    if (item.id && !item.id.startsWith('turma_')) {
      matchIdx = result.findIndex(target => target.id === item.id);
    }
    if (matchIdx < 0 && code) {
      matchIdx = findUniqueMatch(result, target => {
        if (target.code?.trim().toLowerCase() !== code || !sameScheduleContext(target)) return false;
        const targetGroup = target.classGroup?.trim().toLowerCase();
        if (classGroup || targetGroup) return classGroup === targetGroup;
        return normalizeAcademicName(target.name) === normalizedName;
      });
    }
    if (matchIdx < 0 && normalizedName) {
      matchIdx = findUniqueMatch(result, target => normalizeAcademicName(target.name) === normalizedName &&
        (item.period == null || target.period == null || item.period === target.period) &&
        (!(classGroup || target.classGroup) || classGroup === target.classGroup?.trim().toLowerCase()) &&
        sameScheduleContext(target));
    }

    if (matchIdx < 0) {
      result.push({ ...cloneEvidence(item), id: nextAvailableId('turma_', item.id, usedIds), sessions: item.sessions.map(session => ({ ...session })) });
      added++;
      continue;
    }

    const target = result[matchIdx];
    const sessions = [...target.sessions];
    const sessionKeys = new Set(sessions.map(session => `${session.day}/${session.time.trim().replace(/\s+/g, ' ')}`));
    for (const session of item.sessions || []) {
      const key = `${session.day}/${session.time.trim().replace(/\s+/g, ' ')}`;
      if (!sessionKeys.has(key)) {
        sessions.push({ ...session });
        sessionKeys.add(key);
      }
    }
    const incomingProfessor = item.professor?.trim();
    result[matchIdx] = {
      ...target,
      code: item.code?.trim() || target.code,
      name: item.name?.trim() && item.name.trim().length > 2 && !/^turma\s/i.test(item.name.trim()) ? item.name.trim() : target.name,
      professor: incomingProfessor && incomingProfessor !== '-' ? incomingProfessor : target.professor,
      period: item.period ?? target.period,
      profile: item.profile?.trim() || target.profile,
      semester: item.semester || target.semester,
      courseName: item.courseName || target.courseName,
      classGroup: item.classGroup || target.classGroup,
      sessions,
      evidence: mergeEvidence(target, item)
    };
    updated++;
  }
  return { result, added, updated };
}

export function mergeTreeNodesList(
  existing: TreeSubjectNode[],
  incoming: TreeSubjectNode[]
): MergeResult<TreeSubjectNode> {
  const result: TreeSubjectNode[] = existing.map(item => ({
    ...cloneEvidence(item),
    prereqs: item.prereqs ? [...item.prereqs] : item.prereqs,
    workload: item.workload ? { ...item.workload } : item.workload,
    corequisites: item.corequisites?.map(relation => ({ ...relation })) ?? item.corequisites,
    equivalences: item.equivalences?.map(relation => ({ ...relation })) ?? item.equivalences
  }));
  const usedIds = new Set(result.map(item => item.id));
  const inputIds: string[] = [];
  const wasExisting: boolean[] = [];
  let added = 0;
  let updated = 0;

  // Reserve canonical IDs first so prerequisite references from anywhere in a batch can be remapped.
  for (const item of incoming) {
    const code = item.code?.trim().toLowerCase();
    const profile = item.profile?.trim().toLowerCase();
    const normalizedName = normalizeAcademicName(item.name);
    let matchIdx = -1;
    if (item.id && !item.id.startsWith('no_')) matchIdx = result.findIndex(target => target.id === item.id);
    if (matchIdx < 0 && code) {
      matchIdx = findUniqueMatch(result, target => target.code?.trim().toLowerCase() === code && sameOptionalIdentity(target.profile, profile));
    }
    if (matchIdx < 0 && normalizedName) {
      matchIdx = findUniqueMatch(result, target => normalizeAcademicName(target.name) === normalizedName && sameOptionalIdentity(target.profile, profile));
    }
    if (matchIdx >= 0) {
      inputIds.push(result[matchIdx].id);
      wasExisting.push(true);
    } else {
      const id = nextAvailableId('no_', item.id, usedIds);
      result.push({ ...cloneEvidence(item), id, prereqs: [], workload: item.workload ? { ...item.workload } : item.workload });
      inputIds.push(id);
      wasExisting.push(false);
      added++;
    }
  }

  const aliases = new Map<string, string>();
  const codes = new Map<string, string>();
  const names = new Map<string, string>();
  incoming.forEach((item, index) => {
    if (item.id && !aliases.has(item.id)) aliases.set(item.id, inputIds[index]);
    if (item.code?.trim()) codes.set(item.code.trim().toLowerCase(), inputIds[index]);
    const name = normalizeAcademicName(item.name);
    if (name && !names.has(name)) names.set(name, inputIds[index]);
  });
  const existingIds = new Set(result.map(item => item.id));
  const existingCodes = new Map(result.filter(item => item.code?.trim()).map(item => [item.code!.trim().toLowerCase(), item.id]));
  const existingNames = new Map(result.map(item => [normalizeAcademicName(item.name), item.id]));
  const resolvePrerequisite = (reference: string): string => {
    const value = reference.trim();
    const normalized = normalizeAcademicName(value);
    return aliases.get(value) || codes.get(value.toLowerCase()) || names.get(normalized) ||
      (existingIds.has(value) ? value : '') || existingCodes.get(value.toLowerCase()) || existingNames.get(normalized) || value;
  };

  incoming.forEach((item, index) => {
    const targetIndex = result.findIndex(target => target.id === inputIds[index]);
    const target = result[targetIndex];
    const incomingPrereqs = (item.prereqs || []).map(resolvePrerequisite);
    const prereqs = [...new Set([...(target.prereqs || []), ...incomingPrereqs])];
    result[targetIndex] = {
      ...target,
      code: item.code?.trim() || target.code,
      name: item.name?.trim() && item.name.trim().length > 2 && !/^disciplina\s/i.test(item.name.trim()) ? item.name.trim() : target.name,
      period: item.period ?? target.period,
      hours: item.hours ?? target.hours,
      credits: item.credits ?? target.credits,
      type: item.type?.trim() || target.type,
      academicType: item.academicType?.trim() || target.academicType,
      profile: item.profile?.trim() || target.profile,
      courseName: item.courseName || target.courseName,
      semester: item.semester || target.semester,
      classGroup: item.classGroup || target.classGroup,
      workload: item.workload ? {
        teorica: item.workload.teorica ?? target.workload?.teorica ?? null,
        pratica: item.workload.pratica ?? target.workload?.pratica ?? null,
        extensao: item.workload.extensao ?? target.workload?.extensao ?? null,
        semipresencialEad: item.workload.semipresencialEad ?? target.workload?.semipresencialEad ?? null,
        total: item.workload.total ?? target.workload?.total ?? null
      } : target.workload,
      prereqs,
      corequisites: mergePrerequisiteLists(target.corequisites, item.corequisites),
      equivalences: mergePrerequisiteLists(target.equivalences, item.equivalences),
      desc: item.desc?.trim() || target.desc,
      evidence: mergeEvidence(target, item)
    };
    if (wasExisting[index]) updated++;
  });
  return { result, added, updated };
}

export function validateExtraction(records: any[], mode: 'schedule' | 'linear' | 'tree'): ExtractionIssue[] {
  const issues: ExtractionIssue[] = [];
  const add = (r: any, field: string, message: string, severity: 'error' | 'warning' = 'error') =>
    issues.push({ record: r.id || r.name || 'Registro', field, message, severity });
  const ids = new Set<string>();
  const identities = new Set<string>();
  const courseNames = new Set(records.map(r => r.courseName).filter(Boolean));
  if (courseNames.size > 1) add({}, 'courseName', 'Há cursos diferentes na importação; separe os documentos antes de salvar.');
  const semesters = new Set(records.map(r => r.semester).filter(Boolean));
  if (mode === 'schedule' && semesters.size > 1) add({}, 'semester', 'Há semestres diferentes na importação; separe as grades antes de salvar.');
  for (const r of records) {
    if ((mode !== 'linear' && !r.id) || (r.id && ids.has(r.id))) add(r, 'id', 'Identificador ausente ou repetido.');
    if (r.id) ids.add(r.id);
    if (!r.name) add(r, 'name', 'Nome da disciplina ausente.');
    for (const field of mode === 'schedule' ? ['code', 'period', 'professor'] : ['code', 'period']) {
      if (r[field] == null) add(r, field, 'Informação não encontrada na fonte.', 'warning');
    }
    const identity = JSON.stringify([r.courseName, r.profile, r.semester, r.code || r.name, r.classGroup]);
    if (identities.has(identity)) add(r, 'code', 'Possível duplicata; confira curso, perfil, semestre e turma.', 'warning');
    identities.add(identity);
    const isElectivePeriod = typeof r.period === 'string' && ['optativa', 'optativo', 'eletiva', 'eletivo'].includes(normalizeAcademicName(r.period));
    if (r.period != null && !isElectivePeriod && (!/^\d+$/.test(String(r.period)) || Number(r.period) < 0))
      add(r, 'period', 'Período inválido.');
    if (mode === 'schedule') {
      if (!Array.isArray(r.sessions) || !r.sessions.length) add(r, 'sessions', 'Nenhuma sessão de aula confirmada.');
      const slots = new Set<string>();
      for (const s of Array.isArray(r.sessions) ? r.sessions : []) {
        if (!Number.isInteger(s.day) || s.day < 1 || s.day > 6) add(r, 'sessions', 'Dia deve estar entre segunda e sábado (1–6).');
        const match = /^(\d{2}):(\d{2}) - (\d{2}):(\d{2})$/.exec(s.time || '');
        if (!match || +match[1] > 23 || +match[3] > 23 || +match[2] > 59 || +match[4] > 59 ||
          +match[1] * 60 + +match[2] >= +match[3] * 60 + +match[4]) add(r, 'sessions', 'Horário inválido ou término anterior ao início.');
        const key = `${s.day}/${s.time}`;
        if (slots.has(key)) add(r, 'sessions', 'Sessão repetida.', 'warning');
        slots.add(key);
      }
    } else {
      if (r.type != null && mode === 'linear') {
        const normType = normalizeAcademicType(r.type);
        if (!normType || !['Obrigatória', 'Optativa'].includes(normType)) add(r, 'type', 'Tipo acadêmico inválido.');
      }
      if ((mode === 'tree' ? r.prereqs : r.prerequisites) == null) add(r, 'prerequisites', 'Pré-requisitos não informados.', 'warning');
      const w = r.workload;
      const total = mode === 'tree' ? r.hours : w?.total;
      if (total == null) add(r, 'workload', 'Carga horária total não informada.', 'warning');
      for (const [key, value] of Object.entries({ ...w, total, credits: r.credits })) {
        if (value != null && (!Number.isInteger(value) || Number(value) < 0)) add(r, key, 'Esperado inteiro não negativo.');
      }
      // Extension may be included in other components: flag, never rewrite the source.
      const components = [w?.teorica, w?.pratica, w?.extensao, w?.semipresencialEad];
      if (w && total != null && components.every(v => typeof v === 'number') &&
        components.reduce((sum, value) => sum + Number(value), 0) !== total)
        add(r, 'workload', 'Soma das componentes difere do total; confira a regra do PPC.', 'warning');
    }
  }
  if (mode === 'tree') {
    const byId = new Map(records.map(r => [r.id, r]));
    const visiting = new Set<string>(), visited = new Set<string>();
    const visit = (r: any) => {
      if (visiting.has(r.id)) { add(r, 'prereqs', 'Ciclo detectado no grafo de pré-requisitos.'); return; }
      if (visited.has(r.id)) return;
      visiting.add(r.id);
      for (const id of r.prereqs || []) {
        if (!byId.has(id)) add(r, 'prereqs', `Pré-requisito inexistente: ${id}.`);
        else visit(byId.get(id));
      }
      visiting.delete(r.id); visited.add(r.id);
    };
    records.forEach(visit);
  } else if (mode === 'linear') {
    for (const r of records) for (const p of r.prerequisites || []) {
      if ((p.code && r.code && p.code.trim().toLowerCase() === r.code.trim().toLowerCase()) ||
        (!p.code && p.name && normalizeAcademicName(p.name) === normalizeAcademicName(r.name)))
        add(r, 'prerequisites', 'Disciplina aparece como pré-requisito dela mesma.');
      if (!records.some(other => other.profile === r.profile &&
        ((p.code && other.code && p.code.trim().toLowerCase() === other.code.trim().toLowerCase()) ||
          (!p.code && p.name && normalizeAcademicName(p.name) === normalizeAcademicName(other.name)))))
        add(r, 'prerequisites', `Pré-requisito não localizado no catálogo: ${p.code || p.name || '?'}.`, 'warning');
    }
  }
  return issues;
}
