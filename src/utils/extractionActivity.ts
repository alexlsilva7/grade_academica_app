export const extractionSteps = [
  { id: 'upload', label: 'Documento', description: 'Leitura e envio dos arquivos' },
  { id: 'preparation', label: 'Preparação', description: 'Conferência das fontes' },
  { id: 'extraction', label: 'Extração com IA', description: 'Geração do JSON completo' },
  { id: 'validation', label: 'Validação', description: 'Campos, evidências e relações' },
  { id: 'saving', label: 'Resultado', description: 'JSON salvo para revisão' },
] as const;

export type ExtractionStage = typeof extractionSteps[number]['id'] | 'complete';
export type ExtractionStatus = 'ready' | 'running' | 'complete' | 'failed' | 'cancelled' | 'interrupted';
export type ExtractionMetrics = {
  model?: string; attempt?: number; sourceCount?: number; pageCount?: number;
  recordCount?: number; issueCount?: number; durationMs?: number; retryAfterMs?: number;
};
export type ExtractionEvent = ExtractionMetrics & {
  id: number; at: string; stage: ExtractionStage; message: string; level: 'info' | 'warning' | 'error';
};
export type ExtractionActivity = ExtractionMetrics & {
  status: ExtractionStatus; stage: ExtractionStage; events: ExtractionEvent[];
  startedAt: string; updatedAt: string; finishedAt?: string;
};
export type ExtractionSnapshot = {
  token: string; mode: 'schedule' | 'linear' | 'tree'; status: ExtractionStatus;
  sources: string[]; activity: ExtractionActivity;
};

export function durationLabel(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}min ${seconds % 60}s`;
}

// Logs contain operational metadata only; never attach source bodies or provider payloads.
export function safeLogMessage(message: string): string {
  return message.replace(/Bearer\s+\S+/gi, 'Bearer [oculto]')
    .replace(/\bsk-[\w-]+/g, '[chave oculta]')
    .replace(/((?:api[_-]?key|authorization|token)\s*[:=]\s*)[^\s,;]+/gi, '$1[oculto]')
    .slice(0, 800);
}
