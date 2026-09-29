import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { readSources, type ExtractionCheckpoint } from './extractionPipeline.js';
import { parsePipelineConfig } from './src/utils/pipelineConfig.js';
import { safeLogMessage, type ExtractionActivity, type ExtractionEvent, type ExtractionMetrics, type ExtractionStage } from './src/utils/extractionActivity.js';

export type ExtractionMode = 'schedule' | 'linear' | 'tree';
export type ExtractionJob = {
  version: 1; token: string; mode: ExtractionMode; signature: string; ownerUserId: string;
  input: any; createdAt: string; updatedAt: string;
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const jobError = (status: number, message: string) => Object.assign(new Error(message), { status });

function lockHasLiveProcess(file: string): boolean {
  if (!fs.existsSync(file)) return false;
  try {
    const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Number.isInteger(lock.pid) || lock.pid <= 0 || lock.host !== os.hostname()) return true;
    try { process.kill(lock.pid, 0); return true; }
    catch (error: any) { return error?.code !== 'ESRCH'; }
  } catch {
    return true;
  }
}

export type ExtractionCleanupReport = { examined: number; expired: number; deleted: number; skippedActive: number };

/** Removes expired job directories only when explicitly requested by the caller. */
export function cleanupExpiredExtractions(directory: string, olderThanDays = 30, apply = false, now = Date.now()): ExtractionCleanupReport {
  if (!Number.isFinite(olderThanDays) || olderThanDays < 1) throw new Error('O prazo de retenção deve ser de pelo menos um dia.');
  const root = path.resolve(directory);
  const report: ExtractionCleanupReport = { examined: 0, expired: 0, deleted: 0, skippedActive: 0 };
  if (!fs.existsSync(root)) return report;
  const cutoff = now - olderThanDays * 24 * 60 * 60 * 1000;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !uuid.test(entry.name)) continue;
    const target = path.resolve(root, entry.name);
    if (path.dirname(target) !== root || !target.startsWith(`${root}${path.sep}`)) continue;
    const jobPath = path.join(target, 'job.json');
    if (!fs.existsSync(jobPath)) continue;
    report.examined++;
    try {
      const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
      const progressPath = path.join(target, 'progress.json');
      const progress = fs.existsSync(progressPath) ? JSON.parse(fs.readFileSync(progressPath, 'utf8')) : null;
      const timestamps = [job.createdAt, job.updatedAt, progress?.updatedAt]
        .map(value => typeof value === 'string' ? Date.parse(value) : NaN)
        .filter(Number.isFinite);
      if (!timestamps.length || Math.max(...timestamps) > cutoff) continue;
      if (lockHasLiveProcess(path.join(target, 'worker.lock'))) {
        report.skippedActive++;
        continue;
      }
      report.expired++;
      if (apply) {
        // The target was validated as a direct UUID child of the requested store.
        fs.rmSync(target, { recursive: true, force: true });
        report.deleted++;
      }
    } catch {
      // Preserve malformed or partially written job data for manual review.
    }
  }
  return report;
}

export function sourceSignature(input: any, mode: ExtractionMode) {
  return createHash('sha256').update(JSON.stringify({ mode, sources: readSources(input).map(source => ({
    file: source.fileName, mime: source.mimeType, text: source.text, digest: source.sourceDigest
  })) })).digest('hex');
}

/** Local durable jobs: source upload once, one atomic file per validated call. */
export class ExtractionJobStore {
  private readonly maxConcurrentJobs: number;
  constructor(private readonly directory = path.resolve(process.env.EXTRACTION_STATE_DIR || '.extraction-state'), maxConcurrentJobs = 2) {
    this.maxConcurrentJobs = Number.isInteger(maxConcurrentJobs) ? Math.max(1, Math.min(8, maxConcurrentJobs)) : 2;
  }

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

