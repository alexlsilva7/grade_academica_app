import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { validateExtraction } from '../utils/extraction.js';
import type { CourseMeta } from '../types.js';
import { FileAcademicRepository, RepositoryError } from './academicRepository.js';

export type MigrationKind = 'course' | 'curriculum' | 'contents' | 'schedule';
export type MigrationSourceItem = {
  key: string;
  courseId: string;
  courseName: string;
  kind: MigrationKind;
  semester?: string;
  sourceFile: string;
  checksum: string;
  data: any;
  records: number;
  parseError?: string;
};
export type MissingMigrationSource = { courseId: string; courseName: string; kind: 'curriculum' | 'schedule'; semester?: string; expectedFile: string };
export type MigrationInventory = { items: MigrationSourceItem[]; missing: MissingMigrationSource[]; ignoredFiles: string[]; sourceDirectory: string };
export type MigrationPreviewItem = {
  key: string;
  courseId: string;
  courseName: string;
  kind: MigrationKind;
  semester?: string;
  sourceFile: string;
  records: number;
  status: 'new' | 'identical' | 'different' | 'invalid';
  destinationRecords: number;
  destinationChecksum: string;
  selected: boolean;
  overwrite: boolean;
  canImport: boolean;
  problems: string[];
  warnings: string[];
  changes: Array<{ path: string; before: string; after: string }>;
};
export type MigrationPreview = {
  ready: boolean;
  fingerprint: string;
  items: MigrationPreviewItem[];
  missing: MissingMigrationSource[];
  errors: string[];
  selectedCourseIds: string[];
};

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

function equalJson(a: any, b: any): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

function snapshotChecksum(value: any): string {
  return sha256(JSON.stringify(canonical(value ?? null)));
}

function recordCount(kind: MigrationKind, data: any): number {
  if (kind === 'course') return 1;
  if (kind === 'schedule') return Array.isArray(data?.data) ? data.data.length : 0;
  if (kind === 'contents') return Array.isArray(data?.disciplinas) ? data.disciplinas.length : 0;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.subjects)) return data.subjects.length;
  if (Array.isArray(data?.profiles)) return data.profiles.reduce((sum: number, profile: any) => sum + (Array.isArray(profile.subjects) ? profile.subjects.length : 0), 0);
  return 0;
}

function relativeSource(root: string, absolute: string): string {
  return path.relative(root, absolute).replace(/\\/g, '/');
}

function readJsonItem(root: string, course: CourseMeta, kind: MigrationKind, semester: string | undefined, filename: string, absolutePath: string): MigrationSourceItem {
  const raw = fs.readFileSync(absolutePath);
  let checksumInput: Buffer | string = raw;
  let data: any = null;
  let parseError: string | undefined;
  try { data = JSON.parse(raw.toString('utf-8')); }
  catch (error) { parseError = (error as Error).message; }

  if (kind === 'schedule' && !parseError) {
    const reportPath = path.join(path.dirname(absolutePath), `extracao_${path.basename(absolutePath)}`);
    let extraction: any = null;
    if (fs.existsSync(reportPath)) {
      try {
        const reportRaw = fs.readFileSync(reportPath);
        extraction = JSON.parse(reportRaw.toString('utf-8'));
        checksumInput = Buffer.concat([raw, Buffer.from('\0extracao\0'), reportRaw]);
      }
      catch (error) { parseError = `Relatório de extração inválido: ${(error as Error).message}`; }
    }
    data = { data, extraction };
  }

  const key = kind === 'schedule' ? `schedule:${course.id}:${semester}` : `${kind}:${course.id}`;
  return {
    key,
    courseId: course.id,
    courseName: course.name,
    kind,
    semester,
    sourceFile: relativeSource(root, absolutePath),
    checksum: sha256(checksumInput),
    data,
    records: recordCount(kind, data),
    parseError
  };
}

function courseFolder(root: string, course: CourseMeta): string {
  const aliases = course.id === 'eal' ? ['eal', 'engenharia-de-alimentos']
    : course.id === 'medicina-veterinaria' ? ['medicina-veterinaria', 'mvet'] : [course.id];
  const candidates = aliases.map(alias => path.join(root, alias));
  return candidates.find(candidate => fs.existsSync(candidate)) || candidates[0];
}

