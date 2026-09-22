import { Router, type RequestHandler } from 'express';
import { extractAcademicData } from './extractionPipeline';
import { ExtractionJobStore, jobError, sourceSignature, type ExtractionJob, type ExtractionMode } from './extractionJobs';
import type { AcademicAIClient } from './aiProvider';
import { parsePipelineConfig } from './src/utils/pipelineConfig';

export function extractionRoutes(getAIClient: () => AcademicAIClient, store = new ExtractionJobStore()) {
  const router = Router();
  const statusOf = (error: any) => [400, 404, 409, 429, 503].includes(Number(error.status)) ? Number(error.status) : 422;
  router.post('/extraction-jobs', (req, res) => {
    try {
      const job = store.create(req.body.mode, req.body.input, req.body.token);
      res.json(store.describe(job));
    } catch (error: any) { res.status(statusOf(error)).json({ error: error.message }); }
  });
  router.get('/extraction-jobs/:token', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try { res.json(store.describeToken(req.params.token as string)); }
    catch (error: any) { res.status(statusOf(error)).json({ error: error.message }); }
  });

  const handler = (mode: ExtractionMode): RequestHandler => async (req, res) => {
    const controller = new AbortController();
    const cancel = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', cancel);
    let job: ExtractionJob | undefined;
    let release: (() => void) | undefined;
    try {
      const requestedToken = req.body?.resumeToken;
      job = requestedToken ? store.get(requestedToken) : store.create(mode, req.body || {});
      if (job.mode !== mode) throw jobError(409, 'O modo não corresponde à extração salva.');
      if (requestedToken && (req.body.files?.length || req.body.base64Data || req.body.textContent !== undefined) &&
        sourceSignature(req.body, mode) !== job.signature) throw jobError(409, 'Os arquivos ou texto mudaram. Inicie outra extração.');
      release = store.acquire(job.token);
      // Persisted result also covers a response lost after the server completed.
      const complete = store.finalResult(job.token);
      if (complete) { res.json({ ...complete, _resumeToken: job.token, _resumed: true }); return; }
      const input = { ...job.input, ...(req.body.model ? { model: req.body.model } : {}),
        ...(req.body.pipeline ? { pipeline: parsePipelineConfig(req.body.pipeline) } : {}) };
      store.begin(job.token, input.model);
      const checkpoint = store.checkpoint(job.token);
      console.info(`[extração/${mode}] ${checkpoint.results.size} chamada(s) preservada(s).`);
      const result = await extractAcademicData(getAIClient(), input, mode, controller.signal,
        event => {
          store.record(job!.token, event.stage, event.message, event.metrics, event.level);
          console.info(`[extração/${mode}] ${event.stage}: ${event.message}`);
        }, checkpoint);
      controller.signal.throwIfAborted();
      store.record(job.token, 'saving', 'Salvando o JSON validado para permitir reabertura do resultado.');
      store.complete(job.token, result);
      if (!controller.signal.aborted) res.json({ ...result, _resumeToken: job.token, _resumed: !!requestedToken });
    } catch (error: any) {
      // A competing request must never overwrite the owner's progress or failure state.
      if (job && release) store.stop(job.token, controller.signal.aborted,
        controller.signal.aborted ? 'Extração cancelada. Os documentos enviados continuam salvos.' : error.message || 'Falha na extração.');
      if (!controller.signal.aborted) {
        console.error(`[extração/${mode}] falhou: ${error.message}`);
        res.status(statusOf(error)).json({ error: error.message || 'Falha na extração.',
          ...(job ? { resumeToken: job.token } : {}) });
      }
    } finally {
      // Only the request which acquired the lock may release it. Disconnecting
      // or restarting never deletes validated call results or the uploaded files.
      release?.();
      res.off('close', cancel);
    }
  };
  router.post('/extract-curriculum', handler('linear'));
  router.post('/extract-curriculum-tree', handler('tree'));
  router.post('/extract-schedule', handler('schedule'));
  router.post('/extract-pdf', handler('schedule'));
  return router;
}
