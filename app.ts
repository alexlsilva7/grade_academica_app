import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { extractionRoutes } from './extractionRoutes';
import { validateExtraction } from './src/utils/extraction';
import { createAcademicAIClient, type AcademicAIClient } from './aiProvider';
import {
  FileAcademicRepository,
  RepositoryError,
  SupabaseAcademicRepository,
  type AcademicRepository,
  type CourseInclude,
  type SaveCourseInput
} from './src/server/academicRepository';
import {
  createMigrationRun,
  discoverMigrationInventory,
  executeCourseMigration,
  getMigrationRunReport,
  listMigrationRuns,
  previewMigration
} from './src/server/academicMigration';
import { getAcademicDataSource, requireAdmin } from './src/server/adminAuth';
import { getSupabaseAdminClient, hasSupabaseAdminConfig, hasSupabaseAuthConfig } from './src/server/supabaseClient';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let aiClient: AcademicAIClient | null = null;
function getAIClient(): AcademicAIClient {
  if (!aiClient) aiClient = createAcademicAIClient();
  return aiClient;
}

const dataSource = getAcademicDataSource();
if (dataSource === 'supabase' && !hasSupabaseAdminConfig()) {
  throw new Error('ACADEMIC_DATA_SOURCE=supabase exige VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY e SUPABASE_SECRET_KEY.');
}

function existingFileRepository(): FileAcademicRepository {
  const dataDir = process.env.ACADEMIC_DATA_DIR?.trim()
    ? path.resolve(process.env.ACADEMIC_DATA_DIR)
    : path.join(process.cwd(), 'src', 'data');
  if (!fs.existsSync(path.join(dataDir, 'courses_registry.json'))) {
    throw new RepositoryError('Os arquivos acadêmicos de origem não estão disponíveis. Restaure src/data ou configure ACADEMIC_DATA_DIR para usar a migração.', 503);
  }
  return new FileAcademicRepository(dataDir);
}

const fileRepository = dataSource === 'files' ? existingFileRepository() : null;
const repository: AcademicRepository = dataSource === 'supabase'
  ? new SupabaseAcademicRepository(getSupabaseAdminClient())
  : fileRepository!;

function respondError(res: express.Response, error: unknown, fallback: string): void {
  const known = error as { status?: number; message?: string; code?: string; preview?: unknown };
  const status = Number.isInteger(known?.status) ? known.status! : error instanceof RepositoryError ? error.status : 500;
  res.status(status).json({ error: known?.message || fallback, ...(known?.code ? { code: known.code } : {}), ...(known?.preview ? { preview: known.preview } : {}) });
}

function requireMigrationClient() {
  if (!hasSupabaseAdminConfig()) throw new RepositoryError('Configure as variáveis Supabase no servidor antes de analisar ou importar.', 503);
  return getSupabaseAdminClient();
}

function selectedKeysFrom(body: any): string[] {
  return Array.isArray(body?.selectedKeys) ? body.selectedKeys.filter((key: any) => typeof key === 'string') : [];
}

function overwriteKeysFrom(body: any): string[] {
  return Array.isArray(body?.overwriteKeys) ? body.overwriteKeys.filter((key: any) => typeof key === 'string') : [];
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    nvidia_api_configured: !!process.env.NVIDIA_API_KEY,
    moonshot_api_configured: !!process.env.MOONSHOT_API_KEY,
    openrouter_api_configured: !!process.env.OPENROUTER_API_KEY,
    gemini_api_configured: !!process.env.GEMINI_API_KEY
  });
});

app.get('/api/admin/config', (_req, res) => {
  res.json({
    authRequired: true,
    authConfigured: hasSupabaseAuthConfig() && !!process.env.ADMIN_USER_IDS?.split(',').some(id => id.trim()),
    dataSource
  });
});

app.get('/api/admin/session', requireAdmin, (req, res) => {
  res.json({ authenticated: true, userId: req.adminUserId });
});

app.get('/api/courses', async (_req, res) => {
  try {
    res.json({ courses: await repository.listCourses() });
  } catch (error) {
    respondError(res, error, 'Falha ao ler o registro de cursos.');
  }
});

app.get('/api/courses/:id', async (req, res) => {
  try {
    const strict = req.query.strict === 'true';
    const semester = typeof req.query.semester === 'string' ? req.query.semester : undefined;
    const rawIncludes = typeof req.query.include === 'string' ? req.query.include.split(',') : undefined;
    const allowedIncludes: CourseInclude[] = ['curriculum', 'schedule', 'contents'];
    const includes = rawIncludes?.filter((value): value is CourseInclude => allowedIncludes.includes(value as CourseInclude));
    const details = await repository.getCourse(req.params.id, semester, strict, includes);
    if (!details) return res.status(404).json({ error: `Curso '${req.params.id}' não encontrado.` });
    return res.json(details);
  } catch (error) {
    return respondError(res, error, 'Falha ao carregar os dados do curso.');
  }
});

app.patch('/api/courses/:id/metadata', requireAdmin, async (req, res) => {
  const { name, shortName } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || typeof shortName !== 'string' || !shortName.trim()) {
    return res.status(400).json({ error: 'Informe nome e sigla do curso.' });
  }
  try {
    const course = await repository.updateCourseMetadata(req.params.id, name, shortName);
    return res.json({ course });
  } catch (error) {
    return respondError(res, error, 'Não foi possível salvar os dados do curso.');
  }
});

