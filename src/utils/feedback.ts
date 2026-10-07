export const FEEDBACK_CATEGORIES = {
  suggestion: 'Sugestão', problem: 'Problema', academic_data: 'Correção de dados acadêmicos', other: 'Outro',
} as const;
export const FEEDBACK_STATUSES = {
  new: 'Novo', reviewing: 'Em análise', planned: 'Planejado', resolved: 'Resolvido', archived: 'Arquivado',
} as const;
export type FeedbackCategory = keyof typeof FEEDBACK_CATEGORIES;
export type FeedbackStatus = keyof typeof FEEDBACK_STATUSES;
export type FeedbackMetadata = Partial<{
  view: string; course: string; semester: string; profile: string; device: string;
  browser: string; viewport: string; theme: string; version: string;
}>;
export type FeedbackInput = {
  submissionId: string; category: FeedbackCategory; message: string;
  name: string | null; email: string | null; metadata: FeedbackMetadata;
};
export type FeedbackRecord = {
  id: string; category: FeedbackCategory; message: string; name: string | null; email: string | null;
  metadata: FeedbackMetadata; status: FeedbackStatus; internal_notes: string;
  created_at: string; updated_at: string;
};
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hasOwn = (object: object, key: unknown) => typeof key === 'string' && Object.hasOwn(object, key);
const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const metadataKeys = ['view', 'course', 'semester', 'profile', 'device', 'browser', 'viewport', 'theme', 'version'] as const;

export function sanitizeFeedbackMetadata(value: unknown): FeedbackMetadata {
  const input = objectValue(value);
  const output: FeedbackMetadata = {};
  for (const key of metadataKeys) {
    const text = input[key];
    if (typeof text === 'string' && text.length <= 120 && !/[\u0000-\u001f\u007f]/.test(text)) {
      const trimmed = text.trim();
      if (trimmed) output[key] = trimmed;
    }
  }
  return output;
}

export function validateFeedbackInput(value: unknown): FeedbackInput {
  const input = objectValue(value);
  if (typeof input.submissionId !== 'string' || !UUID_PATTERN.test(input.submissionId)) throw new Error('Identificador de envio inválido. Reabra o formulário.');
  if (!hasOwn(FEEDBACK_CATEGORIES, input.category)) throw new Error('Selecione um tipo de feedback válido.');
  if (typeof input.message !== 'string' || input.message.includes('\0')) throw new Error('Informe uma mensagem válida.');
  const message = input.message.trim();
  if (message.length < 10 || message.length > 3000) throw new Error('A mensagem deve ter entre 10 e 3.000 caracteres.');
  const metadata = sanitizeFeedbackMetadata(input.metadata);
  if (['view', 'device', 'browser', 'viewport', 'theme', 'version'].some(key => !metadata[key as keyof FeedbackMetadata])) {
    throw new Error('Não foi possível obter o contexto do envio. Atualize a página e tente novamente.');
  }
  const optionalText = (value: unknown, max: number, label: string): string | null => {
    if (value == null || value === '') return null;
    if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) throw new Error(`${label} inválido.`);
    return value.trim() || null;
  };
  const name = optionalText(input.name, 100, 'Nome');
  const email = optionalText(input.email, 254, 'E-mail');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe um e-mail válido ou deixe o campo vazio.');
  return { submissionId: input.submissionId, category: input.category as FeedbackCategory, message, name, email,
    metadata };
}

export function validateFeedbackUpdate(value: unknown): { status: FeedbackStatus; internal_notes: string } {
  const input = objectValue(value);
  if (!hasOwn(FEEDBACK_STATUSES, input.status)) throw new Error('Situação inválida.');
  if (typeof input.internal_notes !== 'string' || input.internal_notes.length > 5000 || input.internal_notes.includes('\0')) throw new Error('As notas devem ter até 5.000 caracteres.');
  return { status: input.status as FeedbackStatus, internal_notes: input.internal_notes.trim() };
}