  create(mode: ExtractionMode, body: any, ownerUserId: string, token = randomUUID()): ExtractionJob {
    if (!ownerUserId?.trim()) throw jobError(401, 'Entre com uma conta administrativa para continuar.');
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
      const existing = this.get(token, ownerUserId);
      if (existing.signature !== signature) throw jobError(409, 'Os arquivos ou o modo não correspondem à extração salva.');
      return existing; // A repeated upload response must not erase saved progress.
    }
    const now = new Date().toISOString();
    const job: ExtractionJob = { version: 1, token, mode, signature, ownerUserId, input, createdAt: now, updatedAt: now };
    this.write(path.join(folder, 'job.json'), job);
    this.metadata(token, job);
    this.record(token, 'upload', 'Documento recebido e salvo. Pronto para iniciar a extração.', {
      sourceCount: readSources(input).length, model: input.model
    }, 'info', 'ready');
    return job;
  }

  private getRaw(token: string): ExtractionJob {
    const file = path.join(this.folder(token), 'job.json');
    if (!fs.existsSync(file)) throw jobError(404, 'Extração salva não encontrada.');
    const job = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (job.version !== 1 || job.token !== token) throw jobError(409, 'Formato da extração salva incompatível.');
    return job;
  }

  get(token: string, ownerUserId: string): ExtractionJob {
    if (!ownerUserId?.trim()) throw jobError(401, 'Entre com uma conta administrativa para continuar.');
    const job = this.getRaw(token);
    // Older ownerless jobs remain on disk but cannot be claimed by whichever
    // administrator happens to present their token after this security change.
    if (!job.ownerUserId || job.ownerUserId.toLowerCase() !== ownerUserId.toLowerCase()) {
      throw jobError(404, 'Extração salva não encontrada.');
    }
    return job;
  }

  private metadata(token: string, job?: ExtractionJob): {
    token: string; mode: ExtractionMode; model?: string; createdAt: string; sources: string[];
  } {
    const file = path.join(this.folder(token), 'metadata.json');
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    const original = job || this.getRaw(token);
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
    else if (activity.status === 'running' && !this.hasLiveJobLock(token)) activity.status = 'interrupted';
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

  private lockFileFor(token: string) { return path.join(this.folder(token), 'worker.lock'); }

  private isProcessAlive(pid: number, host: string): boolean {
    if (!Number.isInteger(pid) || pid <= 0) return true;
    if (host !== os.hostname()) return true; // Shared storage across hosts fails closed.
    try { process.kill(pid, 0); return true; }
    catch (error: any) { return error?.code !== 'ESRCH'; }
  }

  private hasLiveJobLock(token: string): boolean {
    const file = this.lockFileFor(token);
    if (!fs.existsSync(file)) return false;
    return lockHasLiveProcess(file);
  }

  private removeStaleLock(file: string): void {
    if (!fs.existsSync(file)) return;
    try {
      const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!this.isProcessAlive(lock.pid, lock.host)) fs.unlinkSync(file);
    } catch {
      // An unreadable lock cannot be proven stale; leave it for manual review.
    }
  }

  private createLock(file: string, lockId: string, token: string): boolean {
    try {
      const fd = fs.openSync(file, 'wx', 0o600);
      try {
        fs.writeFileSync(fd, JSON.stringify({ lockId, token, pid: process.pid, host: os.hostname(), acquiredAt: new Date().toISOString() }));
        fs.fsyncSync(fd);
      } finally { fs.closeSync(fd); }
      return true;
    } catch (error: any) {
      if (error?.code === 'EEXIST') return false;
      throw error;
    }
  }

  private releaseLock(file: string, lockId: string): void {
    try {
      const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (lock.lockId === lockId) fs.unlinkSync(file);
    } catch {}
  }

  acquire(token: string, ownerUserId: string): () => void {
    this.get(token, ownerUserId);
    const jobLockPath = this.lockFileFor(token);
    const jobLockId = randomUUID();
    this.removeStaleLock(jobLockPath);
    if (!this.createLock(jobLockPath, jobLockId, token)) {
      throw jobError(409, 'Esta extração ainda está em andamento. Aguarde antes de continuar.');
    }

    let slotPath: string | undefined;
    let slotLockId: string | undefined;
    try {
      const lockDirectory = path.join(this.directory, '.locks');
      fs.mkdirSync(lockDirectory, { recursive: true });
      for (let index = 0; index < this.maxConcurrentJobs; index++) {
        const candidate = path.join(lockDirectory, `slot-${index}.lock`);
        this.removeStaleLock(candidate);
        const candidateLockId = randomUUID();
        if (this.createLock(candidate, candidateLockId, token)) {
          slotPath = candidate;
          slotLockId = candidateLockId;
          break;
        }
      }
      if (!slotPath || !slotLockId) {
        throw jobError(429, 'O limite de extrações simultâneas foi atingido. Aguarde uma extração terminar.');
      }
    } catch (error) {
      this.releaseLock(jobLockPath, jobLockId);
      throw error;
    }

    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.releaseLock(jobLockPath, jobLockId);
      this.releaseLock(slotPath!, slotLockId!);
    };
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

  describe(job: ExtractionJob, ownerUserId: string) {
    this.get(job.token, ownerUserId);
    return this.describeToken(job.token, ownerUserId);
  }

  describeToken(token: string, ownerUserId: string) {
    this.get(token, ownerUserId);
    const folder = this.folder(token);
    const metadata = this.metadata(token);
    const activity = this.activity(token);
    return { ...metadata, model: activity.model || metadata.model,
      status: activity.status, activity,
      completedCalls: fs.readdirSync(folder).filter(file => /^[a-f0-9]{64}\.json$/.test(file)).length,
    };
  }
}