app.post('/api/courses', requireAdmin, async (req, res) => {
  const body = req.body || {};
  if (typeof body.id !== 'string' || !body.id.trim() || typeof body.name !== 'string' || !body.name.trim()) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes: 'id' e 'name'." });
  }
  if (Array.isArray(body.schedule) && !/^\d{4}\.[12]$/.test(body.semester || '')) {
    return res.status(400).json({ error: 'Informe um semestre válido (AAAA.1 ou AAAA.2).' });
  }

  const curriculum = body.curriculum;
  const validation = [
    ...(body.schedule ? validateExtraction(body.schedule, 'schedule') : []),
    ...(curriculum ? validateExtraction(Array.isArray(curriculum) ? curriculum : curriculum.subjects || [], 'linear') : []),
    ...(curriculum?.treeSubjects ? validateExtraction(curriculum.treeSubjects, 'tree') : []),
    ...(!curriculum?.treeSubjects && curriculum?.profiles ? curriculum.profiles.flatMap((profile: any) => validateExtraction(profile.subjects || [], 'tree')) : [])
  ];
  const errors = validation.filter(issue => issue.severity === 'error');
  if (errors.length) return res.status(422).json({ error: 'Corrija os dados inválidos antes de salvar.', issues: errors });

  try {
    const course = await repository.saveCourse(body as SaveCourseInput);
    return res.json({ success: true, message: `Curso '${body.name}' salvo com sucesso no projeto!`, course });
  } catch (error) {
    return respondError(res, error, 'Falha ao salvar curso.');
  }
});

app.delete('/api/courses/:id', requireAdmin, async (req, res) => {
  try {
    await repository.deleteCourse(req.params.id);
    return res.json({ success: true, message: `Curso '${req.params.id}' excluído com sucesso.` });
  } catch (error) {
    return respondError(res, error, 'Falha ao excluir curso.');
  }
});

app.patch('/api/courses/:id/visibility', requireAdmin, async (req, res) => {
  try {
    const course = await repository.updateCourseVisibility(req.params.id, req.body || {});
    return res.json({ success: true, message: 'Configurações de visibilidade salvas.', course });
  } catch (error) {
    return respondError(res, error, 'Falha ao atualizar visibilidade.');
  }
});

app.get('/api/admin/migrations/inventory', requireAdmin, (_req, res) => {
  try {
    const inventory = discoverMigrationInventory(fileRepository ?? existingFileRepository());
    return res.json({
      sourceDirectory: inventory.sourceDirectory,
      items: inventory.items.map(({ data: _data, ...item }) => ({ ...item, status: item.parseError ? 'invalid' : 'available' })),
      missing: inventory.missing,
      ignoredFiles: inventory.ignoredFiles,
      destinationConfigured: hasSupabaseAdminConfig()
    });
  } catch (error) {
    return respondError(res, error, 'Não foi possível analisar os arquivos acadêmicos.');
  }
});

app.post('/api/admin/migrations/validate', requireAdmin, async (req, res) => {
  try {
    const preview = await previewMigration(
      discoverMigrationInventory(fileRepository ?? existingFileRepository()),
      requireMigrationClient(),
      selectedKeysFrom(req.body),
      overwriteKeysFrom(req.body)
    );
    return res.json(preview);
  } catch (error) {
    return respondError(res, error, 'Não foi possível validar a seleção.');
  }
});

app.post('/api/admin/migrations/runs', requireAdmin, async (req, res) => {
  try {
    if (typeof req.body?.fingerprint !== 'string' || !req.body.fingerprint) {
      return res.status(400).json({ error: 'Valide a seleção antes de iniciar a migração.' });
    }
    const run = await createMigrationRun(
      requireMigrationClient(),
      req.adminUserId || 'local',
      discoverMigrationInventory(fileRepository ?? existingFileRepository()),
      selectedKeysFrom(req.body),
      overwriteKeysFrom(req.body),
      req.body.fingerprint
    );
    return res.status(201).json(run);
  } catch (error) {
    return respondError(res, error, 'Não foi possível iniciar a migração.');
  }
});

app.post('/api/admin/migrations/runs/:runId/courses/:courseId', requireAdmin, async (req, res) => {
  try {
    const result = await executeCourseMigration(requireMigrationClient(), fileRepository ?? existingFileRepository(), req.params.runId, req.params.courseId);
    return res.json(result);
  } catch (error) {
    return respondError(res, error, 'Falha ao importar este curso.');
  }
});

app.get('/api/admin/migrations/runs', requireAdmin, async (_req, res) => {
  try { return res.json({ runs: await listMigrationRuns(requireMigrationClient()) }); }
  catch (error) { return respondError(res, error, 'Não foi possível carregar o histórico.'); }
});

app.get('/api/admin/migrations/runs/:runId/report', requireAdmin, async (req, res) => {
  try {
    const report = await getMigrationRunReport(requireMigrationClient(), req.params.runId);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="my-ufape-migration-${req.params.runId}.json"`);
    return res.send(JSON.stringify(report, null, 2));
  } catch (error) {
    return respondError(res, error, 'Não foi possível gerar o relatório.');
  }
});

app.get('/api/admin/migrations/runs/:runId', requireAdmin, async (req, res) => {
  try {
    const client = requireMigrationClient();
    const [{ data: run, error: runError }, { data: items, error: itemsError }] = await Promise.all([
      client.from('migration_runs').select('*').eq('id', req.params.runId).maybeSingle(),
      client.from('migration_items').select('id,course_id,source_key,kind,semester,source_file,status,error,processed_at').eq('run_id', req.params.runId).order('course_id').order('kind')
    ]);
    if (runError) throw runError;
    if (itemsError) throw itemsError;
    if (!run) return res.status(404).json({ error: 'Execução de migração não encontrada.' });
    return res.json({ run, items: items || [] });
  } catch (error) {
    return respondError(res, error, 'Não foi possível consultar a execução.');
  }
});

app.use('/api', requireAdmin, extractionRoutes(getAIClient));

export default app;
