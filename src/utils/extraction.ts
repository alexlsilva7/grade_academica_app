import type { CurriculumSubject, TreeSubjectNode } from '../types';
import type { PipelineConfig, PipelineStage } from './pipelineConfig';

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
