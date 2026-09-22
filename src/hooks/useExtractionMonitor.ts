import { useCallback, useEffect, useRef, useState } from 'react';
import { extractionResponse } from '../utils/savedExtraction';
import { safeLogMessage, type ExtractionActivity, type ExtractionSnapshot, type ExtractionStage } from '../utils/extractionActivity';

export function useExtractionMonitor(initialToken?: string) {
  const [token, setToken] = useState(initialToken);
  const [activity, setActivity] = useState<ExtractionActivity | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string>();
  const [requestRunning, setRequestRunning] = useState(false);
  const generation = useRef(0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const currentGeneration = generation.current;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    const poll = async () => {
      let keepWatching = requestRunning;
      try {
        const snapshot: ExtractionSnapshot = await extractionResponse(await fetch(`/api/extraction-jobs/${token}`, {
          cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)])
        }));
        if (controller.signal.aborted || currentGeneration !== generation.current) return;
        setActivity(snapshot.activity);
        setConnectionError(null);
        setLastSync(new Date().toISOString());
        failures = 0;
        keepWatching ||= snapshot.status === 'running';
      } catch (error: any) {
        if (controller.signal.aborted || currentGeneration !== generation.current) return;
        const message = error?.status === 404 ? 'O documento salvo não foi encontrado no servidor. Envie o documento novamente.' :
          'Não foi possível atualizar o acompanhamento. Tentando reconectar. Isso não confirma que a extração parou.';
        setConnectionError(message);
        setActivity(previous => previous || {
          status: 'interrupted', stage: 'upload', startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), events: []
        });
        failures++;
        // Retain the last known state. A monitoring failure is not an extraction failure.
        keepWatching = error?.status !== 404;
      }
      if (keepWatching && !controller.signal.aborted) timer = setTimeout(poll, Math.min(10000, failures ? 2000 * failures : 1000));
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [token, requestRunning]);

  const start = useCallback((model: string, sourceCount: number) => {
    generation.current++;
    setToken(undefined);
    setConnectionError(null);
    setLastSync(undefined);
    setRequestRunning(true);
    const now = new Date().toISOString();
    setActivity({ status: 'running', stage: 'upload', model, sourceCount,
      startedAt: now, updatedAt: now, events: [] });
  }, []);

  const localEvent = useCallback((stage: ExtractionStage | undefined, message: string, status: ExtractionActivity['status'] = 'running') => {
    const now = new Date().toISOString();
    setActivity(previous => previous ? {
      ...previous, stage: stage || previous.stage, status, updatedAt: now,
      ...(['failed', 'cancelled', 'complete'].includes(status) ? { finishedAt: now } : {}),
      events: [...previous.events, { id: (previous.events.at(-1)?.id || 0) + 1, at: now, stage: stage || previous.stage,
        message: safeLogMessage(message), level: status === 'failed' ? 'error' : status === 'cancelled' ? 'warning' : 'info' }]
    } : previous);
  }, []);

  return { activity, connectionError, lastSync, start, localEvent,
    track: setToken, finish: () => setRequestRunning(false) };
}