export function discoverMigrationInventory(repository: FileAcademicRepository): MigrationInventory {
  const root = repository.dataDir;
  const courses = repository.readRegistry();
  const items: MigrationSourceItem[] = [];
  const missing: MissingMigrationSource[] = [];
  const ignoredFiles: string[] = [];

  for (const course of courses) {
    const directory = courseFolder(root, course);
    const files = fs.existsSync(directory) ? fs.readdirSync(directory).sort() : [];
    const registryPath = repository.registryPath;
    items.push({
      key: `course:${course.id}`,
      courseId: course.id,
      courseName: course.name,
      kind: 'course',
      sourceFile: relativeSource(root, registryPath),
      checksum: sha256(fs.readFileSync(registryPath)),
      data: course,
      records: 1
    });

    const curriculumFiles = files.filter(file => file.startsWith('curriculo_') && file.endsWith('.json'));
    if (!curriculumFiles.length && course.hasCurriculum) {
      missing.push({ courseId: course.id, courseName: course.name, kind: 'curriculum', expectedFile: `curriculo_${course.id}.json` });
    } else if (curriculumFiles.length) {
      items.push(readJsonItem(root, course, 'curriculum', undefined, curriculumFiles[0], path.join(directory, curriculumFiles[0])));
      for (const extra of curriculumFiles.slice(1)) ignoredFiles.push(relativeSource(root, path.join(directory, extra)));
    }

    const schedules = new Map<string, string>();
    for (const file of files) {
      const match = file.match(/^horario_[a-z0-9_-]+_(\d{4}_\d)\.json$/);
      if (match) schedules.set(match[1].replace('_', '.'), file);
    }
    if (course.hasSchedule) {
      const expected = course.semesters?.length ? course.semesters : Array.from(schedules.keys());
      for (const semester of expected) {
        const filename = schedules.get(semester);
        if (!filename) {
          missing.push({ courseId: course.id, courseName: course.name, kind: 'schedule', semester, expectedFile: `horario_${course.id}_${semester.replace('.', '_')}.json` });
          continue;
        }
        items.push(readJsonItem(root, course, 'schedule', semester, filename, path.join(directory, filename)));
        schedules.delete(semester);
      }
    }
    for (const [semester, filename] of schedules) {
      items.push(readJsonItem(root, course, 'schedule', semester, filename, path.join(directory, filename)));
    }

    const contentFiles = files.filter(file => file.startsWith('conteudos_') && file.endsWith('.json'));
    if (contentFiles.length) {
      items.push(readJsonItem(root, course, 'contents', undefined, contentFiles[0], path.join(directory, contentFiles[0])));
      for (const extra of contentFiles.slice(1)) ignoredFiles.push(relativeSource(root, path.join(directory, extra)));
    }

    for (const file of files) {
      if (!/^(curriculo_|conteudos_|horario_|extracao_)/.test(file)) ignoredFiles.push(relativeSource(root, path.join(directory, file)));
    }
  }

  return { items, missing, ignoredFiles, sourceDirectory: path.basename(root) === 'data' ? 'src/data' : 'ACADEMIC_DATA_DIR' };
}

function subjectsOf(curriculum: any): any[] {
  if (Array.isArray(curriculum)) return curriculum;
  if (Array.isArray(curriculum?.subjects)) return curriculum.subjects;
  return [];
}

