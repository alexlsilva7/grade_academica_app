import type { SupabaseClient } from '@supabase/supabase-js';
import type { CalendarAdminState, CalendarDraft, CalendarPublication } from '../calendarTypes.js';
import { publishCalendarDraft } from '../utils/academicCalendar.js';
import { RepositoryError } from './academicRepository.js';

export interface CalendarRepository {
  getPublished(): Promise<CalendarPublication | null>;
  getAdmin(): Promise<CalendarAdminState>;
  saveDraft(draft: CalendarDraft, revision: number, actor: string): Promise<CalendarAdminState>;
  publish(revision: number, actor: string): Promise<CalendarAdminState>;
}
type CalendarRow = { draft: CalendarDraft | null; published: CalendarPublication | null; revision: number; published_at: string | null };
const adminColumns = 'draft,published,revision,published_at';
function state(row: CalendarRow | null): CalendarAdminState {
  return { draft: row?.draft || null, calendar: row?.published || null, revision: row?.revision || 0, publishedAt: row?.published_at || null };
}
function storageError(error: { code?: string; message?: string }) {
  const missing = error.code === 'PGRST205' || error.code === '42P01';
  return new RepositoryError(missing
    ? 'O armazenamento do calendário ainda não está preparado. Aplique a migração academic_calendar no Supabase.'
    : 'Não foi possível acessar o calendário no Supabase.', 503);
}
export class SupabaseCalendarRepository implements CalendarRepository {
  constructor(private client: SupabaseClient) {}

  async getPublished(): Promise<CalendarPublication | null> {
    const { data, error } = await this.client.from('academic_calendars').select('published').eq('id', 'ufape').maybeSingle();
    if (error) throw storageError(error);
    return data?.published || null;
  }
  async getAdmin(): Promise<CalendarAdminState> {
    const { data, error } = await this.client.from('academic_calendars').select(adminColumns).eq('id', 'ufape').maybeSingle();
    if (error) throw storageError(error);
    return state(data);
  }
  private async update(revision: number, values: Record<string, unknown>, actor: string): Promise<CalendarAdminState> {
    const { data, error } = await this.client.from('academic_calendars').update({ ...values,
      revision: revision + 1, updated_at: new Date().toISOString(), updated_by: actor })
      .eq('id', 'ufape').eq('revision', revision).select(adminColumns).maybeSingle();
    if (error) throw storageError(error);
    if (!data) throw new RepositoryError('O calendário foi alterado por outra sessão. Exporte suas alterações e recarregue antes de salvar.', 409);
    return state(data);
  }
  saveDraft(draft: CalendarDraft, revision: number, actor: string) {
    return this.update(revision, { draft }, actor);
  }
  async publish(revision: number, actor: string) {
    const current = await this.getAdmin();
    if (revision !== current.revision) throw new RepositoryError('O rascunho mudou. Recarregue antes de publicar.', 409);
    if (!current.draft) throw new RepositoryError('Salve um rascunho antes de publicar.', 422);
    const publishedAt = new Date().toISOString();
    return this.update(revision, { published: publishCalendarDraft(current.draft, publishedAt), published_at: publishedAt }, actor);
  }
}
