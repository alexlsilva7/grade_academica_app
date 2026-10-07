import express, { type RequestHandler, type Request, type ErrorRequestHandler } from 'express';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES, UUID_PATTERN, validateFeedbackInput, validateFeedbackUpdate } from '../utils/feedback.js';

export const feedbackBodyError: ErrorRequestHandler = (error, _req, res, next) => {
  if (error.type === 'entity.too.large') { res.status(413).json({ error: 'O formulário excede o tamanho permitido.' }); return; }
  if (error.type === 'entity.parse.failed') { res.status(400).json({ error: 'O formulário contém JSON inválido.' }); return; }
  next(error);
};

export function feedbackRequesterHash(req: Pick<Request, 'header' | 'socket'>, secret: string, vercel = process.env.VERCEL === '1', date = new Date()): string {
  const forwarded = vercel ? req.header('x-vercel-forwarded-for')?.split(',')[0]?.trim() : undefined;
  const address = forwarded && isIP(forwarded) ? forwarded : req.socket.remoteAddress || 'unknown';
  return createHmac('sha256', secret).update(`feedback:${date.toISOString().slice(0, 10)}:${address}`).digest('hex');
}

export function feedbackRoutes(getClient: () => SupabaseClient, requireAdmin: RequestHandler, getSecret = () => process.env.SUPABASE_SECRET_KEY || '') {
  const router = express.Router();
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.post('/feedback', async (req, res) => {
    // A filled honeypot is discarded, with no database write or personal data in logs.
    if (typeof req.body?.website === 'string' && req.body.website.trim()) return res.status(202).json({ received: true });
    if (!req.is('application/json')) return res.status(415).json({ error: 'Envie o formulário em JSON.' });
    let input;
    try { input = validateFeedbackInput(req.body); }
    catch (error) { return res.status(400).json({ error: (error as Error).message }); }
    try {
      const secret = getSecret();
      if (!secret) throw new Error('Feedback not configured');
      const { data, error } = await getClient().rpc('submit_site_feedback', {
        p_id: input.submissionId, p_category: input.category, p_message: input.message,
        p_name: input.name, p_email: input.email, p_metadata: input.metadata,
        p_requester_hash: feedbackRequesterHash(req, secret),
      });
      if (error || !data) throw new Error('Feedback storage failed');
      if (data.rate_limited) {
        const retryAfter = Math.max(1, Math.min(900, Number(data.retry_after) || 900));
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({ error: 'Você enviou vários feedbacks recentemente. Aguarde alguns minutos e tente novamente.' });
      }
      return res.status(201).json({ received: true, id: data.id });
    } catch {
      return res.status(503).json({ error: 'Não foi possível salvar seu feedback agora. Sua mensagem foi mantida; tente novamente.' });
    }
  });

  router.get('/admin/feedback', requireAdmin, async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    const course = typeof req.query.course === 'string' ? req.query.course : '';
    const offset = Number(req.query.offset || 0);
    if ((status && !Object.hasOwn(FEEDBACK_STATUSES, status)) || (category && !Object.hasOwn(FEEDBACK_CATEGORIES, category))
      || course.length > 120 || !Number.isSafeInteger(offset) || offset < 0 || offset > 100000) {
      return res.status(400).json({ error: 'Filtros inválidos.' });
    }
    try {
      let query = getClient().from('site_feedback').select('*', { count: 'exact' });
      if (status) query = query.eq('status', status);
      if (category) query = query.eq('category', category);
      if (course) query = query.eq('metadata->>course', course);
      const { data, error, count } = await query.order('created_at', { ascending: false }).order('id').range(offset, offset + 24);
      if (error) throw error;
      return res.json({ items: data || [], total: count || 0 });
    } catch { return res.status(503).json({ error: 'Não foi possível carregar os feedbacks. Tente novamente.' }); }
  });

  router.patch('/admin/feedback/:id', requireAdmin, async (req, res) => {
    if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ error: 'Identificador inválido.' });
    let update;
    try { update = validateFeedbackUpdate(req.body); }
    catch (error) { return res.status(400).json({ error: (error as Error).message }); }
    try {
      const { data, error } = await getClient().from('site_feedback').update({ ...update, updated_at: new Date().toISOString() })
        .eq('id', req.params.id).select('*').maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Feedback não encontrado.' });
      return res.json({ item: data });
    } catch { return res.status(503).json({ error: 'Não foi possível salvar as alterações. Tente novamente.' }); }
  });
  return router;
}