function validateItem(item: MigrationSourceItem): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (item.parseError) errors.push(item.parseError);
  if (item.parseError) return { errors, warnings };

  if (item.kind === 'course') {
    if (!item.data?.id || item.data.id !== item.courseId || !item.data.name || !item.data.shortName) errors.push('Metadados do curso não contêm id, nome e sigla válidos.');
  } else if (item.kind === 'schedule') {
    const schedule = item.data?.data;
    if (!Array.isArray(schedule) || !schedule.length) errors.push('A oferta precisa conter ao menos uma turma.');
    else errors.push(...validateExtraction(schedule, 'schedule').filter(issue => issue.severity === 'error').map(issue => issue.message));
  } else if (item.kind === 'curriculum') {
    const subjects = subjectsOf(item.data);
    if (!subjects.length) errors.push('O currículo não contém disciplinas.');
    else errors.push(...validateExtraction(subjects, 'linear').filter(issue => issue.severity === 'error').map(issue => issue.message));
    if (Array.isArray(item.data?.treeSubjects)) errors.push(...validateExtraction(item.data.treeSubjects, 'tree').filter(issue => issue.severity === 'error').map(issue => issue.message));
    if (!Array.isArray(item.data?.treeSubjects) && Array.isArray(item.data?.profiles)) {
      for (const profile of item.data.profiles) {
        if (Array.isArray(profile.subjects)) errors.push(...validateExtraction(profile.subjects, 'tree').filter(issue => issue.severity === 'error').map(issue => `${profile.id}: ${issue.message}`));
      }
    }
    const codes = new Set(subjects.map(subject => String(subject.code || '').trim().toUpperCase()).filter(Boolean));
    const refs: Array<{ record: number; relation: string; code: string }> = [];
    subjects.forEach((subject, index) => {
      for (const field of ['prerequisites', 'corequisites', 'equivalences']) {
        for (const relation of Array.isArray(subject[field]) ? subject[field] : []) {
          const code = typeof relation === 'string' ? relation : relation?.code;
          if (code && !codes.has(String(code).trim().toUpperCase())) refs.push({ record: index + 1, relation: field, code: String(code) });
        }
      }
    });
    for (const ref of refs.slice(0, 30)) warnings.push(`Registro ${ref.record}: ${ref.relation} '${ref.code}' não está no currículo importado; a referência será preservada.`);
    if (refs.length > 30) warnings.push(`${refs.length - 30} outras referências fora do currículo importado serão preservadas.`);
  } else if (item.kind === 'contents') {
    if (!item.data || !Array.isArray(item.data.disciplinas)) errors.push('Conteúdos precisa ter uma lista disciplinas.');
    else if (!item.data.disciplinas.length) errors.push('A lista de conteúdos está vazia.');
    else item.data.disciplinas.forEach((discipline: any, index: number) => {
      if (!discipline.codigo || !discipline.nome || typeof discipline.conteudo_programatico !== 'string') errors.push(`Disciplina de conteúdo #${index + 1} precisa de código, nome e conteúdo programático.`);
    });
  }
  return { errors: Array.from(new Set(errors)), warnings };
}

function displayValue(value: any): string {
  if (value === undefined) return '—';
  if (value === null) return 'null';
  if (typeof value === 'string') return value.length > 100 ? `${value.slice(0, 97)}…` : value;
  const serialized = JSON.stringify(value);
  return serialized.length > 100 ? `${serialized.slice(0, 97)}…` : serialized;
}

function collectChanges(before: any, after: any, prefix = '', result: Array<{ path: string; before: string; after: string }> = []): Array<{ path: string; before: string; after: string }> {
  if (result.length >= 30 || equalJson(before, after)) return result;
  if (Array.isArray(before) && Array.isArray(after)) {
    const max = Math.max(before.length, after.length);
    for (let index = 0; index < max && result.length < 30; index++) collectChanges(before[index], after[index], `${prefix}[${index}]`, result);
    return result;
  }
  if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
    for (const key of Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort()) {
      if (result.length >= 30) break;
      collectChanges(before[key], after[key], prefix ? `${prefix}.${key}` : key, result);
    }
    return result;
  }
  result.push({ path: prefix || '$', before: displayValue(before), after: displayValue(after) });
  return result;
}

async function readDestination(client: SupabaseClient, item: MigrationSourceItem): Promise<any | null> {
  if (item.kind === 'course') {
    const { data, error } = await client.from('courses').select('data').eq('id', item.courseId).maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  }
  if (item.kind === 'curriculum') {
    const { data, error } = await client.from('course_curricula').select('data').eq('course_id', item.courseId).maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  }
  if (item.kind === 'contents') {
    const { data, error } = await client.from('course_contents').select('data').eq('course_id', item.courseId).maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  }
  const { data, error } = await client.from('course_schedules').select('data,extraction').eq('course_id', item.courseId).eq('semester', item.semester).maybeSingle();
  if (error) throw error;
  return data ? { data: data.data, extraction: data.extraction } : null;
}

