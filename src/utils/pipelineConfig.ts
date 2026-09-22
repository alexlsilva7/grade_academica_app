export const pipelineStages = ['reading', 'inventory', 'catalogue', 'details', 'relations', 'repair'] as const;
export type PipelineStage = typeof pipelineStages[number];
export type PipelineConfig = { concurrency: number; models: Partial<Record<PipelineStage, string>> };
export const pipelineModels = [
  ['z-ai/glm-5.3', 'NVIDIA · GLM 5.3'],
  ['z-ai/glm-5.3-flash', 'NVIDIA · GLM 5.3 Flash'],
  ['moonshotai/kimi-k3', 'NVIDIA · Kimi K3'],
  ['deepseek-ai/deepseek-v4-flash-0731', 'NVIDIA · DeepSeek V4 Flash'],
  ['nvidia/nemotron-3-super-120b-a12b', 'NVIDIA · Nemotron 3 Super'],
  ['nvidia/nemotron-3-ultra-550b-a55b', 'NVIDIA · Nemotron 3 Ultra'],
  ['moonshot/kimi-k2.6', 'Moonshot · Kimi K2.6'],
  ['openrouter/z-ai/glm-5.2:free', 'OpenRouter · GLM 5.2 Free'],
  ['gemini-3.8-flash', 'Google · Gemini 3.8 Flash'],
  ['gemini-3.7-flash', 'Google · Gemini 3.7 Flash'],
  ['gemini-3.6-flash', 'Google · Gemini 3.6 Flash'],
  ['gemini-3.1-pro-preview', 'Google · Gemini 3.1 Pro Preview'],
  ['gemini-3.5-flash-lite', 'Google · Gemini 3.5 Flash Lite'],
] as const;
export const canReadFiles = (model: string) => /^(moonshot\/|openrouter\/|gemini)/.test(model);
export function parsePipelineConfig(value: any): PipelineConfig {
  if (value == null) return { concurrency: 1, models: {} };
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Configuração de pipeline inválida.');
  if (value.models != null && (typeof value.models !== 'object' || Array.isArray(value.models))) throw new Error('Seleção de modelos inválida.');
  const concurrency = value.concurrency ?? 3;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 6) throw new Error('Escolha entre 1 e 6 chamadas paralelas.');
  const models: PipelineConfig['models'] = {};
  for (const stage of pipelineStages) {
    const model = value.models?.[stage];
    if (model == null || model === '') continue;
    if (typeof model !== 'string' || !pipelineModels.some(([id]) => id === model)) throw new Error(`Modelo inválido na etapa ${stage}.`);
    if (stage === 'reading' && !canReadFiles(model)) throw new Error('Escolha Moonshot, OpenRouter ou Gemini para ler os arquivos.');
    models[stage] = model;
  }
  return { concurrency, models };
}
