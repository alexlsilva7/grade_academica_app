import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { readSources, type ExtractionCheckpoint } from './extractionPipeline';
import { parsePipelineConfig } from './src/utils/pipelineConfig';
import { safeLogMessage, type ExtractionActivity, type ExtractionEvent, type ExtractionMetrics, type ExtractionStage } from './src/utils/extractionActivity';

export type ExtractionMode = 'schedule' | 'linear' | 'tree';
export type ExtractionJob = {
  version: 1; token: string; mode: ExtractionMode; signature: string;
  input: any; createdAt: string; updatedAt: string;
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const jobError = (status: number, message: string) => Object.assign(new Error(message), { status });

export function sourceSignature(input: any, mode: ExtractionMode) {
  return createHash('sha256').update(JSON.stringify({ mode, sources: readSources(input).map(source => ({
    file: source.fileName, mime: source.mimeType, text: source.text, digest: source.sourceDigest
  })) })).digest('hex');
}

/** Local durable jobs: source upload once, one atomic file per validated call. */
export class ExtractionJobStore {
  private readonly active = new Set<string>();
  constructor(private readonly directory = path.resolve('.extraction-state')) {}

  private folder(token: string) {
    if (!uuid.test(token)) throw jobError(400, 'Identificador de extração inválido.');
    return path.join(this.directory, token);
  }

  private write(file: string, value: unknown) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    const fd = fs.openSync(temporary, 'wx', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(value)); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    fs.renameSync(temporary, file);
  }

  create(mode: ExtractionMode, body: any, token = randomUUID()): ExtractionJob {
    if (!['schedule', 'linear', 'tree'].includes(mode)) throw jobError(400, 'Modo de extração inválido.');
    const folder = this.folder(token);
    const input = {
      files: body?.files, base64Data: body?.base64Data, fileName: body?.fileName, mimeType: body?.mimeType,
      textContent: body?.textContent, model: body?.model, pipeline: parsePipelineConfig(body?.pipeline)
    };
    let signature: string;
    try { signature = sourceSignature(input, mode); }
    catch (error: any) { throw jobError(400, error.message); }
    if (fs.existsSync(path.join(folder, 'job.json'))) {
      const existing = this.get(token);
      if (existing.signature !== signature) throw jobError(409, 'Os arquivos ou o modo não correspondem à extração salva.');
      return existing; // A repeated upload response must not erase saved progress.
    }
    const now = new Date().toISOString();
    const job: ExtractionJob = { version: 1, token, mode, signature, input, createdAt: now, updatedAt: now };
    this.write(path.join(folder, 'job.json'), job);
    this.metadata(token, job);
    this.record(token, 'upload', 'Documento recebido e salvo. Pronto para iniciar a extração.', {
      sourceCount: readSources(input).length, model: input.model
    }, 'info', 'ready');
    return job;
  }

  get(token: string): ExtractionJob {
    const file = path.join(this.folder(token), 'job.json');
    if (!fs.existsSync(file)) throw jobError(404, 'Extração salva não encontrada.');
    const job = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (job.version !== 1 || job.token !== token) throw jobError(409, 'Formato da extração salva incompatível.');
    return job;
  }

  private metadata(token: string, job?: ExtractionJob): {
    token: string; mode: ExtractionMode; model?: string; createdAt: string; sources: string[];
  } {
    const file = path.join(this.folder(token), 'metadata.json');
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    const original = job || this.get(token);
    const metadata = { token, mode: original.mode, model: original.input.model, createdAt: original.createdAt,
      sources: readSources(original.input).map(source => source.fileName) };
    this.write(file, metadata);
    return metadata;
  }

  activity(token: string): ExtractionActivity {
    const job = this.metadata(token);
    const file = path.join(this.folder(token), 'progress.json');
    const activity: ExtractionActivity = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {
      status: 'ready', stage: 'upload', startedAt: job.createdAt, updatedAt: job.createdAt, events: [], model: job.model
    };
    if (fs.existsSync(path.join(this.folder(token), 'result.json'))) activity.status = 'complete';
    else if (activity.status === 'running' && !this.active.has(token)) activity.status = 'interrupted';
    return activity;
  }

  begin(token: string, model?: string) {
    const previous = this.activity(token);
    const now = new Date().toISOString();
    this.write(path.join(this.folder(token), 'progress.json'), {
      status: 'running', stage: 'preparation', startedAt: now, updatedAt: now,
      events: previous.events, model, sourceCount: previous.sourceCount
    });
    this.record(token, 'preparation', 'Extração iniciada. Conferindo os documentos enviados.', { model });
  }

  record(token: string, stage: ExtractionStage, message: string, metrics: ExtractionMetrics = {},
    level: ExtractionEvent['level'] = 'info', status: ExtractionActivity['status'] = 'running') {
    const activity = this.activity(token);
    const at = new Date().toISOString();
    const event: ExtractionEvent = { ...metrics, id: (activity.events.at(-1)?.id || 0) + 1, at, stage,
      message: safeLogMessage(message), level };
    const terminal = ['complete', 'failed', 'cancelled'].includes(status);
    this.write(path.join(this.folder(token), 'progress.json'), {
      ...activity, ...metrics, stage, status, updatedAt: at,
      ...(terminal ? { finishedAt: at } : {}), events: [...activity.events, event].slice(-200)
    });
  }

  stop(token: string, cancelled: boolean, message: string) {
    const activity = this.activity(token);
    this.record(token, activity.stage, message, {}, cancelled ? 'warning' : 'error', cancelled ? 'cancelled' : 'failed');
  }

  acquire(token: string): () => void {
    this.get(token);
    if (this.active.has(token)) throw jobError(409, 'Esta extração ainda está em andamento. Aguarde antes de continuar.');
    this.active.add(token);
    return () => { this.active.delete(token); };
  }

  checkpoint(token: string): ExtractionCheckpoint {
    const folder = this.folder(token);
    const results = new Map<string, string>();
    const entries = fs.existsSync(folder) ? fs.readdirSync(folder) : [];
    for (const file of entries.filter(file => /^[a-f0-9]{64}\.json$/.test(file))) {
      results.set(file.slice(0, -5), JSON.parse(fs.readFileSync(path.join(folder, file), 'utf8')));
    }
    return { results, saveResult: (key, result) => {
      if (!/^[a-f0-9]{64}$/.test(key)) throw jobError(400, 'Chave de checkpoint inválida.');
      this.write(path.join(folder, `${key}.json`), result);
    } };
  }

  finalResult(token: string): any | undefined {
    const file = path.join(this.folder(token), 'result.json');
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : undefined;
  }

  complete(token: string, result: any) {
    this.write(path.join(this.folder(token), 'result.json'), result);
    this.record(token, 'complete', 'JSON salvo. O resultado está disponível para revisão e download.', {
      recordCount: (result.subjects || result.disciplines || []).length,
      issueCount: result._extraction?.issues?.length || 0
    }, 'info', 'complete');
  }

  describe(job: ExtractionJob) {
    return this.describeToken(job.token);
  }

  describeToken(token: string) {
    const folder = this.folder(token);
    const metadata = this.metadata(token);
    const activity = this.activity(token);
    return { ...metadata, model: activity.model || metadata.model,
      status: activity.status, activity,
      completedCalls: fs.readdirSync(folder).filter(file => /^[a-f0-9]{64}\.json$/.test(file)).length,
    };
  }
}