export async function previewMigration(
  inventory: MigrationInventory,
  client: SupabaseClient,
  selectedKeys: string[],
  overwriteKeys: string[]
): Promise<MigrationPreview> {
  const byKey = new Map(inventory.items.map(item => [item.key, item]));
  const selected = new Set(selectedKeys.filter(key => byKey.has(key)));
  const unknownKeys = selectedKeys.filter(key => !byKey.has(key));
  const errors = unknownKeys.map(key => `Item de origem não encontrado: ${key}`);
  const overwrite = new Set(overwriteKeys.filter(key => byKey.has(key)));
  const unknownOverwriteKeys = overwriteKeys.filter(key => !byKey.has(key));
  errors.push(...unknownOverwriteKeys.map(key => `Confirmação de sobrescrita para item inexistente: ${key}`));
  for (const key of Array.from(selected)) {
    const item = byKey.get(key)!;
    if (item.kind !== 'course') selected.add(`course:${item.courseId}`);
  }
  if (!selected.size) errors.push('Selecione ao menos um conjunto para validar.');

  const previewItems: MigrationPreviewItem[] = [];
  for (const key of selected) {
    const item = byKey.get(key);
    if (!item) continue;
    const validation = validateItem(item);
    let destination: any = null;
    if (!validation.errors.length) {
      try { destination = await readDestination(client, item); }
      catch (error) { validation.errors.push(`Falha ao ler destino: ${(error as Error).message}`); }
    }
    const status: MigrationPreviewItem['status'] = validation.errors.length ? 'invalid'
      : destination === null ? 'new'
      : equalJson(destination, item.data) ? 'identical' : 'different';
    const isOverwrite = overwrite.has(item.key);
    const changes = status === 'different' ? collectChanges(destination, item.data) : [];
    previewItems.push({
      key: item.key,
      courseId: item.courseId,
      courseName: item.courseName,
      kind: item.kind,
      semester: item.semester,
      sourceFile: item.sourceFile,
      records: item.records,
      status,
      destinationRecords: destination === null ? 0 : recordCount(item.kind, destination),
      destinationChecksum: snapshotChecksum(destination),
      selected: true,
      overwrite: isOverwrite,
      canImport: status === 'new' || status === 'identical' || (status === 'different' && isOverwrite),
      problems: validation.errors,
      warnings: validation.warnings,
      changes
    });
  }
  const selectedCourseIds = Array.from(new Set(previewItems.map(item => item.courseId)));
  const hasBlocking = previewItems.some(item => !item.canImport);
  const fingerprint = sha256(JSON.stringify(canonical({
    selected: Array.from(selected).sort(),
    overwrite: Array.from(overwrite).sort(),
    state: previewItems.map(item => ({ key: item.key, sourceChecksum: byKey.get(item.key)!.checksum, destinationChecksum: item.destinationChecksum }))
  })));
  return { ready: !errors.length && previewItems.length > 0 && !hasBlocking, fingerprint, items: previewItems, missing: inventory.missing, errors, selectedCourseIds };
}

function destinationSnapshotValue(item: MigrationSourceItem, destination: any): any {
  if (item.kind === 'schedule' && destination !== null) return destination;
  return destination;
}

export async function createMigrationRun(
  client: SupabaseClient,
  actorId: string,
  inventory: MigrationInventory,
  selectedKeys: string[],
  overwriteKeys: string[],
  expectedFingerprint: string
): Promise<{ id: string; preview: MigrationPreview }> {
  const preview = await previewMigration(inventory, client, selectedKeys, overwriteKeys);
  if (!expectedFingerprint || preview.fingerprint !== expectedFingerprint) {
    throw Object.assign(new Error('Os arquivos ou o destino mudaram desde a prévia. Faça uma nova validação antes de migrar.'), {
      status: 409, code: 'STALE_PREVIEW', preview
    });
  }
  if (!preview.ready) throw Object.assign(new Error('A seleção tem conflitos ou itens inválidos. Revise a prévia.'), { status: 409, preview });

  const selected = new Set(preview.items.map(item => item.key));
  const sourceByKey = new Map(inventory.items.map(item => [item.key, item]));
  const snapshots: Array<{ item: MigrationSourceItem; destination: any }> = [];
  for (const previewItem of preview.items) {
    const item = sourceByKey.get(previewItem.key)!;
    const destination = await readDestination(client, item);
    if (snapshotChecksum(destination) !== previewItem.destinationChecksum) {
      throw Object.assign(new Error('O destino mudou durante a criação da execução. Faça uma nova validação antes de migrar.'), {
        status: 409, code: 'STALE_PREVIEW', preview
      });
    }
    snapshots.push({ item, destination: destinationSnapshotValue(item, destination) });
  }

  const { data: run, error: runError } = await client.from('migration_runs').insert({
    actor_id: actorId,
    status: 'pending',
    summary: { selected_keys: Array.from(selected), selected_courses: preview.selectedCourseIds, total_items: snapshots.length }
  }).select('id').single();
  if (runError || !run) throw runError || new Error('Não foi possível criar a execução.');

  const rows = snapshots.map(({ item, destination }) => ({
    run_id: run.id,
    course_id: item.courseId,
    source_key: item.key,
    kind: item.kind,
    semester: item.semester || null,
    source_file: item.sourceFile,
    source_checksum: item.checksum,
    source_data: item.data,
    destination_snapshot: destination,
    status: 'pending'
  }));
  const { error: itemError } = await client.from('migration_items').insert(rows);
  if (itemError) {
    await client.from('migration_runs').delete().eq('id', run.id);
    throw itemError;
  }
  return { id: run.id, preview };
}

function readCurrentChecksum(repository: FileAcademicRepository, sourceFile: string): string {
  const root = path.resolve(repository.dataDir);
  const absolute = path.resolve(root, sourceFile);
  if (!absolute.startsWith(root + path.sep)) throw new RepositoryError('Caminho de origem inválido.', 400);
  if (!fs.existsSync(absolute)) throw new RepositoryError(`Arquivo de origem ausente: ${sourceFile}`, 409);
  const raw = fs.readFileSync(absolute);
  if (path.basename(absolute).startsWith('horario_')) {
    const reportPath = path.join(path.dirname(absolute), `extracao_${path.basename(absolute)}`);
    if (fs.existsSync(reportPath)) return sha256(Buffer.concat([raw, Buffer.from('\0extracao\0'), fs.readFileSync(reportPath)]));
  }
  return sha256(raw);
}

async function finalizeRun(client: SupabaseClient, runId: string): Promise<any> {
  const { data: items, error: itemError } = await client.from('migration_items').select('status').eq('run_id', runId);
  if (itemError) throw itemError;
  const values = items || [];
  const pending = values.some((item: any) => item.status === 'pending');
  const errors = values.some((item: any) => item.status === 'error');
  const status = pending ? 'running' : errors ? 'completed_with_errors' : 'completed';
  const completedAt = pending ? null : new Date().toISOString();
  const { data, error } = await client.from('migration_runs').update({ status, completed_at: completedAt }).eq('id', runId).select('*').single();
  if (error) throw error;
  return data;
}

export async function executeCourseMigration(
  client: SupabaseClient,
  repository: FileAcademicRepository,
  runId: string,
  courseId: string
): Promise<{ imported: number; identical: number; run: any }> {
  const { data: storedItems, error: readError } = await client.from('migration_items').select('*').eq('run_id', runId).eq('course_id', courseId).order('kind');
  if (readError) throw readError;
  if (!storedItems?.length) throw new RepositoryError('Não há itens selecionados para este curso.', 404);
  const remaining = storedItems.filter((item: any) => item.status !== 'imported');
  if (!remaining.length) return { imported: 0, identical: 0, run: await finalizeRun(client, runId) };

  for (const item of remaining) {
    let currentChecksum: string;
    try { currentChecksum = readCurrentChecksum(repository, item.source_file); }
    catch (error) {
      await client.from('migration_items').update({ status: 'error', error: { message: (error as Error).message }, processed_at: new Date().toISOString() }).eq('id', item.id);
      await finalizeRun(client, runId);
      throw error;
    }
    if (currentChecksum !== item.source_checksum) {
      const message = `A origem mudou após a prévia: ${item.source_file}. Gere uma nova validação.`;
      await client.from('migration_items').update({ status: 'error', error: { message }, processed_at: new Date().toISOString() }).eq('id', item.id);
      await finalizeRun(client, runId);
      throw new RepositoryError(message, 409);
    }
  }

  const payload = remaining.map((item: any) => ({ source_key: item.source_key, source_checksum: item.source_checksum, source_data: item.source_data }));
  const { data, error } = await client.rpc('apply_academic_course_import', { p_run_id: runId, p_course_id: courseId, p_items: payload });
  if (error) {
    const message = error.message || 'Falha transacional ao importar o curso.';
    await client.from('migration_items').update({ status: 'error', error: { message, code: error.code }, processed_at: new Date().toISOString() }).eq('run_id', runId).eq('course_id', courseId).in('status', ['pending', 'error', 'identical']);
    const run = await finalizeRun(client, runId);
    throw Object.assign(new RepositoryError(message, error.code === '40001' ? 409 : 500), { run });
  }
  return { imported: Number(data?.imported || 0), identical: Number(data?.identical || 0), run: await finalizeRun(client, runId) };
}

export async function listMigrationRuns(client: SupabaseClient): Promise<any[]> {
  const { data, error } = await client.from('migration_runs').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data || [];
}

export async function getMigrationRunReport(client: SupabaseClient, runId: string): Promise<{ run: any; items: any[] }> {
  const [{ data: run, error: runError }, { data: items, error: itemsError }] = await Promise.all([
    client.from('migration_runs').select('*').eq('id', runId).maybeSingle(),
    client.from('migration_items').select('*').eq('run_id', runId).order('course_id').order('kind').order('semester')
  ]);
  if (runError) throw runError;
  if (itemsError) throw itemsError;
  if (!run) throw new RepositoryError('Execução de migração não encontrada.', 404);
  return { run, items: items || [] };
}
